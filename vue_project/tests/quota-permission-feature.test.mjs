import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'

const source = fs.readFileSync(new URL('../src/views/user/QuotaAdminPanel.vue', import.meta.url), 'utf8')
const setup = source.match(/<script setup>([\s\S]*?)<\/script>/)[1].replace(/^import .*$/gm, '')

function panel(canGrant, fetch) {
  const context = vm.createContext({
    ref: (value) => ({ value }),
    reactive: (value) => value,
    computed: (getter) => ({ get value() { return getter() } }),
    onMounted: () => {},
    getCurrentUser: () => ({ can_grant_quota: canGrant }),
    getToken: () => 'test-token',
    API_PREFIX: '/api',
    fetch,
  })
  vm.runInContext(setup + '\nglobalThis.panel = { users, selectedUserId, setQuotaPermission, notice, noticeKind, savingPermission }', context)
  context.panel.users.value = [{ user_id: 2, username: 'target', can_manage_quota: false }]
  context.panel.selectedUserId.value = 2
  return context.panel
}

test('owner can grant and revoke the selected account permission', async () => {
  const requests = []
  const state = panel(true, async (url, options) => {
    requests.push({ url, options })
    return { ok: true, json: async () => JSON.parse(options.body) }
  })
  await state.setQuotaPermission()
  assert.equal(state.users.value[0].can_manage_quota, true)
  await state.setQuotaPermission()
  assert.equal(state.users.value[0].can_manage_quota, false)
  assert.equal(requests.length, 2)
  assert.equal(requests[0].url, '/api/billing/users/2/quota-permission')
  assert.equal(requests[0].options.method, 'PUT')
  assert.deepEqual(JSON.parse(requests[0].options.body), { can_manage_quota: true })
})

test('failed authorization leaves permission unchanged and displays the error', async () => {
  const state = panel(true, async () => ({ ok: false, json: async () => ({ detail: '权限已失效' }) }))
  await state.setQuotaPermission()
  assert.equal(state.users.value[0].can_manage_quota, false)
  assert.equal(state.notice.value, '权限已失效')
  assert.equal(state.noticeKind.value, 'error')
  assert.equal(state.savingPermission.value, false)
})

test('delegate cannot authorize and owner permission cannot be revoked in the panel', async () => {
  let requests = 0
  const fetch = async () => { requests += 1 }
  await panel(false, fetch).setQuotaPermission()
  const owner = panel(true, fetch)
  owner.users.value[0].can_grant_quota = true
  await owner.setQuotaPermission()
  assert.equal(requests, 0)
})
