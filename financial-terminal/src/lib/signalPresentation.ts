import type { MetricSeries, SeriesPoint } from '../types'

function observations(points: SeriesPoint[] = []) {
  const byTime = new Map<number, SeriesPoint>()
  for (const point of points) {
    if (Number.isFinite(point.time) && Number.isFinite(point.value)) byTime.set(point.time, point)
  }
  return [...byTime.values()].sort((a, b) => a.time - b.time)
}

export function signalHasObservations(metric: MetricSeries) {
  const points = observations(metric.points)
  if (metric.status === 'degraded' && !metric.latest && !points.some((point) => point.value !== 0)) return false
  return metric.status !== 'disabled' && metric.status !== 'unavailable'
    && metric.availability !== 'not_computable' && metric.latest !== null
    && Number.isFinite(metric.latest) && points.length > 0
}

export function selectSignalRange(points: SeriesPoint[], days: number) {
  const sorted = observations(points)
  if (!sorted.length) return sorted
  // Anchor the selected window to the latest actual observation, including historical datasets.
  const last = sorted[sorted.length - 1].time
  const midnight = Math.floor(last / 86400) * 86400
  const start = midnight - (Math.max(1, days) - 1) * 86400
  return sorted.filter((point) => point.time >= start)
}

export function signalChangeLabel(value?: number | null, unit = '%') {
  if (value === null || value === undefined || !Number.isFinite(value)) return null
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}${unit === '%' ? '%' : ` ${unit}`}`
}

export function presentSignal(metric?: MetricSeries | null) {
  const daily = metric?.daily_date_basis === 'event_date'
    && metric.daily_unit === '簇'
    ? observations(metric.daily_points).filter((point) => point.value >= 0) : []
  const useDaily = daily.length > 0 && metric?.kind !== 'index'
  const points = useDaily ? daily : observations(metric?.points)
  const last = points[points.length - 1]
  const previous = points[points.length - 2]
  const consecutiveDays = previous && last.time - previous.time === 86400
  const change = useDaily
    ? consecutiveDays && previous.value !== 0 ? ((last.value - previous.value) / Math.abs(previous.value)) * 100
      : consecutiveDays && previous.value === 0 && last.value === 0 ? 0 : null
    : metric?.change_value ?? null
  return {
    points,
    latest: useDaily ? last.value : metric?.latest ?? null,
    unit: useDaily ? metric!.daily_unit! : metric?.unit,
    label: useDaily ? metric!.daily_label || '每日事件簇' : '观测值',
    changeValue: change,
    changeUnit: useDaily ? '%' : metric?.change_unit || '%',
    changePeriod: useDaily ? '较前一日' : metric?.change_period || '较上一观测',
  }
}
