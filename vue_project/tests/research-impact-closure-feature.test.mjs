import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {parse,compileScript,compileTemplate} from '@vue/compiler-sfc'
import {buildImpactResolution,resolutionProgressLabel,normalizeReportReadiness,workflowGateReason} from '../src/features/research-workflow/impact-resolution.js'
import {buildJudgmentRevision,currentJudgmentLeaves} from '../src/features/research-workflow/judgment-revision.js'
import {createResearchWorkflowApi} from '../src/features/research-workflow/api.js'

test('resolution binds current evidence event and versions without declaring the review complete',()=>{
 const row={evidence_id:'e1',from_snapshot_id:'old',to_snapshot_id:'new',latest_event_id:'evt2',judgment_ids:['j1']}
 const payload=buildImpactResolution({version:8},row,{disposition:'still_valid',rationale:'引用外修订不改变原判断',reason:'人工核查正文变化'})
 assert.deepEqual(payload,{evidence_id:'e1',from_snapshot_id:'old',to_snapshot_id:'new',latest_event_id:'evt2',disposition:'still_valid',rationale:'引用外修订不改变原判断',judgment_ids:['j1'],expected_version:8,reason:'人工核查正文变化'})
 assert.throws(()=>buildImpactResolution({version:8},{...row,latest_event_id:null},{disposition:'still_valid',rationale:'核查依据',reason:'核查原因'}))
 assert.match(resolutionProgressLabel('recorded'),/继续创建并复核/)
 assert.match(resolutionProgressLabel('stale'),/重新处置/)
})
test('revision copies selected relations and immutable predecessor while only current leaves are selectable',()=>{
 const project={version:4,judgments:[{id:'j1'},{id:'j2',lineage:{supersedes_id:'j1'}}]}
 assert.deepEqual(currentJudgmentLeaves(project).map(row=>row.id),['j2'])
 const form={statement:'后续修订判断',uncertainty:'尚待核查',supporting_evidence_ids:['e2'],opposing_evidence_ids:['e3'],information_gap_ids:['g1'],alternative_hypothesis_ids:['h1'],resolution_ids:['r1'],status:'active',reason:'根据变化重做研判'}
 assert.throws(()=>buildJudgmentRevision(project,{id:'j1'},form))
 const payload=buildJudgmentRevision(project,{id:'j2'},form)
 assert.equal(payload.supersedes_id,'j2')
 assert.equal(payload.expected_version,4)
 assert.deepEqual(payload.resolution_ids,['r1'])
 payload.supporting_evidence_ids.push('other')
 assert.deepEqual(form.supporting_evidence_ids,['e2'])
})
test('closure APIs preserve auth and server conflict reason codes without arbitrary details',async()=>{
 const calls=[]
 const api=createResearchWorkflowApi({apiPrefix:'/api',getAccessToken:()=> 'test',fetchImpl:async(url,options)=>{
 calls.push({url,options})
 return {ok:!url.endsWith('/exports'),status:409,headers:{get:()=> 'application/json'},json:async()=>({detail:{code:'GATE_BLOCKED',reason_codes:['JUDGMENT_REVIEW_REQUIRED','<script>'],secret:'no'}})}
 }})
 await api.addImpactResolution('p/1',{expected_version:4,latest_event_id:'evt2'})
 await api.addJudgmentRevision('p/1',{supersedes_id:'j1',resolution_ids:['r1']})
 assert.equal(calls[0].url,'/api/research/projects/p%2F1/impact-resolutions')
 assert.equal(calls[1].url,'/api/research/projects/p%2F1/judgment-revisions')
 assert.equal(calls[1].options.headers.Authorization,'Bearer test')
 await assert.rejects(()=>api.createExportManifest('p/1',{}),cause=>{
 assert.deepEqual(cause.detail,{code:'GATE_BLOCKED',reason_codes:['JUDGMENT_REVIEW_REQUIRED']});return true
 })
})
for(const name of ['ImpactDispositionForm','JudgmentRevisionPanel','ReportReadinessPanel']){
 test(name+' compiles against real bindings',async()=>{
 const source=await readFile(new URL('../src/features/research-workflow/'+name+'.vue',import.meta.url),'utf8')
 const {descriptor}=parse(source)
 const script=compileScript(descriptor,{id:name})
 const template=compileTemplate({source:descriptor.template.content,filename:name+'.vue',id:name,compilerOptions:{bindingMetadata:script.bindings}})
 assert.deepEqual(template.errors,[])
 })
}

test('report preparation preview rejects an outdated project version and shows actionable current gates',()=>{
 const payload={schema_version:'research-report-readiness-v1',project_id:'p',project_version:5,ready:false,reason_codes:['JUDGMENT_REVISION_APPROVAL_REQUIRED'],active_judgment_ids:['j2'],withdrawn_judgment_ids:[]}
 assert.equal(normalizeReportReadiness(payload,'p',4),null)
 assert.equal(normalizeReportReadiness(payload,'p',5).ready,false)
 assert.match(workflowGateReason('JUDGMENT_REVISION_APPROVAL_REQUIRED'),/自己的人工决定/)
})
