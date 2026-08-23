<template>
  <div class="intel-page">
    <header class="intel-topbar" data-tour="story-workspace">
      <div class="intel-topbar__brand">
        <span class="intel-kicker">GlobeMind</span>
        <div>
          <h1>{{ pageTitle }}</h1>
          <p>{{ pageSubtitle }}</p>
        </div>
      </div>

      <div class="intel-topbar__meta">
        <div class="intel-mode-switch" data-tour="story-level-switch" role="tablist" aria-label="图谱层级">
          <button :class="{ 'is-active': graphMode === 'l3' }" @click="switchGraphMode('l3')">
            L3 大事件
          </button>
          <button :class="{ 'is-active': graphMode === 'l2' }" @click="switchGraphMode('l2')">
            L2 走势链
          </button>
        </div>
        <span class="intel-badge intel-badge--build"> {{ graphModeLabel }} {{ activeRunId }} </span>
        <span class="intel-badge" v-if="currentStory">
          {{ currentStory.story_title || `走势链 ${currentStory.story_id}` }}
        </span>
        <span class="intel-badge intel-badge--soft" v-if="storyStatsText">
          {{ storyStatsText }}
        </span>
        <button class="intel-btn intel-btn--ghost" :disabled="!graph" @click="fitCanvas">
          适配视图
        </button>
        <button class="intel-btn intel-btn--ghost" :disabled="!graph" @click="toggleContextLinks">
          {{ showContextLinks ? '隐藏关联线' : '显示关联线' }}
        </button>
        <button class="intel-btn intel-btn--assistant intel-topbar__assistant" @click="openStoryAssistantDrawer()">
          数据助手
        </button>
      </div>
    </header>

    <div
      class="intel-shell"
      :class="{
        'is-left-collapsed': leftCollapsed,
      }"
    >
      <aside class="intel-side intel-side--left" data-tour="story-library" :class="{ 'is-collapsed': leftCollapsed }">
        <div v-if="!leftCollapsed" class="intel-panel">
          <div class="intel-panel__header">
            <div>
              <span class="intel-panel__eyebrow">{{ graphModeLabel }} 导航</span>
              <h2>{{ libraryTitle }}</h2>
            </div>
            <button class="intel-icon-btn" @click="leftCollapsed = true" title="收起导航">
              <span>⟨</span>
            </button>
          </div>

          <section class="intel-section">
            <label class="intel-label">{{ searchLabel }}</label>
            <input
              v-model.trim="storySearch"
              class="intel-input"
              type="text"
              :placeholder="searchPlaceholder"
            />
          </section>

          <section class="intel-section intel-section--library">
            <div class="intel-section__title">
              <span>{{ libraryTitle }}</span>
              <span>{{ filteredStories.length }}</span>
            </div>
            <div class="intel-story-list">
              <button
                v-for="story in filteredStories"
                :key="story.id"
                class="intel-story-card"
                :class="{ 'is-active': String(story.id) === selectedStoryId }"
                @click="selectStory(story.id)"
              >
                <div class="intel-story-card__top">
                  <span class="intel-story-card__type">{{
                    familyLabel(story.family_group || story.event_type)
                  }}</span>
                  <span class="intel-story-card__count">{{
                    researchValueLabel(researchValueScore(story))
                  }}</span>
                </div>
                <strong>{{ displayStoryTitle(story) }}</strong>
                <small>{{ storyResearchLine(story) }}</small>
                <div class="intel-story-card__signals">
                  <span>{{ researchValueScore(story) }}</span>
                  <span>{{ evidenceLevel(story.article_count) }}</span>
                  <span>{{ formatRange(story.start_date, story.end_date) }}</span>
                </div>
              </button>
            </div>
          </section>

          <section class="intel-section" v-if="currentStory">
            <div class="intel-section__title">
              <span>{{ currentLabel }}</span>
              <span>{{ currentStory.story_id }}</span>
            </div>
            <div class="intel-summary-card">
              <strong>{{
                displayStoryTitle(currentStory)
              }}</strong>
              <p>{{ buildStorySummaryLine(currentStory) }}</p>
              <div class="intel-research-strip">
                <span v-for="signal in currentResearchSignals" :key="signal.label">
                  <label>{{ signal.label }}</label>
                  <strong>{{ signal.value }}</strong>
                </span>
              </div>
              <div class="intel-chip-row">
                <span class="intel-chip">{{
                  familyLabel(currentStory.meta?.dominant_type || 'mixed')
                }}</span>
                <span class="intel-chip">{{
                  graphMode === 'l3'
                    ? `${graphMetrics.mainNodes} 个 L2 节点`
                    : `${graphMetrics.mainNodes} 个走势节点`
                }}</span>
                <span class="intel-chip">{{ currentStory.meta?.article_count || 0 }} 条新闻</span>
              </div>
            </div>
          </section>

          <section class="intel-section intel-section--related" v-if="branchStories.length">
            <div class="intel-section__title">
              <span>关联分支</span>
              <span>{{ branchStories.length }}</span>
            </div>
            <div class="intel-related-list">
              <button
                v-for="item in branchStories"
                :key="item.story_id"
                class="intel-related-card"
                @click="selectStory(item.story_id)"
              >
                <div class="intel-related-card__meta">
                  <span>{{ item.layer }}</span>
                  <span>{{ relationLabel(item) }}</span>
                </div>
                <strong>{{ item.title || `走势链 ${item.story_id}` }}</strong>
                <small>{{ formatRange(item.start_date, item.end_date) }}</small>
              </button>
            </div>
          </section>
        </div>
      </aside>

      <main class="intel-canvas-panel" data-tour="story-canvas">
        <button
          v-if="leftCollapsed"
          class="intel-side-toggle intel-side-toggle--left"
          @click="leftCollapsed = false"
          title="打开导航"
        >
          导航
        </button>
        <div class="intel-canvas-toolbar">
          <div class="intel-chip-row">
            <span class="intel-chip intel-chip--signal" v-if="graphMetrics.mainNodes">
              {{ graphMode === 'l3' ? '宏观节点' : '主链' }} {{ graphMetrics.mainNodes }}
            </span>
            <span class="intel-chip" v-if="graphMetrics.branchStories">
              分支 {{ graphMetrics.branchStories }}
            </span>
            <span class="intel-chip" v-if="graphMetrics.contextLinks">
              关联线 {{ graphMetrics.contextLinks }}
            </span>
          </div>
        </div>

        <div ref="graphContainer" class="intel-canvas"></div>

        <div v-if="loading" class="intel-overlay">
          <div class="intel-spinner"></div>
          <span>正在加载{{ graphMode === 'l3' ? ' L3 大事件图谱' : ' L2 走势工作台' }}...</span>
        </div>

        <div v-else-if="error" class="intel-overlay intel-overlay--error">
          <strong>走势图谱加载失败</strong>
          <p>{{ error }}</p>
          <button class="intel-btn" @click="reloadCurrentStory">重试</button>
        </div>

        <div v-else-if="!currentStory" class="intel-overlay intel-overlay--quiet">
          <strong>请选择{{ graphMode === 'l3' ? '一个大事件' : '一条走势链' }}</strong>
          <p>{{ emptyHint }}</p>
        </div>

        <div class="intel-footerbar" v-if="currentStory">
          <div class="intel-footerbar__focus">
            <span class="intel-footerbar__label">当前焦点</span>
            <strong>{{ selectedInspectorTitle }}</strong>
            <small>{{ selectedInspectorSubtitle }}</small>
          </div>
          <div class="intel-footerbar__legend">
            <span
              ><i class="legend-swatch legend-swatch--main"></i
              >{{ graphMode === 'l3' ? 'L3 主干' : 'L2 主链' }}</span
            >
            <span
              ><i class="legend-swatch legend-swatch--branch"></i
              >{{ graphMode === 'l3' ? '角度支线' : '关联分支' }}</span
            >
            <span><i class="legend-swatch legend-swatch--context"></i>影响关系</span>
          </div>
        </div>

        <Transition name="focus-sheet">
          <section v-if="focusPanelOpen && selectedInspector" class="intel-focus-sheet" @click.stop>
            <header class="intel-focus-sheet__header">
              <div>
                <span class="intel-focus-sheet__eyebrow">{{
                  focusKindLabel(selectedInspector.kind)
                }}</span>
                <h3>{{ selectedInspectorTitle }}</h3>
                <p>{{ selectedInspectorSubtitle }}</p>
              </div>
              <button class="intel-icon-btn" title="关闭详情" @click="closeFocusPanel">
                <span>×</span>
              </button>
            </header>

            <div class="intel-focus-sheet__chips">
              <span v-for="chip in selectedInspectorChips" :key="chip" class="intel-chip">
                {{ chip }}
              </span>
            </div>

            <div class="intel-focus-sheet__metrics">
              <div>
                <label>类型</label>
                <strong>{{ focusPrimaryType }}</strong>
              </div>
              <div>
                <label>研究价值</label>
                <strong>{{ focusResearchValueText }}</strong>
              </div>
              <div>
                <label>证据</label>
                <strong>{{ focusEvidenceText }}</strong>
              </div>
            </div>

            <div class="intel-focus-sheet__actions">
              <button
                v-if="selectedInspector.kind === 'l3-chain' && selectedInspector.l2ChainId"
                class="intel-btn"
                @click="openL2Chain(selectedInspector.l2ChainId)"
              >
                打开 L2
              </button>
              <RouterLink
                v-if="selectedInspector.detailUrl"
                class="intel-evidence-link"
                :to="selectedInspector.detailUrl"
              >
                打开 Story Page
              </RouterLink>
              <button class="intel-btn intel-btn--assistant" @click="openStoryAssistantDrawer(focusAssistantQuestion)">
                让助手研判
              </button>
            </div>

            <section class="intel-focus-section">
              <div class="intel-focus-section__title">
                <span>结构化信息</span>
                <span>{{ focusDetailRows.length }}</span>
              </div>
              <div class="intel-focus-detail-grid">
                <div v-for="row in focusDetailRows" :key="row.label">
                  <label>{{ row.label }}</label>
                  <strong>{{ row.value }}</strong>
                </div>
              </div>
            </section>

            <section v-if="focusInsightText" class="intel-focus-section">
              <div class="intel-focus-section__title">
                <span>研判线索</span>
                <span>{{ focusKindLabel(selectedInspector.kind) }}</span>
              </div>
              <p class="intel-focus-insight">{{ focusInsightText }}</p>
            </section>

            <section v-if="focusResearchActions.length" class="intel-focus-section">
              <div class="intel-focus-section__title">
                <span>研究使用建议</span>
                <span>{{ focusResearchActions.length }}</span>
              </div>
              <ul class="intel-research-actions">
                <li v-for="action in focusResearchActions" :key="action">{{ action }}</li>
              </ul>
            </section>

            <section class="intel-focus-news">
              <div class="intel-focus-news__title">
                <span>相关新闻</span>
                <span>{{ selectedEvidenceNews.length }}</span>
              </div>
              <div v-if="evidenceLoading" class="intel-evidence-loading">正在加载新闻证据...</div>
              <div v-else-if="focusEvidenceNews.length" class="intel-focus-news__list">
                <a
                  v-for="item in focusEvidenceNews"
                  :key="item.news_id"
                  class="intel-focus-news__item"
                  :href="item.url || '#'"
                  target="_blank"
                  rel="noopener"
                >
                  <small>{{ evidenceNewsMeta(item) }}</small>
                  <strong>{{ item.title || `新闻 ${item.news_id}` }}</strong>
                </a>
              </div>
              <div v-else class="intel-evidence-empty">
                {{ focusEmptyText }}
              </div>
            </section>
          </section>
        </Transition>
      </main>

    </div>

    <AssistantDrawer
      v-if="assistantDrawerOpen"
      v-model="assistantDrawerOpen"
      :drawer-key="assistantDrawerKey"
      :page-skill="storyGraphAssistantSkill"
      title="故事图谱数据助手"
      subtitle="读取当前图谱、焦点节点、关系边和证据新闻"
    />
    <button
      ref="assistantFabRef"
      type="button"
      :class="['intel-assistant-fab', { 'is-dragging': assistantFabDragging }]"
      :style="assistantFabStyle"
      title="打开数据助手"
      aria-label="打开数据助手，可拖动"
      @click="handleAssistantFabClick"
      @pointerdown="startAssistantFabDrag"
    >
      <span>AI</span>
      <strong>数据助手</strong>
    </button>
  </div>
