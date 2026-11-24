import { useEffect, useMemo, useState } from 'react'
import TerminalHeader from '../components/TerminalHeader'
import SignalHistoryChart from '../components/SignalHistoryChart'
import { useMarketData } from '../hooks/useMarketData'
import { financialTrendDisclosurePresentation } from '../lib/trust'
import { sourceLabel } from '../lib/sourceLabels'
import { presentSignal, selectSignalRange, signalHasObservations, signalChangeLabel } from '../lib/signalPresentation'
import type { MetricCategory } from '../types'

type FilterId = 'all' | MetricCategory
const CATEGORY_TABS: { id: FilterId; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'politics', label: '政治外交' },
  { id: 'security', label: '安全冲突' },
  { id: 'economy', label: '经济宏观' },
  { id: 'energy', label: '能源资源' },
  { id: 'logistics', label: '物流交通' },
  { id: 'science', label: '科技安全' },
  { id: 'society', label: '社会环境' },
]
function categoryLabel(category?: FilterId) {
  return CATEGORY_TABS.find((tab) => tab.id === category)?.label || '全部'
}
function formatValue(value: number | null | undefined) {
  return value === null || value === undefined || !Number.isFinite(value)
    ? '—' : value.toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

export default function TerminalDashboard() {
  const { watchlist, series, defaultMetricId, loading, error } = useMarketData()
  const [activeCategory, setActiveCategory] = useState<FilterId>('all')
  const [selectedMetricId, setSelectedMetricId] = useState<string | null>(null)
  const [signalQuery, setSignalQuery] = useState('')
  const [rangeDays, setRangeDays] = useState<7 | 14 | 30>(14)
  const seriesMap = useMemo(() => new Map(series.map((metric) => [metric.id, metric])), [series])
  const primaryRows = useMemo(() => watchlist.filter((row) => {
    const metric = seriesMap.get(row.metric_id || row.symbol)
    return metric ? signalHasObservations(metric) : row.status !== 'disabled' && Number.isFinite(row.price)
  }), [seriesMap, watchlist])
  const visibleTabs = CATEGORY_TABS.filter((tab) => tab.id === 'all' || primaryRows.some((row) => row.category === tab.id))
  const categoryRows = useMemo(() => primaryRows.filter((row) => activeCategory === 'all' || row.category === activeCategory), [primaryRows, activeCategory])
  const filteredRows = useMemo(() => {
    const query = signalQuery.trim().toLowerCase()
    return categoryRows.filter((row) => !query || [
      row.label, row.symbol, row.metric_id, row.region, row.source,
      sourceLabel(row.source), row.description, categoryLabel(row.category),
    ].filter(Boolean).join(' ').toLowerCase().includes(query))
  }, [categoryRows, signalQuery])

  useEffect(() => {
    if (activeCategory !== 'all' && !primaryRows.some((row) => row.category === activeCategory)) setActiveCategory('all')
  }, [activeCategory, primaryRows])

  useEffect(() => {
    const selectedIsVisible = categoryRows.some((row) => (row.metric_id || row.symbol) === selectedMetricId)
    if (selectedIsVisible) return
    const preferred = categoryRows.find((row) => (row.metric_id || row.symbol) === defaultMetricId)
    const next = preferred || categoryRows[0]
    setSelectedMetricId(next ? next.metric_id || next.symbol : null)
  }, [categoryRows, defaultMetricId, selectedMetricId])

  const metric = selectedMetricId ? seriesMap.get(selectedMetricId) || null : null
  const presentation = useMemo(() => presentSignal(metric), [metric])
  const points = useMemo(() => selectSignalRange(presentation.points, rangeDays), [presentation.points, rangeDays])
  const selectedTrendDisclosure = financialTrendDisclosurePresentation(metric?.trend_disclosure)
  const allowChange = metric?.kind !== 'index' || selectedTrendDisclosure.preciseChangeAllowed
  const selectedChange = allowChange ? signalChangeLabel(presentation.changeValue, presentation.changeUnit) : null

  return (
    <div className="world-state-dashboard">
      <TerminalHeader />
      {error ? <div className="world-state-error" role="alert">数据加载失败，请稍后重试。</div> : null}
      <div className="world-state-workspace">
        <main className="world-state-panel world-state-main" aria-busy={loading}>
          <div className="world-state-summary">
            <div className="world-state-summary-content">
              <h2>{metric?.label || (loading ? '加载中' : '暂无数据')}</h2>
              <div className="world-state-value">
                <strong>{formatValue(presentation.latest)}</strong>
                {presentation.unit ? <span>{presentation.unit}</span> : null}
                {selectedChange ? <span className={presentation.changeValue! >= 0 ? 'world-state-change is-up' : 'world-state-change is-down'}
                  title={presentation.changePeriod}>{selectedChange}</span> : null}
              </div>
            </div>
            <div className="world-state-range" role="group" aria-label="时间范围">
              {([7, 14, 30] as const).map((days) => (
                <button key={days} type="button" aria-pressed={rangeDays === days}
                  className={rangeDays === days ? 'is-active' : undefined}
                  onClick={() => setRangeDays(days)}>{days} 天</button>
              ))}
            </div>
          </div>
          <div className="world-state-chart">
            <SignalHistoryChart key={selectedMetricId || 'empty'}
              label={metric?.label || '世界状态'} points={points}
              unit={presentation.unit} seriesLabel={presentation.label}
              maxPoints={Number.MAX_SAFE_INTEGER}
              thresholds={[]}
              historical={metric?.status === 'degraded'}
              statusMessage={!points.length ? (loading ? '加载中' : '暂无数据') : undefined} />
          </div>
        </main>
        <aside className="world-state-panel world-state-directory" aria-label="信号目录">
          <div className="world-state-directory-header">
            <h2>信号目录</h2>
            <label className="world-state-search">
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
                <circle cx="8.5" cy="8.5" r="5.7" stroke="currentColor" strokeWidth="1.5" />
                <path d="m13 13 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input aria-label="搜索信号" value={signalQuery} onChange={(event) => setSignalQuery(event.target.value)} placeholder="搜索信号" />
            </label>
            <div className="world-state-categories" role="group" aria-label="信号分类">
              {visibleTabs.map((tab) => (
                <button key={tab.id} type="button" aria-pressed={activeCategory === tab.id}
                  className={activeCategory === tab.id ? 'is-active' : undefined}
                  onClick={() => setActiveCategory(tab.id)}>{tab.label}</button>
              ))}
            </div>
          </div>
          <ul className="world-state-signals">
            {!filteredRows.length ? <li className="world-state-empty">{loading ? '加载中' : '没有匹配的信号'}</li> : null}
            {filteredRows.map((row) => {
              const id = row.metric_id || row.symbol
              const rowMetric = seriesMap.get(id)
              const active = id === selectedMetricId
              const preciseChange = rowMetric?.kind !== 'index' || financialTrendDisclosurePresentation(rowMetric.trend_disclosure).preciseChangeAllowed
              const change = rowMetric?.change_value ?? row.change_value
              const changeText = preciseChange ? signalChangeLabel(change, rowMetric?.change_unit || row.change_unit) : null
              return (
                <li key={id}>
                  <button type="button" className={active ? 'world-state-signal is-active' : 'world-state-signal'}
                    aria-pressed={active} onClick={() => setSelectedMetricId(id)}
                    title={rowMetric?.description || row.description}>
                    <div className="world-state-signal-top"><span>{row.label}</span><strong>{formatValue(rowMetric ? rowMetric.latest : row.price)}</strong></div>
                    <div className="world-state-signal-bottom"><span>{categoryLabel(row.category)}</span>
                      {changeText ? <span className={change! >= 0 ? 'is-up' : 'is-down'} title={rowMetric?.change_period || row.change_period}>{changeText}</span> : null}
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </aside>
      </div>
    </div>
  )
}
