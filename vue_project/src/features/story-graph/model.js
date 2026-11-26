import { buildMacroRelatedLinks } from './flow-model.js'
import { getStoryInteractions } from './interactions.js'
import { L2_RUN_ID, L3_RUN_ID } from './config.js'
import { normalizeStoryRelationClaim } from './claims.js'
import { cleanEntityLabel, cleanStoryTitle, macroStoryTitle } from './presentation.js'
import { normalizeGraphSampling } from './sampling.js'
import { normalizeStoryRelation } from '../../governance/storyRelations.js'

function countOrNull(value) {
  return typeof value === 'number'
    && Number.isSafeInteger(value)
    && value >= 0
    && value <= 2_147_483_647
    ? value
    : null
}

export function normalizeL3MacroSummary(macro) {
  return {
    ...macro,
    id: macro.macro_id,
    title: macro.title,
    display_title: macroStoryTitle(macro),
    event_type: macro.family_group,
    article_count: countOrNull(macro.article_count),
    segment_count: countOrNull(macro.segment_count),
    l2_chain_count: countOrNull(macro.l2_chain_count),
    cluster_count: countOrNull(macro.l2_chain_count),
    quality_score: null,
    importance_score: null,
  }
}

export function normalizeL2ChainSummary(chain) {
  return {
    ...chain,
    id: chain.chain_id,
    title: chain.title,
    event_type: chain.event_family || chain.family_group,
    article_count: countOrNull(chain.article_count),
    segment_count: countOrNull(chain.segment_count),
    cluster_count: countOrNull(chain.segment_count),
    quality_score: null,
    chain_quality: null,
  }
}

const PERSPECTIVE_BY_CATEGORY = new Map([
  ['economic_security', 'economy'],
  ['economic_trade', 'economy'],
  ['technology_industry', 'economy'],
  ['economic', 'economy'],
  ['culture', 'culture'],
  ['culture_sports', 'culture'],
  ['culture_religion', 'culture'],
  ['political_diplomacy', 'politics'],
  ['domestic_politics', 'politics'],
  ['law_policy', 'politics'],
  ['diplomacy', 'politics'],
  ['political', 'politics'],
  ['security', 'security'],
  ['military_security', 'security'],
  ['civil_unrest', 'security'],
  ['security_crime', 'security'],
  ['terrorism_espionage', 'security'],
  ['conflict', 'security'],
  ['humanitarian_public', 'society'],
  ['human_rights_migration', 'society'],
  ['public_development', 'society'],
  ['disaster_environment', 'society'],
])

export function transformL3MacroResponse(payload) {
  const macro = payload.macro || {}
  const macroId = String(macro.macro_id || payload.macro_id || '')
  const runId = payload.run_id || macro.run_id || L3_RUN_ID
  const storyTitle = macroStoryTitle(macro) || '未命名大事件'
  const rawNodes = payload.nodes || []
  const storyNodes = rawNodes.map((node, index) => ({
    id: node.l2_chain_id || `l3-node-${index + 1}`,
    l2_chain_id: node.l2_chain_id,
    source_kind: 'l3-chain',
    story_id: macroId,
    story_title: storyTitle,
    story_role: 'primary',
    label: cleanStoryTitle(node.display_title || node.title) || '未命名事件',
    event_type: node.lane || node.family_group || node.event_family || 'macro_event',
    story_angle: node.lane,
    lane: node.lane,
    perspective: PERSPECTIVE_BY_CATEGORY.get(node.event_family)
      || PERSPECTIVE_BY_CATEGORY.get(node.family_group)
      || PERSPECTIVE_BY_CATEGORY.get(node.lane)
      || 'other',
    event_family: node.event_family || node.family_group,
    event_action: node.event_action,
    article_count: countOrNull(node.article_count),
    segment_count: countOrNull(node.segment_count),
    l2_run_id: node.l2_run_id || macro.l2_run_id || L2_RUN_ID,
    initiator: cleanEntityLabel(node.initiator || node.metadata?.initiator),
    target: cleanEntityLabel(node.target || node.metadata?.target),
    start_date: node.start_date,
    end_date: node.end_date,
    node_order: node.node_order || index + 1,
    importance_score: null,
    chain_quality: null,
    detail_url: '',
  }))

  const storyEdges = (payload.edges || []).map((edge) => {
    const claim = normalizeStoryRelationClaim(edge.claim)
    const relation = normalizeStoryRelation(edge)
    return {
      from_id: edge.from_chain_id,
      to_id: edge.to_chain_id,
      source_story_id: macroId,
      target_story_id: macroId,
      edge_type: relation.edge_type,
      layer: edge.layer || 'story',
      weight: null,
      edge_weight: null,
      relation_reason: relation.relation_reason,
      relation_semantics: relation.relation_semantics,
      title_similarity: null,
      shared_topic_count: null,
      shared_actor_count: null,
      gap_days: null,
      claim,
      evidence_status: claim.citation_status,
    }
  })
  const interactions = getStoryInteractions(runId, storyNodes)
  const relatedLinks = buildMacroRelatedLinks(storyNodes, payload.edges || [], interactions)
  const sampling = normalizeGraphSampling(payload.sampling, {
    unit: 'l2_chain_node',
    returnedCount: storyNodes.length,
  })
  const samplingComponent = sampling.components.find((item) => item.unit === 'l2_chain_node')

  return {
    source: 'l3-macro',
    story_id: macroId,
    story_title: storyTitle,
    start_date: macro.start_date,
    end_date: macro.end_date,
    nodes: storyNodes,
    edges: storyEdges,
    interactions,
    relatedLinks,
    related_stories: [],
    sampling,
    l3_macro: macro,
    meta: {
      dominant_type: macro.family_group || 'macro',
      macro_key: macro.macro_key,
      summary: macro.summary,
      actor_counts: macro.actor_counts || {},
      topic_counts: macro.topic_counts || {},
      quality_score: null,
      article_count: countOrNull(macro.article_count),
      segment_count: countOrNull(macro.segment_count),
      l2_chain_count: countOrNull(macro.l2_chain_count),
      l2_run_id: macro.l2_run_id || L2_RUN_ID,
      visible_node_count: storyNodes.length,
      total_node_count: sampling.coverage_state === 'partial'
        && samplingComponent?.state === 'bounded_partial'
        ? samplingComponent.evaluated_count
        : null,
      run_id: runId,
    },
  }
}