</template>

<script setup>
import { computed, defineAsyncComponent, nextTick, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import { getCurrentUser, getToken } from '@/utils/auth'
import {
  L2_RUN_ID as l2RunId,
  L3_RUN_ID as l3RunId,
  angleLabel,
  buildGraphMetrics,
  buildStoryGraphEvidenceParams,
  buildStoryStatsText,
  buildStorySummaryLine,
  cleanStoryTitle,
  edgeLabel,
  evidenceLevel,
  familyLabel,
  filterStorySummaries,
  focusKindLabel,
  formatActorPair,
  formatNewsDate,
  formatRange,
  getFallbackStoryTitle,
  getSummaryCountLabel,
  hasStoryGraphEvidenceTarget,
  loadStoryGraphRenderer,
  makeMainInspector,
  normalizeL2ChainSummary,
  normalizeL3MacroSummary,
  relationEvidenceText,
  relationLabel,
  relationStrengthLabel,
  researchValueLabel,
  researchValueScore,
  sortRelatedStories,
  sortStorySummariesByResearchValue,
  storyGraphApi,
  transformL2ChainResponse,
  transformL3MacroResponse,
} from '@/features/story-graph/index.js'

const ASSISTANT_SESSION_CACHE_KEY = 'story_graph_assistant_sessions_v1'
const ASSISTANT_AUTORUN_CONTEXT_KEY = 'data_assistant_autorun_context_v1'
const ASSISTANT_FAB_POSITION_KEY = 'story_graph_assistant_fab_position_v1'
const AssistantDrawer = defineAsyncComponent(() =>
  import('@/features/assistant/index.js').then((module) => module.AssistantDrawer),
)

const graphMode = ref('l3')
const stories = ref([])
const storySearch = ref('')
const selectedStoryId = ref('')
const currentStory = ref(null)
const loading = ref(false)
const error = ref('')
const leftCollapsed = ref(false)
const showContextLinks = ref(true)
const agentMessages = ref([])
const assistantSessionId = ref('')
const selectedInspector = ref(null)
const selectedClusterDetail = ref(null)
const evidenceLoading = ref(false)
const focusPanelOpen = ref(false)
const assistantDrawerOpen = ref(false)
const assistantDrawerKey = ref(0)
const assistantFabRef = ref(null)
const assistantFabPosition = ref(null)
const assistantFabDragging = ref(false)
const assistantFabMoved = ref(false)

const graphContainer = ref(null)
const graph = shallowRef(null)
let reactFlowFactoryPromise = null

let resizeObserver = null
let storyAbortController = null
let clusterAbortController = null
let messageId = 0
let resizeFitTimer = null
let assistantFabDrag = null

const activeRunId = computed(() => (graphMode.value === 'l3' ? l3RunId : l2RunId))
const graphModeLabel = computed(() => (graphMode.value === 'l3' ? 'L3' : 'L2'))
const pageTitle = computed(() =>
  graphMode.value === 'l3' ? 'L3 大事件脉络图谱' : 'L2 事件走势图谱',
)
const pageSubtitle = computed(() =>
  graphMode.value === 'l3'
    ? '从 L2 micro-chain 聚合超级大事件 · 观察主线、支线、角度和影响关系'
    : '从 L1.5 切面进入 L2 走势链 · 追踪阶段节点、关系强度和演化路径',
)
const libraryTitle = computed(() => (graphMode.value === 'l3' ? '大事件库' : '走势链库'))
const currentLabel = computed(() => (graphMode.value === 'l3' ? '当前大事件' : '当前走势'))
const searchLabel = computed(() => (graphMode.value === 'l3' ? '检索大事件' : '检索走势链'))
const searchPlaceholder = computed(() =>
  graphMode.value === 'l3'
    ? '输入国家、战争、冲突、贸易或宏观议题...'
    : '输入国家、主体、议题或链标题...',
)
const emptyHint = computed(() =>
  graphMode.value === 'l3'
    ? '从左侧 L3 大事件库选择一个宏观事件，打开 L2 支线和影响关系。'
    : '从左侧 L2 走势库选择一条链，打开阶段节点和关系图。',
)
const filteredStories = computed(() =>
  sortStorySummariesByResearchValue(filterStorySummaries(stories.value, storySearch.value)),
)
const branchStories = computed(() => sortRelatedStories(currentStory.value?.related_stories))
const graphMetrics = computed(() => buildGraphMetrics(currentStory.value, branchStories.value))
const storyStatsText = computed(() =>
  buildStoryStatsText(currentStory.value, graphMetrics.value, branchStories.value),
)
const currentResearchSignals = computed(() => {
  const story = currentStory.value
  if (!story) return []
  const score = researchValueScore({
    ...story,
    article_count: story.meta?.article_count,
    segment_count: story.meta?.segment_count,
    l2_chain_count: story.meta?.l2_chain_count,
    quality_score: story.meta?.quality_score,
  })
  return [
    { label: '研究价值', value: `${score} · ${researchValueLabel(score)}` },
    { label: '证据规模', value: evidenceLevel(story.meta?.article_count || 0) },
    {
      label: '结构覆盖',
      value:
        graphMode.value === 'l3'
          ? `${story.meta?.visible_node_count || graphMetrics.value.mainNodes}/${story.meta?.total_node_count || graphMetrics.value.mainNodes} L2`
          : `${story.meta?.segment_count || graphMetrics.value.mainNodes} 节点`,
    },
    { label: '运行批次', value: story.meta?.run_id || activeRunId.value },
  ]
})
const assistantFabStyle = computed(() => {
  const position = assistantFabPosition.value
  if (!position) return {}
  return {
    left: `${Math.round(position.x)}px`,
    top: `${Math.round(position.y)}px`,
    right: 'auto',
    bottom: 'auto',
  }
})

const storyGraphAssistantSkill = computed(() => {
  const story = currentStory.value || {}
  const focus = selectedInspectorTitle.value || '尚未选择焦点'
  return {
    page: '事件故事脉络',
    path: '/data-service/story-graph',
    summary: `${story.story_title || story.story_id || '当前故事图谱'}；节点 ${(story.nodes || []).length} 个，关系边 ${(story.edges || []).length} 条，当前焦点 ${focus}。`,
    access: [
      '数据服务 > 事件故事脉络',
      '数据搜索页的 L2/L3 结果可进入故事图谱',
      '新闻详情和观察台可通过链路跳转到对应故事',
    ],
    sections: [
      '左侧 L2/L3 故事列表',
      '中间关系图谱',
      '焦点节点/关系边面板',
      '证据新闻与助手分析台',
    ],
    actions: [
      '切换 L2/L3 故事',
      '搜索故事链',
      '点击节点或关系边聚焦',
      '打开证据新闻',
      '进入 L2 链详情',
    ],
    aiActions: [
      '解释当前图谱主线和影响关系',
      '基于焦点节点/关系边指出证据缺口',
      '生成后续核验问题和报告提纲',
    ],
  }
})

const selectedInspectorTitle = computed(() => {
  if (!selectedInspector.value) {
    return displayStoryTitle(currentStory.value) || '尚未选择焦点'
  }
  return cleanStoryTitle(selectedInspector.value.title, selectedInspector.value) || displayStoryTitle(currentStory.value) || '走势焦点'
})

const selectedInspectorSubtitle = computed(() => {
  if (!selectedInspector.value) {
    return currentStory.value
      ? buildStorySummaryLine(currentStory.value)
      : '请选择一条走势链开始分析。'
  }
  if (selectedInspector.value.kind === 'l2-segment') {
    return `${angleLabel(selectedInspector.value.storyAngle || selectedInspector.value.eventType)} · ${formatRange(selectedInspector.value.startDate, selectedInspector.value.endDate)}`
  }
  if (selectedInspector.value.kind === 'l3-chain') {
    return `${familyLabel(selectedInspector.value.lane || selectedInspector.value.eventType)} · ${formatRange(selectedInspector.value.startDate, selectedInspector.value.endDate)}`
  }
  if (selectedInspector.value.kind === 'cluster') {
    return `${angleLabel(selectedInspector.value.eventType) || '未知类型'} · ${formatActorPair(selectedInspector.value.initiator, selectedInspector.value.target, '主体未知')}`
  }
  if (selectedInspector.value.kind === 'branch-story') {
    return `${relationLabel(selectedInspector.value.relation)} · ${formatRange(selectedInspector.value.startDate, selectedInspector.value.endDate)}`
  }
  if (selectedInspector.value.kind === 'edge') {
    return relationEvidenceText(selectedInspector.value)
  }
  return selectedInspector.value.subtitle || buildStorySummaryLine(currentStory.value)
})

const selectedInspectorChips = computed(() => {
  if (!selectedInspector.value) return []
  if (selectedInspector.value.kind === 'l2-segment') {
    return [
      angleLabel(selectedInspector.value.storyAngle || selectedInspector.value.eventType),
      `${selectedInspector.value.articleCount || 0} 条新闻`,
      formatRange(selectedInspector.value.startDate, selectedInspector.value.endDate),
    ].filter(Boolean)
  }
  if (selectedInspector.value.kind === 'l3-chain') {
    return [
      familyLabel(selectedInspector.value.lane || selectedInspector.value.eventType),
      `${selectedInspector.value.segmentCount || 0} 个 L1.5 片段`,
      `${selectedInspector.value.articleCount || 0} 条新闻`,
      formatRange(selectedInspector.value.startDate, selectedInspector.value.endDate),
    ].filter(Boolean)
  }
  if (selectedInspector.value.kind === 'cluster') {
    return [
      angleLabel(selectedInspector.value.eventType) || '未知类型',
      `${selectedInspector.value.articleCount || 0} 条新闻`,
      formatRange(selectedInspector.value.startDate, selectedInspector.value.endDate),
    ].filter(Boolean)
  }
  if (selectedInspector.value.kind === 'branch-story') {
    return [
      selectedInspector.value.relation?.layer || '关联',
      relationLabel(selectedInspector.value.relation),
      `${selectedInspector.value.nodeCount || 0} 个节点`,
    ].filter(Boolean)
  }
  if (selectedInspector.value.kind === 'edge') {
    return [
      edgeLabel(selectedInspector.value.edgeType),
      selectedInspector.value.layer || 'story',
      selectedInspector.value.weight
        ? `权重 ${Number(selectedInspector.value.weight).toFixed(2)}`
        : '',
    ].filter(Boolean)
  }
  return [
    familyLabel(currentStory.value?.meta?.dominant_type || 'mixed'),
    `${graphMetrics.value.mainNodes} 个节点`,
    `${graphMetrics.value.branchStories} 个分支`,
  ]
})

const selectedEvidenceNews = computed(() => {
  return Array.isArray(selectedClusterDetail.value?.news) ? selectedClusterDetail.value.news : []
})

const focusEvidenceNews = computed(() => selectedEvidenceNews.value.slice(0, 8))

const focusArticleCount = computed(() => {
  return (
    selectedClusterDetail.value?.article_count ||
    selectedClusterDetail.value?.articleCount ||
    selectedInspector.value?.articleCount ||
    selectedInspector.value?.segmentCount ||
    0
  )
})

const focusResearchScore = computed(() => {
  const item = selectedClusterDetail.value || selectedInspector.value || currentStory.value
  if (!item) return 0
  return researchValueScore({
    ...item,
    article_count: focusArticleCount.value || item.article_count || item.articleCount,
    segment_count: item.segment_count || item.segmentCount,
    quality_score: item.quality_score || item.importanceScore || currentStory.value?.meta?.quality_score,
    start_date: item.start_date || item.startDate,
    end_date: item.end_date || item.endDate,
  })
})

const focusResearchValueText = computed(() => {
  if (selectedInspector.value?.kind === 'edge') return relationStrengthLabel(selectedInspector.value)
  return `${focusResearchScore.value} · ${researchValueLabel(focusResearchScore.value)}`
})

const focusEvidenceText = computed(() => {
  const isDirectEvidence = ['l2-segment', 'cluster'].includes(selectedInspector.value?.kind)
  return evidenceLevel(focusArticleCount.value, { direct: isDirectEvidence })
})

const focusPrimaryType = computed(() => {
  const item = selectedInspector.value
  if (!item) return '未选择'
  if (item.kind === 'edge') return edgeLabel(item.edgeType)
  return (
    angleLabel(item.storyAngle || item.eventType || selectedClusterDetail.value?.event_type) ||
    familyLabel(item.lane || item.eventType || currentStory.value?.meta?.dominant_type || 'mixed')
  )
})

const focusTimeRange = computed(() => {
  const item = selectedInspector.value || {}
  return formatRange(
    item.startDate || item.start_date || selectedClusterDetail.value?.start_date,
    item.endDate || item.end_date || selectedClusterDetail.value?.end_date,
  )
})

const focusEmptyText = computed(() => {
  if (selectedInspector.value?.kind === 'l3-chain') {
    return '该节点是一条 L2 支线，可打开 L2 查看内部阶段和原文证据。'
  }
  if (selectedInspector.value?.kind === 'edge') {
    return selectedInspector.value.relationReason || '该关系边表达两个节点之间的推进或影响关系。'
  }
  return '当前焦点暂无可展示的新闻证据。'
})

const focusDetailRows = computed(() => {
  const item = selectedInspector.value
  if (!item) return []

  const detail = selectedClusterDetail.value || {}
  const rows = [
    ['焦点类型', focusKindLabel(item.kind)],
    [
      '关系主体',
      formatActorPair(item.initiator || detail.initiator, item.target || detail.target, ''),
    ],
    ['时间范围', focusTimeRange.value],
    ['分类角度', focusPrimaryType.value],
    ['研究价值', focusResearchValueText.value],
    ['证据等级', focusEvidenceText.value],
  ]

  if (item.kind === 'l3-chain') {
    rows.push(
      ['L2 链 ID', item.l2ChainId],
      ['片段规模', `${item.segmentCount || 0} 个 L1.5 片段`],
      ['取证方式', '打开 L2 后查看阶段证据'],
    )
  } else if (item.kind === 'l2-segment') {
    rows.push(['Segment ID', item.segmentId], ['Story Page', item.detailUrl ? '可打开' : '未提供'])
  } else if (item.kind === 'cluster') {
    rows.push(['Cluster ID', item.originalClusterId || item.l1ClusterId])
  } else if (item.kind === 'edge') {
    rows.push(
      ['起点', findStoryNodeTitle(item.sourceId)],
      ['终点', findStoryNodeTitle(item.targetId)],
      ['关系强度', relationStrengthLabel(item)],
      ['判定依据', relationEvidenceText(item)],
    )
  }

  return rows
    .map(([label, value]) => ({ label, value: displayValue(value) }))
    .filter((row) => row.value !== '未标注')
})

const focusInsightText = computed(() => {
  const item = selectedInspector.value
  if (!item) return ''
  if (item.kind === 'edge') {
    return `该边表示“${edgeLabel(item.edgeType)}”。${relationEvidenceText(item)}；作为研究证据时应优先核验两端节点的原文、日期先后和共同主体，避免把单纯时间重叠解读为因果。`
  }
  if (item.kind === 'l3-chain') {
    return `该支线承担“${familyLabel(item.lane || item.eventType)}”角色，聚合 ${item.segmentCount || 0} 个片段和 ${item.articleCount || 0} 条新闻。它适合作为 L3 事件中的独立研究子样本，但直接取证需要进入 L2。`
  }
  if (item.kind === 'l2-segment') {
    return `该节点来自 L1 事件聚类，当前聚合 ${item.articleCount || 0} 条新闻；适合核验其时间位置、主体关系、来源分布，以及是否构成走势拐点。`
  }
  if (item.kind === 'cluster') {
    return buildStorySummaryLine(selectedClusterDetail.value || item) || selectedInspectorSubtitle.value
  }
  return selectedInspectorSubtitle.value
})

const focusResearchActions = computed(() => {
  const item = selectedInspector.value
  if (!item) return []
  if (item.kind === 'edge') {
    return [
      '先比较起点和终点的发布时间，确认方向是否成立。',
      '检查共同主体、共同议题和原文来源，区分相关性与因果性。',
      relationStrengthLabel(item) === '弱解释关系'
        ? '该边解释较弱，暂时作为待核验假设使用。'
        : '该边可进入报告草稿，但需要保留依据字段。',
    ]
  }
  if (item.kind === 'l3-chain') {
    return [
      '作为宏观事件的子样本下钻到 L2，避免只凭 L3 聚合标题判断。',
      '比较同一 L3 内其他支线，确认它是主线、支线还是背景变量。',
      '记录 L2 链 ID 和 run_id，保证后续复现实验样本。',
    ]
  }
  if (item.kind === 'l2-segment' || item.kind === 'cluster') {
    return [
      '优先打开相关新闻，核验标题、来源和发布时间。',
      '检查该节点前后相邻节点，判断它是否是拐点或只是并行报道。',
      focusArticleCount.value < 5
        ? '当前证据量偏少，作为线索使用，不宜直接下结论。'
        : '证据量可用，可进一步做来源交叉核查。',
    ]
  }
  return [
    '先看研究价值和证据等级，再决定是否下钻。',
    '保留 run_id、时间范围和节点 ID，便于复现。',
  ]
})

const focusAssistantQuestion = computed(() => {
  return `请基于当前焦点「${selectedInspectorTitle.value}」做结构化研判：解释其在整张图谱中的位置、与相邻节点/关系的影响方向、证据强弱、仍需核验的问题和下一步观察清单。`
})

watch(selectedStoryId, async (value) => {
  if (!value) return
  await loadStoryWorkspace(value)
})

watch(showContextLinks, async () => {
  if (currentStory.value) await renderWorkspaceGraph()
})

onMounted(async () => {
  restoreAssistantFabPosition()
  window.addEventListener('resize', clampAssistantFabPosition)
  await loadStories()
  await nextTick()
  setupResizeObserver()
})

onUnmounted(() => {
  window.removeEventListener('resize', clampAssistantFabPosition)
  if (storyAbortController) storyAbortController.abort()
  if (clusterAbortController) clusterAbortController.abort()
  if (resizeFitTimer) window.clearTimeout(resizeFitTimer)
  resizeObserver?.disconnect()
  graph.value?.destroy()
  graph.value = null
})

async function switchGraphMode(mode, preferredId = '') {
  if (!['l2', 'l3'].includes(mode)) return
  if (graphMode.value !== mode) {
    graphMode.value = mode
    storySearch.value = ''
    selectedStoryId.value = ''
    currentStory.value = null
    selectedInspector.value = null
    selectedClusterDetail.value = null
    focusPanelOpen.value = false
  }
  await loadStories(preferredId)
}

async function loadStories(preferredId = '') {
  try {
    const isL3 = graphMode.value === 'l3'
    const payload = await storyGraphApi.listStories(graphMode.value)
    stories.value = isL3
      ? (payload.macros || []).map(normalizeL3MacroSummary)
      : (payload.chains || []).map(normalizeL2ChainSummary)

    const preferred = preferredId ? String(preferredId) : ''
    const nextId =
      preferred && stories.value.some((story) => String(story.id) === preferred)
        ? preferred
        : stories.value[0]?.id
    if (nextId) {
      if (selectedStoryId.value === String(nextId)) {
        await loadStoryWorkspace(String(nextId))
      } else {
        selectedStoryId.value = String(nextId)
      }
    }
  } catch (err) {
    stories.value = []
    error.value =
      err?.response?.data?.detail || err.message || `无法加载 ${graphModeLabel.value} 图谱列表。`
  }
}

function selectStory(storyId) {
  focusPanelOpen.value = false
  selectedStoryId.value = String(storyId)
}

async function reloadCurrentStory() {
  if (!selectedStoryId.value) return
  await loadStoryWorkspace(selectedStoryId.value)
}

async function loadStoryWorkspace(storyId) {
  if (storyAbortController) storyAbortController.abort()
  storyAbortController = new AbortController()
  loading.value = true
  error.value = ''
  selectedClusterDetail.value = null
  selectedInspector.value = null
  evidenceLoading.value = false
  focusPanelOpen.value = false
  resetAgentState()

  try {
    const isL3 = graphMode.value === 'l3'
    const payload = await storyGraphApi.getWorkspace(graphMode.value, storyId, {
      signal: storyAbortController.signal,
    })
    currentStory.value = isL3
      ? transformL3MacroResponse(payload)
      : transformL2ChainResponse(payload)
    selectedInspector.value = makeMainInspector(currentStory.value, graphMode.value)
    await bootstrapStoryAssistantSession()
    await nextTick()
    await renderWorkspaceGraph()
  } catch (err) {
    if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return
    currentStory.value = null
    error.value =
      err?.response?.data?.detail || err.message || `无法加载所选 ${graphModeLabel.value} 图谱。`
    graph.value?.destroy()
    graph.value = null
  } finally {
    loading.value = false
  }
}

function setupResizeObserver() {
  if (!graphContainer.value || typeof ResizeObserver === 'undefined') return
  resizeObserver = new ResizeObserver((entries) => {
    const entry = entries[0]
    if (!entry) return
    const { width, height } = entry.contentRect
    if (width < 160 || height < 160) return
    if (!graph.value || !currentStory.value) return
    if (resizeFitTimer) window.clearTimeout(resizeFitTimer)
    resizeFitTimer = window.setTimeout(() => {
      graph.value?.fitView()
    }, 180)
  })
  resizeObserver.observe(graphContainer.value)
}

function fallbackStoryTitle(id) {
  return getFallbackStoryTitle(graphMode.value, id)
}

function displayStoryTitle(story) {
  if (!story) return ''
  return cleanStoryTitle(story.story_title || story.title, story) || fallbackStoryTitle(story.story_id || story.id)
}

function storyResearchLine(story) {
  if (!story) return ''
  const parts = [
    familyLabel(story.family_group || story.event_type || story.meta?.dominant_type),
    getSummaryCountLabel(graphMode.value, story),
    story.article_count || story.meta?.article_count ? `${story.article_count || story.meta?.article_count} 条新闻` : '',
  ].filter(Boolean)
  return parts.join(' · ')
}

function evidenceNewsMeta(item) {
  const source = item?.source || item?.domain || item?.site_name || '未知来源'
  return `${source} · ${formatNewsDate(item)}`
}

async function renderWorkspaceGraph() {
  if (!graphContainer.value || !currentStory.value) return
  if (!reactFlowFactoryPromise) {
    reactFlowFactoryPromise = loadStoryGraphRenderer()
  }
  const createStoryGraphRenderer = await reactFlowFactoryPromise

  if (!graph.value) {
    graph.value = createStoryGraphRenderer(graphContainer.value)
  }

  graph.value.render({
    storyGraph: currentStory.value,
    showContextLinks: showContextLinks.value,
    onSelectInspector: selectInspector,
    onCanvasClick() {
      selectedInspector.value = makeMainInspector(currentStory.value, graphMode.value)
      selectedClusterDetail.value = null
      focusPanelOpen.value = false
    },
  })
}

async function selectInspector(payload) {
  selectedInspector.value = payload
  focusPanelOpen.value = payload.kind !== 'main-story'

  if (['l2-segment', 'cluster', 'l3-chain'].includes(payload.kind)) {
    await loadNodeEvidence(payload)
    return
  }

  if (payload.kind === 'edge') {
    selectedClusterDetail.value = null
    evidenceLoading.value = false
    return
  }

  selectedClusterDetail.value = null
  evidenceLoading.value = false
}

async function loadNodeEvidence(payload) {
  selectedClusterDetail.value = payload
  const params = buildStoryGraphEvidenceParams(payload, {
    currentL2RunId: currentStory.value?.meta?.l2_run_id,
  })

  if (!hasStoryGraphEvidenceTarget(params)) {
    evidenceLoading.value = false
    return
  }

  if (clusterAbortController) clusterAbortController.abort()
  clusterAbortController = new AbortController()
  evidenceLoading.value = true
  try {
    const evidence = await storyGraphApi.getEvidence(params, {
      signal: clusterAbortController.signal,
    })
    selectedClusterDetail.value = {
      ...payload,
      ...evidence,
      news: evidence.news || [],
    }
  } catch (err) {
    if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return
    selectedClusterDetail.value = payload
  } finally {
    evidenceLoading.value = false
  }
}

async function openL2Chain(chainId) {
  if (!chainId) return
  focusPanelOpen.value = false
  await switchGraphMode('l2', chainId)
}

function closeFocusPanel() {
  focusPanelOpen.value = false
}

function toggleContextLinks() {
  showContextLinks.value = !showContextLinks.value
}

async function fitCanvas() {
  if (!graph.value) return
  await graph.value.fitView()
}

function resetAgentState({ keepSession = false } = {}) {
  agentMessages.value = []
  if (!keepSession) assistantSessionId.value = ''
}

function safeParseJson(raw, fallback) {
  try {
    const parsed = JSON.parse(raw)
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

function currentUserCacheKey() {
  const user = getCurrentUser?.() || {}
  return String(user.id || user.user_id || user.username || getToken().slice(0, 24) || 'anonymous')
}

function storyAssistantCacheKey() {
  const storyId = currentStory.value?.story_id || selectedStoryId.value || 'none'
  return `${currentUserCacheKey()}:${graphMode.value}:${storyId}`
}

function readAssistantSessionCache() {
  return safeParseJson(localStorage.getItem(ASSISTANT_SESSION_CACHE_KEY), {})
}

function readCachedStoryAssistantSession() {
  const cache = readAssistantSessionCache()
  const value = cache[storyAssistantCacheKey()]
  const sid = value ? String(value).trim() : ''
  return /^\d+$/.test(sid) ? sid : ''
}

function clearCachedStoryAssistantSession() {
  const cache = readAssistantSessionCache()
  delete cache[storyAssistantCacheKey()]
  localStorage.setItem(ASSISTANT_SESSION_CACHE_KEY, JSON.stringify(cache))
}

function mapAssistantMessageRow(row) {
  return {
    id: row?.id != null ? `db-${row.id}` : `local-${++messageId}`,
    role: row?.role === 'assistant' ? 'assistant' : 'user',
    text: String(row?.content || ''),
  }
}

async function loadAssistantSessionMessages(sessionId) {
  const sid = String(sessionId || '').trim()
  if (!sid || !getToken()) return false
  try {
    const rows = await storyGraphApi.getAssistantSessionMessages(sid, {
      token: getToken(),
    })
    agentMessages.value = Array.isArray(rows) ? rows.map(mapAssistantMessageRow) : []
    return true
  } catch {
    return false
  }
}

async function bootstrapStoryAssistantSession() {
  resetAgentState()
  if (!currentStory.value || !getToken()) return
  const cachedSessionId = readCachedStoryAssistantSession()
  if (!cachedSessionId) return
  assistantSessionId.value = cachedSessionId
  const loaded = await loadAssistantSessionMessages(cachedSessionId)
  if (!loaded) {
    assistantSessionId.value = ''
    clearCachedStoryAssistantSession()
    agentMessages.value = []
  }
}

function buildStoryGraphAutorunContext(question = '') {
  const fallbackQuestion = '请解释当前事件故事脉络，指出主线、关键节点、影响关系、证据缺口和下一步观察方向。'
  const visibleQuestion = String(question || fallbackQuestion).trim()
  return {
    visibleMessage: visibleQuestion,
    prompt: buildStoryGraphAssistantPrompt(visibleQuestion),
    mode: 'expert',
    extraBody: { tool_mode: 'context_only' },
  }
}

function openStoryAssistantDrawer(question = '') {
  if (currentStory.value) {
    sessionStorage.setItem(
      ASSISTANT_AUTORUN_CONTEXT_KEY,
      JSON.stringify(buildStoryGraphAutorunContext(question)),
    )
  } else {
    sessionStorage.removeItem(ASSISTANT_AUTORUN_CONTEXT_KEY)
  }
  assistantDrawerKey.value += 1
  assistantDrawerOpen.value = true
}

function handleAssistantFabClick() {
  if (assistantFabMoved.value) {
    assistantFabMoved.value = false
    return
  }
  openStoryAssistantDrawer()
}

function startAssistantFabDrag(event) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  const target = event.currentTarget
  const rect = target.getBoundingClientRect()
  assistantFabDrag = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    originX: rect.left,
    originY: rect.top,
    width: rect.width,
    height: rect.height,
  }
  assistantFabMoved.value = false
  assistantFabDragging.value = true
  target.setPointerCapture?.(event.pointerId)
  window.addEventListener('pointermove', dragAssistantFab)
  window.addEventListener('pointerup', stopAssistantFabDrag)
  window.addEventListener('pointercancel', stopAssistantFabDrag)
}

function dragAssistantFab(event) {
  if (!assistantFabDrag || event.pointerId !== assistantFabDrag.pointerId) return
  const deltaX = event.clientX - assistantFabDrag.startX
  const deltaY = event.clientY - assistantFabDrag.startY
  if (Math.abs(deltaX) + Math.abs(deltaY) > 4) assistantFabMoved.value = true
  assistantFabPosition.value = clampAssistantFabPoint({
    x: assistantFabDrag.originX + deltaX,
    y: assistantFabDrag.originY + deltaY,
  }, assistantFabDrag.width, assistantFabDrag.height)
}

function stopAssistantFabDrag(event) {
  if (assistantFabDrag && event?.pointerId && event.pointerId !== assistantFabDrag.pointerId) return
  const target = assistantFabRef.value
  target?.releasePointerCapture?.(assistantFabDrag?.pointerId)
  assistantFabDragging.value = false
  assistantFabDrag = null
  window.removeEventListener('pointermove', dragAssistantFab)
  window.removeEventListener('pointerup', stopAssistantFabDrag)
  window.removeEventListener('pointercancel', stopAssistantFabDrag)
  persistAssistantFabPosition()
  if (assistantFabMoved.value) {
    window.setTimeout(() => {
      assistantFabMoved.value = false
    }, 0)
  }
}

function clampAssistantFabPoint(point, width = 132, height = 48) {
  if (typeof window === 'undefined') return point
  const margin = window.innerWidth <= 760 ? 12 : 18
  const maxX = Math.max(margin, window.innerWidth - width - margin)
  const maxY = Math.max(margin, window.innerHeight - height - margin)
  return {
    x: Math.min(maxX, Math.max(margin, Number(point?.x || margin))),
    y: Math.min(maxY, Math.max(margin, Number(point?.y || margin))),
  }
}

function clampAssistantFabPosition() {
  if (!assistantFabPosition.value) return
  const rect = assistantFabRef.value?.getBoundingClientRect()
  assistantFabPosition.value = clampAssistantFabPoint(
    assistantFabPosition.value,
    rect?.width,
    rect?.height,
  )
  persistAssistantFabPosition()
}

function restoreAssistantFabPosition() {
  try {
    const raw = localStorage.getItem(ASSISTANT_FAB_POSITION_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    if (!parsed || typeof parsed !== 'object') return
    assistantFabPosition.value = clampAssistantFabPoint(parsed)
  } catch {
    assistantFabPosition.value = null
  }
}

function persistAssistantFabPosition() {
  if (!assistantFabPosition.value) return
  try {
    localStorage.setItem(ASSISTANT_FAB_POSITION_KEY, JSON.stringify(assistantFabPosition.value))
  } catch {
    // Ignore storage failures; dragging should still work for the current session.
  }
}

function buildStoryGraphAssistantPrompt(question) {
  const context = buildStoryGraphAssistantContext()
  return `${context}\n\n----\n【用户问题】\n${question}`
}

function buildStoryGraphAssistantContext() {
  const story = currentStory.value
  if (!story) return '【StoryGraph 当前图谱上下文】当前没有加载走势图谱。'

  const nodes = (story.nodes || []).slice(0, 18).map((node, index) => {
    const type = node.source_kind === 'l3-chain' ? 'L2支线' : '节点'
    const title = compactText(cleanStoryTitle(node.label || node.title, node) || node.id, 120)
    const family = familyLabel(node.lane || node.story_angle || node.event_type || node.event_family)
    const dates = formatRange(node.start_date, node.end_date)
    const evidence = node.article_count ? evidenceLevel(node.article_count) : ''
    const actors = formatActorPair(node.initiator, node.target, '')
    const value = researchValueScore(node)
    return `${index + 1}. ${type} ${title}；${family}；${dates}；价值 ${value}/${researchValueLabel(value)}${evidence ? `；${evidence}` : ''}${actors ? `；主体 ${actors}` : ''}`
  })

  const edges = (story.edges || []).slice(0, 22).map((edge, index) => {
    const from = findStoryNodeTitle(edge.from_id)
    const to = findStoryNodeTitle(edge.to_id)
    const label = edgeLabel(edge.edge_type)
    const reason = compactText(relationEvidenceText(edge), 160)
    return `${index + 1}. ${from} -> ${to}；${label}；${relationStrengthLabel(edge)}；依据 ${reason}`
  })

  const branches = branchStories.value.slice(0, 10).map((item, index) => {
    const title = compactText(cleanStoryTitle(item.title, item) || item.story_id, 110)
    return `${index + 1}. ${title}；${relationLabel(item)}；${formatRange(item.start_date, item.end_date)}；${evidenceLevel(item.article_count || 0)}`
  })

  const focus = selectedInspector.value
  const focusLines = focus
    ? [
        `焦点类型：${focusKindLabel(focus.kind)}`,
        `焦点标题：${compactText(selectedInspectorTitle.value, 160)}`,
        `焦点说明：${compactText(selectedInspectorSubtitle.value, 220)}`,
        `焦点标签：${selectedInspectorChips.value.join(' / ') || '无'}`,
        `焦点研究价值：${focusResearchValueText.value}`,
        `焦点证据等级：${focusEvidenceText.value}`,
        `研究使用建议：${focusResearchActions.value.join('；') || '无'}`,
      ]
    : ['当前未选择具体焦点。']

  const evidence = selectedEvidenceNews.value.slice(0, 8).map((item, index) => {
    const title = compactText(item.title || item.news_title || item.news_id, 150)
    const source = item.source || item.domain || '未知来源'
    return `${index + 1}. ${title}；${source}；${formatNewsDate(item)}`
  })

  const lines = [
    '【StoryGraph 当前图谱上下文】',
    `来源页面：故事图谱分析台，已接入数据助手会话。`,
    `图谱层级：${graphMode.value === 'l3' ? 'L3 大事件' : 'L2 走势链'}；run_id=${activeRunId.value}`,
    `图谱标题：${compactText(story.story_title || story.story_id, 180)}`,
    `图谱 ID：${story.story_id}`,
    `摘要：${compactText(story.meta?.summary || buildStorySummaryLine(story), 500)}`,
    `统计：${storyStatsText.value || '无'}`,
    `研究基线：${currentResearchSignals.value.map((signal) => `${signal.label}=${signal.value}`).join('；')}`,
    '',
    '【当前焦点】',
    ...focusLines,
    '',
    `【主要节点｜最多 ${nodes.length} 条】`,
    ...(nodes.length ? nodes : ['无节点数据']),
    '',
    `【关系边｜最多 ${edges.length} 条】`,
    ...(edges.length ? edges : ['无关系边数据']),
    '',
    `【关联分支｜最多 ${branches.length} 条】`,
    ...(branches.length ? branches : ['无关联分支']),
    '',
    `【焦点证据新闻｜最多 ${evidence.length} 条】`,
    ...(evidence.length ? evidence : ['当前焦点未加载新闻证据']),
    '',
    '【回答要求】',
    '请把图谱结构当作当前工作台上下文，首轮只基于这里给出的节点、关系边、分支和证据新闻研判，不自动调用外部工具。',
    '输出结构：1）主线；2）关键节点与关系强弱；3）证据缺口；4）下一步观察；5）后续精确检索词（最多 4 条）。',
    '明确区分“图谱事实 / 分析推断 / 待核实”。不得把 continuation、parallel、influence 等图谱边直接写成因果；弱边必须说明局限。',
    '不得引入当前材料之外的人物言论、会议细节、争议传闻或新闻事实。需要补证时只写检索建议，不得假装已经检索。',
    '正文控制在 1200 字以内，优先回答用户问题，不复述全部上下文。',
  ]
  return clampText(lines.join('\n'), 11000)
}

function findStoryNodeTitle(nodeId) {
  const id = String(nodeId || '')
  const node = (currentStory.value?.nodes || []).find((item) => String(item.id) === id)
  return compactText(cleanStoryTitle(node?.label || node?.title, node) || id || '未知节点', 80)
}

function compactText(value, max = 160) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  if (!text) return ''
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

function displayValue(value) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  return text || '未标注'
}

function clampText(value, max = 11000) {
  const text = String(value || '')
  return text.length > max ? `${text.slice(0, max)}\n【上下文已截断】` : text
}

</script>

<style scoped>
.intel-page {
  --nav-offset: 72px;
  --bg: #f4f7fa;
  --paper: rgba(252, 254, 255, 0.96);
  --paper-soft: rgba(243, 248, 252, 0.92);
  --paper-strong: rgba(255, 255, 255, 0.97);
  --paper-muted: rgba(232, 240, 247, 0.78);
  --panel: rgba(250, 253, 255, 0.93);
  --panel-strong: rgba(250, 253, 255, 0.97);
  --stroke: rgba(43, 83, 119, 0.26);
  --stroke-strong: rgba(31, 113, 184, 0.58);
  --text: #10243c;
  --muted: #5b7085;
  --soft: #2b4c6a;
  --accent: #1f7bbd;
  --accent-2: #0f8d9d;
  --amber: #2563eb;
  --walnut: #174a72;
  --copper: #256ea8;
  --sage: #4f88a8;
  --navy: #10243c;
  --panel-radius: 8px;
  position: relative;
  min-height: 100vh;
  height: 100vh;
  padding-top: var(--nav-offset);
  background-color: var(--bg);
  background-image:
    linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(241, 246, 250, 0.78)),
    radial-gradient(circle at 12% 0%, rgba(110, 166, 208, 0.08), transparent 32%),
    radial-gradient(circle at 86% 12%, rgba(48, 132, 185, 0.06), transparent 30%),
    repeating-linear-gradient(135deg, rgba(67, 116, 157, 0.024) 0 1px, transparent 1px 18px);
  background-repeat: no-repeat, no-repeat, no-repeat, repeat;
  background-size:
    auto,
    auto,
    auto,
    220px 220px;
  color: var(--text);
  font-family:
    'Noto Sans CJK SC', 'Source Han Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.intel-page::before,
.intel-page::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
}

