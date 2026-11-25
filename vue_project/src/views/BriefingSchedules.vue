<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { CalendarClock, Ellipsis, ListChecks, MessageCircle, Plus, X } from 'lucide-vue-next'
import { createAssistantApi, assistantErrorText } from '@/features/assistant/api.js'
import { createBriefingScheduleForm, buildBriefingSchedulePayload, briefingCadenceLabel } from '@/features/assistant/briefing/model.js'
import { createBriefingScheduleService } from '@/features/assistant/briefing/service.js'
import { triggerBrowserDownload } from '@/features/assistant/workspace/download.js'
import { getCurrentUser, getToken, getAuthChangedEventName } from '@/utils/auth.js'
import LoginModal from '@/components/LoginModal.vue'
import BriefingForm from '@/features/assistant/briefing/BriefingForm.vue'

const route = useRoute()
const api = createAssistantApi()
const service = createBriefingScheduleService(api)
const schedules = ref([])
const loading = ref(true)
const signedIn = ref(false)
const showLogin = ref(false)
const email = ref('')
const error = ref('')
const actionError = ref('')
const editing = ref(null)
const form = ref(null)
const dialog = ref(null)
const busy = ref(false)
const working = ref('')
const selected = ref('')
const moreMenu = ref('')
const reportDialog = ref(null)
const report = ref(null)
const reportError = ref('')
let generation = 0
let createRequestId = ''

async function load() {
  const request = ++generation
  const token = getToken()
  signedIn.value = Boolean(token)
  email.value = getCurrentUser()?.email || ''
  error.value = ''
  if (!token) {
    loading.value = false
    schedules.value = []
    return
  }
  loading.value = true
  try {
    const rows = await service.list()
    if (generation !== request) return
    schedules.value = rows
  } catch (failure) {
    if (generation === request) error.value = assistantErrorText(failure, '读取定期简报失败')
  } finally {
    if (generation === request) loading.value = false
  }
}
async function focusSchedule(id) {
  selected.value = String(id || '')
  if (selected.value) {
    await nextTick()
    document.getElementById(`briefing-${selected.value}`)?.focus()
  }
}
watch([() => route.query.task, loading], ([id, pending]) => {
  if (!pending && id) void focusSchedule(id)
})
function authChanged() {
  form.value = null
  dialog.value?.close()
  reportDialog.value?.close()
  report.value = null
  moreMenu.value = ''
  showLogin.value = false
  schedules.value = []
  void load()
}
onMounted(() => {
  window.addEventListener(getAuthChangedEventName(), authChanged)
  void load()
})
onBeforeUnmount(() => {
  generation++
  window.removeEventListener(getAuthChangedEventName(), authChanged)
})

async function openForm(row = null) {
  if (!signedIn.value) {
    showLogin.value = true
    return
  }
  editing.value = row
  createRequestId = row ? '' : crypto.randomUUID()
  actionError.value = ''
  form.value = createBriefingScheduleForm(row)
  await nextTick()
  if (!dialog.value?.open) dialog.value?.showModal()
}

async function save() {
  if (busy.value) return
  busy.value = true
  actionError.value = ''
  const token = getToken()
  try {
    const saved = await service.save(editing.value?.id, {
      ...buildBriefingSchedulePayload(form.value, editing.value || {}),
      ...(editing.value ? {} : { create_request_id: createRequestId }),
    })
    if (getToken() !== token) return
    dialog.value?.close()
    await load()
    await focusSchedule(saved.id)
  } catch (failure) {
    if (getToken() === token) actionError.value = assistantErrorText(failure, '保存定期简报失败')
  } finally {
    busy.value = false
  }
}

async function rowAction(row, action) {
  if (working.value) return
  moreMenu.value = ''
  working.value = row.id
  actionError.value = ''
  const token = getToken()
  try {
    await action()
    if (getToken() === token) await load()
  } catch (failure) {
    if (getToken() === token) actionError.value = assistantErrorText(failure)
  } finally {
    working.value = ''
  }
}

function toggle(row) {
  return rowAction(row, () => service.save(row.id, buildBriefingSchedulePayload({ ...createBriefingScheduleForm(row), enabled: !row.enabled }, row)))
}

function startBriefingSkill() {
  window.top.postMessage({ channel: 'globemind-page-v1', type: 'start-briefing-skill' }, location.origin)
}

