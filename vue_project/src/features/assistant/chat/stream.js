import { createRequestAbortScope, parseSseDataBlocks } from '../state.js'

export class ChatStreamError extends Error {
  constructor(message, { code = 'stream_error', cause } = {}) {
    super(message, { cause })
    this.name = 'ChatStreamError'
    this.code = code
  }
}

export function isChatStreamAbortError(error) {
  return error instanceof ChatStreamError && error.code === 'aborted'
}

export function createTextDeltaPump(
  emit,
  {
    frameMs = 32,
    schedule = (callback) => setTimeout(callback, frameMs),
    cancelSchedule = (handle) => clearTimeout(handle),
  } = {},
) {
  if (typeof emit !== 'function') throw new TypeError('Text delta pump requires an emitter')

  let queuedText = ''
  let scheduledHandle = null
  let draining = false
  let drainChunkSize = 0
  let stopped = false
  let failure = null
  const waiters = []

  const settleWaiters = () => {
    if (queuedText || scheduledHandle != null) return
    while (waiters.length) {
      const waiter = waiters.shift()
      if (failure) waiter.reject(failure)
      else waiter.resolve()
    }
  }

  const nextChunkSize = () => {
    if (draining) return Math.max(1, drainChunkSize)
    if (queuedText.length > 1200) return 128
    if (queuedText.length > 480) return 64
    if (queuedText.length > 160) return 24
    if (queuedText.length > 48) return 10
    return Math.max(1, Math.ceil(queuedText.length / 4))
  }

  const runFrame = () => {
    scheduledHandle = null
    if (stopped || !queuedText) {
      settleWaiters()
      return
    }
    const size = Math.min(queuedText.length, nextChunkSize())
    const text = queuedText.slice(0, size)
    queuedText = queuedText.slice(size)
    try {
      emit({ step: 'text_delta', text })
    } catch (error) {
      failure = error
      queuedText = ''
    }
    if (queuedText && !failure) scheduledHandle = schedule(runFrame)
    else settleWaiters()
  }

  const ensureScheduled = () => {
    if (!stopped && !failure && queuedText && scheduledHandle == null) {
      scheduledHandle = schedule(runFrame)
    }
  }

  function enqueue(text) {
    if (stopped || failure || !text) return
    queuedText += String(text)
    ensureScheduled()
  }

  function flushNow() {
    if (stopped || failure || !queuedText) return
    if (scheduledHandle != null) {
      cancelSchedule(scheduledHandle)
      scheduledHandle = null
    }
    const text = queuedText
    queuedText = ''
    try {
      emit({ step: 'text_delta', text })
    } catch (error) {
      failure = error
    }
    settleWaiters()
  }

  function drain() {
    if (stopped) return Promise.resolve()
    draining = true
    drainChunkSize = Math.max(nextChunkSize(), Math.ceil(queuedText.length / 10))
    if (!queuedText && scheduledHandle == null) {
      if (failure) return Promise.reject(failure)
      return Promise.resolve()
    }
    ensureScheduled()
    return new Promise((resolve, reject) => waiters.push({ resolve, reject }))
  }

  function cancel() {
    stopped = true
    queuedText = ''
    if (scheduledHandle != null) cancelSchedule(scheduledHandle)
    scheduledHandle = null
    settleWaiters()
  }

  return Object.freeze({ cancel, drain, enqueue, flushNow })
}

export function createChatStreamController(
  api,
  {
    timeoutMs = 900000,
    createAbortScope = createRequestAbortScope,
    parseEvents = parseSseDataBlocks,
    TextDecoderImpl = globalThis.TextDecoder,
    createDeltaPump = createTextDeltaPump,
  } = {},
) {
  if (!api || typeof api.openAssistantStream !== 'function') {
    throw new TypeError('Chat stream controller requires the assistant stream API')
  }

  let activeRequest = null
  let requestSequence = 0
  let disposed = false

  function abort() {
    if (!activeRequest) return false
    activeRequest.scope.abort()
    return true
  }

  async function run({ requestBody, onResponse = () => {}, onEvent = () => {} }) {
    if (disposed) {
      throw new ChatStreamError('聊天流控制器已释放', { code: 'disposed' })
    }
    abort()
    const requestId = requestSequence + 1
    requestSequence = requestId
    const scope = createAbortScope(timeoutMs)
    activeRequest = { id: requestId, scope }
    let buffer = ''
    let eventCount = 0
    let terminalReceived = false
    let terminalEvent = null
    let reader = null

    const isCurrent = () => activeRequest?.id === requestId && !scope.signal.aborted
    const deltaPump = createDeltaPump((event) => {
      if (isCurrent()) onEvent(event)
    })
    const cancelDeltaPump = () => deltaPump.cancel()
    scope.signal.addEventListener?.('abort', cancelDeltaPump, { once: true })
    const consume = (events) => {
      for (const event of events) {
        if (!isCurrent()) break
        eventCount += 1
        if (event?.step === 'text_delta' && event.text) {
          deltaPump.enqueue(event.text)
        } else if (event?.step === 'done') {
          terminalReceived = true
          terminalEvent = event
        } else {
          // Preserve protocol order for infrequent context/tool/error events.
          deltaPump.flushNow()
          onEvent(event)
        }
      }
    }

    try {
      const response = await api.openAssistantStream(requestBody, { signal: scope.signal })
      if (!isCurrent()) {
        throw new ChatStreamError('聊天生成已停止', { code: 'aborted' })
      }
      onResponse(response)
      if (!response.body?.getReader) {
        throw new Error('浏览器不支持流式读取（ReadableStream）')
      }
      reader = response.body.getReader()
      const decoder = new TextDecoderImpl()
      while (isCurrent()) {
        let chunk
        try {
          chunk = await reader.read()
        } catch (error) {
          if (!isCurrent()) break
          throw error
        }
        if (chunk.done) break
        buffer += decoder.decode(chunk.value, { stream: true })
        const parsed = parseEvents(buffer)
        buffer = parsed.rest
        consume(parsed.events)
        if (terminalReceived) break
      }
      if (!isCurrent()) {
        throw new ChatStreamError('聊天生成已停止', { code: 'aborted' })
      }
      if (!terminalReceived) {
        buffer += decoder.decode()
        if (buffer.trim()) consume(parseEvents(`${buffer}\n\n`).events)
      }
      await deltaPump.drain()
      if (!isCurrent()) {
        throw new ChatStreamError('聊天生成已停止', { code: 'aborted' })
      }
      if (terminalEvent) onEvent(terminalEvent)
      return { eventCount }
    } catch (error) {
      if (scope.signal.aborted || activeRequest?.id !== requestId) {
        if (isChatStreamAbortError(error)) throw error
        throw new ChatStreamError('聊天生成已停止', { code: 'aborted', cause: error })
      }
      throw error
    } finally {
      scope.signal.removeEventListener?.('abort', cancelDeltaPump)
      deltaPump.cancel()
      if (reader) {
        try {
          await reader.cancel()
        } catch {
          /* Ignore stream cancellation errors during cleanup. */
        }
      }
      scope.dispose()
      if (activeRequest?.id === requestId) activeRequest = null
    }
  }

  function dispose() {
    disposed = true
    abort()
  }

  return Object.freeze({
    abort,
    dispose,
    get isRunning() {
      return Boolean(activeRequest && !activeRequest.scope.signal.aborted)
    },
    run,
  })
}
