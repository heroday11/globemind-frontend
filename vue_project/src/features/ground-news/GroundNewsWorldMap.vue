<template>
  <div class="world-map">
    <figure v-if="isChina" class="world-map__china">
      <img
        :src="chinaStandardMapUrl"
        width="2183"
        height="2663"
        alt="中华人民共和国标准地图，展示台湾省、南海诸岛和陆地国界"
        draggable="false"
        @click="selectChinaProvince"
      />
      <figcaption>
        <span>自然资源部监制 · GS(2019)1818号</span>
        <div class="world-map__tools world-map__tools--inline">
          <a :href="chinaStandardMapUrl" target="_blank" rel="noopener" title="查看原图" aria-label="查看中国标准地图原图（新标签页）">
            <Maximize2 :size="16" />
          </a>
          <button type="button" title="回到全球" aria-label="回到全球" @click="reset">
            <RotateCcw :size="16" />
          </button>
        </div>
      </figcaption>
    </figure>
    <div
      v-show="!isChina"
      ref="stage"
      class="world-map__stage"
      :class="{ 'is-dragging': pointerId !== null }"
      @pointerdown="startFocus"
      @pointermove="moveFocus"
      @pointerup="finishFocus"
      @pointercancel="cancelFocus"
      @lostpointercapture="cancelFocus"
    >
      <canvas ref="canvas" aria-hidden="true" />
      <div v-if="!ready" class="world-map__status" role="status">
        {{ mapError ? '地图加载失败，可用地区选择' : '正在加载地图' }}
      </div>
      <span v-if="markerStyle" class="world-map__dart" :style="markerStyle" aria-hidden="true">
        <Crosshair :size="23" :stroke-width="2" />
      </span>
      <div class="world-map__tools" @pointerdown.stop>
        <button type="button" title="放大地图" aria-label="放大地图" :disabled="zoom >= 8" @click="changeZoom(2)"><Plus :size="18" /></button>
        <button type="button" title="缩小地图" aria-label="缩小地图" :disabled="zoom <= 1" @click="changeZoom(0.5)"><Minus :size="18" /></button>
        <button type="button" title="回到全球" aria-label="回到全球" @click="reset"><RotateCcw :size="16" /></button>
      </div>
      <span class="world-map__credit">Natural Earth</span>
    </div>
  </div>
</template>

<script setup>
import { geoContains, geoGraticule10, geoNaturalEarth1, geoPath, geoStream } from 'd3-geo'
import { Crosshair, Maximize2, Minus, Plus, RotateCcw } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import geometryUrl from '@/assets/ground-news/world-countries.json?url'
import chinaGeometryUrl from '@/assets/ground-news/china-provinces.json?url'
import chinaStandardMapUrl from '@/assets/ground-news/china-standard-map.jpg?url'

const props = defineProps({
  countries: { type: Array, required: true },
  places: { type: Array, required: true },
  selection: { type: Object, default: null },
})
const emit = defineEmits(['focus'])
const stage = ref(null)
const canvas = ref(null)
const ready = ref(false)
const mapError = ref(false)
const zoom = ref(1)
const pointerId = ref(null)
const preview = ref(null)
const marker = ref(null)
const features = shallowRef([])
const provinces = shallowRef([])
const isChina = computed(() => props.selection?.country === 'CN')
let chinaRequest
const countryCounts = computed(() => new Map(props.countries.map((item) => [item.code, item.count])))
const sphere = { type: 'Sphere' }
const graticule = geoGraticule10()
let observer
let projection
let dimensions = [0, 0]
let cityMarkers = []
let animationFrame
const fetchController = new AbortController()

const markerStyle = computed(() => {
  const current = preview.value || marker.value
  return current ? { left: current[0] + 'px', top: current[1] + 'px' } : null
})