.intel-page::before {
  opacity: 0.32;
  background-image:
    linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.56),
      rgba(235, 243, 250, 0.1) 36%,
      rgba(62, 123, 171, 0.045)
    ),
    repeating-linear-gradient(0deg, rgba(37, 91, 135, 0.018) 0 1px, transparent 1px 34px),
    repeating-linear-gradient(90deg, rgba(37, 91, 135, 0.014) 0 1px, transparent 1px 34px),
    repeating-linear-gradient(
      114deg,
      transparent 0 132px,
      rgba(71, 128, 174, 0.028) 132px 190px,
      transparent 190px 340px
    );
  background-size:
    auto,
    34px 34px,
    34px 34px,
    340px 340px;
}

.intel-page::after {
  opacity: 0.07;
  background-image:
    linear-gradient(rgba(25, 82, 128, 0.022) 1px, transparent 1px),
    linear-gradient(90deg, rgba(25, 82, 128, 0.016) 1px, transparent 1px);
  background-size: 32px 32px;
}

.intel-topbar {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 18px;
  padding: 12px 20px 10px;
  border-bottom: 1px solid var(--stroke);
  background: rgba(252, 254, 255, 0.93);
  backdrop-filter: blur(14px);
}

.intel-topbar__brand {
  display: flex;
  align-items: flex-start;
  gap: 18px;
}

