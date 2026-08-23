export const FALLBACK_OVERVIEW_SUMMARY = Object.freeze({
  current_index: 0,
  change_24h: 0,
  trend_label: '等待数据',
  article_count: 0,
  source_count: 0,
  family_count: 0,
  positive_pct: 0,
  negative_pct: 0,
  neutral_pct: 0,
})

export const CORRECTION_LABELS = Object.freeze({
  irrelevant: '无关',
  too_positive: '偏正',
  too_negative: '偏负',
  correct: '准确',
})

const OVERVIEW_ENTITY_NAMES = Object.freeze({
  china: '中国',
  'north korea': '朝鲜',
  korea: '韩国',
  japan: '日本',
  taiwan: '台湾',
  russia: '俄罗斯',
  us: '美国',
  usa: '美国',
  eu: '欧盟',
  india: '印度',
})

const TARGET_INDEX_LABELS = Object.freeze({
  CN: Object.freeze({ label: '涉华综合', description: '总体评价强度' }),
  NEG: Object.freeze({ label: '负向压力', description: '批评与风险叙事' }),
  POS: Object.freeze({ label: '正向支撑', description: '认可与合作叙事' }),
})

const FAMILY_NAMES = Object.freeze({
  diplomacy: '外交',
  economic_trade: '经贸',
  military_security: '军事安全',
  domestic_politics: '国内政治',
  general_non_political: '一般议题',
  technology_industry: '科技产业',
  civil_unrest: '社会抗议',
  law_policy: '法律政策',
  public_development: '公共发展',
  security_crime: '安全犯罪',
  disaster_environment: '灾害环境',
  human_rights_migration: '人权迁移',
})

const DIMENSION_LABELS = Object.freeze({
  regions: '区域',
  languages: '语种',
  sources: '信源',
  families: '议题',
})

