<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { CalendarClock, MessageCircle, Plus } from 'lucide-vue-next'
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

async function openReport(row) {
  const file = row.last_file
  const token = getToken()
  await rowAction(row, async () => {
    const response = await api.downloadWorkspaceFile(file.workspace, file.file_name)
    const blob = await response.blob()
    if (getToken() === token) triggerBrowserDownload(blob, file.file_name)
  })
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
  <main class="briefings">
    <RouterLink class="back" to="/data-assistant">返回数据助手</RouterLink>
    <header>
      <h1>定期简报</h1>
      <div v-if="signedIn && schedules.length" class="entries">
        <button class="primary" type="button" @click="openForm()"><Plus :size="18" aria-hidden="true" />新建定期简报</button>
        <RouterLink class="secondary" :to="{ name: 'DataAssistant', query: { skill: 'create-periodic-briefing' } }"><MessageCircle :size="16" aria-hidden="true" />与助手对话创建</RouterLink>
      </div>
    </header>

    <p v-if="loading" role="status">正在加载定期简报…</p>
    <div v-else-if="error" role="alert"><p>{{ error }}</p><button type="button" class="secondary" @click="load">重试</button></div>
    <template v-else>
      <template v-if="!schedules.length">
        <div class="intro">
          <p>选一个想持续关注的话题，数据助手会定时调查，生成不超过200字的简报，保存到你的简报目录。</p>
          <p>例如，每天早上8:30跟踪全球半导体出口管制，了解过去24小时的新变化。</p>
        </div>
        <section class="empty">
          <CalendarClock :size="28" aria-hidden="true" />
          <h2>创建第一份定期简报</h2>
          <div v-if="signedIn" class="entries">
            <button class="primary" type="button" @click="openForm()"><Plus :size="18" aria-hidden="true" />新建定期简报</button>
            <RouterLink class="secondary" :to="{ name: 'DataAssistant', query: { skill: 'create-periodic-briefing' } }"><MessageCircle :size="16" aria-hidden="true" />与助手对话创建</RouterLink>
          </div>
          <button v-else type="button" class="primary" @click="showLogin = true">登录后创建</button>
        </section>
      </template>
      <template v-else>
        <p v-if="actionError && !dialog?.open" role="alert">{{ actionError }}</p>
        <ul class="tasks" aria-label="简报任务">
          <li v-for="row in schedules" :id="`briefing-${row.id}`" :key="row.id" tabindex="-1" :class="{ selected: row.id === selected }">
            <div class="task-heading">
              <h2>{{ row.title }}</h2>
              <span :class="row.enabled ? 'on' : 'off'">{{ row.enabled ? '已启用' : '已暂停' }}</span>
            </div>
            <p v-if="row.topic !== row.title" class="topic-line">{{ row.topic }}</p>
            <dl>
              <div><dt>频率</dt><dd>{{ briefingCadenceLabel(row.cadence) }}</dd></div>
              <div><dt>下次运行</dt><dd>{{ row.enabled ? formatTime(row.next_run_at, row.timezone) : '—' }}</dd></div>
              <div><dt>最近简报</dt><dd>{{ row.last_file ? formatTime(row.last_file.created_at || row.last_run_at, row.timezone) : '尚未生成' }}</dd></div>
            </dl>
            <div class="row-actions">
              <button v-if="row.last_file?.file_name" class="secondary" type="button" :disabled="Boolean(working)" @click="openReport(row)">下载最近简报</button>
              <button class="secondary" type="button" :disabled="Boolean(working)" @click="openForm(row)">编辑</button>
              <button class="secondary" type="button" :disabled="Boolean(working)" @click="toggle(row)">{{ row.enabled ? '暂停' : '启用' }}</button>
            </div>
          </li>
        </ul>
        <details>
          <summary>使用说明</summary>
          <div class="intro">
            <p>选一个想持续关注的话题，数据助手会定时调查，生成不超过200字的简报，保存到你的简报目录。</p>
            <p>例如，每天早上8:30跟踪全球半导体出口管制，了解过去24小时的新变化。</p>
          </div>
        </details>
      </template>
    </template>

    <dialog ref="dialog" aria-labelledby="briefing-form-heading" @cancel.prevent="!busy && dialog.close()" @close="form = null">
      <h2 id="briefing-form-heading">{{ editing ? '编辑定期简报' : '新建定期简报' }}</h2>
      <BriefingForm v-if="form" v-model="form" :editing="Boolean(editing)" :email="email" :busy="busy" :error="actionError"
        @close="dialog.close()" @submit="save" />
    </dialog>
    <LoginModal :visible="showLogin" @close="showLogin = false" />
  </main>
</template>

<style scoped>
.briefings {
  --briefing-accent: #135a72; --briefing-muted: #526575; --briefing-muted-bg: #f2f6f8;
  width: min(100% - 36px, 1060px); margin: 64px auto 0; padding: 24px 0 48px;
  color: var(--text-primary, #1d2932);
}
.back, details summary { color: var(--briefing-accent); cursor: pointer; }
header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin: 13px 0 18px; }
h1 { font-size: 1.75em; font-weight: 680; margin: 0; }
h2 { font-size: 1.1em; font-weight: 650; margin: 0; overflow-wrap: anywhere; }
.entries, .row-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.primary, .secondary { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 13px; border-radius: 6px; border: 1px solid transparent; text-decoration: none; cursor: pointer; font: inherit; }
.primary { background: var(--briefing-accent); color: white; }
.secondary { border-color: #cdd6df; color: var(--briefing-accent); background: transparent; }
.secondary:disabled { opacity: .55; cursor: default; }
.intro { max-width: 46em; line-height: 1.75; }
.intro p { margin: 0 0 8px; }
.empty { display: grid; justify-items: start; gap: 12px; border-top: 1px solid #dbe3e8; padding: 24px 0; margin-top: 22px; }
.empty > svg { color: var(--briefing-accent); }
.tasks { padding: 0; margin: 0 0 18px; list-style: none; }
.tasks li { padding: 15px 12px; border-top: 1px solid #dbe3e8; }
.tasks li:last-child { border-bottom: 1px solid #dbe3e8; }
.tasks .selected { background: var(--briefing-muted-bg); }
.task-heading { display: flex; align-items: center; flex-wrap: wrap; gap: 6px 12px; }
.on, .off { font-size: .85em; }
.on { color: #17623d; }
.off, .topic-line, dt { color: var(--briefing-muted); }
.topic-line { margin: 4px 0 0; overflow-wrap: anywhere; }
dl { display: flex; flex-wrap: wrap; gap: 6px 22px; margin: 9px 0 12px; font-size: .9em; }
dl div { display: flex; flex-wrap: wrap; gap: 6px; }
dd { margin: 0; }
.row-actions { font-size: .875em; }
details .intro { margin-top: 8px; }
dialog { width: min(100% - 24px, 560px); max-height: calc(100dvh - 32px); padding: 20px; border: 1px solid #dbe3e8; border-radius: 8px; color: inherit; }
dialog h2 { margin-bottom: 14px; }
dialog::backdrop { background: #18253066; }
</style>
