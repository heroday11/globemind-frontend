import {
  normalizeStoryRelation,
  storyRelationLabel,
} from '../../governance/storyRelations.js'
import {
  graphMetricPresentation,
  projectGraphMetric,
} from '../../governance/graphMetrics.js'

export function filterStorySummaries(stories, query) {
  const normalizedQuery = String(query || '').trim().toLowerCase()
  if (!normalizedQuery) return stories
  return stories.filter((story) => {
    const haystack = [
      story.title,
      story.display_title,
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
  return (stories || []).slice().sort((left, right) => (
    String(left.title || left.id || '').localeCompare(String(right.title || right.id || ''))
  ))
}

export function sortRelatedStories(stories) {
  return (stories || []).slice().sort((left, right) => {
    const layerDiff = layerPriority(left.layer) - layerPriority(right.layer)
    if (layerDiff !== 0) return layerDiff
    return String(left.story_id || left.title || '').localeCompare(
      String(right.story_id || right.title || ''),
    )
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
  const articles = knownCount(story.meta?.article_count)
  const articleText = articles === null ? '新闻数未知' : `${articles} 条新闻`
  if (story.source === 'l3-macro') {
    const total = knownCount(story.meta?.total_node_count)
    const visible = knownCount(story.meta?.visible_node_count) ?? graphMetrics.mainNodes
    const nodeText = total === null
      ? `${visible} 个已加载 L2 节点（总数未知）`
      : `${visible}/${total} 个 L2 节点`
    const segmentCount = knownCount(story.meta?.segment_count)
    const segmentText = segmentCount === null
      ? 'L1.5 片段数未知'
      : `${segmentCount} 个 L1.5 片段`
    return `${nodeText} · ${segmentText} · ${articleText} · ${crossLinks} 条跨链边`
  }
  return `${graphMetrics.mainNodes} 个节点 · ${articleText} · ${crossLinks} 条跨链关系 · ${branches} 个分支`
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
    const l2Count = knownCount(story.meta?.l2_chain_count)
    const l2Text = l2Count === null ? 'L2 数量未知' : `${l2Count} 条 L2`
    return `${actors || '多主体'} · ${familyLabel(story.meta?.dominant_type || 'macro')} · ${l2Text} · ${formatRange(story.start_date, story.end_date)}`
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

export function formatCountLabel(value, { unit = '项', unknown = '数量未知' } = {}) {
  const count = knownCount(value)
  return count === null ? unknown : `${count} ${unit}`
}

export function getFallbackStoryTitle(mode, id) {
  return mode === 'l3' ? `大事件 ${id}` : `走势链 ${id}`
}

// Public L3 topics in the current catalog, keyed by the stable macro identifier.
const MACRO_TITLES = new Map([
  ['us_iran_regional_conflict', '美国与伊朗的战争、核谈判与地区战事'],
  ['russia_ukraine_war', '俄乌战争与国际斡旋'],
  ['israel_gaza_war', '加沙战争、停火与人质谈判'],
  ['china_us_strategic_competition', '中美关税交锋与芯片争端'],
  ['china_taiwan_cross_strait', '台海军事动态与对台军售'],
  ['cambodia_thailand_border_conflict', '泰柬边境冲突与停火进程'],
  ['us_venezuela_pressure', '美国对委内瑞拉施压与马杜罗被捕'],
  ['security:iran_us', '美伊军事交锋与停火进程'],
  ['security:russia_ukraine', '俄乌前线战事与俄军空袭'],
  ['security:iran_israel', '伊朗与以色列交火及停火进展'],
  ['security:hezbollah_israel', '以色列与黎巴嫩真主党交火及停火'],
  ['security:gaza_israel', '以军在加沙的军事行动'],
  ['security:hezbollah_iran', '真主党解除武装争议与伊朗介入'],
  ['political_diplomacy:china_india', '中印边境磋商与关系缓和'],
  ['political_diplomacy:iran_us', '美伊和平方案与停战谈判'],
  ['political_diplomacy:russia_ukraine', '俄乌伊斯坦布尔谈判与停火磋商'],
  ['security:israel_lebanon', '以色列与黎巴嫩的停火磋商'],
  ['political_diplomacy:ukraine_us', '美国斡旋结束俄乌战争'],
  ['economic_security:russia_us', '美国对俄石油制裁豁免'],
  ['security:nato_us', '北约军费目标与格陵兰安全安排'],
  ['security:north korea_south korea', '朝韩无人机争端与边境扩音器撤除'],
  ['political_diplomacy:cambodia_thailand', '泰柬边境调停与东盟观察团'],
  ['economic_security:canada_us', '美加关税争端与贸易谈判中止'],
  ['political_diplomacy:china_us', '中美元首会晤与高层对话'],
  ['economic_security:iran_us', '美国对伊朗制裁与金融市场反应'],
  ['economic_security:india_us', '美印关税争端与贸易谈判'],
  ['political_diplomacy:iran_pakistan', '巴基斯坦斡旋美伊谈判'],
  ['political_diplomacy:china_north korea', '中朝领导人会晤与双边关系'],
  ['security:china_taiwan', '解放军台海演训与美方威胁评估'],
  ['security:china_japan', '日本海联合军演与中日海上摩擦'],
  ['security:gulf_iran', '伊朗战事外溢与海湾国家应对'],
  ['security:gaza_hamas', '加沙城控制计划与哈马斯停火回应'],
  ['economic_security:thailand_us', '泰国与美国的关税谈判'],
  ['security:hamas_israel', '以色列袭击哈马斯领导层与人质交接'],
  ['political_diplomacy:china_iran', '伊朗石油出口与中国的制裁交涉'],
  ['economic_security:eu_us', '美欧关税协议与汽车关税争端'],
  ['security:us_venezuela', '美国对委内瑞拉的军事行动'],
  ['political_diplomacy:china_russia', '中俄元首会晤与外长磋商'],
  ['political_diplomacy:china_taiwan', '台湾在野党访陆与对外外交争议'],
  ['security:china_iran', '中国对伊朗港口封锁的表态与战时争议'],
  ['economic_security:china_us', '中美关税休战与 TikTok 谈判'],
  ['political_diplomacy:us_venezuela', '美国对委内瑞拉政局的表态与恢复使馆运作'],
  ['security:iran_saudi arabia', '伊朗战事波及沙特能源设施'],
  ['economic_security:us_venezuela', '委内瑞拉石油出口与美国能源政策'],
  ['political_diplomacy:uk_us', '英国王室与美国的国事访问外交'],
  ['security:north korea_russia', '朝鲜参战与俄朝军事合作'],
  ['economic_security:india_russia', '印度进口俄油引发美国关税争端'],
  ['security:cambodia_thailand', '泰柬边境交火与停火监督'],
  ['political_diplomacy:russia_us', '美俄围绕乌克兰问题的会谈'],
  ['economic_security:south korea_us', '美韩贸易谈判与造船合作'],
  ['economic_security:japan_us', '美日汽车关税与贸易谈判'],
  ['political_diplomacy:india_russia', '普京访问印度与印俄双边磋商'],
  ['security:ukraine_us', '美国对乌军援与停火斡旋'],
  ['security:russia_us', '美俄核试验争议与核威慑表态'],
  ['political_diplomacy:gaza_israel', '加沙战后安排与国际调查'],
  ['security:nato_russia', '俄罗斯无人机越境争议与北约应对'],
  ['political_diplomacy:china_south korea', '中韩高层会晤与关系修复'],
  ['political_diplomacy:china_japan', '中日涉台争议与外交交涉'],
  ['security:israel_syria', '以色列空袭叙利亚南部与德鲁兹冲突'],
])

export function macroStoryTitle(macro) {
  return MACRO_TITLES.get(macro.macro_key) || cleanStoryTitle(macro.title)
}

export function cleanStoryTitle(title) {
  const raw = String(title || '').replace(/\s+/g, ' ').trim()
  if (!raw) return ''

  const prefixedHeadline = raw.match(
    /^[^:：·]+?(?:->|→|↔)[^:：·]+?(?:[:：]\s*|\s+·\s+)(.+)$/,
  )
  if (prefixedHeadline) return prefixedHeadline[1].trim()

  const colonParts = raw.match(/^([^:]{2,96}):\s*(.+)$/)
  if (colonParts) {
    const [, prefix, body] = colonParts
    if (/^[a-z\s/_-]+$/i.test(prefix) && /macro event$/i.test(body)) {
      const familyKey = body.replace(/macro event$/i, '').trim().replace(/\s+/g, '_')
      const familyText = familyLabel(familyKey)
      return `${prefix
        .split(/[/_]/)
        .map((part) => cleanEntityLabel(part.trim()))
        .filter(Boolean)
        .join(' / ')} · ${familyText}`
    }
  }

  return raw
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
    const count = knownCount(story.l2_chain_count ?? story.cluster_count)
    return count === null ? 'L2 数量未知' : `${count} 条 L2`
  }
  const count = knownCount(story.segment_count ?? story.article_count)
  return count === null ? '节点数未知' : `${count} 节点`
}

export function relationLabel(relation) {
  if (!relation) return storyRelationLabel('relation_unknown')
  return edgeLabel(relation.relation_type)
}

export function qualityLabel(value) {
  void value
  return '链质量未知'
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
  return storyRelationLabel(value)
}

export function buildStoryGraphNodeInspector(node, { storyId = '' } = {}) {
  const resolvedStoryId = String(storyId || node?.story_id || '')
  return {
    kind:
      node?.source_kind === 'l3-chain' || node?.l2_chain_id
        ? 'l3-chain'
        : node?.source_kind === 'l2-segment' || node?.segment_id
          ? 'l2-segment'
          : 'cluster',
    originalClusterId: node?.cluster_id_raw || node?.l1_cluster_id || node?.id,
    segmentId: node?.segment_id || node?.id,
    l2ChainId: node?.l2_chain_id,
    l2RunId: node?.l2_run_id,
    macroId: node?.story_id,
    l1ClusterId: node?.l1_cluster_id || node?.cluster_id_raw,
    storyId: resolvedStoryId,
    title: cleanStoryTitle(node?.label || node?.title) || '未命名事件',
    eventType: node?.event_type,
    storyAngle: node?.story_angle,
    lane: node?.lane,
    articleCount: node?.article_count,
    segmentCount: node?.segment_count,
    initiator: node?.initiator,
    target: node?.target,
    location: node?.location,
    detailUrl: node?.detail_url,
    startDate: node?.start_date,
    endDate: node?.end_date,
  }
}

export function buildStoryGraphEdgeInspector(edge) {
  const normalizedEdge = normalizeStoryRelation(edge)
  const sourceId = String(normalizedEdge?.from_id ?? normalizedEdge?.source ?? '')
  const targetId = String(normalizedEdge?.to_id ?? normalizedEdge?.target ?? '')
  const edgeType = normalizedEdge.edge_type
  const claim = normalizedEdge?.claim && typeof normalizedEdge.claim === 'object'
    ? normalizedEdge.claim
    : {}
  return {
    kind: 'edge',
    title: edgeLabel(edgeType),
    subtitle: `${sourceId || '未知节点'} → ${targetId || '未知节点'}`,
    sourceId,
    targetId,
    edgeType,
    layer: normalizedEdge?.layer || 'story',
    relationReason: normalizedEdge.relation_reason,
    relationSemantics: normalizedEdge.relation_semantics,
    weight: null,
    synthetic: normalizedEdge?.synthetic === true,
    evidenceStatus: normalizedEdge?.evidence_status,
    claimId: claim.claim_id ?? null,
    citationLocator: claim.citation_locator ?? null,
    citationStatus: claim.citation_status || 'unavailable',
    reasonCode: claim.reason_code || 'GRAPH_RELATION_CLAIM_CONTRACT_MISSING',
    unknownGate: claim.unknown_gate || 'explicit_unknown',
    usableAsFact: claim.usable_as_fact === true,
    sharedActorCount: null,
    sharedTopicCount: null,
    gapDays: null,
  }
}

export function buildStoryGraphAccessibleList(storyGraph, { includeContext = true } = {}) {
  const rawNodes = Array.isArray(storyGraph?.nodes) ? storyGraph.nodes : []
  const nodeTitles = new Map()
  const nodes = rawNodes.map((node, index) => {
    const id = String(
      node?.id
      || node?.segment_id
      || node?.l1_cluster_id
      || node?.l2_chain_id
      || node?.cluster_id_raw
      || `node-${index + 1}`,
    )
    const payload = buildStoryGraphNodeInspector(node, {
      storyId: node?.story_id || storyGraph?.story_id,
    })
    const title = payload.title
    nodeTitles.set(id, title)
    return {
      id,
      title,
      meta: [
        angleLabel(payload.storyAngle || payload.eventType || payload.lane),
        formatRange(payload.startDate, payload.endDate),
        knownCount(payload.articleCount) === null
          ? '新闻数未知'
          : `${knownCount(payload.articleCount)} 条新闻`,
      ].filter(Boolean).join(' · '),
      payload,
    }
  })

  const idCounts = new Map()
  const edges = (Array.isArray(storyGraph?.edges) ? storyGraph.edges : [])
    .filter((edge) => includeContext || edge?.layer !== 'context')
    .map((edge) => {
      const payload = buildStoryGraphEdgeInspector(edge)
      const baseId = String(
        edge?.id
        || `${payload.sourceId}:${payload.targetId}:${payload.edgeType}:${payload.layer}`,
      )
      const occurrence = idCounts.get(baseId) || 0
      idCounts.set(baseId, occurrence + 1)
      const sourceTitle = nodeTitles.get(payload.sourceId) || payload.sourceId || '未知节点'
      const targetTitle = nodeTitles.get(payload.targetId) || payload.targetId || '未知节点'
      return {
        id: occurrence ? `${baseId}:${occurrence + 1}` : baseId,
        title: payload.title,
        meta: `${sourceTitle} → ${targetTitle}`,
        payload,
      }
    })

  return { nodes, edges }
}

export function evidenceLevel(count, { direct = true } = {}) {
  const value = knownCount(count)
  if (value === null) return direct ? '报道数量未知' : '可下钻报道数量未知'
  if (!direct) return `可下钻 · ${value} 条报道（未核验）`
  return `已加载 ${value} 条报道（未核验）`
}

export function reportingCoverageGuidance(count) {
  const value = knownCount(count)
  if (value === null) {
    return '报道数量未知，当前只能作为待核验线索，不得下结论。'
  }
  if (value < 5) {
    return `当前仅加载 ${value} 条报道，样本较少，只能作为线索，不得下结论。`
  }
  return `当前已加载 ${value} 条报道；报道数量不等于事实已核验，仍需做来源交叉核查。`
}

export function researchValueScore(item) {
  if (!item) return null
  const meta = item.meta || {}
  const start = item.start_date || item.startDate
  const end = item.end_date || item.endDate
  return projectGraphMetric('story_graph.research_value', {
    value: item.research_value,
    method_card: item.research_value_method_card,
    evidence_locator: item.research_value_evidence_locator,
    inputs: {
      article_count: item.article_count ?? item.articleCount ?? meta.article_count,
      segment_count: item.segment_count ?? item.segmentCount ?? meta.segment_count,
      l2_chain_count: item.l2_chain_count ?? item.cluster_count ?? meta.l2_chain_count,
      quality_score: item.quality_score ?? item.importance_score ?? meta.quality_score,
      date_span_days: dateSpanDays(start, end),
      actor_count: Object.keys(meta.actor_counts || {}).length,
      topic_count: Object.keys(meta.topic_counts || {}).length,
    },
  }).value
}

export function researchValueLabel(score) {
  void score
  return '研究价值未知'
}

export function relationStrengthLabel(edge) {
  if (edge?.synthetic === true) {
    return '布局辅助线（非证据关系）'
  }
  return `${graphMetricPresentation('story_graph.relation_strength', {
    value: edge?.relation_strength,
    method_card: edge?.relation_strength_method_card,
    evidence_locator: edge?.citationLocator ?? edge?.citation_locator,
    inputs: {
      edge_weight: edge?.weight ?? edge?.edge_weight,
      shared_actor_count: edge?.shared_actor_count,
      shared_topic_count: edge?.shared_topic_count,
      relation_reason: edge?.relationReason ?? edge?.relation_reason,
    },
  }).label}未知（方法或证据不可用，不可作为事实）`
}

export function relationEvidenceText(edge) {
  if (edge?.synthetic === true) {
    return '仅用于图谱布局，不代表事实、相关或因果已核验'
  }
  return '关系强度的方法、输入身份未形成完整合同且证据定位符不可用，状态为明确未知；原始权重、共享计数和时间邻接不得作为事实、相关或因果结论。'
}

export function relationResearchGuidance(edge) {
  const relationState = relationStrengthLabel(edge)
  const guidance = [
    '先比较起点和终点的发布时间，确认方向是否成立。',
    '检查共同主体、共同议题和原文来源，区分相关性与因果性。',
  ]
  if (relationState === '布局辅助线（非证据关系）') {
    guidance.push('该线仅辅助布局，不得作为关系证据或写成已核验事实。')
  } else if (relationState.includes('不可作为事实')) {
    guidance.push('来源定位符不可用且未知门禁未解除；不得写成事实、相关或因果结论。')
  } else if (relationState === '弱解释信号（待核验）') {
    guidance.push('该边解释较弱，暂时作为待核验假设使用。')
  } else {
    guidance.push('该边只可作为待核验线索；使用前必须保留并核对其来源定位。')
  }
  return guidance
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

function knownCount(value) {
  if (
    value == null
    || typeof value === 'boolean'
    || (typeof value === 'string' && !value.trim())
  ) return null
  const number = Number(value)
  return Number.isInteger(number) && number >= 0 ? number : null
}

function dateSpanDays(start, end) {
  const startMs = Date.parse(start || '')
  const endMs = Date.parse(end || start || '')
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return 0
  return Math.max(1, Math.round(Math.abs(endMs - startMs) / 86400000) + 1)
}
