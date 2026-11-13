<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import ImagePreview from './ImagePreview.vue'
import { imageJson, imageStateText } from './imageApi'
const props = defineProps({ busy: { type: Boolean, default: false } })
const emit = defineEmits(['edit', 'retry', 'deliver'])
const jobs = ref([]), error = ref(''), hasMore = ref(false), moreBusy = ref(false)
let timer, stopped = false
async function refresh() {
  try {
    const latest = await imageJson('jobs')
    if (!jobs.value.length) hasMore.value = latest.length === 100
    const ids = new Set(latest.map(job => job.id))
    jobs.value = [...latest, ...jobs.value.filter(job => !ids.has(job.id))]
    error.value = ''
  }
  catch (e) { error.value = e.message }
  if (!stopped) timer = setTimeout(refresh, 5000)
}
async function loadMore() {
  moreBusy.value = true
  try {
    const rows = await imageJson('jobs?before=' + jobs.value.at(-1).created_at)
    const ids = new Set(jobs.value.map(job => job.id))
    jobs.value.push(...rows.filter(job => !ids.has(job.id)))
    hasMore.value = rows.length === 100
  } catch(e) { error.value = e.message }
  finally { moreBusy.value = false }
}
onMounted(refresh)
onBeforeUnmount(() => { stopped = true; clearTimeout(timer) })
</script>
<template>
  <section class="image-jobs" aria-label="图片任务与归档">
    <p v-if="error" role="alert">{{ error }}</p>
    <p v-if="!jobs.length && !error">生成的图片会自动保存在这里。</p>
    <article v-for="job in jobs" :key="job.id" class="image-job">
      <div class="image-job-title"><strong>{{ job.request.prompt }}</strong><span>{{ imageStateText(job.state) }}</span></div>
      <p class="image-job-meta">{{ job.request.size }} · {{ job.request.quality }} · {{ job.outputs.length }}/{{ job.request.count }} 张 · 额度 ¥{{ job.quota_cny }} · 供应商记录 ${{ job.provider_cost_usd }}{{ job.provider_cost_complete ? '' : '（部分费用待确认）' }}</p>
      <p v-if="job.error && job.state !== 'done'" class="image-job-error">{{ job.error }}</p>
      <div class="image-job-grid">
        <ImagePreview v-for="output in job.outputs" :key="output.index" :output="output">
          <button type="button" @click="emit('edit', { job, output })">继续编辑</button>
        </ImagePreview>
      </div>
      <p>{{ job.notice }}</p>
      <details><summary>{{ job.fallback_used ? '已使用回退，查看原因和调用记录' : '查看模型与调用记录' }}</summary>
        <ol><li v-for="(attempt, index) in job.attempts" :key="index">
          第 {{ attempt.index + 1 }} 张：{{ attempt.provider }} / {{ attempt.model }} · {{ attempt.state }}
          <span v-if="attempt.reason"> · 回退原因：{{ attempt.reason }}</span>
          <span v-if="attempt.error"> · {{ attempt.error_code }}：{{ attempt.error }}</span>
          <span v-if="attempt.task_id"> · 任务 {{ attempt.task_id }}</span>
          · 费用 {{ attempt.cost_usd == null ? '待确认' : '$' + attempt.cost_usd }}
        </li></ol>
      </details>
      <div class="image-job-actions">
        <button type="button" @click="emit('deliver', job)">发送到助手回复</button>
        <button v-if="job.outputs.some(o => o.model === 'gpt-image-2.5-sunburst') && ['done','partial'].includes(job.state)" type="button" :disabled="props.busy" @click="emit('retry', job)">结果不符合要求，使用 eco 重试（再次计费）</button>
      </div>
    </article>
    <button v-if="hasMore" type="button" :disabled="moreBusy" @click="loadMore">加载更早的图片</button>
  </section>
</template>
<style scoped>
.image-job { border: 1px solid #dce3ec; border-radius: 12px; padding: 18px; background: white; margin: 14px 0; font-size: 13px; color: #334155; }
.image-job-title { display: flex; gap: 16px; justify-content: space-between; }
.image-job-title strong { white-space: pre-wrap; overflow-wrap: anywhere; }
.image-job-title span { white-space: nowrap; }
.image-job-meta { color: #64748b; }
.image-job-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr)); gap: 14px; }
.image-job-error { color: #b42318; }
.image-job-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 12px; }
button { padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px; background: white; color: #1d4ed8; cursor: pointer; }
li { margin: 8px 0; overflow-wrap: anywhere; }
</style>
