<script setup>
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppNav from './components/appNav.vue'
import NewUserGuide from './components/NewUserGuide.vue'
import DataFreshnessNotice from './components/DataFreshnessNotice.vue'
import GuestAccessBanner from './components/GuestAccessBanner.vue'
import { createOperationsHeartbeat } from './features/operations/index.js'
import { routePreloaders } from './router/routePreloaders.js'

const route = useRoute()
const isFinancialTerminal = computed(() => route.path === '/financial-terminal')
const operationsHeartbeat = createOperationsHeartbeat({
  getPath: () => route.path || '/',
})
const HEARTBEAT_START_DELAY_MS = 8_000
let heartbeatStartTimer = null

onMounted(() => {
  heartbeatStartTimer = window.setTimeout(() => {
    heartbeatStartTimer = null
    operationsHeartbeat.start()
  }, HEARTBEAT_START_DELAY_MS)
})

onUnmounted(() => {
  if (heartbeatStartTimer !== null) {
    window.clearTimeout(heartbeatStartTimer)
    heartbeatStartTimer = null
  }
  operationsHeartbeat.stop()
})

watch(() => route.path, () => {
  operationsHeartbeat.notifyRouteChange()
})
</script>

<template>
  <div class="app-shell" :class="{ 'app--financial-terminal': isFinancialTerminal }">
    <appNav :route-preloaders="routePreloaders" />
    <NewUserGuide />
    <DataFreshnessNotice />
    <GuestAccessBanner />
    <router-view v-slot="{ Component, route }">
      <keep-alive :include="['appHome']">
        <component :is="Component" :key="route.fullPath" />
      </keep-alive>
    </router-view>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  width: 100vw;
  overflow-x: hidden;
  background-color: #f6f8ff;
}

.app-shell.app--financial-terminal {
  background-color: #0b0e11;
}

.main-content {
  padding-top: 0px; /* 为固定导航栏预留空间 */
  min-height: calc(100vh - 60px);
}
</style>

<!-- 无 scoped：真正作用于 html/body，保证主站浅色底与浅色 color-scheme，不被单页样式拖死 -->
<style>
html {
  margin: 0;
  padding: 0;
  width: 100%;
  color-scheme: light;
  background-color: #f6f8ff;
}

body {
  margin: 0;
  padding: 0;
  width: 100%;
  overflow-x: hidden;
  color-scheme: light;
  background-color: #f6f8ff;
}

.freshness-notice ~ .home {
  padding-top: 150px;
}

@media (max-width: 760px) {
  .freshness-notice + .guest-access {
    margin-top: 150px;
  }

  .freshness-notice ~ .home {
    padding-top: 154px;
  }

  .freshness-notice + .guest-access + .home {
    padding-top: 16px;
  }
}
</style>
