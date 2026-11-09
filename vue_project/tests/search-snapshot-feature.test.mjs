import assert from 'node:assert/strict'
import test from 'node:test'
import { createSearchApi } from '../src/features/search/api.js'
import { createSnapshotWorkspace, normalizeSavedSearchSnapshots, normalizeSearchComparison, searchComparisonMessage } from '../src/features/search/snapshots.js'

const id = (n) => `search-snap-20261109T020000000000Z-${String(n).padStart(16, '0')}`
const snapshot = (n, ids = ['101']) => ({
  snapshot_id: id(n), captured_at: '2026-11-09T02:00:00Z',
  receipt: { ordered_returned_ids: ids, total: ids.length, page: 1, normalized_contract: { raw_query: '出口限制' } },
})
const list = (items) => ({ schema_version: 'search-snapshot-list-v1', snapshot_count: items.length, items })
const comparison = (from, to) => ({
  schema_version: 'search-comparison-v1', status: 'changed',
  from_snapshot: { snapshot_id: from }, to_snapshot: { snapshot_id: to },
  comparability: {}, contract_changes: [], entered_scope: ['102'], exited_scope: [], rank_changes: [],
  reason_codes: [], limitations: [], method_changes: [], coverage_changes: [],
})
const execution = (record, reused = false) => ({
  snapshot: record, execution: { executed_at: '2026-11-09T05:00:00Z', snapshot_reused: reused },
})
const deferred = () => { let resolve; const promise = new Promise((r) => { resolve = r }); return { promise, resolve } }

function setup(overrides = {}) {
  const api = {
    async listSearchSnapshots() { return list([snapshot(1)]) },
    async executeSearchSnapshot() { return execution(snapshot(2, ['102'])) },
    async compareSearchSnapshots(from, to) { return comparison(from, to) },
    ...overrides,
  }
  return createSnapshotWorkspace({ api, getAccessToken: () => 'test-token' })
}

test('malformed or duplicate history fails instead of becoming an empty baseline', () => {
  assert.throws(() => normalizeSavedSearchSnapshots({ items: [] }), /不可用/)
  assert.throws(() => normalizeSavedSearchSnapshots(list([snapshot(1), snapshot(1)])), /重复/)
  assert.throws(() => normalizeSearchComparison(comparison(id(1), id(2)), id(1), id(3)), /不一致/)
})

test('saved execution uses a copied successful request, current ledger head, and preserves chosen baseline', async () => {
  let request, previous
  const workspace = setup({ async executeSearchSnapshot(params, head) { request = params; previous = head; return execution(snapshot(2)) } })
  await workspace.refresh()
  const params = { search_type: 'news', keyword: '出口限制', event_countries: ['CN'] }
  assert.equal(await workspace.execute(params), true)
  params.event_countries.push('US')
  assert.deepEqual(request.event_countries, ['CN'])
  assert.equal(previous, id(1))
  assert.equal(workspace.state.fromId, id(1))
  assert.equal(workspace.state.toId, id(2))
  assert.equal(workspace.state.comparison.from_snapshot.snapshot_id, id(1))
})

test('first baseline has no invented historical comparison; unchanged re-execution keeps actual check time', async () => {
  let calls = 0
  const workspace = setup({
    async listSearchSnapshots() { return list([]) },
    async executeSearchSnapshot() { return execution(snapshot(1), calls++ > 0) },
  })
  await workspace.refresh()
  await workspace.execute({ search_type: 'news' })
  assert.equal(workspace.state.comparison, null)
  await workspace.execute({ search_type: 'news' })
  assert.equal(workspace.state.total, 1)
  assert.equal(workspace.state.lastExecutedAt, '2026-11-09T05:00:00Z')
  assert.match(workspace.state.notice, /复用/)
  assert.equal(workspace.state.comparison.from_snapshot.snapshot_id, id(1))
})

test('history refresh retains an explicitly pinned baseline outside the latest returned page', async () => {
  let count = 0
  const workspace = setup({ async listSearchSnapshots() { return list([snapshot(++count)]) } })
  await workspace.refresh()
  await workspace.refresh()
  assert.equal(workspace.state.fromId, id(1))
  assert.equal(workspace.state.items[0].snapshot_id, id(2))
  assert.ok(workspace.state.items.some((item) => item.snapshot_id === id(1)))
})

