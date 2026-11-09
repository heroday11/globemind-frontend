export const EVIDENCE_IMPACTS_SCHEMA = 'research-evidence-impacts-v1'
const statuses = ['review_required', 'no_observed_change', 'unavailable']
export function normalizeEvidenceImpacts(payload, projectId) {
  if (payload?.schema_version !== EVIDENCE_IMPACTS_SCHEMA || payload.project_id !== projectId
    || !statuses.includes(payload.status) || !Number.isSafeInteger(payload.project_version)
    || !['evidence_impacts', 'judgment_impacts', 'manifest_impacts', 'limitations'].every((key) => Array.isArray(payload[key]))) {
    return { available: false, impact: null }
  }
  if (payload.evidence_impacts.some((row) => typeof row.evidence_id !== 'string' || !statuses.includes(row.status))) {
    return { available: false, impact: null }
  }
  return { available: true, impact: payload }
}
export function evidenceImpactLabel(status) {
  return ({
    review_required: '需要复核',
    no_observed_change: '未观察到变化',
    unavailable: '无法核验',
    unchanged: '引用未变',
    shifted: '引用位置移动',
    changed: '引用内容变化',
    deleted: '引用已删除',
    ambiguous: '引用位置有歧义',
  })[status] || '无法核验'
}

export function evidenceImpactReason(code) {
  const labels = {
    body_changed: '正文内容发生变化',
    metadata_changed: '文章来源信息发生变化',
    parser_version_changed: '正文解析方式发生变化',
    article_identity_changed: '文章标识发生变化',
    citation_binding_invalid: '引用绑定信息无法核验',
    citation_binding_unavailable: '缺少可核验的引用绑定',
    citation_removed: '原引用内容已被删除',
    citation_text_changed: '原引用内容发生变化',
    full_body_changed: '所引全文发生变化',
    repeated_citation_not_uniquely_resolved: '重复引用文本无法唯一定位',
    citation_occurrence_bound_exceeded: '引用重复过多，定位需要人工核查',
    alignment_bound_exceeded: '正文对齐超出处理范围，需要人工核查',
    snapshot_unavailable: '正文版本暂不可用',
    snapshot_content_or_metadata_invalid: '正文版本或来源信息无法核验',
    snapshot_identity_or_parser_incompatible: '版本标识或解析方式不兼容',
    BODY_REVISION_AFTER_BINDING: '引用绑定后正文又有修订',
    SOURCE_CORRECTION: '来源标记了更正',
    SOURCE_WITHDRAWAL: '来源标记了撤回',
    PROJECT_DIFF_BUDGET_EXCEEDED: '本次差异处理已达上限，请分批核查',
    PROJECT_EVIDENCE_BUDGET_EXCEEDED: '本次证据核查已达上限，请分批核查',
    BOUND_VERSION_METADATA_MISMATCH: '绑定版本的来源信息不一致',
  }
  return labels[code] || '存在待核查信息'
}