.intel-kicker {
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--amber);
  padding-top: 6px;
  font-weight: 900;
}

.intel-topbar h1 {
  margin: 0;
  font-size: clamp(24px, 2.1vw, 34px);
  letter-spacing: 0;
  line-height: 1.08;
  font-weight: 900;
}

.intel-topbar p {
  margin: 4px 0 0;
  color: var(--muted);
  font-size: 13px;
}

.intel-topbar__meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.intel-mode-switch {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  border: 1px solid var(--stroke);
  border-radius: var(--panel-radius);
  background: rgba(244, 248, 252, 0.94);
}

.intel-mode-switch button {
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--muted);
  padding: 9px 11px;
  font-size: 12px;
  font-weight: 900;
  cursor: pointer;
}

.intel-mode-switch button.is-active {
  background: var(--navy);
  color: #fff;
}

.intel-badge,
.intel-chip {
  border: 1px solid var(--stroke);
  background: var(--paper-strong);
  color: #314352;
  border-radius: var(--panel-radius);
  padding: 7px 10px;
  font-size: 12px;
  line-height: 1;
  white-space: nowrap;
}

.intel-badge--soft,
.intel-chip--signal {
  border-color: rgba(38, 126, 173, 0.32);
  background: rgba(219, 240, 252, 0.9);
  color: #235f86;
}

