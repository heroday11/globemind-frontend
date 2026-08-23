<script setup>
import { computed } from 'vue'

const iframeSrc = computed(() => {
  const b = import.meta.env.BASE_URL || '/'
  const prefix = b.endsWith('/') ? b : `${b}/`
  return `${prefix}amazing-globe/index.html`
})
</script>

<template>
  <div class="globe-shell">
    <iframe :src="iframeSrc" class="globe-iframe" title="3D 地球" />
  </div>
</template>

<style scoped>
.globe-shell {
  margin-top: 64px;
  width: 100%;
  height: calc(100vh - 64px);
  min-height: 320px;
  box-sizing: border-box;
  background: #000;
  overflow: hidden;
}

.globe-iframe {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
  vertical-align: top;
}
</style>
