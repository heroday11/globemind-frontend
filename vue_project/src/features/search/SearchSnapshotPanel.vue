<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { searchApi } from './api.js'
import { createSnapshotWorkspace, describeSearchSnapshot, searchComparisonMessage } from './snapshots.js'
const props = defineProps({ requestParams: { type: Object, default: null } })
const state = reactive({})
const token = ref('')
function readAccessToken() {
  try { return localStorage.getItem('access_token') || '' } catch { return '' }
}
const workspace = createSnapshotWorkspace({ api: searchApi, state, getAccessToken: readAccessToken })
const canExecute = computed(() => Boolean(token.value && state.loaded && props.requestParams?.search_type === 'news' && !['cluster', 'event_coref'].includes(props.requestParams?.mode)))
const disabled = computed(() => state.busy || state.loading)
const comparisonTitle = computed(() => ({
  changed: '已观察到检索变化',
  no_observed_change: '本次比较未观察到变化',
  not_comparable: '这两个结果类型不能直接比较',
})[state.comparison?.status] || '')
function formatValue(value) {
  if (value === null || value === undefined) return '未提供'
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}
function syncAuth() {
  const current = readAccessToken()
  if (current === token.value) return false
  token.value = current
  workspace.reset()
  if (current) void workspace.refresh()
  return true
}
function executeCurrent() {
  if (!syncAuth()) void workspace.execute(props.requestParams)
}
function compareSelected() {
  if (!syncAuth()) void workspace.compare()
}
function refreshHistory() {
  if (!syncAuth()) void workspace.refresh()
}
watch(() => [state.fromId, state.toId], () => { state.comparison = null })
onMounted(() => {
  syncAuth()
  window.addEventListener('storage', syncAuth)
  window.addEventListener('focus', syncAuth)
})
onUnmounted(() => {
  window.removeEventListener('storage', syncAuth)
  window.removeEventListener('focus', syncAuth)
  workspace.dispose()
})
</script>

