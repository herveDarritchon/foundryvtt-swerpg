import { describe, expect, it } from 'vitest'

import {
  AUDIT_LOG_FAMILIES,
  AUDIT_TAXONOMY,
  buildAuditLogDescriptionFromRegistry,
  getAuditLogFamilyFromType,
  getAuditLogTypeLabelKey,
  getTaxonomyEntry,
} from '../../../module/lib/audit/taxonomy.mjs'

/**
 * Minimal i18n helpers for pure-domain tests.
 * Avoids any Foundry globals.
 *
 * - localize(key) returns the key as-is (no actual translation table).
 * - format(key, data) returns a string that includes all data values,
 *   so tests can assert on the presence of business values without needing
 *   a real i18n translation table.
 */
const i18n = {
  localize: (key) => key,
  format: (key, data = {}) => {
    // Build output as "KEY:value1:value2:..." so tests can check for data presence.
    const values = Object.values(data).map(String).join(':')
    return values ? `${key}:${values}` : key
  },
  characteristics: {
    brawn: { label: 'CHARACTERISTICS.Brawn' },
    agility: { label: 'CHARACTERISTICS.Agility' },
  },
}

/* -------------------------------------------- */
/*  AUDIT_LOG_FAMILIES                          */
/* -------------------------------------------- */

describe('AUDIT_LOG_FAMILIES', () => {
  it('exports all expected family keys', () => {
    expect(AUDIT_LOG_FAMILIES.all).toBe('all')
    expect(AUDIT_LOG_FAMILIES.skills).toBe('skills')
    expect(AUDIT_LOG_FAMILIES.talents).toBe('talents')
    expect(AUDIT_LOG_FAMILIES.xp).toBe('xp')
    expect(AUDIT_LOG_FAMILIES.characteristics).toBe('characteristics')
    expect(AUDIT_LOG_FAMILIES.details).toBe('details')
    expect(AUDIT_LOG_FAMILIES.advancement).toBe('advancement')
    expect(AUDIT_LOG_FAMILIES.purchases).toBe('purchases')
    expect(AUDIT_LOG_FAMILIES.sales).toBe('sales')
    expect(AUDIT_LOG_FAMILIES.obligations).toBe('obligations')
    expect(AUDIT_LOG_FAMILIES.other).toBe('other')
  })

  it('is frozen', () => {
    expect(Object.isFrozen(AUDIT_LOG_FAMILIES)).toBe(true)
  })
})

/* -------------------------------------------- */
/*  AUDIT_TAXONOMY registry integrity           */
/* -------------------------------------------- */

describe('AUDIT_TAXONOMY registry', () => {
  it('is frozen', () => {
    expect(Object.isFrozen(AUDIT_TAXONOMY)).toBe(true)
  })

  it('every entry has required shape: label, family, describe, chatVariant', () => {
    for (const [type, entry] of Object.entries(AUDIT_TAXONOMY)) {
      expect(typeof entry.label, `${type}.label must be a string`).toBe('string')
      expect(typeof entry.family, `${type}.family must be a string`).toBe('string')
      expect(typeof entry.describe, `${type}.describe must be a function`).toBe('function')
      expect(typeof entry.chatVariant, `${type}.chatVariant must be a string`).toBe('string')
    }
  })

  it('covers all expected canonical types', () => {
    const expectedTypes = [
      'skill.train',
      'skill.forget',
      'characteristic.increase',
      'xp.spend',
      'xp.refund',
      'xp.grant',
      'xp.remove',
      'species.set',
      'career.set',
      'specialization.add',
      'specialization.remove',
      'talent.purchase',
      'talent-node-purchase',
      'talent-node-purchase-succeeded',
      'talent-node-purchase-failed',
      'talent-node-forget-succeeded',
      'talent-node-forget-failed',
      'advancement.level',
      'item.purchase',
      'item.sale',
      'obligation.create',
      'obligation.update',
      'obligation.delete',
    ]
    for (const type of expectedTypes) {
      expect(AUDIT_TAXONOMY[type], `Type '${type}' should be in AUDIT_TAXONOMY`).toBeDefined()
    }
  })

  it('each entry family is a known AUDIT_LOG_FAMILIES value', () => {
    const validFamilies = new Set(Object.values(AUDIT_LOG_FAMILIES))
    for (const [type, entry] of Object.entries(AUDIT_TAXONOMY)) {
      expect(validFamilies.has(entry.family), `${type}.family '${entry.family}' must be a known family`).toBe(true)
    }
  })
})

/* -------------------------------------------- */
/*  getTaxonomyEntry                            */
/* -------------------------------------------- */

describe('getTaxonomyEntry', () => {
  it('returns the entry for a known type', () => {
    const entry = getTaxonomyEntry('skill.train')
    expect(entry).toBeDefined()
    expect(entry.family).toBe(AUDIT_LOG_FAMILIES.skills)
  })

  it('returns undefined for an unknown type', () => {
    expect(getTaxonomyEntry('mystery.event')).toBeUndefined()
  })
})