export function transformL2ChainResponse(payload) {
  const chain = payload.chain || {}
  const chainId = String(chain.chain_id || payload.chain_id || '')
  const storyTitle = cleanStoryTitle(chain.title) || '未命名事件链'
  const rawNodes = payload.nodes || []
  const storyNodes = rawNodes.map((node, index) => ({
    id: node.segment_id || `segment-${index + 1}`,
    segment_id: node.segment_id,
    source_kind: 'l2-segment',
    story_id: chainId,
    story_title: storyTitle,
    story_role: 'primary',
    label: cleanStoryTitle(node.display_title || node.title) || '未命名事件',
    event_type: node.story_angle || node.event_action || node.event_family || 'event',
    story_angle: node.story_angle,
    event_family: node.event_family,
    event_action: node.event_action,
    article_count: countOrNull(node.article_count),
    initiator: cleanEntityLabel(node.initiator),
    target: cleanEntityLabel(node.target),
    location: node.location,
    tone: node.tone,
    start_date: node.start_date,
    end_date: node.end_date,
    l1_cluster_id: node.l1_cluster_id,
    cluster_id_raw: node.l1_cluster_id || node.segment_id,
    segment_order: node.segment_order || index + 1,
    relation_reason: node.relation_reason,
    detail_url: node.l1_cluster_id
      ? `/data-service/ground-news-desk?cluster_id=${encodeURIComponent(node.l1_cluster_id)}`
      : '',
  }))

  const storyEdges = (payload.edges || []).map((edge) => {
    const claim = normalizeStoryRelationClaim(edge.claim)
    const relation = normalizeStoryRelation(edge)
    return {
      from_id: edge.from_id,
      to_id: edge.to_id,
      source_story_id: chainId,
      target_story_id: chainId,
      edge_type: relation.edge_type,
      layer: 'story',
      weight: null,
      edge_weight: null,
      relation_reason: relation.relation_reason,
      relation_semantics: relation.relation_semantics,
      title_similarity: null,
      shared_topic_count: null,
      gap_days: null,
      claim,
      evidence_status: claim.citation_status,
    }
  })
  const sampling = normalizeGraphSampling(payload.sampling, {
    unit: 'l15_segment_node',
    returnedCount: storyNodes.length,
  })
  const samplingComponent = sampling.components.find((item) => item.unit === 'l15_segment_node')

  return {
    source: 'l2-chain',
    story_id: chainId,
    story_title: storyTitle,
    start_date: chain.start_date,
    end_date: chain.end_date,
    nodes: storyNodes,
    edges: storyEdges,
    related_stories: [],
    sampling,
    l2_chain: chain,
    meta: {
      dominant_type: chain.family_group || chain.event_family || 'global',
      pair_key: parsePairKey(chain),
      chain_quality: null,
      quality_score: null,
      event_action: chain.event_action,
      article_count: countOrNull(chain.article_count),
      segment_count: countOrNull(chain.segment_count),
      visible_node_count: storyNodes.length,
      total_node_count: sampling.coverage_state === 'partial'
        && samplingComponent?.state === 'bounded_partial'
        ? samplingComponent.evaluated_count
        : null,
      run_id: payload.run_id || chain.run_id || L2_RUN_ID,
    },
  }
}

export function parsePairKey(chain) {
  if (Array.isArray(chain.pair_key)) return chain.pair_key
  const raw = String(chain.pair_key || '').trim()
  if (raw.includes('↔')) {
    return raw
      .split('↔')
      .map((item) => item.trim())
      .filter(Boolean)
  }
  if (raw.includes('->')) {
    return raw
      .split('->')
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return [chain.initiator, chain.target].filter(Boolean)
}
