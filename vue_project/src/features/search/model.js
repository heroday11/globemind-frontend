export const SEARCH_PARAM_DEFAULTS = Object.freeze({
  topic: '',
  mustInclude: '',
  anyInclude: '',
  needExclude: '',
  publishTime: '不限',
  startTime: '',
  endTime: '',
  hitLocation: '全文',
  dataSource: '',
  language: '',
  site: '',
  page: 1,
  pageSize: 10,
  sortBy: '',
  sortOrder: 'desc',
  mode: 'exact',
  searchType: 'news',
})

export const SEARCH_TIME_RANGES = Object.freeze([
  Object.freeze({ label: '不限时间', value: '不限' }),
  Object.freeze({ label: '近一天', value: '近一天' }),
  Object.freeze({ label: '近一周', value: '近一周' }),
  Object.freeze({ label: '近一月', value: '近一月' }),
  Object.freeze({ label: '近三月', value: '近三月' }),
  Object.freeze({ label: '近一年', value: '近一年' }),
])

export const SEARCH_HIT_LOCATIONS = Object.freeze([
  Object.freeze({ label: '全文', value: '全文' }),
  Object.freeze({ label: '标题', value: '标题' }),
  Object.freeze({ label: '摘要', value: '摘要' }),
  Object.freeze({ label: '正文', value: '正文' }),
])

export const SEARCH_MODES = Object.freeze([
  Object.freeze({ label: '精确', value: 'exact' }),
  Object.freeze({ label: '模糊', value: 'fuzzy' }),
])

export const SEARCH_TYPES = Object.freeze([
  Object.freeze({ label: '新闻', value: 'news' }),
  Object.freeze({ label: 'L1事件', value: 'l1' }),
  Object.freeze({ label: 'L2走势', value: 'l2' }),
  Object.freeze({ label: 'L3大事件', value: 'l3' }),
])

export const SEARCH_SITUATION_PRESETS = Object.freeze([
  Object.freeze({
    label: '台海风险',
    hint: '查看近期穿越、军演与军备动态的原始新闻',
    topic: 'Taiwan',
    mustInclude: '',
    anyInclude: '',
    type: 'news',
    typeLabel: '新闻',
    strategyLabel: '快讯',
    mode: 'fuzzy',
    time: '不限',
    timeLabel: '不限时间',
  }),
  Object.freeze({
    label: '中美博弈',
    hint: '追踪中美外交、贸易、科技与安全议题走势',
    topic: 'China US',
    mustInclude: '',
    anyInclude: '',
    type: 'l2',
    typeLabel: 'L2走势',
    strategyLabel: '走势',
    mode: 'exact',
    time: '不限',
    timeLabel: '不限时间',
  }),
  Object.freeze({
    label: '南海动向',
    hint: '聚焦南海、菲律宾、海警、军事活动相关报道',
    topic: 'South China Sea',
    mustInclude: '',
    anyInclude: '',
    type: 'l1',
    typeLabel: 'L1事件',
    strategyLabel: '事件',
    mode: 'exact',
    time: '不限',
    timeLabel: '不限时间',
  }),
  Object.freeze({
    label: '俄乌战争',
    hint: '查看俄乌战争及外部响应的大事件结构',
    topic: 'Ukraine',
    mustInclude: '',
    anyInclude: '',
    type: 'l3',
    typeLabel: 'L3大事件',
    strategyLabel: '大事',
    mode: 'fuzzy',
    time: '不限',
    timeLabel: '不限时间',
  }),
  Object.freeze({
    label: '中东冲突',
    hint: '跟踪伊朗、以色列、加沙及航道安全事件链',
    topic: 'Gaza',
    mustInclude: '',
    anyInclude: '',
    type: 'l3',
    typeLabel: 'L3大事件',
    strategyLabel: '大事',
    mode: 'fuzzy',
    time: '不限',
    timeLabel: '不限时间',
  }),
  Object.freeze({
    label: '科技管制',
    hint: '模糊召回科技、芯片与出口管制相关报道',
    topic: 'control',
    mustInclude: '',
    anyInclude: '',
    type: 'news',
    typeLabel: '新闻',
    strategyLabel: '关联',
    mode: 'fuzzy',
    time: '不限',
    timeLabel: '不限时间',
  }),
])

export function createSearchParams(overrides = {}) {
  return { ...SEARCH_PARAM_DEFAULTS, ...overrides }
}

export function buildSearchRequestDto(searchParams, favoriteScopeTopic) {
  const topic = String(searchParams.topic || '').trim()
  const mustInclude = String(searchParams.mustInclude || '').trim()
  const anyInclude = String(searchParams.anyInclude || '').trim()
  const params = {
    topic: topic || undefined,
    keyword: topic || undefined,
    must_include: mustInclude || undefined,
    any_include: anyInclude || undefined,
    need_exclude: searchParams.needExclude || undefined,
    publish_time:
      searchParams.publishTime && searchParams.publishTime !== '不限'
        ? searchParams.publishTime
        : undefined,
    start_time: searchParams.startTime || undefined,
    end_time: searchParams.endTime || undefined,
    hit_location: searchParams.hitLocation,
    data_source: searchParams.dataSource || undefined,
    language: searchParams.language || undefined,
    site: searchParams.site || undefined,
    page: searchParams.page,
    page_size: searchParams.pageSize,
    sort_by: searchParams.sortBy,
    sort_order: searchParams.sortOrder,
    mode: searchParams.mode,
    search_type: searchParams.searchType,
    favorite_scope_topic: favoriteScopeTopic || undefined,
  }
  for (const key of Object.keys(params)) {
    if (params[key] === '' || params[key] === undefined) delete params[key]
  }
  return params
}

