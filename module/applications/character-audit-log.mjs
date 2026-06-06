import { logger } from '../utils/logger.mjs'

const { api } = foundry.applications

const AUDIT_LOG_PATH = 'flags.swerpg.logs'

const CSV_COLUMNS = Object.freeze(['timestamp', 'date', 'userName', 'type', 'typeLabel', 'description', 'xpDelta', 'creditDelta', 'actorName', 'playerName'])

const AUDIT_LOG_FAMILIES = Object.freeze({
  all: 'all',
  skills: 'skills',
  talents: 'talents',
  xp: 'xp',
  characteristics: 'characteristics',
  details: 'details',
  advancement: 'advancement',
  purchases: 'purchases',
  sales: 'sales',
  other: 'other',
})

const AUDIT_LOG_FILTER_ORDER = Object.freeze([
  AUDIT_LOG_FAMILIES.all,
  AUDIT_LOG_FAMILIES.skills,
  AUDIT_LOG_FAMILIES.talents,
  AUDIT_LOG_FAMILIES.xp,
  AUDIT_LOG_FAMILIES.characteristics,
  AUDIT_LOG_FAMILIES.details,
  AUDIT_LOG_FAMILIES.advancement,
  AUDIT_LOG_FAMILIES.purchases,
  AUDIT_LOG_FAMILIES.sales,
])

const AUDIT_LOG_FILTER_LABELS = Object.freeze({
  [AUDIT_LOG_FAMILIES.all]: 'SWERPG.AUDIT_LOG.FILTER.ALL',
  [AUDIT_LOG_FAMILIES.skills]: 'SWERPG.AUDIT_LOG.FILTER.SKILLS',
  [AUDIT_LOG_FAMILIES.talents]: 'SWERPG.AUDIT_LOG.FILTER.TALENTS',
  [AUDIT_LOG_FAMILIES.xp]: 'SWERPG.AUDIT_LOG.FILTER.XP',
  [AUDIT_LOG_FAMILIES.characteristics]: 'SWERPG.AUDIT_LOG.FILTER.CHARACTERISTICS',
  [AUDIT_LOG_FAMILIES.details]: 'SWERPG.AUDIT_LOG.FILTER.DETAILS',
  [AUDIT_LOG_FAMILIES.advancement]: 'SWERPG.AUDIT_LOG.FILTER.ADVANCEMENT',
  [AUDIT_LOG_FAMILIES.purchases]: 'SWERPG.AUDIT_LOG.FILTER.PURCHASES',
  [AUDIT_LOG_FAMILIES.sales]: 'SWERPG.AUDIT_LOG.FILTER.SALES',
})

/**
 * Canonical icon class (FontAwesome) for each audit log family.
 * Used on both filter buttons and entry headers for consistent visual language.
 */
const AUDIT_LOG_FAMILY_ICONS = Object.freeze({
  [AUDIT_LOG_FAMILIES.all]: 'fa-solid fa-list',
  [AUDIT_LOG_FAMILIES.skills]: 'fa-solid fa-graduation-cap',
  [AUDIT_LOG_FAMILIES.talents]: 'fa-solid fa-star',
  [AUDIT_LOG_FAMILIES.xp]: 'fa-solid fa-bolt',
  [AUDIT_LOG_FAMILIES.characteristics]: 'fa-solid fa-dumbbell',
  [AUDIT_LOG_FAMILIES.details]: 'fa-solid fa-id-card',
  [AUDIT_LOG_FAMILIES.advancement]: 'fa-solid fa-arrow-up',
  [AUDIT_LOG_FAMILIES.purchases]: 'fa-solid fa-cart-shopping',
  [AUDIT_LOG_FAMILIES.sales]: 'fa-solid fa-coins',
  [AUDIT_LOG_FAMILIES.other]: 'fa-solid fa-circle-question',
})

/**
 * Canonical glyph (FontAwesome) for each audit log variant.
 * Complements color-based variant signalling with a non-color cue.
 */
const AUDIT_LOG_VARIANT_GLYPHS = Object.freeze({
  add: 'fa-solid fa-plus',
  remove: 'fa-solid fa-minus',
  gain: 'fa-solid fa-arrow-down',
  change: 'fa-solid fa-arrows-rotate',
  fail: 'fa-solid fa-xmark',
})

/**
 * Canonical delta unit types for audit log entries.
 */
const AUDIT_LOG_DELTA_UNITS = Object.freeze({
  xp: 'xp',
  credits: 'credits',
  neutral: 'neutral',
})

/**
 * FontAwesome icon class for each delta unit.
 */
const AUDIT_LOG_DELTA_UNIT_ICONS = Object.freeze({
  [AUDIT_LOG_DELTA_UNITS.xp]: 'fa-solid fa-bolt',
  [AUDIT_LOG_DELTA_UNITS.credits]: 'fa-solid fa-coins',
  [AUDIT_LOG_DELTA_UNITS.neutral]: '',
})

/**
 * Return the canonical delta unit for a given audit entry type.
 * @param {string} type
 * @returns {'xp'|'credits'|'neutral'}
 */
function getAuditLogDeltaUnit(type) {
  if (type === 'item.purchase' || type === 'item.sale') return AUDIT_LOG_DELTA_UNITS.credits
  switch (type) {
    case 'skill.train':
    case 'skill.forget':
    case 'characteristic.increase':
    case 'xp.spend':
    case 'xp.refund':
    case 'xp.grant':
    case 'xp.remove':
    case 'talent.purchase':
    case 'talent-node-purchase':
    case 'talent-node-purchase-succeeded':
    case 'talent-node-purchase-failed':
    case 'talent-node-forget-succeeded':
    case 'talent-node-forget-failed':
    case 'advancement.level':
      return AUDIT_LOG_DELTA_UNITS.xp
    default:
      return AUDIT_LOG_DELTA_UNITS.neutral
  }
}

/**
 * Return the accessible i18n key for a variant glyph's aria-label.
 * @param {string} variant
 * @returns {string}
 */
function getVariantGlyphLabel(variant) {
  return `SWERPG.AUDIT_LOG.VARIANT.${variant.toUpperCase()}`
}

/**
 * Return the icon CSS class for a given audit log family.
 * @param {string} family
 * @returns {string}
 */
