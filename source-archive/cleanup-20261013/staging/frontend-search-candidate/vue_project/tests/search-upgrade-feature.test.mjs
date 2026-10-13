import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { createSearchApi } from '../src/features/search/api.js'
import {
  SEARCH_MODES,
  normalizeQueryExplain,
  normalizeQueryReceipt,
} from '../src/features/search/model.js'


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


test('optional capability discovery falls back to the deployed keyword backend', async () => {
  const api = createSearchApi({
    apiPrefix: '/api',
    fetchImpl: async () => jsonResponse({ detail: 'Not Found' }, 404, 'Not Found'),
  })

  assert.deepEqual(await api.getCapabilities(), {
    keyword: true,
    semantic: false,
    hybrid: false,
    reason: 'capabilities_endpoint_not_deployed',
  })
})


test('search upgrade exposes governed modes while keeping indexed modes capability-gated', async () => {
  assert.deepEqual(SEARCH_MODES.map(({ value }) => value), [
    'exact',
    'fuzzy',
    'hybrid',
    'semantic',
  ])
  const source = await readFile(
    new URL('../src/views/DataService/data-search.vue', import.meta.url),
    'utf8',
  )
  assert.match(source, /isSearchModeDisabled\(m\.value\)/)
  assert.match(source, /语义与混合检索尚未通过索引就绪验证/)
  assert.match(source, /v-if="queryExplain"/)
  assert.match(source, /本次查询执行收据/)
  assert.doesNotMatch(source, /@click="preflightSearch"/)
})


test('partial explain and receipt payloads expose unavailable state instead of fabricating metadata', () => {
  const explain = normalizeQueryExplain({ version: 'unknown' })
  const receipt = normalizeQueryReceipt({ schema_version: 'unknown' })
  assert.equal(explain.query_language, 'unavailable')
  assert.deepEqual(explain.query_ast, { type: 'unavailable' })
  assert.equal(receipt.method_version, 'unavailable')
  assert.equal(receipt.result_coverage.status, 'unavailable')
})


test('gateway search deadline returns an actionable bounded-query message', async () => {
  const api = createSearchApi({
    apiPrefix: '/api',
    fetchImpl: async () => ({
      ok: false,
      status: 504,
      statusText: 'Gateway Timeout',
      async json() {
        throw new SyntaxError('HTML gateway response')
      },
    }),
  })

  await assert.rejects(
    api.search({ keyword: 'China', mode: 'exact' }),
    (error) => error.status === 504 && /增加限定词或缩短时间范围/.test(error.message),
  )
})
