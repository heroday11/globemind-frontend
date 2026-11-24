import { computed, reactive, readonly, ref } from 'vue'
import {
  DEFAULT_DISPLAY_PREFERENCES,
  DISPLAY_PREFERENCES_EVENT,
  FONT_FAMILY_OPTIONS,
  FONT_SIZE_OFFSET_MAX,
  FONT_SIZE_OFFSET_MIN,
  LINE_HEIGHT_OPTIONS,
  applyDisplayPreferences,
  getDisplayFontSize,
  loadDisplayPreferences,
  normalizeDisplayPreferences,
  resolveDisplayPreferencesStorageKey,
  saveDisplayPreferences,
} from '@globemind/shared/display-preferences'
import { getAuthChangedEventName, getToken } from '@/utils/auth'

function resolveStorage() {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

const storage = resolveStorage()
let activeStorageKey = resolveDisplayPreferencesStorageKey(storage)
const preferences = reactive(loadDisplayPreferences(storage, activeStorageKey))
let initialized = false
const pending = ref(false)
const syncError = ref(false)
let account
let revision = 0

function readLocal(key) {
  try { return storage?.getItem(key) } catch { return null }
}

function markPending(key, offset) {
  try {
    if (offset === null) storage?.removeItem(key)
    else storage?.setItem(key, String(offset))
  } catch {
    // In-memory changes still sync when local storage is unavailable.
  }
}

async function requestFontSize(session, offset = null) {
  const response = await fetch('/api/user/display-preferences', {
    method: offset === null ? 'GET' : 'PUT',
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${session.token}`,
      ...(offset === null ? {} : { 'Content-Type': 'application/json' }),
    },
    body: offset === null ? undefined : JSON.stringify({ fontSizeOffset: offset }),
    signal: AbortSignal.timeout(8000),
  })
  if (!response.ok) throw new Error('显示设置同步失败')
  return (await response.json()).fontSizeOffset
}

async function flushFontSize(session = account) {
  if (!session || session !== account || session.saving || session.offset === null) return
  session.saving = true
  syncError.value = false
  try {
    while (session === account && session.offset !== null) {
      const offset = session.offset
      await requestFontSize(session, offset)
      if (session !== account) return
      if (session.offset === offset) {
        session.offset = null
        markPending(session.pendingKey, null)
        pending.value = false
      }
    }
  } catch {
    if (session === account) syncError.value = true
  } finally {
    session.saving = false
  }
}

function enqueueFontSize(offset) {
  if (!account) return
  account.offset = offset
  markPending(account.pendingKey, offset)
  pending.value = true
  void flushFontSize()
}

async function loadAccountFontSize(session, initialRevision) {
  try {
    const offset = await requestFontSize(session)
    if (session !== account || revision !== initialRevision) return
    if (offset === null) {
      if (readLocal(activeStorageKey) !== null) enqueueFontSize(preferences.fontSizeOffset)
      return
    }
    const next = { ...preferences, fontSizeOffset: offset }
    saveDisplayPreferences(next, storage, activeStorageKey)
    applyAndNotify(next)
  } catch {
    if (session === account && revision === initialRevision) syncError.value = true
  }
}

function retryFontSize() {
  if (!account) return
  syncError.value = false
  if (account.offset !== null) void flushFontSize()
  else void loadAccountFontSize(account, revision)
}


function replacePreferences(value) {
  const normalized = normalizeDisplayPreferences(value)
  Object.assign(preferences, normalized)
  return normalized
}

function dispatchPreferences(value) {
  if (typeof window === 'undefined' || typeof window.CustomEvent !== 'function') return
  window.dispatchEvent(
    new CustomEvent(DISPLAY_PREFERENCES_EVENT, {
      detail: { ...normalizeDisplayPreferences(value) },
    }),
  )
}

function applyAndNotify(value) {
  const normalized = replacePreferences(value)
  applyDisplayPreferences(normalized)
  dispatchPreferences(normalized)
  return normalized
}

function reloadForCurrentAccount() {
  const token = readLocal('access_token') ? getToken() : ''
  const nextStorageKey = resolveDisplayPreferencesStorageKey(storage)
  if (nextStorageKey !== activeStorageKey) {
    activeStorageKey = nextStorageKey
    applyAndNotify(loadDisplayPreferences(storage, activeStorageKey))
  }
  const key = token && !nextStorageKey.endsWith(':device') ? nextStorageKey : ''
  if (account?.key === key && account.token === token) return
  account = undefined
  pending.value = false
  syncError.value = false
  if (!key) return
  const pendingKey = key + ':font-size-pending'
  const raw = readLocal(pendingKey)
  const offset = raw === null ? null : normalizeDisplayPreferences({ fontSizeOffset: raw }).fontSizeOffset
  account = { key, token, pendingKey, offset, saving: false }
  if (offset === null) void loadAccountFontSize(account, revision)
  else {
    applyAndNotify({ ...preferences, fontSizeOffset: offset })
    pending.value = true
    void flushFontSize()
  }
}

function handleStorage(event) {
  if (event.storageArea && event.storageArea !== storage) return
  if (event.key === 'access_token' || event.key === 'current_user') {
    reloadForCurrentAccount()
    return
  }
  if (event.key !== activeStorageKey) return
  revision++
  applyAndNotify(loadDisplayPreferences(storage, activeStorageKey))
}

export function initializeDisplayPreferences() {
  applyDisplayPreferences(preferences)
  if (initialized || typeof window === 'undefined') return
  initialized = true
  reloadForCurrentAccount()
  window.addEventListener('online', retryFontSize)
  window.addEventListener('storage', handleStorage)
  window.addEventListener(getAuthChangedEventName(), reloadForCurrentAccount)
}

export function updateDisplayPreferences(patch) {
  const normalized = normalizeDisplayPreferences({ ...preferences, ...patch })
  const changed = normalized.fontSizeOffset !== preferences.fontSizeOffset
  saveDisplayPreferences(normalized, storage, activeStorageKey)
  applyAndNotify(normalized)
  if (changed) {
    revision++
    enqueueFontSize(normalized.fontSizeOffset)
  }
  return normalized
}

export function resetDisplayPreferences() {
  return updateDisplayPreferences(DEFAULT_DISPLAY_PREFERENCES)
}

export function getDisplayPreferencesSnapshot() {
  return normalizeDisplayPreferences(preferences)
}

const fontSize = computed(() => getDisplayFontSize(preferences.fontSizeOffset))

export function useDisplayPreferences() {
  return {
    preferences: readonly(preferences),
    fontSize,
    pending: readonly(pending),
    syncError: readonly(syncError),
    retryFontSize,
    updateDisplayPreferences,
    resetDisplayPreferences,
  }
}

export {
  DEFAULT_DISPLAY_PREFERENCES,
  DISPLAY_PREFERENCES_EVENT,
  FONT_FAMILY_OPTIONS,
  FONT_SIZE_OFFSET_MAX,
  FONT_SIZE_OFFSET_MIN,
  LINE_HEIGHT_OPTIONS,
}
