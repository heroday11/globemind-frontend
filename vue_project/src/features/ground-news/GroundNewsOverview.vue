<template>
  <section class="global-overview" aria-label="筛选全球事件" data-tour="ground-news-edition">
    <div class="overview-controls">
      <div class="perspective" role="group" aria-label="事件视角">
        <button type="button" :aria-expanded="panel === 'map'" :class="{ selected: panel === 'map' || country }" @click="togglePanel('map')">
          <Globe :size="17" />地图
        </button>
        <button type="button" :aria-expanded="panel === 'keyword'" :class="{ selected: panel === 'keyword' || query }" @click="togglePanel('keyword')">
          <Search :size="17" />关键词
        </button>
      </div>
      <span v-if="snapshot?.reference_date" class="overview-period">
        <CalendarDays :size="15" />
        {{ snapshot.window_days }} 天 · 数据截至 {{ homeFormatDate(snapshot.reference_date) }}
      </span>
    </div>

    <div v-if="panel === 'map'" class="geography">
      <GroundNewsWorldMap :countries="countries" :places="places" :selection="selection" @focus="selectFocus" />
      <div class="map-options">
        <label>
          国家和地区
          <select :value="selection?.country || ''" @change="selectCountry($event.target.value)">
            <option value="">全球</option>
            <optgroup v-for="[label, regions] in countryGroups" :key="label" :label="label">
              <option v-for="region in regions" :key="region.code" :value="region.code">
                {{ region.name }} · {{ region.count }}
              </option>
            </optgroup>
          </select>
        </label>
        <label v-if="country === 'CN'">
          省级地区
          <select :value="province" @change="selectPlace($event.target.value)">
            <option value="">全国</option>
            <option v-for="item in provinces" :key="item.id" :value="item.id">
              {{ item.name }} · {{ item.count }}
            </option>
          </select>
        </label>
        <label v-if="localPlaces.length">
          {{ country === 'CN' ? '城市' : '城市和省州' }}
          <select :value="activePlace?.kind === 'city' || country !== 'CN' ? place : ''" @change="selectPlace($event.target.value || province)">
            <option value="">全部</option>
            <option v-for="item in localPlaces" :key="item.id" :value="item.id">
              {{ item.name }} · {{ item.count }}
            </option>
          </select>
        </label>
        <details v-if="snapshot?.unlocated_events" class="location-coverage">
          <summary>{{ formatNumber(snapshot.unlocated_events) }} 件事件地点待识别</summary>
          <dl v-if="snapshot.unlocated_breakdown">
            <div v-for="[key, label] in locationReasons" :key="key">
              <dt>{{ label }}</dt><dd>{{ formatNumber(snapshot.unlocated_breakdown[key] || 0) }}</dd>
            </div>
          </dl>
        </details>
      </div>
    </div>

    <div v-else-if="panel === 'keyword'" class="keyword" aria-label="关键词视角">
      <form class="keyword-form" @submit.prevent="searchKeyword">
        <label class="keyword-field">
          <Search :size="17" />
          <input v-model="keyword" type="search" maxlength="100" aria-label="事件关键词" placeholder="输入主题、人物或地点" @search="clearKeyword" />
        </label>
        <button type="submit">搜索</button>
      </form>
      <div class="keyword-presets" aria-label="常用关键词">
        <button v-for="term in presets" :key="term" type="button" :aria-pressed="query === term" @click="searchKeyword(term)">
          {{ term }}
        </button>
      </div>
    </div>

    <header v-if="current" class="results-heading" role="status">
      <h2>{{ resultsHeading }}</h2>
      <span>{{ formatNumber(current.match_count) }} 件收录</span>
    </header>
  </section>
</template>

<script setup>
import { CalendarDays, Globe, Search } from 'lucide-vue-next'
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { groundNewsApi } from './api.js'
import { homeFormatDate } from './home.js'
import GroundNewsWorldMap from './GroundNewsWorldMap.vue'

