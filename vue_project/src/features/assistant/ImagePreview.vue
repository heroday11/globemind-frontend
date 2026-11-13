<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'
import { imageRequest } from './imageApi'
const props = defineProps({ output: { type: Object, required: true } })
const url = ref(''), error = ref('')
let serial = 0
watch(() => props.output.url, async path => {
  const current = ++serial
  if (url.value) URL.revokeObjectURL(url.value)
  url.value = ''; error.value = ''
  try {
    const response = await imageRequest(path)
    const next = URL.createObjectURL(await response.blob())
    if (current !== serial) URL.revokeObjectURL(next)
    else url.value = next
  } catch (e) { if (current === serial) error.value = e.message }
}, { immediate: true })
onBeforeUnmount(() => { serial++; if (url.value) URL.revokeObjectURL(url.value) })
</script>
<template>
  <figure class="image-preview">
    <a v-if="url" :href="url" target="_blank" rel="noopener" title="查看大图"><img :src="url" :alt="output.name" loading="lazy" /></a>
    <p v-else role="status">{{ error || '正在加载图片…' }}</p>
    <figcaption><a v-if="url" :href="url" :download="output.name">下载图片</a><slot /></figcaption>
  </figure>
</template>
<style scoped>
.image-preview { margin: 0; min-width: 0; }
img { display: block; width: 100%; max-height: 360px; object-fit: contain; border-radius: 8px; background: repeating-conic-gradient(#e5e7eb 0% 25%, white 0% 50%) 50% / 20px 20px; }
figcaption { display: flex; flex-wrap: wrap; gap: 12px; padding: 10px 0; }
a { color: #2563eb; }
</style>
