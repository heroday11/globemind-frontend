import assert from 'node:assert/strict'
import test from 'node:test'
import { homeRegionalMix, buildGroundNewsHomeModel } from '../src/features/ground-news/home.js'
import { createGroundNewsApi } from '../src/features/ground-news/api.js'

const story = (id, foreign, date = '2026-11-23') => ({
  cluster_id: id, foreign_article_count: foreign ? 1 : 0, origin_article_count: 1,
  source_count: 1, article_count: 1, end_date: date,
})

test('regional cards retain foreign majority alongside local news', () => {
  const rows = [...Array.from({ length: 8 }, (_, i) => story('local-' + i, false)),
    ...Array.from({ length: 8 }, (_, i) => story('foreign-' + i, true))]
  const chosen = homeRegionalMix(rows, 10)
  assert.equal(chosen.length, 10)
  assert.equal(chosen.filter((row) => row.foreign_article_count).length, 7)
  assert.equal(chosen[0].foreign_article_count, 1)
})

test('regional shortage uses only available stories and never duplicates them', () => {
  const only = story('only', false)
  assert.deepEqual(homeRegionalMix([only, only], 6), [only])
  assert.deepEqual(homeRegionalMix([], 6), [])
})

test('regional hero keeps chosen foreign reporting when another image has a higher score', () => {
  const foreign = story('foreign', true)
  const local = { ...story('local', false), rank_score: 999, cover: { image_url: '/local.jpg' } }
  const model = buildGroundNewsHomeModel({ scope: 'gba', lead_story: foreign,
    sections: [{ key: 'latest', stories: [local, foreign] }] })
  assert.equal(model.leadStory.cluster_id, 'foreign')
})

test('scope belongs to each API request and cannot leak into the global page', async () => {
  const calls = []
  const api = createGroundNewsApi({ apiRoot: '/api', client: { get: async (url, config) => {
    calls.push({ url, ...config }); return { data: {} }
  } } })
  await api.getHome({ scope: 'gba' })
  await api.getHome()
  assert.equal(calls[0].params.scope, 'gba')
  assert.equal(calls[1].params.scope, undefined)
})