const route = useRoute()
const router = useRouter()
const panel = ref('map')
const mapFocus = ref(null)
const keyword = ref('')
const snapshot = shallowRef(null)
const snapshotKey = ref('')
const loadedCountry = ref('')
const loading = ref(false)
const error = ref(false)
const presets = ['政治', '经济', '文化', '科技', '社会']
const locationReasons = [
  ['no_location_field', '地点字段未填'],
  ['unmatched_location', '地点有歧义或缺少地名'],
  ['broad_scope', '跨国或范围过宽'],
]
const numberFormat = new Intl.NumberFormat('zh-CN')
const formatNumber = (value) => numberFormat.format(value)

const country = computed(() => typeof route.query.country === 'string' ? route.query.country : '')
const place = computed(() => country.value && typeof route.query.place === 'string' ? route.query.place : '')
const query = computed(() => typeof route.query.q === 'string' ? route.query.q.slice(0, 100).trim() : '')
const filterKey = computed(() => JSON.stringify([country.value, place.value, query.value]))
const current = computed(() => (snapshotKey.value === filterKey.value ? snapshot.value : null))
const countries = computed(() => snapshot.value?.countries ?? [])
const countryGroups = computed(() => {
  const groups = new Map()
  for (const region of countries.value) {
    const group = groups.get(region.continent) || []
    group.push(region)
    groups.set(region.continent, group)
  }
  for (const regions of groups.values()) regions.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
  return [...groups].sort(([a], [b]) => a.localeCompare(b, 'zh-CN'))
})
const places = computed(() =>
  loadedCountry.value === country.value
    ? [...(snapshot.value?.places || [])].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-CN'))
    : [],
)
const activePlace = computed(() => places.value.find((item) => item.id === place.value))
const activeCountry = computed(() => countries.value.find((item) => item.code === country.value))
const selection = computed(() => {
  if (!country.value) return null
  if (mapFocus.value?.country === country.value && mapFocus.value?.place === place.value) return mapFocus.value
  return { country: country.value, place: place.value, coordinates: activePlace.value?.coordinates || activeCountry.value?.coordinates }
})
const provinces = computed(() => places.value.filter((item) => item.id.startsWith('region-chn-')))
const province = computed(() => {
  if (country.value !== 'CN') return ''
  const id = activePlace.value?.kind === 'city' ? activePlace.value.region : place.value
  return provinces.value.some((item) => item.id === id) ? id : ''
})
const localPlaces = computed(() => country.value === 'CN'
  ? places.value.filter((item) => item.kind === 'city' && (!province.value || item.region === province.value))
  : places.value,
)
const resultsHeading = computed(() => {
  const area = activePlace.value?.name || activeCountry.value?.name
  if (query.value) return [area, query.value, '重点事件'].filter(Boolean).join(' · ')
  return area ? area + ' · 重点事件' : '全球重点事件'
})

function togglePanel(next) {
  panel.value = panel.value === next ? '' : next
}

function updateScope(filters) {
  void router.replace({ query: { ...route.query, ...filters }, hash: '' })
}

function selectFocus(focus) {
  mapFocus.value = focus
  updateScope({ country: focus?.country || undefined, place: focus?.place || undefined })
}

function selectCountry(code) {
  const region = countries.value.find((item) => item.code === code)
  selectFocus(region ? { country: code, place: '', coordinates: region.coordinates } : null)
}

function selectPlace(id) {
  const item = places.value.find((entry) => entry.id === id)
  if (item) selectFocus({ country: item.country, place: id, coordinates: item.coordinates })
  else selectFocus({ country: country.value, place: '', coordinates: activeCountry.value?.coordinates })
}

function searchKeyword(term) {
  if (typeof term === 'string') keyword.value = term
  updateScope({ q: keyword.value.trim() || undefined })
}

function clearKeyword() {
  if (!keyword.value) searchKeyword('')
}

