export const BRIEFING_SCHEDULE_FORM_DEFAULTS = Object.freeze({
  title: '',
  topic: '',
  prompt: '',
  cadence: 'daily',
  timezone: 'Asia/Shanghai',
  time_of_day: '08:30',
  day_of_week: 0,
  interval_hours: 24,
  enabled: true,
  report_type: 'brief',
  time_range: '24h',
  perspective: '综合研判',
  include_sources: true,
  include_charts: false,
})

export const BRIEFING_CADENCE_OPTIONS = Object.freeze([
  Object.freeze({ value: 'daily', label: '每天' }),
  Object.freeze({ value: 'every_6_hours', label: '每 6 小时' }),
  Object.freeze({ value: 'every_12_hours', label: '每 12 小时' }),
  Object.freeze({ value: 'weekly', label: '每周' }),
  Object.freeze({ value: 'custom_hours', label: '自定义小时' }),
  Object.freeze({ value: 'manual', label: '仅手动' }),
])

export const BRIEFING_WEEKDAY_OPTIONS = Object.freeze([
  Object.freeze({ value: 0, label: '周一' }),
  Object.freeze({ value: 1, label: '周二' }),
  Object.freeze({ value: 2, label: '周三' }),
  Object.freeze({ value: 3, label: '周四' }),
  Object.freeze({ value: 4, label: '周五' }),
  Object.freeze({ value: 5, label: '周六' }),
  Object.freeze({ value: 6, label: '周日' }),
])

export const BRIEFING_TIME_RANGE_OPTIONS = Object.freeze([
  Object.freeze({ value: '24h', label: '过去 24 小时' }),
  Object.freeze({ value: '7d', label: '近 7 天' }),
  Object.freeze({ value: '30d', label: '近 30 天' }),
  Object.freeze({ value: '90d', label: '近 90 天' }),
])

export const BRIEFING_PERSPECTIVE_OPTIONS = Object.freeze([
  Object.freeze({ value: '综合研判', label: '综合研判' }),
  Object.freeze({ value: '涉华影响', label: '涉华影响' }),
  Object.freeze({ value: '风险预警', label: '风险预警' }),
  Object.freeze({ value: '贸易与供应链', label: '贸易与供应链' }),
  Object.freeze({ value: '舆情走势', label: '舆情走势' }),
])

export const BRIEFING_STATUS_LABELS = Object.freeze({
  idle: '待运行',
  running: '生成中',
  done: '已生成',
  failed: '失败',
})

export function normalizeBriefingScheduleDto(row) {
  const value = row && typeof row === 'object' ? row : {}
  return {
    ...value,
    id: value.id == null ? '' : String(value.id),
    title: String(value.title || value.topic || ''),
    topic: String(value.topic || value.title || ''),
    cadence: String(value.cadence || 'daily'),
    timezone: String(value.timezone || 'Asia/Shanghai'),
    enabled: value.enabled !== false,
    run_count: Number(value.run_count || 0),
    recent_runs: Array.isArray(value.recent_runs) ? value.recent_runs : [],
  }
}

export function normalizeBriefingScheduleList(rows) {
  return (Array.isArray(rows) ? rows : []).map(normalizeBriefingScheduleDto)
}

export function createBriefingScheduleForm(schedule = null) {
  if (!schedule || typeof schedule !== 'object') {
    return { ...BRIEFING_SCHEDULE_FORM_DEFAULTS }
  }
  return {
    title: schedule.title || schedule.topic || '',
    topic: schedule.topic || schedule.title || '',
    prompt: schedule.prompt || '',
    cadence: schedule.cadence || 'daily',
    timezone: schedule.timezone || 'Asia/Shanghai',
    time_of_day: schedule.time_of_day || '08:30',
    day_of_week: Number(schedule.day_of_week || 0),
    interval_hours: Number(schedule.interval_hours || 24),
    enabled: schedule.enabled !== false,
    report_type: schedule.report_type || 'brief',
    time_range: schedule.time_range || '24h',
    perspective: schedule.perspective || '综合研判',
    include_sources: schedule.include_sources !== false,
    include_charts: !!schedule.include_charts,
  }
}

export function briefingCadenceLabel(value) {
  return BRIEFING_CADENCE_OPTIONS.find((item) => item.value === value)?.label || '每天'
}

export function briefingStatusLabel(value) {
  return BRIEFING_STATUS_LABELS[value] || BRIEFING_STATUS_LABELS.idle
}

