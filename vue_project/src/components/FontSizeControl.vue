<script setup>
import { computed } from 'vue'
import { Minus, Plus } from 'lucide-vue-next'
import { getDisplayFontSize } from '@globemind/shared/display-preferences'
import { FONT_SIZE_OFFSET_MIN, FONT_SIZE_OFFSET_MAX, useDisplayPreferences } from '@/composables/useDisplayPreferences.js'

const { preferences, fontSize, updateDisplayPreferences } = useDisplayPreferences()
const minimumFontSize = getDisplayFontSize(FONT_SIZE_OFFSET_MIN)
const fontSizeMultiplier = computed(() => Number((fontSize.value / minimumFontSize).toFixed(2)))

function step(delta) {
  updateDisplayPreferences({ fontSizeOffset: preferences.fontSizeOffset + delta })
}
</script>

<template>
  <div class="font-size-control" role="group" aria-label="网站字号">
    <button type="button" title="缩小字号" aria-label="缩小字号"
      :disabled="preferences.fontSizeOffset <= FONT_SIZE_OFFSET_MIN" @click="step(-1)">
      <Minus :size="16" aria-hidden="true" />
    </button>
    <output aria-label="当前字号倍数">{{ fontSizeMultiplier }}×</output>
    <button type="button" title="放大字号" aria-label="放大字号"
      :disabled="preferences.fontSizeOffset >= FONT_SIZE_OFFSET_MAX" @click="step(1)">
      <Plus :size="16" aria-hidden="true" />
    </button>
  </div>
</template>

<style scoped>
.font-size-control {
  display: inline-flex;
  flex: none;
  align-items: center;
  border: 1px solid #d8e0ec;
  border-radius: 8px;
  background: #fff;
  color: #334155;
}

button {
  display: grid;
  place-items: center;
  width: var(--font-size-button-width, 30px);
  height: var(--font-size-button-height, 36px);
  padding: 0;
  background: transparent;
  color: inherit;
  border: 0;
  border-radius: 7px;
  cursor: pointer;
}

button:disabled { opacity: .38; cursor: default; }
button:focus-visible { outline: 2px solid #2563eb; outline-offset: -2px; }
@media (hover: hover) {
  button:enabled:hover { color: #1d4ed8; background: #eff6ff; }
}

output {
  display: grid;
  place-items: center;
  inline-size: var(--font-size-button-height, 36px);
  block-size: var(--font-size-button-height, 36px);
  background: var(--font-size-readout-background, #f8fafc);
  font-size: min(.6875rem, 15px);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
</style>
