<template>
  <div class="intel-page" @keydown.esc="closeFocusPanel">
    <header class="intel-topbar" data-tour="story-workspace">
      <div class="intel-topbar__brand">
        <h1>{{ pageTitle }}</h1>
      </div>
      <div class="intel-topbar__meta">
        <div class="intel-mode-switch" data-tour="story-level-switch" role="group" aria-label="图谱层级">
          <button type="button" :aria-pressed="graphMode === 'l3'" @click="switchGraphMode('l3')">
            L3 大事件
          </button>
          <button type="button" :aria-pressed="graphMode === 'l2'" @click="switchGraphMode('l2')">
            L2 走势链
          </button>
        </div>
        <RouterLink class="intel-btn intel-research-link" to="/data-service/decision-desk">
          决策研究 <ArrowUpRight :size="15" aria-hidden="true" />
        </RouterLink>
      </div>
    </header>

    <div class="intel-shell" :class="{ 'is-left-collapsed': leftCollapsed }">
      <aside v-if="!leftCollapsed" class="intel-library" data-tour="story-library">
        <header class="intel-library__header">
          <h2>{{ libraryTitle }} <span>{{ filteredStories.length }}</span></h2>
          <button
            class="intel-icon-btn"
            type="button"
            title="收起事件库"
            aria-label="收起事件库"
            @click="leftCollapsed = true"
          >
            <PanelLeftClose :size="18" aria-hidden="true" />
          </button>
        </header>
        <label class="intel-search">
          <Search :size="17" aria-hidden="true" />
          <input
            v-model.trim="storySearch"
            type="search"
            :aria-label="searchLabel"
            :placeholder="searchPlaceholder"
          />
        </label>
        <div class="intel-story-list">
          <button
            v-for="story in filteredStories"
            :key="story.id"
            type="button"
            class="intel-story-row"
            :aria-current="String(story.id) === selectedStoryId ? 'true' : undefined"
            @click="selectStory(story.id)"
          >
            <strong>{{ displayStoryTitle(story) }}</strong>
            <small>{{ storyLibraryMeta(story) }}</small>
          </button>
          <section v-if="branchStories.length" class="intel-branches">
            <h3>关联事件</h3>
            <button
              v-for="item in branchStories"
              :key="item.story_id"
              type="button"
              class="intel-story-row"
              @click="selectStory(item.story_id)"
            >
              <strong>{{ displayStoryTitle(item) }}</strong>
              <small>{{ storyLibraryMeta(item) }}</small>
            </button>
          </section>
        </div>
      </aside>

      <main class="intel-workspace" data-tour="story-canvas">
        <button
          v-if="leftCollapsed"
          class="intel-side-toggle"
          type="button"
          title="打开事件库"
          @click="leftCollapsed = false"
        >
          <PanelLeftOpen :size="18" aria-hidden="true" /> {{ libraryTitle }}
        </button>

        <header v-if="currentStory" class="intel-workspace__header">
          <div class="intel-workspace__title">
            <h2>{{ displayStoryTitle(currentStory) }}</h2>
            <p v-if="workspaceMeta">{{ workspaceMeta }}</p>
          </div>
          <div class="intel-view-switch" role="group" aria-label="浏览方式">
            <button type="button" :aria-pressed="workspaceView === 'graph'" @click="workspaceView = 'graph'">
              <Waypoints :size="16" aria-hidden="true" /> 图谱
            </button>
            <button type="button" :aria-pressed="workspaceView === 'timeline'" @click="workspaceView = 'timeline'">
              <List :size="16" aria-hidden="true" /> 时间线
            </button>
          </div>
        </header>

        <div v-if="graphLoadFailed" class="intel-graph-notice" role="status">
          <span>图谱暂时无法显示，已切换到时间线。</span>
          <button class="intel-btn" type="button" @click="reloadPage">刷新页面</button>
        </div>

        <div v-show="workspaceView === 'graph'" class="intel-graph">
          <div ref="graphContainer" class="intel-canvas" role="region" aria-label="事件图谱"></div>
          <div v-if="graph" class="intel-graph-tools" role="group" aria-label="画布工具">
            <button class="intel-icon-btn" type="button" title="缩小" aria-label="缩小" @click="graph.zoomOut()">
              <Minus :size="17" aria-hidden="true" />
            </button>
            <button class="intel-icon-btn" type="button" title="放大" aria-label="放大" @click="graph.zoomIn()">
              <Plus :size="17" aria-hidden="true" />
            </button>
            <button class="intel-icon-btn" type="button" title="查看全图" aria-label="查看全图" @click="fitCanvas">
              <Maximize :size="17" aria-hidden="true" />
            </button>
            <button
              v-if="graphMetrics.contextLinks"
              class="intel-icon-btn"
              type="button"
              :title="showContextLinks ? '隐藏关联线' : '显示关联线'"
              aria-label="关联线"
              :aria-pressed="showContextLinks"
              @click="toggleContextLinks"
            >
              <Link2 :size="17" aria-hidden="true" />
            </button>
            <button class="intel-icon-btn" type="button" title="自动布局" aria-label="自动布局" @click="graph.autoLayout()">
              <RotateCcw :size="17" aria-hidden="true" />
            </button>
            <button class="intel-icon-btn" type="button" title="保存布局" aria-label="保存布局" @click="saveCanvasLayout">
              <Check v-if="layoutSaved" :size="17" aria-hidden="true" />
              <Save v-else :size="17" aria-hidden="true" />
            </button>
            <span v-if="layoutSaved" class="intel-visually-hidden" role="status">布局已保存</span>
          </div>
        </div>

        <ol v-if="currentStory && workspaceView === 'timeline'" class="intel-timeline" aria-label="事件时间线">
          <li v-for="item in timelineEvents" :key="item.id" class="intel-timeline__event">
            <button class="intel-timeline__row" type="button" @click="selectInspector(item.payload)">
              <span class="intel-timeline__date">{{ item.date }}</span>
              <span class="intel-timeline__body">
                <strong>{{ item.title }}</strong>
                <small v-if="item.meta">{{ item.meta }}</small>
              </span>
              <ChevronRight :size="17" aria-hidden="true" />
            </button>
          </li>
        </ol>

        <div v-if="loading" class="intel-overlay" role="status">
          <div class="intel-spinner" aria-hidden="true"></div>
          <span>正在加载图谱…</span>
        </div>
        <div v-else-if="error" class="intel-overlay" role="alert">
          <p>{{ error }}</p>
          <button class="intel-btn intel-btn--primary" type="button" @click="reloadCurrentStory">重试</button>
        </div>
        <div v-else-if="!currentStory" class="intel-overlay">
          <p :role="queryStatus.role" aria-live="polite">{{ queryStatus.message }}</p>
        </div>

        <Transition name="focus-sheet">
          <section
            v-if="focusPanelOpen && selectedInspector"
            class="intel-focus-sheet"
            aria-labelledby="intel-focus-title"
          >
            <header class="intel-focus-sheet__header">
              <div>
                <h3 id="intel-focus-title">{{ selectedInspectorTitle }}</h3>
                <p v-if="focusMeta">{{ focusMeta }}</p>
              </div>
              <button class="intel-icon-btn" type="button" title="关闭详情" aria-label="关闭详情" @click="closeFocusPanel">
                <X :size="19" aria-hidden="true" />
              </button>
            </header>

            <dl v-if="focusDetailRows.length" class="intel-focus-details">
              <div v-for="row in focusDetailRows" :key="row.label">
                <dt>{{ row.label }}</dt>
                <dd>{{ row.value }}</dd>
              </div>
            </dl>

            <div class="intel-focus-sheet__actions">
              <button
                v-if="selectedInspector.kind === 'l3-chain' && selectedInspector.l2ChainId"
                class="intel-btn intel-btn--primary"
                type="button"
                @click="openL2Chain(selectedInspector.l2ChainId)"
              >
                查看 L2 走势链 <ChevronRight :size="16" aria-hidden="true" />
              </button>
              <RouterLink v-if="selectedInspector.detailUrl" class="intel-evidence-link" :to="selectedInspector.detailUrl">
                查看事件报道 <ChevronRight :size="16" aria-hidden="true" />
              </RouterLink>
              <button class="intel-btn" type="button" @click="openStoryAssistantDrawer(focusAssistantQuestion)">
                交给数据助手
              </button>
            </div>

            <section v-if="showFocusEvidence" class="intel-focus-news">
              <h4>原始报道</h4>
              <p v-if="evidenceLoading" class="intel-focus-news__status" role="status">正在加载报道…</p>
              <ul v-else-if="focusEvidenceNews.length">
                <li v-for="item in focusEvidenceNews" :key="item.news_id">
                  <a :href="item.safe_url" target="_blank" rel="noopener">
                    <span>
                      <strong>{{ item.title }}</strong>
                      <small v-if="evidenceNewsMeta(item)">{{ evidenceNewsMeta(item) }}</small>
                    </span>
                    <ArrowUpRight :size="16" aria-hidden="true" />
                  </a>
                </li>
              </ul>
              <p v-else class="intel-focus-news__status">暂无可打开的报道</p>
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
import { ArrowUpRight, Check, ChevronRight, Link2, List, Maximize, Minus, PanelLeftClose, PanelLeftOpen, Plus, RotateCcw, Save, Search, Waypoints, X } from 'lucide-vue-next'
import { getCurrentUser, getToken } from '@/utils/auth'
import { safeExternalHttpUrl } from '@/utils/externalUrl.js'
import { graphMetricPresentation } from '@/governance/graphMetrics.js'
import {
  L2_RUN_ID as l2RunId,
  L3_RUN_ID as l3RunId,
  angleLabel,
  buildGraphMetrics,
  buildStoryGraphEvidenceParams,
  buildStoryGraphNodeInspector,
  buildStoryGraphQueryStatus,
  buildStoryStatsText,
  buildStorySummaryLine,
  cleanStoryTitle,
  createLatestRequestGate,
  edgeLabel,
  evidenceLevel,
  familyLabel,
  filterStorySummaries,
  focusKindLabel,
  formatActorPair,
  formatCountLabel,
  formatNewsDate,
  formatRange,
  graphSamplingNotice,
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
const listLoading = ref(false)
const workspaceLoading = ref(false)
const loading = computed(() => listLoading.value || workspaceLoading.value)
const error = ref('')
const queryStatus = ref(buildStoryGraphQueryStatus('idle', { mode: graphMode.value }))
const leftCollapsed = ref(typeof window !== 'undefined' && window.matchMedia('(max-width: 760px)').matches)
const workspaceView = ref('graph')
const graphLoadFailed = ref(false)
const showContextLinks = ref(true)
const layoutSaved = ref(false)
const agentMessages = ref([])
const assistantSessionId = ref('')
const selectedInspector = shallowRef(null)
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

let listAbortController = null
let storyAbortController = null
let clusterAbortController = null
let messageId = 0
let layoutSavedTimer = null
let assistantFabDrag = null
const listRequestGate = createLatestRequestGate()
const workspaceRequestGate = createLatestRequestGate()
const evidenceRequestGate = createLatestRequestGate()

const activeRunId = computed(() => (graphMode.value === 'l3' ? l3RunId : l2RunId))
const pageTitle = computed(() =>
  graphMode.value === 'l3' ? 'L3 大事件脉络图谱' : 'L2 事件走势图谱',
)
const libraryTitle = computed(() => (graphMode.value === 'l3' ? '大事件库' : '走势链库'))
const searchLabel = computed(() => (graphMode.value === 'l3' ? '检索大事件' : '检索走势链'))
const searchPlaceholder = computed(() => (graphMode.value === 'l3' ? '搜索事件、地区或议题' : '搜索标题或主体'))
const filteredStories = computed(() =>
  filterStorySummaries(stories.value, storySearch.value),
)
const branchStories = computed(() => sortRelatedStories(currentStory.value?.related_stories))
const graphMetrics = computed(() => buildGraphMetrics(currentStory.value, branchStories.value))
const storyStatsText = computed(() =>
  buildStoryStatsText(currentStory.value, graphMetrics.value, branchStories.value),
)
const samplingNotice = computed(() => graphSamplingNotice(currentStory.value))
const workspaceMeta = computed(() => {
  const story = currentStory.value
  if (!story) return ''
  const visible = graphMetrics.value.mainNodes
  const total = story.meta?.total_node_count
  return [
    storyDateRange(story.start_date, story.end_date),
    reportCountLabel(story.meta?.article_count),
    hasCount(total) && total > visible ? `显示 ${visible} / ${total} 个节点` : `${visible} 个节点`,
  ].filter(Boolean).join(' · ')
})
const timelineEvents = computed(() => {
  const story = currentStory.value
  return (story?.nodes || []).map((node) => {
    const payload = buildStoryGraphNodeInspector(node, { storyId: story.story_id })
    return {
      id: node.id,
      title: payload.title,
      date: storyDateRange(payload.startDate, payload.endDate),
      sortDate: payload.startDate || payload.endDate || '9999',
      meta: [nodeCategory(payload), reportCountLabel(payload.articleCount)].filter(Boolean).join(' · '),
      payload,
    }
  }).sort((left, right) => left.sortDate.localeCompare(right.sortDate))
})
const currentResearchSignals = computed(() => {
  const story = currentStory.value
  if (!story) return []
  const visibleNodes = Number.isInteger(story.meta?.visible_node_count)
    ? story.meta.visible_node_count
    : graphMetrics.value.mainNodes
  const totalNodes = Number.isInteger(story.meta?.total_node_count)
    ? story.meta.total_node_count
    : null
  return [
    hasCount(story.meta?.article_count)
      ? { label: '报道规模', value: `${story.meta.article_count} 条新闻` }
      : null,
    totalNodes !== null ? {
      label: '结构覆盖',
      value: `${visibleNodes}/${totalNodes} 个候选节点（非完整图）`,
    } : null,
  ].filter(Boolean)
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
    summary: `${story.story_title || story.story_id || '当前故事图谱'}；节点 ${(story.nodes || []).length} 个，关系边 ${(story.edges || []).length} 条；${samplingNotice.value || '抽样范围未知，不得视为完整图。'}当前焦点 ${focus}。`,
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
      '解释当前图谱主线和待核验关系假设',
      '基于焦点节点/关系边指出证据缺口',
      '生成后续核验问题和报告提纲',
    ],
  }
})

