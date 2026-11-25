<template>
  <div class="world-map">
    <div
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
        {{ mapError ? '地图加载失败，可用下方地区选择' : '正在加载地图' }}
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
import { geoContains, geoGraticule10, geoNaturalEarth1, geoPath } from 'd3-geo'
import { Crosshair, Minus, Plus, RotateCcw } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import geometryUrl from '@/assets/ground-news/world-countries.json?url'

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
    const surface = count > 100 ? '#81b7a9' : count > 20 ? '#a1c9bd' : count ? '#bdD7ce' : '#dfe7e3'
    const selected = props.selection?.country === feature.id
    trace(feature, selected ? '#428f80' : surface, selected ? '#1f6e60' : '#f4f8f5')
  }
  const displayPlaces = props.places
    .filter((place) => place.kind === 'city' || place.id === props.selection?.place)
    .slice()
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
  if (!coordinates?.every(Number.isFinite) || Math.abs(coordinates[0]) > 180 || Math.abs(coordinates[1]) > 90) return
  const nearby = cityMarkers
    .map(({ place, point: [x, y] }) => ({ place, distance: Math.hypot(x - point[0], y - point[1]) }))
    .sort((a, b) => a.distance - b.distance)[0]
  if (nearby?.distance <= 10) {
    const place = nearby.place
    emit('focus', { country: place.country, place: place.id, coordinates: place.coordinates })
    return
  }
  const region = features.value.find((feature) => feature.id && geoContains(feature, coordinates))
  emit('focus', { country: region?.id || '', place: '', coordinates })
}

function changeZoom(multiplier) {
  zoom.value = Math.max(1, Math.min(8, zoom.value * multiplier))
}

function reset() {
  zoom.value = 1
  emit('focus', null)
}

watch(() => [props.countries, props.places, props.selection, zoom.value], scheduleDraw)
onMounted(async () => {
  try {
    const response = await fetch(geometryUrl, { signal: fetchController.signal })
    if (!response.ok) throw new Error('Map download failed')
    features.value = (await response.json()).features
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
  aspect-ratio: 2 / 1;
  min-height: 200px;
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
