<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

import { clearAuth, getAuthChangedEventName, getToken } from '@/utils/auth.js'

const props = defineProps({
  embedded: { type: Boolean, default: false },
  pageSkill: { type: Object, default: () => ({}) },
})

defineEmits(['page-action'])

const frameUrl = ref('')
const loading = ref(true)
const error = ref('')
let requestGeneration = 0

function requestLogin() {
  window.dispatchEvent(new CustomEvent('showLoginModal'))
}

async function loadDsh() {
  const generation = ++requestGeneration
  frameUrl.value = ''
  error.value = ''
  loading.value = true
  const token = getToken()
  if (!token) {
    error.value = '请先登录后使用数据助手。'
    loading.value = false
    return
  }
  try {
    const response = await fetch('/api/assistant/dsh-launch', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    const payload = await response.json().catch(() => ({}))
    if (response.status === 401) {
      if (getToken() === token) clearAuth()
      requestLogin()
      throw new Error('登录状态已失效，请重新登录后连接数据助手。')
    }
    if (!response.ok) throw new Error(payload.detail || 'DSH 数据助手暂时不可用')
    if (generation === requestGeneration) frameUrl.value = payload.url
  } catch (cause) {
    if (generation === requestGeneration) {
      error.value = cause instanceof Error ? cause.message : 'DSH 数据助手暂时不可用'
    }
  } finally {
    if (generation === requestGeneration) loading.value = false
  }
}

function reconnect() {
  if (!getToken()) {
    error.value = '请先登录后使用数据助手。'
    requestLogin()
    return
  }
  void loadDsh()
}

onMounted(() => {
  loadDsh()
  window.addEventListener(getAuthChangedEventName(), loadDsh)
})

onBeforeUnmount(() => {
  requestGeneration += 1
  window.removeEventListener(getAuthChangedEventName(), loadDsh)
})
</script>

<template>
  <main class="dsh-page" :class="{ 'dsh-page--embedded': props.embedded }">
    <iframe
      v-if="frameUrl"
      class="dsh-frame"
      :src="frameUrl"
      title="GlobeMind Data Assistant"
      allow="clipboard-read; clipboard-write"
    />
    <section v-else class="dsh-state" aria-live="polite">
      <span v-if="loading" class="dsh-spinner" aria-hidden="true" />
      <p>{{ loading ? '正在连接数据助手...' : error }}</p>
      <button v-if="!loading && error" type="button" @click="reconnect">重新连接</button>
    </section>
  </main>
</template>

<style scoped>
.dsh-page {
  width: 100%;
  height: calc(100dvh - 64px);
  margin-top: 64px;
  overflow: hidden;
  background: #fff;
}

.dsh-page--embedded {
  height: 100%;
  min-height: 620px;
  margin-top: 0;
}

.dsh-frame {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
  background: #fff;
}

.dsh-state {
  height: 100%;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 16px;
  color: #475569;
  font-size: 14px;
}

.dsh-state p { margin: 0; }

.dsh-state button {
  min-height: 36px;
  padding: 0 16px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
  color: #0f172a;
  cursor: pointer;
}

.dsh-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #e2e8f0;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: dsh-spin 0.7s linear infinite;
}

@keyframes dsh-spin { to { transform: rotate(360deg); } }
</style>
