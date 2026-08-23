<template>
  <main class="source-page">
    <header class="source-hero">
      <RouterLink class="back-link" to="/data-service/ground-news">Ground News 首页</RouterLink>
      <span class="eyebrow">Source Profile</span>
      <h1>{{ profile.source_name || profile.domain }}</h1>
      <p>{{ profile.domain }} · {{ profile.country || '未知地区' }} · {{ sourceTypeLabel(profile.source_type) }}</p>
    </header>

    <section v-if="loading" class="state-card">正在加载来源画像...</section>
    <section v-else-if="error" class="state-card error">{{ error }}</section>

    <template v-else>
      <section class="source-layout">
        <aside class="profile-panel">
          <article>
            <span>Bias</span>
            <strong>{{ biasLabel(profile.political_leaning) }}</strong>
            <small>{{ profile.review_status || 'missing' }}</small>
          </article>
          <article>
            <span>Factuality</span>
            <strong>{{ credibilityLabel(profile.credibility_tier) }}</strong>
            <small>{{ profile.label_confidence || 'confidence unknown' }}</small>
          </article>
          <article>
            <span>Ownership</span>
            <strong>{{ ownershipLabel(profile.ownership_type) }}</strong>
            <small>{{ profile.geo_alignment || 'geo unknown' }}</small>
          </article>
          <a v-if="profile.evidence_url" class="evidence-link" :href="profile.evidence_url" target="_blank" rel="noopener">
            查看评级证据
          </a>
        </aside>

        <section class="source-main">
          <article class="note-card">
            <div class="block-head">
              <span>Methodology</span>
              <small>{{ formatDate(profile.updated_at) }}</small>
            </div>
            <p>{{ profile.evidence_note || '该来源还没有完整方法论说明，当前展示来自 media_source_profile 的结构化字段。' }}</p>
          </article>

          <article class="story-block">
            <div class="block-head">
              <span>参与过的 Story</span>
              <small>{{ stories.length }}</small>
            </div>
            <div class="story-grid">
              <RouterLink v-for="story in stories" :key="story.cluster_id" class="story-card" :to="storyPath(story)">
                <strong>{{ story.display_title }}</strong>
                <small>{{ familyLabel(story.event_family) }} · {{ story.article_count }} 新闻 · {{ story.source_count }} 信源</small>
              </RouterLink>
            </div>
          </article>

          <article class="story-block">
            <div class="block-head">
              <span>近期报道</span>
              <small>{{ recentArticles.length }}</small>
            </div>
            <div class="article-list">
              <a v-for="item in recentArticles" :key="item.news_id" :href="item.url" target="_blank" rel="noopener">
                <span>{{ formatDate(item.published_at) }}</span>
                <strong>{{ item.title }}</strong>
              </a>
            </div>
          </article>

          <article class="story-block">
            <div class="block-head">
              <span>相似来源</span>
              <small>{{ similarSources.length }}</small>
            </div>
            <div class="source-grid">
              <RouterLink v-for="source in similarSources" :key="source.domain" class="peer-card" :to="sourcePath(source.domain)">
                <strong>{{ source.source_name || source.domain }}</strong>
                <small>{{ biasLabel(source.political_leaning) }} · {{ credibilityLabel(source.credibility_tier) }}</small>
              </RouterLink>
            </div>
          </article>
        </section>
      </section>
    </template>
  </main>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { groundNewsApi } from '@/features/ground-news/index.js'

const route = useRoute()
const loading = ref(false)
const error = ref('')
const data = ref({})

const domain = computed(() => String(route.params.domain || ''))
const profile = computed(() => data.value.profile || {})
const stories = computed(() => data.value.stories || [])
const recentArticles = computed(() => data.value.recent_articles || [])
const similarSources = computed(() => data.value.similar_sources || [])

watch(() => route.params.domain, () => {
  void load()
})

onMounted(() => {
  void load()
})

