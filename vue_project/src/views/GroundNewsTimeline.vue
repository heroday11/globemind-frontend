<template>
  <main class="timeline-page">
    <header class="timeline-hero">
      <RouterLink class="back-link" to="/data-service/ground-news">Ground News 首页</RouterLink>
      <span class="eyebrow">L2 Timeline</span>
      <h1>{{ chain.title || chain.chain_id || '走势链' }}</h1>
      <p>{{ chain.segment_count || nodes.length }} 个节点 · {{ chain.article_count || 0 }} 条新闻 · {{ qualityLabel(chain.chain_quality) }}</p>
    </header>

    <section v-if="loading" class="state-card">正在加载走势链...</section>
    <section v-else-if="error" class="state-card error">{{ error }}</section>

    <section v-else class="timeline-layout">
      <aside class="chain-panel">
        <article>
          <span>Quality</span>
          <strong>{{ qualityLabel(chain.chain_quality) }}</strong>
          <small>{{ qualityPct(chain.quality_score) }}</small>
        </article>
        <article>
          <span>Range</span>
          <strong>{{ formatRange(chain.start_date, chain.end_date) }}</strong>
          <small>{{ chain.family_group || chain.event_family || 'global' }}</small>
        </article>
      </aside>

      <section class="node-list">
        <article v-for="(node, index) in nodes" :key="node.segment_id" class="timeline-node">
          <div class="node-index">{{ node.segment_order || index + 1 }}</div>
          <div class="node-card">
            <div class="node-meta">
              <span>{{ formatRange(node.start_date, node.end_date) }}</span>
              <span>{{ angleLabel(node.story_angle) }}</span>
              <span>{{ node.source_count || 0 }} 信源</span>
            </div>
            <h2>{{ node.display_title }}</h2>
            <p>{{ node.initiator || '未知主体' }} -> {{ node.target || '未知对象' }}</p>
            <div class="bias-bar">
              <span
                v-for="bucket in biasBuckets(node)"
                :key="bucket.key"
                :style="{ width: `${Math.max(bucket.value, bucket.value > 0 ? 3 : 0)}%`, background: bucket.color }"
              />
            </div>
            <div class="node-actions">
              <RouterLink :to="node.detail_url">打开 Story Page</RouterLink>
              <small v-if="node.blindspot?.score">Blindspot {{ Math.round(node.blindspot.score) }}</small>
            </div>
          </div>
          <div v-if="edges[index]" class="edge-note">
            <span>{{ edgeLabel(edges[index].edge_type) }}</span>
            <p>{{ edges[index].relation_reason || '相邻节点存在时间和主题连续性。' }}</p>
          </div>
        </article>
      </section>
    </section>
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

const chainId = computed(() => String(route.params.chain_id || ''))
const chain = computed(() => data.value.chain || {})
const nodes = computed(() => data.value.nodes || [])
const edges = computed(() => data.value.edges || [])

watch(() => route.params.chain_id, () => {
  void load()
})

onMounted(() => {
  void load()
})