.intel-badge--build {
  border-color: rgba(38, 99, 235, 0.22);
  background: rgba(232, 241, 255, 0.88);
  color: #275c9b;
}

.intel-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.intel-chip--action {
  cursor: pointer;
}

.intel-shell {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: clamp(280px, 20vw, 340px) minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
  align-items: stretch;
  gap: 10px;
  padding: 10px 12px 12px;
  width: 100%;
  max-width: none;
  margin: 0;
  overflow: hidden;
}

.intel-shell.is-left-collapsed {
  grid-template-columns: 0 minmax(0, 1fr);
}

.intel-side {
  min-width: 0;
  min-height: 0;
  height: 100%;
  max-height: 100%;
  overflow: hidden;
  transition:
    width 180ms ease,
    opacity 180ms ease;
}

.intel-side.is-collapsed {
  width: 0;
  opacity: 0;
  pointer-events: none;
}

.intel-panel,
.intel-canvas-panel {
  border: 1px solid var(--stroke);
  background: var(--panel);
  backdrop-filter: blur(18px);
  box-shadow:
    0 18px 44px rgba(24, 67, 106, 0.14),
    0 4px 12px rgba(24, 67, 106, 0.1);
  border-radius: var(--panel-radius);
  min-height: 0;
}

.intel-panel {
  height: 100%;
  max-height: 100%;
  background: rgba(252, 254, 255, 0.93);
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

.intel-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}

