export const CHAT_STREAM_ERROR_FALLBACK = 'CC 流式错误'

export function createChatStreamMessage(overrides = {}) {
  return {
    role: 'assistant',
    text: '',
    thinking: '',
    showDetailChip: false,
    storedFullReply: '',
    finishReason: '',
    truncated: false,
    retryCount: 0,
    retryReason: '',
    agentTraces: [],
    detailIndex: 1,
    toolCalls: [],
    ...overrides,
  }
}

export function createChatStreamState({
  message = createChatStreamMessage(),
  fullReply = '',
  error = '',
  newsHits = [],
  clusterHits = [],
} = {}) {
  return {
    message: {
      ...message,
      text: String(message?.text || ''),
      thinking: String(message?.thinking || ''),
      storedFullReply: String(message?.storedFullReply || ''),
      finishReason: String(message?.finishReason || ''),
      truncated: Boolean(message?.truncated),
      toolCalls: Array.isArray(message?.toolCalls) ? [...message.toolCalls] : [],
      agentTraces: Array.isArray(message?.agentTraces)
        ? message.agentTraces.map((trace) => ({ ...trace }))
        : [],
      sources: Array.isArray(message?.sources) ? [...message.sources] : [],
    },
    fullReply: String(fullReply || ''),
    error: String(error || ''),
    newsHits: Array.isArray(newsHits) ? newsHits : [],
    clusterHits: Array.isArray(clusterHits) ? clusterHits : [],
  }
}

export function chatStreamEventError(event, fallback = CHAT_STREAM_ERROR_FALLBACK) {
  const detail = event?.detail
  if (typeof detail === 'string') return detail
  if (detail && typeof detail === 'object') return JSON.stringify(detail)
  return event?.msg || fallback
}

