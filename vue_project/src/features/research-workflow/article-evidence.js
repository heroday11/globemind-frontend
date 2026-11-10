export function buildArticleEvidenceValues({ relation, summary, quote = '' }) {
  if (!['support', 'opposing', 'background'].includes(relation)) throw new TypeError('请选择证据关系')
  const text = String(summary || '').trim()
  if (text.length < 2 || text.length > 4000) throw new TypeError('研究摘要应为 2–4000 字')
  const exact = String(quote || '').trim()
  if (Array.from(exact).length > 20000) throw new TypeError('原文摘录最多 20000 字')
  return { relation, summary: text, ...(exact ? { quote: { exact } } : {}) }
}

export function articleBindingError(cause) {
  const code = cause?.code || cause?.detail?.code
  const candidateReason = cause?.detail?.reason_code
  const reason = /^[A-Z][A-Z0-9_]{1,127}$/.test(String(candidateReason || '')) ? candidateReason : ''
  if (cause?.status === 409 || code === 'VERSION_CONFLICT') {
    return '项目版本或正文引用发生冲突，请重新打开并核对摘录；重复摘录需选择包含更多上下文的文本。'
  }
  if (code === 'EVIDENCE_SNAPSHOT_VERIFICATION_UNAVAILABLE') {
    return reason
      ? '正文快照未能完成保存或验证（' + reason + '）。文章尚未加入项目，请稍后重试；若持续出现，请将此错误代码提供给管理员。'
      : '正文快照服务暂不可用，文章尚未加入项目。请稍后重试；若持续出现，请联系管理员检查证据账本。'
  }
  if (code === 'RESEARCH_STORAGE_UNAVAILABLE') {
    return reason
      ? '研究项目存储暂不可用（' + reason + '），文章尚未加入项目。请稍后重试；若持续出现，请将此错误代码提供给管理员。'
      : '研究项目存储暂不可用，文章尚未加入项目。请稍后重试。'
  }
  if (cause?.status === 503) {
    return '服务器暂时无法保存文章证据（503），文章尚未加入项目。请稍后重试。'
  }
  return cause?.message || '文章加入项目失败，请稍后重试'
}