export function buildSearchHistoryKeyword(searchParams) {
  const ellipsize = (text, length) => (
    text.length > length ? `${text.slice(0, length)}…` : text
  )
  const topic = String(searchParams.topic || '').trim()
  if (topic) return ellipsize(topic, 220)
  const mustInclude = String(searchParams.mustInclude || '').trim()
  if (mustInclude) return ellipsize(mustInclude, 220)
  const anyInclude = String(searchParams.anyInclude || '').trim()
  if (anyInclude) return ellipsize(anyInclude, 220)
  const parts = []
  if (searchParams.publishTime && searchParams.publishTime !== '不限') {
    parts.push(`时间:${searchParams.publishTime}`)
  }
  if (searchParams.dataSource) parts.push(`来源:${searchParams.dataSource}`)
  if (searchParams.language) parts.push(`语种:${searchParams.language}`)
  if (searchParams.hitLocation && searchParams.hitLocation !== '全文') {
    parts.push(`命中:${searchParams.hitLocation}`)
  }
  if (searchParams.mode && searchParams.mode !== 'exact') {
    parts.push(`模式:${searchParams.mode}`)
  }
  if (searchParams.searchType && searchParams.searchType !== 'news') {
    parts.push(`类型:${searchParams.searchType}`)
  }
  return parts.join(' ') || '条件检索'
}

export function normalizeNewsListResponse(result) {
  const rows = (result?.data || []).map((item) => ({
    ...item,
    id: Number(item.id),
    is_favorited: !!item.is_favorited,
    is_warned: !!item.is_warned,
    selected: false,
  }))
  return {
    rows,
    total: result?.total ?? 0,
  }
}

export function normalizeSearchResponse(result, searchType, fallbackPagination) {
  const response = result && typeof result === 'object' ? result : {}
  const normalized = {
    clusterTree: [],
    eventCorefClusters: [],
    microStoryItems: [],
    macroEventItems: [],
    searchResults: [],
    total: response.total || 0,
    page: response.page || fallbackPagination.page,
    pageSize: response.page_size || fallbackPagination.pageSize,
  }
  if (searchType === 'l1') {
    normalized.eventCorefClusters = Array.isArray(response.event_coref_clusters)
      ? response.event_coref_clusters
      : []
    return normalized
  }
  if (searchType === 'l2' || searchType === 'l3') {
    normalized.macroEventItems = Array.isArray(response.macro_event_items)
      ? response.macro_event_items.map((item) => ({
          ...item,
          id: String(item.id),
          level: item.level || searchType,
        }))
      : []
    return normalized
  }
  normalized.clusterTree = Array.isArray(response.cluster_tree) ? response.cluster_tree : []
  normalized.eventCorefClusters = Array.isArray(response.event_coref_clusters)
    ? response.event_coref_clusters
    : []
  normalized.searchResults = (response.data || []).map((item) => ({
    ...item,
    id: Number(item.id),
    is_favorited: !!item.is_favorited,
    is_warned: !!item.is_warned,
  }))
  return normalized
}

export function mergeFavoriteNewsIds(currentIds, rows) {
  if (!Array.isArray(rows) || rows.length === 0) return currentIds
  const ids = rows
    .filter((item) => item && item.is_favorited && item.id !== undefined && item.id !== null)
    .map((item) => Number(item.id))
    .filter((id) => Number.isFinite(id))
  if (!ids.length) return currentIds
  return Array.from(new Set([...currentIds, ...ids]))
}

export function normalizeDisplayNewsRows(rawRows, showOnlyFirst, createFallbackId = () => (
  Math.random().toString(36).substr(2, 9)
)) {
  const normalized = rawRows.map((item) => ({
    ...item,
    id: item.id || createFallbackId(),
    title: item.title || '无标题',
    displayDesc: item.abstract || item.desc || '—',
    displayTime: item.pub_time || item.time,
    displayUrl: item.request_url || item.requestUrl || '#',
    isFirstRelease: item.is_first_release || item.isFirstRelease || false,
    is_favorited: !!item.is_favorited,
    is_warned: !!item.is_warned,
    selected: item.selected || false,
  }))
  return showOnlyFirst ? normalized.filter((item) => item.isFirstRelease) : [...normalized]
}

export function activeSearchSurfaceLabel(searchParams, searchTypes = SEARCH_TYPES) {
  const type = searchTypes.find((item) => item.value === searchParams.searchType)?.label || '新闻'
  const time = searchParams.publishTime && searchParams.publishTime !== '不限'
    ? searchParams.publishTime
    : '全时段'
  const mode = searchParams.mode === 'fuzzy' ? '模糊' : '精确'
  return `${type} · ${time} · ${mode}`
}

export function calculateTotalPages(totalItems, pageSize) {
  if (pageSize === 0) return 0
  return Math.ceil(totalItems / pageSize)
}

export function buildVisiblePages(currentPage, totalPages, forwardCount = 8) {
  const pages = []
  const start = Math.max(1, currentPage)
  const end = Math.min(totalPages, start + forwardCount)
  for (let page = start; page <= end; page += 1) pages.push(page)
  return pages
}

export function resolveJumpPage(value, currentPage, totalPages) {
  const page = parseInt(value)
  return page >= 1 && page <= totalPages ? page : currentPage
}
