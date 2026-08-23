import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import test from 'node:test'

import { createRoutePreloaders } from '../src/router/routePreloaders.js'

const PRELOAD_GROUPS = {
  '/': ['appHome'],
  '/data-service/ground-news': ['dataServiceShell', 'groundNewsHome'],
  '/sentiment-analysis': ['sentimentAnalysis'],
  '/data-service/story-graph': ['dataServiceShell', 'storyGraph'],
  '/data-service/data-search': ['dataServiceShell', 'dataSearch'],
  '/data-service/report-center': ['dataServiceShell', 'reportCenter'],
  '/data-service/pipeline-monitor': ['dataServiceShell', 'pipelineMonitor'],
  '/data-assistant': ['dataAssistant'],
  '/financial-terminal': ['financialTerminal'],
  '/academic-data': ['academicData'],
  '/about-us': ['aboutUs'],
  '/user-center/personal-center': ['userCenter', 'personalCenter'],
}

test('route preloader composition preserves every previous lazy view group', async () => {
  const calls = []
  const keys = new Set(Object.values(PRELOAD_GROUPS).flat())
  const loaders = Object.fromEntries(
    [...keys].map((key) => [
      key,
      async () => {
        calls.push(key)
        return key
      },
    ]),
  )
  const preloaders = createRoutePreloaders(loaders)

  assert.deepEqual(Object.keys(preloaders), Object.keys(PRELOAD_GROUPS))
  for (const [path, expectedCalls] of Object.entries(PRELOAD_GROUPS)) {
    await preloaders[path]()
    assert.deepEqual(calls.splice(0), expectedCalls, path)
  }
})

test('missing route loader fails closed instead of silently skipping a chunk', async () => {
  const preloaders = createRoutePreloaders({})
  assert.throws(() => preloaders['/data-assistant'](), /Missing route view loader: dataAssistant/)
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

test('shared candidates receive preload descriptors without importing route views', async () => {
  const appNav = await readFile(new URL('../src/components/appNav.vue', import.meta.url), 'utf8')
  const app = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')
  const router = await readFile(new URL('../src/router/index.js', import.meta.url), 'utf8')

  assert.match(appNav, /routePreloaders:\s*\{[\s\S]*required:\s*true/)
  assert.match(appNav, /const loader = props\.routePreloaders\[path\]/)
  assert.match(appNav, /const primaryPreloadTimers = new Set\(\)/)
  assert.match(appNav, /primaryPreloadTimers\.delete\(timer\)/)
  assert.match(appNav, /for \(const timer of primaryPreloadTimers\)/)
  assert.match(appNav, /primaryPreloadTimers\.clear\(\)/)
  assert.match(app, /import \{ routePreloaders \} from ['"]\.\/router\/routePreloaders\.js['"]/)
  assert.match(app, /<appNav :route-preloaders="routePreloaders" \/>/)
  assert.match(router, /import \{ routeViewLoaders \} from ['"]\.\/routePreloaders\.js['"]/)

  const sourceRoot = new URL('../src/', import.meta.url).pathname
  for (const directory of ['components', 'utils', 'config', 'shared']) {
    const root = `${sourceRoot}${directory}`
    let files
    try {
      files = await walkFiles(root)
    } catch (error) {
      if (error?.code === 'ENOENT') continue
      throw error
    }
    for (const path of files.filter((file) => /\.(?:js|jsx|ts|tsx|vue)$/.test(file))) {
      const source = await readFile(path, 'utf8')
      assert.doesNotMatch(source, /@\/views\//, path)
    }
  }
})

test('router and navigation preloads share the same lazy loader functions', async () => {
  const router = await readFile(new URL('../src/router/index.js', import.meta.url), 'utf8')
  const source = await readFile(new URL('../src/router/routePreloaders.js', import.meta.url), 'utf8')

  for (const key of new Set(Object.values(PRELOAD_GROUPS).flat())) {
    assert.match(router, new RegExp(`component: routeViewLoaders\\.${key}`), key)
  }
  assert.equal([...source.matchAll(/=> import\(['"]@\/views\//g)].length, 14)
})
