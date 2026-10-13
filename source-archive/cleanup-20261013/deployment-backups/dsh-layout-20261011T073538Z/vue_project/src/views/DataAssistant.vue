<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { BookOpen, BriefcaseBusiness, Clock3, FileText, FolderOpen, LayoutDashboard, MessageSquareText, Play, Plus, RefreshCw, Settings2, Trash2, UsersRound, X } from 'lucide-vue-next'
import { assistantApi, assistantErrorText } from '@/features/assistant/api.js'
import { syncPendingCapabilities } from '@/bootstrap.js'
import { dshLaunchUrl, isDshFrame } from '@/utils/dshFrame.js'
import { getToken, clearAuth, getAuthChangedEventName } from '@/utils/auth.js'
import { BRIEFING_CADENCE_OPTIONS, BRIEFING_PERSPECTIVE_OPTIONS, BRIEFING_TIME_RANGE_OPTIONS, briefingCadenceLabel, briefingStatusLabel, createBriefingScheduleForm, normalizeBriefingScheduleDto } from '@/features/assistant/briefing/model.js'

const props = defineProps({ embedded: { type: Boolean, default: false } })
const view = ref('chat'), frameUrl = ref(''), loading = ref(true), error = ref('')
// Capability migration remains centralized in bootstrap: CAPABILITIES_SYNC_KEY,
// safeExpertSkillDocumentPath, method: 'PUT', and the empty selection guard
// if (!skillIds.length && !databaseCards.length) return are handled there.
const schedules = ref([]), scheduleError = ref(''), scheduleLoading = ref(false), formOpen = ref(false), editingId = ref(''), saving = ref(false), runningId = ref('')
const workspaces = ref([]), reports = ref([]), reportsLoading = ref(false), form = reactive(createBriefingScheduleForm())
let generation = 0
let frameTimeout = 0
let recoveryAttempts = 0
const navItems = [
  ['dashboard', '看板', LayoutDashboard], ['chat', '对话', MessageSquareText], ['workspace', '工作区', BriefcaseBusiness],
  ['favorites', '收藏', FolderOpen], ['knowledge', '知识库', BookOpen], ['members', '成员', UsersRound],
]
const stats = computed(() => ({ total: schedules.value.length, active: schedules.value.filter((x) => x.enabled).length, generated: schedules.value.filter((x) => x.last_status === 'done').length }))
const reportFiles = computed(() => reports.value.filter((x) => x.name !== '.workspace.json'))
const viewTitle = computed(() => ({ chat: '对话', dashboard: '看板', workspace: '工作区', favorites: '收藏', knowledge: '知识库', members: '成员', briefing: '简报', reports: '报告', settings: '设置' }[view.value]))
const selectView = (key) => { view.value = key; if (key === 'briefing') loadSchedules(); if (key === 'reports') loadReports(); if (key === 'workspace') loadWorkspaces() }
const fmt = (value) => value ? new Date(value).toLocaleString('zh-CN', { hour12: false, month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '尚未运行'
const cadence = (item) => item.cadence === 'custom_hours' ? `每 ${item.interval_hours || 24} 小时` : briefingCadenceLabel(item.cadence)
function resetForm(item = null) { editingId.value = item?.id ? String(item.id) : ''; Object.assign(form, createBriefingScheduleForm(item)); formOpen.value = true }
async function loadSchedules() { if (!getToken()) return; scheduleLoading.value = true; scheduleError.value = ''; try { const r = await assistantApi.listSchedules(); schedules.value = (r.data || []).map(normalizeBriefingScheduleDto) } catch (e) { scheduleError.value = assistantErrorText(e, '读取简报任务失败') } finally { scheduleLoading.value = false } }
async function saveSchedule() { if (!form.title.trim() || !form.topic.trim()) { scheduleError.value = '请填写简报名称和关注主题'; return }; saving.value = true; try { const r = await assistantApi.saveSchedule(editingId.value, { ...form, title: form.title.trim(), topic: form.topic.trim(), prompt: form.prompt.trim(), report_type: 'brief', include_charts: false }); const item = normalizeBriefingScheduleDto(r.data || r); const i = schedules.value.findIndex((x) => String(x.id) === editingId.value); i < 0 ? schedules.value.unshift(item) : schedules.value.splice(i, 1, item); formOpen.value = false } catch (e) { scheduleError.value = assistantErrorText(e, '保存简报任务失败') } finally { saving.value = false } }
async function runSchedule(item) { runningId.value = String(item.id); try { await assistantApi.runSchedule(item.id); await loadSchedules() } catch (e) { scheduleError.value = assistantErrorText(e, '运行简报失败') } finally { runningId.value = '' } }
async function removeSchedule(item) { if (!window.confirm(`删除「${item.title || item.topic}」？`)) return; try { await assistantApi.deleteSchedule(item.id); schedules.value = schedules.value.filter((x) => x.id !== item.id) } catch (e) { scheduleError.value = assistantErrorText(e, '删除简报失败') } }
async function loadWorkspaces() { try { workspaces.value = (await assistantApi.listWorkspaces()).data || [] } catch (e) { error.value = assistantErrorText(e, '读取工作区失败') } }
async function loadReports() { reportsLoading.value = true; try { if (!workspaces.value.length) await loadWorkspaces(); if (!workspaces.value.some((x) => x.name === 'reports')) { reports.value = []; return }; reports.value = (await assistantApi.listWorkspaceFiles('reports')).data || [] } catch (e) { error.value = assistantErrorText(e, '读取报告目录失败') } finally { reportsLoading.value = false } }
async function requestDshLaunch(token) { const r = await fetch('/api/assistant/dsh-launch', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }); const p = await r.json().catch(() => ({})); if (r.status === 401) { clearAuth(); throw new Error('登录状态已失效，请重新登录。') }; if (!r.ok || !p.url) throw new Error(p.detail || '数据助手暂时不可用'); return p }
function clearFrameTimeout() {
  window.clearTimeout(frameTimeout)
  frameTimeout = 0
}
function failFrame(message) {
  clearFrameTimeout()
  if (recoveryAttempts < 1 && getToken()) {
    recoveryAttempts += 1
    void loadDsh({ retry: true })
    return
  }
  frameUrl.value = ''
  loading.value = false
  error.value = message
}
function onFrameLoad(event) {
  if (!frameUrl.value || event.target.src !== new URL(frameUrl.value, location.origin).href) return
  if (!isDshFrame(event.target)) {
    failFrame('助手页面未正确加载，请重新连接；若仍失败，请联系管理员。')
    return
  }
  clearFrameTimeout()
  loading.value = false
  error.value = ''
}
function onFrameError() {
  if (frameUrl.value) failFrame('助手连接中断，请重新连接。')
}
async function loadDsh({ retry = false } = {}) {
  const current = ++generation
  clearFrameTimeout()
  if (!retry) recoveryAttempts = 0
  // Remove the old document even when the server reuses its launch token.
  frameUrl.value = ''
  loading.value = true
  error.value = ''
  const token = getToken()
  if (!token) {
    error.value = '请先登录后使用数据助手。'
    loading.value = false
    return
  }
  try {
    await syncPendingCapabilities(token)
    const payload = await requestDshLaunch(token)
    if (current !== generation) return
    frameUrl.value = dshLaunchUrl(payload.url, location.origin, `${Date.now()}-${current}`)
    frameTimeout = window.setTimeout(() => {
      if (current === generation) failFrame('助手加载超时，请重新连接。')
    }, 45000)
  } catch (e) {
    if (current !== generation) return
    loading.value = false
    error.value = assistantErrorText(e, '连接数据助手失败')
  }
}
function authChanged() { loadDsh(); if (getToken()) loadSchedules() }
onMounted(() => { window.addEventListener(getAuthChangedEventName(), authChanged); loadDsh(); loadSchedules() })
onBeforeUnmount(() => { generation += 1; clearFrameTimeout(); window.removeEventListener(getAuthChangedEventName(), authChanged) })
</script>

<template>
  <main class="assistant-shell" :class="{ embedded: props.embedded }">
    <aside class="sidebar"><div class="brand"><b>G</b><strong>GlobeMind</strong></div><div class="workspace"><i />我的研究空间 <span>⌄</span></div><nav><button v-for="item in navItems" :key="item[0]" :class="{ active: view === item[0] }" @click="selectView(item[0])"><component :is="item[2]" :size="17" />{{ item[1] }}</button></nav><small>内容中心</small><nav><button :class="{ active: view === 'briefing' }" @click="selectView('briefing')"><Clock3 :size="17" />简报<em v-if="stats.active">{{ stats.active }}</em></button><button :class="{ active: view === 'reports' }" @click="selectView('reports')"><FileText :size="17" />报告<em v-if="reportFiles.length">{{ reportFiles.length }}</em></button></nav><div class="bottom"><button @click="selectView('settings')"><Settings2 :size="17" />设置</button></div></aside>
    <section class="main"><header class="topbar"><span>数据助手 <b>/</b> <strong>{{ viewTitle }}</strong></span><button class="icon" title="刷新" @click="view === 'briefing' ? loadSchedules() : view === 'reports' ? loadReports() : loadDsh()"><RefreshCw :size="16" /></button></header>
      <section v-if="view === 'chat'" class="page chat"><div class="heading"><div><label>DSH · DATA SITUATION HERMES</label><h1>你好，今天想研究什么？</h1><p>连接 GlobeMind 数据与知识库，开始一段可追溯的分析对话。</p></div><button class="outline" @click="selectView('briefing')"><Clock3 :size="16" />定时简报</button></div><div class="frame"><iframe v-if="frameUrl" v-show="!loading" :key="frameUrl" class="dsh-frame" :src="frameUrl" title="GlobeMind 数据助手" allow="clipboard-read; clipboard-write" @load="onFrameLoad" @error="onFrameError" /><div v-if="!frameUrl || loading" class="empty"><span v-if="loading" class="spinner" /><p>{{ loading ? '正在连接数据助手...' : error }}</p><button v-if="!loading" class="primary" @click="loadDsh">重新连接</button></div></div></section>
      <section v-else-if="view === 'briefing'" class="page"><div class="heading"><div><label>AUTOMATION</label><h1>简报</h1><p>按周期让 DSH 自动生成不超过 200 字的精简调查简报，结果保存到简报目录。</p></div><button class="primary" @click="resetForm()"><Plus :size="17" />新建简报</button></div><div class="metrics"><div><span>全部任务</span><b>{{ stats.total }}</b></div><div><span>运行中</span><b>{{ stats.active }}</b></div><div><span>已生成</span><b>{{ stats.generated }}</b></div></div><p v-if="scheduleError" class="error">{{ scheduleError }}</p><div v-if="scheduleLoading" class="empty"><span class="spinner" /><p>正在读取定时任务...</p></div><div v-else-if="!schedules.length" class="empty card-empty"><Clock3 :size="30" /><h2>还没有定时简报</h2><p>设置一个主题和生成周期，让重要变化自动抵达。</p><button class="outline" @click="resetForm()">创建第一个简报</button></div><div v-else class="list"><article v-for="item in schedules" :key="item.id"><div class="schedule-icon"><Clock3 :size="19" /></div><div class="schedule-body"><div class="title"><h2>{{ item.title || item.topic }}</h2><span :class="item.enabled ? 'on' : 'off'">{{ item.enabled ? '已启用' : '已暂停' }}</span></div><p>{{ item.topic }}</p><small>{{ cadence(item) }}　·　下次 {{ fmt(item.next_run_at) }}　·　上次 {{ fmt(item.last_run_at) }}　·　{{ briefingStatusLabel(item.last_status) }}</small></div><div class="actions"><button title="立即运行" @click="runSchedule(item)"><Play :size="14" /></button><button title="编辑" @click="resetForm(item)"><Settings2 :size="14" /></button><button title="删除" @click="removeSchedule(item)"><Trash2 :size="14" /></button></div></article></div></section>
      <section v-else-if="view === 'reports'" class="page"><div class="heading"><div><label>ARCHIVE</label><h1>报告</h1><p>用户目录下 <code>reports</code> 文件夹中的全部文档。</p></div><button class="outline" @click="loadReports"><RefreshCw :size="16" />刷新目录</button></div><div v-if="reportsLoading" class="empty"><span class="spinner" /><p>正在读取报告目录...</p></div><div v-else-if="!reportFiles.length" class="empty card-empty"><FileText :size="30" /><h2>报告目录为空</h2><p>由 DSH 生成并保存的报告会显示在这里。</p><button class="primary" @click="selectView('chat')">打开数据助手</button></div><div v-else class="report-table"><div class="thead">文件名 <span>大小</span><span>更新时间</span></div><div v-for="file in reportFiles" :key="file.path || file.name" class="report-row"><FileText :size="17" /><strong>{{ file.name }}</strong><span>{{ file.size ? `${Math.ceil(file.size / 1024)} KB` : '—' }}</span><span>{{ fmt(file.updated || file.modified_at) }}</span></div></div></section>
      <section v-else class="page"><div class="heading"><div><label>RESEARCH SPACE</label><h1>{{ viewTitle }}</h1><p>这里汇总与你的研究空间相关的内容。</p></div></div><div class="simple"><BriefcaseBusiness :size="28" /><h2>{{ view === 'workspace' ? `${workspaces.length} 个工作区` : '模块已准备就绪' }}</h2><p>从侧边栏选择简报或报告，开始管理研究产出。</p></div></section>
    </section>
    <div v-if="formOpen" class="backdrop" @click.self="formOpen = false"><section class="modal"><header><div><label>SCHEDULED BRIEFING</label><h2>{{ editingId ? '编辑简报' : '新建简报' }}</h2></div><button class="icon" @click="formOpen = false"><X :size="18" /></button></header><label>简报名称<input v-model="form.title" placeholder="例如：全球供应链晨报" maxlength="80" /></label><label>调查主题<input v-model="form.topic" placeholder="例如：亚太地区关键供应链变化" maxlength="160" /></label><label>自定义要求 <span>可选</span><textarea v-model="form.prompt" rows="4" maxlength="1200" placeholder="告诉 DSH 你希望关注的来源、角度或判断标准" /></label><div class="grid"><label>生成周期<select v-model="form.cadence"><option v-for="x in BRIEFING_CADENCE_OPTIONS.filter((x) => x.value !== 'manual')" :key="x.value" :value="x.value">{{ x.label }}</option></select></label><label v-if="form.cadence === 'custom_hours'">间隔小时<input v-model.number="form.interval_hours" type="number" min="1" max="720" /></label><label v-else>生成时间<input v-model="form.time_of_day" type="time" /></label><label>时间范围<select v-model="form.time_range"><option v-for="x in BRIEFING_TIME_RANGE_OPTIONS" :key="x.value" :value="x.value">{{ x.label }}</option></select></label><label>研判视角<select v-model="form.perspective"><option v-for="x in BRIEFING_PERSPECTIVE_OPTIONS" :key="x.value" :value="x.value">{{ x.label }}</option></select></label></div><div class="note"><b>输出上限 200 字</b><span>生成后由 DSH 保存至简报目录，结果仍需人工审阅。</span></div><footer><button class="outline" @click="formOpen = false">取消</button><button class="primary" :disabled="saving" @click="saveSchedule">{{ saving ? '保存中...' : '保存并启用' }}</button></footer></section></div>
  </main>
</template>

<style scoped>
:global(*){box-sizing:border-box}.assistant-shell{--ink:#162235;--muted:#718096;--line:#e5eaf1;--blue:#2864db;display:flex;height:100dvh;min-height:100dvh;background:#f6f8fb;color:var(--ink);font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif}.sidebar{width:224px;flex:0 0 224px;padding:22px 14px 16px;border-right:1px solid var(--line);background:#fff;display:flex;flex-direction:column}.brand{display:flex;align-items:center;gap:10px;padding:0 10px 24px;font-size:15px}.brand b{display:grid;place-items:center;width:26px;height:26px;border-radius:7px;color:#fff;background:#1d55c5}.workspace{display:flex;gap:8px;align-items:center;padding:9px 10px;margin-bottom:22px;border:1px solid var(--line);border-radius:7px;color:#46546a;font-size:12px}.workspace i{width:7px;height:7px;border-radius:50%;background:#0e9f8a}.workspace span{margin-left:auto;color:#a0acbb}.sidebar nav{display:grid;gap:3px}.sidebar nav button,.bottom button{display:flex;align-items:center;gap:11px;width:100%;padding:10px;border:0;border-radius:6px;color:#69778a;background:transparent;font:inherit;font-size:13px;text-align:left;cursor:pointer}.sidebar nav button.active,.sidebar nav button:hover,.bottom button:hover{color:#1e55be;background:#edf3ff;font-weight:700}.sidebar small{padding:20px 10px 8px;color:#a0acbb;font-size:10px;font-weight:800;letter-spacing:.12em}.sidebar em{margin-left:auto;padding:2px 6px;border-radius:10px;color:#2864db;background:#dce8ff;font-size:10px;font-style:normal}.bottom{margin-top:auto;padding-top:16px;border-top:1px solid var(--line)}.main{min-width:0;flex:1}.topbar{height:64px;display:flex;align-items:center;justify-content:space-between;padding:0 34px;border-bottom:1px solid var(--line);background:#fff;color:#617086;font-size:13px}.topbar b{padding:0 10px;color:#b4bfcc}.topbar strong{color:var(--ink)}.icon{display:inline-grid;place-items:center;width:34px;height:34px;padding:0;border:1px solid var(--line);border-radius:6px;color:#637287;background:#fff;cursor:pointer}.page{max-width:1080px;margin:auto;padding:52px clamp(20px,5vw,64px) 64px}.heading{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;margin-bottom:30px}.heading label,.modal label{display:block;margin-bottom:10px;color:#2d68d5;font-size:10px;font-weight:800;letter-spacing:.14em}.heading h1{margin:0;font-size:clamp(26px,3vw,34px);letter-spacing:-.035em}.heading p{margin:10px 0 0;color:var(--muted);font-size:14px;line-height:1.7}.primary,.outline{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:36px;padding:0 14px;border-radius:6px;font:inherit;font-size:13px;font-weight:700;cursor:pointer}.primary{border:1px solid var(--blue);color:#fff;background:var(--blue)}.outline{border:1px solid #cfd9e7;color:#36506d;background:#fff}.frame{height:calc(100dvh - 230px);min-height:460px;overflow:hidden;border:1px solid var(--line);border-radius:10px;background:#fff;box-shadow:0 12px 34px #1e375a0f}.frame iframe{width:100%;height:100%;border:0}.empty{display:grid;place-items:center;align-content:center;min-height:280px;gap:12px;color:var(--muted);text-align:center}.empty p{margin:0}.empty h2{margin:0;color:var(--ink);font-size:18px}.card-empty{border:1px solid var(--line);border-radius:8px;background:#fff}.spinner{width:23px;height:23px;border:2px solid #dce5f2;border-top-color:var(--blue);border-radius:50%;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px}.metrics div{display:flex;flex-direction:column;gap:8px;padding:17px 20px;border:1px solid var(--line);border-radius:8px;background:#fff}.metrics span{color:var(--muted);font-size:12px}.metrics b{font-size:25px}.error{padding:12px 14px;border:1px solid #f4c7c7;border-radius:6px;color:#a53d3d;background:#fff6f6;font-size:13px}.list{display:grid;gap:10px}.list article{display:flex;align-items:center;gap:15px;padding:18px;border:1px solid var(--line);border-radius:8px;background:#fff}.schedule-icon{display:grid;place-items:center;width:40px;height:40px;flex:0 0 40px;border-radius:8px;color:#2c69d3;background:#eaf1ff}.schedule-body{min-width:0;flex:1}.title{display:flex;align-items:center;gap:9px}.title h2{margin:0;overflow:hidden;font-size:15px;text-overflow:ellipsis;white-space:nowrap}.title span{padding:3px 7px;border-radius:10px;font-size:10px;font-weight:700}.title .on{color:#087f6e;background:#dff6f0}.title .off{color:#7c8796;background:#edf0f4}.schedule-body p{margin:6px 0;color:var(--muted);font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.schedule-body small{color:#8793a3;font-size:11px}.actions{display:flex;gap:5px}.actions button{display:grid;place-items:center;width:30px;height:30px;padding:0;border:1px solid var(--line);border-radius:5px;color:#607087;background:#fff;cursor:pointer}.report-table{overflow:hidden;border:1px solid var(--line);border-radius:8px;background:#fff}.thead,.report-row{display:grid;grid-template-columns:minmax(180px,1fr) 90px 150px;align-items:center;gap:14px;padding:14px 18px}.thead{color:#9aa5b3;border-bottom:1px solid var(--line);font-size:11px;font-weight:800}.report-row{min-height:57px;border-bottom:1px solid #f0f3f6;color:#637186;font-size:12px}.report-row strong{color:#27354a;font-size:13px}.report-row svg{color:#2e6ad4}.simple{display:grid;justify-items:center;gap:12px;padding:70px 20px;border:1px solid var(--line);border-radius:9px;background:#fff;color:var(--muted);text-align:center}.simple h2{margin:0;color:var(--ink);font-size:18px}.simple p{margin:0;font-size:13px}.backdrop{position:fixed;inset:0;z-index:20;display:grid;place-items:center;padding:20px;background:#101d3047}.modal{width:min(600px,100%);max-height:calc(100dvh - 40px);overflow:auto;padding:26px;border:1px solid var(--line);border-radius:10px;background:#fff;box-shadow:0 24px 70px #12243e33}.modal header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px}.modal h2{margin:0;font-size:22px}.modal label{margin-top:16px;color:#40516a;font-size:12px;letter-spacing:0}.modal label span{color:#a7b1be;font-weight:400}.modal input,.modal textarea,.modal select{width:100%;padding:10px 11px;border:1px solid #d6dfe9;border-radius:5px;outline:0;color:var(--ink);background:#fff;font:inherit;font-size:13px}.modal textarea{resize:vertical}.grid{display:grid;grid-template-columns:1fr 1fr;gap:0 14px}.note{display:flex;gap:8px;align-items:center;margin-top:18px;padding:10px 12px;border-radius:5px;color:#728095;background:#f3f7fc;font-size:11px}.note b{color:#2361cc}.note span{margin-left:auto}.modal footer{display:flex;justify-content:flex-end;gap:9px;margin-top:24px}@media(max-width:760px){.sidebar{width:62px;flex-basis:62px;padding:17px 9px}.brand{justify-content:center;padding:0 0 22px}.brand strong,.workspace:not(:has(i)),.workspace{font-size:0}.workspace{justify-content:center;padding:12px 0;border:0}.workspace i{font-size:initial}.sidebar small{font-size:0}.sidebar nav button{justify-content:center;padding:11px 0;font-size:0}.sidebar nav button svg,.bottom button svg{width:18px}.sidebar em{display:none}.bottom button{justify-content:center;font-size:0}.topbar{padding:0 17px}.page{padding:30px 16px 42px}.heading{flex-direction:column}.frame{height:calc(100dvh - 275px);min-height:360px}.metrics{gap:7px}.metrics div{padding:12px}.metrics b{font-size:20px}.list article{align-items:flex-start}.actions{margin-left:auto;flex-direction:column}.grid{grid-template-columns:1fr}.note{align-items:flex-start;flex-wrap:wrap}.note span{width:100%;margin-left:0}.thead,.report-row{grid-template-columns:minmax(110px,1fr) 60px}.thead span:last-child,.report-row span:last-child{display:none}}
</style>
