<template>
  <div class="ground-home">
    <nav class="ground-subnav" aria-label="全球新闻观察台次级导航">
      <span>GROUND NEWS</span>
      <RouterLink to="/data-service/ground-news">事件总览</RouterLink>
      <RouterLink to="/data-service/ground-news-desk">分析工作台</RouterLink>
    </nav>

    <section class="home-hero" data-tour="ground-news-overview">
      <div class="home-heading">
        <span class="heading-icon"><Globe :size="30" :stroke-width="1.7" /></span>
        <div>
          <h1>全球事件总览</h1>
          <p>聚合多源报道，梳理事件脉络与关联线索</p>
        </div>
      </div>
      <div class="hero-actions">
        <button class="ghost-link" type="button" :disabled="loading" @click="refreshHome">
          <RefreshCw :size="16" :class="{ spinning: loading }" />{{
            loading ? '刷新中' : '刷新事件流'
          }}
        </button>
        <RouterLink class="primary-link" to="/data-service/ground-news-desk"
          >进入分析工作台<ArrowRight :size="16"
        /></RouterLink>
      </div>
      <div class="freshness-banner" role="status">
        <Clock :size="16" />
        <strong
          >{{ historicalMode ? '历史数据视图' : '已收录事件' }} · 多源数据截止
          {{ formatDate(metrics.latest_valid_story_date || metrics.latest_story_date) }}</strong
        >
        <span>{{ historicalMode ? '按数据截止时间呈现历史新闻' : '按已收录事件时间排序' }}</span>
      </div>
    </section>

    <nav v-if="sectionNavItems.length" class="section-nav" aria-label="新闻栏目">
      <button
        v-for="item in sectionNavItems"
        :key="item.id"
        type="button"
        :class="{ 'is-active': activeSection === item.id }"
        :aria-current="activeSection === item.id ? 'location' : undefined"
        @click="scrollToSection(item.id)"
      >
        {{ item.title }}<small v-if="item.count !== null">{{ item.count }}</small>
      </button>
    </nav>

    <section v-if="loading && !home" class="home-loading" role="status">
      <RefreshCw class="spinning" :size="26" />
      <p>正在加载首页事件流…</p>
    </section>
    <section v-else-if="error && !home" class="home-error" role="alert">
      <Info :size="28" /><strong>首页事件流加载失败</strong>
      <p>{{ error }}</p>
      <button class="primary-link" type="button" @click="loadHome">重新加载</button>
    </section>
    <template v-else>
      <p v-if="error" class="refresh-error" role="alert">
        刷新失败，保留上次内容：{{ error }} <button type="button" @click="loadHome">重试</button>
      </p>
      <main class="home-layout">
        <div id="front-news" class="home-primary">
          <section v-if="leadStory" id="lead-story" class="lead-feature">
            <div class="lead-media">
              <RouterLink
                class="lead-cover"
                :class="{ 'is-image-ready': isCoverLoaded(leadStory) }"
                :to="storyPath(leadStory)"
                :aria-label="leadStory.display_title"
              >
                <EventCover
                  :story="leadStory"
                  size="large"
                  @load-error="markCoverFailed(leadStory)"
                  @load-success="markCoverLoaded(leadStory)"
                />
              </RouterLink>
              <details class="lead-brief">
                <summary>主要报道样本 <ChevronDown :size="14" /></summary>
                <RouterLink
                  v-for="item in sampleNews(leadStory, 3)"
                  :key="item.news_id || item.title"
                  :to="storyPath(leadStory)"
                  class="lead-brief__item"
                  ><span>{{ item.source_name || item.domain || '新闻来源' }}</span
                  ><strong>{{ item.title }}</strong></RouterLink
                >
              </details>
            </div>
            <article class="lead-story">
              <div class="story-kicker">
                <span class="category-chip">重点事件</span
                ><span class="category-chip subtle">{{ familyLabel(leadStory.event_family) }}</span
                ><span
                  ><Clock :size="12" />{{
                    formatRange(leadStory.start_date, leadStory.end_date)
                  }}</span
                >
              </div>
              <RouterLink :to="storyPath(leadStory)" class="lead-title">{{
                leadStory.display_title
              }}</RouterLink>
              <p class="lead-source">{{ sourceNames(leadStory).join(' · ') || '来源待核查' }}</p>
              <p class="lead-entity">
                {{ displayEntityLine(leadStory)
                }}<span v-if="leadStory.location"> · {{ leadStory.location }}</span> ·
                {{ storyLanguageLabel(leadStory) }}
              </p>
              <div class="country-chips">
                <span
                  v-for="country in Object.keys(leadStory.country_counts || {}).slice(0, 4)"
                  :key="country"
                  >{{ country }}</span
                >
              </div>
              <div class="lead-stats">
                <span
                  ><strong>{{ formatNumber(leadStory.article_count) }}</strong
                  >条新闻</span
                ><span
                  ><strong>{{ formatNumber(leadStory.source_count) }}</strong
                  >个信源</span
                ><span
                  ><strong>{{ formatNumber(leadStory.l2_chain_count) }}</strong
                  >条关联线索</span
                >
              </div>
              <RouterLink class="story-link" :to="storyPath(leadStory)"
                >查看报道分析<ArrowRight :size="15"
              /></RouterLink>
              <details class="lead-directory">
                <summary>查看来源目录构成 <ChevronDown :size="14" /></summary>
                <p v-if="sampleTitle(leadStory)" class="lead-summary">
                  {{ sampleTitle(leadStory) }}
                </p>
                <div class="coverage-panel">
                  <strong>第三方目录构成</strong><span>{{ biasSummary(leadStory) }}</span
                  ><BiasBar :story="leadStory" />
                  <div class="bias-chips">
                    <span
                      v-for="bucket in visibleBiasBuckets(leadStory)"
                      :key="bucket.key"
                      :style="{ '--chip-color': bucket.color }"
                      >{{ bucket.label }} {{ formatPct(bucket.value) }}%</span
                    >
                  </div>
                </div>
                <div class="source-type-strip">
                  <span v-for="item in sourceTypeItems(leadStory)" :key="item.key"
                    >{{ item.label }} {{ item.value }}</span
                  >
                </div>
                <p class="directory-note">
                  候选排序分 {{ rankMetric.valueLabel }}，不代表重要性、风险或研究质量。
                </p>
              </details>
            </article>
          </section>

          <section class="front-grid" aria-label="新闻首页版面">
            <article class="front-column" data-tour="ground-news-edition">
              <header>
                <h2><Newspaper :size="18" />{{ historicalMode ? '历史快讯' : '最新快讯' }}</h2>
                <small>{{ editionLabel('latest') }}</small>
              </header>
              <div class="front-column__list">
                <RouterLink
                  v-for="story in frontLatestStories"
                  :key="story.cluster_id"
                  :to="storyPath(story)"
                  class="front-headline"
                  ><span class="front-category">{{ familyLabel(story.event_family) }}</span>
                  <div>
                    <strong>{{ story.display_title }}</strong>
                    <p
                      v-if="sampleTitle(story) && sampleTitle(story) !== story.display_title"
                      class="front-headline__summary"
                    >
                      {{ sampleTitle(story) }}
                    </p>
                    <small
                      >{{ formatDate(story.end_date || story.start_date) }} ·
                      {{ story.article_count }} 条新闻 · {{ story.source_count }} 个信源 ·
                      {{ storyLanguageLabel(story) }}</small
                    >
                  </div></RouterLink
                >
                <p v-if="!frontLatestStories.length" class="empty-state">暂无已收录快讯</p>
              </div>
            </article>
            <article class="front-column">
              <header>
                <h2><Layers :size="18" />{{ historicalMode ? '历史多源' : '近期多源' }}</h2>
                <small>{{ editionLabel('week_watch') }}</small>
              </header>
              <div class="front-column__list">
                <RouterLink
                  v-for="story in frontWeekStories.slice(0, 4)"
                  :key="story.cluster_id"
                  :to="storyPath(story)"
                  class="front-headline"
                  ><span class="front-category">{{ familyLabel(story.event_family) }}</span>
                  <div>
                    <strong>{{ story.display_title }}</strong>
                    <p
                      v-if="sampleTitle(story) && sampleTitle(story) !== story.display_title"
                      class="front-headline__summary"
                    >
                      {{ sampleTitle(story) }}
                    </p>
                    <small
                      >{{ formatRange(story.start_date, story.end_date) }} ·
                      {{ story.article_count }} 条新闻 · {{ story.source_count }} 个信源</small
                    ><small>{{ storyLanguageLabel(story) }} · {{ biasSummary(story) }}</small>
                  </div></RouterLink
                >
                <p v-if="!frontWeekStories.length" class="empty-state">当前窗口暂无多源事件</p>
              </div>
            </article>
          </section>
          <p v-if="!leadStory && !frontLatestStories.length" class="empty-state">
            当前暂无可展示事件，请稍后刷新。
          </p>
        </div>

        <aside class="overview-rail" aria-label="事件概览辅助信息">
          <section class="rail-card">
            <header class="rail-card__head">
              <h2><Network :size="17" />关联线索</h2>
              <small>近期优先</small>
            </header>
            <div class="overview-chains">
              <RouterLink
                v-for="chain in frontChainItems.slice(0, 3)"
                :key="chain.chain_id"
                :to="timelinePath(chain)"
                ><strong>{{ chainTitle(chain) }}</strong
                ><small>{{ formatRange(chain.start_date, chain.end_date) }}</small
                ><small
                  >{{ chain.segment_count }} 个切面 · {{ chain.article_count }} 条新闻 ·
                  {{ qualityLabel(chain.chain_quality) }}</small
                ></RouterLink
              >
              <p v-if="!frontChainItems.length" class="empty-state">暂无关联线索</p>
            </div>
          </section>
          <section class="rail-card">
            <header class="rail-card__head">
              <h2><Database :size="17" />来源目录</h2>
            </header>
            <dl class="directory-metrics">
              <div v-for="item in sourceDirectoryItems" :key="item.label">
                <dt>{{ item.label }}</dt>
                <dd>{{ formatNumber(item.value) }}</dd>
              </div>
            </dl>
            <p class="directory-note">第三方目录标签仅作来源背景参考</p>
          </section>
          <section class="workspace-cta">
            <TrendingUp :size="26" />
            <div>
              <h2>继续深入分析</h2>
              <p>进入工作台，查看报道切面与信源结构</p>
              <RouterLink to="/data-service/ground-news-desk"
                >打开分析工作台<ArrowRight :size="14"
              /></RouterLink>
            </div>
          </section>
        </aside>

        <section class="section-stack" aria-label="专题新闻">
          <article
            v-for="section in storySections"
            :id="'section-' + section.key"
            :key="section.key"
            :class="['story-section', 'story-section--' + section.key]"
          >
            <header class="section-title">
              <span class="section-icon"
                ><TrendingUp v-if="section.key === 'l2_movers'" :size="24" /><Layers
                  v-else
                  :size="24"
              /></span>
              <div>
                <div class="section-title__line">
                  <h2>{{ section.title }}</h2>
                  <span class="section-count">{{ section.stories.length }} 个事件</span>
                </div>
                <p>{{ section.subtitle }}</p>
              </div>
              <small>{{ sectionBadge(section) }}</small>
            </header>
            <div class="story-grid">
              <RouterLink
                v-for="story in section.stories"
                :key="story.cluster_id"
                :to="storyPath(story)"
                :class="['story-card', { 'story-card--text-only': !hasRenderableImage(story) }]"
              >
                <div class="story-card__top">
                  <EventCover
                    v-if="hasRenderableImage(story)"
                    :story="story"
                    size="card"
                    @load-error="markCoverFailed(story)"
                    @load-success="markCoverLoaded(story)"
                  />
                  <div class="story-card__heading">
                    <div class="story-card__meta">
                      <span class="category-chip subtle">{{ familyLabel(story.event_family) }}</span
                      ><span>{{ formatRange(story.start_date, story.end_date) }}</span
                      ><span>{{ storyLanguageLabel(story) }}</span>
                    </div>
                    <h3>{{ story.display_title }}</h3>
                    <p class="story-card__entity">{{ displayEntityLine(story) }}</p>
                  </div>
                </div>
                <p
                  v-if="sampleTitle(story) && sampleTitle(story) !== story.display_title"
                  class="story-card__sample"
                >
                  {{ sampleTitle(story) }}
                </p>
                <p class="story-card__sources">{{ storySourceLine(story) }}</p>
                <div class="card-directory">
                  <span>目录构成</span>
                  <div>
                    <BiasBar :story="story" compact />
                    <div class="bias-mini">
                      <span
                        v-for="bucket in visibleBiasBuckets(story)"
                        :key="bucket.key"
                        :style="{ '--chip-color': bucket.color }"
                        >{{ bucket.label }} {{ formatPct(bucket.value) }}%</span
                      >
                    </div>
                  </div>
                </div>
                <div class="story-card__foot">
                  <span><FileText :size="14" />{{ story.article_count }} 条新闻</span
                  ><span><Database :size="14" />{{ story.source_count }} 个信源</span
                  ><span class="card-open">查看分析<ArrowRight :size="14" /></span>
                </div>
              </RouterLink>
            </div>
          </article>
        </section>

        <aside class="right-rail" aria-label="事件池与专题索引">
          <section class="rail-card daily-brief">
            <header class="rail-card__head">
              <h2>事件池状态</h2>
              <span class="snapshot-chip">{{ historicalMode ? '历史快照' : '数据简报' }}</span>
            </header>
            <div class="brief-grid">
              <span
                ><strong>{{ formatNumber(metrics.total_stories) }}</strong
                >收录事件</span
              ><span
                ><strong>{{ formatNumber(metrics.total_articles) }}</strong
                >聚合新闻</span
              ><span
                ><strong>{{
                  formatNumber(metrics.product_candidate_count ?? metrics.candidate_count)
                }}</strong
                >主候选</span
              ><span
                ><strong>{{ formatNumber(metrics.ok_story_covers) }}</strong
                >可用封面</span
              ><span class="brief-coverage"
                ><strong>{{ profileCoveragePct }}</strong
                >政治目录标签覆盖</span
              >
            </div>
            <dl class="directory-metrics status-metrics">
              <div>
                <dt>多源截止</dt>
                <dd>
                  {{ formatDate(metrics.latest_valid_story_date || metrics.latest_story_date) }}
                </dd>
              </div>
              <div>
                <dt>采集截止</dt>
                <dd>{{ groundCutoffDate }}</dd>
              </div>
              <div>
                <dt>Ready 指标</dt>
                <dd>待核验</dd>
              </div>
              <div>
                <dt>7日可用指标</dt>
                <dd>待核验</dd>
              </div>
            </dl>
            <div class="edition-policy">
              <span>事件时间优先</span><span>专题 {{ edition.rotation_days || 3 }} 天轮换</span
              ><span>L2 近期优先</span>
            </div>
            <p class="directory-note">
              当前顺序是未批准方法生成的候选展示，不代表重要性、风险或研究质量。旧 Ready
              阈值未批准，不作为质量通过。<span v-if="metrics.future_story_count"
                >未来日期异常 {{ metrics.future_story_count }} 条，已进入健康监控。</span
              >
            </p>
          </section>
          <section class="rail-card">
            <header class="rail-card__head">
              <h2>话题索引</h2>
              <small>{{ topicChips.length }} 类</small>
            </header>
            <div class="topic-cloud">
              <RouterLink
                v-for="topic in topicChips.slice(0, 10)"
                :key="topic.key"
                :to="topicPath(topic.key, topic.story)"
                ><Tags :size="19" />
                <div>
                  <strong>{{ topic.label }}</strong
                  ><span>{{ topic.count }} 件 · {{ topic.articles }} 条</span>
                </div></RouterLink
              >
            </div>
            <p class="directory-note">当前首页去重事件统计</p>
          </section>
          <section class="rail-card directory-help">
            <header class="rail-card__head">
              <h2><Info :size="17" />目录构成说明</h2>
            </header>
            <p>
              比例基于已审阅且政治标签已知的信源。目录标签用于描述来源背景，不代表报道准确性或研究质量。
            </p>
            <div class="bias-help-legend">
              <span
                v-for="bucket in directoryLegend"
                :key="bucket.label"
                :style="{ '--chip-color': bucket.color }"
                >{{ bucket.label }}</span
              >
            </div>
          </section>
          <section class="rail-card">
            <header class="rail-card__head">
              <h2>覆盖缺口候选</h2>
              <small>{{ blindspotStories.length }} 条 · 未评估</small>
            </header>
            <div class="blindspot-list">
              <RouterLink
                v-for="story in blindspotStories.slice(0, 5)"
                :key="story.cluster_id"
                :to="storyPath(story)"
                ><strong>{{ story.display_title }}</strong
                ><span>{{ biasSummary(story) }} · {{ story.source_count }} 信源</span
                ><BiasBar :story="story" compact
              /></RouterLink>
              <p v-if="!blindspotStories.length" class="empty-state">暂无覆盖缺口候选</p>
            </div>
          </section>
          <section class="rail-card">
            <header class="rail-card__head">
              <h2>关联线索</h2>
              <small>{{ l2Watchlist.length }} 条</small>
            </header>
            <div class="chain-list">
              <RouterLink
                v-for="chain in l2Watchlist.slice(0, 7)"
                :key="chain.chain_id"
                :to="timelinePath(chain)"
                ><strong>{{ chainTitle(chain) }}</strong
                ><small
                  >{{ chain.segment_count }} 个切面 · {{ chain.article_count }} 条新闻 ·
                  {{ qualityLabel(chain.chain_quality) }}</small
                ></RouterLink
              >
            </div>
          </section>
          <section class="rail-card">
            <header class="rail-card__head">
              <h2>最新事件</h2>
              <small>{{ latestStories.length }} 条</small>
            </header>
            <div class="latest-list">
              <RouterLink
                v-for="story in latestStories.slice(0, 6)"
                :key="story.cluster_id"
                :to="storyPath(story)"
                ><span>{{ formatDate(story.end_date || story.start_date) }}</span
                ><strong>{{ story.display_title }}</strong
                ><small
                  >{{ story.article_count }} 条 · {{ story.source_count }} 信源</small
                ></RouterLink
              >
            </div>
          </section>
          <section class="rail-card">
            <header class="rail-card__head">
              <h2>高频来源</h2>
              <small>{{ sourceLeaders.length }} 个</small>
            </header>
            <div class="source-leaders">
              <span v-for="item in sourceLeaders.slice(0, 9)" :key="item.name"
                >{{ item.name }}<strong>{{ item.count }}</strong></span
              >
            </div>
          </section>
        </aside>
      </main>
    </template>
  </div>
