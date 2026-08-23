<template>
  <div class="news-detail" :class="{ split: showTranslationPanel }" :style="paperThemeStyle">
    <div v-if="loading" class="loading-state">加载中...</div>
    <div v-else-if="error" class="error-state">{{ error }}</div>
    <template v-else-if="news">
      <div class="floating-actions">
        <button class="floating-action-btn analysis" @click="toggleAnalysisDrawer">
          {{ showAnalysisDrawer ? '收起分析' : '分析面板' }}
        </button>
        <button class="floating-action-btn translate" @click="toggleTranslationPanel">
          {{ showTranslationPanel ? '收起翻译' : '翻译面板' }}
        </button>
        <button class="floating-action-btn assistant" @click="sendNewsToAssistant">
          数据助手
        </button>
        <div class="paper-theme-palette" aria-label="新闻框配色主题">
          <span class="paper-theme-label">纸面</span>
          <button
            v-for="theme in PAPER_THEMES"
            :key="theme.id"
            type="button"
            class="paper-theme-swatch"
            :class="{ active: activePaperThemeId === theme.id }"
            :title="theme.name"
            @click="selectPaperTheme(theme.id)"
          >
            <span class="paper-theme-swatch-main" :style="{ background: theme.card, borderColor: theme.border }"></span>
            <span class="paper-theme-swatch-inner" :style="{ background: theme.page }"></span>
          </button>
        </div>
      </div>

      <aside class="analysis-drawer" :class="{ open: showAnalysisDrawer }">
        <div class="analysis-drawer-header">
          <h3>文章分析</h3>
          <button class="analysis-close-btn" @click="toggleAnalysisDrawer">×</button>
        </div>
        <div class="analysis-drawer-body">
          <div v-if="analysisLoading" class="analysis-empty">分析数据加载中...</div>
          <template v-else>
            <div v-if="chinaAnalysis" class="analysis-section analysis-section--hero">
              <div class="analysis-hero-head">
                <div>
                  <div class="analysis-section-title">涉华判定</div>
                  <div class="analysis-hero-sub">{{ chinaRoleLabel(chinaAnalysis.china_role) }} · {{ directnessLabel(chinaAnalysis.directness) }}</div>
                </div>
                <span class="china-status-chip" :class="{ active: chinaAnalysis.is_china_related }">
                  {{ chinaAnalysis.is_china_related ? '涉华' : '非涉华' }}
                </span>
              </div>
              <div class="analysis-metric-grid">
                <div class="analysis-metric">
                  <span class="metric-label">涉华指数</span>
                  <strong>{{ formatScore(chinaAnalysis.relevance_score) }}</strong>
                  <div class="metric-bar"><i :style="{ width: scorePercent(chinaAnalysis.relevance_score) + '%' }"></i></div>
                </div>
                <div class="analysis-metric">
                  <span class="metric-label">影响指数</span>
                  <strong :class="impactClass(chinaAnalysis.impact_index)">{{ signedNumber(chinaAnalysis.impact_index) }}</strong>
                  <div class="metric-bar metric-bar--impact"><i :class="impactClass(chinaAnalysis.impact_index)" :style="{ width: impactPercent(chinaAnalysis.impact_index) + '%' }"></i></div>
                </div>
                <div class="analysis-metric">
                  <span class="metric-label">置信度</span>
                  <strong>{{ formatScore(chinaAnalysis.confidence) }}</strong>
                  <div class="metric-bar"><i :style="{ width: scorePercent(chinaAnalysis.confidence) + '%' }"></i></div>
                </div>
              </div>
              <div v-if="chinaAnalysis.evidence" class="analysis-evidence">{{ chinaAnalysis.evidence }}</div>
            </div>

            <div v-if="eventExtraction" class="analysis-section">
              <div class="analysis-section-title">L1 事件抽取</div>
              <div class="entity-flow">
                <div class="entity-node">
                  <span>发起方</span>
                  <strong>{{ eventExtraction.initiator || '—' }}</strong>
                </div>
                <div class="entity-arrow">→</div>
                <div class="entity-node">
                  <span>目标</span>
                  <strong>{{ eventExtraction.target || '—' }}</strong>
                </div>
              </div>
              <div class="event-chip-grid">
                <span><b>领域</b>{{ eventExtraction.event_domain || '—' }}</span>
                <span><b>事件族</b>{{ eventExtraction.event_family || '—' }}</span>
                <span><b>行动</b>{{ eventExtraction.event_action || '—' }}</span>
                <span><b>语气</b>{{ toneLabel(eventExtraction.tone) }}</span>
                <span><b>实体对</b>{{ eventExtraction.entity_pair_key || '—' }}</span>
                <span><b>版本</b>{{ eventExtraction.processor_version || '—' }}</span>
              </div>
            </div>

            <div v-if="analysisL1Clusters.length || analysisL2Chains.length || analysisL3Macros.length" class="analysis-section">
              <div class="analysis-section-title">事件链路</div>
              <div v-if="analysisL1Clusters.length" class="analysis-chain-block">
                <div class="analysis-chain-label">L1 事件聚类</div>
                <button
                  v-for="l1 in analysisL1Clusters"
                  :key="'al1-'+l1.id"
                  type="button"
                  class="analysis-chain-item"
                  @click="goSearchL1(l1.id)"
                >
                  <strong>{{ l1.title }}</strong>
                  <span>文章 {{ l1.article_count }} · {{ l1.start_date || '—' }} 至 {{ l1.end_date || '—' }}</span>
                </button>
              </div>
              <div v-if="analysisL2Chains.length" class="analysis-chain-block">
                <div class="analysis-chain-label">L2 走势</div>
                <div v-for="l2 in analysisL2Chains" :key="'al2-'+l2.id" class="analysis-chain-item static">
                  <strong>{{ l2.title }}</strong>
                  <span>文章 {{ l2.article_count }} · 片段 {{ l2.segment_count }}</span>
                </div>
              </div>
              <div v-if="analysisL3Macros.length" class="analysis-chain-block">
                <div class="analysis-chain-label">L3 大事件</div>
                <div v-for="l3 in analysisL3Macros" :key="'al3-'+l3.id" class="analysis-chain-item static">
                  <strong>{{ l3.title }}</strong>
                  <span>文章 {{ l3.article_count }} · L2链 {{ l3.l2_chain_count }}</span>
                </div>
              </div>
            </div>

            <!-- 舆情趋势折线图 -->
            <div v-if="analysisTrend.length >= 2" class="analysis-section">
              <div class="analysis-section-title">L1 舆情走势</div>
              <div class="trend-chart-wrap">
                <svg class="trend-chart" :viewBox="'0 0 ' + trendChartWidth + ' ' + trendChartHeight" preserveAspectRatio="none">
                  <polyline
                    :points="trendPolylinePoints"
                    fill="none"
                    stroke="#3f6ad8"
                    stroke-width="2"
                    stroke-linejoin="round"
                    stroke-linecap="round"
                  />
                  <circle
                    v-for="(pt, i) in trendPoints"
                    :key="'tp-'+i"
                    :cx="pt.x"
                    :cy="pt.y"
                    r="3"
                    fill="#3f6ad8"
                  />
                  <polyline
                    v-if="trendSentimentPolyline"
                    :points="trendSentimentPolyline"
                    fill="none"
                    stroke="#ef4444"
                    stroke-width="1.5"
                    stroke-dasharray="4,3"
                    stroke-linejoin="round"
                    stroke-linecap="round"
                  />
                </svg>
                <div class="trend-legend">
                  <span class="trend-legend-item"><span class="trend-legend-dot blue"></span>文章数</span>
                  <span v-if="trendHasSentiment" class="trend-legend-item"><span class="trend-legend-dot red-dash"></span>情感</span>
                </div>
                <div class="trend-axis">
                  <span>{{ trendStartDate }}</span>
                  <span>{{ trendEndDate }}</span>
                </div>
              </div>
            </div>

            <div v-if="analysisItems.length" class="analysis-section">
              <div class="analysis-section-title">元数据</div>
              <table class="analysis-table">
                <tbody>
                  <tr v-for="it in compactAnalysisItems" :key="it.key">
                    <th>{{ it.label }}</th>
                    <td>{{ it.value }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-if="!analysisItems.length && !chinaAnalysis && !eventExtraction" class="analysis-empty">暂无分析结果</div>
          </template>
        </div>
      </aside>

      <div class="detail-header">
        <button class="back-btn" @click="goBack">返回</button>
      </div>

      <div class="detail-container" :class="{ split: showTranslationPanel }">
        <article
          class="detail-card original-card draggable-card"
          :style="originalDragStyle"
        >
          <div class="drag-edge top" @pointerdown.prevent="startPanelDrag($event, 'original')" @dblclick="resetPanelDrag('original')">
            <span class="drag-edge-line"></span>
          </div>
          <div class="drag-edge bottom" @pointerdown.prevent="startPanelDrag($event, 'original')"></div>
          <div class="drag-edge left" @pointerdown.prevent="startPanelDrag($event, 'original')"></div>
          <div class="drag-edge right" @pointerdown.prevent="startPanelDrag($event, 'original')"></div>

          <button
            class="drag-lock-btn"
            :class="{ locked: isOriginalDragLocked }"
            @click.stop="togglePanelDragLock('original')"
            :title="isOriginalDragLocked ? '已固定，点击解锁' : '固定当前位置'"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="5" y="11" width="14" height="10" rx="2"/>
              <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
            </svg>
          </button>

          <h1 class="detail-title">{{ news.title || '无标题' }}</h1>
          <div class="detail-meta">
            <span v-if="news.source" class="meta-item">来源：{{ news.source }}</span>
            <span v-if="news.pub_time" class="meta-item">{{ formatTime(news.pub_time) }}</span>
            <span v-if="news.location" class="meta-item">语言/地区：{{ news.location }}</span>
          </div>
          <div class="book-page abstract-page">
            <h3 class="book-page-title">摘要</h3>
            <p class="detail-abstract">{{ news.abstract || '暂无摘要' }}</p>
          </div>
          <div class="book-page body-page">
            <h3 class="book-page-title">正文</h3>
            <div class="detail-body">
              <p
                v-for="(p, idx) in bodyParagraphs"
                :key="`l-${idx}`"
                class="body-para"
                :class="{ linked: linkedLeftIndex === idx }"
                :ref="(el) => setLeftParagraphEl(el, idx)"
                @mouseenter="onHoverLeft(idx)"
                @mouseleave="clearLinkedHover"
              >
                {{ p }}
              </p>
            </div>
            <p v-if="!news.body" class="no-content">暂无正文</p>
          </div>
          <div class="detail-footer">
            <a
              v-if="news.request_url"
              :href="news.request_url"
              target="_blank"
              rel="noopener noreferrer"
              class="view-original"
            >
              查看原文
            </a>
          </div>
        </article>

        <aside class="translation-panel">
          <article
            class="detail-card translation-card draggable-card"
            ref="translationCardEl"
            :style="translationDragStyle"
          >
            <!-- 四边拖拽手柄 -->
            <div class="drag-edge top" @pointerdown.prevent="startPanelDrag($event, 'translation')" @dblclick="resetPanelDrag('translation')">
              <span class="drag-edge-line"></span>
            </div>
            <div class="drag-edge bottom" @pointerdown.prevent="startPanelDrag($event, 'translation')"></div>
            <div class="drag-edge left" @pointerdown.prevent="startPanelDrag($event, 'translation')"></div>
            <div class="drag-edge right" @pointerdown.prevent="startPanelDrag($event, 'translation')"></div>

            <button
              class="drag-lock-btn"
              :class="{ locked: isTranslationDragLocked }"
              @click.stop="togglePanelDragLock('translation')"
              :title="isTranslationDragLocked ? '已固定，点击解锁' : '固定当前位置'"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="5" y="11" width="14" height="10" rx="2"/>
                <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
              </svg>
            </button>

            <h1 class="detail-title">{{ translation?.title || '暂无翻译标题' }}</h1>
            <div class="detail-meta">
              <span v-if="translationLoading" class="meta-item">翻译中...</span>
              <span v-else-if="translation" class="meta-item">已翻译</span>
              <span v-else class="meta-item">暂无翻译</span>
              <span class="meta-item">模式：本地 LLM · 逐段翻译</span>
            </div>
            <div class="translation-toolbar">
              <div class="mode-switch">
                <button class="active" disabled>本地 LLM</button>
              </div>
              <button class="translate-run-btn" :disabled="translationLoading" @click="runTranslation">
                {{ translationLoading ? '翻译中...' : '开始翻译' }}
              </button>
            </div>
            <p v-if="translationHint" class="translation-hint">{{ translationHint }}</p>
            <!-- 右侧面板摘要：有翻译内容才显示，没有则整个去掉，正文自然上移填位 -->
            <div v-if="translation?.abstract" class="book-page abstract-page">
              <h3 class="book-page-title">摘要</h3>
              <p class="detail-abstract">{{ translation.abstract }}</p>
            </div>
            <div class="book-page body-page">
              <h3 class="book-page-title">正文</h3>
              <div class="detail-body">
                <p
                  v-for="(p, idx) in translationBodyParagraphs"
                  :key="`r-${idx}`"
                  class="body-para"
                :class="{ linked: linkedRightIndex === idx, typing: isParagraphTyping(idx) }"
                :style="{ minHeight: getAlignedMinHeight(idx) }"
                :ref="(el) => setRightParagraphEl(el, idx)"
                  @mouseenter="onHoverRight(idx)"
                  @mouseleave="clearLinkedHover"
                >
                {{ getRenderedParagraph(idx) }}
                </p>
              </div>
              <p v-if="!translation?.body" class="no-content">暂无翻译</p>
            </div>
          </article>
        </aside>
      </div>
    </template>
    <AssistantDrawer
      v-model="assistantDrawerOpen"
      :drawer-key="assistantDrawerKey"
      :page-skill="newsAssistantSkill"
      title="新闻详情数据助手"
      subtitle="读取当前新闻正文、涉华判定、事件抽取和链路分析"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { API_PREFIX } from '@/config/api'
import { ElMessage } from 'element-plus'
import { AssistantDrawer } from '@/features/assistant/index.js'

const route = useRoute()
const router = useRouter()
const ASSISTANT_AUTORUN_CONTEXT_KEY = 'data_assistant_autorun_context_v1'
const assistantDrawerOpen = ref(false)
const assistantDrawerKey = ref(0)
const news = ref(null)
const loading = ref(true)
const error = ref('')
const translation = ref(null)
const translationLoading = ref(false)
const showTranslationPanel = ref(false)
const translationHint = ref('')
const linkedLeftIndex = ref(-1)
const linkedRightIndex = ref(-1)
const leftParagraphEls = ref([])
const rightParagraphEls = ref([])
const alignedHeights = ref([])
const renderedTranslationParagraphs = ref([])
const paragraphTypingMap = ref({})
const showAnalysisDrawer = ref(false)
const analysisLoading = ref(false)
const analysisItems = ref([])
const analysisL1Clusters = ref([])
const analysisL2Chains = ref([])
const analysisL3Macros = ref([])
const analysisTrend = ref([])
const chinaAnalysis = ref(null)
const eventExtraction = ref(null)

const TRANSLATION_BODY_CONCURRENCY = 3
const PAPER_THEME_STORAGE_KEY = 'globemind_news_paper_theme'
const PAPER_THEMES = [
  {
    id: 'khaki',
    name: '淡卡其',
    card: '#eadbb8',
    cardTop: 'rgba(245, 235, 207, 0.2)',
    cardBottom: 'rgba(235, 221, 184, 0.16)',
    line: 'rgba(128, 105, 55, 0.02)',
    border: '#d7c38e',
    inset: 'rgba(255, 248, 226, 0.34)',
    page: 'rgba(248, 240, 220, 0.72)',
    pageBorder: 'rgba(128, 105, 55, 0.14)',
    metaBg: '#f6edd7',
    metaBorder: '#eadbb8',
  },
  {
    id: 'rice',
    name: '米纸',
    card: '#f0e4c9',
    cardTop: 'rgba(250, 244, 230, 0.18)',
    cardBottom: 'rgba(238, 226, 199, 0.14)',
    line: 'rgba(130, 112, 75, 0.018)',
    border: '#ddcca6',
    inset: 'rgba(255, 252, 244, 0.38)',
    page: 'rgba(251, 246, 232, 0.7)',
    pageBorder: 'rgba(137, 113, 68, 0.12)',
    metaBg: '#faf1de',
    metaBorder: '#ead9b8',
  },
  {
    id: 'sand',
    name: '沙棕',
    card: '#e2ccb0',
    cardTop: 'rgba(237, 222, 198, 0.18)',
    cardBottom: 'rgba(217, 195, 165, 0.14)',
    line: 'rgba(108, 83, 48, 0.024)',
    border: '#c8ad86',
    inset: 'rgba(255, 244, 224, 0.28)',
    page: 'rgba(242, 230, 211, 0.72)',
    pageBorder: 'rgba(108, 83, 48, 0.14)',
    metaBg: '#efe0c7',
    metaBorder: '#dcc49f',
  },
  {
    id: 'sage',
    name: '灰绿纸',
    card: '#dfe1c9',
    cardTop: 'rgba(242, 244, 226, 0.18)',
    cardBottom: 'rgba(218, 222, 197, 0.14)',
    line: 'rgba(72, 91, 67, 0.02)',
    border: '#c2c8a8',
    inset: 'rgba(250, 252, 234, 0.34)',
    page: 'rgba(244, 246, 229, 0.7)',
    pageBorder: 'rgba(72, 91, 67, 0.12)',
    metaBg: '#eef0d9',
    metaBorder: '#d6dbc0',
  },
]

function getStoredPaperThemeId() {
  if (typeof localStorage === 'undefined') return PAPER_THEMES[0].id
  const stored = localStorage.getItem(PAPER_THEME_STORAGE_KEY)
  return PAPER_THEMES.some((theme) => theme.id === stored) ? stored : PAPER_THEMES[0].id
}

const activePaperThemeId = ref(getStoredPaperThemeId())
const activePaperTheme = computed(() => PAPER_THEMES.find((theme) => theme.id === activePaperThemeId.value) || PAPER_THEMES[0])
const paperThemeStyle = computed(() => {
  const theme = activePaperTheme.value
  return {
    '--paper-card': theme.card,
    '--paper-card-top': theme.cardTop,
    '--paper-card-bottom': theme.cardBottom,
    '--paper-line': theme.line,
    '--paper-border': theme.border,
    '--paper-inset': theme.inset,
    '--paper-page': theme.page,
    '--paper-page-border': theme.pageBorder,
    '--paper-meta-bg': theme.metaBg,
    '--paper-meta-border': theme.metaBorder,
  }
})

const newsAssistantSkill = computed(() => ({
  page: '新闻详情',
  path: `/data-service/news/${route.params.id || ''}`,
  displaySummary: '当前新闻详情，可协助摘要、解释和延伸检索。',
  displayActions: ['新闻解读'],
  summary: `${news.value?.title || '当前新闻'}；包含正文、翻译、涉华判定、事件抽取和 L1/L2/L3 链路分析。`,
  access: [
    '数据搜索结果可点击新闻进入',
    '故事图谱/观察台证据新闻可打开详情',
    '详情页右侧 AI 按钮打开侧栏助手',
  ],
  sections: [
    '新闻元信息与原文正文',
    '翻译对照面板',
    '文章分析抽屉',
    'L1/L2/L3 事件链路',
  ],
  actions: [
    '打开或收起翻译面板',
    '打开或收起文章分析',
    '跳转 L1 检索',
    '返回数据搜索继续扩展',
  ],
  aiActions: [
    '总结新闻主旨和关键事实',
    '解释涉华判定与事件抽取',
    '建议后续检索关键词和链路核验方向',
  ],
}))

function selectPaperTheme(themeId) {
  if (!PAPER_THEMES.some((theme) => theme.id === themeId)) return
  activePaperThemeId.value = themeId
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(PAPER_THEME_STORAGE_KEY, themeId)
  }
}