/* -------------------------------------------- */
/*  getAuditLogFamilyFromType                   */
/* -------------------------------------------- */

describe('getAuditLogFamilyFromType', () => {
  const familyMap = [
    ['skill.train', 'skills'],
    ['skill.forget', 'skills'],
    ['characteristic.increase', 'characteristics'],
    ['xp.spend', 'xp'],
    ['xp.refund', 'xp'],
    ['xp.grant', 'xp'],
    ['xp.remove', 'xp'],
    ['species.set', 'details'],
    ['career.set', 'details'],
    ['specialization.add', 'details'],
    ['specialization.remove', 'details'],
    ['talent.purchase', 'talents'],
    ['talent-node-purchase', 'talents'],
    ['talent-node-purchase-succeeded', 'talents'],
    ['talent-node-purchase-failed', 'talents'],
    ['talent-node-forget-succeeded', 'talents'],
    ['talent-node-forget-failed', 'talents'],
    ['advancement.level', 'advancement'],
    ['item.purchase', 'purchases'],
    ['item.sale', 'sales'],
    ['obligation.create', 'obligations'],
    ['obligation.update', 'obligations'],
    ['obligation.delete', 'obligations'],
  ]

  for (const [type, expectedFamily] of familyMap) {
    it(`maps '${type}' to family '${expectedFamily}'`, () => {
      expect(getAuditLogFamilyFromType(type)).toBe(expectedFamily)
    })
  }

  it('falls back to "other" for unknown types', () => {
    expect(getAuditLogFamilyFromType('mystery.event')).toBe('other')
    expect(getAuditLogFamilyFromType('')).toBe('other')
    expect(getAuditLogFamilyFromType(undefined)).toBe('other')
  })
})

/* -------------------------------------------- */
/*  getAuditLogTypeLabelKey                     */
/* -------------------------------------------- */

describe('getAuditLogTypeLabelKey', () => {
  it('returns the correct i18n key for skill.train', () => {
    expect(getAuditLogTypeLabelKey('skill.train')).toBe('SWERPG.AUDIT_LOG.TYPE.SKILL_TRAIN')
  })

  it('returns the UNKNOWN fallback key for unknown types', () => {
    expect(getAuditLogTypeLabelKey('mystery.event')).toBe('SWERPG.AUDIT_LOG.TYPE.UNKNOWN')
    expect(getAuditLogTypeLabelKey(undefined)).toBe('SWERPG.AUDIT_LOG.TYPE.UNKNOWN')
  })

  it('returns unique keys for each known type', () => {
    const keys = Object.keys(AUDIT_TAXONOMY).map(getAuditLogTypeLabelKey)
    const unique = new Set(keys)
    expect(unique.size).toBe(keys.length)
  })
})

/* -------------------------------------------- */
/*  buildAuditLogDescriptionFromRegistry        */
/* -------------------------------------------- */

