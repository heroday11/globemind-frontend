import { getToken } from '@/utils/auth'
export async function imageRequest(path, options = {}) {
  if (!path.startsWith('/api/assistant/images/')) throw new Error('图片地址无效')
  const response = await fetch(path, { ...options, headers: { Authorization: `Bearer ${getToken()}`, ...options.headers } })
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    const detail = payload.detail
    throw new Error(typeof detail === 'string' ? detail : Array.isArray(detail) ? detail.map(x => x.msg).join('；') : '图片服务暂时不可用')
  }
  return response
}
export async function imageJson(path, body) {
  const response = await imageRequest('/api/assistant/images/' + path, body === undefined ? {} : {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
  return response.json()
}
export function maskPixels(pixels) {
  const output = new Uint8ClampedArray(pixels.length)
  for (let i = 0; i < pixels.length; i += 4) {
    output[i] = output[i + 1] = output[i + 2] = 255
    output[i + 3] = 255 - pixels[i + 3]
  }
  return output
}
export const imageStateText = state => ({
  queued: '等待生成', running: '正在生成', done: '已完成', partial: '部分完成',
  failed: '生成失败', needs_reconciliation: '等待核对原任务',
}[state] || state)
