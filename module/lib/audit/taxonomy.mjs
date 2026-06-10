/**
 * @file module/lib/audit/taxonomy.mjs
 *
 * Pure-domain taxonomy registry for Audit Log event types.
 *
 * Each entry maps a technical type key to its business metadata:
 *   - label:       i18n key for the human-readable event name
 *   - family:      filter group the event belongs to
 *   - describe():  builds the localized description for an audit entry
 *   - chatVariant: default CSS variant for chat card rendering
 *
 * This module MUST NOT import Foundry globals (game, ui, Hooks, etc.).
 * Consumers are responsible for providing the i18n helpers as parameters.
 */

/* -------------------------------------------- */
/*  Canonical families                          */
/* -------------------------------------------- */

export const AUDIT_LOG_FAMILIES = Object.freeze({
  all: 'all',
  skills: 'skills',
  talents: 'talents',
  xp: 'xp',
  characteristics: 'characteristics',
  details: 'details',
  advancement: 'advancement',
  purchases: 'purchases',
  sales: 'sales',
  obligations: 'obligations',
  other: 'other',
})

/* -------------------------------------------- */
/*  Helper: resolve a localized name            */
/* -------------------------------------------- */

/**
 * Return a display-ready value or the localized fallback when value is absent/empty.
 * @param {*} value
 * @param {string} fallbackKey
 * @param {Function} localize  i18n.localize from callers
 * @returns {string}
 */
function resolveNameOr(value, fallbackKey, localize) {
  if (value === null || value === undefined || value === '') return localize(fallbackKey)
  return value
}

/**
 * Resolve a localized characteristic label from its technical identifier.
 * @param {string|null|undefined} characteristicId
 * @param {Function} localize   i18n.localize
 * @param {Function} format     i18n.format
 * @param {object|null} characteristics  game.system.config.CHARACTERISTICS map, or null
 * @returns {string}
 */
function resolveCharacteristicLabel(characteristicId, localize, characteristics) {
  if (!characteristicId) return localize('SWERPG.AUDIT_LOG.UNKNOWN_VALUE')
  const characteristic = characteristics?.[characteristicId]
  if (!characteristic?.label) return localize('SWERPG.AUDIT_LOG.UNKNOWN_VALUE')
  return localize(characteristic.label)
}

/* -------------------------------------------- */
/*  Registry type definition                    */
/* -------------------------------------------- */

/**
 * @typedef {object} AuditTaxonomyEntry
 * @property {string}   label        i18n key for the event type label
 * @property {string}   family       Canonical family identifier
 * @property {Function} describe     (entry, i18nHelpers) => string — builds the localized description
 * @property {string}   chatVariant  Default CSS variant for chat card ('add'|'remove'|'gain'|'change'|'fail')
 */

/**
 * @typedef {object} I18nHelpers
 * @property {Function} localize     game.i18n.localize
 * @property {Function} format       game.i18n.format
 * @property {object}   [characteristics]  game.system.config.CHARACTERISTICS
 */

/* -------------------------------------------- */
/*  Registry                                    */
/* -------------------------------------------- */

/**
 * Canonical taxonomy registry: maps each audit event type to its business metadata.
 * Add a new type here — nowhere else — to extend the audit log.
 *
 * @type {Record<string, AuditTaxonomyEntry>}
 */