function remove(row) {
  if (window.confirm(`删除定期简报「${row.title}」？`)) {
    void rowAction(row, () => service.remove(row.id))
  }
}

async function openReport(row) {
  if (working.value || !row.last_file?.file_name) return
  const file = row.last_file
  const token = getToken()
  moreMenu.value = ''
  working.value = row.id
  reportError.value = ''
  report.value = { title: row.title, file, content: '' }
  reportDialog.value?.showModal()
  try {
    const response = await api.readWorkspaceFile(file.workspace, file.file_name)
    if (getToken() === token && reportDialog.value?.open) report.value.content = response.data?.content || ''
  } catch (failure) {
    if (getToken() === token) reportError.value = assistantErrorText(failure, '读取简报失败')
  } finally {
    working.value = ''
  }
}

async function downloadReport() {
  const file = report.value?.file
  if (!file) return
  const token = getToken()
  reportError.value = ''
  try {
    const response = await api.downloadWorkspaceFile(file.workspace, file.file_name)
    const blob = await response.blob()
    if (getToken() === token) triggerBrowserDownload(blob, file.file_name)
  } catch (failure) {
    if (getToken() === token) reportError.value = assistantErrorText(failure, '下载简报失败')
  }
}

function formatTime(value, timeZone) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) return '—'
  try {
    return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(date)
  } catch {
    return date.toLocaleString('zh-CN')
  }
}
</script>

<template>
  <main class="briefings" @click="moreMenu = ''" @keydown.esc="moreMenu = ''">
    <header class="briefing-header">
      <div class="overview">
        <span class="overview-icon"><ListChecks :size="28" aria-hidden="true" /></span>
        <div class="overview-copy">
          <p class="section-label" aria-hidden="true">定期简报</p>
          <h1>定期简报</h1>
          <p class="intro">选一个想持续关注的话题，数据助手会定时调查，生成不超过200字的简报，保存到你的简报目录。</p>
          <p class="example">例如，每天早上8:30跟踪全球半导体出口管制，了解过去24小时的新变化。</p>
        </div>
      </div>
      <section v-if="signedIn || !loading" class="creation-card" aria-labelledby="briefing-create-heading">
        <span class="creation-icon"><CalendarClock :size="18" aria-hidden="true" /></span>
        <h2 id="briefing-create-heading">{{ !loading && !error && !schedules.length ? '创建第一份定期简报' : '创建定期简报' }}</h2>
        <div class="entries">
          <template v-if="signedIn">
            <button class="primary" type="button" @click="openForm()"><Plus :size="17" aria-hidden="true" />新建定期简报</button>
            <button class="secondary" type="button" @click="startBriefingSkill"><MessageCircle :size="16" aria-hidden="true" />与助手对话创建</button>
          </template>
          <button v-else type="button" class="primary" @click="showLogin = true">登录后创建</button>
        </div>
      </section>
    </header>

    <section class="task-section" aria-labelledby="briefing-tasks-heading">
      <h2 id="briefing-tasks-heading">简报任务<span v-if="!loading && !error"> · {{ schedules.length }} 项</span></h2>
      <p v-if="loading" class="list-message" role="status">正在加载定期简报…</p>
      <div v-else-if="error" class="list-message" role="alert"><p>{{ error }}</p><button type="button" class="secondary" @click="load">重试</button></div>
      <p v-else-if="!schedules.length" class="list-message">暂无定期简报</p>
      <template v-else>
        <p v-if="actionError && !dialog?.open" role="alert">{{ actionError }}</p>
        <div class="task-columns" aria-hidden="true"><span>主题</span><span>执行周期</span><span>启用状态</span><span>下次运行时间</span><span>操作</span></div>
        <ul class="tasks">
          <li v-for="row in schedules" :id="`briefing-${row.id}`" :key="row.id" tabindex="-1" :class="{ selected: row.id === selected }">
            <div class="topic">
              <h3>{{ row.topic || row.title }}</h3>
              <p v-if="row.title && row.topic && row.topic !== row.title">{{ row.title }}</p>
            </div>
            <div class="task-cell"><span class="mobile-label">执行周期</span>{{ briefingCadenceLabel(row.cadence) }}</div>
            <div class="task-cell"><span class="mobile-label">启用状态</span><span :class="row.enabled ? 'on' : 'off'">{{ row.enabled ? '已启用' : '已暂停' }}</span></div>
            <div class="task-cell"><span class="mobile-label">下次运行时间</span>{{ row.enabled ? formatTime(row.next_run_at, row.timezone) : '—' }}</div>
            <div class="row-actions">
              <button class="action-link" type="button" :disabled="!row.last_file?.file_name || Boolean(working)"
                :title="row.last_file?.file_name ? undefined : '尚未生成简报'" @click="openReport(row)">查看简报</button>
              <div class="more" @click.stop>
                <button class="action-link" type="button" :aria-expanded="moreMenu === row.id" :aria-controls="`actions-${row.id}`"
                  :disabled="Boolean(working)" @click="moreMenu = moreMenu === row.id ? '' : row.id">
                  <Ellipsis :size="16" aria-hidden="true" />更多
                </button>
                <div v-if="moreMenu === row.id" :id="`actions-${row.id}`" class="more-actions">
                  <button type="button" @click="moreMenu = ''; openForm(row)">编辑</button>
                  <button type="button" @click="toggle(row)">{{ row.enabled ? '暂停' : '启用' }}</button>
                  <button type="button" :disabled="row.last_status === 'running'" @click="rowAction(row, () => service.run(row.id))">立即执行</button>
                  <button type="button" class="destructive" @click="moreMenu = ''; remove(row)">删除</button>
                </div>
              </div>
            </div>
          </li>
        </ul>

      </template>
    </section>

    <dialog ref="dialog" aria-labelledby="briefing-form-heading" @cancel.prevent="!busy && dialog.close()" @close="form = null">
      <h2 id="briefing-form-heading">{{ editing ? '编辑定期简报' : '新建定期简报' }}</h2>
      <BriefingForm v-if="form" v-model="form" :editing="Boolean(editing)" :email="email" :busy="busy" :error="actionError"
        @close="dialog.close()" @submit="save" />
    </dialog>
    <dialog ref="reportDialog" class="report-dialog" aria-labelledby="briefing-report-heading" @close="report = null">
      <header class="report-heading">
        <h2 id="briefing-report-heading">{{ report?.title }}</h2>
        <button class="action-link" type="button" aria-label="关闭简报" title="关闭简报" @click="reportDialog.close()"><X :size="20" aria-hidden="true" /></button>
      </header>
      <p v-if="reportError" role="alert">{{ reportError }}</p>
      <p v-else-if="working && !report?.content" role="status">正在读取简报…</p>
      <pre v-else-if="report?.content">{{ report.content }}</pre>
      <button v-if="report" class="secondary" type="button" @click="downloadReport">下载简报</button>
    </dialog>
    <LoginModal :visible="showLogin" @close="showLogin = false" />
  </main>
