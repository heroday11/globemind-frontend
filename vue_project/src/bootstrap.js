import { safeExpertSkillDocumentPath } from './utils/externalUrl.js'
import { expertSkillGroups } from './features/assistant/expert-skill-market.js'
import { primeInitialPageRequest } from './router/initialPageRequests.js'

function loadApplication() {
  return import('./main.js')
}

export { capabilityFingerprint, syncPendingCapabilities }

const CATALOG_URL = '/datasets/expert-skills/catalog.json'
const DB_STORAGE_KEY = 'globemind_academic_data_database_cards_v1'
const SELECTED_SKILLS_KEY = 'globemind_academic_data_selected_skills_v1'
const CAPABILITIES_SYNC_KEY = 'globemind_assistant_capabilities_sync_v1'

function localJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '')
    return value ?? fallback
  } catch {
    return fallback
  }
}

function capabilityFingerprint(skillIds, cards) {
  const includesMarketSkill = expertSkillGroups.some(group => group.skills.some(skill => skillIds.includes(skill.id)))
  return JSON.stringify({
    ...(includesMarketSkill ? { marketCatalog: 1 } : {}),
    skills: [...skillIds].sort(),
    databases: cards.map((card) => card.id).filter(Boolean).sort(),
  })
}

async function readSkillContent(skill, signal) {
  if (skill.inlineContent) return skill.inlineContent
  const target = safeExpertSkillDocumentPath(skill?.localPath)
  if (!target) return ''
  const response = await fetch(target, { cache: 'force-cache', signal })
  return response.ok ? response.text() : ''
}

async function syncPendingCapabilities(token, signal) {
  const skillIds = localJson(SELECTED_SKILLS_KEY, []).filter((id) => typeof id === 'string')
  const databaseCards = localJson(DB_STORAGE_KEY, []).filter((card) => card && typeof card === 'object')
  if (!skillIds.length && !databaseCards.length) return

  const fingerprint = capabilityFingerprint(skillIds, databaseCards)
  let syncedFingerprint = ''
  try { syncedFingerprint = localStorage.getItem(CAPABILITIES_SYNC_KEY) || '' } catch { /* Storage is optional. */ }
  if (fingerprint === syncedFingerprint) return

  const catalogResponse = await fetch(CATALOG_URL, { cache: 'force-cache', signal })
  if (!catalogResponse.ok) throw new Error('Skill 目录加载失败。')
  const catalog = await catalogResponse.json()
  const catalogSkills = (catalog.domains || []).flatMap((domain) =>
    (domain.skills || []).map((skill) => ({ ...skill, domainId: domain.id || '' })),
  )
  const skillsById = new Map(catalogSkills.map((skill) => [skill.id, skill]))
  for (const group of expertSkillGroups) {
    for (const skill of group.skills) skillsById.set(skill.id, { ...skill, domainId: group.id })
  }
  const skills = await Promise.all(skillIds.map(async (id) => {
    const skill = skillsById.get(id)
    if (!skill) throw new Error('所选 Skill 暂时无法从目录读取。')
    return {
      id: skill.id,
      name: skill.name || skill.id,
      nameZh: skill.nameZh || '',
      description: skill.description || '',
      descriptionZh: skill.descriptionZh || '',
      domain: skill.domainId,
      source: skill.source || '',
      runtime: skill.runtime || '',
      content: await readSkillContent(skill, signal),
    }
  }))
  const response = await fetch('/api/assistant/capabilities', {
    method: 'PUT',
    signal,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ skills, databaseCards }),
  })
  const payload = await response.json().catch(() => ({}))
  if (response.status === 401) throw new Error('登录状态已失效，请重新登录后连接数据助手。')
  if (!response.ok) throw new Error(payload.detail || '所选 Skill 尚未同步。')
  signal?.throwIfAborted()
  try { localStorage.setItem(CAPABILITIES_SYNC_KEY, fingerprint) } catch { /* Storage is optional. */ }
}

// The mounted assistant view owns its iframe and authenticated launch lifecycle.
// Do not create a second fixed-position frame during application bootstrap.
primeInitialPageRequest()
void loadApplication()