const selectedInspectorTitle = computed(() => {
  if (!selectedInspector.value) {
    return displayStoryTitle(currentStory.value) || '尚未选择焦点'
  }
  return selectedInspector.value.title || displayStoryTitle(currentStory.value) || '未命名事件'
})

const focusMeta = computed(() => {
  const item = selectedInspector.value
  if (!item || item.kind === 'edge') return ''
  return [
    storyDateRange(item.startDate, item.endDate),
    nodeCategory(item),
    reportCountLabel(item.articleCount),
  ].filter(Boolean).join(' · ')
})

const selectedInspectorSubtitle = computed(() => {
  if (!selectedInspector.value) {
    return currentStory.value
      ? buildStorySummaryLine(currentStory.value)
      : '请选择一条走势链开始分析。'
  }
  if (selectedInspector.value.kind === 'l2-segment') {
    return [
      angleLabel(selectedInspector.value.storyAngle || selectedInspector.value.eventType),
      formatRange(selectedInspector.value.startDate, selectedInspector.value.endDate),
    ].filter(isMeaningfulDisplayValue).join(' · ')
  }
  if (selectedInspector.value.kind === 'l3-chain') {
    return [
      familyLabel(selectedInspector.value.lane || selectedInspector.value.eventType),
      formatRange(selectedInspector.value.startDate, selectedInspector.value.endDate),
    ].filter(isMeaningfulDisplayValue).join(' · ')
  }
  if (selectedInspector.value.kind === 'cluster') {
    return [
      angleLabel(selectedInspector.value.eventType),
      formatActorPair(selectedInspector.value.initiator, selectedInspector.value.target, ''),
    ].filter(isMeaningfulDisplayValue).join(' · ') || '事件节点'
  }
  if (selectedInspector.value.kind === 'branch-story') {
    return [
      relationLabel(selectedInspector.value.relation),
      formatRange(selectedInspector.value.startDate, selectedInspector.value.endDate),
    ].filter(isMeaningfulDisplayValue).join(' · ')
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
      formatCountLabel(selectedInspector.value.articleCount, {
        unit: '条新闻',
        unknown: '新闻数未知',
      }),
    ].filter(isMeaningfulDisplayValue)
  }
  if (selectedInspector.value.kind === 'l3-chain') {
    return [
      formatCountLabel(selectedInspector.value.segmentCount, {
        unit: '个 L1.5 片段',
        unknown: 'L1.5 片段数未知',
      }),
      formatCountLabel(selectedInspector.value.articleCount, {
        unit: '条新闻',
        unknown: '新闻数未知',
      }),
    ].filter(isMeaningfulDisplayValue)
  }
  if (selectedInspector.value.kind === 'cluster') {
    return [
      angleLabel(selectedInspector.value.eventType),
      formatCountLabel(selectedInspector.value.articleCount, {
        unit: '条新闻',
        unknown: '新闻数未知',
      }),
      formatRange(selectedInspector.value.startDate, selectedInspector.value.endDate),
    ].filter(isMeaningfulDisplayValue)
  }
  if (selectedInspector.value.kind === 'branch-story') {
    return [
      selectedInspector.value.relation?.layer || '关联',
      selectedInspector.value.nodeCount == null
        ? ''
        : `${selectedInspector.value.nodeCount} 个节点`,
    ].filter(isMeaningfulDisplayValue)
  }
  if (selectedInspector.value.kind === 'edge') {
    return [
      edgeLabel(selectedInspector.value.edgeType),
      selectedInspector.value.layer || 'story',
      graphMetricPresentation('story_graph.edge_weight', {
        value: selectedInspector.value.weight,
      }).valueLabel,
    ].filter(isMeaningfulDisplayValue)
  }
  return [
    familyLabel(currentStory.value?.meta?.dominant_type || 'mixed'),
    `${graphMetrics.value.mainNodes} 个节点`,
    `${graphMetrics.value.branchStories} 个分支`,
  ].filter(isMeaningfulDisplayValue)
})

