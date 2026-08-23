import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import test from 'node:test'

import {
  SEARCH_API_ENDPOINTS,
  SearchApiError,
  buildNewsListUrl,
  buildSearchAuthHeaders,
  createSearchApi,
  createSearchEndpoints,
} from '../src/features/search/api.js'
import {
  SEARCH_HIT_LOCATIONS,
  SEARCH_MODES,
  SEARCH_SITUATION_PRESETS,
  SEARCH_TIME_RANGES,
  SEARCH_TYPES,
  activeSearchSurfaceLabel,
  buildSearchHistoryKeyword,
  buildSearchRequestDto,
  buildVisiblePages,
  calculateTotalPages,
  createSearchParams,
  mergeFavoriteNewsIds,
  normalizeDisplayNewsRows,
  normalizeNewsListResponse,
  normalizeSearchResponse,
  resolveJumpPage,
} from '../src/features/search/model.js'
import {
  SEARCH_DATA_OPERATION_KINDS,
  SEARCH_REQUEST_TIMEOUT_MS,
  SearchRequestTimeoutError,
  createLatestSearchRequest,
  createSearchListOperation,
  createSearchOperationRunner,
  createSearchQueryOperation,
} from '../src/features/search/request.js'
import {
  DEFAULT_SEARCH_FOLDER_NAME,
  LEGACY_DEFAULT_THEME_NAME,
  SEARCH_THEME_LIST_KEY,
  SEARCH_THEME_NAME_KEY,
  createSearchThemeName,
  createSearchThemeStorage,
  displaySearchFolderName,
  normalizeSearchFolderName,
  normalizeSearchThemeList,
  renameSearchThemeList,
} from '../src/features/search/storage.js'

function jsonResponse(payload, status = 200, statusText = '') {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    async json() {
      return payload
    },
  }
}

