import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import test from 'node:test'

import {
  createOperationsHeartbeat,
  HEARTBEAT_CLIENT_KEY,
  HEARTBEAT_ENDPOINT,
  HEARTBEAT_INTERVAL_MS,
  normalizeHeartbeatPath,
} from '../src/features/operations/index.js'

function createFakeClock() {
  let currentTime = 0
  let nextId = 1
  const tasks = new Map()

  function schedule(callback, delay, interval) {
    const id = nextId
    nextId += 1
    tasks.set(id, {
      at: currentTime + Math.max(0, Number(delay) || 0),
      callback,
      interval,
    })
    return id
  }

  async function settle() {
    for (let index = 0; index < 5; index += 1) await Promise.resolve()
  }

  return {
    now: () => currentTime,
    setTimeout: (callback, delay) => schedule(callback, delay, 0),
    clearTimeout: (id) => tasks.delete(id),
    setInterval: (callback, delay) => schedule(callback, delay, Math.max(1, delay)),
    clearInterval: (id) => tasks.delete(id),
    pendingCount: () => tasks.size,
    async advance(milliseconds) {
      const target = currentTime + milliseconds
      while (true) {
        const due = [...tasks.entries()]
          .filter(([, task]) => task.at <= target)
          .sort((left, right) => left[1].at - right[1].at || left[0] - right[0])[0]
        if (!due) break

        const [id, task] = due
        currentTime = task.at
        if (task.interval > 0) {
          tasks.set(id, { ...task, at: task.at + task.interval })
        } else {
          tasks.delete(id)
        }
        task.callback()
        await settle()
      }
      currentTime = target
      await settle()
    },
    settle,
  }
}

function createEventTarget() {
  const listeners = new Map()
  return {
    visibilityState: 'visible',
    addEventListener(type, callback) {
      if (!listeners.has(type)) listeners.set(type, new Set())
      listeners.get(type).add(callback)
    },
    removeEventListener(type, callback) {
      listeners.get(type)?.delete(callback)
    },
    dispatch(type) {
      for (const callback of listeners.get(type) || []) callback()
    },
    listenerCount(type) {
      return listeners.get(type)?.size || 0
    },
  }
}

function createStorage() {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
  }
}

function response(status, retryAfter = '') {
  return {
    status,
    headers: {
      get(name) {
        return name.toLowerCase() === 'retry-after' ? retryAfter : null
      },
    },
  }
}

function heartbeatOptions(clock, overrides = {}) {
  return {
    burstDelayMs: 100,
    clearIntervalImpl: clock.clearInterval,
    clearTimeoutImpl: clock.clearTimeout,
    intervalMs: HEARTBEAT_INTERVAL_MS,
    now: clock.now,
    randomUUID: () => '00000000-0000-4000-8000-000000000001',
    setIntervalImpl: clock.setInterval,
    setTimeoutImpl: clock.setTimeout,
    ...overrides,
  }
}

test('mount, initial route, and visibility bursts send one heartbeat with the latest state', async () => {
  const clock = createFakeClock()
  const eventTarget = createEventTarget()
  const calls = []
  let path = '/'
  const heartbeat = createOperationsHeartbeat(
    heartbeatOptions(clock, {
      eventTarget,
      fetchImpl: async (url, options) => {
        calls.push({ url, options })
        return response(200)
      },
      getPath: () => path,
      storage: createStorage(),
    }),
  )

  heartbeat.start()
  path = '/data-assistant?topic=risk'
  heartbeat.notifyRouteChange()
  eventTarget.visibilityState = 'hidden'
  eventTarget.dispatch('visibilitychange')
  path = '/data-service/story-graph'
  heartbeat.notifyRouteChange()

  await clock.advance(99)
  assert.equal(calls.length, 0)
  await clock.advance(1)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, HEARTBEAT_ENDPOINT)
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    client_id: '00000000-0000-4000-8000-000000000001',
    path: '/data-service/story-graph',
    visibility: 'hidden',
  })
  assert.equal(calls[0].options.keepalive, true)
})

test('heartbeat payloads strip query parameters, fragments, and non-route values', async () => {
  assert.equal(normalizeHeartbeatPath('/reset-password?token=secret#fragment'), '/reset-password')
  assert.equal(normalizeHeartbeatPath('https://globemind.top/private?token=secret'), '/')

  const clock = createFakeClock()
  const calls = []
  const heartbeat = createOperationsHeartbeat(
    heartbeatOptions(clock, {
      eventTarget: createEventTarget(),
      fetchImpl: async (_url, options) => {
        calls.push(JSON.parse(options.body))
        return response(200)
      },
      getPath: () => '/reset-password?token=reset-secret#fragment-secret',
      storage: createStorage(),
    }),
  )

  heartbeat.start()
  await clock.advance(100)
  assert.equal(calls[0].path, '/reset-password')
  assert.doesNotMatch(JSON.stringify(calls), /reset-secret|fragment-secret/)
})