</template>

<style scoped>
.briefings {
  --briefing-accent: #135a72; --briefing-muted: #526575; --briefing-muted-bg: #f2f6f8;
  width: min(85%, 1280px); margin: 0 auto; padding: 24px 0 36px;
  color: var(--text-primary, #1d2932);
}
.briefing-header {
  display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: start; gap: 24px;
  padding-bottom: 30px;
}
.overview { display: grid; grid-template-columns: 54px minmax(0, 1fr); align-items: start; gap: 14px; }
.overview-icon, .creation-icon { display: grid; place-items: center; }
.overview-icon { width: 54px; height: 54px; border-radius: 12px; background: #e7f1ff; color: #1768e5; }
.section-label { margin: 0 0 4px; color: #1768e5; font-size: .85em; font-weight: 650; line-height: 1.35; }
h1, h2, h3 { margin: 0; line-height: 1.35; font-weight: 650; overflow-wrap: anywhere; }
h1 { font-size: 1.85em; }
.creation-card {
  display: grid; grid-template-columns: 49.5px minmax(0, 1fr); align-items: center; gap: 13px 15px;
  justify-self: end; box-sizing: border-box; max-width: 100%; padding: 26px 33px;
  border: 1px solid #dbe3e8; border-radius: 8px; background: #fff; font-size: 1.65em;
}
.creation-icon { width: 49.5px; height: 49.5px; border-radius: 10px; background: #e5f3f4; color: var(--briefing-accent); }
.creation-icon svg { width: 30px; height: 30px; }
.creation-card h2 { font-size: 1em; }
h2 { font-size: 1.1em; }
h3 { font-size: 1em; }
.entries { display: flex; flex-wrap: wrap; grid-column: 2; gap: 13px; }
.primary, .secondary, .action-link {
  display: inline-flex; align-items: center; justify-content: center; gap: 5px; min-height: 34px;
  padding: 6px 10px; border-radius: 6px; border: 1px solid transparent; cursor: pointer; font: inherit;
}
.entries button {
  max-width: 100%; min-height: 56px; padding: 10px 16.5px; border-radius: 10px; gap: 8px;
  overflow-wrap: anywhere;
}
.entries button svg { width: 26.5px; height: 26.5px; flex: none; }
.entries .primary svg { width: 28px; height: 28px; }
.primary { background: var(--briefing-accent); color: white; }
.secondary { border-color: #cdd6df; color: var(--briefing-accent); background: transparent; }
.action-link { padding-inline: 4px; background: transparent; color: var(--briefing-accent); }
.action-link:hover:not(:disabled) { background: var(--briefing-muted-bg); }
button:disabled { opacity: .55; cursor: default; }
.intro, .example { max-width: 46em; margin: 8px 0 0; color: var(--briefing-muted); line-height: 1.65; }
.example { position: relative; font-size: .9em; }
.example::before {
  position: absolute; inset: .15em auto .15em -8px; width: 2px; background: #bbd7fb; content: '';
}
.task-section { border-top: 1px solid #dbe3e8; }
.task-section > h2 { padding: 14px 0; }
.task-section > h2 span { color: var(--briefing-muted); font-weight: 450; }
.list-message { margin: 0; padding: 16px 0; border-top: 1px solid #dbe3e8; color: var(--briefing-muted); }
.task-columns, .tasks li {
  display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, .9fr) minmax(0, .85fr) minmax(0, 1.3fr) max-content;
  align-items: center; gap: 12px; padding: 10px 8px; border-top: 1px solid #dbe3e8;
}
.task-columns { color: var(--briefing-muted); font-size: .85em; }
.task-columns span:last-child { min-width: 115px; text-align: right; }
.tasks { padding: 0; margin: 0 0 14px; list-style: none; border-bottom: 1px solid #dbe3e8; }
.tasks .selected { background: var(--briefing-muted-bg); }
.topic p { margin: 3px 0 0; color: var(--briefing-muted); font-size: .85em; overflow-wrap: anywhere; }
.task-cell, .row-actions { font-size: .875em; overflow-wrap: anywhere; }
.mobile-label { display: none; }
.on { color: #17623d; }
.off { color: var(--briefing-muted); }
.row-actions { display: flex; justify-content: end; gap: 4px; min-width: 115px; }
.more { position: relative; }
.more-actions {
  position: absolute; z-index: 2; right: 0; top: 100%; display: grid; min-width: 106px;
  padding: 4px; border: 1px solid #dbe3e8; border-radius: 6px; background: #fff; box-shadow: 0 4px 12px #1825301f;
}
.more-actions button { padding: 7px 9px; border: 0; background: transparent; text-align: left; font: inherit; cursor: pointer; }
.more-actions button:hover:not(:disabled) { background: var(--briefing-muted-bg); }
.more-actions .destructive { color: #a42323; }

dialog {
  position: fixed; inset: 0; margin: auto; width: min(100% - 24px, 560px); height: fit-content;
  max-height: calc(100% - 24px); max-height: calc(100dvh - 24px); overflow: auto; overscroll-behavior: contain;
  box-sizing: border-box; padding: 20px; border: 1px solid #dbe3e8; border-radius: 8px; color: inherit;
}
dialog h2 { margin-bottom: 14px; }
dialog::backdrop { background: #18253066; }
.report-dialog { width: min(100% - 24px, 720px); }
.report-heading { display: flex; gap: 12px; align-items: start; justify-content: space-between; }
.report-dialog pre { white-space: pre-wrap; overflow-wrap: anywhere; font: inherit; margin: 0 0 16px; }
@media (max-width: 1000px) {
  .briefing-header { grid-template-columns: minmax(0, 1fr); }
  .creation-card { justify-self: start; }
}
@media (max-width: 680px) {
  .task-columns { display: none; }
  .tasks li { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 5px 8px; padding: 10px 0; }
  .topic, .row-actions { grid-column: 1 / -1; }
  .mobile-label { display: block; color: var(--briefing-muted); font-size: .9em; }
  .briefings { width: calc(100% - 24px); }
  .briefing-header { gap: 14px; }
  .creation-card { padding: 20px; }
  .overview { gap: 12px; }
  .entries button { font-size: .875em; padding-inline: 11.5px; }
}
</style>