export function getAuditLogFamilyIcon(family) {
  return AUDIT_LOG_FAMILY_ICONS[family] ?? AUDIT_LOG_FAMILY_ICONS[AUDIT_LOG_FAMILIES.other]
}

/**
 * Return the glyph CSS class for a given audit log variant.
 * @param {string} variant
 * @returns {string}
 */
export function getAuditLogVariantGlyph(variant) {
  return AUDIT_LOG_VARIANT_GLYPHS[variant] ?? AUDIT_LOG_VARIANT_GLYPHS.change
}

const AUDIT_LOG_TYPE_LABELS = Object.freeze({
  'skill.train': 'SWERPG.AUDIT_LOG.TYPE.SKILL_TRAIN',
  'skill.forget': 'SWERPG.AUDIT_LOG.TYPE.SKILL_FORGET',
  'characteristic.increase': 'SWERPG.AUDIT_LOG.TYPE.CHARACTERISTIC_INCREASE',
  'xp.spend': 'SWERPG.AUDIT_LOG.TYPE.XP_SPEND',
  'xp.refund': 'SWERPG.AUDIT_LOG.TYPE.XP_REFUND',
  'xp.grant': 'SWERPG.AUDIT_LOG.TYPE.XP_GRANT',
  'xp.remove': 'SWERPG.AUDIT_LOG.TYPE.XP_REMOVE',
  'species.set': 'SWERPG.AUDIT_LOG.TYPE.SPECIES_SET',
  'career.set': 'SWERPG.AUDIT_LOG.TYPE.CAREER_SET',
  'specialization.add': 'SWERPG.AUDIT_LOG.TYPE.SPECIALIZATION_ADD',
  'specialization.remove': 'SWERPG.AUDIT_LOG.TYPE.SPECIALIZATION_REMOVE',
  'talent.purchase': 'SWERPG.AUDIT_LOG.TYPE.TALENT_PURCHASE',
  'talent-node-purchase': 'SWERPG.AUDIT_LOG.TYPE.TALENT_NODE_PURCHASE',
  'talent-node-purchase-succeeded': 'SWERPG.AUDIT_LOG.TYPE.TALENT_NODE_PURCHASE_SUCCEEDED',
  'talent-node-purchase-failed': 'SWERPG.AUDIT_LOG.TYPE.TALENT_NODE_PURCHASE_FAILED',
  'talent-node-forget-succeeded': 'SWERPG.AUDIT_LOG.TYPE.TALENT_NODE_FORGET_SUCCEEDED',
  'talent-node-forget-failed': 'SWERPG.AUDIT_LOG.TYPE.TALENT_NODE_FORGET_FAILED',
  'advancement.level': 'SWERPG.AUDIT_LOG.TYPE.ADVANCEMENT_LEVEL',
  'item.purchase': 'SWERPG.AUDIT_LOG.TYPE.ITEM_PURCHASE',
  'item.sale': 'SWERPG.AUDIT_LOG.TYPE.ITEM_SALE',
})

/**
 * Determine whether the current user may view a character audit log.
 * @param {Actor|object|null} actor
 * @param {User|object|null} [user=game.user]
 * @returns {boolean}
 */
export function canViewAuditLog(actor, user = game.user) {
  if (!actor || actor.type !== 'character' || !user) return false
  if (user.isGM) return true
  return actor.testUserPermission?.(user, 'OWNER', { exact: true }) === true
}

/**
 * Map a technical audit entry type to a business filter family.
 * @param {string} type
 * @returns {string}
 */
export function getAuditLogFamily(type) {
  switch (type) {
    case 'skill.train':
    case 'skill.forget':
      return AUDIT_LOG_FAMILIES.skills
    case 'talent.purchase':
    case 'talent-node-purchase':
    case 'talent-node-purchase-succeeded':
    case 'talent-node-purchase-failed':
    case 'talent-node-forget-succeeded':
    case 'talent-node-forget-failed':
      return AUDIT_LOG_FAMILIES.talents
    case 'xp.spend':
    case 'xp.refund':
    case 'xp.grant':
    case 'xp.remove':
      return AUDIT_LOG_FAMILIES.xp
    case 'characteristic.increase':
      return AUDIT_LOG_FAMILIES.characteristics
    case 'species.set':
    case 'career.set':
    case 'specialization.add':
    case 'specialization.remove':
      return AUDIT_LOG_FAMILIES.details
    case 'advancement.level':
      return AUDIT_LOG_FAMILIES.advancement
    case 'item.purchase':
      return AUDIT_LOG_FAMILIES.purchases
    case 'item.sale':
      return AUDIT_LOG_FAMILIES.sales
    default:
      return AUDIT_LOG_FAMILIES.other
  }
}

/**
 * Return the locale string for date formatting based on the current i18n language.
 */
function getAuditLogDateLocale() {
  const language = game.i18n?.lang
  if (language === 'fr') return 'fr-FR'
  if (language === 'en') return 'en-US'
  return language
}

/**
 * Format a Unix timestamp as a localized date-time string.
 * @param {number} timestamp
 */
function formatAuditLogTimestamp(timestamp) {
  const date = new Date(timestamp)
  const locale = getAuditLogDateLocale()

  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(date)
  } catch {
    return date.toLocaleString(locale)
  }
}

/**
 * Format a Unix timestamp as a localized time-only string (hours and minutes).
 * Used on individual entry lines within a daily section.
 * @param {number} timestamp
 * @returns {string}
 */
function formatAuditLogTimeOnly(timestamp) {
  const date = new Date(timestamp)
  const locale = getAuditLogDateLocale()

  try {
    return new Intl.DateTimeFormat(locale, {
      timeStyle: 'short',
    }).format(date)
  } catch {
    return date.toLocaleTimeString(locale)
  }
}

/**
 * Return the canonical YYYY-MM-DD day key for a Unix timestamp in local time.
 * @param {number} timestamp
 * @returns {string}
 */
