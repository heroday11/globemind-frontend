<script setup>
import { onActivated, onMounted, onUnmounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { API_PREFIX } from '@/config/api'
import { getAuthChangedEventName, getToken } from '@/utils/auth'
import { getFavoritesMap } from '@/utils/reportFavorites'

const router = useRouter()
const loading = ref(true)
const items = ref([])
const infoBanner = ref('')
const searchText = ref('')

const FAV_EVENT = 'reportFavoritesUpdated'

function formatApiDetail(data) {
  const d = data?.detail
  if (typeof d === 'string') return d
  if (Array.isArray(d)) return d.map((x) => x.msg || JSON.stringify(x)).join('; ')
  return ''
}

function collectLocalFavorites() {
  const map = getFavoritesMap()
  const byId = new Map()
  for (const topic of Object.keys(map || {})) {
    const list = map[topic]
    if (!Array.isArray(list)) continue
    for (const x of list) {
      const id = Number(x?.id)
      if (!Number.isFinite(id)) continue
      const title = String(x?.title || '').trim()
      const prev = byId.get(id)
      if (!prev || (!prev.title && title)) {
        byId.set(id, {
          id,
          title: title || prev?.title || '',
          topic: String(topic || '').trim() || '新闻分析主题',
        })
      }
    }
  }
  return Array.from(byId.values())
}

async function fetchArticleTitle(newsId, token) {
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  try {
    const r = await fetch(`${API_PREFIX}/article/${newsId}`, { headers })
    if (!r.ok) return ''
    const d = await r.json()
    return String(d?.title || '').trim()
  } catch {
    return ''
  }
}

async function fillMissingTitles(rows, token) {
  const need = rows.filter((r) => !r.title)
  const chunk = 6
  for (let i = 0; i < need.length; i += chunk) {
    const part = need.slice(i, i + chunk)
    await Promise.all(
      part.map(async (r) => {
        const t = await fetchArticleTitle(r.id, token)
        r.title = t || `新闻 #${r.id}`
      }),
    )
  }
}

async function load() {
  loading.value = true
  infoBanner.value = ''
  items.value = []

  const token = getToken()
  const localEntries = collectLocalFavorites()
  const localById = new Map(localEntries.map((e) => [e.id, e]))

  let serverIds = []
  if (token) {
    try {
      const res = await fetch(`${API_PREFIX}/user/favorites`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        serverIds = Array.isArray(data.news_ids)
          ? data.news_ids.map(Number).filter(Number.isFinite)
          : []
      } else if (res.status === 401) {
        infoBanner.value = '登录状态无效，已仅展示本机在数据搜索中保存的收藏。请重新登录以同步服务器数据。'
      } else {
        const msg = formatApiDetail(data) || `HTTP ${res.status}`
        infoBanner.value = `服务器收藏列表暂不可用（${msg}），已改为展示本机收藏。`
      }
    } catch (e) {
      infoBanner.value = `无法连接服务器读取收藏：${e?.message || e}。已展示本机收藏。`
    }
  } else {
    infoBanner.value =
      '当前未登录：以下为在数据搜索页保存在本浏览器的收藏。登录账号后，收藏会同步到服务器并在多设备可见。'
  }

  const order = []
  const seen = new Set()
  for (const id of serverIds) {
    if (seen.has(id)) continue
    seen.add(id)
    order.push(id)
  }
  for (const e of localEntries) {
    if (seen.has(e.id)) continue
    seen.add(e.id)
    order.push(e.id)
  }

  if (order.length === 0) {
    loading.value = false
    return
  }

  const rows = order.slice(0, 80).map((id) => {
    const loc = localById.get(id)
    return {
      id,
      title: loc?.title || '',
      topic: loc?.topic,
    }
  })

  await fillMissingTitles(rows, token)
  items.value = rows
  loading.value = false
}

const filteredItems = computed(() => {
  if (!searchText.value.trim()) return items.value
  const q = searchText.value.trim().toLowerCase()
  return items.value.filter(
    (r) =>
      r.title.toLowerCase().includes(q) ||
      String(r.id).includes(q) ||
      (r.topic && r.topic.toLowerCase().includes(q)),
  )
})

function openNews(id) {
  router.push(`/data-service/news/${id}`)
}

function onFavoritesUpdated() {
  load()
}

onMounted(() => {
  load()
  window.addEventListener(FAV_EVENT, onFavoritesUpdated)
  window.addEventListener(getAuthChangedEventName(), onFavoritesUpdated)
})

onActivated(() => {
  load()
})

onUnmounted(() => {
  window.removeEventListener(FAV_EVENT, onFavoritesUpdated)
  window.removeEventListener(getAuthChangedEventName(), onFavoritesUpdated)
})
</script>

<template>
  <div class="mc-root">
    <!-- Header -->
    <header class="mc-header">
      <div class="mc-header-body">
        <div class="mc-header-overline">FAVORITES</div>
        <h1 class="mc-header-title">我的收录</h1>
        <p class="mc-header-desc">在<strong>数据搜索</strong>中点击星标保存的资讯，与服务器收藏自动合并</p>
      </div>
      <div class="mc-header-stat" v-if="items.length">
        <span class="mc-header-count">{{ items.length }}</span>
        <span class="mc-header-unit">条收录</span>
      </div>
    </header>

    <!-- Info banner -->
    <div v-if="infoBanner && !loading" class="mc-banner" role="status">
      <svg class="mc-banner-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
      <span>{{ infoBanner }}</span>
    </div>

    <!-- Search -->
    <div class="mc-search-bar" v-if="items.length > 0 && !loading">
      <svg class="mc-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
      <input
        v-model="searchText"
        type="text"
        class="mc-search-input"
        placeholder="搜索标题、ID 或主题…"
      />
    </div>

    <!-- Loading -->
    <div v-if="loading" class="mc-state">
      <div class="mc-state-card">
        <div class="mc-spinner"></div>
        <span class="mc-state-text">加载中…</span>
      </div>
    </div>

    <!-- Empty -->
    <div v-else-if="items.length === 0" class="mc-empty">
      <div class="mc-empty-card">
        <svg class="mc-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
        <h2 class="mc-empty-title">暂无收录</h2>
        <p class="mc-empty-desc">
          在<strong>数据搜索</strong>结果或新闻详情中点击星标收藏；登录后收藏会写入数据库，与此处本地列表合并显示。
        </p>
        <button type="button" class="mc-btn mc-btn--primary" @click="router.push('/data-service/data-search')">
          <span>前往数据搜索</span>
          <svg class="mc-btn-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
      </div>
    </div>

    <!-- List -->
    <div v-else class="mc-list">
      <p class="mc-list-summary" v-if="searchText && filteredItems.length !== items.length">
        筛选结果：{{ filteredItems.length }} / {{ items.length }} 条
      </p>
      <button
        v-for="(row, idx) in filteredItems"
        :key="row.id"
        type="button"
        class="mc-item"
        :style="{ animationDelay: `${idx * 0.03}s` }"
        @click="openNews(row.id)"
      >
        <div class="mc-item-accent"></div>
        <div class="mc-item-body">
          <h3 class="mc-item-title">{{ row.title }}</h3>
          <div class="mc-item-meta">
            <span class="mc-item-id">#{{ row.id }}</span>
            <span v-if="row.topic" class="mc-item-topic">{{ row.topic }}</span>
          </div>
        </div>
        <div class="mc-item-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
        </div>
      </button>
    </div>
  </div>
</template>

<style scoped>
/* ============================================
   DESIGN TOKENS
   ============================================ */
.mc-root {
  --mc-surface: #ffffff;
  --mc-border: #e8e5f0;
  --mc-border-light: #f0edf6;
  --mc-text: #1a1824;
  --mc-text-secondary: #5c5870;
  --mc-text-muted: #8b869e;
  --mc-accent-soft: rgba(91, 114, 223, 0.08);
  --mc-shadow-sm: 0 1px 2px rgba(26, 24, 36, 0.04);
  --mc-shadow: 0 1px 3px rgba(26, 24, 36, 0.04), 0 4px 16px rgba(26, 24, 36, 0.05);
  --mc-radius-sm: 8px;
  --mc-radius: 14px;
  --mc-radius-lg: 20px;
  --mc-transition: 0.22s cubic-bezier(0.33, 1, 0.68, 1);

  width: 100%;
  max-width: 860px;
  margin: 0 auto;
  animation: mc-fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes mc-fade-up {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ---- Header ---- */
.mc-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 24px;
  padding: 30px 34px;
  background: var(--mc-surface);
  border-radius: var(--mc-radius-lg);
  border: 1px solid var(--mc-border);
  box-shadow: var(--mc-shadow);
}

.mc-header-overline {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: var(--uc-accent, #5b72df);
  margin-bottom: 8px;
}

.mc-header-title {
  margin: 0;
  font-size: 1.8rem;
  font-weight: 750;
  color: var(--mc-text);
  letter-spacing: -0.02em;
  line-height: 1.15;
}

.mc-header-desc {
  margin: 6px 0 0;
  font-size: 0.92rem;
  color: var(--mc-text-muted);
  font-weight: 460;
}

.mc-header-desc strong {
  color: var(--mc-text-secondary);
  font-weight: 620;
}

.mc-header-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 22px;
  background: var(--mc-accent-soft);
  border-radius: var(--mc-radius);
  flex-shrink: 0;
}

.mc-header-count {
  font-size: 2rem;
  font-weight: 800;
  color: var(--uc-accent, #5b72df);
  letter-spacing: -0.03em;
  line-height: 1;
}

.mc-header-unit {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--mc-text-secondary);
  margin-top: 4px;
}

/* ---- Banner ---- */
.mc-banner {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 20px;
  padding: 13px 18px;
  font-size: 0.85rem;
  line-height: 1.6;
  font-weight: 500;
  color: var(--mc-text-secondary);
  background: #faf9fd;
  border: 1px solid var(--mc-border);
  border-radius: var(--mc-radius-sm);
  animation: mc-fade-up 0.4s ease both;
}

.mc-banner-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  color: var(--uc-accent, #5b72df);
  opacity: 0.6;
  margin-top: 1px;
}

/* ---- Search ---- */
.mc-search-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
  padding: 10px 16px;
  background: var(--mc-surface);
  border: 1px solid var(--mc-border);
  border-radius: var(--mc-radius);
  box-shadow: var(--mc-shadow-sm);
  transition: border-color var(--mc-transition);
}

.mc-search-bar:focus-within {
  border-color: var(--uc-accent, #5b72df);
  box-shadow: 0 0 0 3px var(--mc-accent-soft);
}

.mc-search-icon {
  width: 17px;
  height: 17px;
  color: var(--mc-text-muted);
  flex-shrink: 0;
}

.mc-search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 0.9rem;
  font-weight: 460;
  color: var(--mc-text);
  font-family: inherit;
}

.mc-search-input::placeholder {
  color: #c4bfd2;
}

/* ---- State ---- */
.mc-state {
  display: flex;
  justify-content: center;
  padding: 48px 0;
}

.mc-state-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 28px;
  background: var(--mc-surface);
  border-radius: var(--mc-radius);
  border: 1px solid var(--mc-border);
  box-shadow: var(--mc-shadow-sm);
}

