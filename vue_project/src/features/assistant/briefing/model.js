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
  report_type: 'periodic_brief',
  time_range: '24h',
  send_email: false,
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
  unknown: '状态未知',
})

export const BRIEFING_ASSURANCE_SCHEMA = 'assistant-report-assurance-v1'

export function normalizeBriefingAssurance(value) {
  const raw = value && typeof value === 'object' && !Array.isArray(value) ? value : null
  const checks = raw?.checks
  const sourceCount = raw?.source_count
  const totalBlocks = raw?.substantive_blocks_total
  const citedBlocks = raw?.substantive_blocks_cited
  const unknownBlocks = raw?.substantive_blocks_explicit_unknown
  const uncitedBlocks = raw?.substantive_blocks_uncited
  const valid = raw?.schema_version === BRIEFING_ASSURANCE_SCHEMA
    && raw?.status === 'review_required'
    && raw?.publication_eligibility === 'blocked_pending_human_review'
    && Number.isInteger(sourceCount)
    && sourceCount >= 1
    && sourceCount <= 24
    && /^[a-f0-9]{64}$/.test(String(raw?.source_inventory_sha256 || ''))
    && /^[a-f0-9]{64}$/.test(String(raw?.model_output_sha256 || ''))
    && /^[a-f0-9]{64}$/.test(String(raw?.write_time_saved_draft_sha256 || ''))
    && Number.isInteger(totalBlocks)
    && totalBlocks >= 1
    && Number.isInteger(citedBlocks)
    && citedBlocks >= 1
    && Number.isInteger(unknownBlocks)
    && unknownBlocks >= 0
    && uncitedBlocks === 0
    && citedBlocks + unknownBlocks === totalBlocks
    && raw?.substantive_block_source_citation_rate === (citedBlocks / totalBlocks).toFixed(6)
    && raw?.substantive_block_disposition_rate === '1.000000'
    && checks?.source_identifier_boundary === 'passed'
    && checks?.substantive_block_disposition === 'passed'
    && checks?.source_citation_rate === 'measured_not_targeted'
    && checks?.source_truth === 'not_verified'
    && checks?.semantic_entailment === 'not_verified'
    && checks?.fact_check === 'not_performed'
    && checks?.human_review === 'required'
    && checks?.integrity_on_read === 'not_verified'
    && checks?.report_storage === 'local_mutable_file'
    && checks?.metadata_storage === 'local_mutable_json'
    && checks?.append_only_audit_chain === 'unavailable'
  if (!valid) {
    return Object.freeze({
      schema_version: null,
      status: 'unavailable',
      publication_eligibility: 'blocked_assurance_unavailable',
      source_count: null,
    })
  }
  return Object.freeze({
    schema_version: BRIEFING_ASSURANCE_SCHEMA,
    status: 'review_required',
    publication_eligibility: 'blocked_pending_human_review',
    source_count: sourceCount,
  })
}

export function normalizeBriefingScheduleDto(row) {
  const value = row && typeof row === 'object' ? row : {}
  const lastAssurance = normalizeBriefingAssurance(
    value.last_assurance || value.last_file?.assurance,
  )
  const runCount = normalizeNonnegativeInteger(value.run_count)
  const status = normalizeBriefingStatus(value.last_status)
  const normalized = {
    id: value.id == null ? '' : String(value.id),
    title: String(value.title || value.topic || ''),
    topic: String(value.topic || value.title || ''),
    cadence: String(value.cadence || 'daily'),
    timezone: String(value.timezone || 'Asia/Shanghai'),
    enabled: typeof value.enabled === 'boolean' ? value.enabled : null,
    run_count: runCount,
    recent_runs: Array.isArray(value.recent_runs)
      ? value.recent_runs.slice(0, 12).map(normalizeBriefingRunDto)
      : [],
    last_assurance: lastAssurance,
  }
  const copiedFields = [
    'prompt',
    'time_of_day',
    'day_of_week',
    'interval_hours',
    'report_type',
    'time_range',
    'perspective',
    'include_sources',
    'include_charts',
    'send_email',
    'created_at',
    'updated_at',
    'last_run_at',
    'next_run_at',
    'pinned_workspace',
    'favorite_context',
    'knowledge_context',
    'owner',
  ]
  for (const key of copiedFields) {
    if (Object.hasOwn(value, key)) normalized[key] = value[key]
  }
  if (Object.hasOwn(value, 'last_status')) {
    normalized.last_status = status
    normalized.last_error = status === 'failed'
      ? '最近一次运行失败；内部错误详情未公开'
      : ''
  }
  if (value.last_file && typeof value.last_file === 'object' && !Array.isArray(value.last_file)) {
    normalized.last_file = normalizeBriefingFileDto(value.last_file)
  } else if (Object.hasOwn(value, 'last_file')) {
    normalized.last_file = null
  }
  return normalized
}