// ---- 分析面板计算属性 ----
const TREND_W = 280, TREND_H = 80
const trendChartWidth = TREND_W
const trendChartHeight = TREND_H

const compactAnalysisItems = computed(() => {
  const hidden = new Set([
    'l1_clusters',
    'l2_chains',
    'l3_macros',
    'is_china_related',
    'china_relevance_score',
    'china_impact_sentiment',
    'china_directness',
    'event_family',
    'event_action',
    'entity_pair_key',
    'tone',
  ])
  return analysisItems.value.filter((item) => !hidden.has(item.key))
})

const formatScore = (value) => {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return n.toFixed(3)
}

const scorePercent = (value) => {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.min(100, Math.max(0, n * 100))
}

const impactPercent = (value) => {
  const n = Math.abs(Number(value))
  if (!Number.isFinite(n)) return 0
  return Math.min(100, n)
}

const signedNumber = (value) => {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return `${n > 0 ? '+' : ''}${n.toFixed(1)}`
}

const impactClass = (value) => {
  const n = Number(value)
  if (!Number.isFinite(n)) return 'neutral'
  if (n > 0.1) return 'positive'
  if (n < -0.1) return 'negative'
  return 'neutral'
}

const directnessLabel = (value) => ({
  direct_evaluation: '直接评价',
  indirect_related: '间接相关',
  mention_or_context: '提及/背景',
  mention_only: '仅提及',
  not_related: '非涉华',
}[value] || value || '—')

