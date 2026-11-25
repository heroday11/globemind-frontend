<template>
  <div class="ground-home">
    <header class="edition-header" data-tour="ground-news-overview">
      <div class="edition-title">
        <Globe :size="28" aria-hidden="true" />
        <h1>{{ guangdongView ? '粤港澳事件总览' : '全球事件总览' }}</h1>
      </div>
      <div class="edition-actions">
        <button type="button" class="refresh-news" :disabled="loading" @click="refresh" :title="loading ? '刷新中' : '刷新事件流'" aria-label="刷新事件流">
          <RefreshCw :size="17" :class="{ spinning: loading }" />
        </button>
        <RouterLink class="desk-link" to="/data-service/ground-news-desk">
          分析工作台<ArrowRight :size="15" />
        </RouterLink>
      </div>
      <nav class="overview-switch" aria-label="事件总览范围">
        <RouterLink to="/data-service/ground-news" :class="{ selected: !guangdongView }" :aria-current="!guangdongView ? 'page' : undefined">全球事件总览</RouterLink>
        <RouterLink to="/data-service/ground-news-gba" :class="{ selected: guangdongView }" :aria-current="guangdongView ? 'page' : undefined">粤港澳事件总览</RouterLink>
      </nav>
    </header>

    <div data-tour="ground-news-edition">
      <GroundNewsOverview ref="overview" />
    </div>

    <p v-if="loading && !current" class="edition-state" role="status">正在加载事件…</p>
    <div v-else-if="error && !current" class="edition-state" role="alert">
      <span>事件加载失败</span><button type="button" class="desk-link" @click="refresh">重试</button>
    </div>
    <p v-else-if="current && !leadStory" class="edition-state" role="status">当前范围暂无匹配事件</p>

    <main v-else-if="leadStory" class="home-layout">
      <nav class="section-nav" aria-label="新闻栏目">
        <a href="#front-news" @click="jumpToSection($event, 'front-news')">头条</a>
        <a
          v-for="section in storySections"
          :key="section.key"
          :href="'#section-' + section.key"
          @click="jumpToSection($event, 'section-' + section.key)"
        >
          {{ section.title }}
        </a>
      </nav>
      <div class="edition-news">
        <p v-if="error" class="edition-state" role="alert">
          刷新失败 <button type="button" class="desk-link" @click="refresh">重试</button>
        </p>

        <section id="front-news" class="edition-front" aria-label="头条新闻">
          <div class="front-grid">
            <div class="lead-column">
              <article class="lead-feature">
                <RouterLink v-if="hasImage(leadStory)" :to="homeStoryPath(leadStory)" class="lead-cover" :aria-label="leadStory.display_title">
                  <img
                    :key="leadStory.cluster_id"
                    :src="leadStory.cover.image_url"
                    alt=""
                    decoding="async"
                    fetchpriority="high"
                    referrerpolicy="no-referrer"
                    @load="markLeadLoaded(leadStory)"
                    @error="markCoverFailed(leadStory)"
                  />
                </RouterLink>
                <div class="lead-story">
                  <div class="story-meta">
                    <span class="importance">重要性 {{ leadStory.importance }} 分</span>
                    <time :datetime="leadStory.day">{{ homeFormatDate(leadStory.day) }}</time>
                  </div>
                  <h2><RouterLink class="lead-title" :to="homeStoryPath(leadStory)">{{ leadStory.display_title }}</RouterLink></h2>
                  <p v-if="leadSummary" class="lead-summary">{{ leadSummary }}</p>
                  <div class="story-meta">
                    <span v-if="leadStory.locations?.length">{{ leadStory.locations.slice(0, 2).join('、') }}</span>
                    <span>{{ leadStory.article_count }} 篇报道</span>
                    <span>{{ leadStory.source_count }} 个信源</span>
                  </div>
                </div>
              </article>
              <section v-if="moreStories.length" class="news-column more-news">
                <h2>更多重点</h2>
                <ol class="headline-list">
                  <li v-for="story in moreStories" :key="story.cluster_id">
                    <RouterLink :to="homeStoryPath(story)" class="front-headline">
                      <strong>{{ story.display_title }}</strong>
                      <small class="story-meta">
                        <time :datetime="story.day">{{ homeFormatDate(story.day) }}</time>
                        <span>{{ story.source_count }} 个信源</span>
                        <span class="importance">{{ story.importance }} 分</span>
                      </small>
                    </RouterLink>
                  </li>
                </ol>
              </section>
            </div>

            <section v-if="frontLatestStories.length" class="news-column">
              <h2><Newspaper :size="19" />重点快讯</h2>
              <ol class="headline-list">
                <li v-for="story in frontLatestStories" :key="story.cluster_id">
                  <RouterLink :to="homeStoryPath(story)" class="front-headline">
                    <strong>{{ story.display_title }}</strong>
                    <small class="story-meta">
                      <time :datetime="story.day">{{ homeFormatDate(story.day) }}</time>
                      <span>{{ story.source_count }} 个信源</span>
                      <span class="importance">{{ story.importance }} 分</span>
                    </small>
                  </RouterLink>
                </li>
              </ol>
            </section>
          </div>
        </section>

        <section
          v-for="section in storySections"
          :id="'section-' + section.key"
          :key="section.key"
          class="story-section"
          :aria-labelledby="'heading-' + section.key"
        >
          <header class="section-heading">
            <h2 :id="'heading-' + section.key">{{ section.title }}</h2>
            <span>{{ homeFormatNumber(section.count ?? section.stories.length) }} 件收录</span>
          </header>
          <div class="story-grid">
            <RouterLink v-for="story in section.stories" :key="story.cluster_id" :to="homeStoryPath(story)" class="story-card">
              <img
                v-if="hasImage(story)"
                :src="story.cover.image_url"
                alt=""
                loading="lazy"
                decoding="async"
                referrerpolicy="no-referrer"
                @error="markCoverFailed(story)"
              />
              <div class="story-card-copy">
                <div class="story-meta">
                  <time :datetime="story.day">{{ homeFormatDate(story.day) }}</time>
                  <span class="importance">{{ story.importance }} 分</span>
                </div>
                <h3>{{ story.display_title }}</h3>
                <div class="story-meta story-card-footer">
                  <span v-if="story.source_names?.length">{{ story.source_names[0] }}</span>
                  <span>{{ story.source_count }} 个信源</span>
                </div>
              </div>
            </RouterLink>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ArrowRight, Globe, Newspaper, RefreshCw } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import {
  buildGroundNewsHomeModel,
  GroundNewsOverview,
  homeFormatDate,
  homeFormatNumber,
  homeSampleTitle,
  homeStoryPath,
} from '@/features/ground-news/index.js'

