import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  buildGroundNewsListParams,
  buildGroundNewsHomeModel,
  homeBiasSummary,
  homeSectionBadge,
  homeSourceTypeItems,
  homeTopicPath,
  createGroundNewsApi,
  formatRange,
  newsDetailPath,
  normalizeBiasBuckets,
  normalizeLeaning,
  qualityPct,
  sourcePath,
  statusLabel,
  topEntries,
} from '../src/features/ground-news/index.js'

test('list params preserve the backend query contract', () => {
  assert.deepEqual(
    buildGroundNewsListParams({
      pageSize: 18,
      minArticles: 5,
      minSources: 3,
      dateDays: 30,
      sort: 'coverage',
      quality: 'ready',
      includeFirstDetail: false,
      query: '',
      eventFamily: 'diplomacy',
    }),
    {
      page_size: 18,
      min_articles: 5,
      min_sources: 3,
      date_days: 30,
      sort: 'coverage',
      quality: 'ready',
      include_first_detail: false,
      q: undefined,
      event_family: 'diplomacy',
    },
  )
})

test('API facade owns ground-news endpoints and encodes route identifiers', async () => {
  const calls = []
  const client = {
    async get(url, options) {
      calls.push({ url, options })
      return { data: { request: calls.length } }
    },
  }
  const api = createGroundNewsApi({ client, apiRoot: '/api' })

  assert.deepEqual(await api.listStories({ query: 'trade' }), { request: 1 })
  assert.deepEqual(await api.getStory('cluster/中文 ?'), { request: 2 })
  assert.deepEqual(await api.getHome({ candidateLimit: 42, minArticles: 3 }), { request: 3 })
  assert.deepEqual(await api.getBlindspots({ pageSize: 25 }), { request: 4 })
  assert.deepEqual(await api.getTopic('trade/中文 ?', { pageSize: 30 }), { request: 5 })
  assert.deepEqual(await api.getSource('example.com/world'), { request: 6 })
  assert.deepEqual(await api.getTimeline('timeline/a+b'), { request: 7 })
  assert.deepEqual(await api.getL2Chain('chain/a+b'), { request: 8 })

  assert.equal(calls[0].url, '/api/story-graph/ground-news/list')
  assert.equal(calls[0].options.params.q, 'trade')
  assert.equal(
    calls[1].url,
    `/api/story-graph/ground-news/${encodeURIComponent('cluster/中文 ?')}`,
  )
  assert.equal(calls[2].url, '/api/story-graph/ground-news/home')
  assert.deepEqual(calls[2].options.params, { candidate_limit: 42, min_articles: 3 })
  assert.equal(calls[3].url, '/api/story-graph/ground-news/blindspots')
  assert.deepEqual(calls[3].options.params, { page_size: 25 })
  assert.equal(
    calls[4].url,
    `/api/story-graph/ground-news/topic/${encodeURIComponent('trade/中文 ?')}`,
  )
  assert.deepEqual(calls[4].options.params, { page_size: 30 })
  assert.equal(
    calls[5].url,
    `/api/story-graph/ground-news/source/${encodeURIComponent('example.com/world')}`,
  )
  assert.equal(
    calls[6].url,
    `/api/story-graph/ground-news/timeline/${encodeURIComponent('timeline/a+b')}`,
  )
  assert.equal(calls[7].url, `/api/story-graph/l2-chain/${encodeURIComponent('chain/a+b')}`)
})

test('bias normalization produces stable five-bucket percentages', () => {
  assert.equal(normalizeLeaning('government aligned'), 'state_aligned')
  assert.equal(normalizeLeaning('least-biased center'), 'center')
  assert.equal(normalizeLeaning('neutral centre'), 'center')
  assert.equal(normalizeLeaning('unrated'), 'unknown')

  const rows = normalizeBiasBuckets({ left: 2, right: 1 })
  assert.deepEqual(rows.map((row) => row.key), [
    'left',
    'center',
    'right',
    'state_aligned',
    'unknown',
  ])
  assert.ok(Math.abs(rows.find((row) => row.key === 'left').value - (200 / 3)) < 1e-9)
  assert.ok(Math.abs(rows.reduce((sum, row) => sum + row.value, 0) - 100) < 1e-9)

  const emptyRows = normalizeBiasBuckets()
  assert.equal(emptyRows.find((row) => row.key === 'unknown').value, 100)
})

test('presentation helpers keep route, ordering, and fallback behavior stable', () => {
  assert.equal(newsDetailPath('news/1'), '/data-service/news/news%2F1')
  assert.equal(sourcePath('example.com/world'), '/data-service/ground-news-source/example.com%2Fworld')
  assert.equal(sourcePath(''), '/data-service/ground-news')
  assert.equal(formatRange(null, null), '无日期')
  assert.equal(formatRange('2026-01-01T10:00:00Z', '2026-01-03'), '2026-01-01 -> 2026-01-03')
  assert.equal(qualityPct(null), '未评分')
  assert.equal(qualityPct(0.876), '88%')
  assert.equal(statusLabel('single_source'), '单一信源')
  assert.deepEqual(topEntries({ low: 1, high: 8, medium: 3 }, 2), [
    { key: 'high', value: 8 },
    { key: 'medium', value: 3 },
  ])
})

