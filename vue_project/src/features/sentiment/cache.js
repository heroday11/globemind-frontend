export const OPINION_CACHE_TTL_MS = 2 * 60 * 1000
export const OPINION_LIVE_REFRESH_MS = 10 * 60 * 1000
export const TREND_CACHE_KEY = 'globemind:sentiment-analysis:trend:v3'
export const OVERVIEW_CACHE_KEY = 'globemind:sentiment-analysis:overview:v3'

export function createSentimentSnapshotCache({
  now = Date.now,
  storage = globalThis.localStorage,
  ttlMs = OPINION_CACHE_TTL_MS,
} = {}) {
  return Object.freeze({
    read(key) {
      if (!storage) return null
      try {
        const parsed = JSON.parse(storage.getItem(key) || 'null')
        if (!parsed?.savedAt || now() - parsed.savedAt > ttlMs) return null
        return parsed.payload ?? null
      } catch {
        return null
      }
    },

    write(key, payload) {
      if (!storage) return false
      try {
        storage.setItem(key, JSON.stringify({ payload, savedAt: now() }))
        return true
      } catch {
        return false
      }
    },
  })
}