const selectedEvidenceNews = computed(() => {
  return Array.isArray(selectedClusterDetail.value?.news) ? selectedClusterDetail.value.news : []
})

const focusEvidenceNews = computed(() => selectedEvidenceNews.value.map((item) => ({
  ...item,
  title: item.title || item.news_title,
  safe_url: safeExternalHttpUrl(item.url),
})).filter((item) => item.title && item.safe_url).slice(0, 8))

const showFocusEvidence = computed(() =>
  ['l3-chain', 'l2-segment', 'cluster'].includes(selectedInspector.value?.kind),
)

const focusArticleCount = computed(() => {
  return selectedClusterDetail.value?.article_count
    ?? selectedClusterDetail.value?.articleCount
    ?? selectedInspector.value?.articleCount
    ?? null
})

const focusEvidenceText = computed(() => {
  const isDirectEvidence = ['l2-segment', 'cluster'].includes(selectedInspector.value?.kind)
  return evidenceLevel(focusArticleCount.value, { direct: isDirectEvidence })
})

const focusDetailRows = computed(() => {
  const item = selectedInspector.value
  if (item?.kind !== 'edge') return []
  const rows = [
    ['起点', findStoryNodeTitle(item.sourceId)],
    ['终点', findStoryNodeTitle(item.targetId)],
    ['主张 ID', item.claimId],
    ['引用定位', item.citationLocator],
  ]
  return rows
    .map(([label, value]) => ({ label, value: displayValue(value) }))
    .filter((row) => isMeaningfulDisplayValue(row.value))
})