test('home model owns deterministic section, topic, source, and front-page selection', () => {
  const lead = {
    cluster_id: 'lead',
    event_family: 'diplomacy',
    article_count: 10,
    source_count: 3,
    source_names: ['A', 'B'],
    rank_score: 5,
  }
  const latest = {
    cluster_id: 'latest',
    event_family: 'economic_trade',
    article_count: 7,
    source_count: 2,
    source_names: ['A'],
    end_date: '2026-07-10',
  }
  const week = {
    cluster_id: 'week',
    event_family: 'economic_trade',
    article_count: 4,
    source_count: 2,
    source_names: ['C'],
    end_date: '2026-07-09',
  }
  const model = buildGroundNewsHomeModel({
    lead_story: lead,
    metrics: {
      source_profile_coverage: { total_profiles: 4, known_bias_profiles: 3 },
    },
    edition: { rotation_days: 4 },
    sections: [
      { key: 'latest', title: 'Latest', stories: [latest], min_articles: 2 },
      { key: 'week_watch', title: 'Week', stories: [week] },
      { key: 'diplomacy', title: 'Diplomacy', stories: [lead] },
    ],
    l2_watchlist: [{ chain_id: 'chain-1' }],
  })

  assert.equal(model.profileCoveragePct, '75%')
  assert.deepEqual(model.allHomeStories.map((story) => story.cluster_id), [
    'lead',
    'latest',
    'week',
  ])
  assert.deepEqual(model.frontLatestStories, [latest, week, lead])
  assert.deepEqual(model.frontWeekStories, [week])
  assert.deepEqual(model.latestStories, [latest, week, lead])
  assert.deepEqual(model.storySections.map((section) => section.key), ['diplomacy'])
  assert.deepEqual(model.sourceLeaders, [
    { name: 'A', count: 2 },
    { name: 'B', count: 1 },
    { name: 'C', count: 1 },
  ])
  assert.equal(model.topicChips[0].key, 'economic_trade')
  assert.equal(homeTopicPath('economy_tech', latest), '/data-service/ground-news-topic/economic_trade')
  assert.equal(
    homeSectionBadge(model.sectionByKey.latest, model.sectionByKey, model.edition),
    '2 条起 · 实时滚动 · 1 张卡片',
  )
})

test('home latest selection prioritizes event recency over the API latest bucket', () => {
  const staleFeatured = {
    cluster_id: 'stale-featured',
    event_family: 'diplomacy',
    article_count: 12,
    source_count: 6,
    end_date: '2026-06-20',
  }
  const freshStory = {
    cluster_id: 'fresh-story',
    event_family: 'military_security',
    article_count: 3,
    source_count: 2,
    end_date: '2026-07-13',
  }
  const model = buildGroundNewsHomeModel({
    sections: [
      { key: 'latest', title: 'Latest', stories: [staleFeatured], requires_image: true },
      { key: 'pulse_72h', title: 'Pulse', stories: [freshStory] },
    ],
  })

  assert.deepEqual(
    model.frontLatestStories.map((story) => story.cluster_id),
    ['fresh-story', 'stale-featured'],
  )
})

test('home model exposes stable collections for a legal empty response', () => {
  const model = buildGroundNewsHomeModel({
    lead_story: null,
    metrics: {
      total_stories: 0,
      total_articles: 0,
      source_profile_coverage: {
        total_profiles: 0,
        known_bias_profiles: 0,
      },
    },
    edition: {},
    sections: [],
    l2_watchlist: [],
  })

  assert.deepEqual(model.latestStories, [])
  assert.deepEqual(model.frontLatestStories, [])
  assert.deepEqual(model.frontWeekStories, [])
  assert.deepEqual(model.storySections, [])
  assert.deepEqual(model.l2Watchlist, [])
})

test('home page consumes latest stories through the feature model contract', async () => {
  const source = await readFile(
    new URL('../src/views/GroundNewsHome.vue', import.meta.url),
    'utf8',
  )

  assert.match(
    source,
    /const latestStories = computed\(\(\) => homeModel\.value\.latestStories\)/,
  )
})

test('home presentation helpers preserve bias and source fallbacks', () => {
  assert.equal(homeBiasSummary({}), '信源政治倾向暂未评级')
  assert.equal(
    homeBiasSummary({ political_group_pct_reviewed_known_sources: { left: 3, right: 1 } }),
    '左覆盖最高，75%',
  )
  assert.deepEqual(
    homeSourceTypeItems({ source_type_counts: { specialist_media: 2, unknown: 0 } }),
    [{ key: 'specialist_media', label: '专业媒体', value: 2 }],
  )
})

test('every routed Ground News page consumes API only through the feature entry', async () => {
  const pages = [
    'GroundNewsDesk.vue',
    'GroundNewsFeed.vue',
    'GroundNewsHome.vue',
    'GroundNewsSource.vue',
    'GroundNewsTimeline.vue',
  ]
  for (const page of pages) {
    const source = await readFile(new URL(`../src/views/${page}`, import.meta.url), 'utf8')
    assert.match(source, /from ['"]@\/features\/ground-news\/index\.js['"]/, page)
    assert.doesNotMatch(source, /@\/features\/ground-news\/(?!index\.js)/, page)
    assert.doesNotMatch(source, /\baxios\b|\bfetch\s*\(/, page)
    assert.doesNotMatch(source, /@\/config\/api/, page)
  }
})
