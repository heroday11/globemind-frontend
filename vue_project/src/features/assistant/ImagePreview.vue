<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { imageRequest } from './imageApi'
const props = defineProps({ output: { type: Object, required: true } })
const url = ref(''), error = ref(''), blob = ref(null)
const figure = ref(null), dialog = ref(null), active = ref(false)
let observer
onMounted(() => {
  observer = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return
    active.value = true
    observer.disconnect()
  }, { rootMargin: '320px' })
  observer.observe(figure.value)
})
watch([() => props.output.url, active], async ([path, visible], _, onCleanup) => {
  if (!visible) return
  const controller = new AbortController()
  onCleanup(() => controller.abort())
  if (url.value) URL.revokeObjectURL(url.value)
  url.value = ''; blob.value = null; error.value = ''
  try {
    const response = await imageRequest(path, { signal: controller.signal })
    const image = await response.blob()
    if (controller.signal.aborted) return
    blob.value = image
    url.value = URL.createObjectURL(image)
  } catch (e) { if (!controller.signal.aborted) error.value = e.message }
}, { immediate: true })
onBeforeUnmount(() => {
  observer?.disconnect()
  if (url.value) URL.revokeObjectURL(url.value)
})
</script>
<template>
  <figure ref="figure" class="image-preview">
    <a v-if="url" :href="url" target="_blank" rel="noopener" title="查看大图" aria-label="查看大图" @click.exact.prevent="dialog.showModal()"><img :src="url" :alt="output.name" /></a>
    <p v-else class="image-loading" :role="active ? 'status' : undefined">{{ error || (active ? '正在加载图片…' : '') }}</p>
    <dialog ref="dialog" class="image-large" :aria-label="output.name" @click.self="dialog.close()">
      <div class="image-large-content">
        <button type="button" @click="dialog.close()">关闭预览</button>
        <img v-if="url" :src="url" :alt="output.name" />
      </div>
    </dialog>
    <p v-if="output.quality" class="image-quality">{{ output.model }} · 实际画质 {{ output.quality }}</p>
    <p v-if="output.quality_notice" class="image-quality-notice" role="status">{{ output.quality_notice }}</p>
    <figcaption><a v-if="url" :href="url" :download="output.name">下载图片</a><slot :blob="blob" /></figcaption>
  </figure>
</template>
<style scoped>
.image-preview { margin: 0; min-width: 0; }
img { display: block; width: 100%; max-height: 360px; object-fit: contain; border-radius: 8px; background: repeating-conic-gradient(#e5e7eb 0% 25%, white 0% 50%) 50% / 20px 20px; }
.image-loading { min-height: 180px; }
.image-large { max-width: calc(100vw - 24px); max-height: calc(100dvh - 24px); padding: 0; border: 0; border-radius: 8px; }
.image-large::backdrop { background: rgb(15 23 42 / 72%); }
.image-large-content { display: grid; justify-items: end; gap: 8px; padding: 8px; }
.image-large img { width: auto; max-width: 100%; max-height: calc(100dvh - 76px); }
.image-quality { margin: 8px 0; color: #475569; font-size: 12px; }
.image-quality-notice { color: #92400e; font-weight: 600; }
figcaption { display: flex; flex-wrap: wrap; gap: 12px; padding: 10px 0; }
a { color: #2563eb; }
</style>
