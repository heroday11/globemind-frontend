import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function source(path) {
  return readFile(new URL(path, import.meta.url), 'utf8')
}

test('guided tour owns cross-route steps and real spotlight targets', async () => {
  const guide = await source('../src/components/NewUserGuide.vue')
  const appNav = await source('../src/components/appNav.vue')
  const home = await source('../src/views/appHome.vue')
  const search = await source('../src/views/DataService/data-search.vue')
  const story = await source('../src/views/StoryGraphView.vue')
  const sentiment = await source('../src/views/sentimentAnalysis.vue')
  const groundHome = await source('../src/views/GroundNewsHome.vue')
  const groundDesk = await source('../src/views/GroundNewsDesk.vue')
  const knowledge = await source('../src/views/AcademicData.vue')
  const financial = await source('../src/views/FinancialTerminal.vue')
  const assistant = await source('../src/features/assistant/AssistantExperience.vue')
  const report = await source('../src/views/DataService/report-center.vue')

  assert.match(guide, /globemind_new_user_guide_v3/)
  assert.match(guide, /await router\.push\(nextRoute\)/)
  assert.match(guide, /scrollIntoView/)
  assert.match(guide, /transitionState/)
  assert.match(guide, /tour-route-status/)
  assert.match(guide, /教程目录/)
  assert.match(guide, /120; attempt/)
  assert.match(guide, /tour-spotlight/)
  assert.match(guide, /tour-dimmer--cutout/)
  assert.match(guide, /backdrop-filter: none/)
  assert.match(appNav, /data-tour="global-search"/)
  assert.match(home, /data-tour="home-capabilities"/)
  assert.match(groundHome, /data-tour="ground-news-edition"/)
  assert.match(groundDesk, /data-tour="ground-desk-analysis"/)
  assert.match(search, /data-tour="search-form"/)
  assert.match(search, /data-tour="search-result-tools"/)
  assert.match(story, /data-tour="story-canvas"/)
  assert.match(sentiment, /data-tour="sentiment-chart"/)
  assert.match(knowledge, /data-tour="knowledge-skills"/)
  assert.match(financial, /data-tour="financial-terminal"/)
  assert.match(assistant, /data-tour="assistant-auth-gate"/)
  assert.match(report, /data-tour="report-auth-gate"/)
})

test('logged-out users receive persistent and page-specific access explanations', async () => {
  const app = await source('../src/App.vue')
  const guest = await source('../src/components/GuestAccessBanner.vue')
  const assistant = await source('../src/features/assistant/AssistantExperience.vue')
  const report = await source('../src/views/DataService/report-center.vue')

  assert.match(app, /<GuestAccessBanner \/>/)
  assert.match(guest, /当前为访客模式/)
  assert.match(guest, /收藏、数据助手、报告和个人配置需要登录/)
  assert.match(assistant, /免费注册/)
  assert.match(report, /登录后管理你的报告/)
  assert.match(report, /v-if="!hasToken"/)
})

test('user center keeps a replay entry for the tutorial', async () => {
  const userCenter = await source('../src/views/UserCenter.vue')
  assert.match(userCenter, /data-tour="account-guide-entry"/)
  assert.match(userCenter, /重看新手教程/)
  assert.match(userCenter, /openGlobeMindGuide/)
})