const chinaRoleLabel = (value) => ({
  china_as_actor_or_target: '中国为行动方/目标',
  china_as_target: '中国为目标',
  china_as_initiator: '中国为发起方',
  china_in_title: '标题涉华',
  china_periphery_related: '中国周边相关',
  china_mention: '文本涉华提及',
  not_china_related: '未识别涉华',
}[value] || value || '—')

const toneLabel = (value) => ({
  positive: '积极',
  negative: '负面',
  neutral: '中性',
}[value] || value || '—')

// 趋势图坐标
const trendMaxCount = computed(() => {
  if (!analysisTrend.value.length) return 1
  return Math.max(...analysisTrend.value.map(t => t.article_count), 1)
})
const trendHasSentiment = computed(() => {
  return analysisTrend.value.some(t => t.avg_sentiment != null)
})
const trendSentimentRange = computed(() => {
  if (!trendHasSentiment.value) return { min: -1, max: 1 }
  const vals = analysisTrend.value.map(t => t.avg_sentiment).filter(v => v != null)
  if (!vals.length) return { min: -1, max: 1 }
  return { min: Math.min(...vals, -0.1), max: Math.max(...vals, 0.1) }
})
const padX = 4, padY = 4
const trendW = computed(() => TREND_W - padX * 2)
const trendH = computed(() => TREND_H - padY * 2)
const trendPoints = computed(() => {
  const arr = analysisTrend.value
  if (arr.length < 2) return []
  const maxCount = trendMaxCount.value
  const w = trendW.value, h = trendH.value
  return arr.map((t, i) => ({
    x: padX + (i / (arr.length - 1)) * w,
    y: padY + h - (t.article_count / maxCount) * h,
  }))
})
const trendPolylinePoints = computed(() => {
  return trendPoints.value.map(p => `${p.x},${p.y}`).join(' ')
})
const trendSentimentPoints = computed(() => {
  const arr = analysisTrend.value
  if (arr.length < 2 || !trendHasSentiment.value) return []
  const range = trendSentimentRange.value
  const rangeSize = range.max - range.min || 1
  const w = trendW.value, h = trendH.value
  return arr.map((t, i) => ({
    x: padX + (i / (arr.length - 1)) * w,
    y: padY + h - ((t.avg_sentiment - range.min) / rangeSize) * h,
  }))
})
const trendSentimentPolyline = computed(() => {
  return trendSentimentPoints.value.map(p => `${p.x},${p.y}`).join(' ')
})
const trendStartDate = computed(() => {
  return analysisTrend.value.length ? analysisTrend.value[0].date : ''
})
const trendEndDate = computed(() => {
  return analysisTrend.value.length ? analysisTrend.value[analysisTrend.value.length - 1].date : ''
})

