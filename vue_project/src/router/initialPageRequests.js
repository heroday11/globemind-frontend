import { API_PREFIX, resolveApiOrigin } from '../config/api.js'
import { getToken } from '../utils/auth.js'

let initialRequest

export function groundOverviewKey(country, place, query) {
  return JSON.stringify([country, place, query])
}

export function primeInitialPageRequest() {
  const path = location.pathname.replace(/\/+$/, '')
  const params = new URLSearchParams(location.search)
  let key
  let url
  let headers
  if (path === '/data-assistant') {
    let token
    try { token = getToken() } catch { return }
    if (!token) return
    key = token
    url = '/api/assistant/dsh-launch'
    headers = { Authorization: `Bearer ${token}` }
  } else if (path === '/data-service/ground-news' || path === '/data-service/ground-news-gba') {
    // Duplicate route filters are arrays in Vue Router.
    const read = (name) => params.getAll(name).length === 1 ? params.get(name) : ''
    const gba = path.endsWith('-gba')
    const country = gba ? 'CN' : read('country')
    const place = gba ? 'region-chn-1180' : country ? read('place') : ''
    const query = read('q').slice(0, 100).trim()
    const filters = new URLSearchParams()
    if (country) filters.set('country', country)
    if (place) filters.set('place', place)
    if (query) filters.set('q', query)
    key = groundOverviewKey(country, place, query)
    url = `${resolveApiOrigin()}${API_PREFIX}/story-graph/ground-news/overview`
    const search = filters.toString()
    if (search) url += `?${search}`
  } else return

  const controller = new AbortController()
  const timeout = window.setTimeout(() => {
    if (initialRequest?.controller === controller) initialRequest = undefined
    controller.abort()
  }, 30000)
  const response = fetch(url, { headers, cache: 'no-store', signal: controller.signal })
  void response.catch(() => {})
  initialRequest = { key, controller, response, timeout }
}

export async function takeInitialPageRequest(key, signal) {
  if (key !== initialRequest?.key) return
  const { controller, response, timeout } = initialRequest
  initialRequest = undefined
  const abort = () => controller.abort()
  signal.addEventListener('abort', abort, { once: true })
  if (signal.aborted) abort()
  try {
    return await response
  } finally {
    window.clearTimeout(timeout)
    signal.removeEventListener('abort', abort)
  }
}
