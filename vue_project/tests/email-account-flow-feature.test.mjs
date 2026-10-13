import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function source(path) {
  return readFile(new URL(path, import.meta.url), 'utf8')
}

test('registration routes users into the email verification flow', async () => {
  const register = await source('../src/views/Register.vue')
  const router = await source('../src/router/index.js')

  assert.match(register, /path: '\/verify-email'/)
  assert.match(register, /query: \{ email: form\.email \}/)
  assert.match(router, /path: '\/verify-email'/)
  assert.match(router, /VerifyEmail\.vue/)
})

test('verification page consumes tokens with POST and supports safe resend', async () => {
  const verify = await source('../src/views/VerifyEmail.vue')

  assert.match(verify, /\/auth\/verify-email/)
  assert.match(verify, /method: 'POST'/)
  assert.match(verify, /body: JSON\.stringify\(\{ token \}\)/)
  assert.match(verify, /\/auth\/resend-verification/)
  assert.match(verify, /若该邮箱存在待验证账号/)
  assert.match(verify, /autocomplete="email"/)
})

test('login exposes recovery only for the unverified-email response code', async () => {
  const login = await source('../src/views/Login.vue')

  assert.match(login, /EMAIL_NOT_VERIFIED/)
  assert.match(login, /needsEmailVerification/)
  assert.match(login, /验证邮箱或重新发送验证邮件/)
})

test('profile email changes surface their new verification state', async () => {
  const profile = await source('../src/views/user/PersonalCenter.vue')

  assert.match(profile, /data\.email_verified !== false/)
  assert.match(profile, /更换邮箱后需重新验证/)
  assert.match(profile, /path: '\/verify-email'/)
})