async function load() {
  if (!chainId.value) return
  loading.value = true
  error.value = ''
  try {
    data.value = await groundNewsApi.getTimeline(chainId.value)
  } catch (err) {
    error.value = err?.response?.data?.detail || err?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

const biasModel = [
  { key: 'left', color: '#2f7dd1' },
  { key: 'center', color: '#2ca66f' },
  { key: 'right', color: '#d77b2a' },
  { key: 'state_aligned', color: '#7a6a55' },
  { key: 'unknown', color: '#aab3bd' },
]

function biasBuckets(node) {
  const raw = node?.political_group_pct_reviewed_known_sources || {}
  const rows = biasModel.map((bucket) => ({ ...bucket, value: Number(raw[bucket.key] || 0) }))
  const total = rows.reduce((sum, row) => sum + row.value, 0)
  if (!total) return rows.map((row) => ({ ...row, value: row.key === 'unknown' ? 100 : 0 }))
  return rows.map((row) => ({ ...row, value: (row.value / total) * 100 }))
}

function formatRange(start, end) {
  if (!start && !end) return '无日期'
  const left = String(start || end).slice(0, 10)
  const right = String(end || start).slice(0, 10)
  return left === right ? left : `${left} -> ${right}`
}

function qualityPct(value) {
  if (value === null || value === undefined) return '未评分'
  return `${Math.round(Number(value) * 100)}%`
}

function qualityLabel(value) {
  const labels = { strong: '强关联', usable: '可用', weak: '弱关联' }
  return labels[value] || String(value || '未评级')
}

function angleLabel(value) {
  const labels = { main_event: '核心事件', context_update: '背景进展', market_reaction: '市场反应', outcome_reaction: '后续反应', analysis_context: '分析解读' }
  return labels[value] || String(value || '切面').replaceAll('_', ' / ')
}

function edgeLabel(value) {
  const labels = { continuation: '延续', continued: '延续', escalation: '升级', response: '回应', transition: '转折', context: '背景关联', same_thread: '同一线索' }
  return labels[value] || String(value || '关联').replaceAll('_', ' / ')
}
</script>

<style scoped>
.timeline-page {
  --ink: #121a21;
  --muted: #697682;
  --line: rgba(28, 42, 52, 0.15);
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

.timeline-hero,
.timeline-layout,
.state-card {
  max-width: 1360px;
  margin: 0 auto;
}

.timeline-hero {
  margin-bottom: 18px;
}

.back-link,
.eyebrow,
.chain-panel span,
.node-meta,
.edge-note span {
  color: #8b6a38;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  text-decoration: none;
}

.timeline-hero h1 {
  margin: 8px 0;
  max-width: 1060px;
  font-family: var(--serif);
  font-size: clamp(38px, 5.4vw, 78px);
  line-height: 0.98;
  letter-spacing: -0.045em;
}

.timeline-hero p {
  color: var(--muted);
}

.timeline-layout {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.chain-panel {
  display: grid;
  gap: 12px;
}

.chain-panel article,
.state-card,
.node-card,
.edge-note {
  border: 1px solid var(--line);
  border-radius: 24px;
  padding: 16px;
  background: rgba(255, 250, 240, 0.88);
  box-shadow: 0 18px 44px rgba(64, 78, 88, 0.1);
}

.chain-panel strong {
  display: block;
  margin: 6px 0;
  font-family: var(--serif);
  font-size: 28px;
  line-height: 1;
}

.chain-panel small,
.timeline-node p,
.node-actions small,
.edge-note p {
  color: var(--muted);
}

.node-list {
  display: grid;
  gap: 14px;
}

.timeline-node {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 12px;
}

.node-index {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--navy);
  color: #fffaf0;
  font-weight: 900;
}

.node-card h2 {
  margin: 8px 0;
  font-family: var(--serif);
  font-size: clamp(24px, 3vw, 38px);
  line-height: 1.08;
}

.node-meta,
.node-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.bias-bar {
  height: 10px;
  margin: 14px 0;
  border-radius: 999px;
  overflow: hidden;
  display: flex;
  background: #d9dee2;
}

.bias-bar span {
  min-width: 2px;
}

.node-actions {
  align-items: center;
}

.node-actions a {
  border-radius: 999px;
  padding: 9px 12px;
  background: var(--navy);
  color: #fffaf0;
  text-decoration: none;
  font-weight: 900;
}

.edge-note {
  grid-column: 2;
  margin-top: -2px;
  background: rgba(255, 255, 255, 0.62);
}

.edge-note p {
  margin: 5px 0 0;
}

@media (max-width: 900px) {
  .timeline-page {
    padding: 76px 12px 24px;
  }

  .timeline-layout,
  .timeline-node {
    grid-template-columns: 1fr;
  }

  .edge-note {
    grid-column: auto;
  }
}
</style>
