import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc'
import { createResearchWorkflowApi, versionedMutation } from '../src/features/research-workflow/index.js'
import { buildArticleEvidenceValues, articleBindingError } from '../src/features/research-workflow/article-evidence.js'
import { normalizeEvidenceImpacts, evidenceImpactLabel, evidenceImpactReason } from '../src/features/research-workflow/evidence-impacts.js'

test('article binding transmits exact quote without UTF16-derived offsets and omits an empty quote', () => {
  assert.deepEqual(buildArticleEvidenceValues({relation:'support',summary:'摘要',quote:'  证据😀原文  '}), {relation:'support',summary:'摘要',quote:{exact:'证据😀原文'}})
  assert.deepEqual(buildArticleEvidenceValues({relation:'background',summary:'摘要',quote:'  '}), {relation:'background',summary:'摘要'})
  assert.throws(() => buildArticleEvidenceValues({relation:'unknown',summary:'摘要'}))
  assert.throws(() => buildArticleEvidenceValues({relation:'support',summary:'x'}))
})
test('binding uses latest optimistic project version and exposes conflict recovery', () => {
  const body = versionedMutation({version:12}, '加入正文证据', buildArticleEvidenceValues({relation:'opposing',summary:'反方依据'}))
  assert.equal(body.expected_version,12)
  assert.match(articleBindingError({status:409}), /冲突/)
})
test('article binding, capture and impact API preserve token, URLs and optimistic predecessors', async () => {
  const calls = []
  const api = createResearchWorkflowApi({apiPrefix:'/api',getAccessToken:()=> 'token',fetchImpl:async(url,options)=>{
    calls.push({url,options}); return {ok:true,headers:{get:()=> 'application/json'},json:async()=>({})}
  }})
  await api.addArticleEvidence('p/1',22,{expected_version:3,reason:'加入证据',relation:'support',summary:'正文'})
  await api.evidenceImpacts('p/1')
  await api.articleEvidenceHistory(22)
  await api.captureArticleEvidence(22,{expected_previous_event_id:'evt-1',change_type:'update',reason:'检查正文'})
  assert.equal(calls[0].url,'/api/research/projects/p%2F1/articles/22/evidence')
  assert.equal(calls[0].options.method,'POST')
  assert.equal(JSON.parse(calls[0].options.body).expected_version,3)
  assert.equal(calls[1].url,'/api/research/projects/p%2F1/evidence-impacts')
  assert.equal(calls[2].url,'/api/evidence-ledger/articles/22/history')
  assert.equal(JSON.parse(calls[3].options.body).expected_previous_event_id,'evt-1')
  assert.ok(calls.every(c=>c.options.headers.Authorization==='Bearer token'))
})
test('unknown and unavailable impact contracts never become no observed change', () => {
  const payload = {schema_version:'research-evidence-impacts-v1',project_id:'p',project_version:3,status:'unavailable',evidence_impacts:[],judgment_impacts:[],manifest_impacts:[],limitations:[]}
  assert.equal(normalizeEvidenceImpacts(payload,'p').impact.status,'unavailable')
  assert.equal(normalizeEvidenceImpacts(payload,'other').available,false)
  assert.equal(normalizeEvidenceImpacts({...payload,status:'none'},'p').available,false)
  assert.equal(normalizeEvidenceImpacts({...payload,evidence_impacts:[{evidence_id:'e',status:'none'}]},'p').available,false)
  assert.equal(evidenceImpactLabel('unavailable'),'无法核验')
})
for (const name of ['ArticleProjectEvidence','EvidenceImpactPanel']) {
  test(name + ' compiles with real Vue bindings', async () => {
    const source=await readFile(new URL('../src/features/research-workflow/'+name+'.vue',import.meta.url),'utf8')
    const {descriptor}=parse(source)
    const script=compileScript(descriptor,{id:name})
    const template=compileTemplate({source:descriptor.template.content,filename:name+'.vue',id:name,compilerOptions:{bindingMetadata:script.bindings}})
    assert.deepEqual(template.errors,[])
  })
}

test('impact reasons give readable labels and a conservative unknown fallback', () => {
  assert.equal(evidenceImpactReason('body_changed'), '正文内容发生变化')
  assert.equal(evidenceImpactReason('SOURCE_WITHDRAWAL'), '来源标记了撤回')
  assert.equal(evidenceImpactReason('FUTURE_CODE'), '存在待核查信息')
})