const focusAssistantQuestion = computed(() => {
  return `请基于当前焦点「${selectedInspectorTitle.value}」做结构化研判：解释其在整张图谱中的位置、与相邻节点的候选关系方向、证据强弱、仍需核验的问题和下一步观察清单。`
})

watch(selectedStoryId, async (value) => {
  if (!value) return
  await loadStoryWorkspace(value)
})

watch(storySearch, () => {
  handleStorySearchChange()
})

watch(showContextLinks, async () => {
  if (currentStory.value) await renderWorkspaceGraph()
})

watch(workspaceView, async (view) => {
  closeFocusPanel()
  if (view === 'graph' && !graph.value) {
    await nextTick()
    await renderWorkspaceGraph()
  }
})

onMounted(async () => {
  restoreAssistantFabPosition()
  window.addEventListener('resize', clampAssistantFabPosition)
  await loadStories()
})

onUnmounted(() => {
  window.removeEventListener('resize', clampAssistantFabPosition)
  listRequestGate.invalidate()
  workspaceRequestGate.invalidate()
  evidenceRequestGate.invalidate()
  listAbortController?.abort()
  storyAbortController?.abort()
  clusterAbortController?.abort()
  if (layoutSavedTimer) window.clearTimeout(layoutSavedTimer)
  graph.value?.destroy()
  graph.value = null
})

async function switchGraphMode(mode, preferredId = '') {
  if (!['l2', 'l3'].includes(mode)) return
  if (graphMode.value === mode && !preferredId) return
  if (graphMode.value !== mode) {
    graphMode.value = mode
    storySearch.value = ''
  }
  await loadStories(preferredId)
}

async function loadStories(preferredId = '') {
  listAbortController?.abort()
  listAbortController = new AbortController()
  const requestToken = listRequestGate.begin()
  const requestedMode = graphMode.value
  listLoading.value = true
  error.value = ''
  stories.value = []
  clearWorkspaceState({ clearSelection: true })
  queryStatus.value = buildStoryGraphQueryStatus('list-loading', { mode: requestedMode })

  try {
    const isL3 = requestedMode === 'l3'
    const payload = await storyGraphApi.listStories(requestedMode, {
      signal: listAbortController.signal,
    })
    if (!listRequestGate.isCurrent(requestToken) || graphMode.value !== requestedMode) return

    const nextStories = isL3
      ? (payload.macros || []).map(normalizeL3MacroSummary)
      : (payload.chains || []).map(normalizeL2ChainSummary)
    stories.value = nextStories

    if (!nextStories.length && !preferredId) {
      queryStatus.value = buildStoryGraphQueryStatus('list-empty', { mode: requestedMode })
      return
    }

    const nextId = preferredId || nextStories[0]?.id
    if (nextId) {
      queryStatus.value = buildStoryGraphQueryStatus('selection-required', {
        count: nextStories.length,
        mode: requestedMode,
      })
      selectedStoryId.value = String(nextId)
    }
  } catch (err) {
    if (!listRequestGate.isCurrent(requestToken) || isCanceledRequest(err)) return
    stories.value = []
    clearWorkspaceState({ clearSelection: true })
    error.value = `无法加载 ${requestedMode === 'l3' ? 'L3' : 'L2'} 图谱列表，请稍后重试。`
    queryStatus.value = buildStoryGraphQueryStatus('error', {
      error: error.value,
      mode: requestedMode,
    })
  } finally {
    if (listRequestGate.isCurrent(requestToken)) {
      listLoading.value = false
      listAbortController = null
    }
  }
}

function handleStorySearchChange() {
  if (listLoading.value) return
  const query = String(storySearch.value || '').trim()
  const matches = filteredStories.value

  if (!query) {
    if (!stories.value.length) {
      clearWorkspaceState({ clearSelection: true })
      queryStatus.value = buildStoryGraphQueryStatus('list-empty', { mode: graphMode.value })
      return
    }
    if (!selectedStoryId.value) {
      queryStatus.value = buildStoryGraphQueryStatus('selection-required', {
        count: stories.value.length,
        mode: graphMode.value,
      })
      selectedStoryId.value = String(stories.value[0].id)
    }
    return
  }

  if (!matches.length) {
    clearWorkspaceState({ clearSelection: true })
    error.value = ''
    queryStatus.value = buildStoryGraphQueryStatus('search-empty', {
      mode: graphMode.value,
      query,
    })
    return
  }

  const selectedStillMatches = matches.some(
    (story) => String(story.id) === selectedStoryId.value,
  )
  if (!selectedStillMatches) {
    clearWorkspaceState({ clearSelection: true })
    error.value = ''
    queryStatus.value = buildStoryGraphQueryStatus('selection-required', {
      count: matches.length,
      mode: graphMode.value,
      query,
    })
  }
}

function selectStory(storyId) {
  focusPanelOpen.value = false
  const nextStoryId = String(storyId)
  if (selectedStoryId.value === nextStoryId && !currentStory.value) {
    void loadStoryWorkspace(nextStoryId)
    return
  }
  selectedStoryId.value = nextStoryId
}

async function reloadCurrentStory() {
  if (selectedStoryId.value) await loadStoryWorkspace(selectedStoryId.value)
  else await loadStories()
}

