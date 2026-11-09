<script setup>
import { ref, watch, computed, onBeforeUnmount, onMounted } from 'vue'
import { researchWorkflowApi } from './index.js'
import { normalizeEvidenceImpacts, evidenceImpactLabel, evidenceImpactReason } from './evidence-impacts.js'
const props = defineProps({ projectId: { type: String, required: true }, projectVersion: { type: Number, required: true }, canCapture: Boolean })
const state = ref({ available: false, impact: null })
const loading = ref(false)
const error = ref('')
const notice = ref('')
let generation = 0
function authChanged() {
  generation += 1
  state.value = { available: false, impact: null }
  loading.value = false
  notice.value = ''
  error.value = '登录状态已变化，请重新载入项目后核查。'
}
onMounted(() => window.addEventListener('auth-changed', authChanged))
onBeforeUnmount(() => { generation += 1; window.removeEventListener('auth-changed', authChanged) })
const impact = computed(() => state.value.impact)
async function refresh() {
  const projectId = props.projectId
  const request = ++generation
  loading.value = true
  error.value = ''
  state.value = { available: false, impact: null }
  try {
    const payload = await researchWorkflowApi.evidenceImpacts(projectId)
    if (request !== generation) return
    state.value = normalizeEvidenceImpacts(payload, projectId)
    if (!state.value.available) error.value = '影响响应无法核验，请稍后刷新。'
  } catch (cause) {
    if (request === generation) error.value = cause?.message || '影响追踪暂不可用'
  } finally {
    if (request === generation) loading.value = false
  }
}
async function capture(articleId) {
  const projectId = props.projectId
  const request = ++generation
  loading.value = true
  error.value = ''
  notice.value = ''
  try {
    const history = await researchWorkflowApi.articleEvidenceHistory(articleId)
    if (request !== generation) return
    if (history?.article_id !== articleId || !Array.isArray(history?.items)) throw new Error('正文历史无法核验')
    const previous = history.items[0]
    await researchWorkflowApi.captureArticleEvidence(articleId, {
      reason: '研究项目检查数据库当前正文版本',
      change_type: previous ? 'update' : 'initial',
      expected_previous_event_id: previous?.event_id || null,
    })
    if (request !== generation || props.projectId !== projectId) return
    await refresh()
    if (props.projectId === projectId && request + 1 === generation) notice.value = '已检查数据库当前正文；请结合差异复核相关判断。'
  } catch (cause) {
    if (request === generation) error.value = cause?.status === 409
      ? '正文历史已更新，请刷新后重试。' : cause?.message || '正文检查失败'
  } finally {
    if (request === generation) loading.value = false
  }
}
watch(() => [props.projectId, props.projectVersion], () => {
  notice.value = ''
  refresh()
}, { immediate: true })
</script>
<template>
  <section class="evidence-impact-panel" aria-labelledby="evidence-impact-title">
    <header><div><h2 id="evidence-impact-title">正文差异与研判影响</h2><p>按项目绑定的每个旧版本，与已捕获的最新正文比较。</p></div><button type="button" :disabled="loading" @click="refresh">{{ loading ? '核查中…' : '刷新影响' }}</button></header>
    <p>“检查当前正文”读取数据库当前记录。引用外的修订也可能影响判断；既有证据、研判和报告保持原版本。</p>
    <p v-if="error" role="alert" class="error">{{ error }}</p><p v-if="notice" role="status">{{ notice }}</p>
    <p v-if="!loading && !state.available">当前无法核验正文与研判影响。</p>
    <template v-if="impact">
      <p class="status" :class="impact.status">{{ evidenceImpactLabel(impact.status) }} · 项目版本 {{ impact.project_version }}</p>
      <p v-if="!impact.evidence_impacts.length">项目尚无可追踪证据。</p>
      <article v-for="(row, rowIndex) in impact.evidence_impacts" :key="row.evidence_id + '-' + row.from_snapshot_id + '-' + rowIndex" class="impact-row">
        <div class="row-head"><strong>{{ row.evidence_id }} · {{ evidenceImpactLabel(row.status) }}</strong><button v-if="canCapture && row.article_id" type="button" :disabled="loading" @click="capture(row.article_id)">检查数据库当前正文</button></div>
        <p>原版本 <code>{{ row.from_snapshot_id || '不可用' }}</code></p><p>比较版本 <code>{{ row.to_snapshot_id || '不可用' }}</code></p>
        <p v-if="row.citation_mapping">引用：{{ evidenceImpactLabel(row.citation_mapping.status) }} · 原位置 [{{ row.citation_mapping.old_start }}, {{ row.citation_mapping.old_end }}) → 新位置 {{ row.citation_mapping.new_start == null ? '无法定位' : '[' + row.citation_mapping.new_start + ', ' + row.citation_mapping.new_end + ')' }}</p>
        <p>关联研判：{{ row.judgment_ids?.join('、') || '无已关联研判' }} · 关联报告：{{ row.manifest_ids?.join('、') || '无已关联报告' }}</p>
        <p v-if="row.diff?.changes_truncated || row.diff?.alignment === 'coarse' || row.diff?.changes?.some((change) => change.old_text_truncated || change.new_text_truncated)" class="diff-limited">差异已摘要或采用受限对齐，请核查完整正文后判断。</p>
        <details v-if="row.diff?.changes?.length"><summary>查看 {{ row.diff.changes.length }} 处正文差异</summary><div v-for="(change, index) in row.diff.changes" :key="index" class="change"><div><small>原文 [{{ change.old_start }}, {{ change.old_end }})</small><pre>{{ change.old_text || '（空）' }}</pre><small v-if="change.old_text_truncated">原文片段已截断</small></div><div><small>新文 [{{ change.new_start }}, {{ change.new_end }})</small><pre>{{ change.new_text || '（空）' }}</pre><small v-if="change.new_text_truncated">新文片段已截断</small></div></div></details>
        <small v-if="row.reason_codes?.length" :title="row.reason_codes.join('、')">核查原因：{{ [...new Set(row.reason_codes.map(evidenceImpactReason))].join('、') }}</small>
      </article>
      <details v-if="impact.judgment_impacts.length"><summary>研判影响链（{{ impact.judgment_impacts.length }}）</summary><p v-for="row in impact.judgment_impacts" :key="row.judgment_id">{{ row.judgment_id }} · {{ evidenceImpactLabel(row.status) }} · 证据 {{ row.evidence_ids?.join('、') }}</p></details>
      <details v-if="impact.manifest_impacts.length"><summary>历史报告影响链（{{ impact.manifest_impacts.length }}）</summary><p v-for="row in impact.manifest_impacts" :key="row.manifest_id">{{ row.manifest_id }} · v{{ row.export_version }} · {{ evidenceImpactLabel(row.status) }}</p></details>
      <small v-for="(item, index) in impact.limitations" :key="index" class="limitation">{{ item }}</small>
    </template>
  </section>