function goSearchL1(l1Id) {
  router.push(`/data-service/data-search?mode=exact&searchType=l1&keyword=&l1_id=${l1Id}`)
}

const hasExistingTrans = computed(() => {
  if (!news.value) return false
  return !!(news.value.trans_title || news.value.trans_abstract || news.value.trans_body)
})
const isChinaRelated = ref(false)
const translationCardEl = ref(null)
const originalDragX = ref(0)
const originalDragY = ref(0)
const translationDragX = ref(0)
const translationDragY = ref(0)
const isOriginalDragLocked = ref(false)
const isTranslationDragLocked = ref(false)
let _activeDragPanel = ''
let _dragStartX = 0
let _dragStartY = 0
let _dragOrgX = 0
let _dragOrgY = 0

const originalDragStyle = computed(() => ({
  '--drag-x': `${originalDragX.value}px`,
  '--drag-y': `${originalDragY.value}px`,
}))

const translationDragStyle = computed(() => ({
  '--drag-x': `${translationDragX.value}px`,
  '--drag-y': `${translationDragY.value}px`,
}))

function getPanelDragRefs(panel) {
  return panel === 'original'
    ? { x: originalDragX, y: originalDragY, locked: isOriginalDragLocked }
    : { x: translationDragX, y: translationDragY, locked: isTranslationDragLocked }
}

