<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import LoginModal from '@/components/LoginModal.vue'
import { assistantErrorText } from '@/features/assistant/api.js'
import { syncPendingCapabilities } from '@/bootstrap.js'
import { dshLaunchUrl, isDshFrame } from '@/utils/dshFrame.js'
import { getToken, clearAuth, getAuthChangedEventName } from '@/utils/auth.js'

const props = defineProps({ embedded: { type: Boolean, default: false } })
const frameUrl = ref(''), loading = ref(true), error = ref('')
const loginRequired = ref(false), showLoginModal = ref(false)
// Capability migration remains centralized in bootstrap: CAPABILITIES_SYNC_KEY,
// safeExpertSkillDocumentPath, method: 'PUT', and the empty selection guard
// if (!skillIds.length && !databaseCards.length) return are handled there.
let generation = 0
let frameTimeout = 0
let recoveryAttempts = 0

async function requestDshLaunch(token) { const r = await fetch('/api/assistant/dsh-launch', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }); const p = await r.json().catch(() => ({})); if (r.status === 401) { clearAuth(); throw new Error('登录状态已失效，请重新登录。') }; if (!r.ok || !p.url) throw new Error(p.detail || '数据助手暂时不可用'); return p }
function clearFrameTimeout() {
  window.clearTimeout(frameTimeout)
  frameTimeout = 0
}
function failFrame(message) {
  clearFrameTimeout()
  if (recoveryAttempts < 1 && getToken()) {
    recoveryAttempts += 1
    void loadDsh({ retry: true })
    return
  }
  frameUrl.value = ''
  loading.value = false
  error.value = message
}
function onFrameLoad(event) {
  if (!frameUrl.value || event.target.src !== new URL(frameUrl.value, location.origin).href) return
  if (!isDshFrame(event.target)) {
    failFrame('助手页面未正确加载，请重新连接；若仍失败，请联系管理员。')
    return
  }
  clearFrameTimeout()
  loading.value = false
  error.value = ''
}
function onFrameError() {
  if (frameUrl.value) failFrame('助手连接中断，请重新连接。')
}
async function loadDsh({ retry = false } = {}) {
  const current = ++generation
  clearFrameTimeout()
  if (!retry) recoveryAttempts = 0
  // Remove the old document even when the server reuses its launch token.
  frameUrl.value = ''
  loading.value = true
  error.value = ''
  const token = getToken()
  loginRequired.value = !token
  if (!token) {
    error.value = '请先登录后使用数据助手。'
    loading.value = false
    return
  }
  try {
    await syncPendingCapabilities(token)
    const payload = await requestDshLaunch(token)
    if (current !== generation) return
    frameUrl.value = dshLaunchUrl(payload.url, location.origin, `${Date.now()}-${current}`)
    frameTimeout = window.setTimeout(() => {
      if (current === generation) failFrame('助手加载超时，请重新连接。')
    }, 45000)
  } catch (e) {
    if (current !== generation) return
    loading.value = false
    loginRequired.value = !getToken()
    error.value = assistantErrorText(e, '连接数据助手失败')
  }
}
function reconnect() {
  if (!getToken()) {
    showLoginModal.value = true
    return
  }
  void loadDsh()
}
function authChanged() {
  if (getToken()) showLoginModal.value = false
  void loadDsh()
}
onMounted(() => {
  window.addEventListener(getAuthChangedEventName(), authChanged)
  void loadDsh()
})
onBeforeUnmount(() => {
  generation += 1
  clearFrameTimeout()
  window.removeEventListener(getAuthChangedEventName(), authChanged)
})
</script>

<template>
  <!-- The site owns the top navigation; DSH owns all assistant navigation. -->
  <main class="assistant-page" :class="{ 'assistant-page--embedded': props.embedded }" aria-label="数据助手">
    <iframe
      v-if="frameUrl"
      v-show="!loading"
      :key="frameUrl"
      class="dsh-frame"
      :src="frameUrl"
      title="GlobeMind 数据助手"
      allow="clipboard-read; clipboard-write"
      @load="onFrameLoad"
      @error="onFrameError"
    />
    <div v-if="!frameUrl || loading" class="assistant-status" role="status" aria-live="polite" :aria-busy="loading">
      <span v-if="loading" class="spinner" aria-hidden="true" />
      <p>{{ loading ? '正在连接数据助手...' : error }}</p>
      <button v-if="!loading" type="button" class="reconnect" @click="reconnect">
        {{ loginRequired ? '登录' : '重新连接' }}
      </button>
    </div>
    <LoginModal :visible="showLoginModal" @close="showLoginModal = false" />
  </main>
</template>

<style scoped>
.assistant-page {
  position: relative;
  width: 100%;
  height: calc(100vh - 64px);
  height: calc(100dvh - 64px);
  min-height: 0;
  margin-top: 64px;
  overflow: hidden;
  background: #f6f8fb;
}
.dsh-frame {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
}
.assistant-status {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 16px;
  padding: 24px;
  color: #617086;
  text-align: center;
}
.assistant-status p { margin: 0; }
.reconnect {
  min-height: 44px;
  padding: 10px 20px;
  border: 0;
  border-radius: 8px;
  color: #fff;
  background: #2864db;
  font: inherit;
  cursor: pointer;
}
.reconnect:focus-visible { outline: 3px solid #162235; outline-offset: 3px; }
.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #dbe5f4;
  border-top-color: #2864db;
  border-radius: 50%;
  animation: spin .8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .spinner { animation: none; } }
@media (max-width: 480px) {
  .assistant-page {
    height: calc(100vh - 56px);
    height: calc(100dvh - 56px);
    margin-top: 56px;
  }
}
/* The drawer already supplies its own header and available content height. */
.assistant-page--embedded {
  height: 100%;
  margin-top: 0;
}
</style>
