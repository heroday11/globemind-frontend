import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  L2_RUN_ID,
  L3_RUN_ID,
  buildMacroDisplayEdges,
  buildStoryGraphEvidenceParams,
  buildStoryGraphListRequest,
  buildStoryGraphWorkspaceRequest,
  buildStorySummaryLine,
  createStoryGraphApi,
  familyLabel,
  filterStorySummaries,
  formatRange,
  hasStoryGraphEvidenceTarget,
  normalizeMacroLane,
  orderStoryNodes,
  storyGraphAdapterConfig,
  transformL2ChainResponse,
  transformL3MacroResponse,
} from '../src/features/story-graph/index.js'

test('story graph API requests preserve L2/L3 endpoint and parameter contracts', async () => {
  assert.deepEqual(buildStoryGraphListRequest('l3'), {
    path: '/story-graph/l3-macro/list',
    params: { page_size: 100, min_chains: 8, run_id: L3_RUN_ID },
  })
  assert.deepEqual(buildStoryGraphListRequest('l2'), {
    path: '/story-graph/l2-chain/list',
    params: { page_size: 100, min_segments: 2, run_id: L2_RUN_ID },
  })
  assert.deepEqual(buildStoryGraphWorkspaceRequest('l3', 'macro/a b'), {
    path: '/story-graph/l3-macro/macro%2Fa%20b',
    params: { run_id: L3_RUN_ID, max_nodes: 56 },
  })

  const calls = []
  const client = {
    async get(url, options) {
      calls.push({ url, options })
      return { data: { request: calls.length } }
    },
  }
  const api = createStoryGraphApi({ client, apiRoot: '/api', assistantApiRoot: '/api' })
  const signal = new AbortController().signal

  assert.deepEqual(await api.listStories('l2'), { request: 1 })
  assert.deepEqual(await api.getWorkspace('l3', 'macro/a b', { signal }), { request: 2 })
  assert.deepEqual(await api.getEvidence({ limit: 60, segment_id: 's/1' }, { signal }), {
    request: 3,
  })
  assert.deepEqual(
    await api.getAssistantSessionMessages('session/a b', { token: 'test-token', signal }),
    { request: 4 },
  )
  assert.equal(calls[0].url, '/api/story-graph/l2-chain/list')
  assert.equal(calls[1].url, '/api/story-graph/l3-macro/macro%2Fa%20b')
  assert.equal(calls[1].options.signal, signal)
  assert.equal(calls[2].url, '/api/story-graph/evidence')
  assert.equal(calls[3].url, '/api/assistant/sessions/session%2Fa%20b/messages')
  assert.deepEqual(calls[3].options.headers, {
    Accept: 'application/json',
    Authorization: 'Bearer test-token',
  })
  assert.equal(calls[3].options.signal, signal)
  assert.equal(calls[3].options.withCredentials, true)
})

test('evidence params select exactly one node identity contract', () => {
  assert.deepEqual(
    buildStoryGraphEvidenceParams(
      { kind: 'l3-chain', l2ChainId: 'chain-1' },
      { currentL2RunId: 'run-current' },
    ),
    { limit: 60, chain_id: 'chain-1', run_id: 'run-current' },
  )
  assert.deepEqual(
    buildStoryGraphEvidenceParams({ kind: 'l2-segment', segmentId: 'segment-1' }),
    { limit: 60, segment_id: 'segment-1' },
  )
  assert.deepEqual(buildStoryGraphEvidenceParams({ originalClusterId: 'cluster-1' }), {
    limit: 60,
    cluster_id: 'cluster-1',
  })
  assert.equal(hasStoryGraphEvidenceTarget({ limit: 60 }), false)
})

test('L3 response normalization creates renderer-ready nodes, edges, and metadata', () => {
  const graph = transformL3MacroResponse({
    macro: {
      macro_id: 'macro-1',
      title: 'Macro title',
      family_group: 'conflict',
      l2_chain_count: 4,
      article_count: 12,
    },
    nodes: [
      {
        l2_chain_id: 'chain-1',
        title: 'Chain one',
        lane: 'diplomacy',
        metadata: { initiator: 'A', target: 'B' },
      },
    ],
    edges: [{ from_chain_id: 'chain-1', to_chain_id: 'chain-2', edge_weight: 0.8 }],
    visible_node_count: 1,
  })

  assert.equal(graph.source, 'l3-macro')
  assert.equal(graph.story_id, 'macro-1')
  assert.equal(graph.nodes[0].source_kind, 'l3-chain')
  assert.equal(graph.nodes[0].l2_run_id, L2_RUN_ID)
  assert.equal(graph.nodes[0].initiator, 'A')
  assert.equal(graph.edges[0].edge_type, 'macro_sequence')
  assert.equal(graph.meta.run_id, L3_RUN_ID)
  assert.equal(graph.meta.total_node_count, 4)
})

