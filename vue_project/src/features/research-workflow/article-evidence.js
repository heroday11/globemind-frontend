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
  if (cause?.status === 409 || code === 'VERSION_CONFLICT') {
    return '项目版本或正文引用发生冲突，请重新打开并核对摘录；重复摘录需选择包含更多上下文的文本。'
  }
  return cause?.message || '文章加入项目失败，请稍后重试'
}