function draw() {
  if (isChina.value || !stage.value || !ready.value) return
  const { width, height } = stage.value.getBoundingClientRect()
  if (!width || !height) return
  const context = canvas.value.getContext('2d')
  if (!context) return
  const ratio = Math.min(window.devicePixelRatio || 1, 2)
  const pixelWidth = Math.round(width * ratio)
  const pixelHeight = Math.round(height * ratio)
  if (canvas.value.width !== pixelWidth || canvas.value.height !== pixelHeight) {
    canvas.value.width = pixelWidth
    canvas.value.height = pixelHeight
  }
  context.setTransform(ratio, 0, 0, ratio, 0, 0)
  context.clearRect(0, 0, width, height)
  dimensions = [width, height]
  projection = geoNaturalEarth1().fitExtent([[4, 8], [width - 4, height - 8]], sphere)
  const focus = props.selection?.coordinates || [0, 18]
  if (zoom.value > 1) {
    const original = projection(focus)
    const center = projection.translate()
    projection.scale(projection.scale() * zoom.value).translate([
      width / 2 - (original[0] - center[0]) * zoom.value,
      height / 2 - (original[1] - center[1]) * zoom.value,
    ])
  }
  const path = geoPath(projection, context)
  trace(sphere, '#e9f2f5', '#d1e1e8')
  trace(graticule, null, '#d9e6ec')
  for (const feature of features.value) {
    const count = countryCounts.value.get(feature.id) || 0
    const surface = count > 100 ? '#81b7a9' : count > 20 ? '#a1c9bd' : count ? '#bdd7ce' : '#dfe7e3'
    const selected = props.selection?.country === feature.id
    trace(feature, selected ? '#428f80' : surface, selected ? '#1f6e60' : '#f4f8f5')
  }
  const displayPlaces = props.places
    .filter((place) => place.kind === 'city')
    .sort((a, b) => b.count - a.count)
    .slice(0, 40)
  cityMarkers = zoom.value > 1 && props.selection?.country
    ? displayPlaces.map((place) => ({ place, point: projection(place.coordinates) }))
    : []
  for (const { place, point } of cityMarkers) {
    context.beginPath()
    context.arc(point[0], point[1], place.id === props.selection?.place ? 5 : 3.5, 0, Math.PI * 2)
    context.fillStyle = '#225c55'
    context.fill()
    context.strokeStyle = '#fff'
    context.stroke()
  }
  marker.value = projection(focus)

  function trace(shape, fill, stroke) {
    context.beginPath()
    path(shape)
    if (fill) {
      context.fillStyle = fill
      context.fill()
    }
    context.strokeStyle = stroke
    context.lineWidth = 0.8
    context.stroke()
  }
}

function selectChinaProvince(event) {
  const image = event.currentTarget
  if (!image.naturalWidth) return
  const box = image.getBoundingClientRect()
  const x = (event.clientX - box.left) * image.naturalWidth / box.width
  const y = (event.clientY - box.top) * image.naturalHeight / box.height
  if (x < 42 || x > 2140 || y < 163 || y > 2555) return

  // Fit the printed graticule in GS(2019)1818 for province selection.
  const dx = x - 1193
  const dy = y + 3089
  const toDegrees = 180 / Math.PI
  const longitude = 105.18 + Math.atan2(dx, dy) * toDegrees / 0.456
  const latitude = (5689 - Math.hypot(dx, dy)) * toDegrees / 2565
  const coordinates = [longitude, latitude]
  const province = provinces.value.find((feature) => geoContains(feature, coordinates))
  if (province) emit('focus', { country: 'CN', place: province.id, coordinates })
}

function scheduleDraw() {
  if (animationFrame !== undefined) cancelAnimationFrame(animationFrame)
  animationFrame = requestAnimationFrame(draw)
}

function eventPoint(event) {
  const box = stage.value.getBoundingClientRect()
  return [
    Math.max(0, Math.min(dimensions[0], event.clientX - box.left)),
    Math.max(0, Math.min(dimensions[1], event.clientY - box.top)),
  ]
}

function startFocus(event) {
  if (!projection || event.button !== 0 || pointerId.value !== null) return
  pointerId.value = event.pointerId
  stage.value.setPointerCapture(event.pointerId)
  preview.value = eventPoint(event)
}

function moveFocus(event) {
  if (pointerId.value === event.pointerId) preview.value = eventPoint(event)
}

function cancelFocus(event) {
  if (pointerId.value !== event.pointerId) return
  pointerId.value = null
  preview.value = null
}

function finishFocus(event) {
  if (pointerId.value !== event.pointerId) return
  const point = eventPoint(event)
  cancelFocus(event)
  const coordinates = projection.invert(point)
  const nearby = cityMarkers
    .map(({ place, point: [x, y] }) => ({ place, distance: Math.hypot(x - point[0], y - point[1]) }))
    .sort((a, b) => a.distance - b.distance)[0]
  if (nearby?.distance <= 10) {
    const place = nearby.place
    emit('focus', { country: place.country, place: place.id, coordinates: place.coordinates })
    return
  }
  const valid = coordinates?.every(Number.isFinite) && Math.abs(coordinates[0]) <= 180 && Math.abs(coordinates[1]) <= 90
  const candidates = features.value.filter((feature) => feature.id)
  const direct = valid && candidates.find((feature) => geoContains(feature, coordinates))
  const match = direct ? { id: direct.id, coordinates } : nearestBoundary(point, candidates)
  if (match) emit('focus', { country: match.id, place: '', coordinates: match.coordinates })
}

