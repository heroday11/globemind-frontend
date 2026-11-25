<script setup>
import { computed, nextTick, ref, useId, watch } from 'vue'
import { ChevronDown, Mail } from 'lucide-vue-next'
import {
  BRIEFING_CADENCE_OPTIONS, BRIEFING_WEEKDAY_OPTIONS, BRIEFING_TIME_RANGE_OPTIONS,
  BRIEFING_PERSPECTIVE_OPTIONS, briefingCadenceLabel,
} from './model.js'

const props = defineProps({
  email: { type: String, default: '' },
  editing: Boolean,
  conversational: Boolean,
  busy: Boolean,
  error: { type: String, default: '' },
})
const form = defineModel({ required: true })
const emit = defineEmits(['submit', 'close'])
const expanded = ref(false)
const runtimeExpanded = ref(false)
const runtimeId = useId()
const timezoneId = useId()
const topicField = ref(null)
const timezoneField = ref(null)
const zoneInvalid = ref(false)
const weekday = computed(() => BRIEFING_WEEKDAY_OPTIONS.find(item => item.value === form.value.day_of_week)?.label)
const zone = computed(() => form.value.timezone === 'Asia/Shanghai' ? '北京时间' : form.value.timezone)
const runtime = computed(() => {
  const { cadence, time_of_day, interval_hours } = form.value
  if (cadence === 'daily') return `每天 ${time_of_day}（${zone.value}）`
  if (cadence === 'weekly') return `每${weekday.value} ${time_of_day}（${zone.value}）`
  if (cadence === 'custom_hours') return `每 ${interval_hours} 小时`
  return briefingCadenceLabel(cadence)
})
const range = computed(() => BRIEFING_TIME_RANGE_OPTIONS.find(item => item.value === form.value.time_range)?.label || form.value.time_range)
const emailSummary = computed(() => {
  if (form.value.send_email === null) return '按账号的自动投递设置发送'
  if (!form.value.send_email) return '不会发送邮件'
  return props.email ? `简报生成后发送至 ${props.email}` : '简报生成后发送至账号绑定邮箱'
})
watch(() => form.value.timezone, () => { zoneInvalid.value = false })
watch(form, () => { runtimeExpanded.value = false })

async function revealInvalidField(event) {
  if (props.conversational ? runtimeExpanded.value : expanded.value) return
  event.preventDefault()
  if (props.conversational) runtimeExpanded.value = true
  else expanded.value = true
  await nextTick()
  event.target.reportValidity()
}

async function submit() {
  if (!form.value.topic.trim()) {
    topicField.value?.focus()
    return
  }
  try {
    new Intl.DateTimeFormat('zh-CN', { timeZone: form.value.timezone.trim() })
  } catch {
    zoneInvalid.value = true
    if (props.conversational) runtimeExpanded.value = true
    else expanded.value = true
    await nextTick()
    timezoneField.value?.focus()
    return
  }
  emit('submit')
}
</script>

