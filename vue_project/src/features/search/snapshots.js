export const SEARCH_COMPARISON_SCHEMA = 'search-comparison-v1'
const SNAPSHOT_ID = /^search-snap-[0-9]{8}T[0-9]{12}Z-[0-9a-f]{16}$/

export function normalizeSavedSearchSnapshot(value) {
  if (!value || !SNAPSHOT_ID.test(value.snapshot_id || '')
    || !Number.isFinite(Date.parse(value.captured_at))
    || !value.receipt || !Array.isArray(value.receipt.ordered_returned_ids)
    || !Number.isInteger(value.receipt.total) || value.receipt.total < 0) {
    throw new Error('查询快照响应不完整，请刷新后重试')
  }
  return value
}

export function normalizeSavedSearchSnapshots(payload) {
  if (payload?.schema_version !== 'search-snapshot-list-v1'
    || !Array.isArray(payload.items) || !Number.isInteger(payload.snapshot_count)
    || payload.snapshot_count < payload.items.length) {
    throw new Error('查询快照列表不可用，不能将失败视为没有历史快照')
  }
  const ids = new Set()
  return payload.items.map((item) => {
    const record = normalizeSavedSearchSnapshot(item)
    if (ids.has(record.snapshot_id)) throw new Error('查询快照列表包含重复记录')
    ids.add(record.snapshot_id)
    return record
  })
}

export function normalizeSearchComparison(value, fromId, toId) {
  if (value?.schema_version !== SEARCH_COMPARISON_SCHEMA
    || !['changed', 'no_observed_change', 'not_comparable'].includes(value.status)
    || value.from_snapshot?.snapshot_id !== fromId || value.to_snapshot?.snapshot_id !== toId
    || !value.comparability || !Array.isArray(value.contract_changes)
    || !Array.isArray(value.entered_scope) || !Array.isArray(value.exited_scope)
    || !Array.isArray(value.rank_changes) || !Array.isArray(value.reason_codes)
    || !Array.isArray(value.limitations) || !Array.isArray(value.method_changes)
    || !Array.isArray(value.coverage_changes)) {
    throw new Error('比较响应与所选版本不一致，请重新比较')
  }
  return value
}

export function describeSearchSnapshot(item) {
  const receipt = item.receipt
  const query = receipt.normalized_contract?.raw_query || '筛选查询'
  return `${item.captured_at} · ${query} · 第 ${receipt.page} 页 · ${receipt.ordered_returned_ids.length}/${receipt.total} 条`
}

const REASON_LABELS = Object.freeze({
  QUERY_CONTRACT_CHANGED: '查询条件发生变化',
  RESULT_ENTERED_SCOPE: '有结果新进入本次比较范围',
  RESULT_EXITED_SCOPE: '有结果退出本次比较范围',
  RESULT_POSITION_CHANGED: '结果绝对位次发生变化',
  COMMON_ORDER_CHANGED: '共同结果的相对顺序发生变化',
  METHOD_METADATA_CHANGED: '查询方法元数据发生变化',
  RESULT_TOTAL_CHANGED: '记录的命中总量发生变化',
  RESULT_COVERAGE_CHANGED: '返回结果的时间覆盖发生变化',
  ATTRIBUTION_UNDETERMINED: '现有记录不足以确定唯一原因',
  RESULT_NAMESPACE_CHANGED: '前后结果类型不同，不直接比较增减或排名',
  PAGINATION_CHANGED: '分页范围不同，排名不可直接比较',
  SORT_CHANGED: '排序条件不同，排名不能解释为同一规则下的变化',
  CAPTURED_SCOPE_ONLY: '只比较已捕获范围，不代表完整语料',
  CORPUS_NOT_FROZEN: '底层语料未冻结',
  BODIES_NOT_COMPARED: '本步骤未比较文章正文',
  RETURNED_TIME_COVERAGE_CHANGED: '已保存结果的时间覆盖发生变化',
  COMPARISON_COVERS_CAPTURED_SCOPE_ONLY: '仅比较已捕获范围，不代表完整语料',
  ARTICLE_BODIES_AND_CORPUS_NOT_FROZEN: '文章正文及底层语料尚未冻结，本步骤不判断正文变化',
  CHECKSUM_DOES_NOT_ESTABLISH_EXECUTION_ORIGIN: '历史快照的执行来源无法单凭校验摘要确认',
  RESULT_NAMESPACE_MISMATCH: '前后结果类型不同，不能直接比较增减和排名',
  PAGINATION_SCOPE_CHANGED: '分页范围发生变化，不能直接比较位次',
  SORT_CONTRACT_CHANGED: '排序条件发生变化，不能解释为同一规则下的位次变化',
  EXECUTION_CAUSE_NOT_ESTABLISHED: '尚不能区分语料更新、排序输入等因素对结果的具体影响',
})

export function searchComparisonMessage(code) {
  return REASON_LABELS[code] || '存在额外比较边界，请查看快照详情'
}

