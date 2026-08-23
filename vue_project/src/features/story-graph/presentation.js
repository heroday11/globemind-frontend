export function filterStorySummaries(stories, query) {
  const normalizedQuery = String(query || '').trim().toLowerCase()
  if (!normalizedQuery) return stories
  return stories.filter((story) => {
    const haystack = [
      story.title,
      story.event_type,
      story.family_group,
      story.event_family,
      story.pair_key,
      story.initiator,
      story.target,
      story.macro_key,
      story.summary,
      story.start_date,
      story.end_date,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(normalizedQuery)
  })
}

export function sortStorySummariesByResearchValue(stories) {
  return (stories || []).slice().sort((left, right) => {
    const scoreDiff = researchValueScore(right) - researchValueScore(left)
    if (scoreDiff !== 0) return scoreDiff
    const articleDiff = numericValue(right.article_count) - numericValue(left.article_count)
    if (articleDiff !== 0) return articleDiff
    return String(left.title || left.id || '').localeCompare(String(right.title || right.id || ''))
  })
}

export function sortRelatedStories(stories) {
  return (stories || []).slice().sort((left, right) => {
    const layerDiff = layerPriority(left.layer) - layerPriority(right.layer)
    if (layerDiff !== 0) return layerDiff
    return (right.score || 0) - (left.score || 0)
  })
}

export function buildGraphMetrics(story, relatedStories = []) {
  const allNodes = story?.nodes || []
  const allEdges = story?.edges || []
  const currentId = String(story?.story_id || '')
  return {
    mainNodes: allNodes.filter(
      (node) => String(node.story_id || story?.story_id || '') === currentId,
    ).length,
    branchStories: relatedStories.length,
    contextLinks: allEdges.filter((edge) => edge.layer === 'context').length,
  }
}

export function buildStoryStatsText(story, graphMetrics, relatedStories = []) {
  if (!story) return ''
  const crossLinks = (story.edges || []).filter((edge) => edge.layer && edge.layer !== 'story').length
  const branches = relatedStories.length
  const articles = story.meta?.article_count || 0
  if (story.source === 'l3-macro') {
    const total = story.meta?.total_node_count || graphMetrics.mainNodes
    const visible = story.meta?.visible_node_count || graphMetrics.mainNodes
    return `${visible}/${total} 个 L2 节点 · ${story.meta?.segment_count || 0} 个 L1.5 片段 · ${articles} 条新闻 · ${crossLinks} 条影响边`
  }
  return `${graphMetrics.mainNodes} 个节点 · ${articles} 条新闻 · ${crossLinks} 条跨链关系 · ${branches} 个分支`
}

export function makeMainInspector(story, mode = 'l2') {
  return {
    kind: 'main-story',
    title: story.story_title || getFallbackStoryTitle(mode, story.story_id),
    subtitle: buildStorySummaryLine(story),
  }
}

export function buildStorySummaryLine(story) {
  if (!story) return ''
  if (story.source === 'l3-macro') {
    const actors = Object.entries(story.meta?.actor_counts || {})
      .slice(0, 4)
      .map(([actor]) => cleanEntityLabel(actor))
      .join(' / ')
    return `${actors || '多主体'} · ${familyLabel(story.meta?.dominant_type || 'macro')} · ${story.meta?.l2_chain_count || 0} 条 L2 · ${formatRange(story.start_date, story.end_date)}`
  }
  const pair = story.meta?.pair_key?.length
    ? story.meta.pair_key.map(cleanEntityLabel).join(' ↔ ')
    : '主体关系未知'
  const quality = story.meta?.chain_quality ? ` · ${qualityLabel(story.meta.chain_quality)}` : ''
  return `${pair} · ${familyLabel(story.meta?.dominant_type || 'mixed')} · ${formatRange(story.start_date, story.end_date)}${quality}`
}

export function formatRange(start, end) {
  if (!start && !end) return '无日期'
  if (start && end && start !== end) {
    return `${String(start).slice(0, 10)} → ${String(end).slice(0, 10)}`
  }
  return start || end
}

export function formatNewsDate(item) {
  return item?.published_at ? String(item.published_at).slice(0, 10) : '无日期'
}

export function getFallbackStoryTitle(mode, id) {
  return mode === 'l3' ? `大事件 ${id}` : `走势链 ${id}`
}

export function cleanStoryTitle(title, context = {}) {
  const raw = String(title || '').replace(/\s+/g, ' ').trim()
  if (!raw) return ''

  const colonParts = raw.match(/^([^:]{2,96}):\s*(.+)$/)
  if (colonParts) {
    const prefix = colonParts[1]
    const body = colonParts[2]
    if (prefix.includes('->') || prefix.includes('↔')) {
      const actors = formatActorPair(context.initiator, context.target, '')
      return actors ? `${actors} · ${body}` : body
    }
    if (/^[a-z\s/_-]+$/i.test(prefix) && /macro event$/i.test(body)) {
      const familyKey = body.replace(/macro event$/i, '').trim().replace(/\s+/g, '_')
      const familyText = familyLabel(familyKey)
      return `${prefix
        .split(/[/_]/)
        .map((part) => cleanEntityLabel(part.trim()))
        .filter(Boolean)
        .join(' / ')} · ${familyText}宏观事件`
    }
  }

  return raw
    .replace(/\b(us|eu|uk|uae|un|nato|iaea)\b/gi, (match) => match.toUpperCase())
    .replace(/\s+([,.;:!?])/g, '$1')
}

export function cleanEntityLabel(value) {
  const raw = String(value || '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
  if (!raw) return ''
  const upper = raw.toUpperCase()
  const acronyms = new Set(['US', 'U.S.', 'USA', 'EU', 'UK', 'UN', 'UAE', 'NATO', 'IAEA', 'G7', 'G20'])
  if (acronyms.has(upper)) return upper.replace('U.S.', 'US')
  if (/^[a-z][a-z\s.]+$/i.test(raw)) {
    return raw
      .split(' ')
      .map((word) => {
        const wordUpper = word.toUpperCase()
        if (acronyms.has(wordUpper)) return wordUpper.replace('U.S.', 'US')
        return word.charAt(0).toUpperCase() + word.slice(1)
      })
      .join(' ')
  }
  return raw
}

export function formatActorPair(initiator, target, fallback = '多主体') {
  const actors = [cleanEntityLabel(initiator), cleanEntityLabel(target)].filter(Boolean)
  if (actors.length >= 2) return `${actors[0]} → ${actors[1]}`
  if (actors.length === 1) return actors[0]
  return fallback
}

export function getSummaryCountLabel(mode, story) {
  if (mode === 'l3') {
    return `${story.l2_chain_count || story.cluster_count || 0} 条 L2`
  }
  return `${story.segment_count || story.article_count || 0} 节点`
}

export function relationLabel(relation) {
  if (!relation) return '关联'
  const reason = relation.reason || relation.relation_type || 'relation'
  return edgeLabel(reason)
}

export function qualityLabel(value) {
  const labels = {
    strong: '强关联',
    usable: '可用',
    weak: '弱关联',
  }
  return labels[value] || String(value || '未评级')
}

export function familyLabel(value) {
  const labels = {
    political_diplomacy: '政治外交',
    diplomacy: '外交谈判',
    security: '安全冲突',
    military_security: '军事安全',
    economy_tech: '经贸科技',
    trade_conflict: '贸易冲突',
    economic_security: '经贸安全',
    domestic_politics: '国内政治',
    politics_society: '政治社会',
    policy_legal: '政策法律',
    global: '全球',
    mixed: '混合线索',
    macro: '大事件',
    conflict: '冲突主线',
    economic: '经济市场',
    political: '政治支线',
    context: '背景支线',
  }
  return labels[value] || String(value || '未知').replaceAll('_', ' / ')
}

export function angleLabel(value) {
  const labels = {
    main_event: '核心事件',
    context_update: '背景进展',
    market_reaction: '市场反应',
    outcome_reaction: '后续反应',
    analysis_context: '分析解读',
    prelude: '事前铺垫',
    official_update: '官方更新',
    video_clip: '视频片段',
  }
  return labels[value] || familyLabel(value)
}

export function edgeLabel(value) {
  const labels = {
    continuation: '延续',
    continued: '延续',
    escalation: '升级',
    response: '回应',
    transition: '转折',
    context: '背景关联',
    same_thread: '同一线索',
    event_to_outcome: '事件到后续',
    outcome_to_context: '后续到背景',
    chain_start: '起点',
    relation: '关联',
    macro_sequence: '宏观推进',
    influence: '影响',
    diplomacy: '外交推进',
    market_reaction: '市场反应',
    parallel: '并行',
  }
  return labels[value] || String(value || '关联').replaceAll('_', ' / ')
}

export function evidenceLevel(count, { direct = true } = {}) {
  const value = numericValue(count)
  if (!direct && value > 0) return `可下钻 · ${value} 条`
  if (value >= 100) return `强证据 · ${value} 条`
  if (value >= 20) return `充分 · ${value} 条`
  if (value >= 5) return `可用 · ${value} 条`
  if (value > 0) return `单点 · ${value} 条`
  return direct ? '暂无直接证据' : '需下钻取证'
}

export function researchValueScore(item) {
  if (!item) return 0
  const meta = item.meta || {}
  const articles = numericValue(item.article_count ?? item.articleCount ?? meta.article_count)
  const segments = numericValue(item.segment_count ?? item.segmentCount ?? meta.segment_count)
  const chains = numericValue(item.l2_chain_count ?? item.cluster_count ?? meta.l2_chain_count)
  const quality = numericValue(item.quality_score ?? item.importance_score ?? meta.quality_score)
  const start = item.start_date || item.startDate
  const end = item.end_date || item.endDate
  const days = dateSpanDays(start, end)
  const actors = Object.keys(meta.actor_counts || {}).length
  const topics = Object.keys(meta.topic_counts || {}).length

  const evidenceScore = Math.min(34, Math.log1p(articles) * 5.2)
  const structureScore = Math.min(22, Math.log1p(segments + chains) * 4.2)
  const timeScore = Math.min(14, Math.log1p(days) * 2.5)
  const qualityScore = quality > 0 && quality <= 1 ? quality * 20 : Math.min(20, quality / 5)
  const coverageScore = Math.min(10, actors * 0.8 + topics * 0.4)
  return Math.round(Math.min(100, evidenceScore + structureScore + timeScore + qualityScore + coverageScore))
}

export function researchValueLabel(score) {
  const value = numericValue(score)
  if (value >= 82) return '研究主样本'
  if (value >= 68) return '高价值样本'
  if (value >= 50) return '可用线索'
  if (value > 0) return '待核验线索'
  return '未评分'
}

export function relationStrengthLabel(edge) {
  const weight = numericValue(edge?.weight ?? edge?.edge_weight)
  const sharedTopics = numericValue(edge?.shared_topic_count)
  const sharedActors = numericValue(edge?.shared_actor_count)
  const reason = String(edge?.relationReason || edge?.relation_reason || '').trim()
  if (weight >= 0.75 || sharedActors + sharedTopics >= 3) return '强关系'
  if (weight >= 0.55 || sharedActors + sharedTopics >= 1) return '中等关系'
  if (reason && reason !== '时间重叠') return '待核验关系'
  return '弱解释关系'
}

export function relationEvidenceText(edge) {
  const parts = []
  const weight = numericValue(edge?.weight ?? edge?.edge_weight)
  if (weight) parts.push(`权重 ${weight.toFixed(2)}`)
  if (numericValue(edge?.shared_actor_count)) parts.push(`共享主体 ${edge.shared_actor_count}`)
  if (numericValue(edge?.shared_topic_count)) parts.push(`共享议题 ${edge.shared_topic_count}`)
  if (numericValue(edge?.gap_days) || edge?.gap_days === 0) parts.push(`间隔 ${edge.gap_days} 天`)
  const reason = String(edge?.relationReason || edge?.relation_reason || '').trim()
  if (reason && reason !== '时间重叠') parts.push(reason)
  return parts.length ? parts.join(' · ') : '仅见时间重叠，需结合原文核验'
}

export function focusKindLabel(value) {
  const labels = {
    'main-story': '走势链',
    'branch-story': '关联链',
    'l3-chain': 'L2 支线',
    'l2-segment': 'L2 节点',
    cluster: 'L1 事件',
    edge: '关系边',
  }
  return labels[value] || '焦点'
}

export function layerPriority(layer) {
  return layer === 'backbone' ? 0 : 1
}

function numericValue(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function dateSpanDays(start, end) {
  const startMs = Date.parse(start || '')
  const endMs = Date.parse(end || start || '')
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return 0
  return Math.max(1, Math.round(Math.abs(endMs - startMs) / 86400000) + 1)
}
