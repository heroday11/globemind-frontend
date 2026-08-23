<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

function handleMessage(e) {
  if (e.origin !== window.location.origin) return
  if (e.data?.type === 'storeAndNavigate' && e.data?.path) {
    if (e.data.assistantContext && typeof e.data.assistantContext === 'object') {
      sessionStorage.setItem('data_assistant_autorun_context_v1', JSON.stringify(e.data.assistantContext))
    } else if (e.data.alertMsg) {
      sessionStorage.setItem('data_assistant_alert_msg', e.data.alertMsg)
    } else {
      return
    }
    sessionStorage.removeItem('data_assistant_alert_ready')
    // 停留 2s 展示加载动效
    setTimeout(() => {
      router.push(e.data.path)
    }, 2000)
  }
  if (e.data?.type === 'alertReady') {
    sessionStorage.setItem('data_assistant_alert_ready', '1')
  }
}

onMounted(() => window.addEventListener('message', handleMessage))
onUnmounted(() => window.removeEventListener('message', handleMessage))

/** 开发时可在 vue_project/.env.development 设置 VITE_FIN_TERMINAL_URL=http://127.0.0.1:5175/ 指向 React dev server */
const iframeSrc = computed(() => {
  const dev = import.meta.env.VITE_FIN_TERMINAL_URL
  if (dev) return dev
  const b = import.meta.env.BASE_URL || '/'
  const prefix = b.endsWith('/') ? b : `${b}/`
  return `${prefix}fin-terminal/index.html`
})
</script>

<template>
  <div class="financial-terminal-shell" data-tour="financial-terminal">
    <iframe :src="iframeSrc" class="financial-terminal-iframe" title="金融终端" />
  </div>
</template>

<style scoped>
/* 与 appNav.vue 固定导航栏高度一致（.header height: 64px），避免底部露出主站浅色底 */
.financial-terminal-shell {
  margin-top: 64px;
  width: 100%;
  height: calc(100vh - 64px);
  min-height: 320px;
  box-sizing: border-box;
  background: #0b0e11;
  overflow: hidden;
}

.financial-terminal-iframe {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
  vertical-align: top;
}
</style>
