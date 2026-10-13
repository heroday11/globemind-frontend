<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  BookOpen,
  Calculator,
  Check,
  ChevronRight,
  Clock3,
  Download,
  FileText,
  FolderPlus,
  ListFilter,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldCheck,
} from 'lucide-vue-next'
import { decisionApi } from '@/features/decision-intelligence/api.js'
import { getToken } from '@/utils/auth.js'

const route = useRoute()
const router = useRouter()
const briefs = ref([])
const brief = ref(null)
const topicFilter = ref('')
const loading = ref(true)
const error = ref('')
const notice = ref('')
const activeTab = computed(() =>
  tabs.some((tab) => tab.id === route.query.tab) ? route.query.tab : 'timeline',
)
const selectedChange = ref('')
const latestFirst = ref(true)
const importing = ref(false)
const importedProject = ref(null)
const highlightedClaims = ref([])
const maxArticles = ref(3)
let loadVersion = 0
let pollTimer
let disposed = false

const tabs = [
  { id: 'timeline', label: '关键变化' },
  { id: 'judgments', label: '判断与选项' },
  { id: 'evidence', label: '证据' },
  { id: 'monitor', label: '观察与测算' },
  { id: 'analysis', label: '原文分析' },
]
const stateNames = {
  proposed: '提案',
  announced: '宣布',
  adopted: '通过',
  effective: '生效',
  implemented: '执行',
  revised: '修订',
  disputed: '争议',
  observed: '观察',
  announcement: '表态 / 公告',
  denied: '否认 / 不接受',
  uncertain: '待核',
}
const audienceNames = { enterprise: '企业', research: '研究机构', government: '政府部门' }
const countries = { TH: '泰国', EU: '欧盟', CN: '中国', CHN: '中国' }
const filteredBriefs = computed(() =>
  briefs.value.filter((item) =>
    `${item.title} ${item.tags.join(' ')}`.toLowerCase().includes(topicFilter.value.toLowerCase()),
  ),
)
const timeline = computed(() =>
  latestFirst.value ? [...observedChanges.value].reverse() : observedChanges.value,
)
const observedChanges = computed(() =>
  (brief.value?.timeline || []).filter((item) => item.occurred_on <= brief.value.evidence_cutoff),
)
const futureChanges = computed(() =>
  (brief.value?.timeline || []).filter((item) => item.occurred_on > brief.value.evidence_cutoff),
)
const change = computed(() =>
  brief.value?.timeline.find((item) => item.id === selectedChange.value),
)
const changeClaims = computed(
  () => brief.value?.claims.filter((item) => change.value?.claim_ids.includes(item.id)) || [],
)
const sourceMap = computed(() =>
  Object.fromEntries((brief.value?.sources || []).map((item) => [item.id, item])),
)
const dateText = (value) => (value ? String(value).slice(0, 10) : '日期待核')
const numberText = (value) => {
  if (value > 0 && value < 0.000001) return '<0.000001'
  if (value < 0 && value > -0.000001) return '>-0.000001'
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 6 }).format(value)
}
const countryText = (values) => values.map((value) => countries[value] || value).join(' / ')
const excerptFor = (reference) =>
  sourceMap.value[reference.source_id]?.excerpts.find((item) => item.id === reference.excerpt_id)

async function loadBrief(id) {
  if (!id) return
  const version = ++loadVersion
  loading.value = true
  error.value = ''
  try {
    const payload = await decisionApi.brief(id)
    if (version !== loadVersion || disposed) return
    brief.value = payload
    selectedChange.value = observedChanges.value.at(-1)?.id || ''
    importedProject.value = null
    calculated.value = null
    question.value = payload.question
    selectedNews.value = []
    searchResults.value = []
    job.value = null
    clearTimeout(pollTimer)
    loadMonitoring(id)
  } catch (cause) {
    if (version === loadVersion) {
      brief.value = null
      error.value = cause.message
    }
  } finally {
    if (version === loadVersion) loading.value = false
  }
}

async function loadCatalog() {
  loading.value = true
  try {
    const payload = await decisionApi.list()
    briefs.value = payload.briefs
    maxArticles.value = payload.max_articles_per_analysis
    const selected =
      typeof route.query.brief === 'string' ? route.query.brief : payload.briefs[0]?.id
    if (selected) await loadBrief(selected)
    else loading.value = false
  } catch (cause) {
    error.value = cause.message
    loading.value = false
  }
}

function selectBrief(id) {
  if (brief.value?.id === id) return
  router.push({ query: { brief: id } })
}

async function selectTab(id) {
  await router.replace({ query: { brief: brief.value.id, tab: id } })
}

async function revealClaims(ids) {
  highlightedClaims.value = ids
  await selectTab('evidence')
  await nextTick()
  document
    .getElementById(`claim-${ids[0]}`)
    ?.scrollIntoView({ block: 'center', behavior: 'smooth' })
}

async function importResearch() {
  if (!getToken()) { window.dispatchEvent(new CustomEvent('showLoginModal')); return }
  importing.value = true
  notice.value = ''
  try {
    importedProject.value = await decisionApi.importResearch(brief.value.id)
  } catch (cause) {
    notice.value = cause.message
  } finally {
    importing.value = false
  }
}

const supply = reactive({
  inventory_tonnes: '',
  daily_use_tonnes: '',
  replacement_lead_days: '',
  safety_days: '',
})
const cbam = reactive({
  calendar_year: 2026,
  year_to_date_tonnes: '',
  remaining_planned_tonnes: '',
  goods: 'mass_sectors',
  annex_i_scope_confirmed: null,
  exempt_origin_or_procedure: null,
  same_importer_annual_aggregation_confirmed: false,
})
const calculated = ref(null)
const calculating = ref(false)
const calculationError = ref('')
async function calculate() {
  calculating.value = true
  calculationError.value = ''
  try {
    const kind = brief.value.calculator === 'supply_buffer' ? 'supply-buffer' : 'cbam-threshold'
    calculated.value = await decisionApi.calculate(
      kind,
      kind === 'supply-buffer' ? { ...supply } : { ...cbam },
    )
  } catch (cause) {
    calculationError.value = cause.message
    calculated.value = null
  } finally {
    calculating.value = false
  }
}
watch([supply, cbam], () => {
  calculated.value = null
})

