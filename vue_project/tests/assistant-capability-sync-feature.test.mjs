import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const source = path => readFile(new URL(path, import.meta.url), 'utf8')

test('academic capability selections persist to the account and DSH', async () => {
  const view = await source('../src/views/AcademicData.vue')

  assert.match(view, /GET|fetch\('\/api\/assistant\/capabilities'/)
  assert.match(view, /method: 'PUT'/)
  assert.match(view, /readSelectedSkillContent/)
  assert.match(view, /const cards = databaseCards\.value\.slice\(\)/)
  assert.match(view, /databaseCards: cards/)
  assert.match(view, /capabilitySave\.then/)
  assert.match(view, /已同步到知识库和 DSH/)
  assert.match(view, /账户与 DSH 同步暂不可用/)
  assert.match(view, /response\.status === 404 \|\| response\.status === 405/)
  assert.match(view, /capabilitySyncUnavailable\.value/)
  assert.match(view, /getToken/)
  assert.match(view, /CAPABILITIES_SYNC_KEY/)
  assert.match(view, /hasPendingLocalChanges/)
})

test('data assistant starts alongside browser skill migration and lets users retry failed syncs', async () => {
  const [view, bootstrap] = await Promise.all([
    source('../src/views/DataAssistant.vue'),
    source('../src/bootstrap.js'),
  ])

  assert.match(view, /syncPendingCapabilities/)
  assert.match(view, /void syncCapabilities\(token\)[\s\S]{0,120}await requestDshLaunch\(token, controller\.signal\)/)
  assert.match(view, /await syncPendingCapabilities\(token, controller\.signal\)/)
  assert.match(view, /v-if="capabilitySyncFailed"[^>]*@click="syncCapabilities\(getToken\(\)\)"/)
  assert.match(bootstrap, /CAPABILITIES_SYNC_KEY/)
  assert.match(bootstrap, /safeExpertSkillDocumentPath/)
  assert.match(bootstrap, /expertSkillGroups/)
  assert.match(bootstrap, /skill\.inlineContent/)
  assert.match(bootstrap, /marketCatalog: 1/)
  assert.match(bootstrap, /if \(!skillIds\.length && !databaseCards\.length\) return/)
  assert.match(bootstrap, /syncPendingCapabilities\(token, signal\)/)
  assert.match(bootstrap, /method: 'PUT'/)
  assert.doesNotMatch(bootstrap, /createDshFrame|__GLOBEMIND_DSH_PRELAUNCH__/)
  assert.match(bootstrap, /void loadApplication\(\)/)
})

test('academic skill catalog promotes essential workflows and filters the long tail', async () => {
  const [view, styles] = await Promise.all([
    source('../src/views/AcademicData.vue'),
    source('../src/views/AcademicData.css'),
  ])

  assert.match(view, /高频通用能力/)
  assert.match(view, /const FEATURED_SKILLS = \[/)
  assert.match(view, /ppt-master-ppt-master/)
  assert.match(view, /alirez-litreview/)
  assert.match(view, /nous-arxiv/)
  assert.match(view, /globemind-docx-processing/)
  assert.match(view, /expertSkillGroups\.map/)
  assert.match(view, /group\.retainedIds\.map/)
  assert.match(styles, /\.featured-skill-grid/)
})
