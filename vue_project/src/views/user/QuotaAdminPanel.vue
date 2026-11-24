<script setup>
import { onMounted, ref } from 'vue'
import { ElDialog } from 'element-plus'
import { API_PREFIX } from '@/config/api'
import { getToken } from '@/utils/auth'
import QuotaOperationDialog from './QuotaOperationDialog.vue'

defineProps({ currentUserId: { type: Number, required: true } })
const emit = defineEmits(['quota-changed'])
const roleLabels = { admin: '管理员', member: '会员', user: '普通用户' }
const PAGE_SIZE = 5
const loading = ref(false)
const error = ref('')
const users = ref([])
const search = ref('')
const appliedSearch = ref('')
const page = ref(1)
const totalPages = ref(1)
const target = ref(null)
const operation = ref('')
const roleTarget = ref(null)
const role = ref('')
const roleError = ref('')
const savingRole = ref(false)
const notice = ref('')
const selectedUsage = ref(null)
const usage = ref([])
const usageLoading = ref(false)
const usageError = ref('')
let usageRequest = 0

function headers() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` }
}

function moneyText(value) {
  return value == null ? '不限' : `${Number(value).toFixed(4)} 元`
}

async function fetchPage(targetPage, needle) {
  const query = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String((targetPage - 1) * PAGE_SIZE) })
  if (needle) query.set('q', needle)
  const response = await fetch(`${API_PREFIX}/billing/admin/users?${query}`, { headers: headers(), cache: 'no-store' })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.detail || '读取额度账户失败')
  return payload
}

async function loadUsers(targetPage = page.value, needle = appliedSearch.value) {
  if (loading.value) return
  loading.value = true
  error.value = ''
  try {
    let payload = await fetchPage(targetPage, needle)
    const lastPage = Math.max(1, Math.ceil(payload.total / PAGE_SIZE))
    if (targetPage > lastPage) {
      targetPage = lastPage
      payload = await fetchPage(targetPage, needle)
    }
    users.value = payload.items
    totalPages.value = Math.max(1, Math.ceil(payload.total / PAGE_SIZE))
    page.value = targetPage
    appliedSearch.value = needle
    if (selectedUsage.value && !users.value.some((item) => item.user_id === selectedUsage.value.user_id)) {
      selectedUsage.value = null
      void loadUsage(null)
    }
  } catch (failure) {
    error.value = failure.message
  } finally {
    loading.value = false
  }
}

function refreshUsers() {
  const needle = search.value.trim()
  void loadUsers(needle === appliedSearch.value ? page.value : 1, needle)
}

async function loadUsage(userId) {
  const request = ++usageRequest
  usage.value = []
  usageError.value = ''
  usageLoading.value = Boolean(userId)
  if (!userId) {
    return
  }
  try {
    const response = await fetch(`${API_PREFIX}/billing/users/${userId}/usage`, {
      headers: headers(),
      cache: 'no-store',
    })
    const payload = await response.json().catch(() => ({}))
    if (request !== usageRequest) return
    if (!response.ok) throw new Error(payload.detail || '读取用量失败')
    usage.value = Array.isArray(payload) ? payload : []
  } catch (reason) {
    if (request !== usageRequest) return
    usageError.value = reason?.message || '读取用量失败'
    usage.value = []
  } finally {
    if (request === usageRequest) usageLoading.value = false
  }
}

function showUsage(item) {
  selectedUsage.value = selectedUsage.value?.user_id === item.user_id ? null : item
  void loadUsage(selectedUsage.value?.user_id)
}

function openOperation(item, kind) {
  target.value = item
  operation.value = kind
}

function afterOperation(kind) {
  notice.value = kind === 'adjust' ? '额度已调整' : '套餐已开通'
  if (operation.value && target.value) emit('quota-changed', target.value.user_id)
  void loadUsers()
}

function openRole(item) {
  roleTarget.value = item
  role.value = item.role
  roleError.value = ''
}

async function saveRole() {
  if (savingRole.value || !roleTarget.value) return
  const item = roleTarget.value
  savingRole.value = true
  roleError.value = ''
  try {
    const response = await fetch(`${API_PREFIX}/billing/users/${item.user_id}/role`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify({ role: role.value }),
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(typeof payload.detail === 'string' ? payload.detail : '角色保存失败')
    const current = users.value.find((row) => row.user_id === item.user_id)
    if (current) Object.assign(current, payload)
    notice.value = `${item.username} 的角色已更新为${roleLabels[payload.role]}`
    roleTarget.value = null
  } catch (failure) {
    roleError.value = failure.message
  } finally {
    savingRole.value = false
  }
}

onMounted(loadUsers)
</script>

<template>
  <div class="qam-panel">
    <div class="qam-head">
      <h2 class="qam-title">用户额度管理</h2>
      <form class="qam-head-actions" @submit.prevent="refreshUsers">
        <input v-model="search" class="qam-input" type="search" aria-label="按用户名或邮箱搜索" placeholder="按用户名或邮箱搜索" />
        <button class="qam-btn" type="submit" :disabled="loading">{{ loading ? '读取中…' : '搜索' }}</button>
      </form>
    </div>

    <p v-if="error" class="qam-error" role="alert">{{ error }}</p>
    <p v-if="notice" class="qam-notice" role="status">{{ notice }}</p>

    <div class="qam-table-wrap">
      <table class="qam-table">
        <thead>
          <tr>
            <th>用户</th>
            <th>角色</th>
            <th>额度</th>
            <th>已用</th>
            <th>剩余</th>
            <th>周期重置</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in users" :key="item.user_id" class="qam-row">
            <td><strong>{{ item.username }}</strong><small>{{ item.email || '#' + item.user_id }}</small></td>
            <td><span class="qam-tag" :class="{ 'qam-tag--plain': item.role !== 'admin' }">{{ roleLabels[item.role] }}</span></td>
            <td>{{ moneyText(item.allowance_cny) }}</td>
            <td>{{ moneyText(item.used_cny) }}</td>
            <td>{{ moneyText(item.remaining_cny) }}</td>
            <td class="qam-muted">{{ item.period_end ? item.period_end.slice(0, 19).replace('T', ' ') : '—' }}</td>
            <td>
              <div class="qam-row-actions">
                <button type="button" class="qam-btn" @click="openOperation(item, 'adjust')">调整额度</button>
                <button type="button" class="qam-btn" @click="openOperation(item, 'subscribe')">开通套餐</button>
                <button v-if="item.user_id !== currentUserId" type="button" class="qam-btn" @click="openRole(item)">修改角色</button>
                <button type="button" class="qam-link" :aria-expanded="selectedUsage?.user_id === item.user_id" @click="showUsage(item)">用量</button>
              </div>
            </td>
          </tr>
          <tr v-if="!loading && !users.length"><td colspan="7" class="qam-empty">没有匹配的账户</td></tr>
        </tbody>
      </table>
    </div>

    <section v-if="selectedUsage" class="qam-detail" :aria-label="`${selectedUsage.username} 的用量`">
      <div class="qam-usage">
        <div class="qam-usage-head">
          <h4>最近调用记录</h4>
          <button type="button" class="qam-link" :disabled="usageLoading" @click="loadUsage(selectedUsage.user_id)">
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

    <nav class="qam-pagination" aria-label="额度账户分页">
      <button type="button" class="qam-btn" :disabled="loading || page <= 1" @click="loadUsers(page - 1)">上一页</button>
      <span role="status">第 {{ page }} 页 / 共 {{ totalPages }} 页</span>
      <button type="button" class="qam-btn" :disabled="loading || page >= totalPages" @click="loadUsers(page + 1)">下一页</button>
    </nav>

    <QuotaOperationDialog
      v-if="target"
      :user-id="target.user_id"
      :username="target.username"
      :operation="operation"
      admin
      @close="operation = ''"
      @saved="afterOperation"
    />
    <el-dialog
      :model-value="Boolean(roleTarget)"
      title="修改角色"
      width="min(390px, calc(100vw - 32px))"
      :close-on-click-modal="!savingRole"
      :close-on-press-escape="!savingRole"
      :show-close="!savingRole"
      @update:model-value="!$event && (roleTarget = null)"
    >
      <form class="qam-form" @submit.prevent="saveRole">
        <label for="quota-user-role">{{ roleTarget?.username }} 的角色</label>
        <select id="quota-user-role" v-model="role" class="qam-input">
          <option v-for="(label, value) in roleLabels" :key="value" :value="value">{{ label }}</option>
        </select>
        <p v-if="roleError" class="qam-error" role="alert">{{ roleError }}</p>
        <div class="qam-dialog-actions">
          <button type="button" class="qam-btn" :disabled="savingRole" @click="roleTarget = null">取消</button>
          <button type="submit" class="qam-btn qam-btn--primary" :disabled="savingRole || role === roleTarget?.role">
            {{ savingRole ? '保存中…' : '保存角色' }}
          </button>
        </div>
      </form>
    </el-dialog>
  </div>
</template>

<style scoped>
.qam-panel { display: flex; flex-direction: column; gap: 12px; }
.qam-head { display: flex; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
.qam-title { margin: 6px 0 6px; color: #1f2a44; font-size: 20px; }
.qam-head-actions { display: flex; align-items: center; gap: 10px; }
.qam-input { min-width: 0; padding: 9px 12px; border: 1px solid #d8dfec; border-radius: 9px; background: #fff; color: #1f2a44; font-size: 13px; }
.qam-input:focus-visible { outline: 3px solid #b9c5ff; outline-offset: 1px; }
.qam-btn { padding: 9px 16px; border: 1px solid #d8dfec; border-radius: 9px; background: #fff; color: #33415f; font-size: 13px; font-weight: 600; cursor: pointer; }
.qam-btn:hover:not(:disabled) { border-color: #b9c5ff; }
.qam-btn:disabled { opacity: .6; cursor: default; }
.qam-pagination { display: flex; align-items: center; justify-content: flex-end; gap: 12px;  }
.qam-btn--primary { border-color: transparent; background: #5b72df; color: #fff; }
.qam-table-wrap { overflow-x: auto; border: 1px solid #e4e8f2; border-radius: 12px; background: #fff; }
.qam-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.qam-table th, .qam-table td { padding: 6px 10px; text-align: left; border-bottom: 1px solid #eef1f7; white-space: nowrap; }
.qam-table th { color: #74809b; font-size: 12px; font-weight: 700; background: #f7f9fd; }
.qam-table td small { display: block; margin-top: 2px; color: #98a2b8; font-size: 11px; }
.qam-row:hover { background: #f8faff; }
.qam-tag { padding: 2px 8px; border-radius: 999px; background: #e8f0ff; color: #3166b1; font-size: 11px; font-weight: 600; }
.qam-tag--plain { background: #f1f3f8; color: #667089; }
.qam-muted { color: #98a2b8; }
.qam-empty { padding: 22px; text-align: center; color: #98a2b8; }
.qam-detail { padding: 20px; border: 1px solid #e4e8f2; border-radius: 12px; background: #fff; }
.qam-form { display: flex; flex-direction: column; gap: 8px; }
.qam-usage {  }
.qam-usage-head { display: flex; align-items: center; justify-content: space-between; }
.qam-usage-head h4 { margin: 0; color: #1f2a44; font-size: 14px; }
.qam-link { border: none; background: none; color: #5b72df; font-size: 13px; font-weight: 600; cursor: pointer; }
.qam-usage-list { margin: 12px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px; }
.qam-usage-list li { display: grid; grid-template-columns: minmax(120px, 1fr) auto auto auto; gap: 12px; align-items: center; padding: 8px 10px; border-radius: 8px; background: #f8faff; font-size: 12px; }
.qam-usage-model { color: #33415f; font-weight: 600; }
.qam-usage-cost { color: #1f2a44; font-weight: 700; }
.qam-error { margin: 0; color: #b42318; font-size: 13px; }
.qam-notice { margin: 0; color: #15803d; font-size: 13px; }
.qam-row-actions, .qam-dialog-actions { display: flex; align-items: center; gap: 6px; }
.qam-row-actions .qam-btn { min-height: 32px; padding: 4px 8px; }
.qam-dialog-actions { justify-content: flex-end; }
.qam-head { align-items: center; }
</style>