<template>
  <form class="briefing-form" :class="{ 'draft-form': conversational }" @submit.prevent="submit">
    <div class="form-body">
      <fieldset :disabled="busy">
        <label class="topic">关注主题
          <input ref="topicField" v-model="form.topic" required maxlength="300"
            placeholder="例如，全球半导体出口管制" />
        </label>
        <button v-if="!conversational" class="settings" type="button" :aria-expanded="expanded" @click="expanded = !expanded">
          <ChevronDown :size="17" :class="{ rotated: expanded }" aria-hidden="true" />
          {{ expanded ? '收起设置' : '修改设置' }}
        </button>
        <label v-show="conversational || expanded" class="prompt">补充要求
          <textarea v-model="form.prompt" maxlength="6000" rows="2" />
        </label>
        <div v-show="conversational || expanded" class="fields">
          <label>任务名称<input v-model="form.title" maxlength="160" placeholder="默认沿用关注主题" /></label>
          <div v-if="conversational" class="setting">
            <span :id="runtimeId + '-label'">运行时间</span>
            <button class="runtime-toggle" type="button" :aria-expanded="runtimeExpanded" :aria-controls="runtimeId"
              :aria-labelledby="runtimeId + '-label ' + runtimeId + '-value'" @click="runtimeExpanded = !runtimeExpanded">
              <span :id="runtimeId + '-value'">{{ runtime }}</span>
              <ChevronDown :size="15" :class="{ rotated: runtimeExpanded }" aria-hidden="true" />
            </button>
          </div>
          <div v-show="!conversational || runtimeExpanded" :id="runtimeId" class="runtime-editor" @invalid.capture="revealInvalidField">
            <label>运行频率<select v-model="form.cadence">
              <option v-for="item in BRIEFING_CADENCE_OPTIONS" :key="item.value" :value="item.value">{{ item.label }}</option>
            </select></label>
            <label v-if="form.cadence === 'weekly'">运行日<select v-model.number="form.day_of_week">
              <option v-for="item in BRIEFING_WEEKDAY_OPTIONS" :key="item.value" :value="item.value">{{ item.label }}</option>
            </select></label>
            <label v-if="['daily', 'weekly'].includes(form.cadence)">运行时间<input v-model="form.time_of_day" type="time" required /></label>
            <label v-if="form.cadence === 'custom_hours'">间隔小时<input v-model.number="form.interval_hours" type="number" min="6" max="720" required /></label>
            <label>时区<input ref="timezoneField" v-model.trim="form.timezone" :list="timezoneId" maxlength="80" required :aria-invalid="zoneInvalid || undefined" />
              <datalist :id="timezoneId">
                <option v-for="item in ['Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Tokyo', 'Europe/London', 'America/New_York', 'UTC']" :key="item" :value="item" />
              </datalist>
              <span v-if="zoneInvalid" class="error" role="alert">请输入有效时区，例如 Asia/Shanghai。</span>
            </label>
          </div>
          <label>调查范围<select v-model="form.time_range">
            <option v-if="!BRIEFING_TIME_RANGE_OPTIONS.some(item => item.value === form.time_range)" :value="form.time_range">{{ form.time_range }}</option>
            <option v-for="item in BRIEFING_TIME_RANGE_OPTIONS" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select></label>
          <label class="enabled">
            <span v-if="conversational">启用状态</span>
            <span class="check"><input v-model="form.enabled" type="checkbox" />
              {{ conversational ? (form.enabled ? '启用' : '暂停') : '启用任务' }}
            </span>
          </label>
          <label>邮件投递<select v-model="form.send_email">
            <option v-if="editing" :value="null">跟随账号设置</option>
            <option :value="false">关闭</option><option :value="true">发送到账号绑定邮箱</option>
          </select></label>
          <label v-if="conversational">
            <span class="check"><input v-model="form.include_sources" type="checkbox" />引用来源</span>
          </label>
          <label v-if="conversational">
            <span class="check"><input v-model="form.include_charts" type="checkbox" />包含图表</span>
          </label>
          <div v-if="conversational" class="setting">
            <span>保存位置</span>
            <span class="destination">简报目录</span>
          </div>
          <label>研判视角
            <select v-model="form.perspective">
              <option v-if="!BRIEFING_PERSPECTIVE_OPTIONS.some(item => item.value === form.perspective)" :value="form.perspective">{{ form.perspective }}</option>
              <option v-for="item in BRIEFING_PERSPECTIVE_OPTIONS" :key="item.value" :value="item.value">{{ item.label }}</option>
            </select>
          </label>
        </div>
        <dl v-if="!conversational" class="summary">
          <div><dt>运行时间</dt><dd>{{ runtime }}</dd></div>
          <div><dt>调查范围</dt><dd>{{ range }}</dd></div>
          <div><dt>启用状态</dt><dd>{{ form.enabled ? '启用' : '暂停' }}</dd></div>
          <div><dt>邮件投递</dt><dd><Mail v-if="form.send_email" :size="15" aria-hidden="true" />{{ emailSummary }}</dd></div>
        </dl>
      </fieldset>
    </div>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <div class="actions">
      <button type="button" class="cancel" :disabled="busy" @click="emit('close')">{{ conversational ? '返回对话' : '取消' }}</button>
      <button type="submit" class="primary" :disabled="busy || !form.topic.trim()">{{ busy ? '正在保存…' : editing ? '保存修改' : conversational ? '确认创建' : '创建定期简报' }}</button>
    </div>
  </form>
</template>

