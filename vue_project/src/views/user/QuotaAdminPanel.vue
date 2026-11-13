<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { API_PREFIX } from '@/config/api'
import { getToken } from '@/utils/auth'

const props = defineProps({ canGrantQuota: { type: Boolean, default: false } })
const canGrantQuota = computed(() => props.canGrantQuota)
const savingPermission = ref(false)
const loading = ref(false)
const error = ref('')
const users = ref([])
const plans = ref([])
const search = ref('')
const selectedUserId = ref(null)
const usage = ref([])
const usageLoading = ref(false)
const usageError = ref('')

const adjustment = reactive({ amount_cny: '', reason: '' })
const subscription = reactive({ plan_id: '', days: '' })
const savingAdjustment = ref(false)
const savingSubscription = ref(false)
const notice = ref('')
const noticeKind = ref('status')

const selectedUser = computed(
  () => users.value.find((item) => item.user_id === selectedUserId.value) || null,
)

function headers() {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
  }
}

function moneyText(value) {
  if (value === null || value === undefined) return '不限'
  return `${Number(value).toFixed(4)} 元`
}

function announce(message, kind = 'status') {
  notice.value = message
  noticeKind.value = kind
}

async function loadUsers() {
  loading.value = true
  error.value = ''
  try {
    const query = new URLSearchParams({ limit: '200' })
    if (search.value.trim()) query.set('q', search.value.trim())
    const response = await fetch(`${API_PREFIX}/billing/admin/users?${query}`, {
      headers: headers(),
      cache: 'no-store',
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.detail || '读取额度账户失败')
    users.value = Array.isArray(payload) ? payload : []
    if (selectedUserId.value && !users.value.some((item) => item.user_id === selectedUserId.value)) {
      selectedUserId.value = null
      usage.value = []
    }
  } catch (reason) {
    error.value = reason?.message || '读取额度账户失败'
  } finally {
    loading.value = false
  }
}

async function loadPlans() {
  try {
    const response = await fetch(`${API_PREFIX}/billing/plans`, { headers: headers(), cache: 'no-store' })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.detail || '读取套餐失败')
    plans.value = Array.isArray(payload) ? payload : []
  } catch (reason) {
    error.value = reason?.message || '读取套餐失败'
  }
}

async function loadUsage(userId) {
  if (!userId) {
    usage.value = []
    return
  }
  usageLoading.value = true
  usageError.value = ''
  try {
    const response = await fetch(`${API_PREFIX}/billing/users/${userId}/usage`, {
      headers: headers(),
      cache: 'no-store',
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.detail || '读取用量失败')
    usage.value = Array.isArray(payload) ? payload : []
  } catch (reason) {
    usageError.value = reason?.message || '读取用量失败'
    usage.value = []
  } finally {
    usageLoading.value = false
  }
}

function selectUser(userId) {
  selectedUserId.value = userId === selectedUserId.value ? null : userId
  void loadUsage(selectedUserId.value)
}

async function submitAdjustment() {
  if (!selectedUser.value) return
  const amount = Number(adjustment.amount_cny)
  if (!Number.isFinite(amount) || amount === 0) {
    announce('请输入非零的调整金额', 'error')
    return
  }
  if (!adjustment.reason.trim()) {
    announce('请填写调整原因', 'error')
    return
  }
  savingAdjustment.value = true
  announce('')
  try {
    const response = await fetch(
      `${API_PREFIX}/billing/users/${selectedUser.value.user_id}/adjustments`,
      {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ amount_cny: amount, reason: adjustment.reason.trim() }),
      },
    )
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.detail || '额度调整失败')
    announce(`已为 ${selectedUser.value.username} 调整额度 ${amount.toFixed(4)} 元`)
    adjustment.amount_cny = ''
    adjustment.reason = ''
    await loadUsers()
  } catch (reason) {
    announce(reason?.message || '额度调整失败', 'error')
  } finally {
    savingAdjustment.value = false
  }
}