test('concurrent ledger conflict is surfaced and does not fabricate a successful comparison', async () => {
  const workspace = setup({ async executeSearchSnapshot() { throw Object.assign(new Error('conflict'), { status: 409 }) } })
  await workspace.refresh()
  assert.equal(await workspace.execute({ search_type: 'news' }), false)
  assert.equal(workspace.state.items.length, 1)
  assert.equal(workspace.state.comparison, null)
  assert.match(workspace.state.error, /刷新历史快照/)
})

test('failed history and unsupported search mode cannot perform a save', async () => {
  let calls = 0
  const workspace = setup({ async executeSearchSnapshot() { calls++; return execution(snapshot(2)) } })
  assert.equal(await workspace.execute({ search_type: 'news' }), false)
  await workspace.refresh()
  assert.equal(await workspace.execute({ search_type: 'news', mode: 'event_coref' }), false)
  assert.equal(calls, 0)
})

test('responses arriving after reset or identity change cannot restore private history', async () => {
  const pending = deferred()
  let token = 'first'
  const workspace = createSnapshotWorkspace({
    api: { async listSearchSnapshots() { return pending.promise } }, getAccessToken: () => token,
  })
  const request = workspace.refresh()
  token = 'second'
  workspace.reset()
  pending.resolve(list([snapshot(1)]))
  assert.equal(await request, false)
  assert.deepEqual(workspace.state.items, [])
  assert.equal(workspace.state.loaded, false)
})

test('stale comparisons are ignored when the selected baseline changes during the request', async () => {
  const pending = deferred()
  const workspace = setup({ async compareSearchSnapshots() { return pending.promise } })
  await workspace.refresh()
  const request = workspace.compare()
  workspace.state.fromId = id(2)
  pending.resolve(comparison(id(1), id(1)))
  assert.equal(await request, false)
  assert.equal(workspace.state.comparison, null)
})

test('snapshot API executes full query on server and URL-encodes comparison references', async () => {
  const calls = []
  const api = createSearchApi({
    apiPrefix: '/api', getAccessToken: () => 'test',
    async fetchImpl(url, options) { calls.push({ url, options }); return { ok: true, async json() { return {} } } },
  })
  const params = { keyword: '出口限制', search_type: 'news', page: 1, page_size: 10 }
  await api.executeSearchSnapshot(params, id(1))
  assert.equal(calls[0].url, '/api/search-snapshots/execute')
  assert.equal(calls[0].options.headers.Authorization, 'Bearer test')
  assert.deepEqual(JSON.parse(calls[0].options.body), { params, expected_previous_snapshot_id: id(1) })
  assert.equal('receipt' in JSON.parse(calls[0].options.body), false)
  await api.compareSearchSnapshots('from/part', 'to?part')
  assert.equal(calls[1].url, '/api/search-snapshots/from%2Fpart/comparison?to_snapshot_id=to%3Fpart')
})

test('known comparison boundaries are explained without exposing implementation labels', () => {
  assert.match(searchComparisonMessage('PAGINATION_SCOPE_CHANGED'), /分页/)
  assert.match(searchComparisonMessage('EXECUTION_CAUSE_NOT_ESTABLISHED'), /不能区分/)
  assert.doesNotMatch(searchComparisonMessage('UNKNOWN_FUTURE_CODE'), /UNKNOWN_FUTURE_CODE/)
})


test('same-tab identity changes stop execute and compare before using previous-user snapshot IDs', async () => {
  for (const action of ['execute', 'compare']) {
    let token = 'old-user'
    let privateCalls = 0
    const workspace = createSnapshotWorkspace({
      getAccessToken: () => token,
      api: {
        async listSearchSnapshots() { return list([snapshot(1)]) },
        async executeSearchSnapshot() { privateCalls++; return execution(snapshot(2)) },
        async compareSearchSnapshots() { privateCalls++; return comparison(id(1), id(1)) },
      },
    })
    await workspace.refresh()
    token = 'new-user'
    assert.equal(await workspace[action]({ search_type: 'news' }), false)
    assert.equal(privateCalls, 0)
    assert.deepEqual(workspace.state.items, [])
    assert.equal(workspace.state.loaded, false)
    assert.match(workspace.state.error, /登录状态已变化/)
  }
})