.mc-spinner {
  width: 18px;
  height: 18px;
  border: 2.5px solid var(--mc-border);
  border-top-color: var(--uc-accent, #5b72df);
  border-radius: 50%;
  animation: mc-spin 0.7s linear infinite;
}

@keyframes mc-spin {
  to { transform: rotate(360deg); }
}

.mc-state-text {
  font-size: 0.9rem;
  font-weight: 560;
  color: var(--mc-text-muted);
}

/* ---- Empty ---- */
.mc-empty {
  animation: mc-fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.08s both;
}

.mc-empty-card {
  background: var(--mc-surface);
  border-radius: var(--mc-radius-lg);
  border: 1px solid var(--mc-border);
  box-shadow: var(--mc-shadow);
  padding: clamp(48px, 8vw, 72px) clamp(24px, 5vw, 48px);
  text-align: center;
}

.mc-empty-icon {
  width: 56px;
  height: 56px;
  color: var(--uc-accent, #5b72df);
  opacity: 0.4;
  margin-bottom: 20px;
}

.mc-empty-title {
  margin: 0 0 12px;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--mc-text);
  letter-spacing: -0.01em;
}

.mc-empty-desc {
  margin: 0 auto 28px;
  max-width: 420px;
  font-size: 0.92rem;
  line-height: 1.65;
  color: var(--mc-text-muted);
}

.mc-empty-desc strong {
  color: var(--mc-text-secondary);
  font-weight: 620;
}

.mc-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 22px;
  border-radius: var(--mc-radius-sm);
  font-size: 0.9rem;
  font-weight: 620;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.18s ease;
}

