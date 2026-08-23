import { normalizeBriefingScheduleList } from './model.js'

function responseError(response, fallback) {
  return new Error(response?.detail || response?.error || fallback)
}

function requireSuccess(response, fallback) {
  if (!response?.ok) throw responseError(response, fallback)
  return response
}

export function createBriefingScheduleService(api) {
  if (!api || typeof api !== 'object') {
    throw new TypeError('Briefing schedule service requires an API facade')
  }
  return Object.freeze({
    async list() {
      const response = requireSuccess(await api.listSchedules(), '读取定时任务失败')
      return normalizeBriefingScheduleList(response.data)
    },
    async save(id, payload) {
      const response = requireSuccess(await api.saveSchedule(id, payload), '保存定时任务失败')
      return response.data
    },
    async run(id) {
      const response = requireSuccess(await api.runSchedule(id), '运行定时任务失败')
      return response.data
    },
    async remove(id) {
      const response = await api.deleteSchedule(id)
      if (response?.ok === false) throw responseError(response, '删除定时任务失败')
      return response
    },
  })
}