test('search query DTO preserves defaults, trimming, omission, and Chinese wire values', () => {
  const defaults = createSearchParams()
  assert.deepEqual(defaults, {
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
  const input = createSearchParams({
    topic: '  China risk  ',
    mustInclude: '  policy ',
    anyInclude: ' trade  ',
    needExclude: '   ',
    publishTime: '近一月',
    startTime: '2026-07-01T00:00',
    hitLocation: '标题',
    language: '中文',
    page: 3,
    pageSize: 20,
    sortBy: 'pub_time',
    mode: 'fuzzy',
    searchType: 'l2',
  })
  const before = structuredClone(input)
  assert.deepEqual(buildSearchRequestDto(input, '政策观察'), {
    topic: 'China risk',
    keyword: 'China risk',
    must_include: 'policy',
    any_include: 'trade',
    need_exclude: '   ',
    publish_time: '近一月',
    start_time: '2026-07-01T00:00',
    hit_location: '标题',
    language: '中文',
    page: 3,
    page_size: 20,
    sort_by: 'pub_time',
    sort_order: 'desc',
    mode: 'fuzzy',
    search_type: 'l2',
    favorite_scope_topic: '政策观察',
  })
  assert.deepEqual(input, before)
  assert.deepEqual(buildSearchRequestDto(defaults, ''), {
    hit_location: '全文',
    page: 1,
    page_size: 10,
    sort_order: 'desc',
    mode: 'exact',
    search_type: 'news',
  })
  assert.equal(buildSearchHistoryKeyword(input), 'China risk')
  assert.equal(
    buildSearchHistoryKeyword(createSearchParams({ publishTime: '近一周', searchType: 'l1' })),
    '时间:近一周 类型:l1',
  )
  assert.equal(buildSearchHistoryKeyword(defaults), '条件检索')
})

test('filter constants and surface labels remain stable public contracts', () => {
  assert.deepEqual(SEARCH_TIME_RANGES.map((item) => item.value), [
    '不限',
    '近一天',
    '近一周',
    '近一月',
    '近三月',
    '近一年',
  ])
  assert.deepEqual(SEARCH_HIT_LOCATIONS.map((item) => item.value), ['全文', '标题', '摘要', '正文'])
  assert.deepEqual(SEARCH_MODES.map((item) => item.value), ['exact', 'fuzzy'])
  assert.deepEqual(SEARCH_TYPES.map((item) => item.value), ['news', 'l1', 'l2', 'l3'])
  assert.equal(SEARCH_SITUATION_PRESETS.length, 6)
  assert.equal(SEARCH_SITUATION_PRESETS[0].label, '台海风险')
  assert.equal(SEARCH_SITUATION_PRESETS[0].type, 'news')
  assert.equal(SEARCH_SITUATION_PRESETS[0].topic, 'Taiwan')
  assert.equal(SEARCH_SITUATION_PRESETS[0].mode, 'fuzzy')
  assert.deepEqual(
    SEARCH_SITUATION_PRESETS.slice(3).map((preset) => [preset.topic, preset.mode]),
    [['Ukraine', 'fuzzy'], ['Gaza', 'fuzzy'], ['control', 'fuzzy']],
  )
  assert.equal(SEARCH_SITUATION_PRESETS[5].type, 'news')
  assert.deepEqual(
    SEARCH_SITUATION_PRESETS.map((preset) => [preset.time, preset.timeLabel]),
    Array.from({ length: 6 }, () => ['不限', '不限时间']),
  )
  assert.equal(
    activeSearchSurfaceLabel(createSearchParams({ publishTime: '近三月', mode: 'fuzzy', searchType: 'l3' })),
    'L3大事件 · 近三月 · 模糊',
  )
})

test('news and hierarchy responses normalize against the request search-type snapshot', () => {
  assert.deepEqual(normalizeNewsListResponse({
    data: [{ id: '7', is_favorited: 1, is_warned: 0 }],
    total: 9,
  }), {
    rows: [{ id: 7, is_favorited: true, is_warned: false, selected: false }],
    total: 9,
  })

  const news = normalizeSearchResponse(
    {
      data: [{ id: '8', is_favorited: 1 }],
      cluster_tree: [{ story_id: 's1' }],
      event_coref_clusters: [{ cluster_id: 'c1' }],
      total: 1,
      page: 2,
      page_size: 25,
    },
    'news',
    { page: 1, pageSize: 10 },
  )
  assert.equal(news.searchResults[0].id, 8)
  assert.equal(news.searchResults[0].is_favorited, true)
  assert.deepEqual(news.clusterTree, [{ story_id: 's1' }])
  assert.deepEqual(news.eventCorefClusters, [{ cluster_id: 'c1' }])
  assert.equal(news.page, 2)
  assert.equal(news.pageSize, 25)

  const l1 = normalizeSearchResponse(
    { event_coref_clusters: [{ cluster_id: 'c2' }] },
    'l1',
    { page: 4, pageSize: 10 },
  )
  assert.deepEqual(l1.eventCorefClusters, [{ cluster_id: 'c2' }])
  assert.deepEqual(l1.searchResults, [])
  assert.equal(l1.page, 4)

  const l3 = normalizeSearchResponse(
    { macro_event_items: [{ id: 12 }, { id: '13', level: 'l2' }] },
    'l3',
    { page: 1, pageSize: 10 },
  )
  assert.deepEqual(l3.macroEventItems, [
    { id: '12', level: 'l3' },
    { id: '13', level: 'l2' },
  ])

  const displayRows = normalizeDisplayNewsRows(
    [{ id: 0, abstract: 'Summary', is_first_release: true }],
    true,
    () => 'fallback-id',
  )
  assert.deepEqual(displayRows, [{
    id: 'fallback-id',
    abstract: 'Summary',
    is_first_release: true,
    title: '无标题',
    displayDesc: 'Summary',
    displayTime: undefined,
    displayUrl: '#',
    isFirstRelease: true,
    is_favorited: false,
    is_warned: false,
    selected: false,
  }])
  assert.deepEqual(mergeFavoriteNewsIds([1], [
    { id: '2', is_favorited: true },
    { id: 1, is_favorited: true },
    { id: 3, is_favorited: false },
  ]), [1, 2])
})

test('pagination rules preserve zero, forward-window, and invalid-jump behavior', () => {
  assert.equal(calculateTotalPages(0, 10), 0)
  assert.equal(calculateTotalPages(95, 10), 10)
  assert.equal(calculateTotalPages(95, '20'), 5)
  assert.equal(calculateTotalPages(95, 0), 0)
  assert.deepEqual(buildVisiblePages(1, 10), [1, 2, 3, 4, 5, 6, 7, 8, 9])
  assert.deepEqual(buildVisiblePages(8, 10), [8, 9, 10])
  assert.deepEqual(buildVisiblePages(1, 0), [])
  assert.equal(resolveJumpPage('3', 1, 10), 3)
  assert.equal(resolveJumpPage('999', 4, 10), 4)
  assert.equal(resolveJumpPage('bad', 4, 10), 4)
})

test('search API preserves URL/body/auth and maps backend errors', async () => {
  const calls = []
  const fetchImpl = async (url, options) => {
    calls.push({ url: String(url), options })
    if (String(url).endsWith('/dashboard/search')) {
      return jsonResponse({ data: [], total: 0 })
    }
    return jsonResponse({ data: [], total: 3 })
  }
  const api = createSearchApi({
    fetchImpl,
    apiPrefix: '/api',
    getAccessToken: () => 'token-1',
  })
  const signal = { aborted: false }
  await api.listNews(
    { page: 2, size: 20, sortBy: '', sortOrder: 'desc', favoriteScopeTopic: '政策观察' },
    { signal, origin: 'https://globemind.top' },
  )
  await api.search({ topic: 'risk', search_type: 'news' }, { signal })
  const history = await api.recordHistory('x'.repeat(300))

  const listUrl = new URL(calls[0].url)
  assert.equal(listUrl.pathname, '/api/dashboard/news')
  assert.equal(listUrl.searchParams.get('page'), '2')
  assert.equal(listUrl.searchParams.get('size'), '20')
  assert.equal(listUrl.searchParams.has('sort_by'), false)
  assert.equal(listUrl.searchParams.get('favorite_scope_topic'), '政策观察')
  assert.equal(calls[0].options.headers.Authorization, 'Bearer token-1')
  assert.equal(calls[0].options.signal, signal)
  assert.equal(calls[1].url, '/api/dashboard/search')
  assert.deepEqual(JSON.parse(calls[1].options.body), { topic: 'risk', search_type: 'news' })
  assert.equal(JSON.parse(calls[2].options.body).keyword.length, 255)
  assert.deepEqual(history, { status: 'ok' })
  assert.deepEqual(buildSearchAuthHeaders(''), {})
  assert.deepEqual(buildSearchAuthHeaders('abc'), { Authorization: 'Bearer abc' })
  assert.equal(
    createSearchEndpoints('/v1').v11Children('story/a', 'l 2'),
    '/v1/dashboard/search/v11-clusters/story%2Fa/children?level=l%202&page=1&page_size=50',
  )
  assert.equal(SEARCH_API_ENDPOINTS.search.endsWith('/dashboard/search'), true)

  const errorApi = createSearchApi({
    fetchImpl: async () => jsonResponse({ detail: [{ msg: 'keyword required' }] }, 422, 'Unprocessable Entity'),
    apiPrefix: '/api',
    getAccessToken: () => '',
  })
  await assert.rejects(
    errorApi.search({}),
    (error) => (
      error instanceof SearchApiError
      && error.operation === 'search'
      && error.status === 422
      && error.message === 'keyword required'
    ),
  )
  assert.equal(
    buildNewsListUrl('/api/dashboard/news', 'https://globemind.top', {
      page: 1,
      size: 10,
      sortBy: '',
      sortOrder: 'desc',
      favoriteScopeTopic: '',
    }).searchParams.has('sort_by'),
    false,
  )
  assert.equal(
    buildNewsListUrl('/api/dashboard/news', 'https://globemind.top', {
      page: 1,
      size: 10,
      sortBy: 'pub_time',
      sortOrder: 'desc',
      favoriteScopeTopic: '',
    }).searchParams.get('sort_by'),
    'pub_time',
  )
})

test('search API owns options, stats, hierarchy, and favorite transport contracts', async () => {
  const calls = []
  const fetchImpl = async (url, options) => {
    calls.push({ url: String(url), options })
    return jsonResponse({ items: [] })
  }
  const api = createSearchApi({
    fetchImpl,
    apiPrefix: '/api',
    getAccessToken: () => 'token-2',
  })
  const signal = { aborted: false }
  const favorite = { news_id: 17, topic: '政策观察', kind: 'favorite' }

  await api.getSearchOptions({ signal })
  await api.getStats({ signal })
  await api.getV11Children('story/a', 'l 2', { signal })
  await api.listFavorites({ signal })
  await api.toggleFavorite(favorite, { signal })
  await api.removeFavorite(favorite, { signal })

  assert.deepEqual(calls.map((call) => call.url), [
    '/api/dashboard/search/options',
    '/api/dashboard/stats',
    '/api/dashboard/search/v11-clusters/story%2Fa/children?level=l%202&page=1&page_size=50',
    '/api/user/favorites',
    '/api/user/favorites/toggle',
    '/api/user/favorites/remove',
  ])
  assert.equal(calls.every((call) => call.options.signal === signal), true)
  assert.equal(calls[0].options.headers, undefined)
  assert.equal(calls[1].options.headers, undefined)
  assert.equal(calls[2].options.headers.Authorization, 'Bearer token-2')
  assert.equal(calls[3].options.headers.Authorization, 'Bearer token-2')
  assert.equal(calls[4].options.method, 'POST')
  assert.deepEqual(JSON.parse(calls[4].options.body), favorite)
  assert.equal(calls[5].options.method, 'POST')
  assert.deepEqual(JSON.parse(calls[5].options.body), favorite)
})

test('search API errors are stable while abort errors remain identifiable', async () => {
  const responseApi = createSearchApi({
    fetchImpl: async () => jsonResponse({ detail: 'service unavailable' }, 503, 'Unavailable'),
    apiPrefix: '/api',
  })
  await assert.rejects(
    responseApi.listFavorites(),
    (error) => (
      error instanceof SearchApiError
      && error.operation === 'list-favorites'
      && error.status === 503
      && error.message === 'service unavailable'
    ),
  )

  const networkFailure = new Error('socket closed')
  const networkApi = createSearchApi({
    fetchImpl: async () => { throw networkFailure },
    apiPrefix: '/api',
  })
  await assert.rejects(
    networkApi.getStats(),
    (error) => (
      error instanceof SearchApiError
      && error.operation === 'stats'
      && error.status === 0
      && error.cause === networkFailure
      && error.message === '加载统计信息失败，请检查网络连接'
    ),
  )

  const abortError = new Error('cancelled')
  abortError.name = 'AbortError'
  const abortApi = createSearchApi({
    fetchImpl: async () => { throw abortError },
    apiPrefix: '/api',
  })
  await assert.rejects(abortApi.getV11Children('1', 'l2'), (error) => error === abortError)
})

test('latest request coordinator aborts old work and rejects stale commits', async () => {
  const controllers = []
  class FakeAbortController {
    constructor() {
      this.signal = { aborted: false }
      controllers.push(this)
    }
    abort() {
      this.signal.aborted = true
    }
  }
  const deferred = () => {
    let resolve
    let reject
    const promise = new Promise((resolvePromise, rejectPromise) => {
      resolve = resolvePromise
      reject = rejectPromise
    })
    return { promise, resolve, reject }
  }
  const first = deferred()
  const second = deferred()
  const coordinator = createLatestSearchRequest({ AbortControllerImpl: FakeAbortController })
  const firstRun = coordinator.run(() => first.promise)
  const secondRun = coordinator.run(() => second.promise)
  assert.equal(controllers[0].signal.aborted, true)
  assert.equal(coordinator.isActive(), true)
  first.resolve('old')
  second.resolve('new')
  assert.deepEqual(await firstRun, { status: 'stale', latest: false })
  assert.deepEqual(await secondRun, { status: 'success', latest: true, value: 'new' })
  assert.equal(coordinator.isActive(), false)

  const third = deferred()
  const thirdRun = coordinator.run(() => third.promise)
  coordinator.cancel()
  assert.equal(controllers[2].signal.aborted, true)
  third.resolve('cancelled')
  assert.deepEqual(await thirdRun, { status: 'stale', latest: false })
  assert.equal(coordinator.isActive(), false)

  const failure = new Error('network down')
  const failed = await coordinator.run(async () => { throw failure })
  assert.deepEqual(failed, { status: 'error', latest: true, error: failure })
})

test('latest request coordinator enforces a bounded search time', async () => {
  let timeoutCallback
  let rejectRequest
  let aborted = false
  class FakeAbortController {
    constructor() {
      this.signal = { aborted: false }
    }
    abort() {
      aborted = true
      this.signal.aborted = true
      rejectRequest?.(Object.assign(new Error('aborted'), { name: 'AbortError' }))
    }
  }
  const coordinator = createLatestSearchRequest({
    AbortControllerImpl: FakeAbortController,
    timeoutMs: 25,
    setTimeoutImpl(callback) {
      timeoutCallback = callback
      return 1
    },
    clearTimeoutImpl() {},
  })
  const run = coordinator.run((_signal) => new Promise((_resolve, reject) => {
    rejectRequest = reject
  }))
  timeoutCallback()
  const outcome = await run
  assert.equal(aborted, true)
  assert.equal(outcome.status, 'timeout')
  assert.equal(outcome.latest, true)
  assert.equal(outcome.error instanceof SearchRequestTimeoutError, true)
  assert.equal(outcome.error.timeoutMs, 25)
  assert.equal(SEARCH_REQUEST_TIMEOUT_MS, 8_000)
})

test('operation-aware retry repeats the failed GET or POST snapshot without switching modes', async () => {
  const calls = []
  let listAttempts = 0
  let searchAttempts = 0
  const api = {
    async listNews(query, options) {
      calls.push({ kind: 'list', query, options })
      listAttempts += 1
      if (listAttempts === 1) throw new Error('list failed')
      return { data: [], total: 0 }
    },
    async search(params, options) {
      calls.push({ kind: 'search', params, options })
      searchAttempts += 1
      if (searchAttempts === 1) throw new Error('search failed')
      return { data: [], total: 0 }
    },
  }
  const runner = createSearchOperationRunner({
    api,
    request: createLatestSearchRequest(),
  })

  const listQuery = { page: 4, size: 20, sortBy: '', sortOrder: 'desc' }
  const listOperation = createSearchListOperation({
    query: listQuery,
    origin: 'https://globemind.top',
  })
  listQuery.page = 99
  const failedList = await runner.execute(listOperation)
  assert.equal(failedList.status, 'error')
  assert.equal(runner.getFailedOperation().kind, SEARCH_DATA_OPERATION_KINDS.LIST)
  const retriedList = await runner.retry()
  assert.equal(retriedList.status, 'success')
  assert.deepEqual(calls.slice(0, 2).map((call) => call.kind), ['list', 'list'])
  assert.deepEqual(calls.slice(0, 2).map((call) => call.query.page), [4, 4])
  assert.equal(calls[0].options.origin, 'https://globemind.top')
  assert.equal(calls[0].options.signal instanceof AbortSignal, true)

  const payload = { topic: 'original', search_type: 'l2' }
  const requestParams = { topic: 'original', searchType: 'l2', page: 2, pageSize: 10 }
  const searchOperation = createSearchQueryOperation({
    params: payload,
    requestParams,
    searchType: 'l2',
  })
  payload.topic = 'changed'
  requestParams.searchType = 'news'
  const failedSearch = await runner.execute(searchOperation)
  assert.equal(failedSearch.status, 'error')
  assert.equal(runner.getFailedOperation().kind, SEARCH_DATA_OPERATION_KINDS.SEARCH)
  const retriedSearch = await runner.retry()
  assert.equal(retriedSearch.status, 'success')
  assert.deepEqual(calls.slice(2).map((call) => call.kind), ['search', 'search'])
  assert.deepEqual(calls.slice(2).map((call) => call.params.topic), ['original', 'original'])
  assert.equal(retriedSearch.operation.searchType, 'l2')
  assert.equal(runner.getFailedOperation(), null)
  assert.deepEqual(await runner.retry(), { status: 'idle', latest: true, operation: null })
  assert.equal(Object.isFrozen(listOperation.query), true)
  assert.equal(Object.isFrozen(searchOperation.requestParams), true)
})

test('theme storage preserves keys, malformed-data fallback, aliases, and naming', () => {
  assert.equal(SEARCH_THEME_NAME_KEY, 'data_search_theme_name_v1')
  assert.equal(SEARCH_THEME_LIST_KEY, 'data_search_themes_list_v1')
  assert.equal(DEFAULT_SEARCH_FOLDER_NAME, '默认工作夹')
  assert.equal(LEGACY_DEFAULT_THEME_NAME, '新闻分析主题')
  assert.equal(normalizeSearchFolderName('  '), '默认工作夹')
  assert.equal(displaySearchFolderName('新闻分析主题'), '默认工作夹')
  assert.equal(displaySearchFolderName('政策观察'), '政策观察')
  assert.deepEqual(normalizeSearchThemeList([' A ', 'A', '', 'B'], 'C'), ['A', 'B', 'C'])
  assert.deepEqual(renameSearchThemeList(['A', 'B'], 'A', 'B'), ['B'])
  assert.deepEqual(renameSearchThemeList(['A'], 'missing', 'C'), ['A', 'C'])
  assert.equal(createSearchThemeName([], new Date(2026, 6, 11)), '工作文件夹 7-11')
  assert.equal(
    createSearchThemeName(['工作文件夹 7-11', '工作文件夹 7-11 (1)'], new Date(2026, 6, 11)),
    '工作文件夹 7-11 (2)',
  )

  const values = new Map([
    [SEARCH_THEME_NAME_KEY, ' 政策观察 '],
    [SEARCH_THEME_LIST_KEY, '{broken'],
  ])
  const storage = {
    getItem(key) {
      return values.get(key) ?? null
    },
    setItem(key, value) {
      values.set(key, value)
    },
  }
  const model = createSearchThemeStorage(storage)
  assert.equal(model.readCurrent(), '政策观察')
  assert.deepEqual(model.loadThemes('政策观察'), ['政策观察'])
  assert.equal(values.get(SEARCH_THEME_LIST_KEY), '["政策观察"]')
  model.saveCurrent('风险观察')
  assert.equal(values.get(SEARCH_THEME_NAME_KEY), '风险观察')
})

async function walkFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const path = `${directory}/${entry.name}`
    if (entry.isDirectory()) files.push(...(await walkFiles(path)))
    else files.push(path)
  }
  return files
}

