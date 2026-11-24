<script setup>
import { computed, ref, watch } from 'vue'
import { ElDialog } from 'element-plus'
import 'element-plus/es/components/dialog/style/css'
import 'element-plus/es/components/button/style/css'
import { API_PREFIX } from '@/config/api'
import { getToken } from '@/utils/auth'

const props = defineProps({
  userId: { type: Number, required: true },
  username: { type: String, default: '' },
  operation: { type: String, default: '' },
  admin: Boolean,
})
const emit = defineEmits(['close', 'saved', 'select'])
const amount = ref('')
const reason = ref('')
const planId = ref('')
const days = ref('')
const plans = ref([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const adjusting = computed(() => props.operation === 'adjust')
const choosing = computed(() => props.operation === 'choose')
const title = computed(() => {
  if (choosing.value) return '额度操作'
  if (adjusting.value) return props.admin ? '调整额度' : '调整我的额度'
  return '开通套餐'
})

async function request(path, body, signal) {
  const response = await fetch(`${API_PREFIX}/billing${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
    body: body && JSON.stringify(body),
    cache: 'no-store',
    signal,
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(typeof payload.detail === 'string' ? payload.detail : '请检查输入后重试')
  }
  return payload
}

watch(() => props.operation, async (operation, _previous, onCleanup) => {
  amount.value = ''
  reason.value = ''
  planId.value = ''
  days.value = ''
  plans.value = []
  error.value = ''
  loading.value = operation === 'subscribe'
  if (!loading.value) return
  const controller = new AbortController()
  onCleanup(() => controller.abort())
  try {
    const payload = await request('/plans', undefined, controller.signal)
    plans.value = payload.filter((plan) => plan.active)
  } catch (failure) {
    if (!controller.signal.aborted) error.value = failure.message
  } finally {
    if (!controller.signal.aborted) loading.value = false
  }
}, { immediate: true })

async function submit() {
  if (saving.value) return
  let body
  if (adjusting.value) {
    if (!Number(amount.value) || !reason.value.trim()) {
      error.value = '请输入非零的调整金额和调整原因'
      return
    }
    body = { amount_cny: String(amount.value), reason: reason.value.trim() }
  } else {
    if (!planId.value) return
    body = { plan_id: Number(planId.value) }
    if (props.admin && days.value) {
      body.ends_at = new Date(Date.now() + Number(days.value) * 86400_000).toISOString()
    }
  }
  const operation = props.operation
  const suffix = operation === 'adjust' ? 'adjustments' : 'subscriptions'
  saving.value = true
  error.value = ''
  try {
    await request(`/users/${props.userId}/${suffix}`, body)
    emit('saved', operation)
    emit('close')
  } catch (failure) {
    error.value = failure.message
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <el-dialog
    :model-value="Boolean(operation)"
    :title="title"
    class="quota-operation-dialog"
    width="min(420px, calc(100vw - 32px))"
    append-to-body
    align-center
    :lock-scroll="false"
    :close-on-click-modal="!saving"
    :close-on-press-escape="!saving"
    :show-close="!saving"
    @update:model-value="!$event && emit('close')"
  >
    <p v-if="admin && username" class="quota-operation__account">{{ username }}</p>
    <div v-if="choosing" class="quota-operation__choices">
      <button class="el-button" type="button" @click="emit('select', 'adjust')">调整额度</button>
      <button class="el-button" type="button" @click="emit('select', 'subscribe')">开通套餐</button>
    </div>
    <form v-else class="quota-operation" @submit.prevent="submit">
      <template v-if="adjusting">
        <label for="quota-adjust-amount">增减金额（元）</label>
        <input id="quota-adjust-amount" v-model="amount" type="number" required step="0.00000001" placeholder="例如 20 或 -5" />
        <label for="quota-adjust-reason">调整原因</label>
        <input id="quota-adjust-reason" v-model="reason" type="text" required maxlength="500" />
      </template>
      <template v-else>
        <label for="quota-plan">套餐</label>
        <select id="quota-plan" v-model="planId" required :disabled="loading || !plans.length">
          <option value="">{{ loading ? '正在读取套餐…' : plans.length ? '请选择套餐' : '暂无可开通的套餐' }}</option>
          <option v-for="plan in plans" :key="plan.id" :value="plan.id">
            {{ plan.name }}（{{ Number(plan.quota_cny).toFixed(2) }} 元 / {{ plan.validity_days }} 天）
          </option>
        </select>
        <template v-if="admin && plans.length">
          <label for="quota-plan-days">有效天数（选填）</label>
          <input id="quota-plan-days" v-model="days" type="number" min="1" max="3650" />
        </template>
      </template>
      <p v-if="error" class="quota-operation__error" role="alert">{{ error }}</p>
      <div class="quota-operation__actions">
        <button v-if="admin" class="el-button" type="button" :disabled="saving" @click="emit('select', 'choose')">返回</button>
        <button v-else class="el-button" type="button" :disabled="saving" @click="emit('close')">取消</button>
        <button class="el-button el-button--primary" type="submit" :disabled="saving || (!adjusting && !planId)">
          {{ saving ? '保存中…' : adjusting ? '保存调整' : '开通套餐' }}
        </button>
      </div>
    </form>
  </el-dialog>
</template>

<style scoped>
:global(.quota-operation-dialog) {
  max-height: calc(100dvh - 24px);
  overflow-y: auto;
}
.quota-operation__choices { display: flex; flex-wrap: wrap; gap: 8px; }
.quota-operation__choices .el-button { margin-left: 0; }
.quota-operation { display: grid; gap: 8px; }
.quota-operation label { color: #344054; font-weight: 600; }
.quota-operation input, .quota-operation select {
  width: 100%;
  min-height: 38px;
  margin-bottom: 6px;
  padding: 6px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
  color: #1f2937;
  font: inherit;
}
.quota-operation input:focus-visible, .quota-operation select:focus-visible {
  outline: 2px solid #5b72df;
  outline-offset: 1px;
}
.quota-operation__account { margin: 0 0 6px; overflow-wrap: anywhere; }
.quota-operation__error { margin: 0; color: #b42318; }
.quota-operation__actions { display: flex; justify-content: flex-end; margin-top: 6px; }
.quota-operation__actions button:disabled { opacity: .6; cursor: default; }
</style>