function startPanelDrag(e, panel) {
  if (e.pointerType === 'mouse' && e.button !== 0) return
  const dragRefs = getPanelDragRefs(panel)
  if (dragRefs.locked.value) return
  _activeDragPanel = panel
  _dragStartX = e.clientX
  _dragStartY = e.clientY
  _dragOrgX = dragRefs.x.value
  _dragOrgY = dragRefs.y.value
  document.addEventListener('pointermove', onPanelDrag)
  document.addEventListener('pointerup', stopPanelDrag)
  document.addEventListener('pointercancel', stopPanelDrag)
}

function onPanelDrag(e) {
  if (!_activeDragPanel) return
  const dragRefs = getPanelDragRefs(_activeDragPanel)
  dragRefs.x.value = _dragOrgX + (e.clientX - _dragStartX)
  dragRefs.y.value = _dragOrgY + (e.clientY - _dragStartY)
}

function stopPanelDrag() {
  _activeDragPanel = ''
  document.removeEventListener('pointermove', onPanelDrag)
  document.removeEventListener('pointerup', stopPanelDrag)
  document.removeEventListener('pointercancel', stopPanelDrag)
}

function togglePanelDragLock(panel) {
  const dragRefs = getPanelDragRefs(panel)
  dragRefs.locked.value = !dragRefs.locked.value
}

function resetPanelDrag(panel) {
  const dragRefs = getPanelDragRefs(panel)
  dragRefs.x.value = 0
  dragRefs.y.value = 0
  dragRefs.locked.value = false
}

// 从 analysisItems 中提取涉华标识
watch(analysisItems, (items) => {
  if (!items || !items.length) return
  const chinaItem = items.find(it => it.key === 'is_china_related')
  if (chinaItem) {
    isChinaRelated.value = chinaItem.value === 'True' || chinaItem.value === 'true'
  }
}, { immediate: true })

function goBack() {
  router.push('/data-service/data-search')
}

function compactAssistantText(value, max = 700) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  if (!text) return ''
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

function chainLines(items, label) {
  return (items || []).slice(0, 8).map((item, index) => {
    const title = item.title || item.name || item.id || `${label}${index + 1}`
    const count = item.article_count || item.segment_count || item.l2_chain_count || ''
    const range = [item.start_date, item.end_date].filter(Boolean).join(' 至 ')
    return `${index + 1}. ${compactAssistantText(title, 140)}${count ? `；数量 ${count}` : ''}${range ? `；时间 ${range}` : ''}`
  })
}

