import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)

test('all GlobeMind assistant surfaces use DSH and the legacy experience is removed', async () => {
  const [routeView, routes, drawer, publicEntry, bootstrap] = await Promise.all([
    readFile(new URL('src/views/DataAssistant.vue', root), 'utf8'),
    readFile(new URL('src/router/index.js', root), 'utf8'),
    readFile(new URL('src/features/assistant/AssistantDrawer.vue', root), 'utf8'),
    readFile(new URL('src/features/assistant/index.js', root), 'utf8'),
    readFile(new URL('src/bootstrap.js', root), 'utf8'),
  ])

  assert.match(routeView, /fetch\(['"]\/api\/assistant\/dsh-launch['"]/)
  assert.match(routeView, /<iframe/)
  assert.match(routeView, /:src="frameUrl"/)
  assert.match(routeView, /import LoginModal from ['"]@\/components\/LoginModal\.vue['"]/)
  assert.match(routeView, /<LoginModal :visible="showLoginModal"/)
  assert.match(routeView, /showLoginModal\.value = true/)
  assert.match(routeView, /loginRequired \? ['"]登录['"] : ['"]重新连接['"]/)
  assert.doesNotMatch(routeView, /AssistantExperience|研究工作台|智能体模式|activeMode/)
  assert.match(routeView, /height:\s*calc\(100dvh - 64px\)/)
  assert.match(routeView, /height:\s*calc\(100dvh - 56px\)/)
  assert.match(routeView, /assistant-page--embedded[\s\S]{0,100}margin-top:\s*0/)
  assert.match(routes, /path:\s*['"]\/data-assistant['"][\s\S]{0,180}hideNavbar:\s*false/)
  assert.doesNotMatch(bootstrap, /createDshFrame|__GLOBEMIND_DSH_PRELAUNCH__/)
  assert.match(bootstrap, /void loadApplication\(\)/)
  assert.match(drawer, /import DataAssistant from ['"]@\/views\/DataAssistant\.vue['"]/)
  assert.doesNotMatch(drawer, /AssistantExperience/)
  assert.match(publicEntry, /export \{ default as AssistantDrawer \}/)
  assert.doesNotMatch(publicEntry, /AssistantExperience/)

  for (const path of [
    'src/features/assistant/AssistantExperience.vue',
    'src/features/assistant/components/style.css',
  ]) {
    await assert.rejects(readFile(new URL(path, root), 'utf8'), error => error?.code === 'ENOENT')
  }
})

test('DSH fills the content area without a second assistant navigation shell', async () => {
  const [view, app] = await Promise.all([
    readFile(new URL('src/views/DataAssistant.vue', root), 'utf8'),
    readFile(new URL('src/App.vue', root), 'utf8'),
  ])
  const template = view.split('<template>')[1].split('</template>')[0]
  assert.equal((template.match(/<iframe/g) || []).length, 1)
  assert.doesNotMatch(template, /<aside|<nav|class="sidebar"|class="heading"|class="topbar"|<h1/)
  assert.match(app, /<appNav/)
  assert.match(view, /\.dsh-frame\s*\{[^}]*width:\s*100%;[^}]*height:\s*100%;[^}]*border:\s*0/s)
  assert.doesNotMatch(view, /min-height:\s*460px|max-width:\s*1080px|loadSchedules/)
  assert.match(view, /\.assistant-page--embedded\s*\{[^}]*height:\s*100%;[^}]*margin-top:\s*0/s)
})
