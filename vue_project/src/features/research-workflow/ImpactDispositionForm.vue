<script setup>
import { onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { researchWorkflowApi } from './api.js'
import { buildImpactResolution, resolutionProgressLabel } from './impact-resolution.js'
const props = defineProps({project:{type:Object,required:true},row:{type:Object,required:true},canResolve:Boolean})
const emit = defineEmits(['project-updated'])
const form = reactive({disposition:'needs_revision',rationale:'',reason:'核查正文变化并记录影响处置'})
const loading = ref(false)
const error = ref('')
let generation = 0
function invalidate() { generation += 1; error.value=''; loading.value=false }
onMounted(()=>window.addEventListener('auth-changed',invalidate))
onBeforeUnmount(()=>{invalidate();window.removeEventListener('auth-changed',invalidate)})
watch(()=>[props.project.id,props.row.latest_event_id,props.row.to_snapshot_id],()=>{invalidate();form.rationale=''})
async function save() {
  const request=++generation
  loading.value=true
  error.value=''
  try {
    const payload=buildImpactResolution(props.project,props.row,form)
    const next=await researchWorkflowApi.addImpactResolution(props.project.id,payload)
    if(request!==generation)return
    emit('project-updated',next)
  } catch(cause) {
    if(request===generation)error.value=cause?.status===409?'项目或正文又有变化，请刷新后针对最新事件重新处置。':cause?.message||'处置记录保存失败'
  } finally {if(request===generation)loading.value=false}
}
</script>
<template>
  <div class="impact-resolution">
    <p v-if="row.resolution_summary" class="progress">{{ resolutionProgressLabel(row.resolution_summary.status) }}</p>
    <p v-if="row.resolution_summary?.resolutions?.length">已匹配本次变化的处置：{{ row.resolution_summary.resolutions.map(item=>item.id).join('、') }}</p>
    <details v-if="canResolve && row.status !== 'no_observed_change' && project.evidence_items?.some(item => item.id === row.evidence_id && item.evidence_snapshot_id === row.from_snapshot_id)">
      <summary>记录本次变化的人工处置</summary>
      <p>此记录绑定当前正文事件和新旧版本。后续正文变化需要重新处置；处置后仍需创建研判后续版本并复核。</p>
      <p v-if="!row.latest_event_id || !row.to_snapshot_id">版本或事件尚无法核验，请先刷新。</p>
      <form @submit.prevent="save">
        <label>处置结论<select v-model="form.disposition"><option value="still_valid">核查后原判断仍成立</option><option value="needs_revision">需要修订判断</option><option value="withdrawn">撤回原依据或判断</option></select></label>
        <label>核查依据<textarea v-model="form.rationale" required minlength="3" maxlength="4000" rows="3" placeholder="说明查看了哪些变化，以及为何保留、修订或撤回。"></textarea></label>
        <label>记录理由<input v-model="form.reason" required minlength="3" maxlength="500" /></label>
        <p v-if="error" role="alert">{{ error }}</p>
        <button type="submit" :disabled="loading || !row.latest_event_id || !row.to_snapshot_id">{{ loading?'保存中…':'保存本次处置' }}</button>
      </form>
    </details>
  </div>
</template>
<style scoped>
.impact-resolution{border-left:3px solid #b9c9e1;padding-left:14px;margin:12px 0;font-size:13px}.progress{font-weight:600}summary{cursor:pointer;color:#244f8d}label{display:grid;gap:5px;margin:12px 0}input,select,textarea{box-sizing:border-box;width:100%;border:1px solid #bfccdb;border-radius:8px;padding:8px;color:inherit;background:#fff;font:inherit}button{padding:8px 12px;border:1px solid #b9c9e1;background:#edf4ff;border-radius:8px;cursor:pointer}button:disabled{opacity:.5}
</style>