function buildNewsAssistantContext() {
  const item = news.value || {}
  const extraction = eventExtraction.value || {}
  const china = chinaAnalysis.value || {}
  const lines = [
    '【新闻详情页上下文】',
    `新闻 ID：${item.id || route.params.id || ''}`,
    `标题：${item.title || '无标题'}`,
    `来源：${item.source || '未知来源'}`,
    `发布时间：${item.pub_time || '未知'}`,
    item.request_url ? `原文 URL：${item.request_url}` : '',
    `摘要：${compactAssistantText(item.abstract || item.trans_abstract, 600) || '无'}`,
    `正文节选：${compactAssistantText(item.body || item.trans_body, 1600) || '无正文'}`,
    '',
    '【涉华与事件抽取】',
    chinaAnalysis.value
      ? `涉华：${china.is_china_related ? '是' : '否'}；角色 ${chinaRoleLabel(china.china_role)}；直接性 ${directnessLabel(china.directness)}；相关度 ${formatScore(china.relevance_score)}；影响 ${signedNumber(china.impact_index)}；证据 ${compactAssistantText(china.evidence, 260)}`
      : '涉华分析：暂无',
    eventExtraction.value
      ? `事件：${extraction.initiator || '?'} -> ${extraction.target || '?'}；领域 ${extraction.event_domain || '?'}；事件族 ${extraction.event_family || '?'}；行动 ${extraction.event_action || '?'}；语气 ${toneLabel(extraction.tone)}；实体对 ${extraction.entity_pair_key || '?'}`
      : '事件抽取：暂无',
    '',
    '【事件链路】',
    'L1 事件聚类：',
    ...(chainLines(analysisL1Clusters.value, 'L1').length ? chainLines(analysisL1Clusters.value, 'L1') : ['无']),
    'L2 走势：',
    ...(chainLines(analysisL2Chains.value, 'L2').length ? chainLines(analysisL2Chains.value, 'L2') : ['无']),
    'L3 大事件：',
    ...(chainLines(analysisL3Macros.value, 'L3').length ? chainLines(analysisL3Macros.value, 'L3') : ['无']),
    '',
    '【用户问题】',
    '请基于这篇新闻和已抽取的事件链路，判断它在当前议题中的角色、重要性、风险信号、需要继续核查的事实，并输出可用于报告的摘要和后续检索建议。',
  ].filter(Boolean)
  return {
    visibleMessage: `分析新闻：${compactAssistantText(item.title || item.id || '当前新闻', 80)}`,
    prompt: lines.join('\n'),
    mode: 'expert',
  }
}

function sendNewsToAssistant() {
  if (!localStorage.getItem('access_token')) {
    ElMessage.warning('请先登录后使用数据助手')
    return
  }
  if (!news.value) {
    ElMessage.warning('新闻尚未加载完成')
    return
  }
  sessionStorage.setItem(ASSISTANT_AUTORUN_CONTEXT_KEY, JSON.stringify(buildNewsAssistantContext()))
  assistantDrawerKey.value += 1
  assistantDrawerOpen.value = true
}

function formatTime(val) {
  if (!val) return '—'
  if (typeof val === 'string') return val
  if (val instanceof Date) return val.toLocaleString('zh-CN')
  return String(val)
}

function splitReadableParagraphs(rawText) {
  const text = String(rawText || '').replace(/\r\n/g, '\n').trim()
  if (!text) return []
  const byLines = text
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean)

  const out = []
  for (const line of byLines) {
    if (line.length <= 280) {
      out.push(line)
      continue
    }
    const bySentence = line
      .split(/(?<=[。！？!?.])\s+/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (bySentence.length <= 1) {
      out.push(line)
      continue
    }
    let buf = ''
    for (const seg of bySentence) {
      if (!buf) {
        buf = seg
        continue
      }
      if ((buf + ' ' + seg).length > 240) {
        out.push(buf)
        buf = seg
      } else {
        buf += ` ${seg}`
      }
    }
    if (buf) out.push(buf)
  }
  return out
}

function cleanTranslatedText(text) {
  let out = String(text || '').trim()
  if (!out) return ''
  out = out
    .replace(/^(译文|翻译|摘要|正文)\s*[：:]\s*/gi, '')
    .replace(/内容分析与结论\s*[：:]/gi, '')
    .replace(/内容分析\s*[：:]/gi, '')
    .replace(/以下是.*?翻译\s*[：:]/gi, '')
    .replace(/^\s*[-*]\s*/gm, '')
    .trim()
  return out
}

const bodyParagraphs = computed(() => {
  if (!news.value || !news.value.body) return []
  return splitReadableParagraphs(news.value.body)
})

const translationBodyParagraphs = computed(() => {
  if (!translation.value) return []
  if (Array.isArray(translation.value.body_paragraphs) && translation.value.body_paragraphs.length) {
    return translation.value.body_paragraphs
  }
  if (!translation.value.body) return []
  return splitReadableParagraphs(cleanTranslatedText(translation.value.body))
})

async function fetchNews() {
  const id = route.params.id
  if (!id) {
    error.value = '缺少新闻 ID'
    loading.value = false
    return
  }
  loading.value = true
  error.value = ''
  news.value = null
  translation.value = null
  analysisItems.value = []
  analysisL1Clusters.value = []
  analysisL2Chains.value = []
  analysisL3Macros.value = []
  analysisTrend.value = []
  chinaAnalysis.value = null
  eventExtraction.value = null
  try {
    const res = await fetch(`${API_PREFIX}/dashboard/news/${id}`)
    if (res.status === 404) {
      error.value = '新闻不存在'
      return
    }
    if (!res.ok) {
      error.value = '加载失败，请稍后重试'
      return
    }
    const data = await res.json()
    news.value = {
      id: data.id,
      title: data.title ?? '',
      abstract: data.abstract ?? '',
      body: data.body ?? '',
      pub_time: data.pub_time,
      request_url: data.request_url,
      source: data.source,
      location: data.location,
      trans_title: data.trans_title ?? '',
      trans_abstract: data.trans_abstract ?? '',
      trans_body: data.trans_body ?? '',
    }
    await fetchAnalysis(data.id)
  } catch {
    error.value = '网络错误，请稍后重试'
  } finally {
    loading.value = false
  }
}