</template>
<style scoped>
.evidence-impact-panel{background:#fff;border:1px solid #dce4ef;border-radius:16px;padding:24px;margin:22px 0;color:#17233a}
header,.row-head{display:flex;align-items:center;justify-content:space-between;gap:15px}h2{font-size:20px;margin:0}p{line-height:1.65}header p{margin-bottom:0;color:#57667b}
button{border:1px solid #b9c9e1;border-radius:8px;padding:8px 12px;background:#edf4ff;color:#244f8d;cursor:pointer}button:disabled{opacity:.5}
.impact-row{border-top:1px solid #dce4ef;padding:17px 0}.impact-row p{font-size:13px;margin:8px 0}code{overflow-wrap:anywhere}.error{color:#a12727}.status{font-weight:700}.review_required{color:#976017}.unavailable{color:#a12727}
details{margin:12px 0}summary{cursor:pointer;font-weight:600}.change{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:12px 0}.change>div{min-width:0;border-radius:8px;padding:10px;background:#f5f7fa}.change>div:first-child{background:#fff0ef}.change>div:last-child{background:#edf8f0}pre{white-space:pre-wrap;overflow-wrap:anywhere;max-height:260px;overflow:auto;font:13px/1.65 sans-serif}.limitation{display:block;color:#5d6b7e}
@media(max-width:700px){header,.row-head{align-items:flex-start;flex-direction:column}.change{grid-template-columns:1fr}.evidence-impact-panel{padding:16px}}
</style>
