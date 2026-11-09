import { versionedMutation } from './model.js'
export function currentJudgmentLeaves(project) {
  const rows=Array.isArray(project?.judgments)?project.judgments:[]
  const replaced=new Set(rows.map(row=>row.lineage?.supersedes_id).filter(Boolean))
  return rows.filter(row=>!replaced.has(row.id))
}
export function buildJudgmentRevision(project, original, form) {
  if(!original?.id || !currentJudgmentLeaves(project).some(row=>row.id===original.id))throw new TypeError('请选择当前研判版本')
  const statement=String(form.statement||'').trim()
  const uncertainty=String(form.uncertainty||'').trim()
  if(statement.length<4 || statement.length>6000)throw new TypeError('判断应为 4–6000 字')
  if(uncertainty.length<2 || uncertainty.length>4000)throw new TypeError('请填写不确定性')
  if(!Array.isArray(form.supporting_evidence_ids)||!form.supporting_evidence_ids.length)throw new TypeError('请至少选择一项支持证据')
  return versionedMutation(project,form.reason,{
    supersedes_id:original.id,status:form.status,statement,uncertainty,
    supporting_evidence_ids:[...form.supporting_evidence_ids],
    opposing_evidence_ids:[...form.opposing_evidence_ids],
    information_gap_ids:[...form.information_gap_ids],
    alternative_hypothesis_ids:[...form.alternative_hypothesis_ids],
    resolution_ids:[...form.resolution_ids],
  })
}