const question = ref('')
const newsQuery = ref('')
const searching = ref(false)
const searchResults = ref([])
const searchPerformed = ref(false)
const selectedNews = ref([])
const analysisError = ref('')
const job = ref(null)
const submitting = ref(false)
const jobs = ref([])
const jobBusy = computed(() => ['queued', 'running'].includes(job.value?.status))
async function searchNews() {
  searching.value = true
  analysisError.value = ''
  try {
    const result = await decisionApi.search(newsQuery.value)
    searchResults.value = result.data
    searchPerformed.value = true
  } catch (cause) {
    analysisError.value = cause.message
  } finally {
    searching.value = false
  }
}
function toggleNews(item) {
  const index = selectedNews.value.findIndex((value) => value.id === item.id)
  if (index >= 0) selectedNews.value.splice(index, 1)
  else if (selectedNews.value.length < maxArticles.value) selectedNews.value.push(item)
}
async function pollJob(id) {
  clearTimeout(pollTimer)
  try {
    const result = await decisionApi.job(id)
    if (disposed || job.value?.id !== id) return
    job.value = result
    if (['queued', 'running'].includes(result.status))
      pollTimer = setTimeout(() => pollJob(id), 1800)
  } catch (cause) {
    analysisError.value = cause.message
  }
}
async function startAnalysis() {
  if (!getToken()) { window.dispatchEvent(new CustomEvent('showLoginModal')); return }
  submitting.value = true
  analysisError.value = ''
  try {
    job.value = await decisionApi.analyze({
      question: question.value,
      article_ids: selectedNews.value.map((item) => item.id),
    })
    await pollJob(job.value.id)
  } catch (cause) {
    analysisError.value = cause.message
  } finally {
    submitting.value = false
  }
}
async function loadJobs() {
  if (!getToken()) return
  try {
    jobs.value = (await decisionApi.jobs()).jobs
  } catch (cause) {
    analysisError.value = cause.message
  }
}
async function openJob(item) {
  job.value = item
  await pollJob(item.id)
}
const reviewLabel = (code) => {
  if (code.includes('DATE')) return '事件日期待核'
  if (code.includes('CONTEXT') || code.includes('WINDOW') || code.includes('COVERAGE'))
    return '部分原文未完成分析'
  if (code.includes('FIELD') || code.includes('CITED') || code.includes('SUPPORT'))
    return '字段与原文引用未匹配'
  if (code.includes('NEGAT') || code.includes('MODAL') || code.includes('CONDITION'))
    return '否定或条件状态待核'
  if (code.includes('QUALITY') || code.includes('BODY') || code.includes('BOILERPLATE'))
    return '正文质量待核'
  return '抽取结果待复核'
}
const reviewLabels = (values) => [...new Set(values.map(reviewLabel))].join('；')

const monitoring = ref(null)
const monitoringBusy = ref(false)
const monitoringError = ref('')
const monitoredTopic = computed(() => monitoring.value?.topics.find((item) => item.topic_id === brief.value?.id))
const monitoringStates = {
  pending_analysis: '待分析', cached: '已处理，待核查', cached_needs_review: '处理结果待核',
  needs_review: '原文质量待核', source_missing: '原文不可用',
}
async function loadMonitoring(id, refresh = false) {
  if (refresh && !getToken()) { window.dispatchEvent(new CustomEvent('showLoginModal')); return }
  const version = loadVersion
  monitoringBusy.value = true
  monitoringError.value = ''
  if (!refresh) monitoring.value = null
  try {
    const result = await (refresh ? decisionApi.refreshMonitoring(id) : decisionApi.monitoring(id))
    if (disposed || version !== loadVersion) return
    monitoring.value = result
  } catch (cause) {
    if (version === loadVersion) monitoringError.value = cause.message
  } finally {
    if (version === loadVersion) monitoringBusy.value = false
  }
}
async function selectMonitored(item) {
  if (!selectedNews.value.some((value) => value.id === item.news_id) && selectedNews.value.length < maxArticles.value) {
    selectedNews.value.push({ id: item.news_id, title: item.title, published_at: item.published_at })
  }
  await selectTab('analysis')
}

watch(
  () => route.query.brief,
  (id) => {
    if (typeof id === 'string' && id !== brief.value?.id) loadBrief(id)
  },
)
watch(activeTab, (id) => {
  if (id === 'analysis') loadJobs()
})
onMounted(loadCatalog)
onBeforeUnmount(() => {
  disposed = true
  loadVersion += 1
  clearTimeout(pollTimer)
})
</script>