async function loadStoryWorkspace(storyId) {
  storyAbortController?.abort()
  storyAbortController = new AbortController()
  const requestController = storyAbortController
  const requestToken = workspaceRequestGate.begin()
  const requestedMode = graphMode.value
  const requestedStoryId = String(storyId)
  workspaceLoading.value = true
  error.value = ''
  clearWorkspacePresentation()
  queryStatus.value = buildStoryGraphQueryStatus('workspace-loading', {
    mode: requestedMode,
    storyId: requestedStoryId,
  })

  try {
    const isL3 = requestedMode === 'l3'
    const payload = await storyGraphApi.getWorkspace(requestedMode, requestedStoryId, {
      signal: requestController.signal,
    })
    if (
      !workspaceRequestGate.isCurrent(requestToken)
      || graphMode.value !== requestedMode
      || selectedStoryId.value !== requestedStoryId
    ) return

    const nextStory = isL3
      ? transformL3MacroResponse(payload)
      : transformL2ChainResponse(payload)
    if (!Array.isArray(nextStory.nodes) || !nextStory.nodes.length) {
      clearWorkspacePresentation()
      queryStatus.value = buildStoryGraphQueryStatus('workspace-empty', {
        mode: requestedMode,
        storyId: requestedStoryId,
      })
      return
    }
    if (!isL3 && !stories.value.some((story) => String(story.id) === requestedStoryId)) {
      stories.value.unshift(normalizeL2ChainSummary(payload.chain))
    }
    currentStory.value = nextStory
    const activeStory = currentStory.value
    selectedInspector.value = makeMainInspector(activeStory, requestedMode)
    await bootstrapStoryAssistantSession(requestToken, requestController.signal)
    if (!workspaceRequestGate.isCurrent(requestToken) || currentStory.value !== activeStory) return
    await nextTick()
    await renderWorkspaceGraph(requestToken, activeStory)
    if (!workspaceRequestGate.isCurrent(requestToken) || currentStory.value !== activeStory) return
    queryStatus.value = buildStoryGraphQueryStatus('ready', {
      mode: requestedMode,
      storyId: requestedStoryId,
    })
  } catch (err) {
    if (!workspaceRequestGate.isCurrent(requestToken) || isCanceledRequest(err)) return
    clearWorkspacePresentation()
    error.value = `无法加载所选 ${requestedMode === 'l3' ? 'L3' : 'L2'} 图谱，请稍后重试。`
    queryStatus.value = buildStoryGraphQueryStatus('error', {
      error: error.value,
      mode: requestedMode,
    })
  } finally {
    if (workspaceRequestGate.isCurrent(requestToken)) {
      workspaceLoading.value = false
      if (storyAbortController === requestController) storyAbortController = null
    }
  }
}

function isCanceledRequest(errorValue) {
  return errorValue?.name === 'AbortError'
    || errorValue?.name === 'CanceledError'
    || errorValue?.code === 'ERR_CANCELED'
}

function invalidateEvidenceRequest() {
  evidenceRequestGate.invalidate()
  clusterAbortController?.abort()
  clusterAbortController = null
  evidenceLoading.value = false
  selectedClusterDetail.value = null
}

function clearWorkspacePresentation() {
  invalidateEvidenceRequest()
  currentStory.value = null
  graphLoadFailed.value = false
  selectedInspector.value = null
  focusPanelOpen.value = false
  layoutSaved.value = false
  resetAgentState()
  graph.value?.destroy()
  graph.value = null
}

function clearWorkspaceState({ clearSelection = false } = {}) {
  workspaceRequestGate.invalidate()
  storyAbortController?.abort()
  storyAbortController = null
  workspaceLoading.value = false
  if (clearSelection) selectedStoryId.value = ''
  clearWorkspacePresentation()
}

function displayStoryTitle(story) {
  if (!story) return ''
  return cleanStoryTitle(story.story_title || story.display_title || story.title) || '未命名事件'
}

function storyDateRange(start, end) {
  return start || end ? formatRange(start, end).replace(' → ', ' 至 ') : ''
}

function reportCountLabel(count) {
  return hasCount(count) ? `${count} 条报道` : ''
}

function storyLibraryMeta(story) {
  return [
    storyDateRange(story.start_date, story.end_date),
    reportCountLabel(story.article_count),
  ].filter(Boolean).join(' · ')
}

function nodeCategory(item) {
  const category = angleLabel(item.storyAngle || item.eventType || item.lane)
  return isMeaningfulDisplayValue(category) ? category : ''
}

function evidenceNewsMeta(item) {
  return [
    item.source_name || item.source || item.domain || item.site_name
      || new URL(item.safe_url).hostname.replace(/^www\./, ''),
    formatNewsDate(item),
  ].filter(isMeaningfulDisplayValue).join(' · ')
}

async function renderWorkspaceGraph(requestToken = null, story = currentStory.value) {
  if (!graphContainer.value || !story || workspaceView.value !== 'graph') return
  const isCurrentGraph = () =>
    (requestToken === null || workspaceRequestGate.isCurrent(requestToken))
    && currentStory.value === story
    && workspaceView.value === 'graph'
  const factory = (reactFlowFactoryPromise ??= loadStoryGraphRenderer())
  let createStoryGraphRenderer
  try {
    createStoryGraphRenderer = await factory
  } catch {
    if (reactFlowFactoryPromise === factory) reactFlowFactoryPromise = null
    if (isCurrentGraph()) {
      graphLoadFailed.value = true
      workspaceView.value = 'timeline'
    }
    return
  }
  if (!isCurrentGraph()) return
  graphLoadFailed.value = false

  if (!graph.value) {
    graph.value = createStoryGraphRenderer(graphContainer.value)
  }

  graph.value.render({
    storyGraph: story,
    showContextLinks: showContextLinks.value,
    onSelectInspector: selectInspector,
    onCanvasClick() {
      selectedInspector.value = makeMainInspector(currentStory.value, graphMode.value)
      invalidateEvidenceRequest()
      focusPanelOpen.value = false
    },
  })
}

async function selectInspector(payload) {
  if (selectedInspector.value === payload && focusPanelOpen.value) return
  selectedInspector.value = payload
  focusPanelOpen.value = payload.kind !== 'main-story'

  if (['l2-segment', 'cluster', 'l3-chain'].includes(payload.kind)) {
    await loadNodeEvidence(payload)
    return
  }

  if (payload.kind === 'edge') {
    invalidateEvidenceRequest()
    return
  }

  invalidateEvidenceRequest()
}

