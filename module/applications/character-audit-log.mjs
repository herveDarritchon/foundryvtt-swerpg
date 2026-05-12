const { api } = foundry.applications

const AUDIT_LOG_PATH = 'flags.swerpg.logs'

const AUDIT_LOG_FAMILIES = Object.freeze({
  all: 'all',
  skills: 'skills',
  talents: 'talents',
  xp: 'xp',
  characteristics: 'characteristics',
  details: 'details',
  advancement: 'advancement',
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
])

const AUDIT_LOG_FILTER_LABELS = Object.freeze({
  [AUDIT_LOG_FAMILIES.all]: 'SWERPG.AUDIT_LOG.FILTER.ALL',
  [AUDIT_LOG_FAMILIES.skills]: 'SWERPG.AUDIT_LOG.FILTER.SKILLS',
  [AUDIT_LOG_FAMILIES.talents]: 'SWERPG.AUDIT_LOG.FILTER.TALENTS',
  [AUDIT_LOG_FAMILIES.xp]: 'SWERPG.AUDIT_LOG.FILTER.XP',
  [AUDIT_LOG_FAMILIES.characteristics]: 'SWERPG.AUDIT_LOG.FILTER.CHARACTERISTICS',
  [AUDIT_LOG_FAMILIES.details]: 'SWERPG.AUDIT_LOG.FILTER.DETAILS',
  [AUDIT_LOG_FAMILIES.advancement]: 'SWERPG.AUDIT_LOG.FILTER.ADVANCEMENT',
})

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
  'advancement.level': 'SWERPG.AUDIT_LOG.TYPE.ADVANCEMENT_LEVEL',
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
    default:
      return AUDIT_LOG_FAMILIES.other
  }
}

function getAuditLogDateLocale() {
  const language = game.i18n?.lang
  if (language === 'fr') return 'fr-FR'
  if (language === 'en') return 'en-US'
  return language
}

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

function formatAuditLogDelta(xpDelta) {
  const value = Number(xpDelta) || 0
  const sign = value > 0 ? '+' : ''
  return `${sign}${value} XP`
}

function getAuditLogTypeLabel(type) {
  const key = AUDIT_LOG_TYPE_LABELS[type] ?? 'SWERPG.AUDIT_LOG.TYPE.UNKNOWN'
  return game.i18n.localize(key)
}

function getAuditLogName(value, fallbackKey = 'SWERPG.AUDIT_LOG.UNKNOWN_VALUE') {
  if (value === null || value === undefined || value === '') return game.i18n.localize(fallbackKey)
  return value
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
        characteristic: getAuditLogName(data.characteristicId, 'SWERPG.AUDIT_LOG.UNKNOWN_VALUE'),
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
    case 'advancement.level':
      return game.i18n.format('SWERPG.AUDIT_LOG.DESCRIPTION.ADVANCEMENT_LEVEL', {
        oldLevel: data.oldLevel ?? 0,
        newLevel: data.newLevel ?? 0,
      })
    default:
      return game.i18n.format('SWERPG.AUDIT_LOG.DESCRIPTION.UNKNOWN', {
        type: getAuditLogName(entry?.type, 'SWERPG.AUDIT_LOG.UNKNOWN_VALUE'),
      })
  }
}

/**
 * Build the display-ready audit log entries for a character.
 * @param {Actor|object} actor
 * @param {string} [filter=AUDIT_LOG_FAMILIES.all]
 * @returns {Array<object>}
 */
export function buildAuditLogEntries(actor, filter = AUDIT_LOG_FAMILIES.all) {
  const logs = foundry.utils.getProperty(actor, AUDIT_LOG_PATH) ?? []

  return [...logs]
    .sort((left, right) => (right.timestamp ?? 0) - (left.timestamp ?? 0))
    .map((entry) => {
      const family = getAuditLogFamily(entry.type)
      const xpDelta = Number(entry.xpDelta) || 0

      return {
        ...entry,
        family,
        familyLabel: game.i18n.localize(AUDIT_LOG_FILTER_LABELS[family] ?? 'SWERPG.AUDIT_LOG.FILTER.ALL'),
        typeLabel: getAuditLogTypeLabel(entry.type),
        description: buildAuditLogDescription(entry),
        formattedTimestamp: formatAuditLogTimestamp(entry.timestamp),
        formattedXpDelta: formatAuditLogDelta(xpDelta),
        xpDeltaClass: xpDelta > 0 ? 'is-gain' : xpDelta < 0 ? 'is-spend' : 'is-neutral',
        hasXpDelta: xpDelta !== 0,
      }
    })
    .filter((entry) => filter === AUDIT_LOG_FAMILIES.all || entry.family === filter)
}

export default class CharacterAuditLogApp extends api.HandlebarsApplicationMixin(api.DocumentSheetV2) {
  constructor({ filter = AUDIT_LOG_FAMILIES.all, ...options } = {}) {
    super(options)
    this.filter = AUDIT_LOG_FILTER_ORDER.includes(filter) ? filter : AUDIT_LOG_FAMILIES.all
  }

  static DEFAULT_OPTIONS = {
    classes: ['swerpg', 'application', 'character-audit-log'],
    tag: 'section',
    position: { width: 780, height: 720 },
    actions: {
      setFilter: CharacterAuditLogApp.#onSetFilter,
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
    const entries = buildAuditLogEntries(this.actor, this.filter)

    return {
      actor: this.actor,
      document: this.document,
      system: this.document.system,
      config: game.system.config,
      isOwner: this.document.isOwner,
      canViewAuditLog: canViewAuditLog(this.actor),
      activeFilter: this.filter,
      filters: AUDIT_LOG_FILTER_ORDER.map((filterId) => ({
        id: filterId,
        label: game.i18n.localize(AUDIT_LOG_FILTER_LABELS[filterId]),
        cssClass: filterId === this.filter ? 'is-active' : '',
      })),
      entries,
      hasEntries: entries.length > 0,
      emptyLabel: game.i18n.localize('SWERPG.AUDIT_LOG.EMPTY'),
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
}