test('L2 response normalization preserves pair and encoded detail navigation', () => {
  const graph = transformL2ChainResponse({
    chain: {
      chain_id: 'chain-1',
      title: 'Chain title',
      pair_key: 'Actor A -> Actor B',
      event_family: 'diplomacy',
    },
    nodes: [
      {
        segment_id: 'segment-1',
        title: 'Segment',
        l1_cluster_id: 'cluster/a b',
        story_angle: 'main_event',
      },
    ],
    edges: [{ from_id: 'segment-1', to_id: 'segment-2', edge_weight: 0.6 }],
  })

  assert.deepEqual(graph.meta.pair_key, ['Actor A', 'Actor B'])
  assert.equal(graph.nodes[0].source_kind, 'l2-segment')
  assert.equal(
    graph.nodes[0].detail_url,
    '/data-service/ground-news-desk?cluster_id=cluster%2Fa%20b',
  )
  assert.equal(graph.edges[0].edge_type, 'continuation')
})

test('flow model orders nodes and synthesizes stable macro lane edges', () => {
  const nodes = [{ id: 'c' }, { id: 'a' }, { id: 'b' }]
  const edges = [
    { from_id: 'a', to_id: 'b' },
    { from_id: 'b', to_id: 'c' },
  ]
  assert.deepEqual(orderStoryNodes(nodes, edges).map((node) => node.id), ['a', 'b', 'c'])
  assert.equal(normalizeMacroLane({ lane: 'military_security' }), 'conflict')

  const orderedNodes = [
    { id: 'c1', lane: 'conflict', node_order: 1 },
    { id: 'd1', lane: 'diplomacy', node_order: 2 },
    { id: 'c2', lane: 'conflict', node_order: 3 },
    { id: 'd2', lane: 'diplomacy', node_order: 4 },
  ]
  const displayEdges = buildMacroDisplayEdges(
    { storyId: 'macro-1', orderedNodes },
    [{ from_id: 'd2', to_id: 'c2', edge_type: 'influence', layer: 'story' }],
  )
  assert.ok(displayEdges.some((edge) => edge.edge_type === 'macro_sequence' && edge.synthetic))
  assert.ok(displayEdges.some((edge) => edge.edge_type === 'branch_sequence' && edge.synthetic))
  assert.ok(displayEdges.some((edge) => edge.edge_type === 'branch' && edge.synthetic))
  assert.ok(displayEdges.some((edge) => edge.edge_type === 'influence' && !edge.synthetic))
})

test('presentation and adapter configuration remain deterministic', () => {
  const stories = [
    { id: '1', title: 'Trade conflict', initiator: 'A' },
    { id: '2', title: 'Diplomatic visit', initiator: 'B' },
  ]
  assert.deepEqual(filterStorySummaries(stories, 'trade'), [stories[0]])
  assert.equal(formatRange('2026-01-01T08:00:00Z', '2026-01-03'), '2026-01-01 → 2026-01-03')
  assert.equal(familyLabel('diplomacy'), '外交谈判')
  assert.match(
    buildStorySummaryLine({
      source: 'l2-chain',
      start_date: '2026-01-01',
      end_date: '2026-01-03',
      meta: { pair_key: ['A', 'B'], dominant_type: 'diplomacy', chain_quality: 'strong' },
    }),
    /A ↔ B.*外交谈判.*强关联/,
  )
  assert.deepEqual(storyGraphAdapterConfig.fitViewOptions, { padding: 0.12, duration: 0 })
  assert.equal(storyGraphAdapterConfig.storageKeyPrefix, 'globemind:story-graph-layout:v2:')
})

test('route consumes story graph only through the feature public entry', async () => {
  const pageUrl = new URL('../src/views/StoryGraphView.vue', import.meta.url)
  const source = await readFile(pageUrl, 'utf8')
  assert.match(source, /from ['"]@\/features\/story-graph\/index\.js['"]/)
  assert.doesNotMatch(source, /@\/features\/story-graph\/(?!index\.js)/)
  assert.doesNotMatch(source, /story-graph-react-flow/)
  assert.doesNotMatch(source, /\baxios\b|\bfetch\s*\(/)
  assert.doesNotMatch(source, /@\/config\/api/)
})
