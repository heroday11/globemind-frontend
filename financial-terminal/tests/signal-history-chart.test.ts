import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const Module = require('node:module')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const filename = fileURLToPath(new URL('../src/components/SignalHistoryChart.tsx', import.meta.url))
const output = ts.transpileModule(readFileSync(filename, 'utf8'), {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const component = new Module(filename)
component.filename = filename
component.paths = Module._nodeModulePaths(dirname(filename))
component._compile(output, filename)
const Chart = component.exports.default
const start = Date.UTC(2026, 10, 1) / 1000
const point = (value: number, index = 0) => ({ time: start + index * 86400, value })
function render(points: Array<{ time: number; value: number }>, extra = {}) {
  return renderToStaticMarkup(React.createElement(Chart, { label: '实际观测', unit: '簇', points, thresholds: [], ...extra }))
}
function attrs(tag: string) {
  return Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]))
}
function bars(markup: string) {
  return [...markup.matchAll(/<rect\b[^>]*fill="#(?:91a2e8|506bda)"[^>]*>/g)].map(m => attrs(m[0]))
}
function baseline(markup: string) {
  return [...markup.matchAll(/<line\b[^>]*stroke="#a7b0c1"[^>]*>/g)]
    .map(m => attrs(m[0])).find(a => a.y1 === a.y2)
}

test('positive observations use a zero baseline and preserve each actual bar', () => {
  const html = render([point(2), point(9, 1), point(4, 2)])
  const rendered = bars(html), zero = baseline(html)
  assert.equal(rendered.length, 3)
  assert.ok(zero)
  assert.equal(Number(zero.y1), 418)
  for (const bar of rendered) {
    assert.ok(Number(bar.height) > 0)
    assert.ok(Math.abs(Number(bar.y) + Number(bar.height) - Number(zero.y1)) < 1e-8)
  }
  assert.match(html, /日期（UTC）/)
  assert.doesNotMatch(html, /每日新增|伪造波形|历史样本/)
})

test('negative and positive values extend to opposite sides of zero', () => {
  const html = render([point(-4), point(7, 1)])
  const [negative, positive] = bars(html), zero = Number(baseline(html)?.y1)
  assert.equal(Number(negative.y), zero)
  assert.ok(Number(negative.height) > 0)
  assert.ok(Number(positive.y) < zero)
  assert.ok(Math.abs(Number(positive.y) + Number(positive.height) - zero) < 1e-8)
})

test('single snapshots and all-zero observations are valid charts', () => {
  assert.equal(bars(render([point(6)])).length, 1)
  const html = render([point(0), point(0, 1)])
  assert.equal(bars(html).length, 2)
  assert.doesNotMatch(html, /NaN|Infinity|暂无数据/)
})

test('empty and non-finite observations do not create synthetic bars', () => {
  const html = render([point(NaN), { time: Infinity, value: 3 }])
  assert.equal(bars(html).length, 0)
  assert.match(html, /暂无数据/)
  assert.equal(bars(render([point(3), point(Infinity, 1)])).length, 1)
})

test('the selected range can display more than 48 actual observations', () => {
  const points = Array.from({ length: 60 }, (_, i) => point(i, i))
  assert.equal(bars(render(points)).length, 48)
  assert.equal(bars(render(points, { maxPoints: 60, seriesLabel: '每日事件簇' })).length, 60)
  assert.match(render(points, { seriesLabel: '每日事件簇' }), /每日事件簇/)
})

test('missing days occupy real elapsed time rather than adjacent equal slots', () => {
  const html = render([point(3, 0), point(5, 1), point(4, 4)])
  const rendered = bars(html)
  const centers = rendered.map(bar => Number(bar.x) + Number(bar.width) / 2)
  assert.ok(Math.abs((centers[2] - centers[1]) / (centers[1] - centers[0]) - 3) < 1e-8)
  assert.equal(new Set(rendered.map(bar => bar.width)).size, 1)
})

test('out-of-range dates are ignored and fractional observations retain precision', () => {
  assert.doesNotThrow(() => render([{ time: 1e20, value: 3 }]))
  assert.equal(bars(render([{ time: 1e20, value: 3 }])).length, 0)
  const html = render([point(.004), point(.007, 1)], { unit: '%' })
  assert.match(html, />0\.004</)
  assert.doesNotMatch(html, /NaN|Infinity/)
})

test('count units use whole-number axis ticks for zero and one', () => {
  const html = render([point(0), point(1, 1)])
  const tickTexts = [...html.matchAll(/<text[^>]+text-anchor="end"[^>]*>([^<]*)<\/text>/g)]
    .map(m => m[1]).filter(value => /^\d/.test(value))
  assert.ok(tickTexts.length > 0)
  assert.ok(tickTexts.every(value => Number.isInteger(Number(value))))
})
