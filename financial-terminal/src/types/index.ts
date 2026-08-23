// ============================================================
// Financial Terminal — 数据模型类型定义
// 前端字段名与后端 API 返回的 JSON 字段名保持一致（snake_case）
// ============================================================

/** K线 Bar */
export interface OhlcBar {
  time: number // unix 秒时间戳
  open: number
  high: number
  low: number
  close: number
  volume: number
}

/** 移动平均线点 */
export interface MaPoint {
  time: number
  value: number
}

/** 指数摘要卡片 */
export interface IndexCard {
  id: string
  name: string
  value: number
  change_pct: number
  spark: number[] // 迷你走势 24 个点
  source?: string
  metric_id?: string
}

/** 外部数据源状态 */
export interface DataSourceStatus {
  id: string
  name: string
  status: 'live' | 'degraded' | 'disabled' | 'mock'
  records?: number
  detail?: string
  cadence?: string
  url?: string
  latency_ms?: number | null
  last_updated?: string
}

export type MetricCategory = 'politics' | 'economy' | 'science' | 'energy' | 'security' | 'society' | 'logistics'

export interface DataCoverage {
  series_total?: number
  watchlist_total?: number
  sources_total?: number
  live_sources?: number
  degraded_sources?: number
  disabled_sources?: number
  politics_security_series?: number
  near_realtime_series?: number
  ground_news_records?: number
  ground_news_latest_story_date?: string
}

export interface SeriesPoint {
  time: number
  value: number
  samples?: number
}

export interface MetricSeries {
  id: string
  kind?: 'index' | 'metric'
  label: string
  unit?: string
  source?: string
  cadence?: string
  status?: DataSourceStatus['status']
  category?: MetricCategory
  region?: string
  description?: string
  points: SeriesPoint[]
  latest: number
  change_pct: number
}

/** 行情监视行 */
export interface WatchRow {
  symbol: string
  metric_id?: string
  label: string
  price: number
  change_pct: number
  category?: MetricCategory
  region?: string
  source?: string
  cadence?: string
  status?: DataSourceStatus['status']
  unit?: string
  description?: string
}

/** 预警严重等级 */
export type Severity = 'high' | 'medium' | 'low'

/** 预警规则（数值分析预警页 — 实时监控面板） */
export interface AlertRule {
  id: string
  /** 指标名称，如"波动率指数" */
  metric: string
  /** 单位，如 "%"、"bps" */
  unit: string
  /** 当前值 */
  current: number
  /** 告警阈值 */
  threshold: number
  /** 基线值（正常水平） */
  baseline: number
  /** 严重等级 */
  severity: Severity
  /** 是否已突破阈值 */
  breached: boolean
  /** 趋势方向 */
  trend: 'up' | 'down' | 'flat'
}

/** 告警报告（告警历史 / 触发性告警） */
export interface AlertReport {
  id: string
  metric: string
  current: number
  threshold: number
  severity: Severity
  /** ISO 8601 时间字符串 */
  triggered_at: string
  message: string
  /** 关联事件标签 */
  eventTags?: string[]
}

/** Dashboard 完整响应 */
export interface DashboardData {
  mode?: 'live' | 'mock' | 'mock-fallback'
  cache?: 'hit' | 'miss' | 'shared' | 'coalesced' | 'stale'
  last_updated?: string
  bars: OhlcBar[]
  ma20: MaPoint[]
  ma50: MaPoint[]
  ma200: MaPoint[]
  indices: IndexCard[]
  watchlist: WatchRow[]
  series?: MetricSeries[]
  default_metric_id?: string
  sources?: DataSourceStatus[]
  alert_rules?: AlertRule[]
  coverage?: DataCoverage
}

/** Alert 完整响应 */
export interface AlertData {
  rules: AlertRule[]
  history: AlertReport[]
}