function nearestBoundary([x, y], candidates) {
  let nearest
  let distance = Infinity
  let currentId
  let first
  let previous

  function visit(point) {
    if (previous) {
      const dx = point[0] - previous[0]
      const dy = point[1] - previous[1]
      const length = dx * dx + dy * dy
      const unit = length ? Math.max(0, Math.min(1, ((x - previous[0]) * dx + (y - previous[1]) * dy) / length)) : 0
      const closest = [previous[0] + unit * dx, previous[1] + unit * dy]
      const squaredDistance = (x - closest[0]) ** 2 + (y - closest[1]) ** 2
      if (squaredDistance < distance) {
        distance = squaredDistance
        nearest = { id: currentId, coordinates: projection.invert(closest) }
      }
    }
    first ??= point
    previous = point
  }
  const stream = projection.stream({
    polygonStart() {},
    polygonEnd() {},
    lineStart() { first = previous = null },
    lineEnd() { if (first) visit(first) },
    point(lon, lat) { visit([lon, lat]) },
  })
  for (const feature of candidates) {
    currentId = feature.id
    geoStream(feature, stream)
  }
  return nearest?.coordinates?.every(Number.isFinite) ? nearest : null
}

function changeZoom(multiplier) {
  zoom.value = Math.max(1, Math.min(8, zoom.value * multiplier))
}

function reset() {
  zoom.value = 1
  emit('focus', null)
}

async function fetchGeometry(url) {
  const response = await fetch(url, { signal: fetchController.signal })
  if (!response.ok) throw new Error('Map download failed')
  return (await response.json()).features
}

watch(() => props.selection?.country, (country, previousCountry) => {
  if (country === 'CN' || previousCountry === 'CN') zoom.value = 1
  if (country === 'CN' && !chinaRequest) {
    chinaRequest = fetchGeometry(chinaGeometryUrl)
      .then((geometry) => { provinces.value = geometry })
      .catch(() => { chinaRequest = null })
  }
}, { immediate: true })
watch(() => [props.countries, props.places, props.selection, zoom.value, isChina.value], scheduleDraw)
onMounted(async () => {
  try {
    features.value = await fetchGeometry(geometryUrl)
    if (fetchController.signal.aborted) return
    ready.value = true
    observer = new ResizeObserver(scheduleDraw)
    observer.observe(stage.value)
    scheduleDraw()
  } catch {
    if (!fetchController.signal.aborted) mapError.value = true
  }
})
onBeforeUnmount(() => {
  fetchController.abort()
  observer?.disconnect()
  cancelAnimationFrame(animationFrame)
})
</script>

<style scoped>
.world-map__china { margin: 0; width: fit-content; max-width: 100%; }
.world-map__china img {
  display: block;
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: 580px;
  cursor: crosshair;
}
.world-map__china figcaption {
  display: flex;
  flex-wrap: wrap;
  gap: 5px 10px;
  justify-content: space-between;
  align-items: center;
  margin-top: 6px;
  color: #566b75;
  font-size: 12px;
}
.world-map__stage {
  position: relative;
  width: 100%;
  height: clamp(200px, 24vw, 296px);
  min-width: 0;
  overflow: hidden;
  touch-action: none;
  cursor: crosshair;
  background: #f2f7f8;
  border: 1px solid #d8e6e7;
  border-radius: 8px;
}
.world-map__stage.is-dragging { cursor: grabbing; }
canvas { display: block; width: 100%; height: 100%; }
.world-map__dart {
  position: absolute;
  display: grid;
  place-items: center;
  width: 35px;
  height: 35px;
  color: #154d4c;
  background: #f9ffffeb;
  border: 1px solid #266b63;
  border-radius: 50%;
  box-shadow: 0 2px 7px #16474530;
  transform: translate(-50%, -50%);
  pointer-events: none;
}
.world-map__tools {
  position: absolute;
  display: grid;
  gap: 4px;
  top: 9px;
  right: 9px;
}
.world-map__tools--inline { position: static; display: flex; }
.world-map__tools :is(a, button) {
  display: grid;
  width: 32px;
  height: 32px;
  padding: 0;
  place-items: center;
  color: #263e49;
  background: #fff;
  border: 1px solid #cbdcde;
  border-radius: 6px;
}
.world-map__tools button:disabled { opacity: 0.45; cursor: default; }
.world-map__tools button:not(:disabled):hover { background: #dceee9; }
.world-map__credit {
  position: absolute;
  right: 8px;
  bottom: 4px;
  color: #566b75;
  font-size: 10px;
  pointer-events: none;
}
.world-map__status {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: #475e67;
  font-size: 13px;
  pointer-events: none;
}
</style>
