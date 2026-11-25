<template>
  <main class="global-overview" data-tour="ground-news-edition">
    <div class="overview-controls">
      <div class="perspective" role="group" aria-label="事件视角">
        <button type="button" :aria-pressed="mode === 'map'" @click="mode = 'map'">
          <Globe :size="17" />地图
        </button>
        <button type="button" :aria-pressed="mode === 'keyword'" @click="mode = 'keyword'">
          <Search :size="17" />关键词
        </button>
      </div>
      <span v-if="snapshot?.reference_date" class="overview-period">
        <CalendarDays :size="15" />
        {{ snapshot.window_days }} 天 · 数据截至 {{ homeFormatDate(snapshot.reference_date) }}
      </span>
    </div>

    <div :class="['overview-content', { 'has-map': mode === 'map' }]">
      <section v-if="mode === 'map'" class="geography" aria-label="地域视角">
        <GroundNewsWorldMap :countries="countries" :places="places" :selection="selection" @focus="selectFocus" />
        <div class="geography-controls">
          <label>
            <span>国家和地区</span>
            <select :value="selection?.country || ''" @change="selectCountry($event.target.value)">
              <option value="">全球</option>
              <optgroup v-for="[label, regions] in countryGroups" :key="label" :label="label">
                <option v-for="region in regions" :key="region.code" :value="region.code">
                  {{ region.name }} · {{ region.count }}
                </option>
              </optgroup>
            </select>
          </label>
          <label v-if="places.length">
            <span>城市和省州</span>
            <select :value="selection?.place || ''" @change="selectPlace($event.target.value)">
              <option value="">全部</option>
              <option v-for="place in places" :key="place.id" :value="place.id">
                {{ place.name }} · {{ place.count }}
              </option>
            </select>
          </label>
        </div>
        <p v-if="snapshot?.unlocated_events" class="location-coverage">
          {{ formatNumber(snapshot.unlocated_events) }} 件事件地点待识别
        </p>
      </section>

      <section v-else class="keyword" aria-label="关键词视角">
        <form class="keyword-form" @submit.prevent="searchKeyword">
          <label class="keyword-field">
            <Search :size="17" />
            <input v-model="keyword" type="search" maxlength="100" aria-label="事件关键词" placeholder="输入主题、人物或地点" @search="clearKeyword" />
          </label>
          <button type="submit">搜索</button>
        </form>
        <div class="keyword-presets" aria-label="常用关键词">
          <button v-for="term in presets" :key="term" type="button" :aria-pressed="appliedKeyword === term" @click="searchKeyword(term)">
            {{ term }}
          </button>
        </div>
      </section>

      <section class="ranked-events" :aria-busy="loading">
        <header class="results-heading">
          <div>
            <h2>{{ resultsHeading }}</h2>
            <p v-if="current && !ocean" role="status">{{ formatNumber(current.match_count) }} 件收录<span v-if="current.match_count > current.stories.length"> · 显示前 {{ current.stories.length }} 件</span></p>
          </div>
          <details class="score-method">
            <summary><Info :size="15" />重要性</summary>
            <p>满分 100。综合本地模型判断、报道覆盖、时间与事件关联。待打分事件先按已有信号排序。</p>
          </details>
        </header>

        <p v-if="loading && !current && !ocean" class="results-status" role="status">
          <LoaderCircle :size="17" class="results-spinner" /> 正在整理重点事件
        </p>
        <div v-else-if="error && !ocean" class="results-status" role="alert">
          <span>事件加载失败</span><button type="button" @click="refresh">重试</button>
        </div>
        <p v-else-if="ocean || (current && !current.stories.length)" class="results-status" role="status">
          {{ ocean ? '该位置暂无可定位的事件' : '这个范围暂无匹配事件' }}
        </p>
        <ol v-else-if="current?.stories.length" class="event-ranking">
          <li v-for="story in current.stories" :key="story.cluster_id">
            <RouterLink :to="homeStoryPath(story)" class="ranked-story">
              <div class="ranked-story__copy">
                <div class="ranked-story__meta">
                  <span>{{ homeFormatDate(story.day) }}</span>
                  <span v-if="story.locations.length">{{ story.involved_only ? '涉及 ' : '' }}{{ story.locations.join('、') }}</span>
                </div>
                <h3>{{ story.display_title }}</h3>
                <div class="ranked-story__meta">
                  <span>{{ story.source_count }} 个信源</span>
                  <span>{{ story.article_count }} 篇报道</span>
                  <span v-if="story.related_events">{{ story.related_events }} 个关联事件</span>
                </div>
              </div>
              <span class="ranked-story__score" :aria-label="'重要性 ' + story.importance + ' 分'">
                <strong>{{ story.importance.toFixed(1) }}</strong><span>分</span>
              </span>
            </RouterLink>
          </li>
        </ol>
      </section>
    </div>
  </main>