async function loadNodeEvidence(payload) {
  const params = buildStoryGraphEvidenceParams(payload, {
    currentL2RunId: currentStory.value?.meta?.l2_run_id,
  })

  if (!hasStoryGraphEvidenceTarget(params)) {
    invalidateEvidenceRequest()
    selectedClusterDetail.value = payload
    return
  }

  clusterAbortController?.abort()
  clusterAbortController = new AbortController()
  const requestToken = evidenceRequestGate.begin()
  const workspaceStory = currentStory.value
  selectedClusterDetail.value = payload
  evidenceLoading.value = true
  try {
    const evidence = await storyGraphApi.getEvidence(params, {
      signal: clusterAbortController.signal,
    })
    if (
      !evidenceRequestGate.isCurrent(requestToken)
      || currentStory.value !== workspaceStory
      || selectedInspector.value !== payload
    ) return
    selectedClusterDetail.value = {
      ...payload,
      ...evidence,
      news: evidence.news || [],
    }
  } catch (err) {
    if (!evidenceRequestGate.isCurrent(requestToken) || isCanceledRequest(err)) return
    selectedClusterDetail.value = payload
  } finally {
    if (evidenceRequestGate.isCurrent(requestToken)) {
      evidenceLoading.value = false
      clusterAbortController = null
    }
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

function reloadPage() {
  window.location.reload()
}

function fitCanvas() {
  graph.value?.fitView()
}

function saveCanvasLayout() {
  if (!graph.value?.saveLayout()) return
  layoutSaved.value = true
  if (layoutSavedTimer) window.clearTimeout(layoutSavedTimer)
  layoutSavedTimer = window.setTimeout(() => { layoutSaved.value = false }, 1500)
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

async function loadAssistantSessionMessages(sessionId, requestToken, signal) {
  const sid = String(sessionId || '').trim()
  if (!sid || !getToken()) return false
  try {
    const rows = await storyGraphApi.getAssistantSessionMessages(sid, {
      token: getToken(),
      signal,
    })
    if (!workspaceRequestGate.isCurrent(requestToken)) return null
    agentMessages.value = Array.isArray(rows) ? rows.map(mapAssistantMessageRow) : []
    return true
  } catch (err) {
    if (!workspaceRequestGate.isCurrent(requestToken) || isCanceledRequest(err)) return null
    return false
  }
}

async function bootstrapStoryAssistantSession(requestToken, signal) {
  resetAgentState()
  if (!workspaceRequestGate.isCurrent(requestToken) || !currentStory.value || !getToken()) return
  const cachedSessionId = readCachedStoryAssistantSession()
  if (!cachedSessionId) return
  assistantSessionId.value = cachedSessionId
  const loaded = await loadAssistantSessionMessages(cachedSessionId, requestToken, signal)
  if (loaded === false && workspaceRequestGate.isCurrent(requestToken)) {
    assistantSessionId.value = ''
    clearCachedStoryAssistantSession()
    agentMessages.value = []
  }
}

function buildStoryGraphAutorunContext(question = '') {
  const fallbackQuestion = '请解释当前事件故事脉络，指出主线、关键节点、待核验关系假设、证据缺口和下一步观察方向。'
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
    const title = compactText(cleanStoryTitle(node.label || node.title) || node.id, 120)
    const family = familyLabel(node.lane || node.story_angle || node.event_type || node.event_family)
    const dates = formatRange(node.start_date, node.end_date)
    const evidence = evidenceLevel(node.article_count)
    const actors = formatActorPair(node.initiator, node.target, '')
    const value = researchValueScore(node)
    return `${index + 1}. ${type} ${title}；${family}；${dates}；研究价值 ${researchValueLabel(value)}${evidence ? `；${evidence}` : ''}${actors ? `；主体 ${actors}` : ''}`
  })

  const edges = (story.edges || []).slice(0, 22).map((edge, index) => {
    const from = findStoryNodeTitle(edge.from_id)
    const to = findStoryNodeTitle(edge.to_id)
    const label = edgeLabel(edge.edge_type)
    const reason = compactText(relationEvidenceText(edge), 160)
    return `${index + 1}. ${from} -> ${to}；${label}；${relationStrengthLabel(edge)}；依据 ${reason}`
  })

  const branches = branchStories.value.slice(0, 10).map((item, index) => {
    const title = compactText(cleanStoryTitle(item.title) || item.story_id, 110)
    return `${index + 1}. ${title}；${relationLabel(item)}；${formatRange(item.start_date, item.end_date)}；${evidenceLevel(item.article_count)}`
  })

  const focus = selectedInspector.value
  const focusLines = focus
    ? [
        `焦点类型：${focusKindLabel(focus.kind)}`,
        `焦点标题：${compactText(selectedInspectorTitle.value, 160)}`,
        `焦点说明：${compactText(selectedInspectorSubtitle.value, 220)}`,
        `焦点标签：${selectedInspectorChips.value.join(' / ') || '无'}`,
        `焦点报道覆盖（未核验）：${focusEvidenceText.value}`,
      ]
    : ['当前未选择具体焦点。']

  const evidence = selectedEvidenceNews.value.slice(0, 8).map((item, index) => {
    const title = compactText(item.title || item.news_title || item.news_id, 150)
    const metadata = [item.source || item.domain, formatNewsDate(item)]
      .filter(isMeaningfulDisplayValue)
      .join('；')
    return `${index + 1}. ${title}${metadata ? `；${metadata}` : ''}`
  })

  const lines = [
    '【StoryGraph 当前图谱上下文】',
    `来源页面：故事图谱分析台，已接入数据助手会话。`,
    `图谱层级：${graphMode.value === 'l3' ? 'L3 大事件' : 'L2 走势链'}；run_id=${activeRunId.value}`,
    `图谱标题：${compactText(story.story_title || story.story_id, 180)}`,
    `图谱 ID：${story.story_id}`,
    `摘要：${compactText(story.meta?.summary || buildStorySummaryLine(story), 500)}`,
    `统计：${storyStatsText.value || '无'}`,
    `抽样与覆盖：${samplingNotice.value || '范围未知，不得视为完整图。'}`,
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
    `【焦点候选报道（未核验）｜最多 ${evidence.length} 条】`,
    ...(evidence.length ? evidence : ['当前焦点未加载候选报道']),
    '',
    '【回答要求】',
    '请把图谱结构当作当前工作台上下文，首轮只基于这里给出的节点、关系边、分支和未核验候选报道研判，不自动调用外部工具。',
    '输出结构：1）主线；2）关键节点与关系强弱；3）证据缺口；4）下一步观察；5）后续精确检索词（最多 4 条）。',
    '明确区分“图谱事实 / 分析推断 / 待核实”。不得把时间相邻、时间重叠或未验证关系写成影响或因果；弱边必须说明局限。',
    '只把节点视为当前有界抽样或已加载候选；不得声称图谱完整，也不得据此推断未展示节点不存在。',
    '不得引入当前材料之外的人物言论、会议细节、争议传闻或新闻事实。需要补证时只写检索建议，不得假装已经检索。',
    '正文控制在 1200 字以内，优先回答用户问题，不复述全部上下文。',
  ]
  return clampText(lines.join('\n'), 11000)
}

function findStoryNodeTitle(nodeId) {
  const id = String(nodeId || '')
  const node = (currentStory.value?.nodes || []).find((item) => String(item.id) === id)
  return cleanStoryTitle(node?.label || node?.title) || '未命名事件'
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

function hasCount(value) {
  return Number.isFinite(Number(value)) && Number(value) >= 0 && value !== '' && value != null
}

function isMeaningfulDisplayValue(value) {
  const text = displayValue(value)
  return text !== '未标注'
    && !/(?:未知|不可用|未提供|explicit_unknown|CONTRACT_MISSING)/i.test(text)
}

function clampText(value, max = 11000) {
  const text = String(value || '')
  return text.length > max ? `${text.slice(0, max)}\n【上下文已截断】` : text
}

</script>

<style scoped>
.intel-page {
  --text: #16243a;
  --muted: #506175;
  --accent: #1c568d;
  --tint: #eaf1f8;
  --rule: #e1e7ee;
  --sidebar: #f7f9fb;
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100dvh;
  padding-top: 72px;
  overflow: hidden;
  background: #fff;
  color: var(--text);
  font-family: Inter, 'Noto Sans CJK SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.intel-topbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 24px;
  padding: 14px 28px;
  border-bottom: 1px solid var(--rule);
}

.intel-topbar h1 {
  margin: 0;
  font-size: 26px;
  font-weight: 750;
  line-height: 1.25;
  white-space: nowrap;
}

.intel-topbar__meta,
.intel-mode-switch,
.intel-view-switch {
  display: flex;
  align-items: center;
  gap: 4px;
}

.intel-topbar__meta {
  gap: 16px;
}

.intel-mode-switch {
  padding: 3px;
  background: var(--sidebar);
  border-radius: 8px;
}

.intel-mode-switch button {
  min-width: 44px;
  min-height: 44px;
  padding: 0 12px;
}

.intel-mode-switch button,
.intel-view-switch button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--muted);
  font: inherit;
  font-size: 13px;
  font-weight: 650;
  white-space: nowrap;
  cursor: pointer;
}