<style scoped>
.briefing-form fieldset { padding: 0; margin: 0; border: 0; min-width: 0; }
.briefing-form label { display: grid; gap: 6px; font-size: .875em; font-weight: 600; }
.briefing-form .topic { font-size: 1em; }
.briefing-form input:not([type=checkbox]), .briefing-form select, .briefing-form textarea {
  width: 100%; min-width: 0; padding: 8px 10px; border: 1px solid #cdd6df; border-radius: 6px;
  background: var(--briefing-surface, #fff); color: inherit; font: inherit; font-weight: 400;
}
.briefing-form .topic input { min-height: 44px; }
.briefing-form textarea { resize: vertical; }
.settings, .actions button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; border-radius: 6px; font: inherit; cursor: pointer; }
.settings { margin: 12px 0 2px; padding: 7px 0; border: 0; background: transparent; color: var(--briefing-accent, #135a72); }
.rotated { transform: rotate(180deg); }
.fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; padding: 12px 0; }
.runtime-editor { display: contents; }
.check { display: flex; align-items: center; gap: 7px; padding: 8px 0; }
.enabled { align-self: end; }
.summary { margin: 12px 0 0; padding: 9px 12px; border-radius: 6px; background: var(--briefing-muted-bg, #f2f6f8); font-size: .875em; }
.summary div { display: grid; grid-template-columns: 5em minmax(0, 1fr); gap: 8px; padding: 3px 0; }
.summary dt { color: var(--briefing-muted, #526575); }
.summary dd { display: flex; align-items: baseline; gap: 6px; margin: 0; overflow-wrap: anywhere; white-space: pre-wrap; }
.summary svg { flex: none; align-self: center; }
.actions { display: flex; justify-content: end; gap: 8px; margin-top: 16px; }
.actions button { padding: 8px 13px; border: 1px solid transparent; }
.actions button:disabled { opacity: .55; cursor: default; }
.primary { background: var(--briefing-accent, #135a72); color: #fff; }
.actions .cancel { border-color: #cdd6df; background: transparent; color: inherit; }
.error { color: var(--briefing-error, #ab2424); }
@media (max-width: 480px) { .fields { grid-template-columns: minmax(0, 1fr); } }

.draft-form {
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.draft-form .form-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
  padding: 2px var(--briefing-padding) 4px;
}
.draft-form .topic, .draft-form .prompt { font-size: .9375em; }
.draft-form .prompt { margin-top: 14px; }
.draft-form textarea {
  height: clamp(104px, 30dvh, 264px);
  line-height: 1.6;
  overflow: auto;
  overscroll-behavior: contain;
  resize: none;
}
.draft-form .fields {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  align-items: start;
  gap: 10px 14px;
  margin-top: 14px;
  padding: 12px;
  border-radius: 8px;
  background: var(--briefing-muted-bg);
}
.draft-form .fields label, .setting {
  display: grid;
  align-self: start;
  gap: 4px;
  min-width: 0;
  color: var(--briefing-muted);
  font-size: .8125em;
  font-weight: 600;
}
.draft-form .fields input, .draft-form .fields select,
.runtime-toggle, .destination, .draft-form .check {
  min-height: 36px;
  color: #172d36;
  font-weight: 400;
}
.draft-form .fields input[type=checkbox] { min-height: auto; accent-color: var(--briefing-accent); }
.draft-form .check { padding: 0 4px; cursor: pointer; }
.runtime-toggle, .destination { display: flex; align-items: center; }
.runtime-toggle {
  justify-content: space-between;
  gap: 4px;
  padding: 5px 8px;
  border: 1px solid #cdd6df;
  border-radius: 6px;
  background: #fff;
  text-align: start;
  cursor: pointer;
}
.runtime-toggle span { overflow-wrap: anywhere; }
.runtime-toggle svg { flex: none; }
.draft-form .runtime-editor {
  display: grid;
  grid-row: 3;
  grid-column: 1 / -1;
  grid-template-columns: inherit;
  gap: inherit;
  padding-top: 10px;
  border-top: 1px solid #cdd6df;
}
.draft-form > .error { margin: 4px var(--briefing-padding) 0; }
.draft-form .actions {
  flex: none;
  margin: 0;
  padding: 12px var(--briefing-padding) 16px;
  background: #fff;
}
.draft-form .actions button { min-height: 42px; font-weight: 600; }
@media (max-width: 700px) {
  .draft-form .fields { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .draft-form .runtime-editor { grid-row: 5; }
}
</style>