</template>

<script setup>
import { CalendarDays, Globe, Info, LoaderCircle, Search } from 'lucide-vue-next'
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { groundNewsApi } from './api.js'
import { homeFormatDate, homeStoryPath } from './home.js'
import GroundNewsWorldMap from './GroundNewsWorldMap.vue'

const mode = ref('map')
const selection = ref(null)
const keyword = ref('')
const appliedKeyword = ref('')
const snapshot = shallowRef(null)
const snapshotKey = ref('')
const loadedCountry = ref('')
const loading = ref(false)
const error = ref(false)
const presets = ['外交', '经贸', '科技', '选举', '气候']
const numberFormat = new Intl.NumberFormat('zh-CN')
const formatNumber = (value) => numberFormat.format(value)

const country = computed(() => (mode.value === 'map' ? selection.value?.country || '' : ''))
const place = computed(() => (mode.value === 'map' ? selection.value?.place || '' : ''))
const query = computed(() => (mode.value === 'keyword' ? appliedKeyword.value : ''))
const ocean = computed(() => mode.value === 'map' && Boolean(selection.value) && !country.value)
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
const resultsHeading = computed(() => {
  if (ocean.value) return '地图选点'
  if (query.value) return query.value + ' · 重点事件'
  const locality = places.value.find((item) => item.id === place.value)
  const region = countries.value.find((item) => item.code === country.value)
  const name = locality?.name || region?.name
  return name ? name + ' · 重点事件' : '全球重点事件'
})

function selectFocus(focus) {
  selection.value = focus
}

function selectCountry(code) {
  const region = countries.value.find((item) => item.code === code)
  selectFocus(region ? { country: code, place: '', coordinates: region.coordinates } : null)
}

function selectPlace(id) {
  const item = places.value.find((entry) => entry.id === id)
  if (item) selectFocus({ country: item.country, place: id, coordinates: item.coordinates })
  else selectCountry(country.value)
}