test('data-search route consumes the feature through its public entry', async () => {
  const route = await readFile(
    new URL('../src/views/DataService/data-search.vue', import.meta.url),
    'utf8',
  )
  const publicEntry = await readFile(new URL('../src/features/search/index.js', import.meta.url), 'utf8')
  assert.match(route, /from ['"]@\/features\/search\/index\.js['"]/)
  assert.doesNotMatch(route, /from ['"]@\/features\/search\/(?!index\.js)/)
  assert.doesNotMatch(route, /\bAPI_PREFIX\b/)
  assert.doesNotMatch(route, /\bfetch\s*\(/)
  assert.doesNotMatch(route, /data_search_theme_(?:name|themes_list)_v1/)
  assert.match(route, /dataRequest\.cancel\(\)/)
  assert.match(route, /auxiliaryRequestController\.abort\(\)/)
  assert.match(route, /@click="retryLastDataRequest"/)
  assert.match(route, /dataOperations\.retry\(\)/)
  assert.match(publicEntry, /from ['"]\.\/api\.js['"]/)
  assert.match(publicEntry, /from ['"]\.\/model\.js['"]/)
  assert.match(publicEntry, /from ['"]\.\/request\.js['"]/)
  assert.match(publicEntry, /from ['"]\.\/storage\.js['"]/)

  const sourceFiles = (await walkFiles(new URL('../src', import.meta.url).pathname)).filter((path) => (
    /\.(vue|js)$/.test(path)
  ))
  let publicImports = 0
  for (const path of sourceFiles) {
    const source = await readFile(path, 'utf8')
    for (const match of source.matchAll(/from ['"]@\/features\/search\/([^'"]+)['"]/g)) {
      publicImports += 1
      assert.equal(match[1], 'index.js', `deep search import in ${path}`)
    }
  }
  assert.equal(publicImports, 1)
})

test('data-search mobile pagination wraps without widening the page', async () => {
  const styles = await readFile(
    new URL('../src/views/DataService/data-search.less', import.meta.url),
    'utf8',
  )
  const mobileStyles = styles.slice(styles.indexOf('@media (max-width: 900px)'))

  assert.match(mobileStyles, /\.pagination\s*\{[^}]*flex-wrap:\s*wrap;/s)
  assert.match(mobileStyles, /\.pagination\s*\{[^}]*gap:\s*12px 16px;/s)
  assert.match(
    mobileStyles,
    /\.pagination-info,[\s\S]*\.pagination-jump\s*\{[^}]*min-width:\s*0;/,
  )
})
