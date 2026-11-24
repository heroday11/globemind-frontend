import assert from 'node:assert/strict'
import test from 'node:test'
import { presentSignal, selectSignalRange, signalHasObservations, signalChangeLabel } from '../src/lib/signalPresentation.ts'
import type { MetricSeries } from '../src/types/index.ts'

function metric(overrides: Partial<MetricSeries> = {}): MetricSeries {
  return { id: 'GN-POL-7D', kind: 'metric', label: '本地政治外交事件簇', unit: '簇/7d', status: 'live',
    latest: 2009, change_pct: -19.45, change_value: -19.45, change_unit: '%', change_period: '较上一观测',
    points: [{ time: 1795219200, value: 2494 }, { time: 1795305600, value: 2009 }], ...overrides }
}

test('daily event counts use independent observations without changing the rolling metric', () => {
  const raw = metric({ daily_points: [{ time: 1795219200, value: 100 }, { time: 1795305600, value: 125 }],
    daily_unit: '簇', daily_label: '每日事件簇', daily_date_basis: 'event_date' })
  const view = presentSignal(raw)
  assert.equal(view.latest, 125)
  assert.equal(view.unit, '簇')
  assert.equal(view.label, '每日事件簇')
  assert.equal(view.changeValue, 25)
  assert.equal(view.changePeriod, '较前一日')
  assert.equal(raw.latest, 2009)
  assert.equal(raw.points[1].value, 2009)
  assert.equal(raw.change_value, -19.45)
})

test('legacy backend and news snapshots keep their declared units and values', () => {
  const raw = metric({ id: 'GN-POL-24H', unit: '条/24h', latest: 15 })
  const view = presentSignal(raw)
  assert.equal(view.latest, 15)
  assert.equal(view.unit, '条/24h')
  assert.equal(view.label, '观测值')
  assert.equal(view.changeValue, -19.45)
})

test('daily fields need the declared event-date basis and expected count unit', () => {
  const raw = metric({ daily_points: [{ time: 1, value: 10 }], daily_unit: '条' })
  assert.equal(presentSignal(raw).latest, 2009)
})

test('zero observations remain visible and zero denominators do not invent a percentage', () => {
  const raw = metric({ latest: 0, points: [{ time: 1, value: 0 }] })
  assert.equal(signalHasObservations(raw), true)
  assert.equal(signalHasObservations({ ...raw, status: 'degraded' }), false)
  assert.equal(signalHasObservations(metric({ status: 'degraded' })), true)
  assert.equal(signalHasObservations(metric({ status: 'disabled' })), false)
  assert.equal(signalHasObservations(metric({ latest: null })), false)
  const view = presentSignal(metric({ daily_points: [{ time: 1, value: 0 }, { time: 2, value: 5 }],
    daily_unit: '簇', daily_date_basis: 'event_date' }))
  assert.equal(view.changeValue, null)
  assert.equal(signalChangeLabel(view.changeValue), null)
  assert.equal(signalChangeLabel(0), '+0.00%')
})

test('range windows use UTC calendar days and actual last observation, without filling missing days', () => {
  const midnight = Date.UTC(2020, 0, 30) / 1000
  const points = [{ time: midnight - 7 * 86400 + 86399, value: 1 },
    { time: midnight - 6 * 86400, value: 2 }, { time: midnight + 86399, value: 3 }]
  assert.deepEqual(selectSignalRange(points, 7), points.slice(1))
  assert.deepEqual(selectSignalRange(points, 30), points)
})

test('observations are sorted, deduplicated, and finite without extrapolation', () => {
  const points = [{ time: 2, value: 4 }, { time: NaN, value: 3 }, { time: 1, value: 8 },
    { time: 2, value: 6 }, { time: 3, value: Infinity }]
  assert.deepEqual(selectSignalRange(points, 14), [{ time: 1, value: 8 }, { time: 2, value: 6 }])
  assert.deepEqual(selectSignalRange([], 30), [])
})

test('a gap between event dates does not masquerade as a daily change', () => {
  const view = presentSignal(metric({ daily_points: [{ time: 86400, value: 2 }, { time: 259200, value: 4 }],
    daily_unit: '簇', daily_date_basis: 'event_date' }))
  assert.equal(view.changeValue, null)
  assert.equal(view.points.length, 2)
})