</template>

<script setup>
import { computed, defineComponent, h, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import {
  ArrowRight,
  ChevronDown,
  Clock,
  Database,
  FileText,
  Globe,
  Info,
  Layers,
  Network,
  Newspaper,
  RefreshCw,
  Tags,
  TrendingUp,
} from 'lucide-vue-next'
import {
  featureFreshness,
  formatFreshnessCutoff,
  useFeatureFreshness,
} from '@/features/operations/index.js'
import {
  buildGroundNewsHomeModel,
  groundNewsApi,
  homeBiasBuckets as normalizeBiasBuckets,
  homeBiasSummary as biasSummary,
  homeCoverShort as coverShort,
  homeEditionLabel,
  homeEntityLine as baseEntityLine,
  homeFamilyLabel as familyLabel,
  homeFormatDate as formatDate,
  homeFormatNumber as formatNumber,
  homeFormatPct as formatPct,
  homeFormatRange as formatRange,
  homeHasStoryImage as hasStoryImage,
  homeQualityLabel as qualityLabel,
  homeSampleNews as sampleNews,
  homeSampleTitle as sampleTitle,
  homeSectionBadge,
  homeSourceNames as sourceNames,
  homeSourceTypeItems as sourceTypeItems,
  homeStoryPath as storyPath,
  homeStorySourceLine as storySourceLine,
  homeTimelinePath as timelinePath,
  homeTopicPath as topicPath,
  homeVisibleBiasBuckets as visibleBiasBuckets,
} from '@/features/ground-news/index.js'

const loading = ref(false)
const error = ref('')
const home = ref(null)
const activeSection = ref('front-news')
let sectionObserver = null
const failedCoverIds = ref(new Set())
const loadedCoverIds = ref(new Set())
const { report: freshnessReport, refresh: refreshFreshness } = useFeatureFreshness()

const homeModel = computed(() => buildGroundNewsHomeModel(home.value))
const leadStory = computed(() => homeModel.value.leadStory)
const rankMetric = computed(() => ({
  valueLabel: Number.isFinite(Number(leadStory.value?.rank_score))
    ? Math.round(Number(leadStory.value.rank_score)).toLocaleString('zh-CN')
    : '待核验',
}))
const metrics = computed(() => homeModel.value.metrics)
const edition = computed(() => homeModel.value.edition)
const profileCoveragePct = computed(() => homeModel.value.profileCoveragePct)
const sectionByKey = computed(() => homeModel.value.sectionByKey)
const storySections = computed(() => homeModel.value.storySections)
const l2Watchlist = computed(() => homeModel.value.l2Watchlist)
const frontLatestStories = computed(() => homeModel.value.frontLatestStories)
const sectionNavItems = computed(() =>
  homeModel.value.sectionNavItems.filter((item) => item.id !== 'lead-story'),
)
const frontWeekStories = computed(() => homeModel.value.frontWeekStories)
const frontChainItems = computed(() => homeModel.value.frontChainItems)
const latestStories = computed(() => homeModel.value.latestStories)
const blindspotStories = computed(() => homeModel.value.blindspotStories)
const topicChips = computed(() => homeModel.value.topicChips)
const sourceLeaders = computed(() => homeModel.value.sourceLeaders)
const sourceDirectoryItems = computed(() => {
  const coverage = metrics.value.source_profile_coverage || {}
  return [
    { label: '来源档案', value: coverage.total_profiles },
    { label: '已审阅档案', value: coverage.reviewed_profiles },
    { label: '已知政治目录标签', value: coverage.known_bias_profiles },
    { label: '已知事实性目录标签', value: coverage.known_factuality_profiles },
  ]
})
const directoryLegend = [
  { label: '目录偏左', color: '#2f7dd1' },
  { label: '目录中间', color: '#2ca66f' },
  { label: '目录偏右', color: '#d77b2a' },
  { label: '目录国家关联', color: '#7a6a55' },
  { label: '目录未评级', color: '#aab3bd' },
]
const groundNewsFreshness = computed(() => featureFreshness(freshnessReport.value, 'ground-news'))
const historicalMode = computed(() => groundNewsFreshness.value.historical)
const groundCutoffLabel = computed(() => formatFreshnessCutoff(groundNewsFreshness.value.cutoff))
const groundCutoffDate = computed(
  () =>
    groundCutoffLabel.value ||
    formatDate(metrics.value.latest_valid_story_date || metrics.value.latest_story_date),
)

const EventCover = defineComponent({
  name: 'EventCover',
  emits: ['load-error', 'load-success'],
  props: {
    story: { type: Object, required: true },
    size: { type: String, default: 'card' },
  },
  setup(props, { emit }) {
    const imageFailed = ref(false)
    const imageLoaded = ref(false)
    let loadTimer = null
    const clearLoadTimer = () => {
      if (loadTimer !== null) window.clearTimeout(loadTimer)
      loadTimer = null
    }
    const failImage = () => {
      if (imageLoaded.value || imageFailed.value) return
      clearLoadTimer()
      imageFailed.value = true
      emit('load-error')
    }
    watch(
      () => props.story.cover?.image_url,
      (imageUrl) => {
        clearLoadTimer()
        imageFailed.value = false
        imageLoaded.value = false
        if (imageUrl && props.size !== 'card') {
          loadTimer = window.setTimeout(failImage, 6000)
        }
      },
      { immediate: true },
    )
    onBeforeUnmount(clearLoadTimer)
    return () => {
      const imageUrl = props.story.cover?.image_url || ''
      const showImage = Boolean(imageUrl) && !imageFailed.value
      return h(
        'div',
        {
          class: [
            'event-cover',
            `event-cover--${props.size}`,
            `theme-${props.story.cover?.theme || 'global_dispatch'}`,
            {
              'has-image': showImage,
              'image-failed': imageFailed.value,
              'image-loaded': imageLoaded.value,
              'image-pending': showImage && !imageLoaded.value,
            },
          ],
          style: {
            '--seed-x': `${(Number(props.story.cover?.seed || 0) % 73) + 8}%`,
            '--seed-y': `${(Number(props.story.cover?.seed || 0) % 41) + 12}%`,
          },
        },
        [
          showImage
            ? h('div', {
                class: 'event-cover__image-blur',
                style: { backgroundImage: `url("${imageUrl}")` },
              })
            : null,
          showImage
            ? h('img', {
                class: 'event-cover__image',
                src: imageUrl,
                alt: '',
                loading: props.size === 'card' ? 'lazy' : 'eager',
                referrerpolicy: 'no-referrer',
                onLoad: (event) => {
                  const image = event.currentTarget
                  const frame = image.closest('.event-cover')
                  if (!frame || !image.naturalWidth || !image.naturalHeight) return
                  const ratio = image.naturalWidth / image.naturalHeight
                  const safeRatio = Math.min(2.25, Math.max(1.08, ratio))
                  frame.style.setProperty('--cover-ratio', `${safeRatio} / 1`)
                  frame.classList.toggle('is-portrait', ratio < 1)
                  frame.classList.toggle('is-wide', ratio > 1.85)
                  clearLoadTimer()
                  imageLoaded.value = true
                  emit('load-success')
                },
                onError: failImage,
              })
            : null,
          h('div', { class: 'event-cover__map' }),
          h('div', { class: 'event-cover__signal' }),
          h('div', { class: 'event-cover__rings' }),
          h('div', { class: 'event-cover__label' }, [
            h('span', props.story.cover?.label || '全球快讯'),
            h('strong', coverShort(props.story)),
            h(
              'small',
              showImage
                ? `新闻图片 · ${props.story.cover?.credit || '来源见详情'}`
                : '编辑封面 · 图片暂不可用',
            ),
          ]),
        ],
      )
    }
  },
})

const BiasBar = defineComponent({
  name: 'BiasBar',
  props: {
    story: { type: Object, required: true },
    compact: { type: Boolean, default: false },
  },
  setup(props) {
    return () =>
      h('div', { class: ['bias-meter', { compact: props.compact }] }, [
        h(
          'div',
          { class: 'bias-meter__bar' },
          normalizeBiasBuckets(props.story).map((bucket) =>
            h('span', {
              key: bucket.key,
              style: {
                width: `${bucket.value}%`,
                background: bucket.color,
              },
            }),
          ),
        ),
        props.compact
          ? null
          : h(
              'div',
              { class: 'bias-meter__legend' },
              normalizeBiasBuckets(props.story).map((bucket) =>
                h('span', { key: bucket.key }, `${bucket.label} ${formatPct(bucket.value)}%`),
              ),
            ),
      ])
  },
})

onMounted(() => {
  void refreshFreshness()
  void loadHome()
})

async function loadHome() {
  loading.value = true
  error.value = ''
  try {
    home.value = await groundNewsApi.getHome({ candidateLimit: 180, minArticles: 2 })
  } catch (err) {
    error.value = err?.response?.data?.detail || err?.message || '未知错误'
  } finally {
    loading.value = false
    await nextTick()
    observeSections()
  }
}

function refreshHome() {
  void refreshFreshness()
  void loadHome()
}

function observeSections() {
  sectionObserver?.disconnect()
  if (typeof IntersectionObserver === 'undefined') return
  sectionObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      if (visible.length) activeSection.value = visible[0].target.id
    },
    { rootMargin: '-145px 0px -55% 0px', threshold: 0 },
  )
  for (const item of sectionNavItems.value) {
    const target = document.getElementById(item.id)
    if (target) sectionObserver.observe(target)
  }
}

