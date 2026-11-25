<script setup>
import { computed, nextTick, ref, useId } from 'vue'

const props = defineProps({
  options: { type: Object, required: true },
  busy: Boolean,
  error: { type: String, default: '' },
})
const emit = defineEmits(['submit'])
const tabs = [
  { id: 'scope', title: '主题与范围', placeholder: '填写主题、地区或关注对象' },
  { id: 'focus', title: '重点关注', placeholder: '补充指标、优先事项或排除项' },
  { id: 'timing', title: '周期与时间', placeholder: '填写覆盖窗口、频率、时间和时区' },
  { id: 'output', title: '输出偏好', placeholder: '填写视角、来源、图表或投递偏好' },
]
const group = useId()
const index = ref(0)
const answers = ref(Object.fromEntries(tabs.map(({ id }) => {
  const options = props.options[id]
  return [id, {
    selected: id !== 'focus' && options.length === 1 ? [options[0]] : [],
    custom: '',
  }]
})))
const tab = computed(() => tabs[index.value])
const answer = computed(() => answers.value[tab.value.id])
const complete = computed(() => tabs.every(({ id }) => answered(answers.value[id])))

function answered(value) {
  return Boolean(value.selected.length || value.custom.trim())
}

function select(label, checked) {
  if (tab.value.id !== 'focus') {
    answer.value.selected = [label]
    answer.value.custom = ''
  } else if (checked) {
    answer.value.selected.push(label)
  } else {
    answer.value.selected = answer.value.selected.filter(selected => selected !== label)
  }
}

function customize() {
  if (tab.value.id !== 'focus') answer.value.selected = []
}

async function navigate(event) {
  const count = tabs.length
  const destinations = { ArrowLeft: (index.value + count - 1) % count, ArrowRight: (index.value + 1) % count, Home: 0, End: count - 1 }
  if (!(event.key in destinations)) return
  event.preventDefault()
  index.value = destinations[event.key]
  await nextTick()
  document.getElementById(group + '-tab-' + index.value)?.focus()
}

function submit() {
  if (!complete.value || props.busy) return
  emit('submit', Object.fromEntries(tabs.map(({ id }) => [id, {
    selected: [...answers.value[id].selected],
    custom: answers.value[id].custom.trim(),
  }])))
}
</script>

<template>
  <form class="briefing-choices" aria-label="确认简报需求" @submit.prevent="submit">
    <div class="choices-tabs" role="tablist" aria-label="简报需求" @keydown="navigate">
      <button v-for="(item, position) in tabs" :id="group + '-tab-' + position" :key="item.id"
        type="button" role="tab" :tabindex="position === index ? 0 : -1" :aria-selected="position === index"
        :aria-controls="group + '-panel'" @click="index = position">
        {{ item.title }}<span v-if="answered(answers[item.id])" class="complete" aria-label="已填写">✓</span>
      </button>
    </div>
    <fieldset :id="group + '-panel'" :key="tab.id" role="tabpanel" :aria-labelledby="group + '-tab-' + index" :disabled="busy">
      <div class="choices-options">
        <label v-for="label in options[tab.id]" :key="label">
          <input :type="tab.id === 'focus' ? 'checkbox' : 'radio'" :name="group + '-' + tab.id"
            :checked="answer.selected.includes(label)" @change="select(label, $event.target.checked)" />
          <span>{{ label }}</span>
        </label>
      </div>
      <label class="custom">自定义
        <input v-model="answer.custom" type="text" maxlength="1000" :placeholder="tab.placeholder" @input="customize" />
      </label>
    </fieldset>
    <footer>
      <span v-if="error" role="alert">{{ error }}</span>
      <button type="submit" :disabled="!complete || busy">{{ busy ? '正在提交…' : '生成草稿' }}</button>
    </footer>
  </form>
</template>

<style scoped>
.briefing-choices { width: 100%; }
.choices-tabs { display: flex; gap: 4px; flex-wrap: wrap; border-bottom: 1px solid #dbe3e8; }
.choices-tabs button { border: 0; border-bottom: 2px solid transparent; background: transparent; padding: 7px 9px; color: #435967; cursor: pointer; }
.choices-tabs button[aria-selected="true"] { color: #135a72; font-weight: 600; border-bottom-color: #177586; }
.complete { color: #15664a; margin-inline-start: 4px; }
fieldset { margin: 8px 0 0; padding: 0; border: 0; min-width: 0; }
.choices-options { display: flex; flex-wrap: wrap; gap: 6px 16px; max-height: 110px; overflow-y: auto; padding: 3px; }
.choices-options label { display: flex; gap: 6px; align-items: baseline; min-width: 0; overflow-wrap: anywhere; }
.custom { display: flex; gap: 8px; align-items: center; margin-top: 8px; }
.custom input { flex: 1; min-width: 0; border: 1px solid #cdd6df; border-radius: 6px; padding: 5px 8px; }
footer { display: flex; align-items: center; justify-content: flex-end; gap: 8px; margin-top: 8px; }
footer span { color: #a13824; }
footer button { background: #135a72; color: white; border: 0; border-radius: 6px; padding: 6px 12px; cursor: pointer; }
footer button:disabled { opacity: .55; cursor: default; }
</style>