async function setQuotaPermission(target = selectedUser.value) {
  if (!target || !canGrantQuota.value || target.can_grant_quota || savingPermission.value) return
  const granted = !target.can_manage_quota
  savingPermission.value = true
  announce('')
  try {
    const response = await fetch(
      `${API_PREFIX}/billing/users/${target.user_id}/quota-permission`,
      {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({ can_manage_quota: granted }),
      },
    )
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.detail || '额度管理授权失败')
    target.can_manage_quota = payload.can_manage_quota
    announce(`已${granted ? '授予' : '撤销'} ${target.username} 的额度管理权限`)
  } catch (reason) {
    announce(reason?.message || '额度管理授权失败', 'error')
  } finally {
    savingPermission.value = false
  }
}

async function submitSubscription() {
  if (!selectedUser.value) return
  const planId = Number(subscription.plan_id)
  if (!Number.isInteger(planId) || planId <= 0) {
    announce('请选择套餐', 'error')
    return
  }
  const days = Number(subscription.days)
  const body = { plan_id: planId }
  if (Number.isFinite(days) && days > 0) {
    const endsAt = new Date(Date.now() + days * 86400_000)
    body.ends_at = endsAt.toISOString()
  }
  savingSubscription.value = true
  announce('')
  try {
    const response = await fetch(
      `${API_PREFIX}/billing/users/${selectedUser.value.user_id}/subscriptions`,
      { method: 'POST', headers: headers(), body: JSON.stringify(body) },
    )
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.detail || '套餐开通失败')
    announce(`已为 ${selectedUser.value.username} 开通套餐`)
    subscription.days = ''
    await loadUsers()
  } catch (reason) {
    announce(reason?.message || '套餐开通失败', 'error')
  } finally {
    savingSubscription.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadUsers(), loadPlans()])
})
</script>

