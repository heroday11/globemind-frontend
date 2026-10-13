<script setup>
import { onMounted, ref } from 'vue'
import { API_PREFIX } from '@/config/api'
import { getToken } from '@/utils/auth'

const enabled = ref(false)
const loading = ref(true)
const saving = ref(false)
const error = ref('')
function headers() { return { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` } }
async function load() {
  loading.value = true
  try {
    const response = await fetch(`${API_PREFIX}/user/preferences`, { headers: headers() })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.detail || '无法读取邮件投递设置')
    enabled.value = payload.data?.auto_send_reports_email === true
  } catch (reason) { error.value = reason?.message || '无法读取邮件投递设置' }
  finally { loading.value = false }
}
async function update(value) {
  const previous = enabled.value
  enabled.value = value; saving.value = true; error.value = ''
  try {
    const response = await fetch(`${API_PREFIX}/user/preferences`, { method: 'PUT', headers: headers(), body: JSON.stringify({ auto_send_reports_email: value }) })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.detail || '邮件投递设置保存失败')
  } catch (reason) { enabled.value = previous; error.value = reason?.message || '邮件投递设置保存失败' }
  finally { saving.value = false }
}
onMounted(load)
</script>

<template>
  <section class="dsh-email-panel" aria-labelledby="dsh-email-title">
    <div><span class="dsh-email-kicker">REPORT DELIVERY</span><h2 id="dsh-email-title">报告自动发送到邮箱</h2><p>开启后，定时简报和自动生成的报告会发送到你的已验证邮箱。单个简报任务可以单独覆盖这个设置。</p></div>
    <label class="dsh-email-toggle"><span>自动发送生成的报告</span><input type="checkbox" :checked="enabled" :disabled="loading || saving" @change="update($event.target.checked)"><span class="dsh-email-switch" aria-hidden="true" /></label>
    <p v-if="error" class="dsh-email-error" role="alert">{{ error }}</p>
  </section>
</template>

<style scoped>
.dsh-email-panel { margin-top: 20px; padding: 22px 24px; border: 1px solid #e4e8f2; border-radius: 12px; background: #fff; }.dsh-email-kicker { color: #5b72df; font-size: 11px; font-weight: 800; letter-spacing: .08em; }.dsh-email-panel h2 { margin: 7px 0 6px; color: #1f2a44; font-size: 18px; }.dsh-email-panel p { margin: 0; color: #74809b; font-size: 13px; line-height: 1.7; }.dsh-email-toggle { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-top: 18px; color: #33415f; font-size: 14px; font-weight: 600; cursor: pointer; }.dsh-email-toggle input { position: absolute; opacity: 0; pointer-events: none; }.dsh-email-switch { position: relative; width: 44px; height: 24px; flex: 0 0 auto; border-radius: 99px; background: #cbd2e2; transition: background .2s ease; }.dsh-email-switch::after { content: ''; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px #17255433; transition: transform .2s ease; }.dsh-email-toggle input:checked + .dsh-email-switch { background: #5b72df; }.dsh-email-toggle input:checked + .dsh-email-switch::after { transform: translateX(20px); }.dsh-email-toggle input:focus-visible + .dsh-email-switch { outline: 3px solid #b9c5ff; outline-offset: 2px; }.dsh-email-error { margin-top: 12px !important; color: #b42318 !important; }
</style>