function getLocalDayKey(timestamp) {
  const d = new Date(timestamp)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Return a localized header label for a day key (YYYY-MM-DD).
 * Uses "Today" / "Yesterday" for the two most recent days, full locale date otherwise.
 * @param {string} dayKey  Canonical YYYY-MM-DD key
 * @param {string} todayKey   The current day key (YYYY-MM-DD)
 * @param {string} yesterdayKey  The previous day key (YYYY-MM-DD)
 * @param {string} locale
 * @returns {string}
 */
function getDayHeaderLabel(dayKey, todayKey, yesterdayKey, locale) {
  if (dayKey === todayKey) return game.i18n.localize('SWERPG.AUDIT_LOG.DATE.TODAY')
  if (dayKey === yesterdayKey) return game.i18n.localize('SWERPG.AUDIT_LOG.DATE.YESTERDAY')

  try {
    const [year, month, day] = dayKey.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(date)
  } catch {
    return dayKey
  }
}

/**
 * Return the ISO 8601 datetime attribute value for a `<time>` element at day precision.
 * @param {string} dayKey  YYYY-MM-DD
 * @returns {string}
 */
function getDayDatetimeAttr(dayKey) {
  return dayKey
}

/**
 * Return the ISO 8601 datetime attribute value for a `<time>` element at minute precision.
 * @param {number} timestamp
 * @returns {string}
 */
function getEntryDatetimeAttr(timestamp) {
  return new Date(timestamp).toISOString()
}

/**
 * Group display-ready entries into daily sections for the view layer.
 * Each section has:
 *   - dayKey: canonical YYYY-MM-DD identifier
 *   - headerLabel: localized day label (Today / Yesterday / full date)
 *   - datetimeAttr: value for the `<time datetime>` attribute on the section header
 *   - entries: array of entries for that day, preserving the existing anti-chronological order
 *
 * Sections are ordered anti-chronologically (most recent day first).
 *
 * @param {Array<object>} entries  Display-ready entries already sorted anti-chronologically
 * @returns {Array<{ dayKey: string, headerLabel: string, datetimeAttr: string, entries: Array<object> }>}
 */
export function buildAuditLogDateSections(entries) {
  const locale = getAuditLogDateLocale()
  const now = new Date()
  const todayKey = getLocalDayKey(now.getTime())

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayKey = getLocalDayKey(yesterday.getTime())

  /** @type {Map<string, Array<object>>} */
  const sectionMap = new Map()

  for (const entry of entries) {
    const dayKey = getLocalDayKey(entry.timestamp ?? 0)
    if (!sectionMap.has(dayKey)) {
      sectionMap.set(dayKey, [])
    }
    sectionMap.get(dayKey).push({
      ...entry,
      timeOnly: formatAuditLogTimeOnly(entry.timestamp ?? 0),
      entryDatetimeAttr: getEntryDatetimeAttr(entry.timestamp ?? 0),
    })
  }

  // sectionMap keys are in insertion order which follows the anti-chronological sort of entries
  const sections = []
  for (const [dayKey, dayEntries] of sectionMap) {
    sections.push({
      dayKey,
      headerLabel: getDayHeaderLabel(dayKey, todayKey, yesterdayKey, locale),
      datetimeAttr: getDayDatetimeAttr(dayKey),
      entries: dayEntries,
    })
  }

  return sections
}

/**
 * Format an XP delta value as a signed string with the "XP" suffix.
 * @param {number} xpDelta
 */
function formatAuditLogDelta(xpDelta) {
  const value = Number(xpDelta) || 0
  const sign = value > 0 ? '+' : ''
  return `${sign}${value} XP`
}

/**
 * Format a credit delta value as a signed string with the "cr" suffix.
 * @param {number} creditDelta
 */
function formatAuditLogCreditDelta(creditDelta) {
  const value = Number(creditDelta) || 0
  const sign = value > 0 ? '+' : ''
  return `${sign}${value} cr`
}

/**
 * Return the localized label for the given audit entry type, falling back to the UNKNOWN key.
 * @param {string} type
 */
function getAuditLogTypeLabel(type) {
  const key = AUDIT_LOG_TYPE_LABELS[type] ?? 'SWERPG.AUDIT_LOG.TYPE.UNKNOWN'
  return game.i18n.localize(key)
}

/**
 * Return the display name for a value, localizing the fallback key when the value is absent or empty.
 * @param {*} value
 * @param {string} fallbackKey
 */
function getAuditLogName(value, fallbackKey = 'SWERPG.AUDIT_LOG.UNKNOWN_VALUE') {
  if (value === null || value === undefined || value === '') return game.i18n.localize(fallbackKey)
  return value
}

/**
 * Resolve a localized characteristic label from its technical identifier.
 * Falls back to the localized UNKNOWN_VALUE key when the id is absent or unrecognized.
 * @param {string|null|undefined} characteristicId
 * @returns {string}
 */
function getCharacteristicLabel(characteristicId) {
  if (!characteristicId) return game.i18n.localize('SWERPG.AUDIT_LOG.UNKNOWN_VALUE')
  const characteristic = game.system.config?.CHARACTERISTICS?.[characteristicId]
  if (!characteristic?.label) return game.i18n.localize('SWERPG.AUDIT_LOG.UNKNOWN_VALUE')
  return game.i18n.localize(characteristic.label)
}

/**
 * Build a localized description for a single audit log entry.
 * @param {object} entry
 * @returns {string}
 */
export function buildAuditLogDescription(entry) {
  const data = entry?.data ?? {}

  switch (entry?.type) {
    case 'skill.train':
      return game.i18n.format('SWERPG.AUDIT_LOG.DESCRIPTION.SKILL_TRAIN', {
        skill: getAuditLogName(data.skillName, 'SWERPG.AUDIT_LOG.UNKNOWN_SKILL'),
        oldRank: data.oldRank ?? 0,
        newRank: data.newRank ?? 0,
      })
    case 'skill.forget':
      return game.i18n.format('SWERPG.AUDIT_LOG.DESCRIPTION.SKILL_FORGET', {
        skill: getAuditLogName(data.skillName, 'SWERPG.AUDIT_LOG.UNKNOWN_SKILL'),
        oldRank: data.oldRank ?? 0,
        newRank: data.newRank ?? 0,
      })
    case 'characteristic.increase':
      return game.i18n.format('SWERPG.AUDIT_LOG.DESCRIPTION.CHARACTERISTIC_INCREASE', {
        characteristic: getCharacteristicLabel(data.characteristicId),
        oldValue: data.oldValue ?? 0,
        newValue: data.newValue ?? 0,
      })
    case 'xp.spend':
      return game.i18n.format('SWERPG.AUDIT_LOG.DESCRIPTION.XP_SPEND', {
        amount: data.amount ?? Math.abs(entry.xpDelta ?? 0),
      })
    case 'xp.refund':
      return game.i18n.format('SWERPG.AUDIT_LOG.DESCRIPTION.XP_REFUND', {
        amount: data.amount ?? Math.abs(entry.xpDelta ?? 0),
      })
    case 'xp.grant':
      return game.i18n.format('SWERPG.AUDIT_LOG.DESCRIPTION.XP_GRANT', {
        amount: data.amount ?? entry.xpDelta ?? 0,
      })
    case 'xp.remove':
      return game.i18n.format('SWERPG.AUDIT_LOG.DESCRIPTION.XP_REMOVE', {
        amount: data.amount ?? Math.abs(entry.xpDelta ?? 0),
      })
    case 'species.set':
      return game.i18n.format('SWERPG.AUDIT_LOG.DESCRIPTION.SPECIES_SET', {
        oldSpecies: getAuditLogName(data.oldSpecies, 'SWERPG.AUDIT_LOG.NONE'),
        newSpecies: getAuditLogName(data.newSpecies, 'SWERPG.AUDIT_LOG.NONE'),
      })
    case 'career.set':
      return game.i18n.format('SWERPG.AUDIT_LOG.DESCRIPTION.CAREER_SET', {
        oldCareer: getAuditLogName(data.oldCareer, 'SWERPG.AUDIT_LOG.NONE'),
        newCareer: getAuditLogName(data.newCareer, 'SWERPG.AUDIT_LOG.NONE'),
      })
    case 'specialization.add':
      return game.i18n.format('SWERPG.AUDIT_LOG.DESCRIPTION.SPECIALIZATION_ADD', {
        specialization: getAuditLogName(data.specializationName ?? data.specializationId, 'SWERPG.AUDIT_LOG.UNKNOWN_SPECIALIZATION'),
      })
    case 'specialization.remove':
      return game.i18n.format('SWERPG.AUDIT_LOG.DESCRIPTION.SPECIALIZATION_REMOVE', {
        specialization: getAuditLogName(data.specializationName ?? data.specializationId, 'SWERPG.AUDIT_LOG.UNKNOWN_SPECIALIZATION'),
      })
    case 'talent.purchase':
      return game.i18n.format('SWERPG.AUDIT_LOG.DESCRIPTION.TALENT_PURCHASE', {
        talent: getAuditLogName(data.talentName, 'SWERPG.AUDIT_LOG.UNKNOWN_TALENT'),
        ranks: data.ranks ?? 1,
      })
    case 'talent-node-purchase':
    case 'talent-node-purchase-succeeded':
      return game.i18n.format('SWERPG.AUDIT_LOG.DESCRIPTION.TALENT_NODE_PURCHASE', {
        talentId: getAuditLogName(data.talentId, 'SWERPG.AUDIT_LOG.UNKNOWN_VALUE'),
        specializationId: getAuditLogName(data.specializationId, 'SWERPG.AUDIT_LOG.UNKNOWN_VALUE'),
        cost: data.cost ?? 0,
      })
    case 'talent-node-purchase-failed':
      return game.i18n.format('SWERPG.AUDIT_LOG.DESCRIPTION.TALENT_NODE_PURCHASE_FAILED', {
        nodeId: getAuditLogName(data.nodeId, 'SWERPG.AUDIT_LOG.UNKNOWN_VALUE'),
        reasonCode: getAuditLogName(data.reasonCode, 'SWERPG.AUDIT_LOG.UNKNOWN_VALUE'),
      })
    case 'talent-node-forget-succeeded':
      return game.i18n.format('SWERPG.AUDIT_LOG.DESCRIPTION.TALENT_NODE_FORGET', {
        talentId: getAuditLogName(data.talentId, 'SWERPG.AUDIT_LOG.UNKNOWN_VALUE'),
        specializationId: getAuditLogName(data.specializationId, 'SWERPG.AUDIT_LOG.UNKNOWN_VALUE'),
        cost: data.cost ?? 0,
      })
    case 'talent-node-forget-failed':
      return game.i18n.format('SWERPG.AUDIT_LOG.DESCRIPTION.TALENT_NODE_FORGET_FAILED', {
        nodeId: getAuditLogName(data.nodeId, 'SWERPG.AUDIT_LOG.UNKNOWN_VALUE'),
        reasonCode: getAuditLogName(data.reasonCode, 'SWERPG.AUDIT_LOG.UNKNOWN_VALUE'),
      })
    case 'advancement.level':
      return game.i18n.format('SWERPG.AUDIT_LOG.DESCRIPTION.ADVANCEMENT_LEVEL', {
        oldLevel: data.oldLevel ?? 0,
        newLevel: data.newLevel ?? 0,
      })
    case 'item.purchase':
      return game.i18n.format('SWERPG.AUDIT_LOG.DESCRIPTION.ITEM_PURCHASE', {
        itemName: getAuditLogName(data.itemName, 'SWERPG.AUDIT_LOG.UNKNOWN_ITEM'),
        itemType: data.itemType ?? '',
        price: data.price ?? 0,
        quantity: data.quantity ?? 1,
      })
    case 'item.sale':
      return game.i18n.format('SWERPG.AUDIT_LOG.DESCRIPTION.ITEM_SALE', {
        itemName: getAuditLogName(data.itemName, 'SWERPG.AUDIT_LOG.UNKNOWN_ITEM'),
        itemType: data.itemType ?? '',
        resalePrice: data.resalePrice ?? 0,
        fraction: Math.round((data.fraction ?? 0) * 100),
      })
    default:
      return game.i18n.format('SWERPG.AUDIT_LOG.DESCRIPTION.UNKNOWN', {
        type: getAuditLogName(entry?.type, 'SWERPG.AUDIT_LOG.UNKNOWN_VALUE'),
      })
  }
}

/**
 * Build the visual presentation fields for a single audit log entry.
 * Mirrors the contract of `_buildChatContext()` in `audit-log.mjs` so that the
 * application and the chat card share the same visual language.
 *
 * @param {Actor|object} actor
 * @param {object} entry  A single raw audit log entry
 * @returns {{ variant: string, eventLabel: string, previousValue: string|null, nextValue: string, hasPreviousValue: boolean }}
 */
export function buildAuditLogEntryVisual(actor, entry) {
  const type = entry.type
  const data = entry.data ?? {}

  const visual = {
    actorImg: actor.img ?? '',
    actorName: actor.name ?? '',
    variant: 'change',
    eventLabel: '',
    previousValue: null,
    nextValue: '',
    hasPreviousValue: false,
  }

  switch (type) {
    case 'skill.train': {
      visual.eventLabel = game.i18n.localize('SWERPG.AUDIT_LOG.TYPE.SKILL_TRAIN')
      visual.previousValue = String(data.oldRank ?? 0)
      visual.nextValue = String(data.newRank ?? 0)
      visual.variant = data.isFree === true ? 'gain' : 'add'
      break
    }

    case 'skill.forget': {
      visual.eventLabel = game.i18n.localize('SWERPG.AUDIT_LOG.TYPE.SKILL_FORGET')
      visual.previousValue = String(data.oldRank ?? 0)
      visual.nextValue = String(data.newRank ?? 0)
      visual.variant = 'remove'
      break
    }

    case 'characteristic.increase': {
      visual.eventLabel = game.i18n.localize('SWERPG.AUDIT_LOG.TYPE.CHARACTERISTIC_INCREASE')
      visual.previousValue = String(data.oldValue ?? 0)
      visual.nextValue = String(data.newValue ?? 0)
      visual.variant = 'add'
      break
    }

    case 'xp.spend':
    case 'xp.refund':
    case 'xp.grant':
    case 'xp.remove': {
      const isGain = type === 'xp.grant' || type === 'xp.refund'
      const labelKey =
        type === 'xp.spend'
          ? 'SWERPG.AUDIT_LOG.TYPE.XP_SPEND'
          : type === 'xp.refund'
            ? 'SWERPG.AUDIT_LOG.TYPE.XP_REFUND'
            : type === 'xp.grant'
              ? 'SWERPG.AUDIT_LOG.TYPE.XP_GRANT'
              : 'SWERPG.AUDIT_LOG.TYPE.XP_REMOVE'
      visual.eventLabel = game.i18n.localize(labelKey)
      visual.nextValue = isGain ? `+${data.amount ?? 0} XP` : `-${data.amount ?? 0} XP`
      visual.variant = isGain ? 'gain' : 'remove'
      break
    }

    case 'species.set':
    case 'career.set': {
      const isSpecies = type === 'species.set'
      visual.eventLabel = game.i18n.localize(isSpecies ? 'SWERPG.AUDIT_LOG.TYPE.SPECIES_SET' : 'SWERPG.AUDIT_LOG.TYPE.CAREER_SET')
      const noneLabel = game.i18n.localize('SWERPG.AUDIT_LOG.NONE')
      visual.previousValue = data.oldSpecies ?? data.oldCareer ?? noneLabel
      visual.nextValue = data.newSpecies ?? data.newCareer ?? noneLabel
      visual.variant = 'change'
      break
    }

    case 'specialization.add':
    case 'specialization.remove': {
      const isAdd = type === 'specialization.add'
      visual.eventLabel = game.i18n.localize(isAdd ? 'SWERPG.AUDIT_LOG.TYPE.SPECIALIZATION_ADD' : 'SWERPG.AUDIT_LOG.TYPE.SPECIALIZATION_REMOVE')
      visual.nextValue = data.specializationName ?? data.specializationId ?? ''
      visual.variant = isAdd ? 'add' : 'remove'
      break
    }

    case 'talent.purchase': {
      visual.eventLabel = game.i18n.localize('SWERPG.AUDIT_LOG.TYPE.TALENT_PURCHASE')
      visual.nextValue = data.talentName ?? data.talentId ?? ''
      visual.variant = 'add'
      break
    }

    case 'talent-node-purchase-succeeded':
    case 'talent-node-purchase-failed':
    case 'talent-node-forget-succeeded':
    case 'talent-node-forget-failed': {
      const isSuccess = type.endsWith('succeeded')
      const isPurchase = type.includes('purchase')
      visual.eventLabel = game.i18n.localize(`SWERPG.AUDIT_LOG.TYPE.${type.replace(/[-.]/g, '_').toUpperCase()}`)
      if (isSuccess) {
        visual.nextValue = data.talentId ?? data.nodeId ?? ''
        visual.variant = isPurchase ? 'add' : 'remove'
      } else {
        visual.nextValue = data.nodeId ?? ''
        visual.variant = 'fail'
      }
      break
    }

    case 'talent-node-purchase': {
      visual.eventLabel = game.i18n.localize('SWERPG.AUDIT_LOG.TYPE.TALENT_NODE_PURCHASE')
      visual.nextValue = data.talentId ?? data.nodeId ?? ''
      visual.variant = 'add'
      break
    }

    case 'advancement.level': {
      visual.eventLabel = game.i18n.localize('SWERPG.AUDIT_LOG.TYPE.ADVANCEMENT_LEVEL')
      visual.previousValue = String(data.oldLevel ?? 0)
      visual.nextValue = String(data.newLevel ?? 0)
      visual.variant = 'change'
      break
    }

    case 'item.purchase': {
      visual.eventLabel = game.i18n.localize('SWERPG.AUDIT_LOG.TYPE.ITEM_PURCHASE')
      visual.nextValue = `${data.itemName ?? ''} (${data.itemType ?? ''})`
      visual.variant = 'add'
      break
    }

    case 'item.sale': {
      visual.eventLabel = game.i18n.localize('SWERPG.AUDIT_LOG.TYPE.ITEM_SALE')
      visual.nextValue = `${data.itemName ?? ''} (${data.itemType ?? ''})`
      visual.variant = 'gain'
      break
    }

    default: {
      const xpDelta = entry.xpDelta ?? 0
      visual.eventLabel = game.i18n.localize('SWERPG.AUDIT_LOG.TYPE.UNKNOWN')
      visual.nextValue = buildAuditLogDescription(entry)
      visual.variant = xpDelta > 0 ? 'gain' : xpDelta < 0 ? 'remove' : 'change'
      break
    }
  }

  visual.hasPreviousValue = visual.previousValue !== null

  return visual
}

/**
 * Normalize a string for text search by lowercasing and collapsing whitespace.
 * @param {string|null|undefined} value
 * @returns {string}
 */
function normalizeSearchText(value) {
  if (value === null || value === undefined) return ''
  return String(value).toLowerCase().trim()
}

/**
 * Return true if the entry matches the text query.
 * Searches against typeLabel, description, eventLabel, and nextValue.
 * @param {object} entry  A display-ready audit log entry
 * @param {string} query  Already normalized query (lowercase, trimmed)
 * @returns {boolean}
 */
function entryMatchesTextQuery(entry, query) {
  if (!query) return true
  const searchIn = [entry.typeLabel, entry.description, entry.eventLabel, entry.nextValue, entry.previousValue]
  return searchIn.some((field) => normalizeSearchText(field).includes(query))
}

/**
 * Parse an ISO date string (YYYY-MM-DD) to a UTC midnight timestamp.
 * Returns null when the string is absent or invalid.
 * @param {string|null|undefined} dateStr
 * @returns {number|null}
 */
function parseDateBound(dateStr) {
  if (!dateStr) return null
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return null
  return date.getTime()
}

/**
 * Return true if the entry timestamp falls within the inclusive date bounds.
 * A null bound is treated as open (unbounded).
 * When from > to both bounds are ignored (invalid range treated as open).
 * @param {object} entry
 * @param {number|null} fromTs  UTC timestamp for start-of-day (inclusive)
 * @param {number|null} toTs    UTC timestamp for end-of-day (inclusive)
 * @returns {boolean}
 */
function entryMatchesDateRange(entry, fromTs, toTs) {
  if (fromTs !== null && toTs !== null && fromTs > toTs) return true
  const ts = entry.timestamp ?? 0
  if (fromTs !== null && ts < fromTs) return false
  if (toTs !== null && ts > toTs) return false
  return true
}

/**
 * Normalize the snapshot stored on an audit log entry into a canonical details block.
 *
 * Supported snapshot shapes:
 *  - Modern flat (TECH-161+): `{ xpAvailable, totalXpSpent, totalXpGained }`
 *  - Legacy nested: `{ xpAfter: { xpAvailable, totalXpSpent, totalXpGained } }`
 *  - Credits: `{ creditsBefore, creditsAfter }` (combined with either XP shape above)
 *
 * @param {object|null|undefined} snapshot  Raw snapshot from the stored log entry
 * @returns {{ hasDetails: boolean, lines: Array<{ labelKey: string, value: string|number }> }}
 */
export function buildSnapshotDetails(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') {
    return { hasDetails: false, lines: [] }
  }

  // Resolve the XP sub-object: modern flat lives directly on snapshot,
  // legacy format nests it under snapshot.xpAfter.
  const xpSource = snapshot.xpAfter && typeof snapshot.xpAfter === 'object' ? snapshot.xpAfter : snapshot

  const xpAvailable = xpSource.xpAvailable !== undefined && xpSource.xpAvailable !== null ? Number(xpSource.xpAvailable) : null
  const totalXpSpent = xpSource.totalXpSpent !== undefined && xpSource.totalXpSpent !== null ? Number(xpSource.totalXpSpent) : null
  const totalXpGained = xpSource.totalXpGained !== undefined && xpSource.totalXpGained !== null ? Number(xpSource.totalXpGained) : null

  const creditsBefore = snapshot.creditsBefore !== undefined && snapshot.creditsBefore !== null ? Number(snapshot.creditsBefore) : null
  const creditsAfter = snapshot.creditsAfter !== undefined && snapshot.creditsAfter !== null ? Number(snapshot.creditsAfter) : null

  const lines = []

  if (xpAvailable !== null) {
    lines.push({ labelKey: 'SWERPG.AUDIT_LOG.SNAPSHOT.XP_AVAILABLE', value: xpAvailable })
  }
  if (totalXpSpent !== null) {
    lines.push({ labelKey: 'SWERPG.AUDIT_LOG.SNAPSHOT.TOTAL_XP_SPENT', value: totalXpSpent })
  }
  if (totalXpGained !== null) {
    lines.push({ labelKey: 'SWERPG.AUDIT_LOG.SNAPSHOT.TOTAL_XP_GAINED', value: totalXpGained })
  }
  if (creditsBefore !== null) {
    lines.push({ labelKey: 'SWERPG.AUDIT_LOG.SNAPSHOT.CREDITS_BEFORE', value: creditsBefore })
  }
  if (creditsAfter !== null) {
    lines.push({ labelKey: 'SWERPG.AUDIT_LOG.SNAPSHOT.CREDITS_AFTER', value: creditsAfter })
  }

  return { hasDetails: lines.length > 0, lines }
}

