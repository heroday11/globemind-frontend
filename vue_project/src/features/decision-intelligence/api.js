import { API_PREFIX } from '../../config/api.js'
import { getToken } from '../../utils/auth.js'

export async function decisionRequest(path, { body, authenticated = false, signal } = {}) {
  const token = getToken()
  if (authenticated && !token) throw new Error('登录后可保存研究项目和分析原文。')
  const headers = { Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const response = await fetch(`${API_PREFIX}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers,
    credentials: 'same-origin',
    signal,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message =
      typeof payload.detail === 'string'
        ? payload.detail
        : response.status === 422
          ? '请检查输入范围和必填项。'
          : '请求暂时未完成，请重试。'
    throw new Error(message)
  }
  return payload
}

export const decisionApi = {
  list: () => decisionRequest('/decision-intelligence/briefs'),
  brief: (id) => decisionRequest(`/decision-intelligence/briefs/${encodeURIComponent(id)}`),
  monitoring: (id) => decisionRequest(`/decision-intelligence/briefs/${encodeURIComponent(id)}/monitoring`),
  refreshMonitoring: (id) => decisionRequest(`/decision-intelligence/briefs/${encodeURIComponent(id)}/monitoring/refresh`, { body: {}, authenticated: true }),
  importResearch: (id) =>
    decisionRequest(`/decision-intelligence/briefs/${encodeURIComponent(id)}/research`, {
      body: {},
      authenticated: true,
    }),
  calculate: (kind, body) =>
    decisionRequest(`/decision-intelligence/calculators/${kind}`, { body }),
  search: (keyword) =>
    decisionRequest('/dashboard/search', {
      body: {
        keyword,
        mode: 'keyword',
        search_type: 'news',
        page: 1,
        page_size: 8,
        sort_by: 'published_at',
        sort_order: 'desc',
      },
    }),
  analyze: (body) => decisionRequest('/decision-intelligence/jobs', { body, authenticated: true }),
  job: (id) =>
    decisionRequest(`/decision-intelligence/jobs/${encodeURIComponent(id)}`, {
      authenticated: true,
    }),
  jobs: () => decisionRequest('/decision-intelligence/jobs', { authenticated: true }),
}
