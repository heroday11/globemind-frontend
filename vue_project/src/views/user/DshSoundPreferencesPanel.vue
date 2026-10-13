<script setup>
import { onMounted, ref } from 'vue'
import { API_PREFIX } from '@/config/api'
import { getToken } from '@/utils/auth'

const enabled = ref(true)
const loading = ref(true)
const saving = ref(false)
const error = ref('')

function headers() {
  return { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` }
}

async function load() {
  loading.value = true
  try {
    const response = await fetch(`${API_PREFIX}/user/preferences`, { headers: headers() })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.detail || '无法读取数据助手提示音设置')
    enabled.value = payload.data?.completion_sound !== false
  } catch (reason) { error.value = reason?.message || '无法读取数据助手提示音设置' }
  finally { loading.value = false }
}

async function update(value) {
  const previous = enabled.value
  enabled.value = value
  saving.value = true
  error.value = ''
  try {
    const response = await fetch(`${API_PREFIX}/user/preferences`, { method: 'PUT', headers: headers(), body: JSON.stringify({ completion_sound: value }) })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.detail || '提示音设置保存失败')
  } catch (reason) { enabled.value = previous; error.value = reason?.message || '提示音设置保存失败' }
  finally { saving.value = false }
}

onMounted(load)
</script>

<template>
  <section class="dsh-sound-panel" aria-labelledby="dsh-sound-title">
    <div class="dsh-sound-copy"><span class="dsh-sound-kicker">DATA ASSISTANT</span><h2 id="dsh-sound-title">任务完成提示音</h2><p>数据助手正常完成一次任务后播放短提示音，取消或失败时不会播放。</p></div>
    <label class="dsh-sound-toggle"><span>完成时播放清脆提示音</span><input type="checkbox" :checked="enabled" :disabled="loading || saving" @change="update($event.target.checked)"><span class="dsh-sound-switch" aria-hidden="true" /></label>
    <p v-if="error" class="dsh-sound-error" role="alert">{{ error }}</p>
  </section>
</template>

<style scoped>
.dsh-sound-panel { margin-top: 20px; padding: 22px 24px; border: 1px solid #e4e8f2; border-radius: 12px; background: #fff; }
.dsh-sound-copy { max-width: 680px; }.dsh-sound-kicker { color: #5b72df; font-size: 11px; font-weight: 800; letter-spacing: .08em; }.dsh-sound-copy h2 { margin: 7px 0 6px; color: #1f2a44; font-size: 18px; }.dsh-sound-copy p { margin: 0; color: #74809b; font-size: 13px; line-height: 1.7; }
.dsh-sound-toggle { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-top: 18px; color: #33415f; font-size: 14px; font-weight: 600; cursor: pointer; }.dsh-sound-toggle input { position: absolute; opacity: 0; pointer-events: none; }.dsh-sound-switch { position: relative; width: 44px; height: 24px; flex: 0 0 auto; border-radius: 99px; background: #cbd2e2; transition: background .2s ease; }.dsh-sound-switch::after { content: ''; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px #17255433; transition: transform .2s ease; }.dsh-sound-toggle input:checked + .dsh-sound-switch { background: #5b72df; }.dsh-sound-toggle input:checked + .dsh-sound-switch::after { transform: translateX(20px); }.dsh-sound-toggle input:focus-visible + .dsh-sound-switch { outline: 3px solid #b9c5ff; outline-offset: 2px; }.dsh-sound-error { margin: 12px 0 0; color: #b42318; font-size: 13px; }
</style>