.intel-panel__eyebrow {
  display: block;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--amber);
  margin-bottom: 4px;
}

.intel-panel__header h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
}

.intel-icon-btn,
.intel-btn {
  border: 1px solid var(--stroke);
  background: var(--paper-strong);
  color: var(--navy);
  border-radius: var(--panel-radius);
  padding: 10px 14px;
  font-size: 13px;
  cursor: pointer;
  transition:
    transform 120ms ease,
    border-color 120ms ease,
    background 120ms ease;
}

.intel-icon-btn {
  padding: 10px 12px;
  min-width: 42px;
}

.intel-btn:hover,
.intel-icon-btn:hover,
.intel-story-card:hover,
.intel-related-card:hover {
  transform: translateY(-1px);
  border-color: rgba(31, 123, 189, 0.42);
}

.intel-btn:disabled,
.intel-icon-btn:disabled {
  cursor: not-allowed;
  opacity: 0.45;
  transform: none;
}

.intel-btn--ghost {
  background: var(--paper-soft);
}

.intel-btn--assistant {
  border-color: rgba(31, 123, 189, 0.32);
  background: linear-gradient(135deg, rgba(31, 123, 189, 0.16), rgba(99, 179, 237, 0.12));
  color: var(--navy);
  font-weight: 900;
}