function searchKeyword(term) {
  if (typeof term === 'string') keyword.value = term
  appliedKeyword.value = keyword.value.trim()
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

watch(filterKey, refresh, { immediate: true })
onBeforeUnmount(() => request?.abort())
defineExpose({ refresh, loading })
</script>

<style scoped>
.global-overview {
  width: min(100%, 1380px);
  margin: 0 auto;
  color: #243337;
}
.overview-controls, .results-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
}
.overview-controls { padding: 3px 0 15px; }
.perspective {
  display: inline-flex;
  gap: 3px;
  padding: 3px;
  background: #e6eeef;
  border: 1px solid #dce6e7;
  border-radius: 8px;
}
.perspective button {
  display: inline-flex;
  min-height: 36px;
  align-items: center;
  gap: 7px;
  padding: 0 13px;
  color: #445b63;
  background: transparent;
  border: 0;
  border-radius: 5px;
  font-size: 14px;
  font-weight: 600;
}
.perspective button[aria-pressed='true'] {
  color: #155a52;
  background: #fff;
  box-shadow: 0 1px 3px #213b4026;
}
.overview-period {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #536874;
}
.overview-content {
  display: grid;
  min-width: 0;
  gap: 16px;
}
.overview-content.has-map {
  grid-template-columns: minmax(0, 1.34fr) minmax(0, 1fr);
  gap: 22px;
}
.geography { min-width: 0; }
.geography-controls {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}
.geography-controls label { display: grid; min-width: 0; gap: 5px; }
.geography-controls label > span, .location-coverage {
  color: #526770;
  font-size: 13px;
}
.geography-controls select, .keyword-field {
  min-width: 0;
  min-height: 38px;
  padding: 0 9px;
  color: #26383c;
  background: #fff;
  border: 1px solid #ceddde;
  border-radius: 6px;
  font: inherit;
  font-size: 14px;
}
.location-coverage { margin: 10px 0 0; }
.keyword { padding: 3px 0 7px; }
.keyword-form, .keyword-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.keyword-form { max-width: 680px; }
.keyword-field {
  display: flex;
  flex: 1 1 185px;
  align-items: center;
  gap: 8px;
}
.keyword-field input {
  width: 100%;
  min-width: 0;
  color: inherit;
  background: transparent;
  border: 0;
  font: inherit;
}
.keyword-field:focus-within { outline: 2px solid #4f958a; }
.keyword-field input:focus { outline: none; }
.keyword-form > button, .results-status button {
  min-height: 38px;
  padding: 0 15px;
  color: #fff;
  background: #2e776d;
  border: 1px solid #2e776d;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
}
.keyword-presets { margin-top: 10px; }
.keyword-presets button {
  padding: 5px 10px;
  color: #3b5d60;
  background: #f1f6f4;
  border: 1px solid #dce7e2;
  border-radius: 5px;
  font-size: 13px;
}
.keyword-presets button[aria-pressed='true'] { color: #14584f; background: #d9ece6; }
.ranked-events {
  min-width: 0;
  border-top: 2px solid #43645e;
}
.results-heading {
  position: relative;
  align-items: flex-start;
  padding: 10px 0 9px;
}
.results-heading h2 {
  margin: 0;
  overflow-wrap: anywhere;
  font-size: 20px;
  line-height: 1.3;
}
.results-heading p {
  margin: 4px 0 0;
  color: #586e77;
  font-size: 13px;
}
.score-method { position: relative; }
.score-method summary {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #536a71;
  cursor: pointer;
  font-size: 13px;
  list-style: none;
}
.score-method summary::-webkit-details-marker { display: none; }
.score-method p {
  position: absolute;
  z-index: 1;
  right: 0;
  width: 220px;
  padding: 9px 10px;
  color: #314347;
  background: #fff;
  border: 1px solid #ccdcdd;
  border-radius: 6px;
  box-shadow: 0 5px 15px #213b401c;
  line-height: 1.5;
}
.event-ranking { margin: 0; padding: 0; list-style: none; }
.event-ranking li { border-bottom: 1px solid #dfe8e9; }
.event-ranking li:first-child { border-top: 1px solid #dfe8e9; }
.ranked-story {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 60px;
  align-items: center;
  gap: 10px;
  min-height: 74px;
  padding: 10px 5px;
  color: #223437;
  text-decoration: none;
}
.ranked-story:hover { background: #edf5f2; }
.ranked-story__copy { min-width: 0; }
.ranked-story h3 {
  margin: 3px 0 4px;
  overflow-wrap: anywhere;
  font-size: 15px;
  line-height: 1.4;
}
.ranked-story__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 9px;
  color: #5b6e75;
  font-size: 12px;
  line-height: 1.4;
}
.ranked-story__score {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: baseline;
  justify-items: end;
  gap: 3px;
  color: #14655a;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.ranked-story__score strong { font-size: 20px; }
.results-status {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 48px;
  margin: 0;
  color: #526b72;
  font-size: 14px;
}
.results-spinner { animation: overview-spin 0.85s linear infinite; }
@keyframes overview-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .results-spinner { animation: none; }
}
@media (max-width: 900px) {
  .overview-content.has-map { grid-template-columns: minmax(0, 1fr); }
}
</style>