export const AUDIT_TAXONOMY = Object.freeze({
  'skill.train': {
    label: 'SWERPG.AUDIT_LOG.TYPE.SKILL_TRAIN',
    family: AUDIT_LOG_FAMILIES.skills,
    chatVariant: 'add',
    describe(entry, { localize, format }) {
      const data = entry?.data ?? {}
      return format('SWERPG.AUDIT_LOG.DESCRIPTION.SKILL_TRAIN', {
        skill: resolveNameOr(data.skillName, 'SWERPG.AUDIT_LOG.UNKNOWN_SKILL', localize),
        oldRank: data.oldRank ?? 0,
        newRank: data.newRank ?? 0,
      })
    },
  },

  'skill.forget': {
    label: 'SWERPG.AUDIT_LOG.TYPE.SKILL_FORGET',
    family: AUDIT_LOG_FAMILIES.skills,
    chatVariant: 'remove',
    describe(entry, { localize, format }) {
      const data = entry?.data ?? {}
      return format('SWERPG.AUDIT_LOG.DESCRIPTION.SKILL_FORGET', {
        skill: resolveNameOr(data.skillName, 'SWERPG.AUDIT_LOG.UNKNOWN_SKILL', localize),
        oldRank: data.oldRank ?? 0,
        newRank: data.newRank ?? 0,
      })
    },
  },

  'characteristic.increase': {
    label: 'SWERPG.AUDIT_LOG.TYPE.CHARACTERISTIC_INCREASE',
    family: AUDIT_LOG_FAMILIES.characteristics,
    chatVariant: 'add',
    describe(entry, { localize, format, characteristics }) {
      const data = entry?.data ?? {}
      return format('SWERPG.AUDIT_LOG.DESCRIPTION.CHARACTERISTIC_INCREASE', {
        characteristic: resolveCharacteristicLabel(data.characteristicId, localize, characteristics),
        oldValue: data.oldValue ?? 0,
        newValue: data.newValue ?? 0,
      })
    },
  },

  'xp.spend': {
    label: 'SWERPG.AUDIT_LOG.TYPE.XP_SPEND',
    family: AUDIT_LOG_FAMILIES.xp,
    chatVariant: 'remove',
    describe(entry, { format }) {
      const data = entry?.data ?? {}
      return format('SWERPG.AUDIT_LOG.DESCRIPTION.XP_SPEND', {
        amount: data.amount ?? Math.abs(entry?.xpDelta ?? 0),
      })
    },
  },

  'xp.refund': {
    label: 'SWERPG.AUDIT_LOG.TYPE.XP_REFUND',
    family: AUDIT_LOG_FAMILIES.xp,
    chatVariant: 'gain',
    describe(entry, { format }) {
      const data = entry?.data ?? {}
      return format('SWERPG.AUDIT_LOG.DESCRIPTION.XP_REFUND', {
        amount: data.amount ?? Math.abs(entry?.xpDelta ?? 0),
      })
    },
  },

  'xp.grant': {
    label: 'SWERPG.AUDIT_LOG.TYPE.XP_GRANT',
    family: AUDIT_LOG_FAMILIES.xp,
    chatVariant: 'gain',
    describe(entry, { format }) {
      const data = entry?.data ?? {}
      return format('SWERPG.AUDIT_LOG.DESCRIPTION.XP_GRANT', {
        amount: data.amount ?? entry?.xpDelta ?? 0,
      })
    },
  },

  'xp.remove': {
    label: 'SWERPG.AUDIT_LOG.TYPE.XP_REMOVE',
    family: AUDIT_LOG_FAMILIES.xp,
    chatVariant: 'remove',
    describe(entry, { format }) {
      const data = entry?.data ?? {}
      return format('SWERPG.AUDIT_LOG.DESCRIPTION.XP_REMOVE', {
        amount: data.amount ?? Math.abs(entry?.xpDelta ?? 0),
      })
    },
  },

  'species.set': {
    label: 'SWERPG.AUDIT_LOG.TYPE.SPECIES_SET',
    family: AUDIT_LOG_FAMILIES.details,
    chatVariant: 'change',
    describe(entry, { localize, format }) {
      const data = entry?.data ?? {}
      return format('SWERPG.AUDIT_LOG.DESCRIPTION.SPECIES_SET', {
        oldSpecies: resolveNameOr(data.oldSpecies, 'SWERPG.AUDIT_LOG.NONE', localize),
        newSpecies: resolveNameOr(data.newSpecies, 'SWERPG.AUDIT_LOG.NONE', localize),
      })
    },
  },

  'career.set': {
    label: 'SWERPG.AUDIT_LOG.TYPE.CAREER_SET',
    family: AUDIT_LOG_FAMILIES.details,
    chatVariant: 'change',
    describe(entry, { localize, format }) {
      const data = entry?.data ?? {}
      return format('SWERPG.AUDIT_LOG.DESCRIPTION.CAREER_SET', {
        oldCareer: resolveNameOr(data.oldCareer, 'SWERPG.AUDIT_LOG.NONE', localize),
        newCareer: resolveNameOr(data.newCareer, 'SWERPG.AUDIT_LOG.NONE', localize),
      })
    },
  },

  'specialization.add': {
    label: 'SWERPG.AUDIT_LOG.TYPE.SPECIALIZATION_ADD',
    family: AUDIT_LOG_FAMILIES.details,
    chatVariant: 'add',
    describe(entry, { localize, format }) {
      const data = entry?.data ?? {}
      return format('SWERPG.AUDIT_LOG.DESCRIPTION.SPECIALIZATION_ADD', {
        specialization: resolveNameOr(data.specializationName ?? data.specializationId, 'SWERPG.AUDIT_LOG.UNKNOWN_SPECIALIZATION', localize),
      })
    },
  },

  'specialization.remove': {
    label: 'SWERPG.AUDIT_LOG.TYPE.SPECIALIZATION_REMOVE',
    family: AUDIT_LOG_FAMILIES.details,
    chatVariant: 'remove',
    describe(entry, { localize, format }) {
      const data = entry?.data ?? {}
      return format('SWERPG.AUDIT_LOG.DESCRIPTION.SPECIALIZATION_REMOVE', {
        specialization: resolveNameOr(data.specializationName ?? data.specializationId, 'SWERPG.AUDIT_LOG.UNKNOWN_SPECIALIZATION', localize),
      })
    },
  },

  'talent.purchase': {
    label: 'SWERPG.AUDIT_LOG.TYPE.TALENT_PURCHASE',
    family: AUDIT_LOG_FAMILIES.talents,
    chatVariant: 'add',
    describe(entry, { localize, format }) {
      const data = entry?.data ?? {}
      return format('SWERPG.AUDIT_LOG.DESCRIPTION.TALENT_PURCHASE', {
        talent: resolveNameOr(data.talentName, 'SWERPG.AUDIT_LOG.UNKNOWN_TALENT', localize),
        ranks: data.ranks ?? 1,
      })
    },
  },

  'talent-node-purchase': {
    label: 'SWERPG.AUDIT_LOG.TYPE.TALENT_NODE_PURCHASE',
    family: AUDIT_LOG_FAMILIES.talents,
    chatVariant: 'add',
    describe(entry, { localize, format }) {
      const data = entry?.data ?? {}
      return format('SWERPG.AUDIT_LOG.DESCRIPTION.TALENT_NODE_PURCHASE', {
        talentId: resolveNameOr(data.talentId, 'SWERPG.AUDIT_LOG.UNKNOWN_VALUE', localize),
        specializationId: resolveNameOr(data.specializationId, 'SWERPG.AUDIT_LOG.UNKNOWN_VALUE', localize),
        cost: data.cost ?? 0,
      })
    },
  },

  'talent-node-purchase-succeeded': {
    label: 'SWERPG.AUDIT_LOG.TYPE.TALENT_NODE_PURCHASE_SUCCEEDED',
    family: AUDIT_LOG_FAMILIES.talents,
    chatVariant: 'add',
    describe(entry, { localize, format }) {
      const data = entry?.data ?? {}
      return format('SWERPG.AUDIT_LOG.DESCRIPTION.TALENT_NODE_PURCHASE', {
        talentId: resolveNameOr(data.talentId, 'SWERPG.AUDIT_LOG.UNKNOWN_VALUE', localize),
        specializationId: resolveNameOr(data.specializationId, 'SWERPG.AUDIT_LOG.UNKNOWN_VALUE', localize),
        cost: data.cost ?? 0,
      })
    },
  },

  'talent-node-purchase-failed': {
    label: 'SWERPG.AUDIT_LOG.TYPE.TALENT_NODE_PURCHASE_FAILED',
    family: AUDIT_LOG_FAMILIES.talents,
    chatVariant: 'fail',
    describe(entry, { localize, format }) {
      const data = entry?.data ?? {}
      return format('SWERPG.AUDIT_LOG.DESCRIPTION.TALENT_NODE_PURCHASE_FAILED', {
        nodeId: resolveNameOr(data.nodeId, 'SWERPG.AUDIT_LOG.UNKNOWN_VALUE', localize),
        reasonCode: resolveNameOr(data.reasonCode, 'SWERPG.AUDIT_LOG.UNKNOWN_VALUE', localize),
      })
    },
  },

  'talent-node-forget-succeeded': {
    label: 'SWERPG.AUDIT_LOG.TYPE.TALENT_NODE_FORGET_SUCCEEDED',
    family: AUDIT_LOG_FAMILIES.talents,
    chatVariant: 'remove',
    describe(entry, { localize, format }) {
      const data = entry?.data ?? {}
      return format('SWERPG.AUDIT_LOG.DESCRIPTION.TALENT_NODE_FORGET', {
        talentId: resolveNameOr(data.talentId, 'SWERPG.AUDIT_LOG.UNKNOWN_VALUE', localize),
        specializationId: resolveNameOr(data.specializationId, 'SWERPG.AUDIT_LOG.UNKNOWN_VALUE', localize),
        cost: data.cost ?? 0,
      })
    },
  },

  'talent-node-forget-failed': {
    label: 'SWERPG.AUDIT_LOG.TYPE.TALENT_NODE_FORGET_FAILED',
    family: AUDIT_LOG_FAMILIES.talents,
    chatVariant: 'fail',
    describe(entry, { localize, format }) {
      const data = entry?.data ?? {}
      return format('SWERPG.AUDIT_LOG.DESCRIPTION.TALENT_NODE_FORGET_FAILED', {
        nodeId: resolveNameOr(data.nodeId, 'SWERPG.AUDIT_LOG.UNKNOWN_VALUE', localize),
        reasonCode: resolveNameOr(data.reasonCode, 'SWERPG.AUDIT_LOG.UNKNOWN_VALUE', localize),
      })
    },
  },

  'advancement.level': {
    label: 'SWERPG.AUDIT_LOG.TYPE.ADVANCEMENT_LEVEL',
    family: AUDIT_LOG_FAMILIES.advancement,
    chatVariant: 'change',
    describe(entry, { format }) {
      const data = entry?.data ?? {}
      return format('SWERPG.AUDIT_LOG.DESCRIPTION.ADVANCEMENT_LEVEL', {
        oldLevel: data.oldLevel ?? 0,
        newLevel: data.newLevel ?? 0,
      })
    },
  },

  'item.purchase': {
    label: 'SWERPG.AUDIT_LOG.TYPE.ITEM_PURCHASE',
    family: AUDIT_LOG_FAMILIES.purchases,
    chatVariant: 'add',
    describe(entry, { localize, format }) {
      const data = entry?.data ?? {}
      return format('SWERPG.AUDIT_LOG.DESCRIPTION.ITEM_PURCHASE', {
        itemName: resolveNameOr(data.itemName, 'SWERPG.AUDIT_LOG.UNKNOWN_ITEM', localize),
        itemType: data.itemType ?? '',
        price: data.price ?? 0,
        quantity: data.quantity ?? 1,
      })
    },
  },

  'item.sale': {
    label: 'SWERPG.AUDIT_LOG.TYPE.ITEM_SALE',
    family: AUDIT_LOG_FAMILIES.sales,
    chatVariant: 'gain',
    describe(entry, { localize, format }) {
      const data = entry?.data ?? {}
      return format('SWERPG.AUDIT_LOG.DESCRIPTION.ITEM_SALE', {
        itemName: resolveNameOr(data.itemName, 'SWERPG.AUDIT_LOG.UNKNOWN_ITEM', localize),
        itemType: data.itemType ?? '',
        resalePrice: data.resalePrice ?? 0,
        fraction: Math.round((data.fraction ?? 0) * 100),
      })
    },
  },

  'obligation.create': {
    label: 'SWERPG.AUDIT_LOG.TYPE.OBLIGATION_CREATE',
    family: AUDIT_LOG_FAMILIES.obligations,
    chatVariant: 'add',
    describe(entry, { localize, format }) {
      const data = entry?.data ?? {}
      return format('SWERPG.AUDIT_LOG.DESCRIPTION.OBLIGATION_CREATE', {
        obligationName: resolveNameOr(data.obligationName, 'SWERPG.AUDIT_LOG.UNKNOWN_OBLIGATION', localize),
        value: data.value ?? 0,
      })
    },
  },

  'obligation.update': {
    label: 'SWERPG.AUDIT_LOG.TYPE.OBLIGATION_UPDATE',
    family: AUDIT_LOG_FAMILIES.obligations,
    chatVariant: 'change',
    describe(entry, { localize, format }) {
      const data = entry?.data ?? {}
      return format('SWERPG.AUDIT_LOG.DESCRIPTION.OBLIGATION_UPDATE', {
        obligationName: resolveNameOr(data.obligationName, 'SWERPG.AUDIT_LOG.UNKNOWN_OBLIGATION', localize),
      })
    },
  },

  'obligation.delete': {
    label: 'SWERPG.AUDIT_LOG.TYPE.OBLIGATION_DELETE',
    family: AUDIT_LOG_FAMILIES.obligations,
    chatVariant: 'remove',
    describe(entry, { localize, format }) {
      const data = entry?.data ?? {}
      return format('SWERPG.AUDIT_LOG.DESCRIPTION.OBLIGATION_DELETE', {
        obligationName: resolveNameOr(data.obligationName, 'SWERPG.AUDIT_LOG.UNKNOWN_OBLIGATION', localize),
        value: data.value ?? 0,
      })
    },
  },
})