<template>
  <div class="qam-panel">
    <div class="qam-head">
      <div>
        <span class="qam-kicker">PLATFORM QUOTA</span>
        <h2 class="qam-title">用户额度管理</h2>
        <p class="qam-desc">查看每位用户的本周期额度与用量，调整额度或开通套餐。获授权账号可调整其他账号额度。</p>
      </div>
      <div class="qam-head-actions">
        <input
          v-model="search"
          class="qam-input"
          type="search"
          placeholder="按用户名或邮箱搜索"
          @keyup.enter="loadUsers"
        />
        <button type="button" class="qam-btn" :disabled="loading" @click="loadUsers">
          {{ loading ? '读取中…' : '刷新' }}
        </button>
      </div>
    </div>

    <p v-if="error" class="qam-error" role="alert">{{ error }}</p>
    <p v-else-if="notice" class="qam-notice" :class="{ 'is-error': noticeKind === 'error' }" role="status">
      {{ notice }}
    </p>

    <div class="qam-table-wrap">
      <table class="qam-table">
        <thead>
          <tr>
            <th>用户</th>
            <th>角色</th>
            <th>额度管理权限</th>
            <th>额度</th>
            <th>已用</th>
            <th>剩余</th>
            <th>周期重置</th>
            <th v-if="canGrantQuota">权限操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in users"
            :key="item.user_id"
            class="qam-row"
            :class="{ 'is-selected': item.user_id === selectedUserId }"
            @click="selectUser(item.user_id)"
          >
            <td>
              <strong>{{ item.username }}</strong>
              <small>{{ item.email || '#' + item.user_id }}</small>
            </td>
            <td>
              <span v-if="item.is_platform_admin" class="qam-tag">管理员</span>
              <span v-else class="qam-tag qam-tag--plain">{{ item.role }}</span>
            </td>
            <td>{{ item.can_manage_quota ? '已授权' : '未授权' }}</td>
            <td>{{ moneyText(item.allowance_cny) }}</td>
            <td>{{ moneyText(item.used_cny) }}</td>
            <td>{{ moneyText(item.remaining_cny) }}</td>
            <td class="qam-muted">{{ item.period_end ? item.period_end.slice(0, 19).replace('T', ' ') : '—' }}</td>
            <td v-if="canGrantQuota">
              <button
                type="button"
                class="qam-btn"
                :disabled="savingPermission || item.can_grant_quota"
                @click.stop="setQuotaPermission(item)"
              >
                {{ item.can_grant_quota ? '指定管理员' : item.can_manage_quota ? '撤销额度管理权限' : '授予额度管理权限' }}
              </button>
            </td>
          </tr>
          <tr v-if="!loading && !users.length">
            <td :colspan="canGrantQuota ? 8 : 7" class="qam-empty">没有匹配的账户</td>
          </tr>
        </tbody>
      </table>
    </div>

    <section v-if="selectedUser" class="qam-detail">
      <h3>调整 {{ selectedUser.username }} 的额度</h3>
      <div class="qam-forms">
        <div v-if="canGrantQuota" class="qam-form">
          <span class="qam-label">调整其他账号额度</span>
          <p class="qam-desc">授权后，该账号可与您一样调整其他账号的额度限制。</p>
          <button
            type="button"
            class="qam-btn"
            :disabled="savingPermission || selectedUser.can_grant_quota"
            @click="setQuotaPermission(selectedUser)"
          >
            {{ savingPermission ? '保存中…' : selectedUser.can_grant_quota ? '指定管理员' : selectedUser.can_manage_quota ? '撤销额度管理权限' : '授予额度管理权限' }}
          </button>
        </div>
        <div class="qam-form">
          <label class="qam-label">额度增减（元，可为负数）</label>
          <input v-model="adjustment.amount_cny" class="qam-input" type="number" step="0.01" placeholder="例如 20 或 -5" />
          <label class="qam-label">调整原因</label>
          <input v-model="adjustment.reason" class="qam-input" type="text" maxlength="500" placeholder="例如 客户充值 / 试用补偿" />
          <button type="button" class="qam-btn qam-btn--primary" :disabled="savingAdjustment" @click="submitAdjustment">
            {{ savingAdjustment ? '提交中…' : '保存额度调整' }}
          </button>
        </div>

        <div class="qam-form">
          <label class="qam-label">开通套餐</label>
          <select v-model="subscription.plan_id" class="qam-input">
            <option value="">选择套餐…</option>
            <option v-for="plan in plans" :key="plan.id" :value="plan.id">
              {{ plan.name }}（{{ Number(plan.quota_cny).toFixed(2) }} 元 / {{ plan.validity_days }} 天）
            </option>
          </select>
          <label class="qam-label">有效天数（留空使用套餐默认）</label>
          <input v-model="subscription.days" class="qam-input" type="number" min="1" max="3650" placeholder="例如 30" />
          <button type="button" class="qam-btn qam-btn--primary" :disabled="savingSubscription" @click="submitSubscription">
            {{ savingSubscription ? '提交中…' : '开通套餐' }}
          </button>
        </div>
      </div>

      <div class="qam-usage">
        <div class="qam-usage-head">
          <h4>最近调用记录</h4>
          <button type="button" class="qam-link" :disabled="usageLoading" @click="loadUsage(selectedUser.user_id)">
            {{ usageLoading ? '读取中…' : '刷新用量' }}
          </button>
        </div>
        <p v-if="usageError" class="qam-error" role="alert">{{ usageError }}</p>
        <ul v-else-if="usage.length" class="qam-usage-list">
          <li v-for="row in usage.slice(0, 20)" :key="row.id">
            <span class="qam-usage-model">{{ row.model }}</span>
            <span class="qam-muted">{{ row.input_tokens }} / {{ row.output_tokens }} tokens</span>
            <span class="qam-usage-cost">{{ moneyText(row.cost_cny) }}</span>
            <span class="qam-muted">{{ row.created_at?.slice(0, 19).replace('T', ' ') }}</span>
          </li>
        </ul>
        <p v-else class="qam-muted">暂无调用记录</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.qam-panel { display: flex; flex-direction: column; gap: 18px; }
