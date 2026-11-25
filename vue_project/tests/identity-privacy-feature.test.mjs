import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { compileScript, compileTemplate, parse } from '@vue/compiler-sfc'

const personalCenter = await readFile(
  new URL('../src/views/user/PersonalCenter.vue', import.meta.url),
  'utf8',
)
const register = await readFile(new URL('../src/views/Register.vue', import.meta.url), 'utf8')

test('registration minimizes optional name and phone collection', () => {
  assert.match(register, /姓名（可选）/)
  assert.match(register, /手机号（可选）/)
  assert.doesNotMatch(register, /id="register-full-name"[^>]*required/)
  assert.doesNotMatch(register, /id="register-phone"[^>]*required/)
  assert.match(register, /创建账号仅要求用户名、邮箱和密码/)
})

test('personal center exposes authenticated export with honest unavailable scopes', () => {
  assert.match(personalCenter, /user\/privacy\/export/)
  assert.match(personalCenter, /data\.complete/)
  assert.match(personalCenter, /未导出或截断的范围/)
})

test('deletion intake requires password and exact acknowledgement without claiming erasure', () => {
  assert.match(personalCenter, /REQUEST ACCOUNT DELETION/)
  assert.match(personalCenter, /autocomplete="current-password"/)
  assert.match(personalCenter, /user\/privacy\/deletion-requests/)
  assert.match(personalCenter, /申请提交后由人工处理/)
  assert.match(personalCenter, /尚未执行/)
  assert.match(personalCenter, /cancelDeletionRequest/)
})

test('privacy settings keep deletion requests and omit the impact preview', () => {
  assert.doesNotMatch(personalCenter, /deletion-impact-plan|账号删除影响预检/)
  assert.match(personalCenter, /删除申请记录/)
})

test('personal center privacy slice compiles as a Vue SFC', () => {
  const parsed = parse(personalCenter, { filename: 'PersonalCenter.vue' })
  assert.deepEqual(parsed.errors, [])
  const script = compileScript(parsed.descriptor, { id: 'identity-privacy-feature' })
  const template = compileTemplate({
    id: 'identity-privacy-feature',
    filename: 'PersonalCenter.vue',
    source: parsed.descriptor.template.content,
    compilerOptions: { bindingMetadata: script.bindings },
  })
  assert.deepEqual(template.errors, [])
})