describe('buildAuditLogDescriptionFromRegistry', () => {
  it('skill.train — uses skillName, oldRank, newRank', () => {
    const result = buildAuditLogDescriptionFromRegistry({ type: 'skill.train', data: { skillName: 'Piloting', oldRank: 1, newRank: 2 } }, i18n)
    expect(result).toContain('Piloting')
    expect(result).toContain('1')
    expect(result).toContain('2')
  })

  it('skill.train — falls back to UNKNOWN_SKILL when skillName is absent', () => {
    const result = buildAuditLogDescriptionFromRegistry({ type: 'skill.train', data: {} }, i18n)
    expect(result).toContain('SWERPG.AUDIT_LOG.UNKNOWN_SKILL')
  })

  it('skill.forget — uses skillName, oldRank, newRank', () => {
    const result = buildAuditLogDescriptionFromRegistry({ type: 'skill.forget', data: { skillName: 'Athletics', oldRank: 3, newRank: 2 } }, i18n)
    expect(result).toContain('Athletics')
  })

  it('characteristic.increase — resolves label from characteristics map', () => {
    const result = buildAuditLogDescriptionFromRegistry(
      { type: 'characteristic.increase', data: { characteristicId: 'brawn', oldValue: 2, newValue: 3 } },
      i18n,
    )
    expect(result).toContain('CHARACTERISTICS.Brawn')
    expect(result).not.toContain('brawn')
  })

  it('characteristic.increase — falls back to UNKNOWN_VALUE for unknown characteristicId', () => {
    const result = buildAuditLogDescriptionFromRegistry(
      { type: 'characteristic.increase', data: { characteristicId: 'unknownStat', oldValue: 1, newValue: 2 } },
      i18n,
    )
    expect(result).toContain('SWERPG.AUDIT_LOG.UNKNOWN_VALUE')
  })

  it('characteristic.increase — falls back to UNKNOWN_VALUE when characteristicId is absent', () => {
    const result = buildAuditLogDescriptionFromRegistry({ type: 'characteristic.increase', data: {} }, i18n)
    expect(result).toContain('SWERPG.AUDIT_LOG.UNKNOWN_VALUE')
  })

  it('xp.spend — uses amount from data, falls back to xpDelta', () => {
    const result = buildAuditLogDescriptionFromRegistry({ type: 'xp.spend', data: { amount: 15 }, xpDelta: -15 }, i18n)
    expect(result).toContain('15')
  })

  it('xp.grant — uses amount from data', () => {
    const result = buildAuditLogDescriptionFromRegistry({ type: 'xp.grant', data: { amount: 20 }, xpDelta: 20 }, i18n)
    expect(result).toContain('20')
  })

  it('talent-node-purchase — uses talentId, specializationId, cost', () => {
    const result = buildAuditLogDescriptionFromRegistry(
      { type: 'talent-node-purchase', data: { talentId: 'grit', specializationId: 'spec-bodyguard', cost: 10 } },
      i18n,
    )
    expect(result).toContain('grit')
    expect(result).toContain('spec-bodyguard')
    expect(result).toContain('10')
  })

  it('talent-node-purchase-succeeded — same description format as talent-node-purchase', () => {
    const result = buildAuditLogDescriptionFromRegistry(
      { type: 'talent-node-purchase-succeeded', data: { talentId: 'parry', specializationId: 'spec-bodyguard', cost: 5 } },
      i18n,
    )
    expect(result).toContain('parry')
    expect(result).toContain('spec-bodyguard')
  })

  it('talent-node-purchase-failed — uses nodeId and reasonCode', () => {
    const result = buildAuditLogDescriptionFromRegistry({ type: 'talent-node-purchase-failed', data: { nodeId: 'r1c1', reasonCode: 'not-enough-xp' } }, i18n)
    expect(result).toContain('r1c1')
    expect(result).toContain('not-enough-xp')
  })

  it('talent-node-forget-succeeded — uses talentId, specializationId, cost', () => {
    const result = buildAuditLogDescriptionFromRegistry(
      { type: 'talent-node-forget-succeeded', data: { talentId: 'grit', specializationId: 'spec-bodyguard', cost: 5 } },
      i18n,
    )
    expect(result).toContain('grit')
  })

  it('talent-node-forget-failed — uses nodeId and reasonCode', () => {
    const result = buildAuditLogDescriptionFromRegistry(
      { type: 'talent-node-forget-failed', data: { nodeId: 'r1c1', reasonCode: 'node-has-dependents' } },
      i18n,
    )
    expect(result).toContain('r1c1')
    expect(result).toContain('node-has-dependents')
  })

  it('species.set — uses oldSpecies and newSpecies', () => {
    const result = buildAuditLogDescriptionFromRegistry({ type: 'species.set', data: { oldSpecies: 'Human', newSpecies: 'Bothan' } }, i18n)
    expect(result).toContain('Human')
    expect(result).toContain('Bothan')
  })

  it('species.set — falls back to NONE key when oldSpecies is absent', () => {
    const result = buildAuditLogDescriptionFromRegistry({ type: 'species.set', data: { newSpecies: "Twi'lek" } }, i18n)
    expect(result).toContain('SWERPG.AUDIT_LOG.NONE')
  })

  it('item.purchase — uses itemName, itemType, price, quantity', () => {
    const result = buildAuditLogDescriptionFromRegistry(
      { type: 'item.purchase', data: { itemName: 'Blaster Pistol', itemType: 'weapon', price: 100, quantity: 1 } },
      i18n,
    )
    expect(result).toContain('Blaster Pistol')
    expect(result).toContain('100')
  })

  it('item.purchase — falls back to UNKNOWN_ITEM when itemName is absent', () => {
    const result = buildAuditLogDescriptionFromRegistry({ type: 'item.purchase', data: { itemType: 'weapon', price: 100, quantity: 1 } }, i18n)
    expect(result).toContain('SWERPG.AUDIT_LOG.UNKNOWN_ITEM')
  })

  it('item.sale — uses itemName, resalePrice, fraction', () => {
    const result = buildAuditLogDescriptionFromRegistry(
      { type: 'item.sale', data: { itemName: 'Old Blaster', itemType: 'weapon', resalePrice: 75, fraction: 0.75 } },
      i18n,
    )
    expect(result).toContain('Old Blaster')
    expect(result).toContain('75')
  })

  it('advancement.level — uses oldLevel and newLevel', () => {
    const result = buildAuditLogDescriptionFromRegistry({ type: 'advancement.level', data: { oldLevel: 2, newLevel: 3 } }, i18n)
    expect(result).toContain('2')
    expect(result).toContain('3')
  })

  it('obligation.create — uses obligationName and value', () => {
    const result = buildAuditLogDescriptionFromRegistry({ type: 'obligation.create', data: { obligationName: 'Dark Past', value: 10 } }, i18n)
    expect(result).toContain('Dark Past')
    expect(result).toContain('10')
  })

  it('obligation.create — falls back to UNKNOWN_OBLIGATION when obligationName is absent', () => {
    const result = buildAuditLogDescriptionFromRegistry({ type: 'obligation.create', data: { value: 5 } }, i18n)
    expect(result).toContain('SWERPG.AUDIT_LOG.UNKNOWN_OBLIGATION')
  })

  it('obligation.update — uses obligationName', () => {
    const result = buildAuditLogDescriptionFromRegistry({ type: 'obligation.update', data: { obligationName: 'Dark Past' } }, i18n)
    expect(result).toContain('Dark Past')
  })

  it('obligation.update — falls back to UNKNOWN_OBLIGATION when obligationName is absent', () => {
    const result = buildAuditLogDescriptionFromRegistry({ type: 'obligation.update', data: {} }, i18n)
    expect(result).toContain('SWERPG.AUDIT_LOG.UNKNOWN_OBLIGATION')
  })

  it('obligation.delete — uses obligationName and value', () => {
    const result = buildAuditLogDescriptionFromRegistry({ type: 'obligation.delete', data: { obligationName: 'Dark Past', value: 10 } }, i18n)
    expect(result).toContain('Dark Past')
    expect(result).toContain('10')
  })

  it('obligation.delete — falls back to UNKNOWN_OBLIGATION when obligationName is absent', () => {
    const result = buildAuditLogDescriptionFromRegistry({ type: 'obligation.delete', data: { value: 5 } }, i18n)
    expect(result).toContain('SWERPG.AUDIT_LOG.UNKNOWN_OBLIGATION')
  })

  it('unknown type — falls back to DESCRIPTION.UNKNOWN with type included', () => {
    const result = buildAuditLogDescriptionFromRegistry({ type: 'mystery.event', data: {} }, i18n)
    expect(result).toContain('mystery.event')
    expect(result).not.toContain('{type}')
  })

  it('null entry — returns fallback unknown description', () => {
    const result = buildAuditLogDescriptionFromRegistry(null, i18n)
    expect(typeof result).toBe('string')
  })

  it('no type on entry — returns fallback unknown description', () => {
    const result = buildAuditLogDescriptionFromRegistry({ data: {} }, i18n)
    expect(typeof result).toBe('string')
  })
})