<template>
  <div class="decision-desk">
    <nav class="desk-nav" aria-label="研究导航">
      <RouterLink to="/data-service/ground-news-desk">新闻档案</RouterLink>
      <ChevronRight :size="14" />
      <strong>决策研究台</strong>
      <RouterLink class="nav-end" to="/data-service/story-graph"
        >旧版事件图谱 <ArrowUpRight :size="14"
      /></RouterLink>
    </nav>
    <header class="desk-heading">
      <div>
        <span class="product-label">GlobeMind</span>
        <h1>决策研究台</h1>
      </div>
      <span class="draft-label"><FileText :size="14" /> 研究草稿</span>
    </header>
    <div class="decision-layout">
      <aside class="topic-rail" aria-label="研究专题">
        <label class="mobile-topic-select">研究专题
          <select :value="brief?.id || ''" @change="selectBrief($event.target.value)">
            <option v-for="item in briefs" :key="item.id" :value="item.id">{{ countryText(item.countries) }} · {{ item.tags.slice(0, 2).join(' / ') }}</option>
          </select>
        </label>
        <div class="rail-heading">
          <h2>研究专题</h2>
          <span>{{ briefs.length }}</span>
        </div>
        <label class="topic-search"
          ><Search :size="16" /><input
            v-model="topicFilter"
            type="search"
            aria-label="筛选研究专题"
            placeholder="国家、产业、政策"
        /></label>
        <button
          v-for="item in filteredBriefs"
          :key="item.id"
          class="topic-row"
          :class="{ selected: brief?.id === item.id }"
          :aria-pressed="brief?.id === item.id"
          @click="selectBrief(item.id)"
        >
          <span class="topic-country"
            >{{ countryText(item.countries) }} <span>{{ item.change_count }} 项变化</span></span
          >
          <strong>{{ item.title }}</strong>
          <span class="topic-cutoff">资料 {{ item.evidence_cutoff }}</span>
        </button>
        <p v-if="!filteredBriefs.length && !loading" class="empty">没有匹配的专题。</p>
        <RouterLink class="rail-link" to="/research-workspace"
          ><BookOpen :size="16" /> 我的研究项目 <ArrowUpRight :size="14"
        /></RouterLink>
      </aside>

      <main class="brief-main" :aria-busy="loading">
        <div v-if="loading" class="page-state" role="status">
          <LoaderCircle class="spinning" :size="22" /> 正在读取专题
        </div>
        <div v-else-if="error" class="page-state">
          <p role="alert">{{ error }}</p>
          <button class="command" @click="loadCatalog">重试</button>
        </div>
        <div v-else-if="!brief" class="page-state">暂无已整理的研究专题。</div>
        <template v-else>
          <header class="brief-heading">
            <div class="brief-meta">
              <span>{{ countryText(brief.countries) }}</span
              ><span>资料截至 {{ brief.evidence_cutoff }}</span
              ><span>核查 {{ dateText(brief.updated_at) }}</span
              ><span>{{ brief.source_count }} 份来源</span>
            </div>
            <h2>{{ brief.title }}</h2>
            <p class="research-question">{{ brief.question }}</p>
            <div class="brief-actions">
              <a class="command" :href="`/api/decision-intelligence/briefs/${brief.id}/export`"
                ><Download :size="16" /> 导出底稿</a
              >
              <button class="command" :disabled="importing" @click="importResearch">
                <LoaderCircle v-if="importing" class="spinning" :size="16" /><FolderPlus
                  v-else
                  :size="16"
                />
                纳入研究项目
              </button>
              <RouterLink
                v-if="importedProject"
                class="inline-link"
                :to="{
                  path: '/research-workspace',
                  query: { project: importedProject.project_id },
                }"
                ><Check :size="15" /> 打开已创建项目</RouterLink
              >
            </div>
            <p v-if="notice" class="form-note" role="status">{{ notice }}</p>
          </header>

          <section class="current-assessment" aria-label="当前判断">
            <div class="section-label">
              <ShieldCheck :size="17" /> 当前判断 <span>基于下列证据与限定</span>
            </div>
            <p class="takeaway">{{ brief.takeaway }}</p>
            <p>{{ brief.current_state }}</p>
          </section>

          <div class="brief-tabs" role="tablist" aria-label="研究视图">
            <button
              v-for="tab in tabs"
              :id="`tab-${tab.id}`"
              :key="tab.id"
              role="tab"
              :aria-selected="activeTab === tab.id"
              :aria-controls="`panel-${tab.id}`"
              :class="{ active: activeTab === tab.id }"
              @click="selectTab(tab.id)"
            >
              {{ tab.label }}<span v-if="tab.id === 'evidence'">{{ brief.claims.length }}</span>
            </button>
          </div>

          <section
            v-if="activeTab === 'timeline'"
            id="panel-timeline"
            class="timeline-layout"
            role="tabpanel"
            aria-labelledby="tab-timeline"
          >
            <div class="timeline-column">
              <div class="section-toolbar">
                <h3>事件发展</h3>
                <button
                  class="icon-command"
                  :title="latestFirst ? '改为从早到晚' : '改为最新在前'"
                  :aria-label="latestFirst ? '改为从早到晚' : '改为最新在前'"
                  @click="latestFirst = !latestFirst"
                >
                  <ArrowDown v-if="latestFirst" :size="17" /><ArrowUp v-else :size="17" />
                </button>
              </div>
              <ol class="timeline-list">
                <li
                  v-for="item in timeline"
                  :key="item.id"
                  :class="{ selected: selectedChange === item.id }"
                >
                  <button
                    class="change-button"
                    :aria-pressed="selectedChange === item.id"
                    @click="selectedChange = item.id"
                  >
                    <span class="change-meta"
                      ><time>{{ dateText(item.occurred_on) }}</time
                      ><span class="state-label" :class="`state-${item.state}`">{{
                        stateNames[item.state]
                      }}</span></span
                    >
                    <strong>{{ item.title }}</strong
                    ><span>{{ item.change }}</span>
                    <span v-if="item.supersedes.length" class="replacement-note"
                      >替代或接续较早规则</span
                    >
                  </button>
                </li>
              </ol>
              <template v-if="futureChanges.length">
                <h3 class="section-title">未来节点</h3>
                <ol class="timeline-list future-timeline">
                  <li v-for="item in futureChanges" :key="item.id" :class="{ selected: selectedChange === item.id }">
                    <button class="change-button" :aria-pressed="selectedChange === item.id" @click="selectedChange = item.id">
                      <span class="change-meta"><time>{{ item.occurred_on }}</time><span class="state-label">{{ item.state === 'proposed' ? '提案，未定' : '未来安排' }}</span></span>
                      <strong>{{ item.title }}</strong><span>{{ item.change }}</span>
                    </button>
                  </li>
                </ol>
              </template>
            </div>
            <div v-if="change" class="change-detail">
              <div class="section-label">这一步改变了什么</div>
              <h3>{{ change.title }}</h3>
              <p class="significance">{{ change.significance }}</p>
              <p class="date-basis"><Clock3 :size="14" /> {{ change.date_basis }}</p>
              <h4>依据</h4>
              <div v-for="claim in changeClaims" :key="claim.id" class="compact-claim">
                <p>{{ claim.statement }}</p>
                <p v-if="claim.qualification" class="qualification">{{ claim.qualification }}</p>
                <a
                  v-for="reference in claim.evidence"
                  :key="`${reference.source_id}-${reference.excerpt_id}`"
                  class="source-link"
                  :href="sourceMap[reference.source_id].url"
                  target="_blank"
                  rel="noopener noreferrer"
                  ><FileText :size="14" /> {{ sourceMap[reference.source_id].title }}
                  <ArrowUpRight :size="13"
                /></a>
              </div>
              <button class="text-command" @click="revealClaims(change.claim_ids)">
                核对原文与条款 <ChevronRight :size="15" />
              </button>
            </div>
          </section>

          <section
            v-if="activeTab === 'judgments'"
            id="panel-judgments"
            role="tabpanel"
            aria-labelledby="tab-judgments"
            class="content-section"
          >
            <p class="scope-line">{{ brief.decision_scope }}</p>
            <article v-for="item in brief.judgments" :key="item.id" class="judgment-row">
              <span class="section-label">分析判断</span>
              <h3>{{ item.statement }}</h3>
              <p>{{ item.reasoning }}</p>
              <dl class="judgment-details">
                <div>
                  <dt>成立前提</dt>
                  <dd>{{ item.assumptions.join('；') || '见适用范围' }}</dd>
                </div>
                <div>
                  <dt>改变判断的信号</dt>
                  <dd>{{ item.would_change_if.join('；') }}</dd>
                </div>
                <div>
                  <dt>不确定性</dt>
                  <dd>{{ item.uncertainty }}</dd>
                </div>
              </dl>
              <div class="evidence-actions">
                <button class="text-command" @click="revealClaims(item.supporting_claim_ids)">
                  支持依据 {{ item.supporting_claim_ids.length }}
                  <ChevronRight :size="14" /></button
                ><button
                  v-if="item.opposing_claim_ids.length"
                  class="text-command"
                  @click="revealClaims(item.opposing_claim_ids)"
                >
                  相反证据 {{ item.opposing_claim_ids.length }} <ChevronRight :size="14" /></button
                ><span v-else class="muted">未列出相反证据，不代表不存在</span>
              </div>
            </article>
            <h3 class="section-title">行动选项</h3>
            <article v-for="item in brief.options" :key="item.id" class="option-row">
              <div class="option-title">
                <span>{{ audienceNames[item.audience] }}</span>
                <h4>{{ item.title }}</h4>
              </div>
              <dl>
                <div>
                  <dt>适用条件</dt>
                  <dd>{{ item.when }}</dd>
                </div>
                <div>
                  <dt>具体行动</dt>
                  <dd>{{ item.action }}</dd>
                </div>
                <div>
                  <dt>代价与取舍</dt>
                  <dd>{{ item.tradeoff }}</dd>
                </div>
                <div>
                  <dt>避免误判</dt>
                  <dd>{{ item.avoid }}</dd>
                </div>
              </dl>
            </article>
          </section>

          <section
            v-if="activeTab === 'evidence'"
            id="panel-evidence"
            role="tabpanel"
            aria-labelledby="tab-evidence"
            class="content-section"
          >
            <div class="section-toolbar">
              <h3>事实与来源</h3>
              <span class="muted"
                >{{ brief.source_count }} 份资料 /
                {{ brief.source_organization_count }} 个署名机构</span
              >
            </div>
            <article
              v-for="claim in brief.claims"
              :id="`claim-${claim.id}`"
              :key="claim.id"
              class="evidence-row"
              :class="{ highlighted: highlightedClaims.includes(claim.id) }"
            >
              <div class="claim-heading">
                <span>{{ claim.id }}</span>
                <h4>{{ claim.statement }}</h4>
              </div>
              <p v-if="claim.qualification" class="qualification">{{ claim.qualification }}</p>
              <details
                v-for="reference in claim.evidence"
                :key="`${reference.source_id}-${reference.excerpt_id}`"
                class="source-excerpt"
              >
                <summary>
                  <FileText :size="15" /><span>{{ sourceMap[reference.source_id].title }}</span
                  ><ChevronRight class="details-arrow" :size="14" />
                </summary>
                <div class="excerpt-content">
                  <p class="muted">
                    {{ sourceMap[reference.source_id].publisher }} ·
                    {{ dateText(sourceMap[reference.source_id].published_on) }}
                  </p>
                  <p class="locator">{{ excerptFor(reference)?.locator }}</p>
                  <blockquote v-if="excerptFor(reference)?.kind !== 'paraphrase'">
                    {{ excerptFor(reference)?.text }}
                  </blockquote>
                  <p v-else>中文释义：{{ excerptFor(reference)?.text }}</p>
                  <p v-if="sourceMap[reference.source_id].limitations" class="qualification">
                    {{ sourceMap[reference.source_id].limitations }}
                  </p>
                  <a
                    class="inline-link"
                    :href="sourceMap[reference.source_id].url"
                    target="_blank"
                    rel="noopener noreferrer"
                    >打开官方原文 <ArrowUpRight :size="14"
                  /></a>
                </div>
              </details>
            </article>
            <details class="coverage-details">
              <summary>资料范围与核查方法</summary>
              <p>{{ brief.coverage_note }}</p>
              <p>{{ brief.method_note }}</p>
            </details>
          </section>

          <section
            v-if="activeTab === 'monitor'"
            id="panel-monitor"
            role="tabpanel"
            aria-labelledby="tab-monitor"
            class="content-section"
          >
            <div class="monitoring-section">
              <div class="section-toolbar">
                <h3>关注资料的更新</h3>
                <button class="command" :disabled="monitoringBusy" @click="loadMonitoring(brief.id, true)"><RefreshCw :size="15" :class="{ spinning: monitoringBusy }" />检查下一批</button>
              </div>
              <p v-if="monitoringError" class="form-error" role="alert">{{ monitoringError }}</p>
              <p v-if="monitoring" class="muted">检查 {{ dateText(monitoring.last_refresh_at) }} · 关注 {{ monitoredTopic?.monitored_count || 0 }} 篇 · 待分析 {{ monitoredTopic?.pending_analysis_count || 0 }} 篇</p>
              <p v-if="monitoring?.remaining_unknown" class="qualification">还有尚未检查的资料，当前列表不代表全部最新变化。</p>
              <article v-for="item in monitoredTopic?.articles || []" :key="item.news_id" class="monitored-row">
                <div><RouterLink :to="`/data-service/news/${item.news_id}`" target="_blank">{{ item.title }}</RouterLink><p class="muted">报道 {{ dateText(item.published_at) }} · {{ monitoringStates[item.analysis_state] }}</p></div>
                <button class="text-command" :disabled="item.analysis_state === 'source_missing' || selectedNews.length >= maxArticles" @click="selectMonitored(item)">选入分析 <ChevronRight :size="14" /></button>
              </article>
              <p v-if="monitoring && !monitoredTopic?.articles.length" class="empty">本批没有匹配的关注资料。</p>
            </div>
            <div class="section-toolbar">
              <h3>下一步观察什么</h3>
              <span class="muted">{{ brief.gaps.length }} 项待核</span>
            </div>
            <article v-for="item in brief.indicators" :key="item.id" class="indicator-row">
              <h4>{{ item.name }}</h4>
              <p>
                {{ item.observation }}
                <span v-if="item.observed_on" class="muted">（{{ item.observed_on }}）</span>
              </p>
              <dl>
                <div>
                  <dt>触发条件</dt>
                  <dd>{{ item.trigger }}</dd>
                </div>
                <div>
                  <dt>对应行动</dt>
                  <dd>{{ item.response }}</dd>
                </div>
                <div>
                  <dt>下次检查</dt>
                  <dd>{{ item.next_check }}</dd>
                </div>
              </dl>
              <button
                v-if="item.claim_ids.length"
                class="text-command"
                @click="revealClaims(item.claim_ids)"
              >
                查看依据 <ChevronRight :size="14" />
              </button>
            </article>
            <section v-if="brief.calculator" class="calculator-section">
              <div class="section-label">
                <Calculator :size="18" />
                {{
                  brief.calculator === 'supply_buffer' ? '采购缓冲测算' : '2026年CBAM质量门槛筛查'
                }}
              </div>
              <form @submit.prevent="calculate">
                <div v-if="brief.calculator === 'supply_buffer'" class="numeric-fields">
                  <label
                    >可用库存（吨）<input
                      v-model="supply.inventory_tonnes"
                      type="number"
                      min="0"
                      max="1000000000"
                      step="0.001"
                      required /></label
                  ><label
                    >日均消耗（吨）<input
                      v-model="supply.daily_use_tonnes"
                      type="number"
                      min="0.001"
                      max="100000000"
                      step="0.001"
                      required /></label
                  ><label
                    >替代采购周期（天）<input
                      v-model="supply.replacement_lead_days"
                      type="number"
                      min="0"
                      max="730"
                      step="0.01"
                      required /></label
                  ><label
                    >安全缓冲（天）<input
                      v-model="supply.safety_days"
                      type="number"
                      min="0"
                      max="365"
                      step="0.01"
                      required
                  /></label>
                </div>
                <template v-else>
                  <div class="numeric-fields">
                    <label
                      >2026年已进口净质量（吨）<input
                        v-model="cbam.year_to_date_tonnes"
                        type="number"
                        min="0"
                        max="1000000000"
                        step="0.000001"
                        required
                    /></label>
                    <label
                      >年内剩余计划（吨）<input
                        v-model="cbam.remaining_planned_tonnes"
                        type="number"
                        min="0"
                        max="1000000000"
                        step="0.000001"
                        required
                    /></label>
                  </div>
                  <div class="scope-fields">
                    <label
                      >货物类别<select v-model="cbam.goods">
                        <option value="mass_sectors">钢铁、铝、化肥、水泥合计</option>
                        <option value="electricity">电力</option>
                        <option value="hydrogen">氢</option>
                      </select></label
                    >
                    <label
                      >商品属于现行附件I<select v-model="cbam.annex_i_scope_confirmed">
                        <option :value="null">尚未核对</option>
                        <option :value="true">已确认属于</option>
                        <option :value="false">已确认不属于</option>
                      </select></label
                    >
                    <label
                      >存在原产地或海关程序例外<select v-model="cbam.exempt_origin_or_procedure">
                        <option :value="null">尚未核对</option>
                        <option :value="false">已确认无适用例外</option>
                        <option :value="true">已确认适用例外</option>
                      </select></label
                    >
                  </div>
                  <label class="checkbox-label"
                    ><input
                      v-model="cbam.same_importer_annual_aggregation_confirmed"
                      type="checkbox"
                    />
                    已按同一欧盟进口商全年相关货物合并，未按供应商或单票拆分</label
                  >
                </template>
                <button class="command primary" :disabled="calculating">
                  <Calculator :size="16" /> {{ calculating ? '计算中' : '计算' }}
                </button>
              </form>
              <p v-if="calculationError" role="alert" class="form-error">{{ calculationError }}</p>
              <div v-if="calculated" class="calculation-result" role="status">
                <p class="result-conclusion">{{ calculated.conclusion }}</p>
                <div v-if="calculated.calculator === 'supply_buffer'" class="result-metrics">
                  <div>
                    <span>库存覆盖</span
                    ><strong>{{ numberText(calculated.coverage_days) }} <small>天</small></strong>
                  </div>
                  <div>
                    <span>目标覆盖</span
                    ><strong>{{ numberText(calculated.target_days) }} <small>天</small></strong>
                  </div>
                  <div>
                    <span>缓冲缺口</span
                    ><strong
                      >{{ numberText(calculated.buffer_gap_tonnes) }} <small>吨</small></strong
                    >
                  </div>
                </div>
                <div
                  v-else-if="calculated.mass_threshold_applicable === true"
                  class="result-metrics"
                >
                  <div>
                    <span>预计全年</span
                    ><strong
                      >{{ numberText(calculated.expected_annual_tonnes) }} <small>吨</small></strong
                    >
                  </div>
                  <div>
                    <span>质量门槛</span><strong>50 <small>吨</small></strong>
                  </div>
                </div>
                <ul v-if="calculated.actions">
                  <li v-for="item in calculated.actions" :key="item">{{ item }}</li>
                </ul>
                <p v-for="item in calculated.assumptions" :key="item" class="qualification">
                  {{ item }}
                </p>
              </div>
            </section>
            <h3 class="section-title">仍缺少的证据</h3>
            <article v-for="item in brief.gaps" :key="item.id" class="gap-row">
              <h4>{{ item.question }}</h4>
              <p>{{ item.why_it_matters }}</p>
              <p class="next-action">下一步：{{ item.next_action }}</p>
            </article>
          </section>

          <section
            v-if="activeTab === 'analysis'"
            id="panel-analysis"
            role="tabpanel"
            aria-labelledby="tab-analysis"
            class="content-section"
          >
            <form class="analysis-form" @submit.prevent="startAnalysis">
              <label
                >研究问题<textarea
                  v-model="question"
                  maxlength="500"
                  minlength="4"
                  rows="3"
                  required
                />
              </label>
              <div class="section-toolbar">
                <h3>选择原文</h3>
                <span class="muted">{{ selectedNews.length }} / {{ maxArticles }}</span>
              </div>
              <div class="news-search">
                <input
                  v-model.trim="newsQuery"
                  type="search"
                  placeholder="检索新闻原文"
                  aria-label="检索新闻原文"
                  @keydown.enter.prevent="searchNews"
                /><button
                  type="button"
                  class="command"
                  :disabled="searching || !newsQuery"
                  @click="searchNews"
                >
                  <Search :size="16" /> {{ searching ? '检索中' : '搜索' }}
                </button>
              </div>
              <div v-if="selectedNews.length" class="selected-news">
                <span v-for="item in selectedNews" :key="item.id"
                  ><Check :size="13" /> {{ item.title
                  }}<button
                    type="button"
                    :aria-label="`移除${item.title}`"
                    @click="toggleNews(item)"
                  >
                    ×
                  </button></span
                >
              </div>
              <div class="news-results">
                <label v-for="item in searchResults" :key="item.id" class="news-result"
                  ><input
                    type="checkbox"
                    :checked="selectedNews.some((value) => value.id === item.id)"
                    :disabled="
                      !selectedNews.some((value) => value.id === item.id) &&
                      selectedNews.length >= maxArticles
                    "
                    @change="toggleNews(item)" /><span
                    ><strong>{{ item.title }}</strong
                    ><small
                      >{{ item.source }} · {{ dateText(item.time_semantics?.published_at) }}</small
                    ></span
                  ><RouterLink :to="`/data-service/news/${item.id}`" target="_blank" @click.stop
                    ><ArrowUpRight :size="16" /></RouterLink
                ></label>
              </div>
              <p v-if="searchPerformed && !searchResults.length" class="empty">未找到匹配原文。</p>
              <button
                class="command primary"
                :disabled="submitting || jobBusy || !selectedNews.length"
              >
                <LoaderCircle v-if="jobBusy || submitting" class="spinning" :size="16" /><ListFilter
                  v-else
                  :size="16"
                />
                {{ jobBusy ? '分析进行中' : '分析所选原文' }}
              </button>
            </form>
            <p v-if="analysisError" role="alert" class="form-error">{{ analysisError }}</p>
            <div v-if="job" class="analysis-result">
              <div class="section-toolbar">
                <h3>待核事件</h3>
                <span class="muted"
                  >{{ job.completed_articles }} / {{ job.article_ids.length }} 篇 ·
                  {{
                    {
                      queued: '排队中',
                      running: '处理中',
                      completed: '分析完成',
                      failed: '未完成',
                      interrupted: '已中断',
                    }[job.status]
                  }}</span
                >
              </div>
              <p v-if="job.status === 'failed' || job.status === 'interrupted'" class="form-error">
                任务未完整完成，已完成部分保留。可以重新选择原文提交。
              </p>
              <div v-if="job.result?.metrics" class="analysis-metrics">
                <span>本次耗时 {{ job.result.metrics.wall_seconds }} 秒</span
                ><span>复用 {{ job.result.metrics.cache_hits }} 篇</span
                ><span>完整处理 {{ job.result.metrics.complete_articles }} 篇</span
                ><span>待复核 {{ job.result.metrics.needs_review_articles }} 篇</span>
              </div>
              <article
                v-for="source in job.result?.sources || []"
                :key="source.source.id"
                class="extracted-source"
              >
                <h4>{{ source.source.title }}</h4>
                <p class="muted">
                  报道 {{ dateText(source.source.published_at) }} · 已处理
                  {{ source.coverage.processed_sentence_ids.length }} /
                  {{ source.coverage.total_sentences }} 句
                  <span v-if="source.cache_hit">· 已复用</span>
                </p>
                <p v-if="source.review_reasons.length" class="qualification">
                  {{ reviewLabels(source.review_reasons) }}
                </p>
                <p v-if="!source.events.length" class="muted">
                  尚无可展示的事件候选，请回到原文核对。
                </p>
                <div v-for="event in source.events" :key="event.event_id" class="extracted-event">
                  <div class="change-meta">
                    <span class="state-label">{{ event.review_reasons?.length ? '状态或归因待核' : stateNames[event.status] }}</span
                    ><span>{{ event.event_date || (event.date_text ? `${event.date_text}（完整日期待核）` : '事件日期待核') }}</span>
                  </div>
                  <p>
                    <strong>{{ event.actor }}</strong> {{ event.action }}
                    <span>{{ event.target }}</span>
                  </p>
                  <p v-for="(condition, index) in event.conditions || []" :key="index" class="qualification">条件：{{ condition.text }}</p>
                  <p v-if="event.reported_by" class="muted">报道归因：{{ event.reported_by }}</p>
                  <p v-if="event.review_reasons?.length" class="qualification">{{ reviewLabels(event.review_reasons) }}</p>
                  <details>
                    <summary>原文依据</summary>
                    <blockquote v-for="evidence in event.evidence" :key="evidence.sentence_id">
                      {{ evidence.quote }}
                    </blockquote>
                  </details>
                </div>
                <details v-if="source.unassigned_conditions?.length" class="coverage-details">
                  <summary>尚未确定归属的条件与限定</summary>
                  <blockquote v-for="(condition, index) in source.unassigned_conditions" :key="index">{{ condition.text }}</blockquote>
                </details>
                <details v-if="source.review_candidates?.length" class="coverage-details">
                  <summary>仍待解析的原文</summary>
                  <div v-for="(candidate, index) in source.review_candidates" :key="index">
                    <p class="qualification">{{ reviewLabels(candidate.rejection_reasons) }}</p>
                    <blockquote v-for="evidence in candidate.evidence" :key="evidence.sentence_id">{{ evidence.quote }}</blockquote>
                  </div>
                </details>
                <RouterLink
                  class="inline-link"
                  :to="`/data-service/news/${source.source.id}`"
                  target="_blank"
                  >核查完整原文 <ArrowUpRight :size="14"
                /></RouterLink>
              </article>
            </div>
            <details v-if="jobs.length" class="coverage-details">
              <summary>最近分析任务</summary>
              <button
                v-for="item in jobs"
                :key="item.id"
                class="history-row"
                @click="openJob(item)"
              >
                {{ item.question }}<span>{{ dateText(item.created_at) }}</span>
              </button>
            </details>
          </section>
        </template>
      </main>
    </div>
  </div>