/**
 * Build the display-ready audit log entries for a character.
 * @param {Actor|object} actor
 * @param {string} [family=AUDIT_LOG_FAMILIES.all]  Family filter
 * @param {object} [searchOptions={}]
 * @param {string} [searchOptions.query='']          Text search query (raw, will be normalized)
 * @param {string|null} [searchOptions.dateFrom=null] ISO date string (YYYY-MM-DD) for range start
 * @param {string|null} [searchOptions.dateTo=null]   ISO date string (YYYY-MM-DD) for range end
 * @returns {{ entries: Array<object>, totalCount: number, filteredCount: number, familyCounts: Record<string, number> }}
 */
export function buildAuditLogEntries(actor, family = AUDIT_LOG_FAMILIES.all, { query = '', dateFrom = null, dateTo = null } = {}) {
  const logs = foundry.utils.getProperty(actor, AUDIT_LOG_PATH) ?? []

  const allEntries = [...logs]
    .sort((left, right) => (right.timestamp ?? 0) - (left.timestamp ?? 0))
    .map((entry) => {
      const entryFamily = getAuditLogFamily(entry.type)
      const xpDelta = Number(entry.xpDelta) || 0
      const isCreditEntry = entry.type === 'item.purchase' || entry.type === 'item.sale'
      const creditDelta = Number(entry.creditDelta) || 0
      const deltaValue = isCreditEntry ? creditDelta : xpDelta
      const formattedDelta = isCreditEntry ? formatAuditLogCreditDelta(creditDelta) : formatAuditLogDelta(xpDelta)
      const visual = buildAuditLogEntryVisual(actor, entry)

      const deltaUnit = getAuditLogDeltaUnit(entry.type)
      const deltaUnitIcon = AUDIT_LOG_DELTA_UNIT_ICONS[deltaUnit] ?? ''
      const deltaUnitLabelKey =
        deltaUnit === AUDIT_LOG_DELTA_UNITS.xp
          ? 'SWERPG.AUDIT_LOG.DELTA.UNIT.XP'
          : deltaUnit === AUDIT_LOG_DELTA_UNITS.credits
            ? 'SWERPG.AUDIT_LOG.DELTA.UNIT.CREDITS'
            : ''
      const deltaUnitLabel = deltaUnitLabelKey ? game.i18n.localize(deltaUnitLabelKey) : ''

      const snapshotDetails = buildSnapshotDetails(entry.snapshot)
      const detailLines = snapshotDetails.lines.map((line) => ({
        ...line,
        label: game.i18n.localize(line.labelKey),
      }))

      return {
        ...entry,
        family: entryFamily,
        familyLabel: game.i18n.localize(AUDIT_LOG_FILTER_LABELS[entryFamily] ?? 'SWERPG.AUDIT_LOG.FILTER.ALL'),
        familyIcon: getAuditLogFamilyIcon(entryFamily),
        typeLabel: getAuditLogTypeLabel(entry.type),
        description: buildAuditLogDescription(entry),
        formattedTimestamp: formatAuditLogTimestamp(entry.timestamp),
        formattedDelta,
        deltaClass: deltaValue > 0 ? 'is-gain' : deltaValue < 0 ? 'is-spend' : 'is-neutral',
        hasDelta: deltaValue !== 0,
        formattedXpDelta: formatAuditLogDelta(xpDelta),
        xpDeltaClass: xpDelta > 0 ? 'is-gain' : xpDelta < 0 ? 'is-spend' : 'is-neutral',
        hasXpDelta: xpDelta !== 0,
        deltaUnit,
        deltaUnitIcon,
        deltaUnitLabel,
        deltaUnitClass: `audit-log-entry__delta--unit-${deltaUnit}`,
        ...visual,
        variantGlyph: getAuditLogVariantGlyph(visual.variant),
        variantGlyphLabel: game.i18n.localize(getVariantGlyphLabel(visual.variant)),
        hasDetails: snapshotDetails.hasDetails,
        details: detailLines,
      }
    })

  const totalCount = allEntries.length

  const normalizedQuery = normalizeSearchText(query)
  const fromTs = parseDateBound(dateFrom)
  // For toTs, advance to end-of-day (23:59:59.999) so the date is inclusive
  const toTs = dateTo ? parseDateBound(dateTo) + 86399999 : null

  // Corpus filtered by text/date only — used to compute per-family counts independently of the active family filter.
  const searchFilteredEntries = allEntries.filter((entry) => {
    if (!entryMatchesTextQuery(entry, normalizedQuery)) return false
    if (!entryMatchesDateRange(entry, fromTs, toTs)) return false
    return true
  })

  // Per-family counts within the search-filtered corpus (before applying family filter).
  // The 'all' family count equals the total number of search-filtered entries.
  const familyCounts = { [AUDIT_LOG_FAMILIES.all]: searchFilteredEntries.length }
  for (const entry of searchFilteredEntries) {
    familyCounts[entry.family] = (familyCounts[entry.family] ?? 0) + 1
  }

  const filteredEntries = searchFilteredEntries.filter((entry) => {
    if (family !== AUDIT_LOG_FAMILIES.all && entry.family !== family) return false
    return true
  })

  return { entries: filteredEntries, totalCount, filteredCount: filteredEntries.length, familyCounts }
}