.intel-assistant-fab {
  position: fixed;
  right: 28px;
  bottom: 28px;
  z-index: 1200;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 46px;
  padding: 0 18px 0 12px;
  border: 1px solid rgba(31, 123, 189, 0.28);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.94);
  color: var(--navy);
  box-shadow:
    0 16px 36px rgba(15, 23, 42, 0.2),
    0 0 0 1px rgba(255, 255, 255, 0.72) inset;
  cursor: grab;
  touch-action: none;
  user-select: none;
  transition:
    transform 0.16s ease,
    box-shadow 0.16s ease,
    border-color 0.16s ease;
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

.intel-assistant-fab span {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), #63b3ed);
  color: #fff;
  font-size: 12px;
  font-weight: 900;
}

.intel-assistant-fab strong {
  font-size: 14px;
  font-weight: 900;
  white-space: nowrap;
}

.intel-assistant-fab:hover {
  transform: translateY(-2px);
}

.intel-assistant-fab.is-dragging {
  cursor: grabbing;
  transform: scale(1.02);
  border-color: rgba(31, 123, 189, 0.52);
  box-shadow:
    0 20px 44px rgba(15, 23, 42, 0.26),
    0 0 0 1px rgba(255, 255, 255, 0.86) inset;
  transition: none;
}

.intel-assistant-fab:disabled {
  cursor: not-allowed;
  opacity: 0.48;
  transform: none;
}

@media (min-width: 1101px) {
  .intel-topbar__brand {
    max-width: min(520px, 42vw);
  }

  .intel-topbar__meta {
    flex: 1 1 auto;
  }

  .intel-topbar__assistant {
    display: none;
  }
}

.intel-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
}

.intel-section--library {
  flex: 1;
}

.intel-section--related {
  min-height: 0;
}

.intel-section__title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--soft);
  font-size: 13px;
  letter-spacing: 0;
  font-weight: 800;
}

.intel-label {
  font-size: 12px;
  letter-spacing: 0;
  color: var(--muted);
  font-weight: 800;
}

.intel-input,
.intel-textarea {
  width: 100%;
  border: 1px solid var(--stroke);
  background: var(--paper-strong);
  color: var(--text);
  border-radius: var(--panel-radius);
  padding: 12px 14px;
  font-size: 14px;
  outline: none;
}

.intel-input:focus,
.intel-textarea:focus {
  border-color: rgba(39, 124, 139, 0.42);
  box-shadow: 0 0 0 3px rgba(39, 124, 139, 0.12);
}

.intel-textarea {
  resize: vertical;
  min-height: 118px;
}

.intel-story-list,
.intel-related-list {
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-right: 4px;
}

.intel-story-list {
  flex: 1;
}

.intel-related-list {
  max-height: 26vh;
}

.intel-story-card,
.intel-related-card {
  border: 1px solid var(--stroke);
  background: var(--paper);
  color: var(--text);
  border-radius: var(--panel-radius);
  padding: 10px 12px;
  text-align: left;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 6px;
  box-shadow: 0 8px 18px rgba(24, 67, 106, 0.07);
  transition:
    transform 140ms ease,
    border-color 140ms ease,
    box-shadow 140ms ease,
    background 140ms ease;
}

.intel-story-card.is-active {
  border-color: rgba(31, 123, 189, 0.64);
  background: rgba(226, 242, 255, 0.96);
  box-shadow:
    inset 4px 0 0 rgba(31, 123, 189, 0.86),
    0 12px 24px rgba(24, 67, 106, 0.12);
}

.intel-story-card__top,
.intel-related-card__meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  color: var(--muted);
  font-size: 11px;
  letter-spacing: 0;
  font-weight: 800;
}

.intel-story-card__signals,
.intel-research-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}