export function reduceChatStreamEvent(
  state,
  event,
  {
    normalizeWebSourceGroups = () => [],
    sourceGroupsFromToolResult = () => [],
    mergeSourceGroups = (existing, incoming) => [...existing, ...incoming],
  } = {},
) {
  const current = createChatStreamState(state)
  const next = {
    ...current,
    message: { ...current.message },
  }
  const effects = {
    contextUpdated: false,
    pageActionPhase: '',
    sessionId: null,
    shouldScroll: false,
  }

  if (event?.step === 'context') {
    next.newsHits = Array.isArray(event.news_hits) ? event.news_hits : []
    next.clusterHits = Array.isArray(event.cluster_hits) ? event.cluster_hits : []
    effects.contextUpdated = true
    if (Array.isArray(event.web_sources) && event.web_sources.length) {
      next.message.sources = mergeSourceGroups(
        current.message.sources,
        normalizeWebSourceGroups(event.web_sources),
      )
    }
    if (event.session_id != null) effects.sessionId = event.session_id
  } else if (event?.step === 'text_delta' && event.text) {
    const delta = String(event.text)
    next.fullReply += delta
    next.message.text += delta
    effects.shouldScroll = true
  } else if (event?.step === 'text_replace') {
    const replacement = String(event.text || '')
    next.fullReply = replacement
    next.message.text = replacement
    effects.shouldScroll = true
  } else if (event?.step === 'thinking_delta' && event.text) {
    if (event.agent_role === 'subagent') {
      const sessionId = String(event.session_id || 'subagent')
      const traces = current.message.agentTraces.map((trace) => ({ ...trace }))
      const index = traces.findIndex((trace) => trace.sessionId === sessionId)
      if (index >= 0) traces[index].thinking = String(traces[index].thinking || '') + String(event.text)
      else traces.push({ sessionId, thinking: String(event.text), text: '' })
      next.message.agentTraces = traces
    } else {
      next.message.thinking += String(event.text)
    }
    effects.shouldScroll = true
  } else if (event?.step === 'subagent_text_delta' && event.text) {
    const sessionId = String(event.session_id || 'subagent')
    const traces = current.message.agentTraces.map((trace) => ({ ...trace }))
    const index = traces.findIndex((trace) => trace.sessionId === sessionId)
    if (index >= 0) traces[index].text = String(traces[index].text || '') + String(event.text)
    else traces.push({ sessionId, thinking: '', text: String(event.text) })
    next.message.agentTraces = traces
    effects.shouldScroll = true
  } else if (event?.step === 'tool_executing') {
    const callId = String(event.call_id || '')
    const toolCalls = current.message.toolCalls.map((tool) => ({ ...tool }))
    const existingIndex = callId
      ? toolCalls.findIndex((tool) => tool.callId === callId)
      : -1
    const toolCall = {
      type: 'tool_executing',
      name: event.tool || 'tool',
      callId,
      sessionId: String(event.session_id || ''),
      agentRole: String(event.agent_role || 'root'),
      label: event.label || '',
      input: event.input ?? null,
      argumentsText: String(event.arguments || ''),
      invoke: event.invoke || {},
    }
    if (existingIndex >= 0) toolCalls[existingIndex] = { ...toolCalls[existingIndex], ...toolCall }
    else toolCalls.push(toolCall)
    next.message.toolCalls = toolCalls
    effects.pageActionPhase = 'executing'
    effects.shouldScroll = true
  } else if (event?.step === 'tool_update') {
    const callId = String(event.call_id || '')
    const toolCalls = current.message.toolCalls.map((tool) => ({ ...tool }))
    const index = toolCalls.findIndex((tool) => tool.callId === callId)
    const update = {
      name: event.tool || 'tool',
      callId,
      sessionId: String(event.session_id || ''),
      agentRole: String(event.agent_role || 'root'),
      label: event.label || '',
      input: event.input ?? null,
      argumentsText: String(event.arguments || ''),
      invoke: event.invoke || {},
    }
    if (index >= 0) toolCalls[index] = { ...toolCalls[index], ...update }
    else toolCalls.push({ type: 'tool_executing', ...update })
    next.message.toolCalls = toolCalls
    effects.pageActionPhase = 'executing'
    effects.shouldScroll = true
  } else if (event?.step === 'tool_finished') {
    const toolCalls = current.message.toolCalls.map((tool) => ({ ...tool }))
    const callId = String(event.call_id || '')
    const index = callId
      ? toolCalls.findIndex((tool) => tool.callId === callId)
      : toolCalls.map((tool) => tool.name).lastIndexOf(event.tool)
    if (index >= 0 && toolCalls[index].type === 'tool_executing') {
      toolCalls[index] = {
        ...toolCalls[index],
        type: 'tool_finished',
        label: event.label || event.result?.label || toolCalls[index].label || '',
        result: event.result || {},
      }
    } else {
      toolCalls.push({
        type: 'tool_finished',
        name: event.tool || '',
        callId,
        sessionId: String(event.session_id || ''),
        agentRole: String(event.agent_role || 'root'),
        label: event.label || event.result?.label || '',
        result: event.result || {},
        invoke: {},
        input: {},
      })
    }
    next.message.toolCalls = toolCalls
    const groups = sourceGroupsFromToolResult(event.tool, event.result)
    if (groups.length) {
      next.message.sources = mergeSourceGroups(current.message.sources, groups)
    }
    effects.pageActionPhase = 'finished'
    effects.shouldScroll = true
  } else if (event?.step === 'subagent_started') {
    const callId = String(event.call_id || event.child_session_id || '')
    const toolCalls = current.message.toolCalls.map((tool) => ({ ...tool }))
    const index = toolCalls.findIndex((tool) => tool.callId === callId)
    const subagent = {
      type: 'tool_executing',
      name: 'subagent',
      callId,
      label: 'subagent',
      input: event.description ? { description: event.description } : null,
      argumentsText: String(event.description || ''),
      invoke: { kind: 'dsh_subagent' },
    }
    if (index >= 0) toolCalls[index] = { ...toolCalls[index], ...subagent }
    else toolCalls.push(subagent)
    next.message.toolCalls = toolCalls
    effects.pageActionPhase = 'executing'
    effects.shouldScroll = true
  } else if (event?.step === 'subagent_finished') {
    const callId = String(event.call_id || event.child_session_id || '')
    const toolCalls = current.message.toolCalls.map((tool) => ({ ...tool }))
    const index = toolCalls.findIndex((tool) => tool.callId === callId)
    if (index >= 0) {
      toolCalls[index] = {
        ...toolCalls[index],
        type: 'tool_finished',
        result: event.result || { ok: true },
      }
    }
    next.message.toolCalls = toolCalls
    effects.pageActionPhase = 'finished'
    effects.shouldScroll = true
  } else if (event?.step === 'retry') {
    const nextAttempt = Number(next.message.retryCount || 0) + 1
    next.message.retryCount = Number(event.attempt || nextAttempt)
    next.message.retryReason = String(event.reason || '')
    effects.shouldScroll = true
  } else if (event?.step === 'done' && event.reply != null) {
    const finalReply = String(event.reply)
    next.fullReply = finalReply
    next.message.storedFullReply = finalReply
    next.message.text = finalReply
    next.message.finishReason = String(event.finish_reason || '')
    next.message.truncated = Boolean(event.truncated || event.finish_reason === 'length')
    next.message.statusLine = ''
  } else if (event?.step === 'error') {
    next.error = chatStreamEventError(event)
  }

  return { effects, state: next }
}

export function finalizeChatStreamState(state) {
  const next = createChatStreamState(state)
  if (next.error) {
    next.message.text = next.message.text
      ? `${next.message.text}\n\n【错误】${next.error}`
      : `【错误】${next.error}`
    next.message.storedFullReply = next.message.text
  } else if (!next.message.storedFullReply && next.fullReply) {
    next.message.storedFullReply = next.fullReply
  }
  return next
}
