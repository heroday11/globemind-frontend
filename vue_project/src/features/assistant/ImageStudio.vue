<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import ImageJobs from './ImageJobs.vue'
import { imageJson, imageRequest, maskPixels } from './imageApi'
const props = defineProps({ initial: { type: Object, default: null }, sessionId: { type: String, default: '' } })
const emit = defineEmits(['close', 'submitted'])
const prompt = ref(''), size = ref('1024x1024'), quality = ref('medium'), background = ref('auto'), count = ref(1)
const references = ref([]), canvas = ref(null), brush = ref(50), erase = ref(false), maskEnabled = ref(false)
const busy = ref(false), error = ref(''), notice = ref(''), tab = ref('create')
let painting = false, last = null, history = [], selected = false, submission = null
let previousFocus
const dialog = ref(null)
async function decode(blob) {
  const url = URL.createObjectURL(blob)
  const image = new Image()
  try { image.src = url; await image.decode(); return { url, width: image.naturalWidth, height: image.naturalHeight } }
  catch (e) { URL.revokeObjectURL(url); throw e }
}
async function addBlob(blob) {
  if (references.value.length >= 16) throw new Error('最多使用 16 张参考图')
  const info = await decode(blob)
  try {
    const response = await imageRequest('/api/assistant/images/assets', { method: 'POST', body: blob })
    const asset = await response.json()
    references.value.push({ ...asset, ...info })
  } catch (e) { URL.revokeObjectURL(info.url); throw e }
  if (references.value.length === 1) {
    const dimension = `${info.width}x${info.height}`
    if (['1024x1024','1536x1024','1024x1536'].includes(dimension)) size.value = dimension
    await resetCanvas()
  }
}
async function upload(event) {
  busy.value = true; error.value = ''
  try { for (const file of Array.from(event.target.files || [])) await addBlob(file) }
  catch (e) { error.value = e.message }
  finally { busy.value = false; event.target.value = '' }
}
async function resetCanvas() {
  await nextTick()
  if (!canvas.value || !references.value[0]) return
  canvas.value.width = references.value[0].width
  canvas.value.height = references.value[0].height
  history = []; selected = false
}
function clearSelection() { canvas.value?.getContext('2d').clearRect(0, 0, canvas.value.width, canvas.value.height); history = []; selected = false }
function point(event) {
  const bounds = canvas.value.getBoundingClientRect()
  return { x: (event.clientX - bounds.left) * canvas.value.width / bounds.width, y: (event.clientY - bounds.top) * canvas.value.height / bounds.height }
}
function startPaint(event) {
  if (!maskEnabled.value || busy.value) return
  const ctx = canvas.value.getContext('2d')
  history.push(ctx.getImageData(0,0,canvas.value.width,canvas.value.height)); if (history.length > 8) history.shift()
  canvas.value.setPointerCapture(event.pointerId)
  painting = true; last = point(event); paint(event)
}
function paint(event) {
  if (!painting) return
  const current = point(event), ctx = canvas.value.getContext('2d')
  ctx.globalCompositeOperation = erase.value ? 'destination-out' : 'source-over'
  ctx.strokeStyle = '#2878ff'; ctx.fillStyle = '#2878ff'; ctx.lineWidth = Number(brush.value); ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(last.x,last.y); ctx.lineTo(current.x,current.y); ctx.stroke()
  ctx.beginPath(); ctx.arc(current.x,current.y,Number(brush.value)/2,0,Math.PI*2); ctx.fill()
  last = current; selected = true
}
function endPaint() { painting = false; last = null }
function undo() { if (history.length) canvas.value.getContext('2d').putImageData(history.pop(),0,0) }
async function remove(index) {
  URL.revokeObjectURL(references.value[index].url); references.value.splice(index,1)
  if (index === 0) { maskEnabled.value = false; await resetCanvas() }
}
async function maskAsset() {
  if (!maskEnabled.value) return null
  if (!selected) throw new Error('请先用鼠标涂抹要修改的区域')
  const ref = references.value[0]
  if (`${ref.width}x${ref.height}` !== size.value) throw new Error('选区编辑的尺寸须与第一张原图一致，请使用所选尺寸的原图')
  const imageData = canvas.value.getContext('2d').getImageData(0,0,ref.width,ref.height)
  if (!imageData.data.some((v,i) => i%4 === 3 && v)) throw new Error('选区为空，请先涂抹')
  const maskCanvas = document.createElement('canvas')
  maskCanvas.width = ref.width; maskCanvas.height = ref.height
  maskCanvas.getContext('2d').putImageData(new ImageData(maskPixels(imageData.data),ref.width,ref.height),0,0)
  const blob = await new Promise(resolve => maskCanvas.toBlob(resolve,'image/png'))
  const response = await imageRequest('/api/assistant/images/assets?mask=true', { method:'POST', body:blob })
  return (await response.json()).id
}
async function send(body) {
  // Reuse the request ID if a network response is lost; changed inputs get a new ID.
  const signature = JSON.stringify(body)
  if (!submission || submission.signature !== signature) submission = { signature, id: crypto.randomUUID() }
  const job = await imageJson('jobs', { ...body, request_id: submission.id })
  emit('submitted', job); notice.value = '任务已提交，在后台继续运行，结果自动存入报告。'; tab.value = 'jobs'
  submission = null
}
async function submit() {
  busy.value = true; error.value = ''
  try { await send({ prompt:prompt.value, size:size.value, quality:quality.value, background:background.value, count:Number(count.value),
    references:references.value.map(x=>x.id), mask:await maskAsset(), session_id:props.sessionId }) }
  catch (e) { error.value = e.message }
  finally { busy.value = false }
}
async function retry(job) {
  busy.value = true; error.value = ''
  try { const request = { ...job.request }; delete request.request_id; await send({ ...request, retry_of:job.id }) }
  catch (e) { error.value = e.message }
  finally { busy.value = false }
}
async function edit({ job, output }) {
  busy.value = true; error.value = ''
  try {
    references.value.forEach(ref => URL.revokeObjectURL(ref.url)); references.value = []
    tab.value = 'create'; prompt.value = ''; size.value = job.request.size; quality.value = job.request.quality
    const response = await imageRequest(output.url)
    await addBlob(await response.blob())
    maskEnabled.value = true
  } catch (e) { error.value = e.message }
  finally { busy.value = false }
}
function keys(event) {
  if (event.key === 'Escape') { emit('close'); return }
  if (event.key !== 'Tab') return
  const items = [...dialog.value.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]')].filter(el => el.getClientRects().length)
  const first=items[0], last=items[items.length-1]
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
}
onMounted(async () => { previousFocus = document.activeElement; dialog.value?.focus(); if (props.initial) await edit(props.initial) })
onBeforeUnmount(() => { references.value.forEach(ref => URL.revokeObjectURL(ref.url)); previousFocus?.focus() })
</script>
<template>
  <Teleport to="body">
    <div class="image-studio-backdrop" @click.self="emit('close')">
      <section ref="dialog" class="image-studio" role="dialog" aria-modal="true" aria-labelledby="image-studio-title" tabindex="-1" @keydown="keys">
        <header><h2 id="image-studio-title">图片生成与编辑</h2><button type="button" aria-label="关闭图片编辑" @click="emit('close')">关闭</button></header>
        <div class="studio-tabs"><button type="button" @click="tab='create'">生成与选区编辑</button><button type="button" @click="tab='jobs'">任务与图片归档</button></div>
        <p v-if="error" class="studio-error" role="alert">{{ error }}</p><p v-if="notice" role="status">{{ notice }}</p>
        <form v-show="tab==='create'" @submit.prevent="submit">
          <label class="studio-prompt">描述希望生成或修改的内容<textarea v-model="prompt" required maxlength="4000" rows="3" :disabled="busy" /></label>
          <div class="studio-options">
            <label>尺寸<select aria-label="尺寸" v-model="size" :disabled="busy"><option>1024x1024</option><option>1536x1024</option><option>1024x1536</option></select></label>
            <label>画质<select aria-label="画质" v-model="quality" :disabled="busy"><option value="low">低</option><option value="medium">中</option><option value="high">高</option></select></label>
            <label>背景<select aria-label="背景" v-model="background" :disabled="busy"><option value="auto">自动</option><option value="opaque">不透明</option><option value="transparent">透明</option></select></label>
            <label>数量<select aria-label="数量" v-model="count" :disabled="busy"><option v-for="n in 4" :key="n" :value="n">{{ n }} 张</option></select></label>
          </div>
          <label class="studio-upload">参考图（最多 16 张，首图作为编辑原图）<input type="file" accept="image/png,image/jpeg,image/webp" multiple :disabled="busy" @change="upload" /></label>
          <div class="studio-references"><figure v-for="(ref,index) in references" :key="ref.id + index"><img :src="ref.url" :alt="'参考图 ' + (index+1)" /><button type="button" :disabled="busy" @click="remove(index)">移除 {{ index+1 }}</button></figure></div>
          <template v-if="references.length">
            <label><input v-model="maskEnabled" type="checkbox" :disabled="busy" />鼠标涂抹选区，只修改选中的区域</label>
            <div v-show="maskEnabled" class="studio-mask">
              <div class="studio-brush"><label>笔刷大小<input v-model="brush" type="range" min="8" max="240" />{{ brush }} px</label><label><input v-model="erase" type="checkbox" />橡皮擦</label><button type="button" @click="undo">撤销</button><button type="button" @click="clearSelection">清空选区</button></div>
              <p>蓝色区域是希望修改的位置。选区外保留原图，最终内容请预览确认。</p>
              <div class="studio-canvas" :style="{ aspectRatio: references[0].width + '/' + references[0].height }">
                <img :src="references[0].url" alt="编辑原图" />
                <canvas ref="canvas" aria-label="按住鼠标拖动绘制编辑选区" @pointerdown="startPaint" @pointermove="paint" @pointerup="endPaint" @pointercancel="endPaint" />
              </div>
            </div>
          </template>
          <footer><span>sunburst 主用，明确失败后 eco 兜底 · 每张交付图片计额度 ¥0.2</span><button type="submit" class="studio-submit" :disabled="busy">{{ busy ? '正在提交…' : '生成图片' }}</button></footer>
        </form>
        <ImageJobs v-if="tab==='jobs'" :busy="busy" @edit="edit" @retry="retry" @deliver="emit('submitted',$event)" />
      </section>
    </div>
  </Teleport>
