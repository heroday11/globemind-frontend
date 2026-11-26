<template>
  <div class="world-map">
    <div
      ref="stage"
      class="world-map__stage"
      :class="{ 'is-dragging': pointerId !== null, 'is-china': isChina }"
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
      <span class="world-map__credit">{{ china ? 'Natural Earth · DataV' : 'Natural Earth' }}</span>
    </div>
  </div>
</template>

<script setup>
import { geoContains, geoGraticule10, geoNaturalEarth1, geoPath, geoStream } from 'd3-geo'
import { Crosshair, Minus, Plus, RotateCcw } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import geometryUrl from '@/assets/ground-news/world-countries.json?url'
import chinaGeometryUrl from '@/assets/ground-news/china-provinces.json?url'

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
const china = shallowRef(null)
const chinaCountryCodes = new Set(['CN', 'TW', 'HK', 'MO'])
const worldShapes = computed(() => {
  if (!china.value) return features.value
  return features.value.filter((feature) => !chinaCountryCodes.has(feature.id))
})
const isChina = computed(() => props.selection?.country === 'CN' && Boolean(china.value))
const locations = computed(() => new Map(props.places.map((place) => [place.id, place])))
const islandLabels = [
  { name: '台湾省', coordinates: [120.97, 23.75] },
  { name: '南沙群岛', coordinates: [114.37, 10.38], dot: true },
  { name: '钓鱼岛', coordinates: [123.47, 25.75], dot: true },
  { name: '东沙群岛', coordinates: [116.73, 20.70], dot: true },
  { name: '西沙群岛', coordinates: [112.34, 16.83], dot: true },
  { name: '中沙群岛', coordinates: [117.74, 15.15], dot: true },
]
const countryCounts = computed(() => new Map(props.countries.map((item) => [item.code, item.count])))
const defaultFocus = [-98.5, 39.8]
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
  if (!stage.value || !ready.value) return
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
  const extent = isChina.value ? [[16, 12], [width - 28, height - 23]] : [[4, 8], [width - 4, height - 8]]
  const geometry = isChina.value
    ? { type: 'FeatureCollection', features: [china.value.outline, china.value.maritimeBoundary] }
    : sphere
  projection = geoNaturalEarth1().fitExtent(extent, geometry)
  const focus = props.selection ? props.selection.coordinates : defaultFocus
  if (zoom.value > 1 && focus) {
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
  for (const feature of worldShapes.value) {
    drawRegion(feature, isChina.value ? 0 : countryCounts.value.get(feature.id), props.selection?.country === feature.id)
  }
  if (china.value) {
    const chinaCount = countryCounts.value.get('CN')
    if (isChina.value) {
      for (const feature of china.value.features) {
        const count = feature.id ? locations.value.get(feature.id)?.count : chinaCount
        drawRegion(feature, count, props.selection?.place === feature.id)
      }
      trace(china.value.outline, null, '#477d72')
    } else {
      drawRegion(china.value.outline, chinaCount, props.selection?.country === 'CN')
      const regionCode = { TW: 710000, HK: 810000, MO: 820000 }[props.selection?.country]
      if (regionCode) drawRegion(china.value.features.find((feature) => feature.properties.adcode === regionCode), 0, true)
    }
    trace(china.value.maritimeBoundary, '#477d72', '#477d72', isChina.value ? 1.15 : 0.6)
    if (isChina.value) drawProvinceNames(context, width, height)
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
  marker.value = focus ? projection(focus) : null

  function drawRegion(shape, count, selected) {
    const surface = count > 100 ? '#81b7a9' : count > 20 ? '#a1c9bd' : count ? '#bdd7ce' : '#dfe7e3'
    trace(shape, selected ? '#428f80' : surface, selected ? '#1f6e60' : '#f4f8f5')
  }

  function trace(shape, fill, stroke, lineWidth = 0.8) {
    context.beginPath()
    path(shape)
    if (fill) {
      context.fillStyle = fill
      context.fill()
    }
    context.strokeStyle = stroke
    context.lineWidth = lineWidth
    context.stroke()
  }
}

function drawProvinceNames(context, width, height) {
  context.font = '11px Inter, "Noto Sans CJK SC", "PingFang SC", sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  const labels = []
  for (const { name, coordinates, dot } of islandLabels) {
    const [x, y] = projection(coordinates)
    if (dot) {
      context.beginPath()
      context.arc(x, y, 1.5, 0, Math.PI * 2)
      context.fillStyle = '#477d72'
      context.fill()
    }
    const offset = 6 + context.measureText(name).width / 2
    const positions = [
      [x + offset, y], [x - offset, y],
      [x + offset, y - 14], [x - offset, y - 14],
      [x + offset, y + 14], [x - offset, y + 14],
    ]
    positions.some(([labelX, labelY]) => drawLabel(name, labelX, labelY))
  }
  for (const feature of china.value.features) {
    const place = locations.value.get(feature.id)
    if (!place) continue
    const [x, y] = projection(place.coordinates)
    const name = place.name.replace(/(壮族自治区|维吾尔自治区|回族自治区|自治区|省|市)$/, '')
    drawLabel(name, x, y)
  }

  function drawLabel(name, x, y) {
    const half = context.measureText(name).width / 2 + 2
    if (x - half < 2 || x + half > width - 2 || y < 10 || y > height - 12) return false
    if (x + half > width - 42 && y < 118) return false
    if (labels.some((box) => Math.abs(x - box.x) < half + box.half && Math.abs(y - box.y) < 13)) return false
    labels.push({ x, y, half })
    context.strokeStyle = '#fbffff'
    context.lineWidth = 3
    context.strokeText(name, x, y)
    context.fillStyle = '#274a47'
    context.fillText(name, x, y)
    return true
  }
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
  const candidates = isChina.value
    ? china.value.features
    : [china.value?.outline, ...worldShapes.value].filter((feature) => feature?.id)
  const direct = valid && candidates.find((feature) => geoContains(feature, coordinates))
  const match = direct ? { id: direct.id, coordinates } : nearestBoundary(point, candidates)
  if (!match) return
  emit('focus', {
    country: isChina.value ? 'CN' : match.id,
    place: isChina.value ? match.id || '' : '',
    coordinates: match.coordinates,
  })
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
  return response.json()
}

watch(
  [() => props.selection?.country, () => props.selection?.place],
  ([country, place], [previousCountry]) => {
    if (country === 'CN' && place?.startsWith('region-chn-')) zoom.value = Math.max(2, zoom.value)
    else if ((country === 'CN' && !place) || (country !== 'CN' && previousCountry === 'CN')) zoom.value = 1
  },
  { immediate: true },
)
watch(() => [props.countries, props.places, props.selection, zoom.value, china.value], scheduleDraw)
onMounted(async () => {
  void fetchGeometry(chinaGeometryUrl)
    .then((geometry) => { china.value = geometry })
    .catch(() => {})
  try {
    features.value = (await fetchGeometry(geometryUrl)).features
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
.world-map__stage.is-china { height: clamp(230px, 27.5vw, 340px); }
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
.world-map__tools button {
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