<template>
  <section class="snapshot-panel" aria-labelledby="search-snapshot-heading">
    <header class="snapshot-header">
      <div>
        <h2 id="search-snapshot-heading">检索基线与变化比较</h2>
        <p>保存两次真实查询执行，比较已捕获范围内的条件、结果和位次。</p>
      </div>
      <button type="button" :disabled="!token || disabled" @click="refreshHistory">刷新历史快照</button>
    </header>
    <p v-if="!token" class="snapshot-note">请登录后保存和比较查询快照。</p>
    <template v-else>
      <div class="snapshot-actions">
        <button type="button" :disabled="!canExecute || disabled" @click="executeCurrent">
          {{ state.busy ? '处理中…' : state.items.length ? '重新执行并保存' : '执行并保存查询基线' }}
        </button>
        <span v-if="!props.requestParams">请先完成一次新闻文章检索。</span>
        <span v-else>按搜索页上次成功查询的条件重新执行；未提交的筛选修改不会自动采用。</span>
      </div>
      <p class="snapshot-note">这里会重新执行查询，不是补存先前页面的结果；新结果用于快照比较，搜索页原列表不会自动替换。仅保存查询与本页有序结果 ID，尚未比较文章正文；退出范围不等于文章删除或撤稿。</p>
      <p v-if="state.loading" role="status">正在加载历史快照…</p>
      <p v-if="state.error" class="snapshot-error" role="alert">{{ state.error }}</p>
      <p v-if="state.notice" role="status">{{ state.notice }}</p>
      <p v-if="state.lastExecutedAt">本次服务端检查时间：<time>{{ state.lastExecutedAt }}</time></p>
      <p v-if="state.loaded && !state.items.length">尚无已保存快照。先执行并保存查询基线，再次执行后比较。</p>
      <template v-if="state.items.length">
        <p class="snapshot-note">已保存 {{ state.total }} 份，当前显示 {{ state.items.length }} 份（含所选版本）。选定的基线不会因保存新快照而自动替换。</p>
        <div class="snapshot-selectors">
          <label>比较基线
            <select v-model="state.fromId" aria-label="比较基线" :disabled="disabled">
              <option v-for="item in state.items" :key="item.snapshot_id" :value="item.snapshot_id">{{ describeSearchSnapshot(item) }}</option>
            </select>
          </label>
          <label>本次对照
            <select v-model="state.toId" aria-label="本次对照" :disabled="disabled">
              <option v-for="item in state.items" :key="item.snapshot_id" :value="item.snapshot_id">{{ describeSearchSnapshot(item) }}</option>
            </select>
          </label>
          <button type="button" :disabled="disabled || !state.fromId || !state.toId" @click="compareSelected">比较两次检索</button>
        </div>
      </template>
      <article v-if="state.comparison" class="snapshot-comparison" aria-labelledby="search-comparison-heading">
        <h3 id="search-comparison-heading">{{ comparisonTitle }}</h3>
        <p>记录总量：{{ state.comparison.total_before }} → {{ state.comparison.total_after }}；仅比较保存的结果范围。</p>
        <p>共同结果相对顺序：{{ state.comparison.common_relative_order_changed === null ? '不可比较' : state.comparison.common_relative_order_changed ? '有变化' : '未变' }}。</p>
        <template v-if="state.comparison.status !== 'not_comparable'">
          <p>新进入范围（{{ state.comparison.entered_scope.length }}）：{{ state.comparison.entered_scope.join('、') || '无' }}</p>
          <p>退出范围（{{ state.comparison.exited_scope.length }}）：{{ state.comparison.exited_scope.join('、') || '无' }}</p>
        </template>
        <div v-if="state.comparison.contract_changes.length" class="snapshot-scroll">
          <h4>查询条件变化</h4>
          <table><thead><tr><th>字段</th><th>基线</th><th>本次</th></tr></thead><tbody>
            <tr v-for="change in state.comparison.contract_changes" :key="change.field"><td>{{ change.field }}</td><td>{{ formatValue(change.before) }}</td><td>{{ formatValue(change.after) }}</td></tr>
          </tbody></table>
        </div>
        <div v-if="state.comparison.rank_changes.length" class="snapshot-scroll">
          <h4>共同结果位次变化</h4>
          <table><thead><tr><th>结果 ID</th><th>基线位次</th><th>本次位次</th><th>变化</th></tr></thead><tbody>
            <tr v-for="item in state.comparison.rank_changes" :key="item.id"><td>{{ item.id }}</td><td>{{ item.old_rank }}</td><td>{{ item.new_rank }}</td><td>{{ item.rank_delta > 0 ? '+' : '' }}{{ item.rank_delta }}</td></tr>
          </tbody></table>
          <p class="snapshot-note">正数表示位次下降。前方新增结果也可能导致绝对位移，不能直接判断为排序算法变化。</p>
        </div>
        <h4>原因与比较边界</h4>
        <ul><li v-for="code in state.comparison.reason_codes" :key="`reason-${code}`">{{ searchComparisonMessage(code) }}</li><li v-for="code in state.comparison.limitations" :key="`limit-${code}`">{{ searchComparisonMessage(code) }}</li></ul>
      </article>
    </template>
  </section>
</template>

<style scoped>
.snapshot-panel { margin: 18px 0; padding: 20px; border: 1px solid var(--border-color, #dce3ed); border-radius: 12px; color: var(--text-color, #243047); background: var(--card-bg, #fff); }
.snapshot-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
h2 { font-size: 17px; margin: 0 0 8px; }
h3 { font-size: 16px; margin: 12px 0; }
h4 { font-size: 14px; margin: 16px 0 8px; }
p, li, label, button, select { font-size: 13px; line-height: 1.7; }
p { margin: 8px 0; }
.snapshot-note { color: var(--text-secondary, #58677d); }
.snapshot-error { color: #b42318; }
.snapshot-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; margin: 12px 0; }
button { border: 1px solid #c3d0e2; border-radius: 7px; padding: 6px 12px; color: inherit; background: transparent; cursor: pointer; white-space: nowrap; }
button:disabled { opacity: .5; cursor: not-allowed; }
button:focus-visible, select:focus-visible { outline: 2px solid #2878df; outline-offset: 3px; }
.snapshot-selectors { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }
.snapshot-selectors label { display: flex; flex-direction: column; gap: 5px; min-width: 200px; max-width: 100%; flex: 1; }
select { width: 100%; min-width: 0; border: 1px solid #c3d0e2; border-radius: 6px; padding: 6px; color: inherit; background: inherit; }
.snapshot-comparison { border-top: 1px solid #dce3ed; margin-top: 16px; padding-top: 8px; overflow-wrap: anywhere; }
.snapshot-scroll { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 12px; }
th, td { text-align: left; vertical-align: top; border-bottom: 1px solid #e2e8f0; padding: 8px; overflow-wrap: anywhere; }
@media (max-width: 640px) { .snapshot-panel { padding: 14px; } .snapshot-header { flex-direction: column; } .snapshot-selectors label { min-width: 100%; } }
</style>
