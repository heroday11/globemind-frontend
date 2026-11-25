export function createLatestRequestGate() {
  let generation = 0
  return Object.freeze({
    begin() {
      generation += 1
      return generation
    },
    invalidate() {
      generation += 1
      return generation
    },
    isCurrent(token) {
      return token === generation
    },
  })
}

function modeItemLabel(mode) {
  return mode === 'l2' ? '走势链' : '大事件'
}

export function buildStoryGraphQueryStatus(kind, {
  count = 0,
  mode = 'l3',
  query = '',
} = {}) {
  const itemLabel = modeItemLabel(mode)
  const normalizedQuery = String(query || '').trim()
  const normalizedCount = Math.max(0, Number(count) || 0)
  const messages = {
    idle: `请选择${itemLabel}。`,
    'list-loading': `正在加载${itemLabel}库…`,
    'list-empty': `暂无${itemLabel}。`,
    'workspace-empty': `所选${itemLabel}暂无事件节点。`,
    'search-empty': `没有找到与「${normalizedQuery}」匹配的${itemLabel}。`,
    'selection-required': normalizedQuery
      ? `找到 ${normalizedCount} 条结果，请选择一条查看。`
      : `请选择${itemLabel}。`,
    'workspace-loading': `正在加载${itemLabel}…`,
    ready: '',
    error: `暂时无法加载${itemLabel}，请重试。`,
  }
  const normalizedKind = Object.hasOwn(messages, kind) ? kind : 'idle'
  return Object.freeze({
    kind: normalizedKind,
    message: messages[normalizedKind],
    role: normalizedKind === 'error' ? 'alert' : 'status',
  })
}
