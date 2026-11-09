import { versionedMutation } from './model.js'
export function buildImpactResolution(project, row, form) {
  if (!row?.evidence_id || !row.from_snapshot_id || !row.to_snapshot_id || !row.latest_event_id) {
    throw new TypeError('该影响缺少可核验的正文版本或事件，请先刷新影响')
  }
  if (!['still_valid', 'needs_revision', 'withdrawn'].includes(form.disposition)) throw new TypeError('请选择处置结论')
  const rationale = String(form.rationale || '').trim()
  if (rationale.length < 3 || rationale.length > 4000) throw new TypeError('处置依据应为 3–4000 字')
  return versionedMutation(project, form.reason, {
    evidence_id: row.evidence_id, from_snapshot_id: row.from_snapshot_id,
    to_snapshot_id: row.to_snapshot_id, latest_event_id: row.latest_event_id,
    disposition: form.disposition, rationale,
    judgment_ids: Array.isArray(row.judgment_ids) ? [...row.judgment_ids] : [],
  })
}
export function resolutionProgressLabel(status) {
  return ({pending:'待人工处置',recorded:'已记录处置，继续创建并复核研判版本',stale:'已有处置过期，需针对最新变化重新处置',not_required:'本次无需处置',
    revision_required:'待创建后续研判版本',review_required:'待人工决定与复核',completed:'本轮处置及研判复核已完成',superseded:'已由后续研判版本替代',withdrawn:'已撤回',unavailable:'处置进度无法核验'})[status] || '处置进度待核查'
}

export function workflowClosureError(cause) {
  const code=cause?.code || cause?.detail?.code
  const labels={
    JUDGMENT_CURRENT_IMPACT_RESOLUTION_REQUIRED:'请先为该研判的全部当前变化记录处置，并选择对应处置记录。',
    JUDGMENT_STATEMENT_REVISION_REQUIRED:'处置结论要求修订，请修改判断内容后再创建后续版本。',
    JUDGMENT_WITHDRAWAL_REQUIRED:'本次处置要求撤回，请选择撤回判断。',
    JUDGMENT_SUPERSEDED_OR_UNKNOWN:'该研判已有后续版本或无法找到，请刷新后选择当前版本。',
    WITHDRAWN_JUDGMENT_CANNOT_BE_REACTIVATED:'撤回研判不能重新激活，请重新建立独立研究依据。',
    JUDGMENT_EVIDENCE_RELATION_MISMATCH:'支持与反方证据的关系不匹配，请重新选择。',
    JUDGMENT_RESOLUTION_NOT_APPLICABLE:'所选处置记录与当前研判变化不匹配，请仅选择本次变化的处置。',
    JUDGMENT_IMPACT_UNVERIFIABLE:'相关正文影响暂时无法核验，请补齐正文版本后重新核查。',
    JUDGMENT_NOT_CURRENT:'该研判已有后续版本，请刷新后选择当前版本。',
  }
  return labels[code] || (cause?.status===409?'项目、正文或复核状态已变化，请刷新并核查后重试。':cause?.message||'操作失败')
}

export function workflowGateReason(code) {
  const labels={
    JUDGMENT_REVISION_APPROVAL_REQUIRED:'后续研判版本需要自己的人工决定、同行审阅和负责人批准。',
    JUDGMENT_RESOLUTION_UNKNOWN_OR_UNBOUND:'研判处置记录缺失或未绑定。',
    JUDGMENT_RESOLUTION_STALE_OR_UNVERIFIABLE:'正文再次变化或处置记录无法核验，请重新处置。',
    JUDGMENT_RESOLUTION_SUPERSEDED:'处置记录已被后续处置取代，请选择最新处置。',
    JUDGMENT_WITHDRAWAL_REQUIRED:'处置结论要求撤回原研判。',
    JUDGMENT_EVIDENCE_UNKNOWN:'研判引用的证据无法找到。',
    SOURCE_IMPACT_UNAVAILABLE:'正文版本暂不可用，无法确认影响。',
    SOURCE_IMPACT_UNVERIFIABLE:'正文影响无法核验，请补齐证据版本。',
    SOURCE_IMPACT_REVISION_REQUIRED:'正文变化需要先处置并创建后续研判版本。',
    BACKGROUND_IMPACT_REVIEW_REQUIRED:'背景证据变化需要记录本次人工处置。',
    CURRENT_EVIDENCE_IMPACT_UNRESOLVED:'当前证据变化尚未完成处置。',
    CURRENT_JUDGMENT_IMPACT_UNRESOLVED:'当前研判影响尚未完成复核。',
    JUDGMENT_CURRENT_IMPACT_RESOLUTION_REQUIRED:'需要补齐当前变化的人工处置。',
    JUDGMENT_REVIEW_REQUIRED:'后续研判版本需要自己的人工决定与复核。',
    APPROVED_HUMAN_DECISION_CHAIN_MISSING:'缺少当前研判对应的人工决定、同行审阅和负责人批准。',
  }
  return labels[code] || '仍有研究步骤或当前版本复核要求未完成。'
}

export function normalizeReportReadiness(payload, projectId, projectVersion) {
  if(payload?.schema_version!=='research-report-readiness-v1' || payload.project_id!==projectId
    || payload.project_version!==projectVersion || typeof payload.ready!=='boolean'
    || !Array.isArray(payload.reason_codes) || !Array.isArray(payload.active_judgment_ids)
    || !Array.isArray(payload.withdrawn_judgment_ids))return null
  return payload
}
