<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { workflowClosureError } from './impact-resolution.js'
import { researchWorkflowApi } from './api.js'
import { currentJudgmentLeaves, buildJudgmentRevision } from './judgment-revision.js'
const props=defineProps({project:{type:Object,required:true},canEdit:Boolean})
const emit=defineEmits(['project-updated','revision-created'])
const selectedId=ref('')
const loading=ref(false)
const error=ref('')
const notice=ref('')
const leaves=computed(()=>currentJudgmentLeaves(props.project).filter(row=>row.lineage?.status!=='withdrawn'))
const original=computed(()=>leaves.value.find(row=>row.id===selectedId.value)||null)
const form=reactive({statement:'',uncertainty:'',supporting_evidence_ids:[],opposing_evidence_ids:[],information_gap_ids:[],alternative_hypothesis_ids:[],resolution_ids:[],status:'active',reason:'根据正文变化创建研判后续版本'})
const resolutions=computed(()=>(props.project.impact_resolutions||[]).filter(row=>row.judgment_ids?.includes(selectedId.value)))
let generation=0
function invalidate(){generation+=1;loading.value=false;error.value='';notice.value=''}
function authChanged(){invalidate();selectedId.value=''}
onMounted(()=>window.addEventListener('auth-changed',authChanged))
onBeforeUnmount(()=>{invalidate();window.removeEventListener('auth-changed',authChanged)})
watch(()=>props.project.id,()=>{invalidate();selectedId.value=''})
watch(original,row=>{
  for(const key of ['supporting_evidence_ids','opposing_evidence_ids','information_gap_ids','alternative_hypothesis_ids'])form[key]=[...(row?.[key]||[])]
  form.statement=row?.statement||''
  form.uncertainty=row?.uncertainty||''
  form.status='active'
  form.resolution_ids=[]
  error.value=''
})
watch(leaves,rows=>{if(!rows.some(row=>row.id===selectedId.value))selectedId.value=rows[0]?.id||''},{immediate:true})
async function save(){
  if(!original.value)return
  const request=++generation
  const predecessor=original.value.id
  loading.value=true
  error.value=''
  try{
    const next=await researchWorkflowApi.addJudgmentRevision(props.project.id,buildJudgmentRevision(props.project,original.value,form))
    if(request!==generation)return
    const successor=next.judgments?.find(row=>row.lineage?.supersedes_id===predecessor)
    if(!successor)throw new Error('新研判版本响应无法核验，请刷新项目查看')
    notice.value='后续研判版本已保存。请为新版本记录人工决定，再进行同行审阅和负责人批准。'
    emit('project-updated',next)
    emit('revision-created',successor)
  }catch(cause){
    if(request===generation)error.value=workflowClosureError(cause)
  }finally{if(request===generation)loading.value=false}
}
</script>
<template>
  <section class="judgment-revision-panel">
    <h2>处置后创建研判版本</h2>
    <p>选择当前研判并形成后续版本。旧研判和已保存报告继续保留原文与原引用。</p>
    <p v-if="notice" role="status">{{ notice }}</p>
    <p v-if="error" role="alert" class="error">{{ error }}</p>
    <form v-if="canEdit && leaves.length" @submit.prevent="save">
      <label>当前研判<select v-model="selectedId" required><option v-for="row in leaves" :key="row.id" :value="row.id">{{ row.lineage?.version?'v'+row.lineage.version:'初始版' }} · {{ row.statement.slice(0,90) }} · {{ row.id }}</option></select></label>
      <template v-if="original">
        <label>后续版本状态<select v-model="form.status"><option value="active">有效判断（需要新决定和复核）</option><option value="withdrawn">撤回判断</option></select></label>
        <label>判断<textarea v-model="form.statement" required minlength="4" maxlength="6000" rows="4"></textarea></label>
        <fieldset><legend>支持证据（至少一项）</legend><label v-for="row in project.evidence_items.filter(item=>item.relation==='support')" :key="row.id" class="choice"><input v-model="form.supporting_evidence_ids" type="checkbox" :value="row.id" /><span>{{ row.summary }} · {{ row.id }}</span></label></fieldset>
        <fieldset><legend>反方证据</legend><label v-for="row in project.evidence_items.filter(item=>item.relation==='opposing')" :key="row.id" class="choice"><input v-model="form.opposing_evidence_ids" type="checkbox" :value="row.id" /><span>{{ row.summary }} · {{ row.id }}</span></label></fieldset>
        <details><summary>信息缺口与替代假设</summary><fieldset><legend>信息缺口</legend><label v-for="row in project.information_gaps" :key="row.id" class="choice"><input v-model="form.information_gap_ids" type="checkbox" :value="row.id" /><span>{{ row.description }} · {{ row.id }}</span></label></fieldset><fieldset><legend>替代假设</legend><label v-for="row in project.alternative_hypotheses" :key="row.id" class="choice"><input v-model="form.alternative_hypothesis_ids" type="checkbox" :value="row.id" /><span>{{ row.statement }} · {{ row.id }}</span></label></fieldset></details>
        <fieldset><legend>本次影响处置依据</legend><p v-if="!resolutions.length">尚无关联处置记录；如正文有变化，请先在影响面板记录处置。</p><label v-for="row in resolutions" :key="row.id" class="choice"><input v-model="form.resolution_ids" type="checkbox" :value="row.id" /><span>{{ row.disposition }} · {{ row.rationale }} · {{ row.id }}</span></label></fieldset>
        <small>服务器会重新核查处置记录是否覆盖全部变化。旧事件的处置不能替代新变化的处置。</small>
        <label>不确定性<textarea v-model="form.uncertainty" required minlength="2" maxlength="4000" rows="3"></textarea></label>
        <label>版本变更理由<input v-model="form.reason" required minlength="3" maxlength="500" /></label>
        <button :disabled="loading">{{ loading?'保存中…':'创建后续研判版本' }}</button>
      </template>
    </form>
    <p v-else-if="!leaves.length">项目尚无研判。先记录初始判断，再根据变化形成后续版本。</p>
    <ul v-if="project.judgments?.length" class="version-chain"><li v-for="row in project.judgments" :key="row.id">{{ row.id }} · {{ row.lineage?.version?'版本 '+row.lineage.version:'初始版本' }} · {{ row.lineage?.status==='withdrawn'?'已撤回':'有效记录' }}<span v-if="row.lineage?.supersedes_id"> · 承接 {{ row.lineage.supersedes_id }}</span></li></ul>
  </section>
</template>
<style scoped>
.judgment-revision-panel{background:#fff;border:1px solid #dce4ef;border-radius:16px;padding:24px;margin:22px 0;color:#17233a}h2{font-size:20px;margin:0}p{line-height:1.65}label{display:grid;gap:5px;margin:12px 0}input,select,textarea{box-sizing:border-box;width:100%;border:1px solid #bfccdb;border-radius:8px;padding:8px;color:inherit;background:#fff;font:inherit}.choice{display:flex;align-items:flex-start;gap:8px}.choice input{width:auto;margin-top:5px}.choice span{overflow-wrap:anywhere}fieldset{border:1px solid #dce4ef;border-radius:8px;margin:12px 0}summary{cursor:pointer}small{color:#5d6b7e}button{padding:9px 14px;border:1px solid #b9c9e1;background:#edf4ff;border-radius:8px;cursor:pointer}button:disabled{opacity:.5}.error{color:#a12727}.version-chain{font-size:12px;line-height:1.8;overflow-wrap:anywhere;padding-left:20px}@media(max-width:700px){.judgment-revision-panel{padding:16px}}
</style>