async function fetchAnalysis(newsId) {
  if (!newsId) return
  analysisLoading.value = true
  try {
    const res = await fetch(`${API_PREFIX}/dashboard/news/${newsId}/analysis`)
    if (res.ok) {
      const data = await res.json()
      analysisItems.value = Array.isArray(data?.items) ? data.items : []
      analysisL1Clusters.value = Array.isArray(data?.l1_clusters) ? data.l1_clusters : []
      analysisL2Chains.value = Array.isArray(data?.l2_chains) ? data.l2_chains : []
      analysisL3Macros.value = Array.isArray(data?.l3_macros) ? data.l3_macros : []
      analysisTrend.value = Array.isArray(data?.trend) ? data.trend : []
      chinaAnalysis.value = data?.china_analysis || null
      eventExtraction.value = data?.event_extraction || null
    } else {
      analysisItems.value = []
      analysisL1Clusters.value = []
      analysisL2Chains.value = []
      analysisL3Macros.value = []
      analysisTrend.value = []
      chinaAnalysis.value = null
      eventExtraction.value = null
    }
    if (!analysisItems.value.length && news.value) {
      analysisItems.value = [
        { key: 'pub_date', label: '发布日期', value: formatTime(news.value.pub_time) || '—' },
        { key: 'source', label: '来源', value: news.value.source || '—' },
        { key: 'language', label: '语言/地区', value: news.value.location || '—' },
      ]
    }
  } catch {
    analysisItems.value = []
    analysisL1Clusters.value = []
    analysisL2Chains.value = []
    analysisL3Macros.value = []
    analysisTrend.value = []
    chinaAnalysis.value = null
    eventExtraction.value = null
  } finally {
    analysisLoading.value = false
  }
}

async function translateViaLocalLlm(text) {
  const res = await fetch(`${API_PREFIX}/dashboard/news/translate-paragraph`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      target_language: '简体中文',
    }),
    signal: AbortSignal.timeout(120000),
  })
  if (!res.ok) {
    let detail = ''
    try {
      const err = await res.json()
      detail = err?.detail ? `：${err.detail}` : ''
    } catch {
      detail = ''
    }
    throw new Error(`本地 LLM 翻译失败 ${res.status}${detail}`)
  }
  const data = await res.json()
  return String(data?.text || '').trim()
}

async function translateParagraphList(paragraphs, translator) {
  const out = new Array(paragraphs.length).fill('')
  const concurrency = Math.min(TRANSLATION_BODY_CONCURRENCY, paragraphs.length)
  let cursor = 0
  let completed = 0

  function updateTranslationProgress() {
    translationHint.value = `正在并发翻译正文：${completed} / ${paragraphs.length} 段完成 · 并发 ${concurrency}`
  }

  updateTranslationProgress()

  async function worker() {
    while (cursor < paragraphs.length) {
      const idx = cursor++
      const src = paragraphs[idx] || ''
      if (!src.trim()) {
        out[idx] = ''
        completed += 1
        updateTranslationProgress()
        continue
      }
      const translated = await translator(src)
      out[idx] = cleanTranslatedText(translated)
      if (translation.value && Array.isArray(translation.value.body_paragraphs)) {
        translation.value.body_paragraphs[idx] = out[idx]
      }
      await animateParagraphTyping(idx, out[idx])
      completed += 1
      updateTranslationProgress()
    }
  }

  const jobs = []
  for (let i = 0; i < Math.min(concurrency, paragraphs.length); i += 1) {
    jobs.push(worker())
  }
  await Promise.all(jobs)
  return out
}

async function fetchTranslation() {
  translationLoading.value = true
  translationHint.value = ''
  renderedTranslationParagraphs.value = []
  paragraphTypingMap.value = {}

  try {
    if (!news.value) return

    const t = translateViaLocalLlm

    async function doTranslate() {
      // 只翻译非空内容，避免浪费请求
      translationHint.value = '正在调用本地 LLM 翻译标题与摘要...'
      const titlePromise = news.value.title ? t(news.value.title) : ''
      const abstractPromise = news.value.abstract ? t(news.value.abstract) : ''
      const [title, abstract] = await Promise.all([titlePromise, abstractPromise])

      translation.value = {
        title: cleanTranslatedText(title || ''),
        abstract: cleanTranslatedText(abstract || ''),
        body: '',
        body_paragraphs: [],
      }

      const srcParagraphs = splitReadableParagraphs(news.value.body || '')
      let body = ''
      let bodyParagraphs = []
      if (srcParagraphs.length) {
        translation.value.body_paragraphs = new Array(srcParagraphs.length).fill('')
        renderedTranslationParagraphs.value = new Array(srcParagraphs.length).fill('')
        bodyParagraphs = await translateParagraphList(srcParagraphs, t)
        body = bodyParagraphs.join('\n\n')
      } else if (news.value.body) {
        body = cleanTranslatedText(await t(news.value.body))
      }

      translation.value.title = cleanTranslatedText(title || '')
      translation.value.abstract = cleanTranslatedText(abstract || '')
      translation.value.body = cleanTranslatedText(body)
      translation.value.body_paragraphs = bodyParagraphs
      translationHint.value = '本地 LLM 翻译完成，正文已按段落生成。'
    }

    await doTranslate()
  } catch (e) {
    console.error('获取翻译失败:', e)
    // LLM 全部不可用时回退到数据库已有翻译
    if (hasExistingTrans.value) {
      loadDbTranslation()
      translationHint.value = `本地 LLM 暂不可用，已显示数据库已有翻译。${e?.message || ''}`
    } else {
      translationHint.value = `本地 LLM 翻译失败：${e?.message || e}`
      translation.value = null
    }
  } finally {
    translationLoading.value = false
  }
}