.mc-btn--primary {
  background: var(--uc-accent, #5b72df);
  color: #fff;
  border: none;
  box-shadow: 0 2px 8px rgba(91, 114, 223, 0.28);
}

.mc-btn--primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(91, 114, 223, 0.34);
}

.mc-btn-arrow {
  width: 16px;
  height: 16px;
  transition: transform 0.2s ease;
}

.mc-btn--primary:hover .mc-btn-arrow {
  transform: translateX(2px);
}

/* ---- List ---- */
.mc-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  animation: mc-fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.06s both;
}

.mc-list-summary {
  margin: 0;
  font-size: 0.82rem;
  color: var(--mc-text-muted);
  font-weight: 500;
  padding: 0 4px 4px;
}

.mc-item {
  display: flex;
  align-items: center;
  width: 100%;
  text-align: left;
  padding: 0;
  border: 1px solid var(--mc-border);
  border-radius: var(--mc-radius);
  background: var(--mc-surface);
  box-shadow: var(--mc-shadow-sm);
  cursor: pointer;
  overflow: hidden;
  transition:
    border-color var(--mc-transition),
    box-shadow var(--mc-transition);
  animation: mc-item-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
  font-family: inherit;
}

@keyframes mc-item-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.mc-item:hover {
  border-color: rgba(91, 114, 223, 0.3);
  box-shadow: var(--mc-shadow);
}