function normalizeNonnegativeInteger(value) {
  if (value == null || value === '') return null
  const numeric = Number(value)
  return Number.isSafeInteger(numeric) && numeric >= 0 ? numeric : null
}

function normalizeBriefingStatus(value) {
  const status = String(value || '').trim()
  return Object.hasOwn(BRIEFING_STATUS_LABELS, status) && status !== 'unknown'
    ? status
    : 'unknown'
}

function normalizeBriefingFileDto(value) {
  return {
    workspace: value.workspace == null ? '' : String(value.workspace),
    file_name: value.file_name == null ? '' : String(value.file_name),
    file_path: value.file_path == null ? '' : String(value.file_path),
    size: normalizeNonnegativeInteger(value.size),
    assurance: normalizeBriefingAssurance(value.assurance),
  }
}

export function normalizeBriefingRunDto(row) {
  const value = row && typeof row === 'object' && !Array.isArray(row) ? row : {}
  const status = ['done', 'failed'].includes(value.status) ? value.status : 'unknown'
  return {
    id: value.id == null ? '' : String(value.id),
    status,
    created_at: value.created_at == null ? null : String(value.created_at),
    file: value.file && typeof value.file === 'object' && !Array.isArray(value.file)
      ? normalizeBriefingFileDto(value.file)
      : null,
    error: status === 'failed' ? '运行失败；内部错误详情未公开' : '',
    duration_ms: normalizeNonnegativeInteger(value.duration_ms),
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
    send_email: schedule.send_email ?? null,
    prompt: schedule.prompt || '',
    cadence: schedule.cadence || 'daily',
    timezone: schedule.timezone || 'Asia/Shanghai',
    time_of_day: schedule.time_of_day || '08:30',
    day_of_week: Number(schedule.day_of_week || 0),
    interval_hours: Number(schedule.interval_hours || 24),
    enabled: schedule.enabled === true,
    report_type: schedule.report_type || 'brief',
    time_range: schedule.time_range || '24h',
    perspective: schedule.perspective || '综合研判',
    include_sources: schedule.include_sources !== false,
    include_charts: !!schedule.include_charts,
  }
}

export function createBriefingDraft(value) {
  if (typeof value?.topic !== 'string' || !value.topic.trim()) return null
  const draft = createBriefingScheduleForm()
  for (const [field, limit] of [['topic', 300], ['title', 160], ['prompt', 6000], ['perspective', 100]]) {
    if (typeof value[field] === 'string' && value[field].trim()) draft[field] = value[field].trim().slice(0, limit)
  }
  if (BRIEFING_CADENCE_OPTIONS.some(item => item.value === value.cadence)) draft.cadence = value.cadence
  if (BRIEFING_TIME_RANGE_OPTIONS.some(item => item.value === value.time_range)) draft.time_range = value.time_range
  if (typeof value.time_of_day === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value.time_of_day)) draft.time_of_day = value.time_of_day
  if (typeof value.timezone === 'string' && value.timezone.length <= 80) {
    try {
      new Intl.DateTimeFormat('zh-CN', { timeZone: value.timezone })
      draft.timezone = value.timezone
    } catch { /* The default remains visible and editable. */ }
  }
  if (Number.isInteger(value.day_of_week) && value.day_of_week >= 0 && value.day_of_week <= 6) draft.day_of_week = value.day_of_week
  if (Number.isInteger(value.interval_hours) && value.interval_hours >= 6 && value.interval_hours <= 720) draft.interval_hours = value.interval_hours
  for (const field of ['enabled', 'send_email', 'include_sources', 'include_charts']) {
    if (typeof value[field] === 'boolean') draft[field] = value[field]
  }
  return draft
}

export function briefingRuntimeLabel(form) {
  const zone = form.timezone === 'Asia/Shanghai' ? '北京时间' : form.timezone
  if (form.cadence === 'daily') return `每天 ${form.time_of_day}（${zone}）`
  if (form.cadence === 'weekly') {
    const weekday = BRIEFING_WEEKDAY_OPTIONS.find(item => item.value === form.day_of_week)?.label
    return `每${weekday} ${form.time_of_day}（${zone}）`
  }
  if (form.cadence === 'custom_hours') return `每 ${form.interval_hours} 小时`
  return briefingCadenceLabel(form.cadence)
}

