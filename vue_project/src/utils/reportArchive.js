import { API_PREFIX } from '@/config/api'
import { getToken } from '@/utils/auth'

export const REPORT_STORAGE_KEY = 'data_assistant_report_history_v1'
const REPORT_WORKSPACE_NAME = 'reports'

function safeJson(raw, fallback) {
  try {
    const parsed = JSON.parse(raw)
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

function titleFromFileName(name) {
  return String(name || '')
    .replace(/\.(?:md|markdown|txt|docx?|pptx?|pdf|xlsx?|csv|json|html?|xml|png|jpe?g|webp|gif|svg|zip)$/i, '')
    .replace(/^\d{4}-\d{2}-\d{2}T?\d{0,2}-?\d{0,2}-?\d{0,2}-?/, '')
    .replace(/[-_]+/g, ' ')
    .trim() || '未命名报告'
}

export function normalizeReportRecord(record) {
  if (!record || typeof record !== 'object') return null
  const topic = String(record.topic || record.title || titleFromFileName(record.fileName) || '').trim()
  const createdAt = record.createdAt || record.time || record.modified || new Date().toISOString()
  const fileName = record.fileName || ''
  return {
    ...record,
    id: record.id || record.filePath || fileName || `report-${createdAt}-${topic}`,
    type: record.type || 'risk',
    topic: topic || '未命名报告',
    title: topic || '未命名报告',
    timeRange: record.timeRange || '7d',
    perspective: record.perspective || 'analyst',
    template: record.template || 'standard',
    content: record.content || '',
    createdAt,
    time: createdAt,
    status: record.status || 'done',
    workspace: record.workspace || REPORT_WORKSPACE_NAME,
    fileName,
    filePath: record.filePath || (fileName ? `${REPORT_WORKSPACE_NAME}/${fileName}` : ''),
    downloadPath: record.downloadPath || '',
    ext: record.ext || (fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.')).toLowerCase() : ''),
  }
}

export function loadLocalReportArchive() {
  const rows = safeJson(localStorage.getItem(REPORT_STORAGE_KEY), [])
  return Array.isArray(rows) ? rows.map(normalizeReportRecord).filter(Boolean) : []
}

export function saveLocalReportArchive(rows) {
  const normalized = (Array.isArray(rows) ? rows : []).map(normalizeReportRecord).filter(Boolean)
  localStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(normalized))
  return normalized
}

export async function scanReportWorkspace() {
  if (!getToken()) return []
  try {
    const res = await fetch(`${API_PREFIX}/assistant/reports`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      credentials: 'same-origin',
    })
    if (!res.ok) return []
    const json = await res.json()
    const files = Array.isArray(json?.data) ? json.data : []
    return files
      .filter((file) => file && !file.is_dir && file.path && file.name)
      .map((file) => normalizeReportRecord({
        id: file.id || `${file.workspace}/${file.path}`,
        topic: titleFromFileName(file.name),
        title: titleFromFileName(file.name),
        createdAt: file.modified,
        time: file.modified,
        workspace: file.workspace || REPORT_WORKSPACE_NAME,
        fileName: file.name,
        filePath: `${file.workspace}/${file.path}`,
        downloadPath: file.download_path || '',
        ext: file.ext || '',
        size: Number(file.size || 0),
        status: 'done',
      }))
      .filter(Boolean)
  } catch {
    return []
  }
}

export async function loadReportArchive() {
  const localRows = loadLocalReportArchive()
  const scannedRows = await scanReportWorkspace()
  const byKey = new Map()
  for (const row of [...scannedRows, ...localRows]) {
    byKey.set(row.filePath || row.id, { ...(byKey.get(row.filePath || row.id) || {}), ...row })
  }
  const merged = [...byKey.values()].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
  return saveLocalReportArchive(merged)
}

export async function downloadReportFile(report) {
  const path = String(report?.downloadPath || '').trim()
  if (!path) throw new Error('该报告没有可用的下载地址')
  const token = getToken()
  const response = await fetch(`${API_PREFIX}${path}`, {
    headers: {
      Accept: 'application/octet-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'same-origin',
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload?.detail || payload?.error || '下载报告失败')
  }
  const blob = await response.blob()
  const fileName = report.fileName || 'report'
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
  return fileName
}