/* -------------------------------------------- */
/*  Public lookup helpers                       */
/* -------------------------------------------- */

/**
 * Return the taxonomy entry for the given type, or undefined when the type is unknown.
 * @param {string} type
 * @returns {AuditTaxonomyEntry|undefined}
 */
export function getTaxonomyEntry(type) {
  return AUDIT_TAXONOMY[type]
}

/**
 * Map a technical audit entry type to its business filter family.
 * Falls back to 'other' for unknown types.
 * @param {string} type
 * @returns {string}
 */
export function getAuditLogFamilyFromType(type) {
  return AUDIT_TAXONOMY[type]?.family ?? AUDIT_LOG_FAMILIES.other
}

/**
 * Return the i18n label key for the given audit event type.
 * Falls back to the UNKNOWN key for unrecognized types.
 * @param {string} type
 * @returns {string}
 */
export function getAuditLogTypeLabelKey(type) {
  return AUDIT_TAXONOMY[type]?.label ?? 'SWERPG.AUDIT_LOG.TYPE.UNKNOWN'
}

/**
 * Build a localized description for a single audit log entry using the registry.
 * Falls back to a generic description for unknown types.
 *
 * @param {object} entry  A raw audit log entry with at least { type, data? }
 * @param {I18nHelpers} i18nHelpers
 * @returns {string}
 */
export function buildAuditLogDescriptionFromRegistry(entry, i18nHelpers) {
  const { localize, format } = i18nHelpers
  const taxonomyEntry = AUDIT_TAXONOMY[entry?.type]

  if (!taxonomyEntry) {
    return format('SWERPG.AUDIT_LOG.DESCRIPTION.UNKNOWN', {
      type: entry?.type ?? localize('SWERPG.AUDIT_LOG.UNKNOWN_VALUE'),
    })
  }

  return taxonomyEntry.describe(entry, i18nHelpers)
}
