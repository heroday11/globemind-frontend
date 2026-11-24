<script setup>
import { computed, ref, watch } from 'vue'
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
const topicField = ref(null)
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
function submit() {
  if (!form.value.topic.trim()) {
    topicField.value?.focus()
    return
  }
  try {
    new Intl.DateTimeFormat('zh-CN', { timeZone: form.value.timezone.trim() })
  } catch {
    zoneInvalid.value = true
    expanded.value = true
    return
  }
  emit('submit')
}
</script>

<template>
  <form class="briefing-form" @submit.prevent="submit">
    <fieldset :disabled="busy">
      <label class="topic">关注主题
        <input ref="topicField" v-model="form.topic" required maxlength="300"
          placeholder="例如，全球半导体出口管制" />
      </label>
      <button class="settings" type="button" :aria-expanded="expanded" @click="expanded = !expanded">
        <ChevronDown :size="17" :class="{ rotated: expanded }" aria-hidden="true" />
        {{ expanded ? '收起设置' : '修改设置' }}
      </button>
      <div v-show="expanded" class="fields">
        <label>任务名称<input v-model="form.title" maxlength="160" placeholder="默认沿用关注主题" /></label>
        <label>研判视角
          <select v-model="form.perspective">
            <option v-if="!BRIEFING_PERSPECTIVE_OPTIONS.some(item => item.value === form.perspective)" :value="form.perspective">{{ form.perspective }}</option>
            <option v-for="item in BRIEFING_PERSPECTIVE_OPTIONS" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
        </label>
        <label class="wide">补充要求<textarea v-model="form.prompt" maxlength="6000" rows="2" /></label>
        <label>运行频率<select v-model="form.cadence">
          <option v-for="item in BRIEFING_CADENCE_OPTIONS" :key="item.value" :value="item.value">{{ item.label }}</option>
        </select></label>
        <label v-if="form.cadence === 'weekly'">运行日<select v-model.number="form.day_of_week">
          <option v-for="item in BRIEFING_WEEKDAY_OPTIONS" :key="item.value" :value="item.value">{{ item.label }}</option>
        </select></label>
        <label v-if="['daily', 'weekly'].includes(form.cadence)">运行时间<input v-model="form.time_of_day" type="time" required /></label>
        <label v-if="form.cadence === 'custom_hours'">间隔小时<input v-model.number="form.interval_hours" type="number" min="6" max="720" required /></label>
        <label>时区<input v-model.trim="form.timezone" list="briefing-timezones" maxlength="80" required />
          <datalist id="briefing-timezones">
            <option v-for="item in ['Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Tokyo', 'Europe/London', 'America/New_York', 'UTC']" :key="item" :value="item" />
          </datalist>
          <span v-if="zoneInvalid" class="error" role="alert">请输入有效时区，例如 Asia/Shanghai。</span>
        </label>
        <label>调查范围<select v-model="form.time_range">
          <option v-if="!BRIEFING_TIME_RANGE_OPTIONS.some(item => item.value === form.time_range)" :value="form.time_range">{{ form.time_range }}</option>
          <option v-for="item in BRIEFING_TIME_RANGE_OPTIONS" :key="item.value" :value="item.value">{{ item.label }}</option>
        </select></label>
        <label>邮件投递<select v-model="form.send_email">
          <option v-if="editing" :value="null">跟随账号设置</option>
          <option :value="false">关闭</option><option :value="true">发送到账号绑定邮箱</option>
        </select></label>
        <label class="check"><input v-model="form.enabled" type="checkbox" /> 启用任务</label>
      </div>
      <dl class="summary">
        <div><dt>运行时间</dt><dd>{{ runtime }}</dd></div>
        <div><dt>调查范围</dt><dd>{{ range }}</dd></div>
        <div><dt>启用状态</dt><dd>{{ form.enabled ? '启用' : '暂停' }}</dd></div>
        <div><dt>邮件投递</dt><dd><Mail v-if="form.send_email" :size="15" aria-hidden="true" />{{ emailSummary }}</dd></div>
        <div v-if="conversational"><dt>保存位置</dt><dd>简报目录</dd></div>
        <div v-if="conversational && form.title"><dt>任务名称</dt><dd>{{ form.title }}</dd></div>
        <div v-if="conversational && form.prompt"><dt>补充要求</dt><dd>{{ form.prompt }}</dd></div>
        <div v-if="conversational"><dt>研判视角</dt><dd>{{ form.perspective }}</dd></div>
      </dl>
    </fieldset>
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
.wide { grid-column: 1 / -1; }
.briefing-form .check { display: flex; align-items: center; gap: 7px; align-self: end; padding: 8px 0; }
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
</style>