function runTranslation() {
  if (!news.value) return
  fetchTranslation()
}

function loadDbTranslation() {
  if (!news.value) return
  const body = news.value.trans_body || ''
  translation.value = {
    title: news.value.trans_title || '',
    abstract: news.value.trans_abstract || '',
    body: body,
    body_paragraphs: body ? splitReadableParagraphs(body) : [],
  }
  renderedTranslationParagraphs.value = []
  paragraphTypingMap.value = {}
}

function toggleTranslationPanel() {
  showTranslationPanel.value = !showTranslationPanel.value
  resetAlignState()
  if (showTranslationPanel.value && !translation.value && !translationLoading.value) {
    runTranslation()
  }
}

function toggleAnalysisDrawer() {
  showAnalysisDrawer.value = !showAnalysisDrawer.value
}

function mapIndex(sourceIdx, sourceLen, targetLen) {
  if (sourceLen <= 1 || targetLen <= 1) return 0
  const ratio = sourceIdx / (sourceLen - 1)
  return Math.max(0, Math.min(targetLen - 1, Math.round(ratio * (targetLen - 1))))
}

function onHoverLeft(idx) {
  linkedLeftIndex.value = idx
  if (translationBodyParagraphs.value.length === bodyParagraphs.value.length) {
    linkedRightIndex.value = idx
    return
  }
  linkedRightIndex.value = mapIndex(idx, bodyParagraphs.value.length, translationBodyParagraphs.value.length)
}

function onHoverRight(idx) {
  linkedRightIndex.value = idx
  if (translationBodyParagraphs.value.length === bodyParagraphs.value.length) {
    linkedLeftIndex.value = idx
    return
  }
  linkedLeftIndex.value = mapIndex(idx, translationBodyParagraphs.value.length, bodyParagraphs.value.length)
}

function clearLinkedHover() {
  linkedLeftIndex.value = -1
  linkedRightIndex.value = -1
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function animateParagraphTyping(idx, fullText) {
  const text = String(fullText || '')
  paragraphTypingMap.value[idx] = true
  renderedTranslationParagraphs.value[idx] = ''
  const step = text.length > 380 ? 3 : 2
  for (let i = 0; i < text.length; i += step) {
    renderedTranslationParagraphs.value[idx] = text.slice(0, i + step)
    if (i % (step * 2) === 0) {
      await sleep(10)
    }
  }
  renderedTranslationParagraphs.value[idx] = text
  paragraphTypingMap.value[idx] = false
}

function getRenderedParagraph(idx) {
  const current = renderedTranslationParagraphs.value[idx]
  if (typeof current === 'string' && current.length > 0) return current
  return translationLoading.value ? '翻译中...' : (translationBodyParagraphs.value[idx] || '')
}

function isParagraphTyping(idx) {
  return !!paragraphTypingMap.value[idx]
}

function setLeftParagraphEl(el, idx) {
  leftParagraphEls.value[idx] = el || null
}

function setRightParagraphEl(el, idx) {
  rightParagraphEls.value[idx] = el || null
}

function getAlignedMinHeight(idx) {
  if (!showTranslationPanel.value) return ''
  const h = alignedHeights.value[idx] || 0
  return h > 0 ? `${h}px` : ''
}

function syncParagraphHeights() {
  if (!showTranslationPanel.value) {
    alignedHeights.value = []
    return
  }
  alignedHeights.value = []
  const maxLen = Math.max(bodyParagraphs.value.length, translationBodyParagraphs.value.length)
  for (let i = 0; i < maxLen; i += 1) {
    const rightEl = rightParagraphEls.value[i]
    if (rightEl) rightEl.style.minHeight = ''
  }
  const nextHeights = new Array(maxLen).fill(0)
  for (let i = 0; i < maxLen; i += 1) {
    // 左侧保持自然段距，右侧按左侧高度对齐
    const leftNaturalHeight = leftParagraphEls.value[i]?.offsetHeight || 0
    nextHeights[i] = leftNaturalHeight
  }
  alignedHeights.value = nextHeights
}

async function syncParagraphHeightsAsync() {
  await nextTick()
  syncParagraphHeights()
}

function resetAlignState() {
  alignedHeights.value = []
  leftParagraphEls.value = []
  rightParagraphEls.value = []
}

function removeStrayAssistantMemoryDialogs() {
  if (typeof document === 'undefined') return
  const markers = ['清空助手记忆', 'Hermes 将不再保留对你长期偏好和背景的摘要']
  const selectors = ['.el-overlay', '.el-message-box__wrapper', '.el-message-box']
  document.querySelectorAll(selectors.join(',')).forEach((node) => {
    const text = node.textContent || ''
    if (markers.some((marker) => text.includes(marker))) {
      node.remove()
    }
  })
}

onMounted(() => {
  removeStrayAssistantMemoryDialogs()
  fetchNews()
})
onMounted(() => {
  window.addEventListener('resize', syncParagraphHeights)
})
onBeforeUnmount(() => {
  stopPanelDrag()
  window.removeEventListener('resize', syncParagraphHeights)
})
watch(() => route.params.id, () => {
  removeStrayAssistantMemoryDialogs()
  fetchNews()
})
watch(showTranslationPanel, (v) => {
  if (v) removeStrayAssistantMemoryDialogs()
  if (!v) resetAlignState()
})
watch([showTranslationPanel, bodyParagraphs, translationBodyParagraphs], syncParagraphHeightsAsync, { deep: true })
</script>

<style src="./news-detail.css" scoped></style>.news-detail {