</template>
<style scoped>
.image-studio-backdrop { position: fixed; inset: 0; z-index: 10050; display: flex; align-items: center; justify-content: center; padding: 18px; background: #14213d99; }
.image-studio { width: min(940px,100%); max-height: 94dvh; overflow: auto; padding: 24px; border-radius: 16px; background: #fff; color: #1e293b; box-shadow: 0 16px 80px #0004; }
header, footer, .studio-options, .studio-brush, .studio-tabs { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
header, footer { justify-content: space-between; }
h2 { font-size: 20px; margin: 0; }
.studio-tabs { margin: 20px 0; }
label { font-size: 14px; }
.studio-prompt { display: block; }
textarea { display: block; width: 100%; box-sizing: border-box; margin: 8px 0 16px; padding: 12px; }
select, textarea { border: 1px solid #bdcbdc; border-radius: 7px; font: inherit; }
select { margin-left: 6px; padding: 7px; }
button { border: 1px solid #cbd5e1; border-radius: 7px; padding: 8px 12px; background: white; color: #1d4ed8; cursor: pointer; }
button:disabled { opacity: .5; cursor: wait; }
.studio-upload { display: block; margin: 20px 0 12px; }
.studio-upload input { display: block; margin-top: 8px; }
.studio-references { display: flex; gap: 10px; overflow-x: auto; }
.studio-references figure { flex: 0 0 110px; margin: 0 0 16px; }
.studio-references img { width: 110px; height: 80px; object-fit: contain; background: #f1f5f9; }
.studio-references button { display: block; padding: 4px 8px; }
.studio-mask { margin-top: 14px; }
.studio-mask p { color: #64748b; font-size: 13px; }
.studio-canvas { position: relative; width: min(100%,660px); margin: auto; }
.studio-canvas img, .studio-canvas canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
.studio-canvas canvas { opacity: .45; touch-action: none; cursor: crosshair; }
footer { margin-top: 22px; font-size: 12px; color: #64748b; }
.studio-submit { background: #2563eb; color: white; }
.studio-error { color: #b42318; }
@media(max-width:600px) { .image-studio { padding: 14px; } .image-studio-backdrop { padding: 6px; } }
</style>