.intel-mode-switch button[aria-pressed='true'] {
  color: #fff;
  background: var(--text);
}

.intel-view-switch button {
  min-height: 44px;
  padding: 0 10px;
}

.intel-view-switch button:hover,
.intel-view-switch button[aria-pressed='true'] {
  background: var(--tint);
  color: var(--accent);
}

.intel-shell {
  display: grid;
  grid-template-columns: clamp(300px, 26vw, 380px) minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
  flex: 1;
  min-height: 0;
}

.intel-shell.is-left-collapsed {
  grid-template-columns: minmax(0, 1fr);
}

.intel-library {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  padding: 16px 14px 0;
  background: var(--sidebar);
  border-right: 1px solid var(--rule);
}

.intel-library__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-left: 10px;
}

.intel-library__header h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
}

.intel-library__header h2 span {
  margin-left: 5px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.intel-search {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  margin: 5px 4px 12px;
  padding: 0 10px;
  border-radius: 6px;
  background: #eaf0f5;
  color: var(--muted);
}

.intel-search:focus-within {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.intel-search input {
  width: 100%;
  min-width: 0;
  min-height: 44px;
  padding: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--text);
  font: inherit;
  font-size: 13px;
}

.intel-search input::placeholder {
  color: var(--muted);
}

.intel-story-list {
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
  padding-bottom: 18px;
  scrollbar-width: thin;
}

.intel-story-row {
  position: relative;
  display: grid;
  gap: 6px;
  width: 100%;
  min-height: 64px;
  padding: 12px 11px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--text);
  text-align: left;
  cursor: pointer;
}

.intel-story-row:hover,
.intel-story-row[aria-current='true'] {
  background: var(--tint);
}

.intel-story-row[aria-current='true']::before {
  position: absolute;
  top: 12px;
  bottom: 12px;
  left: 0;
  width: 3px;
  border-radius: 3px;
  background: var(--accent);
  content: '';
}

.intel-story-row strong {
  overflow-wrap: anywhere;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.38;
}

.intel-story-row small,
.intel-workspace__title p,
.intel-timeline__row small,
.intel-focus-sheet__header p,
.intel-focus-news small {
  color: var(--muted);
  font-size: 12px;
  line-height: 1.45;
  font-variant-numeric: tabular-nums;
}

.intel-branches h3 {
  margin: 16px 10px 5px;
  font-size: 13px;
}

.intel-workspace {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  isolation: isolate;
}

.intel-workspace__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px 20px;
  padding: 22px 28px 16px;
}

.intel-workspace__title {
  flex: 1 1 380px;
  min-width: 0;
}

.intel-workspace__title h2 {
  margin: 0;
  overflow-wrap: anywhere;
  font-size: 24px;
  font-weight: 720;
  line-height: 1.2;
}

.intel-workspace__title p {
  margin: 8px 0 0;
}

.intel-graph-notice {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
  padding: 0 20px;
  background: var(--sidebar);
  color: var(--muted);
  font-size: 13px;
}

.intel-graph {
  position: relative;
  flex: 1;
  min-height: 0;
  background: #f6f8fa;
}

.intel-canvas {
  position: absolute;
  inset: 0;
}

.intel-graph-tools {
  position: absolute;
  top: 12px;
  right: 16px;
  z-index: 5;
  display: flex;
  flex-wrap: wrap;
  max-width: calc(100% - 32px);
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(31, 48, 67, 0.08);
}

.intel-icon-btn,
.intel-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 44px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--accent);
  font: inherit;
  font-size: 13px;
  font-weight: 650;
  text-decoration: none;
  cursor: pointer;
}

.intel-icon-btn {
  flex: none;
  min-width: 44px;
  padding: 0;
  color: var(--muted);
}

.intel-btn {
  padding: 0 11px;
}

.intel-icon-btn:hover,
.intel-icon-btn[aria-pressed='true'],
.intel-btn:hover,
.intel-evidence-link:hover,
.intel-side-toggle:hover {
  background: var(--tint);
  color: var(--accent);
}

.intel-btn--primary {
  background: var(--accent);
  color: #fff;
}

.intel-btn--primary:hover {
  background: #154779;
  color: #fff;
}

.intel-side-toggle {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: 7px;
  min-width: 44px;
  min-height: 44px;
  margin: 8px 0 0 18px;
  padding: 0 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--accent);
  font: inherit;
  font-size: 13px;
  font-weight: 650;
  cursor: pointer;
}

