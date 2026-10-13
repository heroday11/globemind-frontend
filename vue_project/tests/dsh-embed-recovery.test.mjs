import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { dshLaunchUrl, isDshFrame } from '../src/utils/dshFrame.js'

test('launch is same-origin and receives a fresh document URL', () => {
  const a = dshLaunchUrl('/dsh/?token=example', 'https://globemind.top', 'first')
  const b = dshLaunchUrl('/dsh/?token=example', 'https://globemind.top', 'second')
  assert.notEqual(a, b)
  assert.equal(new URL(a, 'https://globemind.top').searchParams.get('token'), 'example')
  for (const value of ['https://other.invalid/dsh/', '/data-assistant', '/dsh-unrelated/', 'javascript:alert(1)', 'https://u:p@globemind.top/dsh/']) {
    assert.throws(() => dshLaunchUrl(value, 'https://globemind.top', 'n'))
  }
})
test('main-site fallback and inaccessible frames are not treated as DSH', () => {
  assert.equal(isDshFrame({ contentWindow: { location: { pathname: '/dsh/' } } }), false)
  assert.equal(isDshFrame({ contentWindow: { __DSH_BOOT__: {}, location: { pathname: '/dsh/' } } }), true)
  assert.equal(isDshFrame({ contentWindow: { __DSH_BOOT__: {}, location: { pathname: '/data-assistant' } } }), false)
  assert.equal(isDshFrame({ get contentWindow() { throw new Error('cross-origin') } }), false)
})
test('one view owns the frame, with bounded recovery and teardown', async () => {
  const bootstrap = await readFile(new URL('../src/bootstrap.js', import.meta.url), 'utf8')
  const view = await readFile(new URL('../src/views/DataAssistant.vue', import.meta.url), 'utf8')
  assert.doesNotMatch(bootstrap, /createDshFrame|__GLOBEMIND_DSH_PRELAUNCH__/)
  assert.match(bootstrap, /void loadApplication\(\)/)
  assert.equal((view.match(/<iframe/g) || []).length, 1)
  assert.match(view, /@load="onFrameLoad"/)
  assert.match(view, /recoveryAttempts < 1/)
  assert.match(view, /onBeforeUnmount[\s\S]*clearFrameTimeout/)
})