async function load() {
  if (!domain.value) return
  loading.value = true
  error.value = ''
  try {
    data.value = await groundNewsApi.getSource(domain.value)
  } catch (err) {
    error.value = err?.response?.data?.detail || err?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function storyPath(story) {
  return { path: '/data-service/ground-news-desk', query: { cluster_id: story.cluster_id } }
}

function sourcePath(value) {
  return `/data-service/ground-news-source/${encodeURIComponent(value || '')}`
}

function formatDate(value) {
  return value ? String(value).slice(0, 10) : '无日期'
}

function biasLabel(value) {
  const labels = {
    left: '左翼',
    center_left: '偏左',
    center: '中间',
    center_right: '偏右',
    right: '右翼',
    state_aligned: '国家立场',
    unknown: '未评级',
  }
  return labels[value] || String(value || '未评级').replaceAll('_', ' / ')
}

function credibilityLabel(value) {
  const labels = { high: '高可信', medium: '中等可信', low: '低可信', unknown: '未知' }
  return labels[value] || biasLabel(value)
}

function ownershipLabel(value) {
  const labels = {
    public: '公共机构',
    private: '私营',
    state: '国有',
    government: '政府',
    wire_service: '通讯社',
    nonprofit: '非营利',
    unknown: '未知',
  }
  return labels[value] || biasLabel(value)
}

function sourceTypeLabel(value) {
  return String(value || 'unknown').replaceAll('_', ' / ')
}

function familyLabel(value) {
  const labels = { diplomacy: '外交', military_security: '安全', economic_trade: '经贸', technology_industry: '科技', domestic_politics: '政治' }
  return labels[value] || sourceTypeLabel(value)
}
</script>

<style scoped>
.source-page {
  --ink: #121a21;
  --muted: #697682;
  --line: rgba(28, 42, 52, 0.15);
  --paper: #fffaf0;
  --navy: #102234;
  --green: #12624d;
  --serif: "Noto Serif CJK SC", "Source Han Serif SC", "Songti SC", Georgia, serif;
  --sans: "Noto Sans CJK SC", "Source Han Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
  min-height: 100vh;
  padding: 92px 22px 40px;
  background: linear-gradient(115deg, #fffaf0, #eef5f0 62%, #f4efe4);
  color: var(--ink);
  font-family: var(--sans);
}

.source-hero,
.source-layout,
.state-card {
  max-width: 1360px;
  margin: 0 auto;
}

.source-hero {
  margin-bottom: 18px;
}

.back-link,
.eyebrow,
.block-head,
.profile-panel span {
  color: #8b6a38;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  text-decoration: none;
}

.source-hero h1 {
  margin: 8px 0;
  font-family: var(--serif);
  font-size: clamp(42px, 6vw, 86px);
  line-height: 0.95;
  letter-spacing: -0.045em;
}

.source-hero p {
  color: var(--muted);
}

.source-layout {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.profile-panel,
.source-main {
  display: grid;
  gap: 12px;
}

.profile-panel article,
.note-card,
.story-block,
.state-card {
  border: 1px solid var(--line);
  border-radius: 24px;
  padding: 16px;
  background: rgba(255, 250, 240, 0.88);
  box-shadow: 0 18px 44px rgba(64, 78, 88, 0.1);
}

.profile-panel strong {
  display: block;
  margin: 6px 0;
  font-family: var(--serif);
  font-size: 30px;
  line-height: 1;
}

.profile-panel small,
.note-card p,
.story-card small,
.peer-card small,
.article-list span {
  color: var(--muted);
}

.evidence-link {
  border-radius: 999px;
  padding: 10px 12px;
  background: var(--navy);
  color: #fffaf0;
  text-align: center;
  text-decoration: none;
  font-weight: 900;
}

.block-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}

.story-grid,
.source-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 10px;
}

.story-card,
.peer-card,
.article-list a {
  border: 1px solid rgba(16, 34, 52, 0.12);
  border-radius: 18px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.62);
  color: inherit;
  display: grid;
  gap: 6px;
  text-decoration: none;
}

.article-list {
  display: grid;
  gap: 9px;
}

.story-card strong,
.peer-card strong,
.article-list strong {
  line-height: 1.35;
}

@media (max-width: 900px) {
  .source-page {
    padding: 76px 12px 24px;
  }

  .source-layout {
    grid-template-columns: 1fr;
  }
}
</style>