</template>

<style scoped>
.decision-desk {
  --ink: #25343b;
  --muted: #647178;
  --line: #dce2e4;
  --accent: #0b7168;
  color: var(--ink);
  background: #fff;
  padding-top: 64px;
  min-height: calc(100vh - 64px);
  font-size: 14px;
  line-height: 1.7;
  letter-spacing: 0;
}
.decision-desk * {
  box-sizing: border-box;
  letter-spacing: 0;
}
.monitoring-section { padding-bottom: 24px; margin-bottom: 24px; border-bottom: 1px solid var(--line); }
.monitored-row { display: flex; gap: 16px; align-items: center; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid var(--line); }
.monitored-row > div { min-width: 0; }
.monitored-row a { color: var(--ink); overflow-wrap: anywhere; text-decoration: none; }
.monitored-row button { flex-shrink: 0; }
.future-timeline { opacity: 0.9; }
.decision-desk button,
.decision-desk input,
.decision-desk select,
.decision-desk textarea {
  font: inherit;
}
.decision-desk button,
.decision-desk a {
  -webkit-tap-highlight-color: transparent;
}
.decision-desk button {
  cursor: pointer;
}
.decision-desk button:disabled {
  opacity: 0.5;
  cursor: default;
}
.decision-desk button:focus-visible,
.decision-desk a:focus-visible,
.decision-desk summary:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}
.desk-nav {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 12px 28px;
  border-bottom: 1px solid var(--line);
  font-size: 12px;
}
.desk-nav a {
  color: var(--muted);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.desk-nav .nav-end {
  margin-left: auto;
}
.desk-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 20px 28px;
  border-bottom: 1px solid var(--line);
}
.desk-heading > div {
  display: flex;
  align-items: center;
  gap: 18px;
}
.product-label {
  color: var(--accent);
  font-weight: 700;
  font-size: 15px;
}
h1,
h2,
h3,
h4,
p {
  margin: 0;
}
.desk-heading h1 {
  font-size: 22px;
  font-weight: 650;
}
.draft-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #82551e;
  white-space: nowrap;
}
.decision-layout {
  display: grid;
  grid-template-columns: 270px minmax(0, 1fr);
  max-width: 1680px;
  margin: auto;
}
.topic-rail {
  border-right: 1px solid var(--line);
  padding: 22px 18px;
  background: #f8faf9;
}
.mobile-topic-select { display: none; }
.rail-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 0 14px;
}
.rail-heading h2 {
  font-size: 14px;
}
.rail-heading > span {
  color: var(--muted);
  font-size: 12px;
}
.topic-search {
  display: flex;
  gap: 8px;
  align-items: center;
  border: 1px solid #ccd5d7;
  background: white;
  padding: 7px 9px;
  border-radius: 4px;
  margin-bottom: 18px;
}
.topic-search input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  font-size: 12px;
}
.topic-row {
  display: block;
  text-align: left;
  width: 100%;
  border: 0;
  border-bottom: 1px solid var(--line);
  border-left: 3px solid transparent;
  background: transparent;
  padding: 14px 10px;
  color: inherit;
  border-radius: 0;
}
.topic-row.selected {
  border-left-color: var(--accent);
  background: #eaf3f0;
}
.topic-row:hover {
  background: #eef3f1;
}
.topic-row > strong {
  display: block;
  font-weight: 600;
  font-size: 14px;
  line-height: 1.7;
  margin: 7px 0;
  overflow-wrap: anywhere;
}
.topic-country {
  font-size: 12px;
  color: var(--accent);
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
.topic-country > span,
.topic-cutoff {
  color: var(--muted);
  font-size: 11px;
}
.rail-link {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: var(--ink);
  padding: 22px 9px;
  font-size: 12px;
}
.rail-link svg:last-child {
  margin-left: auto;
}
.brief-main {
  min-width: 0;
  padding: 26px 30px 48px;
}
.page-state {
  min-height: 300px;
  display: flex;
  gap: 14px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
}
.brief-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 10px;
}
.brief-meta > span:first-child {
  color: var(--accent);
  font-weight: 600;
}
.brief-heading h2 {
  font-size: 23px;
  line-height: 1.5;
  max-width: 1100px;
  overflow-wrap: anywhere;
}
.research-question {
  font-size: 14px;
  color: #465960;
  margin-top: 12px;
  max-width: 1050px;
}
.brief-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 9px;
  margin: 17px 0 20px;
}
.command {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 35px;
  border: 1px solid #cbd6d7;
  border-radius: 4px;
  color: var(--ink);
  background: white;
  text-decoration: none;
  padding: 6px 11px;
  font-size: 12px !important;
}
.command:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.command.primary {
  background: var(--accent);
  border-color: var(--accent);
  color: white;
}
.current-assessment {
  padding: 18px 0 21px;
  border-top: 2px solid var(--accent);
}
.section-label {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;
  color: var(--accent);
  font-size: 12px;
  font-weight: 650;
}
.section-label > span {
  color: var(--muted);
  font-weight: 400;
  margin-left: auto;
}
.takeaway {
  font-size: 17px;
  font-weight: 600;
  margin: 9px 0 10px;
  line-height: 1.8;
}
.current-assessment > p:last-child {
  color: #526369;
  font-size: 13px;
}
.brief-tabs {
  display: flex;
  gap: 22px;
  border-bottom: 1px solid var(--line);
  overflow-x: auto;
  min-height: 45px;
}
.brief-tabs button {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: 0;
  border-bottom: 2px solid transparent;
  padding: 10px 2px;
  color: var(--muted);
  font-size: 13px;
  white-space: nowrap;
}
.brief-tabs button.active {
  border-bottom-color: var(--accent);
  color: var(--accent);
  font-weight: 650;
}
.brief-tabs button > span {
  font-size: 11px;
}
.timeline-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 0.95fr);
  gap: 28px;
}
.timeline-column {
  padding-top: 20px;
}
.section-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 18px;
}
.section-toolbar h3,
.section-title {
  font-size: 16px;
  font-weight: 650;
}
.section-toolbar .muted {
  font-size: 12px;
}
.icon-command {
  width: 30px;
  height: 30px;
  display: inline-grid;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: #fff;
  color: var(--muted);
}
.timeline-list {
  list-style: none;
  margin: 0;
  padding: 0 0 0 11px;
}
.timeline-list > li {
  border-left: 1px solid #c8d5d3;
  padding: 0 0 13px 17px;
  position: relative;
}
.timeline-list > li::before {
  content: '';
  position: absolute;
  left: -4px;
  top: 17px;
  width: 7px;
  height: 7px;
  border: 1px solid #8da7a1;
  background: white;
  border-radius: 50%;
}
.timeline-list > li.selected::before {
  background: var(--accent);
  border-color: var(--accent);
}
.change-button {
  text-align: left;
  display: block;
  width: 100%;
  border: 0;
  background: transparent;
  color: inherit;
  border-radius: 4px;
  padding: 10px 12px 13px;
}
.selected .change-button {
  background: #edf5f2;
}
.change-button:hover {
  background: #f2f6f4;
}
.change-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  color: var(--muted);
  font-size: 11px;
}
.change-button > strong {
  display: block;
  font-size: 14px;
  line-height: 1.65;
  margin: 7px 0;
}
.change-button > span:not(.change-meta) {
  display: block;
  font-size: 12px;
  color: #56676c;
}
.state-label {
  display: inline-block;
  background: #eef0f2;
  color: #596972;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 11px;
}
.state-revised,
.state-disputed {
  color: #943547;
  background: #f9edf0;
}
.state-effective,
.state-implemented {
  color: #176856;
  background: #e7f2ed;
}
.state-proposed {
  color: #805d1e;
  background: #f6f1e7;
}
.change-button .replacement-note {
  color: #943547 !important;
  margin-top: 7px;
  font-size: 11px !important;
}
.change-detail {
  border-left: 1px solid var(--line);
  padding: 26px 0 30px 25px;
  min-width: 0;
}
.change-detail h3 {
  margin: 10px 0;
  font-size: 17px;
  line-height: 1.65;
}
.change-detail h4 {
  font-size: 13px;
  margin-top: 22px;
}
.significance {
  color: #374d54;
  line-height: 1.85;
}
.date-basis {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  color: var(--muted);
  font-size: 11px;
  margin-top: 14px;
}
.date-basis svg {
  flex-shrink: 0;
  margin-top: 3px;
}
.compact-claim {
  padding: 14px 0;
  border-bottom: 1px solid var(--line);
  font-size: 13px;
}
.qualification {
  color: #75603b;
  font-size: 12px;
  line-height: 1.75;
  margin-top: 7px;
}
.source-link {
  display: flex;
  align-items: flex-start;
  gap: 5px;
  margin-top: 8px;
  font-size: 11px;
  color: var(--accent);
  text-decoration: none;
  overflow-wrap: anywhere;
}
.source-link svg {
  flex-shrink: 0;
  margin-top: 3px;
}
.inline-link,
.text-command {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--accent);
  text-decoration: none;
  font-size: 12px;
}
.text-command {
  border: 0;
  background: transparent;
  padding: 9px 0;
}
.content-section {
  padding-top: 22px;
}
.scope-line {
  color: var(--muted);
  font-size: 12px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--line);
}
.judgment-row {
  padding: 22px 0;
  border-bottom: 1px solid var(--line);
}
.judgment-row h3 {
  font-size: 17px;
  line-height: 1.8;
  margin: 7px 0 12px;
}
.judgment-row > p {
  color: #526168;
}
dl {
  margin: 16px 0 0;
}
dl > div {
  display: grid;
  grid-template-columns: 106px minmax(0, 1fr);
  gap: 15px;
  margin-top: 10px;
}
dt {
  color: var(--muted);
  font-size: 12px;
}
dd {
  margin: 0;
  font-size: 13px;
  overflow-wrap: anywhere;
}
.evidence-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 15px;
  margin-top: 12px;
}
.evidence-actions .muted {
  font-size: 11px;
}
.section-title {
  margin: 26px 0 16px;
}
.option-row,
.indicator-row,
.gap-row {
  border-top: 1px solid var(--line);
  padding: 20px 0;
}
.option-title {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.option-title > span {
  font-size: 11px;
  color: var(--accent);
  background: #edf5f1;
  padding: 2px 6px;
  white-space: nowrap;
}
.option-title h4,
.indicator-row h4,
.gap-row h4 {
  font-size: 15px;
  line-height: 1.8;
}
.evidence-row {
  padding: 20px 0;
  border-top: 1px solid var(--line);
  scroll-margin-top: 100px;
}
.evidence-row.highlighted {
  background: #f2f8f4;
  box-shadow:
    -8px 0 0 #f2f8f4,
    8px 0 0 #f2f8f4;
}
.claim-heading {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.claim-heading > span {
  color: var(--muted);
  font-size: 11px;
  flex-shrink: 0;
  margin-top: 3px;
}
.claim-heading h4 {
  font-size: 14px;
  line-height: 1.85;
  font-weight: 600;
}
.source-excerpt {
  border-bottom: 1px solid #edf0f0;
  margin-top: 12px;
}
.source-excerpt summary {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  cursor: pointer;
  color: var(--accent);
  font-size: 12px;
  padding: 8px 0;
  list-style: none;
}
.source-excerpt summary::-webkit-details-marker {
  display: none;
}
.source-excerpt summary > svg {
  flex-shrink: 0;
  margin-top: 3px;
}
.source-excerpt summary > span {
  overflow-wrap: anywhere;
}
.details-arrow {
  margin-left: auto;
}
details[open] .details-arrow {
  transform: rotate(90deg);
}
.excerpt-content {
  padding: 8px 0 18px 22px;
}
.excerpt-content .muted {
  font-size: 11px;
}
.locator {
  color: var(--muted);
  font-size: 12px;
  margin-top: 8px;
}
blockquote {
  margin: 12px 0;
  border-left: 2px solid #adbbb7;
  padding: 7px 13px;
  background: #f6f8f7;
  color: #314a4e;
  font-size: 13px;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
.coverage-details {
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px solid var(--line);
  font-size: 12px;
  color: var(--muted);
}
.coverage-details summary {
  cursor: pointer;
}
.coverage-details p {
  margin-top: 12px;
}
.indicator-row > p,
.gap-row > p {
  margin-top: 9px;
  font-size: 13px;
}
.next-action {
  color: var(--accent);
}
.calculator-section {
  padding: 25px 0;
  margin-top: 14px;
  border-top: 2px solid var(--accent);
  border-bottom: 1px solid var(--line);
}
.numeric-fields,
.scope-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 20px;
  margin: 18px 0;
}
.scope-fields {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.numeric-fields label,
.scope-fields label,
.analysis-form > label {
  display: flex;
  flex-direction: column;
  gap: 7px;
  color: #506269;
  font-size: 12px;
}
.numeric-fields input,
.scope-fields select,
.analysis-form textarea,
.news-search input {
  min-height: 38px;
  min-width: 0;
  width: 100%;
  border: 1px solid #c6d2d3;
  border-radius: 4px;
  padding: 7px 10px;
  background: #fff;
  color: var(--ink);
  outline-color: var(--accent);
}
.checkbox-label {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 18px;
  font-size: 12px;
}
.checkbox-label input {
  margin-top: 5px;
  accent-color: var(--accent);
}
.calculation-result {
  border-left: 3px solid var(--accent);
  margin-top: 22px;
  padding: 0 0 0 18px;
}
.result-conclusion {
  font-weight: 600;
}
.result-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
  margin: 19px 0;
}
.result-metrics > div {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.result-metrics span {
  font-size: 12px;
  color: var(--muted);
}
.result-metrics strong {
  font-size: 24px;
  font-weight: 650;
  overflow-wrap: anywhere;
}
.result-metrics small {
  font-size: 12px;
  font-weight: 400;
}
.calculation-result ul {
  font-size: 13px;
  padding-left: 20px;
}
.form-error {
  color: #a73444;
  font-size: 13px;
  margin: 12px 0;
}
.form-note {
  color: #806021;
  font-size: 12px;
  margin: 10px 0;
}
.muted,
.empty {
  color: var(--muted);
}
.empty {
  padding: 16px 0;
  font-size: 12px;
}
.analysis-form textarea {
  resize: vertical;
  font-size: 14px;
}
.analysis-form .section-toolbar {
  margin: 22px 0 12px;
}
.news-search {
  display: flex;
  gap: 8px;
}
.news-search .command {
  flex-shrink: 0;
}
.news-results {
  margin: 12px 0 18px;
}
.news-result {
  display: flex;
  align-items: flex-start;
  gap: 11px;
  padding: 12px 0;
  border-bottom: 1px solid var(--line);
  cursor: pointer;
}
.news-result > input {
  margin-top: 7px;
  accent-color: var(--accent);
}
.news-result > span {
  min-width: 0;
  flex: 1;
}
.news-result strong {
  font-size: 13px;
  line-height: 1.7;
  font-weight: 500;
  display: block;
  overflow-wrap: anywhere;
}
.news-result small {
  color: var(--muted);
  font-size: 11px;
}
.news-result > a {
  color: var(--accent);
  padding: 3px;
}
.selected-news {
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
  margin-top: 12px;
}
.selected-news > span {
  display: flex;
  gap: 6px;
  align-items: center;
  font-size: 11px;
  background: #edf5f1;
  padding: 5px 7px;
  max-width: 100%;
  overflow-wrap: anywhere;
}
.selected-news svg {
  flex-shrink: 0;
}
.selected-news button {
  border: 0;
  background: transparent;
  font-size: 17px;
}
.analysis-result {
  margin-top: 30px;
  border-top: 1px solid var(--line);
  padding-top: 24px;
}
.analysis-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 9px 20px;
  color: var(--muted);
  font-size: 12px;
}
.extracted-source {
  padding: 22px 0;
  border-bottom: 1px solid var(--line);
}
.extracted-source > h4 {
  font-size: 15px;
}
.extracted-source > .muted {
  font-size: 11px;
  margin-top: 8px;
}
.extracted-event {
  padding: 14px 0;
}
.extracted-event > p {
  margin: 7px 0;
  overflow-wrap: anywhere;
}
.extracted-event summary {
  font-size: 12px;
  color: var(--accent);
  cursor: pointer;
}
.history-row {
  display: flex;
  justify-content: space-between;
  gap: 15px;
  width: 100%;
  padding: 12px 0;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--line);
  text-align: left;
}
.history-row > span {
  flex-shrink: 0;
  color: var(--muted);
}
.spinning {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
@media (min-width: 1600px) {
  .brief-main {
    padding-right: 45px;
    padding-left: 40px;
  }
}
@media (max-width: 1100px) {
  .decision-layout {
    grid-template-columns: 230px minmax(0, 1fr);
  }
  .brief-main {
    padding: 23px 22px 40px;
  }
  .timeline-layout {
    grid-template-columns: minmax(0, 1fr);
    gap: 0;
  }
  .change-detail {
    border-left: 0;
    border-top: 1px solid var(--line);
    padding: 22px 0;
  }
  .scope-fields {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 760px) {
  .decision-desk { padding-top: 56px; }
  .desk-nav {
    padding: 11px 16px;
    font-size: 11px;
    gap: 7px;
  }
  .desk-nav .nav-end {
    font-size: 10px;
  }
  .desk-heading {
    padding: 16px;
  }
  .desk-heading > div {
    gap: 12px;
  }
  .desk-heading h1 {
    font-size: 20px;
  }
  .product-label {
    font-size: 12px;
  }
  .draft-label {
    font-size: 10px;
  }
  .decision-layout {
    display: block;
  }
  .topic-rail {
    border-right: 0;
    border-bottom: 1px solid var(--line);
    padding: 14px 16px;
    display: block;
  }
  .topic-rail .rail-heading, .topic-rail .topic-search, .topic-rail .topic-row { display: none; }
  .mobile-topic-select { display: flex; align-items: center; gap: 12px; font-size: 12px; }
  .mobile-topic-select select { flex: 1; min-width: 0; width: 100%; background: white; border: 1px solid #c6d2d3; padding: 7px 8px; border-radius: 4px; color: var(--ink); }
  .rail-heading {
    margin: 0;
  }
  .topic-search {
    margin: 0;
    padding: 6px 8px;
  }
  .topic-row {
    padding: 10px 9px;
    margin-top: 3px;
    border-bottom: 0;
  }
  .topic-row > strong {
    font-size: 12px;
    line-height: 1.65;
  }
  .topic-country {
    font-size: 10px;
  }
  .topic-country > span {
    display: none;
  }
  .topic-cutoff {
    font-size: 10px;
  }
  .rail-link {
    display: none;
  }
  .brief-main {
    padding: 21px 16px 35px;
  }
  .brief-heading h2 {
    font-size: 20px;
  }
  .brief-meta {
    font-size: 10px;
    gap: 5px 10px;
  }
  .research-question {
    font-size: 13px;
  }
  .brief-actions {
    margin: 15px 0;
  }
  .section-label > span {
    font-size: 10px;
  }
  .takeaway {
    font-size: 15px;
  }
  .current-assessment > p:last-child {
    font-size: 12px;
  }
  .brief-tabs {
    gap: 19px;
  }
  .brief-tabs button {
    font-size: 12px;
  }
  .timeline-list {
    padding-left: 6px;
  }
  .timeline-list > li {
    padding-left: 9px;
  }
  .change-button {
    padding: 9px 10px 12px;
  }
  dl > div {
    grid-template-columns: 78px minmax(0, 1fr);
    gap: 10px;
  }
  dt {
    font-size: 11px;
  }
  dd {
    font-size: 12px;
  }
  .numeric-fields {
    gap: 12px;
  }
  .numeric-fields label {
    font-size: 11px;
  }
  .result-metrics {
    gap: 10px;
  }
  .result-metrics strong {
    font-size: 22px;
  }
  .judgment-row h3 {
    font-size: 16px;
  }
  .option-title {
    gap: 9px;
  }
  .option-title h4 {
    font-size: 14px;
  }
  .excerpt-content {
    padding-left: 0;
  }
  .history-row {
    flex-direction: column;
    gap: 5px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .spinning {
    animation: none;
  }
}
</style>