export default class CharacterAuditLogApp extends api.HandlebarsApplicationMixin(api.DocumentSheetV2) {
  constructor({ filter = AUDIT_LOG_FAMILIES.all, ...options } = {}) {
    super(options)
    this.filter = AUDIT_LOG_FILTER_ORDER.includes(filter) ? filter : AUDIT_LOG_FAMILIES.all
    /** @type {string} Current text search query */
    this.searchQuery = ''
    /** @type {string|null} ISO date string for range start (inclusive) */
    this.dateFrom = null
    /** @type {string|null} ISO date string for range end (inclusive) */
    this.dateTo = null
  }

  static DEFAULT_OPTIONS = {
    classes: ['swerpg', 'application', 'character-audit-log'],
    tag: 'section',
    position: { width: 780, height: 720 },
    actions: {
      setFilter: CharacterAuditLogApp.#onSetFilter,
      exportCsv: CharacterAuditLogApp.#onExportCsv,
      clearSearch: CharacterAuditLogApp.#onClearSearch,
    },
    window: {
      minimizable: true,
      resizable: true,
    },
    sheetConfig: false,
  }

  static PARTS = {
    root: {
      root: true,
      template: 'systems/swerpg/templates/applications/character-audit-log.hbs',
      scrollable: ['.audit-log__entries'],
    },
  }

