<script setup>
import { defineAsyncComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import LoginModal from '@/components/LoginModal.vue'
import { assistantErrorText } from '@/features/assistant/api.js'
import { syncPendingCapabilities } from '@/bootstrap.js'
import { useDisplayPreferences } from '@/composables/useDisplayPreferences.js'
import { dshLaunchUrl, isDshFrame } from '@/utils/dshFrame.js'
import { getToken, clearAuth, getAuthChangedEventName } from '@/utils/auth.js'

const ImageStudio = defineAsyncComponent(() => import('@/features/assistant/ImageStudio.vue'))

const props = defineProps({
  embedded: { type: Boolean, default: false },
  contextKey: { type: [Number, String], default: 0 },
})
const emit = defineEmits(['page-action'])
const showImageStudio = ref(false), imageInitial = ref(null)
const imageDelivery = ref('')
const dshFrame = ref(null)
const { fontSize } = useDisplayPreferences()

function applyFrameFontSize() {
  const frame = dshFrame.value
  if (isDshFrame(frame)) frame.contentDocument.documentElement.style.zoom = String(fontSize.value / 16)
}
watch(fontSize, applyFrameFontSize)
const bridgeNonce = ref('')
const bridgeStatus = ref('')
const bridgeFailed = ref(false)
const sessionId = ref('')
const bridge = { timer: 0, context: null, requestId: '', seen: new Set(), ready: false, imageRequests: new Map() }
const frameUrl = ref(''), loading = ref(true), error = ref('')
const loginRequired = ref(false), showLoginModal = ref(false)
const capabilitySyncFailed = ref(false)
let generation = 0
let frameTimeout = 0
let launchController
let syncController

async function requestDshLaunch(token, signal) {
  const response = await fetch('/api/assistant/dsh-launch', {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
    signal,
  })
  if (response.status === 401 && !signal.aborted && getToken() === token) {
    clearAuth()
    throw new Error('登录状态已失效，请重新登录。')
  }
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || !payload.url) throw new Error(payload.detail || '数据助手暂时不可用')
  return payload
}
const BRIDGE_CHANNEL = 'globemind-page-v1'
function bridgePost(type, payload = {}) {
  dshFrame.value?.contentWindow?.postMessage({ channel: BRIDGE_CHANNEL, nonce: bridgeNonce.value, type, ...payload }, location.origin)
}
function connectBridge() {
  window.clearInterval(bridge.timer)
  const deadline = Date.now() + 30000
  bridgePost('connect')
  bridge.timer = window.setInterval(() => {
    if (Date.now() >= deadline) {
      window.clearInterval(bridge.timer)
      bridgeFailed.value = true
      bridgeStatus.value = '页面联动连接超时，请重新连接'
    } else bridgePost('connect')
  }, 1000)
}
function onBridgeMessage(event) {
  const data = event.data
  if (event.origin !== location.origin || event.source !== dshFrame.value?.contentWindow
      || data?.channel !== BRIDGE_CHANNEL) return
  if (data.type === 'image-studio' && !loading.value && isDshFrame(dshFrame.value)) {
    showImageStudio.value = true
    return
  }
  if (data.type === 'available') {
    if (isDshFrame(dshFrame.value)) {
      clearFrameTimeout()
      loading.value = false
    }
    bridgePost('connect')
    return
  }
  if (data.nonce !== bridgeNonce.value) return
  if (data.type === 'ready') {
    bridge.ready = true
    for (const request of bridge.imageRequests.values()) bridgePost('image-job', request)
    window.clearInterval(bridge.timer)
    bridgeFailed.value = false
    sessionId.value = data.sessionId || ''
    bridgeStatus.value = '助手已连接，检索会同步到本页'
    if (bridge.context) bridgePost('context', { requestId: bridge.requestId, prompt: bridge.context.prompt })
  } else if (data.type === 'image-job-ack') {
    if (!bridge.imageRequests.has(data.requestId)) return
    bridge.imageRequests.delete(data.requestId)
    imageDelivery.value = data.ok ? '图片任务已发送到助手对话' : '发送到对话失败，可在图片归档中重新发送'
  } else if (data.type === 'session') {
    sessionId.value = data.sessionId
  } else if (data.type === 'context-ack' && data.requestId === bridge.requestId) {
    if (data.ok) {
      bridge.context = null
      try { sessionStorage.removeItem('data_assistant_autorun_context_v1') } catch { /* Keep the active bridge usable. */ }
    }
    bridgeFailed.value = !data.ok
    bridgeStatus.value = data.ok ? '当前页面材料已发送给助手' : '页面材料发送失败，请确认工作区可用后重新连接'
  } else if (data.type === 'search' && data.sessionId === sessionId.value
      && typeof data.callId === 'string' && typeof data.query === 'string'
      && data.query.trim() && data.query.length <= 500 && !bridge.seen.has(data.callId)) {
    bridge.seen.add(data.callId)
    bridgeStatus.value = `助手正在检索：${data.query}`
    emit('page-action', { type: 'search', tool: 'globemind_search', query: data.query, input: data.input, callId: data.callId })
  } else if (data.type === 'search-result' && data.sessionId === sessionId.value && bridge.seen.has(data.callId)) {
    bridgeStatus.value = data.failed ? '助手检索失败，请查看对话中的错误说明' : '助手检索已完成，关键词已同步到本页'
  }
}
function deliverImage(job) {
  const existing = [...bridge.imageRequests.values()].find(request => request.jobId === job.id)
  const request = existing || { jobId: job.id, requestId: crypto.randomUUID() }
  bridge.imageRequests.set(request.requestId, request)
  if (bridge.ready) bridgePost('image-job', request)
  imageDelivery.value = bridge.ready ? '正在发送图片任务到助手对话…' : '正在连接助手，连接就绪后自动发送图片任务'
}
function loadPageContext() {
  if (!props.embedded) return
  try {
    const context = JSON.parse(sessionStorage.getItem('data_assistant_autorun_context_v1') || 'null')
    if (typeof context?.prompt === 'string' && context.prompt.length <= 32000) {
      bridge.context = context
      bridge.requestId = crypto.randomUUID()
      if (bridge.ready) bridgePost('context', { requestId: bridge.requestId, prompt: context.prompt })
    }
  } catch { bridgeStatus.value = '当前页面材料读取失败' }
}
function clearFrameTimeout() {
  window.clearTimeout(frameTimeout)
  frameTimeout = 0
}
function failFrame(message) {
  clearFrameTimeout()
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
  applyFrameFontSize()
  if (!bridge.ready) connectBridge()
}
function onFrameError() {
  if (frameUrl.value) failFrame('助手连接中断，请重新连接。')
}
async function syncCapabilities(token) {
  syncController?.abort()
  const controller = new AbortController()
  syncController = controller
  const timeout = window.setTimeout(() => controller.abort(), 15000)
  capabilitySyncFailed.value = false
  try {
    await syncPendingCapabilities(token, controller.signal)
  } catch {
    if (syncController === controller && getToken() === token) capabilitySyncFailed.value = true
  } finally {
    window.clearTimeout(timeout)
  }
}
async function loadDsh() {
  const current = ++generation
  launchController?.abort()
  syncController?.abort()
  syncController = undefined
  capabilitySyncFailed.value = false
  bridge.ready = false
  clearFrameTimeout()
  window.clearInterval(bridge.timer)
  bridgeFailed.value = false
  bridgeStatus.value = props.embedded ? '正在连接页面联动…' : ''
  bridgeNonce.value = crypto.randomUUID()
  sessionId.value = ''
  bridge.seen.clear()
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
  const controller = new AbortController()
  launchController = controller
  const timeout = window.setTimeout(() => controller.abort(), 30000)
  const headersTimeout = window.setTimeout(() => {
    if (current === generation && !frameUrl.value) error.value = '正在启动助手工作区，请稍候…'
  }, 4000)
  void syncCapabilities(token)
  try {
    const payload = await requestDshLaunch(token, controller.signal)
    if (current !== generation) return
    error.value = '正在加载对话界面…'
    frameUrl.value = dshLaunchUrl(payload.url, location.origin, `${Date.now()}-${current}`)
    frameTimeout = window.setTimeout(() => {
      if (current === generation) failFrame('助手加载超时，请重新连接。')
    }, 25000)
  } catch (e) {
    if (current !== generation) return
    loading.value = false
    loginRequired.value = !getToken()
    error.value = controller.signal.aborted ? '助手连接超时，请重新连接。' : assistantErrorText(e, '连接数据助手失败')
  } finally {
    window.clearTimeout(timeout)
    window.clearTimeout(headersTimeout)
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
  imageDelivery.value = ''
  bridge.imageRequests.clear()
  bridge.ready = false
  showImageStudio.value = false
  imageInitial.value = null
  if (getToken()) showLoginModal.value = false
  void loadDsh()
}
onMounted(() => {
  loadPageContext()
  try {
    const initial = JSON.parse(sessionStorage.getItem('assistant_image_edit') || 'null')
    if (initial) { imageInitial.value = initial; showImageStudio.value = true; sessionStorage.removeItem('assistant_image_edit') }
  } catch { /* Ignore invalid handoff data. */ }
  window.addEventListener('message', onBridgeMessage)
  window.addEventListener(getAuthChangedEventName(), authChanged)
  void loadDsh()
})
watch(() => props.contextKey, loadPageContext)
onBeforeUnmount(() => {
  window.clearInterval(bridge.timer)
  window.removeEventListener('message', onBridgeMessage)
  generation += 1
  launchController?.abort()
  syncController?.abort()
  syncController = undefined
  clearFrameTimeout()
  window.removeEventListener(getAuthChangedEventName(), authChanged)
})
</script>

<template>
  <!-- The site owns the top navigation; DSH owns all assistant navigation. -->
  <main class="assistant-page" :class="{ 'assistant-page--embedded': props.embedded }" aria-label="数据助手">
    <p v-if="props.embedded && bridgeStatus" class="bridge-status" role="status">
      {{ bridgeStatus }}
      <button v-if="bridgeFailed" type="button" @click="reconnect">重新连接</button>
    </p>
    <div v-if="frameUrl && !loading && (imageDelivery || capabilitySyncFailed)" class="assistant-notices">
      <span v-if="imageDelivery" role="status">{{ imageDelivery }}</span>
      <span v-if="capabilitySyncFailed" role="status">技能设置同步失败</span>
      <button v-if="capabilitySyncFailed" type="button" @click="syncCapabilities(getToken())">重试同步</button>
    </div>
    <ImageStudio v-if="showImageStudio" :initial="imageInitial" :session-id="sessionId" @close="showImageStudio = false; imageInitial = null" @submitted="deliverImage" />
    <iframe
      ref="dshFrame"
      v-if="frameUrl"
      :key="frameUrl"
      class="dsh-frame"
      :inert="loading"
      :aria-hidden="loading"
      data-globemind-assistant
      :data-globemind-drawer="props.embedded ? '' : undefined"
      :src="frameUrl"
      title="GlobeMind 数据助手"
      allow="clipboard-read; clipboard-write"
      @load="onFrameLoad"
      @error="onFrameError"
    />
    <div v-if="!frameUrl || loading" class="assistant-status" role="status" aria-live="polite" :aria-busy="loading">
      <span v-if="loading" class="spinner" aria-hidden="true" />
      <p>{{ error || '正在连接数据助手…' }}</p>
      <button v-if="!loading" type="button" class="reconnect" @click="reconnect">
        {{ loginRequired ? '登录' : '重新连接' }}
      </button>
    </div>
    <LoginModal :visible="showLoginModal" @close="showLoginModal = false" />
  </main>
</template>

<style scoped>
.assistant-page {
  display: flex;
  flex-direction: column;
  position: relative;
  width: 100%;
  height: calc(100vh - 64px);
  height: calc(100dvh - 64px);
  min-height: 0;
  margin-top: 64px;
  overflow: hidden;
  background: #f6f8fb;
}
.assistant-notices { display: flex; flex: none; flex-wrap: wrap; align-items: center; gap: 6px 12px; padding: 5px 10px; font-size: 12px; color: #345579; background: #edf4ff; }
.assistant-notices button { border: 0; background: transparent; color: #1d4ed8; cursor: pointer; text-decoration: underline; }
.bridge-status { margin: 0; padding: 5px 10px; font-size: 12px; color: #345579; background: #edf4ff; }
.assistant-page--embedded .dsh-frame { flex: 1 1 0; height: 0; }
.dsh-frame {
  flex: 1;
  min-height: 0;
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
}
.assistant-status {
  position: absolute;
  inset: 0;
  background: #f6f8fb;
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
  min-width: 0;
  height: 100%;
  margin-top: 0;
}
</style>