let request
async function refresh() {
  request?.abort()
  const controller = new AbortController()
  const key = filterKey.value
  const selectedCountry = country.value
  request = controller
  error.value = false
  loading.value = true
  try {
    const response = await groundNewsApi.getOverview({
      country: selectedCountry,
      place: place.value,
      query: query.value,
      signal: controller.signal,
    })
    if (controller.signal.aborted) return
    snapshot.value = response
    snapshotKey.value = key
    loadedCountry.value = selectedCountry
  } catch {
    if (!controller.signal.aborted) error.value = true
  } finally {
    if (request === controller) loading.value = false
  }
}

watch(query, (value) => { keyword.value = value }, { immediate: true })
watch(filterKey, refresh, { immediate: true })
onBeforeUnmount(() => request?.abort())
defineExpose({ refresh, loading, error, current })
</script>

<style scoped>
.global-overview { width: min(100%, 1380px); margin: 0 auto 16px; color: #243337; }
.overview-controls, .results-heading { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; }
.overview-controls { padding: 0 0 10px; }
.perspective { display: inline-flex; gap: 3px; padding: 3px; background: #e6eeef; border: 1px solid #dce6e7; border-radius: 8px; }
.perspective button {
  display: inline-flex; min-height: 36px; align-items: center; gap: 7px; padding: 0 13px;
  color: #445b63; background: transparent; border: 0; border-radius: 5px; font-size: 14px; font-weight: 600;
}
.perspective button.selected { color: #155a52; background: #fff; box-shadow: 0 1px 3px #213b4026; }
.overview-period { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: #536874; }
.geography { display: grid; grid-template-columns: minmax(0, 2.6fr) minmax(175px, 1fr); gap: 16px; padding: 3px 0 12px; }
.map-options { display: grid; gap: 10px; align-content: start; min-width: 0; }
.map-options label { display: grid; min-width: 0; gap: 5px; color: #526770; font-size: 13px; }
.map-options select, .keyword-field {
  min-width: 0; min-height: 38px; padding: 0 9px; color: #26383c; background: #fff;
  border: 1px solid #ceddde; border-radius: 6px; font: inherit; font-size: 14px;
}
.location-coverage { color: #526770; font-size: 13px; }
.location-coverage summary { cursor: pointer; }
.location-coverage dl { margin: 8px 0 0; }
.location-coverage dl div { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 4px; }
.location-coverage dd { margin: 0; font-variant-numeric: tabular-nums; }
.keyword { padding: 3px 0 12px; }
.keyword-form, .keyword-presets { display: flex; flex-wrap: wrap; gap: 8px; }
.keyword-form { max-width: 680px; }
.keyword-field { display: flex; flex: 1 1 185px; align-items: center; gap: 8px; }
.keyword-field input { width: 100%; min-width: 0; color: inherit; background: transparent; border: 0; font: inherit; }
.keyword-field:focus-within { outline: 2px solid #4f958a; }
.keyword-field input:focus { outline: none; }
.keyword-form > button {
  min-height: 38px; padding: 0 15px; color: #fff; background: #2e776d; border: 1px solid #2e776d;
  border-radius: 6px; font-size: 14px; font-weight: 600;
}
.keyword-presets { margin-top: 10px; }
.keyword-presets button {
  padding: 5px 10px; color: #3b5d60; background: #f1f6f4; border: 1px solid #dce7e2; border-radius: 5px; font-size: 13px;
}
.keyword-presets button[aria-pressed='true'] { color: #14584f; background: #d9ece6; }
.results-heading { padding: 8px 0 0; border-top: 1px solid #dfe8e9; }
.results-heading h2 { margin: 0; overflow-wrap: anywhere; font-size: 18px; line-height: 1.3; }
.results-heading > span { color: #586e77; font-size: 13px; }
@media (max-width: 680px) {
  .geography { grid-template-columns: minmax(0, 1fr); gap: 10px; }
  .map-options { grid-template-columns: repeat(auto-fit, minmax(135px, 1fr)); }
  .location-coverage { grid-column: 1 / -1; }
}
</style>