export function formatDateYmd(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatIndexValue(value) {
  const number = Number(value || 0)
  if (!Number.isFinite(number)) return '0.0'
  return `${number > 0 ? '+' : ''}${number.toFixed(Math.abs(number) >= 100 ? 0 : 1)}`
}

export function formatCompactCount(value) {
  const number = Number(value || 0)
  if (!Number.isFinite(number)) return '0'
  if (Math.abs(number) >= 1_000_000) return `${(number / 1_000_000).toFixed(1)}M`
  if (Math.abs(number) >= 1_000) return `${(number / 1_000).toFixed(1)}K`
  return String(Math.round(number))
}

export function formatOverviewTime(iso) {
  if (!iso) return '--:--'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '--:--'
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function formatOverviewEntity(name) {
  const key = String(name || '').trim().toLowerCase()
  return OVERVIEW_ENTITY_NAMES[key] || String(name || '').trim()
}

export function formatOverviewEventTitle(title) {
  const value = String(title || '').trim()
  const pair = value.match(/^([a-z][a-z\s.-]+?)↔([a-z][a-z\s.-]+?):\s*(.+)$/i)
  if (!pair) return value
  return `${formatOverviewEntity(pair[1])} ↔ ${formatOverviewEntity(pair[2])}：${pair[3]}`
}

export function formatFamilyName(family) {
  return FAMILY_NAMES[family] || family || '未知议题'
}

export function formatSearchSnippet(item) {
  const raw = item?.abstract || item?.summary || item?.body || ''
  return String(raw).replace(/\s+/g, ' ').trim().slice(0, 140)
}

export function briefClass(severity) {
  if (severity === 'critical') return 'brief-item--critical'
  if (severity === 'high') return 'brief-item--high'
  return 'brief-item--info'
}

export function briefSeverityLabel(severity) {
  if (severity === 'critical') return '高强度'
  if (severity === 'high') return '显著'
  return '常规'
}

export function overviewSummary(data) {
  return data?.summary || FALLBACK_OVERVIEW_SUMMARY
}

export function overviewTopEventTitle(data, { loading = false, error = '' } = {}) {
  const title = data?.top_event?.title
  if (title) return formatOverviewEventTitle(title)
  if (loading) return '加载中'
  if (error) return '数据异常'
  return '暂无主题事件'
}

export function overviewTrendClass(summary) {
  const value = Number(summary?.current_index || 0)
  if (value < -12) return 'trend--neg'
  if (value > 12) return 'trend--pos'
  return 'trend--neutral'
}

export function overviewScoreClass(summary) {
  const value = Number(summary?.current_index || 0)
  if (value < -12) return 'risk-score-panel--neg'
  if (value > 12) return 'risk-score-panel--pos'
  return 'risk-score-panel--neutral'
}

export function overviewTargetIndices(data) {
  return data?.target_indices || [
    { label: 'CN', value: 0, trend_values: [], state: 'warning' },
    { label: 'NEG', value: 0, trend_values: [], state: 'negative' },
    { label: 'POS', value: 0, trend_values: [], state: 'positive' },
  ]
}

export function overviewReadableIndices(data) {
  return overviewTargetIndices(data).map((item) => {
    const key = String(item.label || '').toUpperCase()
    const copy = TARGET_INDEX_LABELS[key] || {
      label: item.label || '未知指标',
      description: '舆情分项',
    }
    return { ...item, displayLabel: copy.label, description: copy.description }
  })
}

export function overviewMetrics(data) {
  return data?.metrics || [
    { label: '24h 变化', value: '+0.0', tone: 'neutral' },
    { label: '报道量', value: '0', tone: 'neutral' },
    { label: '信源数', value: '0', tone: 'neutral' },
  ]
}

export function maxOverviewTagCount(tags) {
  return Math.max(1, ...(tags || []).map((item) => Number(item?.article_count || 0)))
}

export function tagBarWidth(count, maximum) {
  return `${Math.max(12, Math.min(100, (Number(count || 0) / Math.max(1, maximum)) * 100))}%`
}

export function tagStyle(index) {
  const opacity = Math.max(0.05, 0.16 - index * 0.025)
  const accent = Math.max(0.35, 0.86 - index * 0.08)
  return {
    '--tag-accent': `rgba(59, 130, 246, ${accent})`,
    '--tag-glow': `rgba(59, 130, 246, ${opacity})`,
  }
}

export function dimensionGroups(data) {
  const dimensions = data?.dimensions || {}
  return ['regions', 'languages', 'sources', 'families'].map((key) => ({
    key,
    label: DIMENSION_LABELS[key],
    items: dimensions[key] || [],
  }))
}

export function formatDimensionLabel(groupKey, value) {
  if (groupKey === 'families') return formatFamilyName(value)
  if (!value || value === 'unknown') return '未知'
  return String(value)
}

export function qualitySnapshot(data) {
  const rows = data?.coverage_by_date || []
  const today = rows[0] || {}
  const news = Number(today.news_count || 0)
  const scored = Number(today.scored_relevant || today.scored_count || 0)
  const percentage = news > 0 ? Math.round((scored / news) * 100) : 0
  const method = String(data?.method_version || '--')
  return {
    latestScoreDate: data?.freshness?.latest_score_date || '--',
    todayCoverage: news > 0
      ? `${formatCompactCount(scored)}/${formatCompactCount(news)} · ${percentage}%`
      : '--',
    pendingFeedback: String(data?.pending_feedback_30d || 0),
    methodVersion: method.length > 34 ? `${method.slice(0, 34)}…` : method,
  }
}

export function buildDateExplanation(newsRows, summary) {
  const news = Array.isArray(newsRows) ? newsRows : []
  const positiveImpact = news
    .filter((item) => Number(item.impact_index || 0) > 0)
    .reduce((sum, item) => sum + Number(item.impact_index || 0), 0)
  const negativeImpact = news
    .filter((item) => Number(item.impact_index || 0) < 0)
    .reduce((sum, item) => sum + Number(item.impact_index || 0), 0)
  const familyCounts = news.reduce((accumulator, item) => {
    const key = item.event_family || 'unknown'
    accumulator[key] = (accumulator[key] || 0) + 1
    return accumulator
  }, {})
  const topFamily = Object.entries(familyCounts).sort((left, right) => right[1] - left[1])[0]
  const positiveAbs = Math.abs(positiveImpact)
  const negativeAbs = Math.abs(negativeImpact)
  const totalAbs = positiveAbs + negativeAbs || 1
  const sourceCount = Number(summary?.source_count || 0)
    || new Set(news.map((item) => item.source).filter(Boolean)).size
  const leadingNews = [...news]
    .sort((left, right) => (
      Math.abs(Number(right.impact_index || 0)) - Math.abs(Number(left.impact_index || 0))
    ))
    .slice(0, 3)
  return {
    positiveImpact: Math.round(positiveImpact * 10) / 10,
    negativeImpact: Math.round(negativeImpact * 10) / 10,
    positiveWidth: positiveAbs ? Math.max(2, Math.round((positiveAbs / totalAbs) * 50)) : 0,
    negativeWidth: negativeAbs ? Math.max(2, Math.round((negativeAbs / totalAbs) * 50)) : 0,
    sourceCount,
    newsCount: news.length,
    topFamily: topFamily ? formatFamilyName(topFamily[0]) : '暂无',
    topFamilyCount: topFamily ? topFamily[1] : 0,
    leadingNews,
  }
}

export function addLocalSearchHistory(current, query, now = new Date()) {
  const normalized = String(query || '').trim()
  if (!normalized) return current
  const time = [
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
    `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
  ].join(' ')
  return [
    { query: normalized, time },
    ...(current || []).filter((item) => String(item?.query || '').trim() !== normalized),
  ].slice(0, 50)
}

export function mergeFavoriteIds(currentIds, rows) {
  const additions = (Array.isArray(rows) ? rows : [])
    .filter((item) => item?.is_favorited && item.id !== undefined && item.id !== null)
    .map((item) => Number(item.id))
    .filter(Number.isFinite)
  return additions.length ? Array.from(new Set([...(currentIds || []), ...additions])) : currentIds
}

export function applyFavoriteResult(currentIds, newsId, favorited) {
  const normalized = Number(newsId)
  if (favorited) return Array.from(new Set([...(currentIds || []), normalized]))
  return (currentIds || []).filter((id) => id !== normalized)
}
