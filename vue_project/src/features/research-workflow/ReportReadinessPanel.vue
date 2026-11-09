<script setup>
import {onBeforeUnmount,onMounted,ref,watch} from 'vue'
import {researchWorkflowApi} from './api.js'
import {normalizeReportReadiness,workflowGateReason} from './impact-resolution.js'
const props=defineProps({projectId:{type:String,required:true},projectVersion:{type:Number,required:true}})
const state=ref(null)
const loading=ref(false)
const error=ref('')
let generation=0
function invalidate(){generation+=1;state.value=null;loading.value=false}
onMounted(()=>window.addEventListener('auth-changed',invalidate))
onBeforeUnmount(()=>{invalidate();window.removeEventListener('auth-changed',invalidate)})
async function refresh(){
 const request=++generation
 loading.value=true
 state.value=null
 error.value=''
 try{
  const payload=await researchWorkflowApi.reportReadiness(props.projectId)
  if(request!==generation)return
  state.value=normalizeReportReadiness(payload,props.projectId,props.projectVersion)
  if(!state.value)error.value='报告准备状态无法核验，请刷新。'
 }catch(cause){if(request===generation)error.value=cause?.message||'报告准备状态暂不可用'}
 finally{if(request===generation)loading.value=false}
}
watch(()=>[props.projectId,props.projectVersion],refresh,{immediate:true})
</script>
<template>
 <section class="report-readiness">
  <header><h3>生成新报告前检查</h3><button type="button" :disabled="loading" @click="refresh">{{ loading?'核查中…':'重新检查' }}</button></header>
  <p v-if="error" role="alert">{{ error }}</p>
  <template v-if="state">
   <strong>{{ state.ready?'当前检查通过，生成时仍会再次核查':'当前报告仍有待完成事项' }}</strong>
   <ul v-if="state.reason_codes.length"><li v-for="code in state.reason_codes" :key="code" :title="code">{{ workflowGateReason(code) }}</li></ul>
   <p>当前有效研判 {{ state.active_judgment_ids.length }} 项，撤回研判 {{ state.withdrawn_judgment_ids.length }} 项。</p>
   <small>项目版本 {{ state.project_version }} · {{ state.checked_at }}。报告截止时间在创建时另行核查。</small>
  </template>
  <p v-else-if="!loading">当前无法核验报告准备状态。</p>
  <p>按当前研判及其独立决定、同行审阅和负责人批准生成新报告。旧报告保留原引用及变化事实。</p>
 </section>
</template>
<style scoped>
.report-readiness{padding:16px;border:1px solid #dce4ef;border-radius:12px;background:#f5f8fd;margin:14px 0}header{display:flex;align-items:center;justify-content:space-between;gap:10px}h3{margin:0;font-size:16px}p,li{font-size:13px;line-height:1.65}small{color:#5d6b7e}button{padding:7px 10px;border:1px solid #b9c9e1;background:#fff;border-radius:8px;cursor:pointer}
</style>
