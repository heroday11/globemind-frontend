import { L2_RUN_ID, L3_RUN_ID } from './config.js'
import { cleanEntityLabel, cleanStoryTitle } from './presentation.js'

export function normalizeL3MacroSummary(macro) {
  return {
    ...macro,
    id: macro.macro_id,
    title: macro.title,
    event_type: macro.family_group,
    article_count: macro.article_count || 0,
    segment_count: macro.segment_count || 0,
    l2_chain_count: macro.l2_chain_count || 0,
    cluster_count: macro.l2_chain_count || 0,
  }
}

export function normalizeL2ChainSummary(chain) {
  return {
    ...chain,
    id: chain.chain_id,
    title: chain.title,
    event_type: chain.event_family || chain.family_group,
    article_count: chain.article_count || 0,
    segment_count: chain.segment_count || 0,
    cluster_count: chain.segment_count || 0,
  }
}

export function transformL3MacroResponse(payload) {
  const macro = payload.macro || {}
  const macroId = String(macro.macro_id || payload.macro_id || '')
  const rawNodes = payload.nodes || []
  const storyNodes = rawNodes.map((node, index) => ({
    id: node.l2_chain_id || `l3-node-${index + 1}`,
    l2_chain_id: node.l2_chain_id,
    source_kind: 'l3-chain',
    story_id: macroId,
    story_title: cleanStoryTitle(macro.title, macro) || macroId,
    story_role: 'primary',
    label: cleanStoryTitle(node.title, node) || `L2 节点 ${index + 1}`,
    event_type: node.lane || node.family_group || node.event_family || 'macro_event',
    story_angle: node.lane,
    lane: node.lane,
    event_family: node.event_family || node.family_group,
    event_action: node.event_action,
    article_count: node.article_count || 0,
    segment_count: node.segment_count || 0,
    l2_run_id: node.l2_run_id || macro.l2_run_id || L2_RUN_ID,
    initiator: cleanEntityLabel(node.initiator || node.metadata?.initiator),
    target: cleanEntityLabel(node.target || node.metadata?.target),
    start_date: node.start_date,
    end_date: node.end_date,
    node_order: node.node_order || index + 1,
    importance_score: node.importance_score,
    chain_quality: node.chain_quality || node.metadata?.chain_quality,
    detail_url: '',
  }))

  const storyEdges = (payload.edges || []).map((edge) => ({
    from_id: edge.from_chain_id,
    to_id: edge.to_chain_id,
    source_story_id: macroId,
    target_story_id: macroId,
    edge_type: edge.edge_type || 'macro_sequence',
    layer: edge.layer || 'story',
    weight: edge.edge_weight,
    edge_weight: edge.edge_weight,
    relation_reason: edge.relation_reason,
    title_similarity: edge.title_similarity,
    shared_topic_count: edge.shared_topic_count,
    shared_actor_count: edge.shared_actor_count,
    gap_days: edge.gap_days,
  }))

  return {
    source: 'l3-macro',
    story_id: macroId,
    story_title: cleanStoryTitle(macro.title, macro) || macroId,
    start_date: macro.start_date,
    end_date: macro.end_date,
    nodes: storyNodes,
    edges: storyEdges,
    related_stories: [],
    l3_macro: macro,
    meta: {
      dominant_type: macro.family_group || 'macro',
      macro_key: macro.macro_key,
      summary: macro.summary,
      actor_counts: macro.actor_counts || {},
      topic_counts: macro.topic_counts || {},
      quality_score: macro.quality_score,
      article_count: macro.article_count || 0,
      segment_count: macro.segment_count || 0,
      l2_chain_count: macro.l2_chain_count || 0,
      l2_run_id: macro.l2_run_id || L2_RUN_ID,
      visible_node_count: payload.visible_node_count || storyNodes.length,
      total_node_count: payload.total_node_count || macro.l2_chain_count || storyNodes.length,
      run_id: payload.run_id || macro.run_id || L3_RUN_ID,
    },
  }
}

export function transformL2ChainResponse(payload) {
  const chain = payload.chain || {}
  const chainId = String(chain.chain_id || payload.chain_id || '')
  const rawNodes = payload.nodes || []
  const storyNodes = rawNodes.map((node, index) => ({
    id: node.segment_id || `segment-${index + 1}`,
    segment_id: node.segment_id,
    source_kind: 'l2-segment',
    story_id: chainId,
    story_title: cleanStoryTitle(chain.title, chain) || chainId,
    story_role: 'primary',
    label: cleanStoryTitle(node.title, node) || `节点 ${index + 1}`,
    event_type: node.story_angle || node.event_action || node.event_family || 'event',
    story_angle: node.story_angle,
    event_family: node.event_family,
    event_action: node.event_action,
    article_count: node.article_count || 0,
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

  const storyEdges = (payload.edges || []).map((edge) => ({
    from_id: edge.from_id,
    to_id: edge.to_id,
    source_story_id: chainId,
    target_story_id: chainId,
    edge_type: edge.edge_type || 'continuation',
    layer: 'story',
    weight: edge.edge_weight,
    edge_weight: edge.edge_weight,
    relation_reason: edge.relation_reason,
    title_similarity: edge.title_similarity,
    shared_topic_count: edge.shared_topic_count,
    gap_days: edge.gap_days,
  }))

  return {
    source: 'l2-chain',
    story_id: chainId,
    story_title: cleanStoryTitle(chain.title, chain) || chainId,
    start_date: chain.start_date,
    end_date: chain.end_date,
    nodes: storyNodes,
    edges: storyEdges,
    related_stories: [],
    l2_chain: chain,
    meta: {
      dominant_type: chain.family_group || chain.event_family || 'global',
      pair_key: parsePairKey(chain),
      chain_quality: chain.chain_quality,
      quality_score: chain.quality_score,
      event_action: chain.event_action,
      article_count: chain.article_count || 0,
      segment_count: chain.segment_count || storyNodes.length,
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