.mc-item-accent {
  width: 3px;
  align-self: stretch;
  flex-shrink: 0;
  background: transparent;
  transition: background var(--mc-transition);
}

.mc-item:hover .mc-item-accent {
  background: var(--uc-accent, #5b72df);
}

.mc-item-body {
  flex: 1;
  padding: 15px 20px;
  min-width: 0;
}

.mc-item-title {
  margin: 0 0 6px;
  font-size: 0.94rem;
  font-weight: 620;
  color: var(--mc-text);
  letter-spacing: -0.01em;
  line-height: 1.45;
}

.mc-item-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.mc-item-id {
  font-size: 0.78rem;
  font-weight: 620;
  color: var(--uc-accent, #5b72df);
  font-variant-numeric: tabular-nums;
}

.mc-item-topic {
  font-size: 0.78rem;
  font-weight: 490;
  color: var(--mc-text-muted);
  padding: 2px 9px;
  background: var(--mc-accent-soft);
  border-radius: 100px;
}

.mc-item-arrow {
  padding: 0 16px;
  color: var(--mc-text-muted);
  opacity: 0;
  transform: translateX(-4px);
  transition: all 0.2s ease;
}

.mc-item:hover .mc-item-arrow {
  opacity: 1;
  transform: translateX(0);
  color: var(--uc-accent, #5b72df);
}

.mc-item-arrow svg {
  width: 18px;
  height: 18px;
}

/* ---- Responsive ---- */
@media (max-width: 640px) {
  .mc-header {
    flex-direction: column;
    padding: 22px 20px;
  }

  .mc-header-stat {
    margin-top: 14px;
    flex-direction: row;
    gap: 8px;
    padding: 8px 16px;
  }

  .mc-header-count {
    font-size: 1.4rem;
  }

  .mc-item-body {
    padding: 14px 16px;
  }
}
</style>