.intel-story-card__signals span,
.intel-research-strip span {
  min-width: 0;
  border: 1px solid rgba(52, 91, 128, 0.12);
  border-radius: 6px;
  background: rgba(245, 250, 254, 0.72);
  padding: 6px 7px;
  color: var(--soft);
  font-size: 10.5px;
  font-weight: 900;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.intel-story-card__signals span:first-child {
  background: rgba(31, 123, 189, 0.12);
  color: #174a72;
}

.intel-story-card strong,
.intel-related-card strong,
.intel-summary-card strong,
.intel-evidence-item strong {
  font-size: 14px;
  line-height: 1.34;
}

.intel-story-card small,
.intel-related-card small,
.intel-summary-card p,
.intel-evidence-item small {
  color: var(--muted);
  font-size: 12px;
  line-height: 1.35;
}

.intel-summary-card {
  border: 1px solid var(--stroke);
  background: var(--paper);
  border-radius: var(--panel-radius);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: 0 10px 22px rgba(24, 67, 106, 0.08);
}

.intel-research-strip {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.intel-research-strip label {
  display: block;
  margin-bottom: 3px;
  color: var(--muted);
  font-size: 10px;
  font-weight: 900;
}

.intel-research-strip strong {
  display: block;
  font-size: 12px;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.intel-canvas-panel {
  position: relative;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  padding: 58px 12px 18px;
}

.intel-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background-color: #f6f9fc;
  background-image:
    repeating-linear-gradient(0deg, rgba(43, 101, 150, 0.07) 0 1px, transparent 1px 42px),
    repeating-linear-gradient(90deg, rgba(43, 101, 150, 0.055) 0 1px, transparent 1px 42px),
    radial-gradient(circle at 24% 18%, rgba(255, 255, 255, 0.72), transparent 28%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.82), rgba(239, 246, 252, 0.72));
  background-repeat: repeat, repeat, no-repeat, no-repeat;
  background-size:
    42px 42px,
    42px 42px,
    auto,
    auto;
}

.intel-canvas-toolbar,
.intel-footerbar {
  position: absolute;
  left: 18px;
  z-index: 5;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.intel-canvas-toolbar {
  top: 16px;
  right: 18px;
}

.intel-footerbar {
  bottom: 18px;
  right: auto;
  width: min(620px, calc(100% - 320px));
  min-width: min(500px, calc(100% - 36px));
  padding: 12px 14px;
  background: var(--paper-strong);
  border: 1px solid var(--stroke);
  border-radius: var(--panel-radius);
  backdrop-filter: blur(12px);
  box-shadow: 0 16px 34px rgba(24, 67, 106, 0.16);
}

.intel-footerbar__focus {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.intel-footerbar__label {
  font-size: 11px;
  letter-spacing: 0.06em;
  color: var(--muted);
}

.intel-footerbar__focus strong {
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.intel-footerbar__focus small,
.intel-footerbar__legend {
  color: var(--muted);
  font-size: 12px;
}

.intel-footerbar__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
  min-width: 210px;
}

.intel-focus-sheet {
  position: absolute;
  right: 18px;
  top: 72px;
  bottom: 18px;
  z-index: 7;
  width: min(620px, calc(100% - 36px));
  max-height: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border: 1px solid rgba(50, 94, 132, 0.32);
  border-radius: 12px;
  background: rgba(252, 254, 255, 0.96);
  box-shadow:
    0 34px 82px rgba(21, 64, 102, 0.24),
    0 10px 26px rgba(21, 64, 102, 0.14),
    inset 0 0 0 1px rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(18px);
  overflow: auto;
}

.intel-focus-sheet__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 14px;
}

.intel-focus-sheet__eyebrow {
  display: block;
  margin-bottom: 5px;
  color: var(--copper);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.intel-focus-sheet h3 {
  margin: 0;
  font-size: 18px;
  line-height: 1.25;
}

.intel-focus-sheet p {
  margin: 6px 0 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.55;
}

.intel-focus-sheet__chips,
.intel-focus-sheet__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.intel-focus-sheet__metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}

.intel-focus-sheet__metrics div {
  border: 1px solid rgba(52, 91, 128, 0.14);
  border-radius: var(--panel-radius);
  background: rgba(245, 250, 254, 0.88);
  padding: 9px 10px;
}

.intel-focus-sheet__metrics label {
  display: block;
  margin-bottom: 4px;
  color: var(--muted);
  font-size: 11px;
  font-weight: 800;
}

.intel-focus-sheet__metrics strong {
  color: var(--text);
  font-size: 13px;
  line-height: 1.3;
}

.intel-focus-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.intel-focus-section__title {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  color: var(--soft);
  font-size: 12px;
  font-weight: 900;
}

.intel-focus-detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}

.intel-focus-detail-grid div {
  min-width: 0;
  border: 1px solid rgba(52, 91, 128, 0.14);
  border-radius: var(--panel-radius);
  background: rgba(245, 250, 254, 0.78);
  padding: 8px 10px;
}

.intel-focus-detail-grid label {
  display: block;
  margin-bottom: 4px;
  color: var(--muted);
  font-size: 10.5px;
  font-weight: 900;
}

.intel-focus-detail-grid strong {
  display: block;
  color: var(--text);
  font-size: 12.5px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.intel-focus-sheet .intel-focus-insight {
  margin: 0;
  border: 1px solid rgba(31, 123, 189, 0.18);
  border-left: 3px solid rgba(31, 123, 189, 0.72);
  border-radius: var(--panel-radius);
  background: rgba(235, 247, 255, 0.72);
  padding: 10px 12px;
  color: #1b405c;
  font-size: 13px;
  line-height: 1.6;
}

.intel-research-actions {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.intel-research-actions li {
  position: relative;
  border: 1px solid rgba(52, 91, 128, 0.14);
  border-radius: var(--panel-radius);
  background: rgba(252, 254, 255, 0.88);
  padding: 8px 10px 8px 24px;
  color: #24435e;
  font-size: 12.5px;
  line-height: 1.45;
}

.intel-research-actions li::before {
  content: '';
  position: absolute;
  left: 10px;
  top: 15px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent);
}

.intel-focus-news {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
}

.intel-focus-news__title {
  display: flex;
  justify-content: space-between;
  color: var(--soft);
  font-size: 13px;
  font-weight: 900;
}

.intel-focus-news__list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.intel-focus-news__item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 11px;
  border: 1px solid rgba(52, 91, 128, 0.14);
  border-radius: var(--panel-radius);
  background: rgba(252, 254, 255, 0.94);
  color: var(--text);
  text-decoration: none;
  transition:
    transform 140ms ease,
    border-color 140ms ease,
    box-shadow 140ms ease;
}

.intel-focus-news__item:hover {
  transform: translateY(-1px);
  border-color: rgba(31, 123, 189, 0.4);
  box-shadow: 0 12px 26px rgba(28, 80, 124, 0.12);
}

.intel-focus-news__item small {
  color: var(--muted);
  font-size: 11px;
}

.intel-focus-news__item strong {
  display: -webkit-box;
  font-size: 12.5px;
  line-height: 1.4;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.focus-sheet-enter-active,
.focus-sheet-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.focus-sheet-enter-from,
.focus-sheet-leave-to {
  opacity: 0;
  transform: translate(16px, 14px) scale(0.98);
}

.legend-swatch {
  display: inline-block;
  width: 14px;
  height: 3px;
  border-radius: 999px;
  margin-right: 6px;
  vertical-align: middle;
}

.legend-swatch--main {
  background: #4f8d73;
}

.legend-swatch--branch {
  background: #b99a45;
}

.legend-swatch--context {
  background: #7e74a8;
}

.intel-overlay {
  position: absolute;
  inset: 76px 24px 96px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 10px;
  background: var(--paper-strong);
  border: 1px solid var(--stroke);
  border-radius: var(--panel-radius);
  z-index: 6;
  text-align: center;
  padding: 24px;
}

.intel-overlay--quiet {
  background: var(--paper-strong);
}

.intel-overlay--error {
  background: rgba(255, 232, 231, 0.94);
}

.intel-spinner {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: 3px solid rgba(39, 124, 139, 0.18);
  border-top-color: var(--accent);
  animation: spin 0.9s linear infinite;
}

.intel-evidence-empty,
.intel-evidence-loading {
  border: 1px dashed rgba(52, 91, 128, 0.32);
  background: var(--paper-soft);
  border-radius: var(--panel-radius);
  padding: 18px;
  color: var(--muted);
}

.intel-detail-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.intel-detail-grid label {
  display: block;
  margin-bottom: 4px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
}

.intel-evidence-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-decoration: none;
  color: var(--text);
  border: 1px solid var(--stroke);
  background: var(--paper);
  border-radius: var(--panel-radius);
  padding: 14px;
}

.intel-evidence-link {
  display: inline-flex;
  width: max-content;
  margin-top: 10px;
  border: 1px solid rgba(31, 123, 189, 0.36);
  border-radius: var(--panel-radius);
  padding: 9px 11px;
  background: rgba(222, 240, 254, 0.92);
  color: var(--walnut);
  font-size: 13px;
  font-weight: 900;
  text-decoration: none;
}

.intel-evidence-button {
  cursor: pointer;
}

.intel-side-toggle {
  position: absolute;
  top: 50%;
  z-index: 6;
  transform: translateY(-50%);
  writing-mode: vertical-rl;
  text-orientation: mixed;
  border: 1px solid var(--stroke);
  background: var(--paper-strong);
  color: var(--soft);
  padding: 12px 10px;
  border-radius: var(--panel-radius);
  cursor: pointer;
}

.intel-side-toggle--left {
  left: 12px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1400px) {
  .intel-shell {
    grid-template-columns: 280px minmax(0, 1fr);
    gap: 8px;
    padding: 8px;
  }

  .intel-shell.is-left-collapsed {
    grid-template-columns: 0 minmax(0, 1fr);
  }

  .intel-topbar h1 {
    font-size: 28px;
  }

  .intel-footerbar {
    width: min(560px, calc(100% - 280px));
  }
}

@media (max-width: 1100px) {
  .intel-page {
    height: auto;
    min-height: 100vh;
    overflow: auto;
  }

  .intel-topbar {
    flex-direction: column;
  }

  .intel-assistant-fab {
    top: auto;
    right: 18px;
    bottom: 18px;
  }

  .intel-shell {
    grid-template-columns: 1fr;
    grid-template-rows: auto minmax(560px, 680px) auto;
    overflow: visible;
  }

  .intel-side {
    display: block;
    height: auto;
    max-height: none;
    overflow: visible;
  }

  .intel-side-toggle {
    display: none;
  }

  .intel-panel {
    max-height: 620px;
  }

  .intel-story-list,
  .intel-related-list {
    max-height: 360px;
  }

  .intel-canvas-panel {
    min-height: 680px;
    padding-bottom: 96px;
  }

  .intel-footerbar {
    width: auto;
    min-width: 0;
    right: 18px;
  }

  .intel-focus-sheet {
    top: 80px;
    left: 18px;
    right: 18px;
    width: auto;
  }

  .intel-focus-news__list,
  .intel-focus-detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