  get actor() {
    return this.document
  }

  get title() {
    return game.i18n.format('SWERPG.AUDIT_LOG.TITLE', { actor: this.actor?.name ?? '' })
  }

  async render(options) {
    if (!canViewAuditLog(this.actor)) {
      ui.notifications.warn(game.i18n.localize('SWERPG.AUDIT_LOG.NO_PERMISSION'))
      return this
    }

    return super.render(options)
  }

  async _prepareContext(_options) {
    const { entries, totalCount, filteredCount, familyCounts } = buildAuditLogEntries(this.actor, this.filter, {
      query: this.searchQuery,
      dateFrom: this.dateFrom,
      dateTo: this.dateTo,
    })

    const hasActiveSearch = this.searchQuery !== '' || this.dateFrom !== null || this.dateTo !== null
    const isFiltered = this.filter !== AUDIT_LOG_FAMILIES.all || hasActiveSearch

    const sections = buildAuditLogDateSections(entries)

    // isActiveFamilyEmpty: true when the active family filter has no entries in the
    // current search-filtered corpus, distinct from "no results from search" and "log is empty".
    const isActiveFamilyEmpty = this.filter !== AUDIT_LOG_FAMILIES.all && (familyCounts[this.filter] ?? 0) === 0

    return {
      actor: this.actor,
      document: this.document,
      system: this.document.system,
      config: game.system.config,
      isOwner: this.document.isOwner,
      canViewAuditLog: canViewAuditLog(this.actor),
      canExport: canViewAuditLog(this.actor),
      activeFilter: this.filter,
      filters: AUDIT_LOG_FILTER_ORDER.map((filterId) => {
        const count = familyCounts[filterId] ?? 0
        const isEmpty = count === 0
        return {
          id: filterId,
          label: game.i18n.localize(AUDIT_LOG_FILTER_LABELS[filterId]),
          icon: getAuditLogFamilyIcon(filterId),
          count,
          isEmpty,
          cssClass: [filterId === this.filter ? 'is-active' : '', isEmpty ? 'is-empty' : ''].filter(Boolean).join(' '),
          isPressed: filterId === this.filter,
        }
      }),
      searchQuery: this.searchQuery,
      dateFrom: this.dateFrom ?? '',
      dateTo: this.dateTo ?? '',
      entries,
      sections,
      hasEntries: totalCount > 0,
      hasFilteredEntries: filteredCount > 0,
      totalCount,
      filteredCount,
      isFiltered,
      isActiveFamilyEmpty,
      emptyLabel: game.i18n.localize('SWERPG.AUDIT_LOG.EMPTY'),
      emptyFilteredLabel: game.i18n.localize('SWERPG.AUDIT_LOG.EMPTY_FILTERED'),
      emptyFamilyLabel: game.i18n.localize('SWERPG.AUDIT_LOG.EMPTY_FAMILY'),
      emptyState: {
        kind: 'empty-log',
        icon: 'fa-solid fa-scroll',
        title: game.i18n.localize('SWERPG.AUDIT_LOG.EMPTY_TITLE'),
        hint: game.i18n.localize('SWERPG.AUDIT_LOG.EMPTY_HINT'),
      },
    }
  }

