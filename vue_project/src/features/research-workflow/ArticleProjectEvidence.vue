<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { researchWorkflowApi, versionedMutation } from './index.js'
import { buildArticleEvidenceValues, articleBindingError } from './article-evidence.js'
const props = defineProps({ articleId: { type: Number, required: true }, articleTitle: { type: String, default: '' } })
const open = ref(false)
const loading = ref(false)
const projects = ref([])
const selectedId = ref('')
const relation = ref('support')
const summary = ref('')
const quote = ref('')
const reason = ref('将文章正文作为研究项目证据')
const error = ref('')
const result = ref(null)
const projectLink = computed(() => `/research-workspace?project=${encodeURIComponent(selectedId.value)}`)
let generation = 0
function authChanged() {
  generation += 1
  open.value = false
  loading.value = false
  result.value = null
  projects.value = []
  selectedId.value = ''
}
onMounted(() => window.addEventListener('auth-changed', authChanged))
onBeforeUnmount(() => { generation += 1; window.removeEventListener('auth-changed', authChanged) })
watch(() => props.articleId, () => {
  generation += 1
  open.value = false
  loading.value = false
  result.value = null
  error.value = ''
})
async function show() {
  const selection = globalThis.getSelection?.()
  const node = selection?.anchorNode?.parentElement
  quote.value = node?.closest('.detail-body') ? String(selection).trim() : ''
  summary.value = props.articleTitle
  error.value = ''
  result.value = null
  open.value = true
  loading.value = true
  const request = ++generation
  try {
    const response = await researchWorkflowApi.listProjects()
    if (request !== generation) return
    projects.value = (response.projects || []).filter((item) => item.role === 'owner')
    selectedId.value = projects.value.find((item) => item.id === selectedId.value)?.id || projects.value[0]?.id || ''
  } catch (cause) {
    if (request === generation) error.value = articleBindingError(cause)
  } finally {
    if (request === generation) loading.value = false
  }
}
async function save() {
  const articleId = props.articleId
  const projectId = selectedId.value
  if (!projectId || loading.value) return
  const request = ++generation
  loading.value = true
  error.value = ''
  try {
    const project = await researchWorkflowApi.getProject(projectId)
    if (request !== generation) return
    const values = buildArticleEvidenceValues({ relation: relation.value, summary: summary.value, quote: quote.value })
    const next = await researchWorkflowApi.addArticleEvidence(projectId, articleId, versionedMutation(project, reason.value, values))
    if (request !== generation) return
    result.value = next.evidence_items?.at(-1) || null
    if (!result.value?.citation_binding) throw new Error('绑定响应未包含引用位置，请重新打开项目核查')
  } catch (cause) {
    if (request === generation) error.value = articleBindingError(cause)
  } finally {
    if (request === generation) loading.value = false
  }
}
</script>

<template>
  <button type="button" class="article-project-trigger" @click="show">加入研究项目</button>
  <Teleport to="body">
    <div v-if="open" class="article-project-overlay" @keydown.esc="open = false">
      <section class="article-project-dialog" role="dialog" aria-modal="true" aria-labelledby="article-project-title">
        <header><h2 id="article-project-title">文章加入研究项目</h2><button type="button" aria-label="关闭加入项目" @click="open = false">关闭</button></header>
        <p>保存数据库当前正文，并固定本次引用的正文版本和位置。</p>
        <p v-if="error" role="alert" class="error">{{ error }}</p>
        <div v-if="result" role="status">
          <strong>文章已加入，正文版本和引用位置已绑定。</strong>
          <p>证据：{{ result.id }}</p>
          <p class="snapshot">{{ result.evidence_snapshot_id }}</p>
          <p>引用位置：{{ result.citation_binding.start }}–{{ result.citation_binding.end }}（Unicode 码点，右端不包含）</p>
          <RouterLink :to="projectLink">打开项目查看证据与影响追踪</RouterLink>
        </div>
        <form v-else @submit.prevent="save">
          <p v-if="!loading && !projects.length">暂无可编辑项目。<RouterLink to="/research-workspace">先创建研究项目</RouterLink></p>
          <label>研究项目<select v-model="selectedId" required :disabled="loading"><option value="" disabled>请选择项目</option><option v-for="item in projects" :key="item.id" :value="item.id">{{ item.title }}</option></select></label>
          <label>证据关系<select v-model="relation"><option value="support">支持证据</option><option value="opposing">反方证据</option><option value="background">背景证据</option></select></label>
          <label>研究摘要<textarea v-model="summary" required minlength="2" maxlength="4000" rows="3"></textarea></label>
          <label>原文摘录（选填，留空引用全文）<textarea v-model="quote" maxlength="20000" rows="4" placeholder="可先在文章原文选中文字再点击加入，或粘贴原文摘录。"></textarea></label>
          <small>摘录由服务器在规范正文中精确定位；重复或已改变的文本会要求重新选择。</small>
          <label>加入理由<input v-model="reason" required minlength="3" maxlength="500" /></label>
          <button type="submit" :disabled="loading || !selectedId">{{ loading ? '正在读取并绑定…' : '保存正文版本并加入' }}</button>
        </form>
      </section>
    </div>
  </Teleport>
</template>
<style scoped>
.article-project-trigger{border:1px solid #b5c6e0;border-radius:10px;background:#edf4ff;color:#244f8d;padding:9px 13px;cursor:pointer;font:inherit}
.article-project-overlay{position:fixed;inset:0;z-index:4000;background:#14253d88;display:grid;place-items:center;padding:20px}
.article-project-dialog{background:white;color:#17233a;width:min(600px,100%);max-height:90vh;overflow:auto;border-radius:18px;padding:24px;box-shadow:0 20px 70px #07172e44;font:14px/1.6 sans-serif}
header{display:flex;justify-content:space-between;align-items:center;gap:15px}h2{margin:0;font-size:21px}
label{display:grid;gap:5px;margin:13px 0}input,select,textarea{box-sizing:border-box;width:100%;border:1px solid #bfccdb;border-radius:8px;padding:9px;color:inherit;background:white;font:inherit}
button{cursor:pointer;border:1px solid #c5d2e3;background:#edf4ff;border-radius:8px;padding:8px 13px;color:#244f8d}button:disabled{opacity:.55;cursor:wait}
small{color:#59677b}.error{color:#a12727}.snapshot{overflow-wrap:anywhere;font-family:monospace}
</style>