.intel-timeline {
  flex: 1;
  min-height: 0;
  margin: 0;
  padding: 0 28px 72px;
  overflow: auto;
  list-style: none;
  scrollbar-width: thin;
}

.intel-timeline__event {
  border-top: 1px solid var(--rule);
}

.intel-timeline__row {
  display: grid;
  grid-template-columns: minmax(100px, 164px) minmax(0, 1fr) 17px;
  align-items: center;
  gap: 16px;
  width: 100%;
  min-height: 70px;
  padding: 12px 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--muted);
  text-align: left;
  cursor: pointer;
}

.intel-timeline__row:hover {
  background: var(--sidebar);
  color: var(--accent);
}

.intel-timeline__date {
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.intel-timeline__body {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.intel-timeline__body strong {
  overflow-wrap: anywhere;
  color: var(--text);
  font-size: 15px;
  font-weight: 660;
  line-height: 1.4;
}

.intel-focus-sheet {
  position: absolute;
  z-index: 7;
  inset: 0 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: min(440px, 100%);
  overflow: auto;
  overscroll-behavior: contain;
  padding: 22px 22px 90px;
  background: #fff;
  border-left: 1px solid var(--rule);
  box-shadow: -8px 0 28px rgba(31, 48, 67, 0.1);
  scrollbar-width: thin;
}

.intel-focus-sheet__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.intel-focus-sheet__header h3 {
  margin: 0;
  overflow-wrap: anywhere;
  font-size: 20px;
  font-weight: 720;
  line-height: 1.35;
}

.intel-focus-sheet__header p {
  margin: 8px 0 0;
}

.intel-focus-sheet__header .intel-icon-btn {
  margin: -8px -8px 0 0;
}

.intel-focus-details {
  display: grid;
  gap: 12px;
  margin: 0;
}

.intel-focus-details dt {
  color: var(--muted);
  font-size: 12px;
}

.intel-focus-details dd {
  margin: 2px 0 0;
  overflow-wrap: anywhere;
  font-size: 14px;
}

.intel-focus-news h4 {
  margin: 0 0 9px;
  font-size: 14px;
  font-weight: 700;
}

.intel-focus-news ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.intel-focus-news li {
  border-top: 1px solid var(--rule);
}

.intel-focus-news a {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 48px;
  padding: 10px 0;
  color: var(--text);
  font-size: 13px;
  text-decoration: none;
}

.intel-focus-news a:hover {
  color: var(--accent);
}

.intel-focus-news a > span {
  display: grid;
  gap: 3px;
  min-width: 0;
  overflow-wrap: anywhere;
}

.intel-focus-news a > svg {
  flex: none;
  color: var(--accent);
}

.intel-focus-news__status,
.intel-overlay p {
  margin: 0;
  color: var(--muted);
  font-size: 14px;
}

.intel-focus-sheet__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
}

.intel-evidence-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 44px;
  padding: 0 8px;
  border-radius: 6px;
  color: var(--accent);
  font-size: 13px;
  font-weight: 650;
  text-decoration: none;
}

.focus-sheet-enter-active,
.focus-sheet-leave-active {
  transition: opacity 150ms ease, transform 150ms ease;
}

.focus-sheet-enter-from,
.focus-sheet-leave-to {
  opacity: 0;
  transform: translateX(12px);
}

.intel-overlay {
  position: absolute;
  z-index: 6;
  inset: 52px 16px 16px;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 12px;
  background: #f6f8fa;
  padding: 16px;
  color: var(--muted);
  text-align: center;
}

.intel-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--rule);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
}

.intel-visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.intel-assistant-fab {
  position: fixed;
  right: 20px;
  bottom: 18px;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 6px 12px 6px 7px;
  border: 1px solid var(--rule);
  border-radius: 8px;
  background: #fff;
  color: var(--text);
  box-shadow: 0 3px 14px rgba(31, 48, 67, 0.15);
  font: inherit;
  font-size: 13px;
  touch-action: none;
  user-select: none;
  cursor: pointer;
}

.intel-assistant-fab span {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: var(--accent);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
}

.intel-assistant-fab.is-dragging {
  cursor: grabbing;
}

.intel-page button:focus-visible,
.intel-page a:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 1060px) {
  .intel-shell {
    grid-template-columns: clamp(245px, 30vw, 315px) minmax(0, 1fr);
  }

  .intel-workspace__header {
    align-items: flex-start;
    padding: 16px 20px 10px;
  }
}

@media (max-width: 760px) {
  .intel-page {
    height: auto;
    min-height: 100dvh;
    overflow: visible;
  }

  .intel-shell {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto;
  }

  .intel-library {
    padding: 6px 10px 0;
    border-right: 0;
    border-bottom: 1px solid var(--rule);
  }

  .intel-story-list {
    max-height: 165px;
    padding-bottom: 6px;
  }

  .intel-workspace {
    height: max(530px, calc(100dvh - 180px));
  }

  .intel-timeline {
    padding-inline: 16px;
  }

  .intel-timeline__row {
    grid-template-columns: minmax(0, 1fr) 17px;
    gap: 4px 10px;
  }

  .intel-timeline__date {
    grid-column: 1;
  }

  .intel-timeline__body {
    grid-column: 1;
  }

  .intel-timeline__row > svg {
    grid-column: 2;
    grid-row: 1 / span 2;
  }
}

@media (max-width: 640px) {
  .intel-topbar {
    padding: 10px 12px;
  }

  .intel-topbar__brand {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }

  .intel-topbar h1 {
    font-size: 22px;
  }

  .intel-topbar__meta {
    width: 100%;
    gap: 6px;
  }

  .intel-mode-switch {
    width: 100%;
  }

  .intel-mode-switch button {
    flex: 1;
    padding-inline: 6px;
  }

  .intel-research-link {
    flex: none;
    padding-inline: 6px;
  }

  .intel-workspace__header {
    padding-inline: 16px;
  }

  .intel-workspace__title h2 {
    font-size: 20px;
  }

  .intel-graph-tools {
    right: 10px;
    max-width: calc(100% - 20px);
  }

  .intel-side-toggle {
    margin-left: 6px;
  }

  .intel-focus-sheet {
    padding-inline: 16px;
  }

  .intel-assistant-fab {
    right: 12px;
    bottom: 12px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .focus-sheet-enter-active,
  .focus-sheet-leave-active {
    transition: none;
  }
}
</style>