  static async #onSetFilter(event, target) {
    event.preventDefault()

    const filter = target?.dataset.filter ?? event.currentTarget?.dataset.filter
    if (!AUDIT_LOG_FILTER_ORDER.includes(filter)) return
    if (this.filter === filter) return

    this.filter = filter
    await this.render({ force: true })
  }

  static async #onClearSearch(event) {
    event.preventDefault()
    this.searchQuery = ''
    this.dateFrom = null
    this.dateTo = null
    await this.render({ force: true })
  }

  /**
   * Bind change listeners for the search input and date range inputs.
   * These are live inputs whose values must persist across renders without
   * triggering a full re-render on every keystroke.
   * @param {jQuery|HTMLElement} html
   */
  activateListeners(html) {
    super.activateListeners(html)

    const root = html instanceof HTMLElement ? html : html[0]
    if (!root) return

    const searchInput = root.querySelector('.audit-log__search-input')
    if (searchInput) {
      searchInput.addEventListener('change', (event) => {
        this.searchQuery = event.target.value ?? ''
        this.render({ force: true })
      })
    }

    const dateFromInput = root.querySelector('.audit-log__date-from')
    if (dateFromInput) {
      dateFromInput.addEventListener('change', (event) => {
        this.dateFrom = event.target.value || null
        this.render({ force: true })
      })
    }

    const dateToInput = root.querySelector('.audit-log__date-to')
    if (dateToInput) {
      dateToInput.addEventListener('change', (event) => {
        this.dateTo = event.target.value || null
        this.render({ force: true })
      })
    }
  }

  static async #onExportCsv(event, target) {
    event.preventDefault()

    if (!canViewAuditLog(this.actor)) {
      ui.notifications.warn(game.i18n.localize('SWERPG.AUDIT_LOG.NO_PERMISSION'))
      return
    }

    try {
      const csvContent = buildCsvContent(this.actor)
      const filename = buildExportFilename(this.actor)

      foundry.utils.saveDataToFile(csvContent, 'text/csv;charset=utf-8', filename)
    } catch (err) {
      logger.error('[AuditLog] CSV export failed', err)
      ui.notifications.error(game.i18n.localize('SWERPG.AUDIT_LOG.EXPORT_FAILED'))
    }
  }
}