export function briefingDraftPreview(form) {
  return [
    ['任务名称', form.title || form.topic],
    ['关注主题', form.topic],
    ['补充要求', form.prompt || '无'],
    ['覆盖窗口', BRIEFING_TIME_RANGE_OPTIONS.find(item => item.value === form.time_range)?.label || form.time_range],
    ['运行安排', briefingRuntimeLabel(form)],
    ['时区', form.timezone],
    ['研判视角', form.perspective],
    ['引用来源', form.include_sources ? '包含' : '关闭'],
    ['图表', form.include_charts ? '包含' : '关闭'],
    ['邮件投递', form.send_email ? '账号绑定邮箱' : '关闭'],
    ['任务状态', form.enabled ? '启用' : '暂停'],
    ['保存位置', '简报目录'],
  ]
}

export function briefingCadenceLabel(value) {
  return BRIEFING_CADENCE_OPTIONS.find((item) => item.value === value)?.label || '周期未知'
}

export function briefingStatusLabel(value, assurance = null) {
  if (value === 'done') {
    return normalizeBriefingAssurance(assurance).status === 'review_required'
      ? '已生成 · 待人工审阅'
      : '已生成 · 可信状态不可用'
  }
  return BRIEFING_STATUS_LABELS[value] || BRIEFING_STATUS_LABELS.unknown
}

export function briefingRunStatusLabel(value) {
  if (value === 'done') return '草稿已生成 · 待审阅'
  if (value === 'failed') return '运行失败'
  return '状态未知'
}

export function briefingPlannedTimeLabel(value, formatDateTime, now = new Date()) {
  if (!value) return '—'
  const parsed = new Date(value)
  const observedNow = now instanceof Date ? now : new Date(now)
  if (Number.isNaN(parsed.getTime()) || Number.isNaN(observedNow.getTime())) {
    return '时间状态不可用'
  }
  const futureLimit = observedNow.getTime() + (31 * 24 * 60 * 60 * 1000)
  if (parsed.getTime() > futureLimit) return '时间状态不可用'
  const formatter = typeof formatDateTime === 'function' ? formatDateTime : String
  const formatted = formatter(value)
  if (parsed.getTime() < observedNow.getTime() - (5 * 60 * 1000)) {
    return `${formatted} · 已过计划时间，待调度器确认`
  }
  return `${formatted} · 计划记录`
}

export function briefingRecordedTimeLabel(value, formatDateTime, now = new Date()) {
  if (!value) return '—'
  const parsed = new Date(value)
  const observedNow = now instanceof Date ? now : new Date(now)
  if (
    Number.isNaN(parsed.getTime())
    || Number.isNaN(observedNow.getTime())
    || parsed.getTime() > observedNow.getTime() + (5 * 60 * 1000)
  ) return '时间状态不可用'
  const formatter = typeof formatDateTime === 'function' ? formatDateTime : String
  return `${formatter(value)} · 任务记录`
}

export function briefingAssuranceLabel(schedule) {
  if (!schedule || schedule.last_status !== 'done') return '尚无已生成报告'
  const assurance = normalizeBriefingAssurance(
    schedule.last_assurance || schedule.last_file?.assurance,
  )
  if (assurance.status !== 'review_required') {
    return '可信状态不可用；不得视为已核验'
  }
  return `仅检查引用标记与来源边界（${assurance.source_count} 条）；事实、语义和当前文件完整性未核验，待人工审阅`
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
    title: (String(value.title || '').trim() || String(value.topic || '').trim()).slice(0, 160),
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
    send_email: value.send_email ?? null,
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
    stats: `${normalizeNonnegativeInteger(item.run_count) ?? '—'} · ${item.recent_runs?.length || 0} · ${item.enabled === true ? 1 : item.enabled === false ? 0 : '—'}`,
    cadence: briefingCadenceLabel(item.cadence),
    status: briefingStatusLabel(item.last_status, item.last_assurance || item.last_file?.assurance),
    raw: item,
  }))
}

export function calculateBriefingStats(schedules) {
  const rows = Array.isArray(schedules) ? schedules : []
  const total = rows.length
  const enabled = rows.filter((item) => item.enabled === true).length
  const runCounts = rows.map((item) => normalizeNonnegativeInteger(item.run_count))
  const generated = runCounts.some((value) => value === null)
    ? null
    : runCounts.reduce((sum, value) => sum + value, 0)
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