onBeforeUnmount(() => sectionObserver?.disconnect())

async function scrollToSection(id) {
  await nextTick()
  const target = document.getElementById(id)
  if (!target) return
  activeSection.value = id
  const headerOffset =
    (document.querySelector('.section-nav')?.getBoundingClientRect().height || 54) + 84
  const top = target.getBoundingClientRect().top + window.scrollY - headerOffset
  window.scrollTo({
    top: Math.max(0, top),
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
  })
  if (window.history?.replaceState) {
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${window.location.search}#${id}`,
    )
  }
}

function editionLabel(key) {
  return homeEditionLabel(sectionByKey.value, edition.value, key, groundNewsFreshness.value)
}

function sectionBadge(section) {
  return homeSectionBadge(section, sectionByKey.value, edition.value, groundNewsFreshness.value)
}

function displayEntityLine(story) {
  return formatRelationText(baseEntityLine(story))
}

function hasRenderableImage(story) {
  return hasStoryImage(story) && !failedCoverIds.value.has(story?.cluster_id)
}

function isCoverLoaded(story) {
  return hasRenderableImage(story) && loadedCoverIds.value.has(story?.cluster_id)
}

function markCoverLoaded(story) {
  const clusterId = story?.cluster_id
  if (!clusterId || loadedCoverIds.value.has(clusterId)) return
  loadedCoverIds.value = new Set([...loadedCoverIds.value, clusterId])
}