/* -------------------------------------------- */
/*  CSV export helpers                          */
/* -------------------------------------------- */

/**
 * Escape a value for inclusion in a CSV cell, wrapping in double-quotes when the string contains commas, quotes, or line breaks.
 * @param {*} value
 */
export function escapeCsvCell(value) {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Return the display name of the first user with owner-level permission on the actor, or "unknown-player".
 * @param {Actor|object} actor
 */
export function getPrimaryOwnerName(actor) {
  if (!actor?.ownership) return 'unknown-player'

  const ownerIds = Object.entries(actor.ownership)
    .filter(([, level]) => level === 3)
    .map(([userId]) => userId)

  if (ownerIds.length === 0) return 'unknown-player'

  const primaryOwnerId = ownerIds[0]
  const user = game.users?.get(primaryOwnerId)
  return user?.name ?? 'unknown-player'
}

/**
 * Convert a string to a lowercase slug safe for use in filenames.
 * @param {string} str
 */
function slugify(str) {
  return (
    str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .toLowerCase() || 'unnamed'
  )
}

/**
 * Build a dated CSV export filename from the actor's name and primary owner name.
 * @param {Actor|object} actor
 */
export function buildExportFilename(actor) {
  const charName = slugify(actor?.name ?? 'character')
  const ownerName = slugify(getPrimaryOwnerName(actor))
  const date = new Date().toISOString().slice(0, 10)
  return `${charName}_${ownerName}_${date}.csv`
}

/**
 * Build the full CSV content for the actor's audit log, including the header row.
 * @param {Actor|object} actor
 */
export function buildCsvContent(actor) {
  const rawLogs = foundry.utils.getProperty(actor, AUDIT_LOG_PATH) ?? []
  const ownerName = getPrimaryOwnerName(actor)
  const actorName = actor?.name ?? ''

  const header = CSV_COLUMNS.map(escapeCsvCell).join(',')
  const rows = rawLogs.map((entry) => {
    const typeLabel = getAuditLogTypeLabel(entry.type)
    const description = buildAuditLogDescription(entry)
    const formattedDate = formatAuditLogTimestamp(entry.timestamp)
    const xpDelta = Number(entry.xpDelta) || 0
    const creditDelta = Number(entry.creditDelta) || 0

    const row = [
      entry.timestamp ?? '',
      formattedDate,
      entry.userName ?? '',
      entry.type ?? '',
      typeLabel,
      description,
      xpDelta,
      creditDelta,
      actorName,
      ownerName,
    ]

    return row.map(escapeCsvCell).join(',')
  })

  return [header, ...rows].join('\n')
}