.qam-head { display: flex; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
.qam-kicker { color: #5b72df; font-size: 11px; font-weight: 800; letter-spacing: .08em; }
.qam-title { margin: 6px 0 6px; color: #1f2a44; font-size: 20px; }
.qam-desc { margin: 0; max-width: 560px; color: #74809b; font-size: 13px; line-height: 1.7; }
.qam-head-actions { display: flex; align-items: center; gap: 10px; }
.qam-input { min-width: 0; padding: 9px 12px; border: 1px solid #d8dfec; border-radius: 9px; background: #fff; color: #1f2a44; font-size: 13px; }
.qam-input:focus-visible { outline: 3px solid #b9c5ff; outline-offset: 1px; }
.qam-btn { padding: 9px 16px; border: 1px solid #d8dfec; border-radius: 9px; background: #fff; color: #33415f; font-size: 13px; font-weight: 600; cursor: pointer; }
.qam-btn:hover:not(:disabled) { border-color: #b9c5ff; }
.qam-btn:disabled { opacity: .6; cursor: default; }
.qam-btn--primary { border-color: transparent; background: #5b72df; color: #fff; }
.qam-table-wrap { overflow-x: auto; border: 1px solid #e4e8f2; border-radius: 12px; background: #fff; }
.qam-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.qam-table th, .qam-table td { padding: 11px 14px; text-align: left; border-bottom: 1px solid #eef1f7; white-space: nowrap; }
.qam-table th { color: #74809b; font-size: 12px; font-weight: 700; background: #f7f9fd; }
.qam-table td small { display: block; margin-top: 2px; color: #98a2b8; font-size: 11px; }
.qam-row { cursor: pointer; }
.qam-row:hover { background: #f8faff; }
.qam-row.is-selected { background: #eef3ff; }
.qam-tag { padding: 2px 8px; border-radius: 999px; background: #e8f0ff; color: #3166b1; font-size: 11px; font-weight: 600; }
.qam-tag--plain { background: #f1f3f8; color: #667089; }
.qam-muted { color: #98a2b8; }
.qam-empty { padding: 22px; text-align: center; color: #98a2b8; }
.qam-detail { padding: 20px; border: 1px solid #e4e8f2; border-radius: 12px; background: #fff; }
.qam-detail h3 { margin: 0 0 14px; color: #1f2a44; font-size: 16px; }
.qam-forms { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 18px; }
.qam-form { display: flex; flex-direction: column; gap: 8px; }
.qam-label { color: #74809b; font-size: 12px; font-weight: 600; }
.qam-usage { margin-top: 20px; border-top: 1px solid #eef1f7; padding-top: 16px; }
.qam-usage-head { display: flex; align-items: center; justify-content: space-between; }
.qam-usage-head h4 { margin: 0; color: #1f2a44; font-size: 14px; }
.qam-link { border: none; background: none; color: #5b72df; font-size: 13px; font-weight: 600; cursor: pointer; }
.qam-usage-list { margin: 12px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px; }
.qam-usage-list li { display: grid; grid-template-columns: minmax(120px, 1fr) auto auto auto; gap: 12px; align-items: center; padding: 8px 10px; border-radius: 8px; background: #f8faff; font-size: 12px; }
.qam-usage-model { color: #33415f; font-weight: 600; }
.qam-usage-cost { color: #1f2a44; font-weight: 700; }
.qam-error { margin: 0; color: #b42318; font-size: 13px; }
.qam-notice { margin: 0; color: #15803d; font-size: 13px; }
.qam-notice.is-error { color: #b42318; }
</style>