function markCoverFailed(story) {
  const clusterId = story?.cluster_id
  if (!clusterId || failedCoverIds.value.has(clusterId)) return
  failedCoverIds.value = new Set([...failedCoverIds.value, clusterId])
  if (loadedCoverIds.value.has(clusterId)) {
    loadedCoverIds.value = new Set([...loadedCoverIds.value].filter((item) => item !== clusterId))
  }
}

function chainTitle(chain) {
  return formatRelationText(chain?.title || chain?.chain_id || '关联线索')
}

function formatRelationText(value) {
  return String(value || '')
    .replaceAll('_', ' ')
    .replace(/\s*->\s*/g, ' → ')
    .replace(/\s*↔\s*/g, ' ↔ ')
    .split(/(\s+|→|↔|:|：|-)/)
    .map((part) => formatEntityToken(part))
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
}

function formatEntityToken(part) {
  const value = String(part || '')
  if (!/^[a-z][a-z0-9.'&/()]*$/i.test(value) || value !== value.toLowerCase()) return value
  const upper = value.toUpperCase()
  if (
    [
      'AI',
      'ASEAN',
      'BRICS',
      'EU',
      'G7',
      'G20',
      'ICC',
      'NATO',
      'OPEC',
      'UK',
      'UN',
      'US',
      'UAE',
    ].includes(upper)
  ) {
    return upper
  }
  if (value.length <= 2) return upper
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function storyLanguageLabel(story) {
  const explicit = Array.isArray(story?.languages) ? story.languages[0] : story?.language
  const normalized = normalizeLanguage(explicit)
  if (normalized) return normalized
  const text = [story?.display_title, story?.title, story?.sample_news?.[0]?.title]
    .filter(Boolean)
    .join(' ')
  return inferLanguageLabel(text)
}

function normalizeLanguage(value) {
  const key = String(value || '')
    .trim()
    .toLowerCase()
  if (!key) return ''
  if (['zh', 'zh-cn', 'cn', 'chinese'].includes(key)) return '中文'
  if (['en', 'eng', 'english'].includes(key)) return '英文'
  if (['es', 'spa', 'spanish'].includes(key)) return '西语'
  if (['fr', 'fre', 'fra', 'french'].includes(key)) return '法语'
  if (['ar', 'ara', 'arabic'].includes(key)) return '阿语'
  if (['ru', 'rus', 'russian'].includes(key)) return '俄语'
  return '多语种'
}

function inferLanguageLabel(text) {
  const value = String(text || '')
  if (/[\u4e00-\u9fff]/.test(value)) return '中文'
  if (/[¿¡ñáéíóúü]/i.test(value)) return '西语'
  if (/[àâæçéèêëîïôœùûüÿ]/i.test(value)) return '法语'
  if (/[\u0600-\u06ff]/.test(value)) return '阿语'
  if (/[\u0400-\u04ff]/.test(value)) return '俄语'
  return '英文'
}
</script>

<style scoped>
/* Keep this page’s section navigation attached to the viewport. */
:global(.app-shell:has(.ground-home)) {
  overflow-x: clip;
}
.ground-home {
  --ink: #182746;
  --muted: #7485a2;
  --line: #e3eaf5;
  --blue: #3264f5;
  --paper: #fff;
  --sans: 'Inter', 'Noto Sans CJK SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  min-height: 100vh;
  padding: 64px 32px 56px;
  color: var(--ink);
  font-family: var(--sans);
  background: #f5f8fe;
}
.ground-home *,
.ground-home *::before,
.ground-home *::after {
  box-sizing: border-box;
}
.ground-home a {
  text-decoration: none;
  color: inherit;
}
.ground-home button {
  font: inherit;
  cursor: pointer;
}
.ground-home button:disabled {
  cursor: wait;
  opacity: 0.6;
}
.ground-home a:focus-visible,
.ground-home button:focus-visible,
.ground-home summary:focus-visible {
  outline: 3px solid #84a3ff;
  outline-offset: 4px;
}
.ground-subnav,
.home-hero,
.section-nav,
.home-layout,
.home-error,
.home-loading,
.refresh-error {
  max-width: 1760px;
  margin-inline: auto;
}
.ground-subnav {
  min-height: 54px;
  display: flex;
  align-items: stretch;
  justify-content: center;
  gap: 28px;
  margin-bottom: 24px;
}
.ground-subnav > span {
  display: flex;
  align-items: center;
  font-size: 12px;
  font-weight: 750;
  letter-spacing: 0.07em;
  color: var(--muted);
}
.ground-subnav a {
  display: flex;
  align-items: center;
  border-bottom: 3px solid transparent;
  padding: 0 5px;
  font-size: 14px;
  font-weight: 650;
}
.ground-subnav a.router-link-exact-active {
  color: var(--blue);
  border-color: var(--blue);
}
.home-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 20px;
  margin-bottom: 20px;
}
.home-heading {
  display: flex;
  gap: 20px;
  align-items: center;
}
.heading-icon,
.section-icon {
  display: grid;
  place-items: center;
  background: var(--blue);
  color: #fff;
  flex: 0 0 auto;
  border-radius: 12px;
  width: 54px;
  height: 54px;
}
.home-heading h1 {
  margin: 0 0 7px;
  font-size: 30px;
  font-weight: 750;
  line-height: 1.3;
  letter-spacing: -0.025em;
}
.home-heading p {
  margin: 0;
  font-size: 14px;
  color: var(--muted);
  line-height: 1.6;
}
.hero-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.primary-link,
.ghost-link,
.story-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  border: 1px solid var(--blue);
  border-radius: 10px;
  padding: 11px 18px;
  font-size: 14px;
  font-weight: 650;
  line-height: 1.5;
}
.ground-home .primary-link,
.ground-home .story-link {
  background: var(--blue);
  color: #fff;
}
.ghost-link {
  background: #fff;
  color: var(--blue);
  border-color: #cfdbff;
}
.primary-link:hover,
.story-link:hover {
  filter: brightness(0.94);
}
.ghost-link:hover {
  background: #edf3ff;
}
.freshness-banner {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  border-radius: 10px;
  padding: 12px 18px;
  background: #eaf0ff;
  color: var(--blue);
  font-size: 13px;
  line-height: 1.5;
}
.freshness-banner strong {
  font-weight: 600;
}
.freshness-banner > span {
  color: var(--muted);
  margin-left: 8px;
}
.section-nav {
  position: sticky;
  top: 64px;
  z-index: 20;
  display: flex;
  gap: 12px;
  align-items: stretch;
  overflow-x: auto;
  scrollbar-width: thin;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #fff;
  margin-bottom: 20px;
  padding: 0 16px;
  box-shadow: 0 3px 12px #203f7d05;
}
.section-nav button {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  padding: 16px 12px 13px;
  border: 0;
  border-bottom: 3px solid transparent;
  background: transparent;
  color: #60718e;
  font-size: 14px;
  font-weight: 600;
}
.section-nav button.is-active {
  border-bottom-color: var(--blue);
  color: var(--blue);
}
.section-nav small {
  font-size: 10px;
  color: #91a1bd;
}
.section-nav button:hover {
  color: var(--blue);
}
.home-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 350px;
  gap: 28px 22px;
  align-items: start;
}
.home-primary,
.section-stack,
.overview-rail,
.right-rail {
  min-width: 0;
  display: grid;
  gap: 18px;
}
.home-primary {
  grid-column: 1;
  grid-row: 1;
  scroll-margin-top: 144px;
}
.overview-rail {
  grid-column: 2;
  grid-row: 1;
}
.section-stack {
  grid-column: 1;
  grid-row: 2;
  gap: 32px;
}
.right-rail {
  grid-column: 2;
  grid-row: 2;
}
.lead-feature,
.front-column,
.rail-card {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 16px;
}
.lead-feature {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 24px;
  padding: 20px;
  scroll-margin-top: 144px;
}
.lead-media,
.lead-story {
  min-width: 0;
}
.lead-cover {
  display: block;
  border-radius: 12px;
  overflow: hidden;
}
.lead-title {
  display: block;
  margin: 14px 0 10px;
  font-size: clamp(27px, calc(1.65vw + 4px), 36px);
  line-height: 1.3;
  font-weight: 750;
  overflow-wrap: anywhere;
  letter-spacing: -0.025em;
}
.ground-home .lead-title:hover {
  color: var(--blue);
}
.story-kicker {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  color: var(--muted);
  font-size: 13px;
}
.story-kicker > span {
  display: inline-flex;
  gap: 5px;
  align-items: center;
}
.category-chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 650;
  background: var(--blue);
  color: #fff;
}
.category-chip.subtle {
  background: #edf3ff;
  color: var(--blue);
}
.lead-source,
.lead-entity {
  margin: 8px 0;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.7;
  overflow-wrap: anywhere;
}
.country-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 10px 0 14px;
}
.country-chips span {
  border-radius: 16px;
  padding: 4px 9px;
  background: #f0f4fb;
  color: #607493;
  font-size: 13px;
}
.lead-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  background: #f5f7fd;
  border-radius: 10px;
  padding: 12px 0;
  margin-bottom: 12px;
}
.lead-stats > span {
  display: grid;
  gap: 3px;
  text-align: center;
  font-size: 13px;
  color: var(--muted);
  border-left: 1px solid #e0e7f3;
}
.lead-stats > span:first-child {
  border: 0;
}
.lead-stats strong {
  font-size: 24px;
  font-weight: 700;
  line-height: 1.2;
  color: var(--blue);
}
.story-link {
  padding: 9px 14px;
  font-size: 14px;
}
.lead-brief,
.lead-directory {
  font-size: 13px;
  color: var(--muted);
  margin-top: 12px;
}
.lead-brief summary,
.lead-directory summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  list-style: none;
  padding: 7px 0;
}
.lead-brief summary::-webkit-details-marker,
.lead-directory summary::-webkit-details-marker {
  display: none;
}
.lead-brief[open] summary svg,
.lead-directory[open] summary svg {
  transform: rotate(180deg);
}
.lead-brief__item {
  display: grid;
  gap: 4px;
  border-top: 1px solid var(--line);
  padding: 9px 0;
}
.lead-brief__item strong {
  color: var(--ink);
  font-size: 16px;
  font-weight: 550;
}
.coverage-panel {
  display: grid;
  gap: 8px;
  margin: 12px 0;
}
.coverage-panel strong {
  color: var(--ink);
}
.bias-chips,
.source-type-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}
.bias-chips > span {
  border-left: 3px solid var(--chip-color);
  padding-left: 5px;
}
.source-type-strip span {
  background: #f1f5fc;
  padding: 3px 6px;
  border-radius: 5px;
}
.lead-summary {
  line-height: 1.6;
}
.front-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}
.front-column {
  padding: 16px 18px;
  min-width: 0;
}
.front-column header,
.rail-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}
.front-column h2,
.rail-card h2 {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.4;
  color: var(--blue);
}
.front-column header small {
  color: var(--muted);
  font-size: 10px;
  text-align: right;
  max-width: 54%;
  line-height: 1.5;
}
.front-column__list {
  height: 266px;
  overflow: auto;
  scrollbar-width: thin;
  scrollbar-color: #d1dbef transparent;
}
.front-headline {
  display: flex;
  align-items: start;
  gap: 12px;
  padding: 13px 0;
  border-top: 1px solid var(--line);
}
.front-headline:first-child {
  border-top: 0;
  padding-top: 0;
}
.front-category {
  background: #eef4ff;
  color: var(--blue);
  border-radius: 7px;
  padding: 9px 7px;
  flex: 0 0 auto;
  font-size: 13px;
  max-width: 64px;
  text-align: center;
}
.front-headline > div {
  min-width: 0;
}
.front-headline strong {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  color: var(--ink);
  font-size: 17px;
  line-height: 1.55;
  font-weight: 650;
}
.front-headline:hover strong {
  color: var(--blue);
}
.front-headline small {
  display: block;
  font-size: 12px;
  line-height: 1.7;
  color: var(--muted);
  margin-top: 5px;
}
.front-headline__summary {
  font-size: 13px;
  color: #637797;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 5px 0;
}
.rail-card {
  padding: 18px;
  overflow: hidden;
}
.rail-card__head small {
  font-size: 11px;
  color: var(--muted);
}
.overview-chains {
  display: grid;
}
.overview-chains a {
  position: relative;
  display: grid;
  gap: 6px;
  padding: 5px 0 17px 23px;
  margin-left: 5px;
  border-left: 1px solid #dbe5ff;
}
.overview-chains a:last-child {
  border-left-color: transparent;
  padding-bottom: 0;
}
.overview-chains a::before {
  content: '';
  position: absolute;
  left: -5px;
  top: 9px;
  width: 9px;
  height: 9px;
  border: 2px solid #cddaff;
  border-radius: 50%;
  background: var(--blue);
  box-shadow: 0 0 0 3px #f0f4ff;
}
.overview-chains strong {
  font-size: 16px;
  line-height: 1.55;
  font-weight: 650;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.overview-chains small {
  color: var(--muted);
  font-size: 12px;
  line-height: 1.5;
}
.directory-metrics {
  margin: 0;
}
.directory-metrics > div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 0;
  border-bottom: 1px solid #edf1f8;
}
.directory-metrics dt {
  font-size: 12px;
  color: var(--muted);
}
.directory-metrics dd {
  margin: 0;
  font-size: 13px;
  font-weight: 650;
  text-align: right;
}
.directory-note {
  margin: 12px 0 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.8;
}
.workspace-cta {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  border-radius: 14px;
  background: #eaf0ff;
  color: var(--blue);
}
.workspace-cta > svg {
  flex-shrink: 0;
}
.workspace-cta h2 {
  margin: 0 0 6px;
  font-size: 16px;
}
.workspace-cta p {
  margin: 0 0 8px;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.6;
}
.workspace-cta a {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  font-weight: 650;
}
.story-section {
  min-width: 0;
  scroll-margin-top: 140px;
}
.section-title {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--line);
  padding-bottom: 14px;
}
.section-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
}
.section-title > div {
  min-width: 0;
}
.section-title__line {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.section-title h2 {
  margin: 0;
  font-size: 23px;
  line-height: 1.4;
  font-weight: 750;
}
.section-count {
  background: #e9f0ff;
  color: var(--blue);
  padding: 3px 9px;
  border-radius: 6px;
  font-size: 11px;
}
.section-title p {
  font-size: 12px;
  line-height: 1.65;
  color: var(--muted);
  margin: 5px 0 0;
}
.section-title > small {
  margin-left: auto;
  color: var(--muted);
  font-size: 10px;
  text-align: right;
  line-height: 1.6;
  flex: 0 0 auto;
  max-width: 180px;
}
.story-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}
.story-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 16px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 14px;
  transition:
    border-color 0.16s,
    box-shadow 0.16s;
}
.story-card:hover {
  border-color: #a9bfff;
  box-shadow: 0 5px 18px #3264f50a;
}
.story-card__top {
  display: flex;
  align-items: start;
  gap: 14px;
  min-width: 0;
}
.story-card__heading {
  min-width: 0;
  flex: 1;
}
.story-card__meta {
  display: flex;
  gap: 6px 8px;
  align-items: center;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--muted);
}
.story-card h3 {
  margin: 9px 0 7px;
  font-size: 19px;
  font-weight: 650;
  line-height: 1.5;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
}
.story-card__entity,
.story-card__sample,
.story-card__sources {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.7;
  overflow-wrap: anywhere;
}
.story-card__sample {
  color: #596f91;
  margin-top: 9px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.story-card__sources {
  margin-top: 8px;
  margin-bottom: 14px;
}
.card-directory {
  display: flex;
  align-items: start;
  gap: 12px;
  margin-top: auto;
  padding-top: 4px;
}
.card-directory > span {
  font-size: 12px;
  color: var(--muted);
  flex: 0 0 auto;
}
.card-directory > div {
  min-width: 0;
  flex: 1;
  padding-top: 4px;
}
.bias-mini {
  display: flex;
  flex-wrap: wrap;
  gap: 5px 10px;
  margin-top: 7px;
}
.bias-mini span,
.bias-help-legend span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #657a9b;
  font-size: 11px;
  line-height: 1.5;
}
.bias-mini span::before,
.bias-help-legend span::before {
  content: '';
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 1px;
  background: var(--chip-color);
  flex-shrink: 0;
}
.story-card__foot {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid #edf1f8;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px 18px;
}
.story-card__foot > span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--muted);
  font-size: 12px;
}
.story-card__foot svg {
  color: var(--blue);
}
.story-card__foot .card-open {
  margin-left: auto;
  color: var(--blue);
  font-weight: 600;
}
.daily-brief h2 {
  color: var(--ink);
  font-size: 18px;
}
.snapshot-chip {
  color: var(--blue);
  background: #f0f4ff;
  border: 1px solid #dce6ff;
  border-radius: 6px;
  padding: 4px 7px;
  font-size: 10px;
}
.brief-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
}
.brief-grid > span {
  display: grid;
  gap: 4px;
  border: 1px solid #e7edfc;
  background: #f6f9ff;
  border-radius: 8px;
  padding: 12px;
  color: var(--muted);
  font-size: 11px;
}
.brief-grid strong {
  color: var(--blue);
  font-size: 21px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.brief-grid .brief-coverage {
  grid-column: 1 / -1;
}
.status-metrics {
  margin-top: 9px;
}
.status-metrics dd {
  font-size: 12px;
}
.edition-policy {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 12px;
}
.edition-policy span {
  color: var(--blue);
  font-size: 10px;
  padding: 6px;
  border-radius: 5px;
  background: #f0f5ff;
  border: 1px solid #e0e9ff;
}
.topic-cloud {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.topic-cloud a {
  display: flex;
  align-items: center;
  gap: 9px;
  border: 1px solid #e8eefb;
  background: #f8faff;
  border-radius: 8px;
  padding: 11px 9px;
  min-width: 0;
}
.topic-cloud a:hover {
  border-color: #b1c5ff;
}
.topic-cloud svg {
  color: var(--blue);
  flex-shrink: 0;
}
.topic-cloud strong,
.topic-cloud span {
  display: block;
}
.topic-cloud strong {
  font-size: 12px;
}
.topic-cloud span {
  color: var(--muted);
  font-size: 10px;
  margin-top: 4px;
}
.directory-help p {
  color: var(--muted);
  font-size: 13px;
  line-height: 1.8;
}
.bias-help-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 9px 12px;
}
.bias-help-legend span {
  font-size: 12px;
}
.blindspot-list,
.chain-list,
.latest-list {
  display: grid;
}
.blindspot-list a,
.chain-list a,
.latest-list a {
  display: grid;
  gap: 7px;
  padding: 12px 0;
  border-top: 1px solid var(--line);
}
.blindspot-list a:first-child,
.chain-list a:first-child,
.latest-list a:first-child {
  border-top: 0;
  padding-top: 0;
}
.blindspot-list strong,
.chain-list strong,
.latest-list strong {
  font-size: 16px;
  line-height: 1.6;
  font-weight: 600;
  overflow-wrap: anywhere;
}
.blindspot-list a:hover strong,
.chain-list a:hover strong,
.latest-list a:hover strong {
  color: var(--blue);
}
.blindspot-list span,
.chain-list small,
.latest-list small,
.latest-list > a > span {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.6;
}
.source-leaders {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}
.source-leaders span {
  display: inline-flex;
  gap: 7px;
  color: #64799a;
  background: #f0f4fb;
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 12px;
}
.source-leaders strong {
  color: var(--blue);
}
:deep(.event-cover) {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  border-radius: 10px;
  background: #eaf0fc;
}
:deep(.event-cover--large) {
  width: 100%;
  min-height: 260px;
  height: 100%;
  aspect-ratio: 16 / 10;
}
:deep(.event-cover--card) {
  flex: 0 0 94px;
  width: 94px;
  height: 82px;
}
:deep(.event-cover__image-blur) {
  display: none;
}
:deep(.event-cover__image) {
  position: absolute;
  width: 100%;
  height: 100%;
  object-fit: cover;
  inset: 0;
  opacity: 0;
  transition: opacity 0.2s;
}
:deep(.event-cover.image-loaded .event-cover__image) {
  opacity: 1;
}
:deep(.event-cover__map),
:deep(.event-cover__signal),
:deep(.event-cover__rings) {
  position: absolute;
  pointer-events: none;
}
:deep(.event-cover__signal) {
  width: 40%;
  aspect-ratio: 1;
  top: 12%;
  right: 15%;
  border: 1px solid #b9cafa;
  border-radius: 50%;
  box-shadow:
    0 0 0 16px #dce6fb80,
    0 0 0 34px #e2eafb80;
}
:deep(.event-cover.image-loaded .event-cover__signal) {
  display: none;
}
:deep(.event-cover__label) {
  position: absolute;
  inset: auto 0 0;
  padding: 18px;
  color: #61799f;
  background: #edf3fd;
}
:deep(.event-cover__label span),
:deep(.event-cover__label small) {
  display: block;
  font-size: 12px;
  line-height: 1.5;
}
:deep(.event-cover__label strong) {
  display: block;
  font-size: 25px;
  margin: 5px 0;
}
:deep(.event-cover.image-loaded .event-cover__label) {
  background: #15243cbf;
  color: #fff;
  padding: 8px 12px;
}
:deep(.event-cover.image-loaded .event-cover__label > span),
:deep(.event-cover.image-loaded .event-cover__label > strong) {
  display: none;
}
:deep(.event-cover--card .event-cover__label) {
  padding: 7px;
}
:deep(.event-cover--card .event-cover__label strong) {
  font-size: 14px;
}
:deep(.event-cover--card .event-cover__label small) {
  display: none;
}
:deep(.event-cover--card.image-loaded .event-cover__label) {
  padding: 4px;
}
:deep(.event-cover--card.image-loaded .event-cover__label small) {
  display: block;
  font-size: 10px;
  line-height: 1.3;
}
:deep(.bias-meter__bar) {
  display: flex;
  height: 7px;
  width: 100%;
  overflow: hidden;
  border-radius: 2px;
  background: #eef2f8;
}
:deep(.bias-meter__bar > span) {
  display: block;
  flex-shrink: 1;
  min-width: 0;
}
:deep(.bias-meter.compact .bias-meter__bar) {
  height: 5px;
}
:deep(.bias-meter__legend) {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  color: var(--muted);
  font-size: 12px;
  margin-top: 7px;
}
.home-loading,
.home-error {
  border: 1px solid var(--line);
  border-radius: 16px;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 64px 24px;
  color: var(--muted);
}
.home-loading > svg,
.home-error > svg {
  color: var(--blue);
}
.home-error strong {
  color: var(--ink);
}
.home-error p {
  overflow-wrap: anywhere;
  max-width: 100%;
}
.empty-state {
  padding: 20px 0;
  margin: 0;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.7;
}
.refresh-error {
  border: 1px solid #f5d3a2;
  border-radius: 10px;
  background: #fff9ef;
  padding: 12px;
  font-size: 12px;
  color: #825214;
}
.refresh-error button {
  color: var(--blue);
  background: transparent;
  border: 0;
}
.spinning {
  animation: spin 1.2s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
@media (min-width: 1800px) {
  .story-card h3 {
    font-size: 21px;
  }
  .story-card__meta {
    font-size: 13px;
  }
  .story-card {
    padding: 18px;
  }
  :deep(.event-cover--card) {
    flex-basis: 108px;
    width: 108px;
    height: 90px;
  }
}
@media (max-width: 1250px) {
  .ground-home {
    padding-inline: 22px;
  }
  .home-layout {
    grid-template-columns: minmax(0, 1fr) 290px;
    gap: 22px 18px;
  }
  .lead-feature {
    gap: 18px;
    padding: 18px;
    grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
  }
  .lead-title {
    font-size: 27px;
  }
  :deep(.event-cover--large) {
    min-height: 240px;
  }
  .story-card__top {
    flex-direction: column;
  }
  :deep(.event-cover--card) {
    flex-basis: auto;
    width: 100%;
    height: 120px;
  }
  .section-title > small {
    max-width: 120px;
  }
}
@media (max-width: 1000px) {
  .home-layout {
    grid-template-columns: minmax(0, 1fr);
  }
  .home-primary {
    grid-column: 1;
    grid-row: 1;
  }
  .overview-rail {
    grid-column: 1;
    grid-row: 2;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .overview-rail .workspace-cta {
    grid-column: 1 / -1;
  }
  .section-stack {
    grid-column: 1;
    grid-row: 3;
  }
  .right-rail {
    grid-column: 1;
    grid-row: 4;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }
  .hero-actions {
    gap: 8px;
  }
  .primary-link,
  .ghost-link {
    padding: 10px 12px;
    font-size: 12px;
  }
  .home-heading h1 {
    font-size: 26px;
  }
  .home-heading {
    gap: 12px;
  }
  .home-heading p {
    font-size: 12px;
  }
  .story-card__top {
    flex-direction: row;
  }
  :deep(.event-cover--card) {
    flex: 0 0 94px;
    width: 94px;
    height: 82px;
  }
  .section-nav {
    gap: 4px;
  }
}
@media (max-width: 640px) {
  .ground-home {
    padding: 60px 14px 32px;
  }
  .ground-subnav {
    gap: 16px;
    min-height: 50px;
    margin-bottom: 18px;
  }
  .ground-subnav > span {
    font-size: 10px;
  }
  .ground-subnav a {
    font-size: 12px;
  }
  .home-hero {
    grid-template-columns: minmax(0, 1fr);
    gap: 14px;
  }
  .hero-actions {
    justify-content: flex-start;
  }
  .heading-icon {
    height: 44px;
    width: 44px;
  }
  .home-heading h1 {
    font-size: 24px;
  }
  .freshness-banner {
    padding: 10px 12px;
    font-size: 11px;
    align-items: start;
  }
  .freshness-banner svg {
    flex-shrink: 0;
  }
  .freshness-banner strong {
    flex: 1;
  }
  .freshness-banner > span {
    width: 100%;
    margin-left: 26px;
  }
  .section-nav {
    top: 56px;
    margin-bottom: 14px;
    padding: 0 6px;
  }
  .section-nav button {
    padding: 13px 8px 10px;
    font-size: 12px;
  }
  .section-nav small {
    display: none;
  }
  .lead-feature {
    grid-template-columns: minmax(0, 1fr);
    padding: 14px;
    gap: 12px;
  }
  :deep(.event-cover--large) {
    min-height: 0;
    aspect-ratio: 16 / 9;
    height: auto;
  }
  .lead-title {
    font-size: 29px;
    margin-top: 10px;
  }
  .lead-brief {
    margin-top: 5px;
  }
  .front-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .front-column__list {
    height: 248px;
  }
  .overview-rail,
  .right-rail {
    grid-template-columns: minmax(0, 1fr);
  }
  .story-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
  }
  .story-card__top {
    gap: 12px;
  }
  .story-card h3 {
    font-size: 19px;
  }
  .section-title {
    gap: 10px;
    flex-wrap: wrap;
  }
  .section-title h2 {
    font-size: 21px;
  }
  .section-title > small {
    max-width: none;
    width: calc(100% - 54px);
    text-align: left;
    margin-left: 54px;
  }
  .section-title p {
    font-size: 11px;
  }
  .card-directory {
    gap: 8px;
  }
  .story-card__foot {
    gap: 8px 12px;
  }
  .rail-card {
    padding: 16px;
  }
}
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
