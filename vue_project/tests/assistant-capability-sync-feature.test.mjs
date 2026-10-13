import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const source = path => readFile(new URL(path, import.meta.url), 'utf8')

test('academic capability selections persist to the account and DSH', async () => {
  const view = await source('../src/views/AcademicData.vue')

  assert.match(view, /GET|fetch\('\/api\/assistant\/capabilities'/)
  assert.match(view, /method: 'PUT'/)
  assert.match(view, /readSelectedSkillContent/)
  assert.match(view, /databaseCards: databaseCards\.value/)
  assert.match(view, /已同步到知识库和 DSH/)
  assert.match(view, /账户与 DSH 同步暂不可用/)
  assert.match(view, /response\.status === 404 \|\| response\.status === 405/)
  assert.match(view, /capabilitySyncUnavailable\.value/)
  assert.match(view, /getToken/)
  assert.match(view, /CAPABILITIES_SYNC_KEY/)
  assert.match(view, /hasPendingLocalChanges/)
})

test('data assistant migrates pending browser skills before launching DSH', async () => {
  const [view, bootstrap] = await Promise.all([
    source('../src/views/DataAssistant.vue'),
    source('../src/bootstrap.js'),
  ])

  assert.match(view, /syncPendingCapabilities/)
  assert.match(view, /await syncPendingCapabilities\(token\)/)
  assert.match(view, /CAPABILITIES_SYNC_KEY/)
  assert.match(view, /safeExpertSkillDocumentPath/)
  assert.match(view, /method: 'PUT'/)
  assert.match(view, /if \(!skillIds\.length && !databaseCards\.length\) return/)
  assert.match(view, /await syncPendingCapabilities\(token\)[\s\S]{0,120}requestDshLaunch\(token\)/)
  assert.match(bootstrap, /syncPendingCapabilities\(token\)/)
  assert.match(bootstrap, /method: 'PUT'/)
  assert.match(bootstrap, /syncPendingCapabilities\(token\)[\s\S]{0,120}fetch\('\/api\/assistant\/dsh-launch'/)
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
  assert.match(view, /const CURATED_SKILL_IDS = new Set/)
  assert.match(view, /skills: \(domain\.skills \|\| \[\]\)\.filter/)
  assert.match(styles, /\.featured-skill-grid/)
})