export function createSnapshotWorkspace({ api, state = {}, getAccessToken = () => '' }) {
  Object.assign(state, {
    items: [], total: 0, loaded: false, loading: false, busy: false,
    fromId: '', toId: '', comparison: null, error: '', notice: '', lastExecutedAt: '',
  })
  let generation = 0
  let refreshSequence = 0
  let loadedToken = null
  let controller = new AbortController()
  const active = (at, token) => at === generation && token === getAccessToken()
  const session = () => {
    const token = getAccessToken()
    if (!token) throw new Error('请登录后保存和比较查询快照')
    return { at: generation, token }
  }

  function reset() {
    loadedToken = null
    generation += 1
    refreshSequence += 1
    controller.abort()
    controller = new AbortController()
    Object.assign(state, {
      items: [], total: 0, loaded: false, loading: false, busy: false,
      fromId: '', toId: '', comparison: null, error: '', notice: '', lastExecutedAt: '',
    })
  }

  async function refresh() {
    if (loadedToken && loadedToken !== getAccessToken()) reset()
    let context
    const sequence = ++refreshSequence
    try {
      context = session()
      state.loading = true
      state.error = ''
      const payload = await api.listSearchSnapshots(100, { signal: controller.signal })
      const items = normalizeSavedSearchSnapshots(payload)
      if (!active(context.at, context.token) || sequence !== refreshSequence) return false
      const pinned = state.items.filter((item) => [state.fromId, state.toId].includes(item.snapshot_id)
        && !items.some((fresh) => fresh.snapshot_id === item.snapshot_id))
      state.items = [...items, ...pinned]
      state.total = payload.snapshot_count
      state.loaded = true
      loadedToken = context.token
      if (!state.fromId) state.fromId = items[0]?.snapshot_id || ''
      if (!state.toId) state.toId = items[0]?.snapshot_id || ''
      return true
    } catch (error) {
      if (!context || (active(context.at, context.token) && sequence === refreshSequence)) {
        state.error = error.message || '加载查询快照失败'
        state.loaded = false
      }
      return false
    } finally {
      if (context && active(context.at, context.token) && sequence === refreshSequence) state.loading = false
    }
  }

  async function execute(params) {
    if (state.busy || state.loading) return false
    let context
    try {
      context = session()
      if (!state.loaded) throw new Error('请先成功加载历史快照，再执行保存')
      if (loadedToken !== context.token) {
        reset()
        state.error = '登录状态已变化，请刷新历史快照后再操作'
        return false
      }
      if (!params || params.search_type !== 'news' || ['cluster', 'event_coref'].includes(params.mode)) throw new Error('请先完成一次新闻文章检索，再保存基线')
      const request = JSON.parse(JSON.stringify(params))
      const previousId = state.items[0]?.snapshot_id || null
      state.busy = true
      state.error = ''
      state.notice = ''
      state.comparison = null
      const payload = await api.executeSearchSnapshot(request, previousId, { signal: controller.signal })
      const snapshot = normalizeSavedSearchSnapshot(payload?.snapshot)
      if (!Number.isFinite(Date.parse(payload?.execution?.executed_at))) throw new Error('本次执行时间缺失，请刷新历史快照核实保存结果')
      if (!active(context.at, context.token)) return false
      const known = state.items.some((item) => item.snapshot_id === snapshot.snapshot_id)
      const baseline = state.fromId
      const pinnedBaseline = state.items.find((item) => item.snapshot_id === baseline)
      state.items = [snapshot, ...state.items.filter((item) => item.snapshot_id !== snapshot.snapshot_id)].slice(0, 100)
      if (pinnedBaseline && !state.items.some((item) => item.snapshot_id === baseline)) state.items.push(pinnedBaseline)
      if (!known) state.total += 1
      if (!baseline) state.fromId = snapshot.snapshot_id
      state.toId = snapshot.snapshot_id
      state.lastExecutedAt = payload.execution.executed_at
      state.notice = payload.execution.snapshot_reused
        ? '本次检索结果未变，复用已保存快照；本次检查时间已更新。'
        : '服务端已重新检索并保存快照。可选择基线后比较。'
      if (baseline) await compare(state.fromId, state.toId, true)
      return true
    } catch (error) {
      if (!context || active(context.at, context.token)) {
        state.error = error.status === 409
          ? '其他操作已推进快照版本，或相同结果已保存。请刷新历史快照后重试。'
          : error.message || '执行并保存失败'
      }
      return false
    } finally {
      if (context && active(context.at, context.token)) state.busy = false
    }
  }

  async function compare(fromId = state.fromId, toId = state.toId, withinExecution = false) {
    if (state.busy && !withinExecution) return false
    let context
    try {
      context = session()
      if (!state.loaded) throw new Error('请先成功加载历史快照，再比较')
      if (loadedToken !== context.token) {
        reset()
        state.error = '登录状态已变化，请刷新历史快照后再操作'
        return false
      }
      if (!fromId || !toId) throw new Error('请选择需要比较的两个快照')
      if (!withinExecution) state.busy = true
      state.error = ''
      state.comparison = null
      const result = await api.compareSearchSnapshots(fromId, toId, { signal: controller.signal })
      const normalized = normalizeSearchComparison(result, fromId, toId)
      if (!active(context.at, context.token) || state.fromId !== fromId || state.toId !== toId) return false
      state.comparison = normalized
      return true
    } catch (error) {
      if (!context || active(context.at, context.token)) state.error = error.message || '比较查询快照失败'
      return false
    } finally {
      if (context && active(context.at, context.token) && !withinExecution) state.busy = false
    }
  }

  return Object.freeze({ state, refresh, execute, compare, reset, dispose: reset })
}