const route = useRoute()
const guangdongView = computed(() => route.query.country === 'CN' && route.query.place === 'region-chn-1180')
const overview = ref(null)
const current = computed(() => overview.value?.current)
const loading = computed(() => overview.value?.loading ?? true)
const error = computed(() => overview.value?.error)
const failedCovers = ref(new Set())
const loadedCovers = new Set()
const homeModel = computed(() => buildGroundNewsHomeModel(current.value, failedCovers.value))
const leadStory = computed(() => homeModel.value.leadStory)
const frontLatestStories = computed(() => homeModel.value.frontLatestStories)
const moreStories = computed(() => homeModel.value.frontWeekStories)
const storySections = computed(() => homeModel.value.storySections)
const leadSummary = computed(() => {
  const title = homeSampleTitle(leadStory.value)
  return title === leadStory.value?.display_title ? '' : title
})

function refresh() {
  void overview.value?.refresh()
}

function jumpToSection(event, id) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  const section = document.getElementById(id)
  if (!section) return
  event.preventDefault()
  section.scrollIntoView({ block: 'start' })
  window.history.replaceState(window.history.state, '', '#' + id)
}

function hasImage(story) {
  return Boolean(story.cover?.image_url && !failedCovers.value.has(story.cluster_id))
}

function markCoverFailed(story) {
  if (failedCovers.value.has(story.cluster_id)) return
  failedCovers.value = new Set([...failedCovers.value, story.cluster_id])
}

function markLeadLoaded(story) {
  loadedCovers.add(story.cluster_id)
}

watch(leadStory, (story, _previous, onCleanup) => {
  if (!story || !hasImage(story) || loadedCovers.has(story.cluster_id)) return
  const timer = window.setTimeout(() => {
    if (!loadedCovers.has(story.cluster_id)) markCoverFailed(story)
  }, 6500)
  onCleanup(() => window.clearTimeout(timer))
}, { flush: 'post' })
</script>

