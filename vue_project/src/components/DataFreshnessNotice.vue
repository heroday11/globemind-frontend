<script setup>
import { computed, onMounted, ref } from 'vue'
import { AlertTriangle, X } from 'lucide-vue-next'
import { API_PREFIX, resolveApiOrigin } from '@/config/api.js'

const dismissed = ref(false)
const checks = ref({})

const staleChecks = computed(() => Object.values(checks.value).filter(
  (check) => check?.metrics?.freshness_status === 'stale' || check?.metrics?.freshness_status === 'missing',
))

const latestDates = computed(() => {
  const values = staleChecks.value.flatMap((check) => Object.entries(check.metrics || {}))
    .filter(([key, value]) => (key.endsWith('_at') || key.endsWith('_date')) && value)
    .map(([, value]) => new Date(value))
    .filter((value) => !Number.isNaN(value.getTime()))
  if (!values.length) return ''
  const latest = new Date(Math.max(...values.map((value) => value.getTime())))
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(latest)
})

async function loadStatus() {
  try {
    const response = await fetch(`${resolveApiOrigin()}${API_PREFIX}/health/features`, { headers: { Accept: 'application/json' } })
    const payload = await response.json()
    checks.value = payload?.checks || {}
  } catch {
    // A status banner must never block the product when the health endpoint is unreachable.
  }
}

onMounted(() => window.setTimeout(loadStatus, 1200))
</script>

<template>
  <aside v-if="!dismissed && staleChecks.length" class="freshness-notice" role="status" aria-live="polite">
    <AlertTriangle :size="17" />
    <span>
      当前部分情报数据已超过更新时限<span v-if="latestDates">，数据截止 {{ latestDates }}</span>。可用于历史检索，不建议作为实时结论。
    </span>
    <button type="button" aria-label="关闭数据状态提示" @click="dismissed = true"><X :size="16" /></button>
  </aside>
</template>

<style scoped>
.freshness-notice { position: fixed; z-index: 95; top: 72px; left: 50%; width: min(760px, calc(100vw - 28px)); transform: translateX(-50%); display: flex; align-items: center; gap: 10px; padding: 7px 8px 7px 14px; border: 1px solid rgba(217, 119, 6, .28); border-radius: 12px; color: #78350f; background: rgba(255, 251, 235, .92); box-shadow: 0 12px 32px rgba(120, 53, 15, .14); -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px); font-size: 13px; font-weight: 700; line-height: 1.45; }
.freshness-notice > svg { flex: 0 0 auto; color: #d97706; }
.freshness-notice span { flex: 1; }
.freshness-notice button { flex: 0 0 44px; width: 44px; height: 44px; display: grid; place-items: center; border: 0; border-radius: 8px; color: #92400e; background: rgba(245, 158, 11, .12); cursor: pointer; }
@media (max-width: 720px) { .freshness-notice { top: 68px; align-items: flex-start; } }
</style>