/* -------------------------------------------- */
/*  Taxonomy completeness: each describe() runs */
/* -------------------------------------------- */

describe('AUDIT_TAXONOMY describe() functions run without throwing', () => {
  const minimalEntries = {
    'skill.train': { type: 'skill.train', data: {} },
    'skill.forget': { type: 'skill.forget', data: {} },
    'characteristic.increase': { type: 'characteristic.increase', data: {} },
    'xp.spend': { type: 'xp.spend', data: {}, xpDelta: -10 },
    'xp.refund': { type: 'xp.refund', data: {}, xpDelta: 10 },
    'xp.grant': { type: 'xp.grant', data: {}, xpDelta: 10 },
    'xp.remove': { type: 'xp.remove', data: {}, xpDelta: -10 },
    'species.set': { type: 'species.set', data: {} },
    'career.set': { type: 'career.set', data: {} },
    'specialization.add': { type: 'specialization.add', data: {} },
    'specialization.remove': { type: 'specialization.remove', data: {} },
    'talent.purchase': { type: 'talent.purchase', data: {} },
    'talent-node-purchase': { type: 'talent-node-purchase', data: {} },
    'talent-node-purchase-succeeded': { type: 'talent-node-purchase-succeeded', data: {} },
    'talent-node-purchase-failed': { type: 'talent-node-purchase-failed', data: {} },
    'talent-node-forget-succeeded': { type: 'talent-node-forget-succeeded', data: {} },
    'talent-node-forget-failed': { type: 'talent-node-forget-failed', data: {} },
    'advancement.level': { type: 'advancement.level', data: {} },
    'item.purchase': { type: 'item.purchase', data: {} },
    'item.sale': { type: 'item.sale', data: {} },
    'obligation.create': { type: 'obligation.create', data: {} },
    'obligation.update': { type: 'obligation.update', data: {} },
    'obligation.delete': { type: 'obligation.delete', data: {} },
  }

  for (const [type, entry] of Object.entries(minimalEntries)) {
    it(`describe() for '${type}' does not throw and returns a string`, () => {
      const result = buildAuditLogDescriptionFromRegistry(entry, i18n)
      expect(typeof result).toBe('string')
    })
  }
})