export function buildBriefingScheduleContext({
  pinnedWorkspaceName = '',
  favoriteFolderName = '',
  favoriteItems = [],
  skills = [],
  databaseCards = [],
} = {}) {
  const normalizedFavoriteItems = Array.isArray(favoriteItems) ? favoriteItems : []
  const normalizedSkills = Array.isArray(skills) ? skills : []
  const normalizedDatabaseCards = Array.isArray(databaseCards) ? databaseCards : []
  return {
    pinned_workspace: pinnedWorkspaceName || '',
    favorite_context: favoriteFolderName
      ? {
          folder: favoriteFolderName,
          items: normalizedFavoriteItems.slice(0, 24),
        }
      : null,
    knowledge_context: normalizedSkills.length || normalizedDatabaseCards.length
      ? {
          skills: normalizedSkills.slice(0, 30),
          database_cards: normalizedDatabaseCards.slice(0, 20),
        }
      : null,
  }
}

export function buildBriefingSchedulePayload(form, context = {}) {
  const value = form && typeof form === 'object' ? form : BRIEFING_SCHEDULE_FORM_DEFAULTS
  return {
    title: String(value.title || '').trim() || String(value.topic || '').trim(),
    topic: String(value.topic || '').trim() || String(value.title || '').trim(),
    prompt: String(value.prompt || '').trim(),
    cadence: value.cadence,
    timezone: value.timezone || 'Asia/Shanghai',
    time_of_day: value.time_of_day || '08:30',
    day_of_week: Number(value.day_of_week || 0),
    interval_hours: Number(value.interval_hours || 24),
    enabled: !!value.enabled,
    report_type: value.report_type || 'brief',
    time_range: value.time_range || '24h',
    perspective: value.perspective || '综合研判',
    include_sources: !!value.include_sources,
    include_charts: !!value.include_charts,
    pinned_workspace: context.pinned_workspace || '',
    favorite_context: context.favorite_context || null,
    knowledge_context: context.knowledge_context || null,
  }
}

export function buildBriefingPeriodicTasks(schedules, formatDateTime) {
  const formatter = typeof formatDateTime === 'function' ? formatDateTime : (value) => value
  return (Array.isArray(schedules) ? schedules : []).map((item) => ({
    id: item.id,
    title: item.title || item.topic || '定时简报',
    at: formatter(item.next_run_at || item.last_run_at || item.updated_at),
    stats: `${item.run_count || 0} · ${item.recent_runs?.length || 0} · ${item.enabled ? 1 : 0}`,
    cadence: briefingCadenceLabel(item.cadence),
    status: briefingStatusLabel(item.last_status),
    raw: item,
  }))
}

export function calculateBriefingStats(schedules) {
  const rows = Array.isArray(schedules) ? schedules : []
  const total = rows.length
  const enabled = rows.filter((item) => item.enabled).length
  const generated = rows.reduce((sum, item) => sum + Number(item.run_count || 0), 0)
  const running = rows.some((item) => item.last_status === 'running')
  return { total, enabled, generated, running }
}

export function dashboardDateKey(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function dashboardShortDateLabel(key) {
  const parts = String(key || '').split('-')
  if (parts.length !== 3) return ''
  return `${Number(parts[1])}/${Number(parts[2])}`
}

function addDashboardActivity(buckets, value, weight = 1) {
  const key = dashboardDateKey(value)
  if (!key || !buckets.has(key)) return
  buckets.set(key, buckets.get(key) + Number(weight || 1))
}

export function buildAssistantDashboardTrend({
  conversations = [],
  reports = [],
  schedules = [],
  now = new Date(),
} = {}) {
  const today = now instanceof Date ? new Date(now) : new Date(now)
  today.setHours(0, 0, 0, 0)
  const keys = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - (6 - index))
    return dashboardDateKey(date)
  })
  const buckets = new Map(keys.map((key) => [key, 0]))
  conversations.forEach((conversation) => {
    addDashboardActivity(
      buckets,
      conversation.at || conversation.updated_at || conversation.created_at,
    )
  })
  reports.forEach((report) => addDashboardActivity(buckets, report.createdAt || report.time))
  schedules.forEach((schedule) => {
    addDashboardActivity(
      buckets,
      schedule.last_run_at || schedule.updated_at,
      schedule.last_run_at ? 1 : 0,
    )
  })
  const points = keys.map((key) => ({
    key,
    label: dashboardShortDateLabel(key),
    value: buckets.get(key) || 0,
  }))
  const values = points.map((point) => point.value)
  return {
    points,
    total: values.reduce((sum, value) => sum + value, 0),
    max: Math.max(1, ...values),
  }
}

export function calculateDashboardBarHeight(value, maxValue) {
  const normalizedValue = Number(value || 0)
  if (!normalizedValue) return '8%'
  const normalizedMax = Math.max(1, Number(maxValue || 1))
  return `${Math.max(14, Math.round((normalizedValue / normalizedMax) * 100))}%`
}
