<script setup>
import { computed, ref, useId, watch } from 'vue'
import 'element-plus/es/components/button/style/css'
import { API_PREFIX } from '@/config/api'
import { getToken } from '@/utils/auth'

const props = defineProps({
  userId: { type: Number, required: true },
  operation: { type: String, required: true },
  inline: Boolean,
  disabled: Boolean,
  admin: Boolean,
})
const emit = defineEmits(['close', 'saved', 'busy'])
const fieldId = useId()
const amount = ref('')
const reason = ref('')
const planId = ref('')
const days = ref('')
const plans = ref([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const adjusting = computed(() => props.operation === 'adjust')
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
  if (saving.value || props.disabled) return
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
  emit('busy', true)
  error.value = ''
  try {
    await request(`/users/${props.userId}/${suffix}`, body)
    amount.value = ''
    reason.value = ''
    planId.value = ''
    days.value = ''
    emit('saved', operation, props.userId)
  } catch (failure) {
    error.value = failure.message
  } finally {
    saving.value = false
    emit('busy', false)
  }
}
</script>

<template>
  <form class="quota-operation" :class="{ 'quota-operation--inline': inline }" @submit.prevent="submit">
    <template v-if="adjusting">
      <label :for="`${fieldId}-quota-adjust-amount`">增减金额（元）</label>
      <input :id="`${fieldId}-quota-adjust-amount`" v-model="amount" type="number" required step="0.00000001" placeholder="例如 20 或 -5" />
      <label :for="`${fieldId}-quota-adjust-reason`">调整原因</label>
      <input :id="`${fieldId}-quota-adjust-reason`" v-model="reason" type="text" required maxlength="500" />
    </template>
    <template v-else>
      <label :for="`${fieldId}-quota-plan`">套餐</label>
      <select :id="`${fieldId}-quota-plan`" v-model="planId" required :disabled="loading || !plans.length">
        <option value="">{{ loading ? '正在读取套餐…' : plans.length ? '请选择套餐' : '暂无可开通的套餐' }}</option>
        <option v-for="plan in plans" :key="plan.id" :value="plan.id">
          {{ plan.name }}（{{ Number(plan.quota_cny).toFixed(2) }} 元 / {{ plan.validity_days }} 天）
        </option>
      </select>
      <template v-if="admin">
        <label :for="`${fieldId}-quota-plan-days`">有效天数</label>
        <input
          :id="`${fieldId}-quota-plan-days`"
          v-model="days"
          type="number"
          min="1"
          max="3650"
          :placeholder="plans.find((plan) => plan.id === planId)?.validity_days?.toString() || '套餐默认天数'"
        />
      </template>
    </template>
    <p v-if="error" class="quota-operation__error" role="alert">{{ error }}</p>
    <div class="quota-operation__actions">
      <button v-if="!inline" class="el-button" type="button" :disabled="saving" @click="emit('close')">取消</button>
      <button class="el-button el-button--primary" type="submit" :disabled="disabled || saving || (!adjusting && !planId)">
        {{ saving ? '保存中…' : adjusting ? '保存调整' : '开通套餐' }}
      </button>
    </div>
  </form>
</template>

<style scoped>
.quota-operation { display: grid; gap: 8px; }
.quota-operation label { color: #344054; font-weight: 600; }
.quota-operation input, .quota-operation select {
  width: 100%;
  box-sizing: border-box;
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
.quota-operation__error { margin: 0; color: #b42318; }
.quota-operation__actions { display: flex; justify-content: flex-end; margin-top: 6px; }
.quota-operation--inline { display: flex; flex: 1; flex-direction: column; }
.quota-operation--inline .quota-operation__actions { margin-top: auto; padding-top: 6px; }
.quota-operation--inline .quota-operation__actions button { min-width: 100px; min-height: 34px; }
.quota-operation__actions button:disabled { opacity: .6; cursor: default; }
</style>