test('the controller preserves the 30 second heartbeat interval and client id', async () => {
  const clock = createFakeClock()
  const storage = createStorage()
  const payloads = []
  const heartbeat = createOperationsHeartbeat(
    heartbeatOptions(clock, {
      eventTarget: createEventTarget(),
      fetchImpl: async (_url, options) => {
        payloads.push(JSON.parse(options.body))
        return response(200)
      },
      getPath: () => '/reports',
      storage,
    }),
  )

  heartbeat.start()
  await clock.advance(100)
  await clock.advance(HEARTBEAT_INTERVAL_MS - 100)
  assert.equal(payloads.length, 1)
  await clock.advance(100)
  assert.equal(payloads.length, 2)
  assert.equal(payloads[0].client_id, payloads[1].client_id)
  assert.equal(storage.getItem(HEARTBEAT_CLIENT_KEY), payloads[0].client_id)

  heartbeat.stop()
  const recreated = createOperationsHeartbeat(
    heartbeatOptions(clock, {
      eventTarget: createEventTarget(),
      fetchImpl: async (_url, options) => {
        payloads.push(JSON.parse(options.body))
        return response(200)
      },
      randomUUID: () => '00000000-0000-4000-8000-000000000002',
      storage,
    }),
  )
  recreated.start()
  await clock.advance(100)
  assert.equal(payloads[2].client_id, payloads[0].client_id)
})

test('429 Retry-After backs off and coalesces changes until the retry boundary', async () => {
  const clock = createFakeClock()
  const calls = []
  let path = '/first'
  const heartbeat = createOperationsHeartbeat(
    heartbeatOptions(clock, {
      eventTarget: createEventTarget(),
      fetchImpl: async (_url, options) => {
        calls.push(JSON.parse(options.body))
        return calls.length === 1 ? response(429, '2') : response(200)
      },
      getPath: () => path,
      storage: createStorage(),
    }),
  )

  heartbeat.start()
  await clock.advance(100)
  assert.equal(calls.length, 1)

  await clock.advance(400)
  path = '/latest'
  heartbeat.notifyRouteChange()
  await clock.advance(1599)
  assert.equal(calls.length, 1)
  await clock.advance(1)
  assert.equal(calls.length, 2)
  assert.equal(calls[1].path, '/latest')
})

test('stop removes timers and listeners, including a pending 429 response', async () => {
  const clock = createFakeClock()
  const eventTarget = createEventTarget()
  let resolveRequest
  let calls = 0
  const heartbeat = createOperationsHeartbeat(
    heartbeatOptions(clock, {
      eventTarget,
      fetchImpl: () => {
        calls += 1
        return new Promise((resolve) => {
          resolveRequest = resolve
        })
      },
      storage: createStorage(),
    }),
  )

  heartbeat.start()
  heartbeat.start()
  assert.equal(eventTarget.listenerCount('visibilitychange'), 1)
  await clock.advance(100)
  assert.equal(calls, 1)

  heartbeat.stop()
  assert.equal(eventTarget.listenerCount('visibilitychange'), 0)
  assert.equal(clock.pendingCount(), 0)
  resolveRequest(response(429, '60'))
  await clock.settle()
  eventTarget.dispatch('visibilitychange')
  await clock.advance(2 * HEARTBEAT_INTERVAL_MS)
  assert.equal(calls, 1)
  assert.equal(clock.pendingCount(), 0)
})

test('network failures remain isolated and do not stop future intervals', async () => {
  const clock = createFakeClock()
  let calls = 0
  const heartbeat = createOperationsHeartbeat(
    heartbeatOptions(clock, {
      eventTarget: createEventTarget(),
      fetchImpl: async () => {
        calls += 1
        if (calls === 1) throw new Error('offline')
        return response(200)
      },
      storage: createStorage(),
    }),
  )

  heartbeat.start()
  await clock.advance(100)
  await clock.advance(HEARTBEAT_INTERVAL_MS)
  assert.equal(calls, 2)
})

async function walkFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const path = `${directory}/${entry.name}`
    if (entry.isDirectory()) files.push(...(await walkFiles(path)))
    else files.push(path)
  }
  return files
}

test('App composes the operations public API and leaves a single app mount id', async () => {
  const app = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8')
  const operationsIndex = await readFile(
    new URL('../src/features/operations/index.js', import.meta.url),
    'utf8',
  )

  assert.match(
    app,
    /import \{ createOperationsHeartbeat \} from ['"]\.\/features\/operations\/index\.js['"]/,
  )
  assert.match(app, /operationsHeartbeat\.start\(\)/)
  assert.match(app, /operationsHeartbeat\.notifyRouteChange\(\)/)
  assert.match(app, /operationsHeartbeat\.stop\(\)/)
  assert.match(app, /getPath:\s*\(\) => route\.path/)
  assert.doesNotMatch(app, /getPath:[^\n]*route\.fullPath/)
  assert.doesNotMatch(app, /\bfetch\s*\(|localStorage|visibilitychange|setInterval/)
  assert.equal([...app.matchAll(/\bid=['"]app['"]/g)].length, 0)
  assert.match(app, /<div class="app-shell"/)
  assert.equal([...html.matchAll(/id=['"]app['"]/g)].length, 1)
  assert.match(operationsIndex, /from ['"]\.\/heartbeat\.js['"]/)

  const sourceRoot = new URL('../src', import.meta.url).pathname
  const sourceFiles = (await walkFiles(sourceRoot)).filter((path) => /\.(?:js|vue)$/.test(path))
  for (const path of sourceFiles) {
    const source = await readFile(path, 'utf8')
    for (const match of source.matchAll(/from ['"][^'"]*features\/operations\/([^'"]+)['"]/g)) {
      assert.equal(match[1], 'index.js', `deep operations import in ${path}`)
    }
  }
})