<style scoped>
:global(.app-shell:has(.ground-home)) { overflow-x: clip; }
.ground-home {
  --news-ink: #172d3e;
  --news-muted: #526778;
  --news-line: #dce6ed;
  --news-link: #235499;
  --news-accent: #14685b;
  min-height: 100vh;
  padding: 78px 28px 52px;
  background: #f6f8fb;
  color: var(--news-ink);
  font-family: Inter, "Noto Sans CJK SC", "PingFang SC", "Microsoft YaHei", sans-serif;
}
.ground-home *, .ground-home *::before, .ground-home *::after { box-sizing: border-box; }
.ground-home a { color: inherit; text-decoration: none; }
.ground-home button,
.ground-home .overview-switch a,
.ground-home .section-nav a { min-height: 44px; }
.ground-home a:focus-visible, .ground-home button:focus-visible { outline: 2px solid var(--news-link); outline-offset: 3px; }
.edition-header, .home-layout, .edition-state { width: min(100%, 1380px); margin: 0 auto; }
.edition-header { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 14px; margin-bottom: 12px; }
.edition-title, .edition-actions, .desk-link, .refresh-news, .news-column h2 { display: flex; align-items: center; gap: 8px; }
.edition-title { gap: 10px; }
.edition-title svg { flex: none; color: var(--news-link); }
.edition-title h1 { margin: 0; font-size: 29px; line-height: 1.15; }
.desk-link, .refresh-news {
  justify-content: center;
  min-height: 44px;
  padding: 0 12px;
  border: 1px solid var(--news-line);
  border-radius: 7px;
  background: white;
  color: var(--news-link);
  font: inherit;
  font-size: 14px;
  font-weight: 650;
  white-space: nowrap;
  cursor: pointer;
}
.refresh-news { width: 44px; padding: 0; }
.refresh-news:disabled { opacity: .6; cursor: progress; }
.desk-link:hover, .refresh-news:not(:disabled):hover { background: #e9f1f8; }
.spinning { animation: news-spin 1s linear infinite; }
@keyframes news-spin { to { transform: rotate(360deg); } }
.overview-switch { display: flex; flex-wrap: wrap; grid-column: 1 / -1; gap: 6px; }
.overview-switch a { display: flex; align-items: center; padding: 0 13px; border-radius: 7px; font-size: 14px; font-weight: 650; }
.overview-switch a.selected { color: white; background: var(--news-link); }
.overview-switch a:not(.selected):hover { background: #e9f0f8; }
.edition-state { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; padding: 14px 0; color: var(--news-muted); }
.home-layout { display: grid; grid-template-columns: minmax(105px, .15fr) minmax(0, 1fr); gap: 22px; align-items: start; }
.ground-home .section-nav {
  position: sticky;
  top: 70px;
  display: grid;
  min-width: 0;
  gap: 3px;
  padding-right: 12px;
  border-right: 1px solid var(--news-line);
}
.section-nav a { display: flex; align-items: center; padding: 0 10px; color: var(--news-link); font-size: 14px; font-weight: 650; }
.section-nav a:hover, .section-nav a:focus-visible { background: #e9f0f8; border-radius: 6px; }
.edition-news { min-width: 0; }
.edition-front, .story-section { scroll-margin-top: 130px; }
.front-grid { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: 20px; align-items: start; }
.front-grid:has(.lead-column:only-child) { grid-template-columns: minmax(0, 1fr); }
.lead-feature, .story-card { min-width: 0; background: #fff; border: 1px solid var(--news-line); border-radius: 8px; overflow: hidden; }
.lead-cover { display: block; }
.lead-cover img, .story-card img { display: block; width: 100%; height: auto; object-fit: cover; background: #e8eef3; }
.lead-cover img { aspect-ratio: 2.6 / 1; max-height: 260px; }
.lead-story { padding: 14px 15px; }
.lead-story h2 { margin: 7px 0; font-size: 22px; line-height: 1.24; overflow-wrap: anywhere; }
.lead-summary { margin: 6px 0 10px; color: var(--news-muted); font-size: 14px; line-height: 1.5; }
.story-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; color: var(--news-muted); font-size: 12px; line-height: 1.45; }
.importance { color: var(--news-accent); font-weight: 700; }
.news-column h2, .section-heading h2 { margin: 0; font-size: 19px; line-height: 1.2; }
.headline-list { list-style: none; padding: 0; margin: 6px 0 0; }
.headline-list li { min-width: 0; border-bottom: 1px solid var(--news-line); }
.front-headline { display: grid; align-content: center; gap: 3px; min-height: 48px; padding: 7px 0; font-size: 14px; line-height: 1.35; overflow-wrap: anywhere; }
.more-news { margin-top: 16px; }
.more-news .headline-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 16px; }
.story-section { margin-top: 24px; border-top: 2px solid #3c6575; }
.section-heading { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px; padding: 11px 0 8px; }
.section-heading span { color: var(--news-muted); font-size: 13px; }
.story-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
.story-card { display: flex; flex-direction: column; }
.story-card:hover, .lead-feature a:hover, .front-headline:hover { color: var(--news-link); }
.story-card img { aspect-ratio: 2.4 / 1; }
.story-card-copy { display: flex; flex-direction: column; flex: 1; padding: 9px 10px; }
.story-card h3 { margin: 5px 0 7px; font-size: 14px; line-height: 1.4; overflow-wrap: anywhere; }
.story-card-footer { margin-top: auto; }
@media (max-width: 1050px) {
  .story-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@media (max-width: 760px) {
  .ground-home { padding: 68px 14px 36px; }
  .edition-title h1 { font-size: 24px; }
  .home-layout, .front-grid { grid-template-columns: minmax(0, 1fr); gap: 12px; }
  .ground-home .section-nav {
    display: flex;
    top: 57px;
    gap: 0;
    z-index: 3;
    padding-right: 0;
    overflow-x: auto;
    border-right: 0;
    border-bottom: 1px solid var(--news-line);
    background: #f6f8fb;
  }
  .section-nav a { flex: 0 0 auto; }
  .more-news .headline-list, .story-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 380px) {
  .edition-header { grid-template-columns: minmax(0, 1fr); gap: 7px; }
  .story-grid { grid-template-columns: minmax(0, 1fr); }
}
@media (prefers-reduced-motion: reduce) {
  .spinning { animation: none; }
}
</style>
