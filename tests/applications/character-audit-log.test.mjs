import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setupFoundryMock, teardownFoundryMock } from '../helpers/mock-foundry.mjs'

/**
 *
 * @param overrides
 */
function createActor(overrides = {}) {
  return {
    id: 'actor-1',
    name: 'Vara Kesh',
    type: 'character',
    isOwner: true,
    system: {
      progression: {},
      ...overrides.system,
    },
    flags: {
      swerpg: {
        logs: [],
      },
      ...overrides.flags,
    },
    testUserPermission: vi.fn(() => true),
    ...overrides,
  }
}

describe('character-audit-log application', () => {
  let CharacterAuditLogApp
  let buildAuditLogEntries
  let buildAuditLogDescription
  let canViewAuditLog

  beforeEach(async () => {
    setupFoundryMock({
      translations: {
        'SWERPG.AUDIT_LOG.NO_PERMISSION': 'No permission',
        'SWERPG.AUDIT_LOG.TITLE': 'History: {actor}',
        'SWERPG.AUDIT_LOG.SUBTITLE': 'Read-only history',
        'SWERPG.AUDIT_LOG.EMPTY': 'No entries',
        'SWERPG.AUDIT_LOG.FILTER.ALL': 'All',
        'SWERPG.AUDIT_LOG.FILTER.SKILLS': 'Skills',
        'SWERPG.AUDIT_LOG.FILTER.TALENTS': 'Talents',
        'SWERPG.AUDIT_LOG.FILTER.XP': 'XP',
        'SWERPG.AUDIT_LOG.FILTER.CHARACTERISTICS': 'Characteristics',
        'SWERPG.AUDIT_LOG.FILTER.DETAILS': 'Core choices',
        'SWERPG.AUDIT_LOG.FILTER.ADVANCEMENT': 'Advancement',
        'SWERPG.AUDIT_LOG.FILTER.PURCHASES': 'Purchases',
        'SWERPG.AUDIT_LOG.TYPE.ITEM_PURCHASE': 'Item purchased',
        'SWERPG.AUDIT_LOG.UNKNOWN_ITEM': 'Unknown item',
        'SWERPG.AUDIT_LOG.DESCRIPTION.ITEM_PURCHASE': 'Purchased {itemName} ({itemType}) for {price} credits',
        'SWERPG.AUDIT_LOG.TYPE.SKILL_TRAIN': 'Skill purchase',
        'SWERPG.AUDIT_LOG.TYPE.SPECIALIZATION_REMOVE': 'Specialization removed',
        'SWERPG.AUDIT_LOG.TYPE.TALENT_NODE_PURCHASE': 'Talent node purchase',
        'SWERPG.AUDIT_LOG.TYPE.TALENT_NODE_PURCHASE_SUCCEEDED': 'Talent node purchased',
        'SWERPG.AUDIT_LOG.TYPE.TALENT_NODE_PURCHASE_FAILED': 'Talent node purchase failed',
        'SWERPG.AUDIT_LOG.TYPE.TALENT_NODE_FORGET_SUCCEEDED': 'Talent node forgotten',
        'SWERPG.AUDIT_LOG.TYPE.TALENT_NODE_FORGET_FAILED': 'Talent node forget failed',
        'SWERPG.AUDIT_LOG.TYPE.UNKNOWN': 'Unknown event',
        'SWERPG.AUDIT_LOG.NONE': 'None',
        'SWERPG.AUDIT_LOG.UNKNOWN_SPECIALIZATION': 'Unknown specialization',
        'SWERPG.AUDIT_LOG.UNKNOWN_SKILL': 'Unknown skill',
        'SWERPG.AUDIT_LOG.UNKNOWN_VALUE': 'Unknown value',
        'SWERPG.AUDIT_LOG.DESCRIPTION.SKILL_TRAIN': 'Skill {skill}: rank {oldRank} -> {newRank}',
        'SWERPG.AUDIT_LOG.DESCRIPTION.SPECIALIZATION_REMOVE': 'Removed specialization {specialization}',
        'SWERPG.AUDIT_LOG.DESCRIPTION.TALENT_NODE_PURCHASE': 'Talent node {talentId} / specialization {specializationId} ({cost} XP)',
        'SWERPG.AUDIT_LOG.DESCRIPTION.TALENT_NODE_PURCHASE_FAILED': 'Talent node purchase failed: {reasonCode} (node {nodeId})',
        'SWERPG.AUDIT_LOG.DESCRIPTION.TALENT_NODE_FORGET': 'Forgot talent node {talentId} / specialization {specializationId} ({cost} XP)',
        'SWERPG.AUDIT_LOG.DESCRIPTION.TALENT_NODE_FORGET_FAILED': 'Talent node forget failed: {reasonCode} (node {nodeId})',
        'SWERPG.AUDIT_LOG.DESCRIPTION.CHARACTERISTIC_INCREASE': 'Characteristic {characteristic}: {oldValue} -> {newValue}',
        'SWERPG.AUDIT_LOG.DESCRIPTION.UNKNOWN': 'Unknown event ({type})',
        'CHARACTERISTICS.Brawn': 'Brawn',
        'CHARACTERISTICS.Agility': 'Agility',
        'CHARACTERISTICS.Intellect': 'Intellect',
        'CHARACTERISTICS.Cunning': 'Cunning',
        'CHARACTERISTICS.Willpower': 'Willpower',
        'CHARACTERISTICS.Presence': 'Presence',
      },
    })

    globalThis.game.system.config = {
      CHARACTERISTICS: {
        brawn: { id: 'brawn', label: 'CHARACTERISTICS.Brawn' },
        agility: { id: 'agility', label: 'CHARACTERISTICS.Agility' },
        intellect: { id: 'intellect', label: 'CHARACTERISTICS.Intellect' },
        cunning: { id: 'cunning', label: 'CHARACTERISTICS.Cunning' },
        willpower: { id: 'willpower', label: 'CHARACTERISTICS.Willpower' },
        presence: { id: 'presence', label: 'CHARACTERISTICS.Presence' },
      },
    }
    ;({
      default: CharacterAuditLogApp,
      buildAuditLogEntries,
      buildAuditLogDescription,
      canViewAuditLog,
    } = await import('../../module/applications/character-audit-log.mjs'))
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    teardownFoundryMock()
  })

  it('allows GMs and exact owners only', () => {
    const actor = createActor()

    expect(canViewAuditLog(actor, { isGM: true })).toBe(true)
    expect(canViewAuditLog(actor, { isGM: false })).toBe(true)

    actor.testUserPermission.mockReturnValue(false)
    expect(canViewAuditLog(actor, { isGM: false })).toBe(false)
  })

  it('builds sorted and filtered display entries', () => {
    const actor = createActor({
      flags: {
        swerpg: {
          logs: [
            {
              id: 'entry-1',
              timestamp: 100,
              type: 'skill.train',
              xpDelta: -10,
              data: { skillName: 'Piloting', oldRank: 1, newRank: 2 },
            },
            {
              id: 'entry-2',
              timestamp: 200,
              type: 'specialization.remove',
              xpDelta: 0,
              data: { specializationId: 'bodyguard', specializationName: 'Bodyguard' },
            },
          ],
        },
      },
    })

    const { entries, totalCount, filteredCount } = buildAuditLogEntries(actor, 'all')
    expect(entries).toHaveLength(2)
    expect(totalCount).toBe(2)
    expect(filteredCount).toBe(2)
    expect(entries[0].id).toBe('entry-2')
    expect(entries[0].description).toBe('Removed specialization Bodyguard')
    expect(entries[1].formattedXpDelta).toBe('-10 XP')
    expect(entries[1].xpDeltaClass).toBe('is-spend')
    expect(entries[1].formattedDelta).toBe('-10 XP')
    expect(entries[1].deltaClass).toBe('is-spend')
    expect(entries[1].hasDelta).toBe(true)

    const { entries: filtered } = buildAuditLogEntries(actor, 'skills')
    expect(filtered).toHaveLength(1)
    expect(filtered[0].id).toBe('entry-1')
  })

  it('builds a dedicated description for talent-node-purchase type', () => {
    const description = buildAuditLogDescription({
      type: 'talent-node-purchase',
      xpDelta: -10,
      data: {
        talentId: 'grit',
        specializationId: 'spec-bodyguard',
        cost: 10,
      },
    })

    expect(description).toBe('Talent node grit / specialization spec-bodyguard (10 XP)')
  })

  it('builds description with fallback for missing talent-node-purchase data', () => {
    const description = buildAuditLogDescription({
      type: 'talent-node-purchase',
      data: {},
    })

    expect(description).toBe('Talent node Unknown value / specialization Unknown value (0 XP)')
  })

  it('maps talent-node-purchase to the talents family', () => {
    const actor = createActor({
      flags: {
        swerpg: {
          logs: [
            {
              id: 'entry-3',
              timestamp: 300,
              type: 'talent-node-purchase',
              xpDelta: -10,
              data: { talentId: 'grit', specializationId: 'spec-bodyguard', cost: 10 },
            },
          ],
        },
      },
    })

    const { entries } = buildAuditLogEntries(actor, 'talents')
    expect(entries).toHaveLength(1)
    expect(entries[0].type).toBe('talent-node-purchase')
    expect(entries[0].typeLabel).toBe('Talent node purchase')
    expect(entries[0].family).toBe('talents')
  })

  it('does not fall back to unknown for talent-node-purchase', () => {
    const description = buildAuditLogDescription({
      type: 'talent-node-purchase',
      data: { talentId: 'grit', specializationId: 'spec-bodyguard', cost: 10 },
    })

    expect(description).not.toContain('Unknown event')
    expect(description).not.toContain('Unrecognized event')
  })

  it('builds description for talent-node-purchase-succeeded (same as legacy)', () => {
    const description = buildAuditLogDescription({
      type: 'talent-node-purchase-succeeded',
      xpDelta: -10,
      data: { talentId: 'grit', specializationId: 'spec-bodyguard', cost: 10 },
    })

    expect(description).toBe('Talent node grit / specialization spec-bodyguard (10 XP)')
  })

  it('builds description for talent-node-purchase-failed with reason', () => {
    const description = buildAuditLogDescription({
      type: 'talent-node-purchase-failed',
      xpDelta: -5,
      data: { nodeId: 'r1c1', reasonCode: 'not-enough-xp', cost: 5 },
    })

    expect(description).toBe('Talent node purchase failed: not-enough-xp (node r1c1)')
  })

  it('builds description for talent-node-forget-succeeded', () => {
    const description = buildAuditLogDescription({
      type: 'talent-node-forget-succeeded',
      xpDelta: 5,
      data: { talentId: 'parry', specializationId: 'spec-bodyguard', cost: 5 },
    })

    expect(description).toBe('Forgot talent node parry / specialization spec-bodyguard (5 XP)')
  })

  it('builds description for talent-node-forget-failed with reason', () => {
    const description = buildAuditLogDescription({
      type: 'talent-node-forget-failed',
      xpDelta: 5,
      data: { nodeId: 'r1c1', reasonCode: 'node-has-dependents', cost: 5 },
    })

    expect(description).toBe('Talent node forget failed: node-has-dependents (node r1c1)')
  })

  it('maps canonical types to talents family', () => {
    const actor = createActor({
      flags: {
        swerpg: {
          logs: [
            { id: 'e1', timestamp: 100, type: 'talent-node-purchase-succeeded', xpDelta: -10, data: {} },
            { id: 'e2', timestamp: 200, type: 'talent-node-purchase-failed', xpDelta: -5, data: {} },
            { id: 'e3', timestamp: 300, type: 'talent-node-forget-succeeded', xpDelta: 5, data: {} },
            { id: 'e4', timestamp: 400, type: 'talent-node-forget-failed', xpDelta: 5, data: {} },
          ],
        },
      },
    })

    const { entries } = buildAuditLogEntries(actor, 'talents')
    expect(entries).toHaveLength(4)
    entries.forEach((e) => {
      expect(e.family).toBe('talents')
    })
  })

  it('displays type label for canonical types without unknown fallback', () => {
    const actor = createActor({
      flags: {
        swerpg: {
          logs: [
            { id: 'e1', timestamp: 100, type: 'talent-node-purchase-succeeded', xpDelta: -10, data: {} },
            { id: 'e2', timestamp: 200, type: 'talent-node-purchase-failed', xpDelta: -5, data: {} },
            { id: 'e3', timestamp: 300, type: 'talent-node-forget-succeeded', xpDelta: 5, data: {} },
            { id: 'e4', timestamp: 400, type: 'talent-node-forget-failed', xpDelta: 5, data: {} },
          ],
        },
      },
    })

    const { entries } = buildAuditLogEntries(actor, 'all')
    expect(entries).toHaveLength(4)
    for (const entry of entries) {
      expect(entry.typeLabel).not.toBe('Unknown event')
    }
  })

  it('builds a localized description for characteristic.increase with a known id', () => {
    const description = buildAuditLogDescription({
      type: 'characteristic.increase',
      data: { characteristicId: 'brawn', oldValue: 2, newValue: 3 },
    })

    expect(description).toBe('Characteristic Brawn: 2 -> 3')
    expect(description).not.toContain('brawn')
  })

  it('builds localized descriptions for all six known characteristics', () => {
    const cases = [
      { id: 'brawn', expected: 'Brawn' },
      { id: 'agility', expected: 'Agility' },
      { id: 'intellect', expected: 'Intellect' },
      { id: 'cunning', expected: 'Cunning' },
      { id: 'willpower', expected: 'Willpower' },
      { id: 'presence', expected: 'Presence' },
    ]

    for (const { id, expected } of cases) {
      const description = buildAuditLogDescription({
        type: 'characteristic.increase',
        data: { characteristicId: id, oldValue: 1, newValue: 2 },
      })
      expect(description).toContain(expected)
      expect(description).not.toContain(id)
    }
  })

  it('falls back to Unknown value for an unrecognized characteristicId', () => {
    const description = buildAuditLogDescription({
      type: 'characteristic.increase',
      data: { characteristicId: 'unknownStat', oldValue: 1, newValue: 2 },
    })

    expect(description).toContain('Unknown value')
    expect(description).not.toContain('unknownStat')
  })

  it('falls back to Unknown value when characteristicId is absent', () => {
    const description = buildAuditLogDescription({
      type: 'characteristic.increase',
      data: { oldValue: 1, newValue: 2 },
    })

    expect(description).toContain('Unknown value')
  })

  it('falls back to an unknown description for unsupported types', () => {
    const description = buildAuditLogDescription({
      type: 'mystery.event',
      data: {},
    })

    expect(description).toBe('Unknown event (mystery.event)')
  })

  it('does not render when the user lacks permission', async () => {
    const actor = createActor({
      testUserPermission: vi.fn(() => false),
    })
    globalThis.game.user.isGM = false

    const app = new CharacterAuditLogApp({ document: actor })
    await app.render({ force: true })

    expect(globalThis.ui.notifications.warn).toHaveBeenCalledWith('No permission')
  })
})

describe('audit log CSV export', () => {
  let escapeCsvCell
  let buildCsvContent
  let buildExportFilename
  let getPrimaryOwnerName

  beforeEach(async () => {
    setupFoundryMock({
      translations: {
        'SWERPG.AUDIT_LOG.NO_PERMISSION': 'No permission',
        'SWERPG.AUDIT_LOG.TITLE': 'History: {actor}',
        'SWERPG.AUDIT_LOG.SUBTITLE': 'Read-only history',
        'SWERPG.AUDIT_LOG.EMPTY': 'No entries',
        'SWERPG.AUDIT_LOG.FILTER.ALL': 'All',
        'SWERPG.AUDIT_LOG.TYPE.SKILL_TRAIN': 'Skill purchase',
        'SWERPG.AUDIT_LOG.TYPE.SPECIALIZATION_REMOVE': 'Specialization removed',
        'SWERPG.AUDIT_LOG.TYPE.UNKNOWN': 'Unknown event',
        'SWERPG.AUDIT_LOG.NONE': 'None',
        'SWERPG.AUDIT_LOG.UNKNOWN_SPECIALIZATION': 'Unknown specialization',
        'SWERPG.AUDIT_LOG.UNKNOWN_SKILL': 'Unknown skill',
        'SWERPG.AUDIT_LOG.UNKNOWN_VALUE': 'Unknown value',
        'SWERPG.AUDIT_LOG.DESCRIPTION.SKILL_TRAIN': 'Skill {skill}: rank {oldRank} -> {newRank}',
        'SWERPG.AUDIT_LOG.DESCRIPTION.SPECIALIZATION_REMOVE': 'Removed specialization {specialization}',
        'SWERPG.AUDIT_LOG.DESCRIPTION.UNKNOWN': 'Unknown event ({type})',
      },
    })

    globalThis.game.users = {
      get: vi.fn((userId) => {
        if (userId === 'owner-1') return { name: 'AliceGM' }
        if (userId === 'owner-2') return { name: 'BobPlayer' }
        return undefined
      }),
    }
    ;({ escapeCsvCell, buildCsvContent, buildExportFilename, getPrimaryOwnerName } = await import('../../module/applications/character-audit-log.mjs'))
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    teardownFoundryMock()
  })

  describe('escapeCsvCell', () => {
    it('returns empty string for null or undefined', () => {
      expect(escapeCsvCell(null)).toBe('')
      expect(escapeCsvCell(undefined)).toBe('')
    })

    it('returns the string as-is when no special characters are present', () => {
      expect(escapeCsvCell('hello')).toBe('hello')
      expect(escapeCsvCell(42)).toBe('42')
    })

    it('wraps in quotes when the value contains a comma', () => {
      expect(escapeCsvCell('hello, world')).toBe('"hello, world"')
    })

    it('wraps in quotes and escapes double quotes', () => {
      expect(escapeCsvCell('he said "hello"')).toBe('"he said ""hello"""')
    })

    it('wraps in quotes when the value contains a newline', () => {
      expect(escapeCsvCell('line1\nline2')).toBe('"line1\nline2"')
    })

    it('prefixes with a single-quote when the value starts with =', () => {
      expect(escapeCsvCell('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)")
    })

    it('prefixes with a single-quote when the value starts with +', () => {
      expect(escapeCsvCell('+1234')).toBe("'+1234")
    })

    it('prefixes with a single-quote when the value starts with -', () => {
      expect(escapeCsvCell('-1234')).toBe("'-1234")
    })

    it('prefixes with a single-quote when the value starts with @', () => {
      expect(escapeCsvCell('@SUM(1+1)')).toBe("'@SUM(1+1)")
    })

    it('does not alter values that do not start with a dangerous prefix', () => {
      expect(escapeCsvCell('normal text')).toBe('normal text')
      expect(escapeCsvCell('100')).toBe('100')
      expect(escapeCsvCell('')).toBe('')
    })

    it('wraps in quotes and prefixes when the cell starts with = and contains a comma', () => {
      expect(escapeCsvCell('=A1,B1')).toBe('"\'=A1,B1"')
    })
  })

  describe('getPrimaryOwnerName', () => {
    it('returns the name of the first OWNER user', () => {
      const actor = createActor({
        ownership: { 'owner-1': 3, 'user-other': 1 },
      })
      expect(getPrimaryOwnerName(actor)).toBe('AliceGM')
    })

    it('returns unknown-player when there is no owner', () => {
      const actor = createActor({
        ownership: { 'user-other': 1 },
      })
      expect(getPrimaryOwnerName(actor)).toBe('unknown-player')
    })

    it('returns unknown-player when ownership is missing', () => {
      expect(getPrimaryOwnerName(createActor())).toBe('unknown-player')
    })
  })

  describe('buildExportFilename', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-05-12T10:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('includes character name, owner name, and date', () => {
      const actor = createActor({
        name: 'Vara Kesh',
        ownership: { 'owner-1': 3 },
      })
      const filename = buildExportFilename(actor)
      expect(filename).toMatch(/^vara_kesh_alicegm_\d{4}-\d{2}-\d{2}\.csv$/)
    })

    it('uses unknown-player when no owner exists', () => {
      const actor = createActor({ name: 'Test' })
      const filename = buildExportFilename(actor)
      expect(filename).toMatch(/^test_unknown-player_\d{4}-\d{2}-\d{2}\.csv$/)
    })
  })

  describe('buildCsvContent', () => {
    it('produces header-only CSV when logs are empty', () => {
      const actor = createActor()
      const csv = buildCsvContent(actor)
      const lines = csv.split('\n')
      expect(lines).toHaveLength(1)
      expect(lines[0]).toBe('timestamp,date,userName,type,typeLabel,description,xpDelta,creditDelta,actorName,playerName')
    })

    it('includes all entries regardless of any filter', () => {
      const actor = createActor({
        flags: {
          swerpg: {
            logs: [
              {
                id: 'entry-1',
                timestamp: 200,
                type: 'specialization.remove',
                xpDelta: 0,
                data: { specializationId: 'bodyguard', specializationName: 'Bodyguard' },
              },
              {
                id: 'entry-2',
                timestamp: 100,
                type: 'skill.train',
                xpDelta: -10,
                data: { skillName: 'Piloting', oldRank: 1, newRank: 2 },
              },
            ],
          },
        },
        ownership: { 'owner-1': 3 },
      })

      const csv = buildCsvContent(actor)
      const lines = csv.split('\n')

      expect(lines).toHaveLength(3)
      expect(lines[1]).toContain('specialization.remove')
      expect(lines[1]).toContain('Bodyguard')
      expect(lines[2]).toContain('skill.train')
      expect(lines[2]).toContain('Piloting')
    })

    it('properly escapes cells with special characters', () => {
      const actor = createActor({
        flags: {
          swerpg: {
            logs: [
              {
                id: 'entry-1',
                timestamp: 100,
                type: 'skill.train',
                xpDelta: -10,
                data: { skillName: 'Piloting, Space', oldRank: 1, newRank: 2 },
              },
            ],
          },
        },
        ownership: { 'owner-1': 3 },
      })

      const csv = buildCsvContent(actor)
      const lines = csv.split('\n')
      expect(lines).toHaveLength(2)
      expect(lines[1]).toContain('"Skill Piloting, Space: rank 1 -> 2"')
    })

    it('sets playerName column to unknown-player when no owner', () => {
      const actor = createActor({
        flags: {
          swerpg: {
            logs: [
              {
                id: 'entry-1',
                timestamp: 100,
                type: 'skill.train',
                xpDelta: -10,
                data: {},
              },
            ],
          },
        },
      })

      const csv = buildCsvContent(actor)
      expect(csv).toContain('unknown-player')
    })

    it('includes creditDelta for item.purchase entries', () => {
      const actor = createActor({
        flags: {
          swerpg: {
            logs: [
              {
                id: 'purchase-1',
                timestamp: 1000,
                type: 'item.purchase',
                userName: 'GM',
                xpDelta: 0,
                creditDelta: -150,
                data: { itemName: 'Blaster Pistol', itemType: 'weapon', price: 150, quantity: 1 },
              },
            ],
          },
        },
      })

      const csv = buildCsvContent(actor)
      const lines = csv.split('\n')

      expect(lines[0]).toContain('creditDelta')
      expect(lines[1]).toContain('-150')
    })

    it('defaults creditDelta to 0 for entries that have no creditDelta field', () => {
      const actor = createActor({
        flags: {
          swerpg: {
            logs: [
              {
                id: 'purchase-zero',
                timestamp: 100,
                type: 'item.purchase',
                userName: 'GM',
                xpDelta: 0,
                // creditDelta intentionally absent
                data: { itemName: 'Free Item', itemType: 'gear', price: 0, quantity: 1 },
              },
            ],
          },
        },
      })

      const csv = buildCsvContent(actor)
      const lines = csv.split('\n')

      // Header must include creditDelta
      expect(lines[0]).toContain('creditDelta')
      // The data row must contain the literal token 0 as the creditDelta value
      // Row: timestamp,date,userName,type,typeLabel,description,xpDelta,creditDelta,actorName,playerName
      // xpDelta=0, creditDelta=0 — verify both appear and no negative value is present for creditDelta
      expect(lines[1]).toContain(',0,0,')
    })
  })
})

/* ============================================ */
/*  item.purchase family and descriptions       */
/* ============================================ */

describe('audit log item.purchase', () => {
  let buildAuditLogEntries
  let buildAuditLogDescription

  beforeEach(async () => {
    setupFoundryMock({
      translations: {
        'SWERPG.AUDIT_LOG.FILTER.ALL': 'All',
        'SWERPG.AUDIT_LOG.FILTER.PURCHASES': 'Purchases',
        'SWERPG.AUDIT_LOG.FILTER.TALENTS': 'Talents',
        'SWERPG.AUDIT_LOG.TYPE.ITEM_PURCHASE': 'Item purchased',
        'SWERPG.AUDIT_LOG.TYPE.UNKNOWN': 'Unknown event',
        'SWERPG.AUDIT_LOG.UNKNOWN_ITEM': 'Unknown item',
        'SWERPG.AUDIT_LOG.UNKNOWN_VALUE': 'Unknown value',
        'SWERPG.AUDIT_LOG.DESCRIPTION.ITEM_PURCHASE': 'Purchased {itemName} ({itemType}) for {price} credits',
        'SWERPG.AUDIT_LOG.DESCRIPTION.UNKNOWN': 'Unrecognized event ({type})',
      },
    })
    ;({ buildAuditLogEntries, buildAuditLogDescription } = await import('../../module/applications/character-audit-log.mjs'))
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    teardownFoundryMock()
  })

  function createActorWithLog(logs) {
    return {
      id: 'actor-1',
      name: 'Test Character',
      type: 'character',
      isOwner: true,
      system: { progression: {} },
      flags: { swerpg: { logs } },
      testUserPermission: vi.fn(() => true),
    }
  }

  it('getAuditLogFamily returns purchases for item.purchase', () => {
    const actor = createActorWithLog([
      { id: 'p1', timestamp: 100, type: 'item.purchase', xpDelta: 0, data: { itemName: 'Blaster', itemType: 'weapon', price: 100, quantity: 1 } },
    ])

    const { entries } = buildAuditLogEntries(actor, 'purchases')
    expect(entries).toHaveLength(1)
    expect(entries[0].family).toBe('purchases')
  })

  it('item.purchase is excluded from talents filter', () => {
    const actor = createActorWithLog([
      { id: 'p1', timestamp: 100, type: 'item.purchase', xpDelta: 0, data: { itemName: 'Blaster', itemType: 'weapon', price: 100, quantity: 1 } },
    ])

    const { entries } = buildAuditLogEntries(actor, 'talents')
    expect(entries).toHaveLength(0)
  })

  it('item.purchase is included in all filter', () => {
    const actor = createActorWithLog([
      { id: 'p1', timestamp: 100, type: 'item.purchase', xpDelta: 0, data: { itemName: 'Blaster', itemType: 'weapon', price: 100, quantity: 1 } },
    ])

    const { entries } = buildAuditLogEntries(actor, 'all')
    expect(entries).toHaveLength(1)
    expect(entries[0].type).toBe('item.purchase')
  })

  it('buildAuditLogDescription formats item.purchase correctly', () => {
    const description = buildAuditLogDescription({
      type: 'item.purchase',
      data: { itemName: 'Blaster Pistol', itemType: 'weapon', price: 100, quantity: 1 },
    })

    expect(description).toBe('Purchased Blaster Pistol (weapon) for 100 credits')
  })

  it('buildAuditLogDescription uses UNKNOWN_ITEM fallback when itemName is missing', () => {
    const description = buildAuditLogDescription({
      type: 'item.purchase',
      data: { itemType: 'weapon', price: 100, quantity: 1 },
    })

    expect(description).toContain('Unknown item')
  })

  it('buildAuditLogDescription defaults quantity to 1 when absent', () => {
    const description = buildAuditLogDescription({
      type: 'item.purchase',
      data: { itemName: 'Blaster Pistol', itemType: 'weapon', price: 100 },
    })

    expect(description).toBe('Purchased Blaster Pistol (weapon) for 100 credits')
  })

  it('typeLabel for item.purchase is not the unknown fallback', () => {
    const actor = createActorWithLog([
      { id: 'p1', timestamp: 100, type: 'item.purchase', xpDelta: 0, data: { itemName: 'Blaster', itemType: 'weapon', price: 100, quantity: 1 } },
    ])

    const { entries } = buildAuditLogEntries(actor, 'all')
    expect(entries[0].typeLabel).toBe('Item purchased')
    expect(entries[0].typeLabel).not.toBe('Unknown event')
  })

  it('item.purchase formattedDelta shows credits not XP', () => {
    const actor = createActorWithLog([
      {
        id: 'p1',
        timestamp: 100,
        type: 'item.purchase',
        xpDelta: 0,
        creditDelta: -150,
        data: { itemName: 'Blaster', itemType: 'weapon', price: 150, quantity: 1 },
      },
    ])

    const { entries } = buildAuditLogEntries(actor, 'all')
    expect(entries[0].formattedDelta).toBe('-150 cr')
    expect(entries[0].deltaClass).toBe('is-spend')
    expect(entries[0].hasDelta).toBe(true)
    expect(entries[0].formattedDelta).not.toContain('XP')
  })

  it('item.purchase with zero creditDelta has is-neutral class and hasDelta false', () => {
    const actor = createActorWithLog([
      { id: 'p1', timestamp: 100, type: 'item.purchase', xpDelta: 0, creditDelta: 0, data: { itemName: 'Free Item', itemType: 'gear', price: 0, quantity: 1 } },
    ])

    const { entries } = buildAuditLogEntries(actor, 'all')
    expect(entries[0].deltaClass).toBe('is-neutral')
    expect(entries[0].hasDelta).toBe(false)
  })

  it('item.purchase formattedXpDelta still shows XP for backward compat', () => {
    const actor = createActorWithLog([
      {
        id: 'p1',
        timestamp: 100,
        type: 'item.purchase',
        xpDelta: 0,
        creditDelta: -100,
        data: { itemName: 'Blaster', itemType: 'weapon', price: 100, quantity: 1 },
      },
    ])

    const { entries } = buildAuditLogEntries(actor, 'all')
    expect(entries[0].formattedXpDelta).toBe('0 XP')
  })
})

/* ============================================ */
/*  Integration: Market → Audit → CSV          */
/* ============================================ */

describe('audit log integration: item.purchase audit → filter → CSV', () => {
  let buildAuditLogEntries
  let buildAuditLogDescription
  let buildCsvContent

  beforeEach(async () => {
    setupFoundryMock({
      translations: {
        'SWERPG.AUDIT_LOG.FILTER.ALL': 'All',
        'SWERPG.AUDIT_LOG.FILTER.PURCHASES': 'Purchases',
        'SWERPG.AUDIT_LOG.TYPE.ITEM_PURCHASE': 'Item purchased',
        'SWERPG.AUDIT_LOG.TYPE.UNKNOWN': 'Unknown event',
        'SWERPG.AUDIT_LOG.UNKNOWN_ITEM': 'Unknown item',
        'SWERPG.AUDIT_LOG.UNKNOWN_VALUE': 'Unknown value',
        'SWERPG.AUDIT_LOG.DESCRIPTION.ITEM_PURCHASE': 'Purchased {itemName} ({itemType}) for {price} credits',
        'SWERPG.AUDIT_LOG.DESCRIPTION.UNKNOWN': 'Unknown event ({type})',
      },
    })
    ;({ buildAuditLogEntries, buildAuditLogDescription, buildCsvContent } = await import('../../module/applications/character-audit-log.mjs'))
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    teardownFoundryMock()
  })

  it('item purchase flows through audit log filter and CSV export', () => {
    const actor = {
      id: 'actor-1',
      name: 'Test Character',
      type: 'character',
      isOwner: true,
      system: { progression: {} },
      flags: {
        swerpg: {
          logs: [
            {
              id: 'p1',
              timestamp: 100,
              type: 'item.purchase',
              userName: 'GM',
              xpDelta: 0,
              creditDelta: -100,
              data: { itemName: 'Blaster', itemType: 'weapon', price: 100, quantity: 1 },
              snapshot: { creditsBefore: 250, creditsAfter: 150 },
            },
          ],
        },
      },
      testUserPermission: vi.fn(() => true),
    }

    // Verify filter "Purchases" returns the entry with correct family
    const { entries } = buildAuditLogEntries(actor, 'purchases')
    expect(entries).toHaveLength(1)
    expect(entries[0].family).toBe('purchases')

    // Verify description contains item name and price
    const description = buildAuditLogDescription(entries[0])
    expect(description).toContain('Blaster')
    expect(description).toContain('100')

    // Verify CSV contains the creditDelta value
    const csv = buildCsvContent(actor)
    expect(csv).toContain('-100')
  })

  it('item purchase with itemId and creditsDelta flows through audit log filter and CSV', () => {
    const actor = {
      id: 'actor-1',
      name: 'Test Character',
      type: 'character',
      isOwner: true,
      system: { progression: {} },
      flags: {
        swerpg: {
          logs: [
            {
              id: 'p1',
              timestamp: 100,
              type: 'item.purchase',
              userName: 'GM',
              xpDelta: 0,
              creditDelta: -100,
              data: {
                itemName: 'Blaster Pistol',
                itemType: 'weapon',
                price: 100,
                quantity: 1,
                itemId: 'item-uuid-abc123',
              },
              snapshot: { creditsBefore: 250, creditsAfter: 150, creditsDelta: 100 },
            },
          ],
        },
      },
      testUserPermission: vi.fn(() => true),
    }

    // Verify filter "purchases" returns the entry with itemId
    const { entries } = buildAuditLogEntries(actor, 'purchases')
    expect(entries).toHaveLength(1)
    expect(entries[0].data.itemId).toBe('item-uuid-abc123')

    // Verify description contains item name and price
    const description = buildAuditLogDescription(entries[0])
    expect(description).toContain('Blaster Pistol')
    expect(description).toContain('100')

    // Verify CSV contains the creditDelta value and item name
    const csv = buildCsvContent(actor)
    expect(csv).toContain('-100')
    expect(csv).toContain('Blaster Pistol')
  })

  it('handles logs without itemId gracefully in filter and description', () => {
    const actor = {
      id: 'actor-1',
      name: 'Test Character',
      type: 'character',
      isOwner: true,
      system: { progression: {} },
      flags: {
        swerpg: {
          logs: [
            {
              id: 'p1',
              timestamp: 100,
              type: 'item.purchase',
              xpDelta: 0,
              data: { itemName: 'Blaster', itemType: 'weapon', price: 100, quantity: 1 },
              snapshot: { creditsBefore: 250, creditsAfter: 150 },
            },
          ],
        },
      },
      testUserPermission: vi.fn(() => true),
    }

    const { entries } = buildAuditLogEntries(actor, 'purchases')
    expect(entries).toHaveLength(1)
    expect(entries[0].data.itemId).toBeUndefined()
  })
})

/* ============================================ */
/*  buildAuditLogEntryVisual view-model fields  */
/* ============================================ */

describe('buildAuditLogEntryVisual', () => {
  let buildAuditLogEntryVisual
  let buildAuditLogEntries

  const actor = {
    id: 'actor-visual',
    name: 'Lira Odan',
    img: 'systems/swerpg/assets/lira.webp',
    type: 'character',
    isOwner: true,
    system: {},
    flags: { swerpg: { logs: [] } },
    testUserPermission: vi.fn(() => true),
  }

  beforeEach(async () => {
    setupFoundryMock({
      translations: {
        'SWERPG.AUDIT_LOG.TYPE.SKILL_TRAIN': 'Skill trained',
        'SWERPG.AUDIT_LOG.TYPE.SKILL_FORGET': 'Skill forgotten',
        'SWERPG.AUDIT_LOG.TYPE.CHARACTERISTIC_INCREASE': 'Characteristic increased',
        'SWERPG.AUDIT_LOG.TYPE.XP_SPEND': 'XP spent',
        'SWERPG.AUDIT_LOG.TYPE.XP_REFUND': 'XP refunded',
        'SWERPG.AUDIT_LOG.TYPE.XP_GRANT': 'XP granted',
        'SWERPG.AUDIT_LOG.TYPE.XP_REMOVE': 'XP removed',
        'SWERPG.AUDIT_LOG.TYPE.SPECIES_SET': 'Species set',
        'SWERPG.AUDIT_LOG.TYPE.CAREER_SET': 'Career set',
        'SWERPG.AUDIT_LOG.TYPE.SPECIALIZATION_ADD': 'Specialization added',
        'SWERPG.AUDIT_LOG.TYPE.SPECIALIZATION_REMOVE': 'Specialization removed',
        'SWERPG.AUDIT_LOG.TYPE.TALENT_PURCHASE': 'Talent purchased',
        'SWERPG.AUDIT_LOG.TYPE.TALENT_NODE_PURCHASE': 'Talent node purchase',
        'SWERPG.AUDIT_LOG.TYPE.TALENT_NODE_PURCHASE_SUCCEEDED': 'Talent node purchased',
        'SWERPG.AUDIT_LOG.TYPE.TALENT_NODE_PURCHASE_FAILED': 'Talent node purchase failed',
        'SWERPG.AUDIT_LOG.TYPE.TALENT_NODE_FORGET_SUCCEEDED': 'Talent node forgotten',
        'SWERPG.AUDIT_LOG.TYPE.TALENT_NODE_FORGET_FAILED': 'Talent node forget failed',
        'SWERPG.AUDIT_LOG.TYPE.ADVANCEMENT_LEVEL': 'Level advanced',
        'SWERPG.AUDIT_LOG.TYPE.ITEM_PURCHASE': 'Item purchased',
        'SWERPG.AUDIT_LOG.TYPE.ITEM_SALE': 'Item sold',
        'SWERPG.AUDIT_LOG.TYPE.UNKNOWN': 'Unknown event',
        'SWERPG.AUDIT_LOG.NONE': 'None',
        'SWERPG.AUDIT_LOG.FILTER.ALL': 'All',
        'SWERPG.AUDIT_LOG.FILTER.PURCHASES': 'Purchases',
        'SWERPG.AUDIT_LOG.FILTER.SKILLS': 'Skills',
        'SWERPG.AUDIT_LOG.FILTER.TALENTS': 'Talents',
        'SWERPG.AUDIT_LOG.UNKNOWN_ITEM': 'Unknown item',
        'SWERPG.AUDIT_LOG.UNKNOWN_VALUE': 'Unknown value',
        'SWERPG.AUDIT_LOG.UNKNOWN_SKILL': 'Unknown skill',
        'SWERPG.AUDIT_LOG.UNKNOWN_SPECIALIZATION': 'Unknown specialization',
        'SWERPG.AUDIT_LOG.DESCRIPTION.SKILL_TRAIN': 'Skill {skill}: rank {oldRank} -> {newRank}',
        'SWERPG.AUDIT_LOG.DESCRIPTION.ITEM_PURCHASE': 'Purchased {itemName} ({itemType}) for {price} credits',
        'SWERPG.AUDIT_LOG.DESCRIPTION.TALENT_NODE_PURCHASE_FAILED': 'Talent node purchase failed: {reasonCode} (node {nodeId})',
        'SWERPG.AUDIT_LOG.DESCRIPTION.UNKNOWN': 'Unknown event ({type})',
      },
    })
    ;({ buildAuditLogEntryVisual, buildAuditLogEntries } = await import('../../module/applications/character-audit-log.mjs'))
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    teardownFoundryMock()
  })

  it('skill.train — variant add, previousValue/nextValue as rank strings, hasPreviousValue true', () => {
    const entry = { type: 'skill.train', data: { skillName: 'Piloting', oldRank: 1, newRank: 2, cost: 10 } }
    const visual = buildAuditLogEntryVisual(actor, entry)

    expect(visual.variant).toBe('add')
    expect(visual.eventLabel).toBe('Skill trained')
    expect(visual.previousValue).toBe('1')
    expect(visual.nextValue).toBe('2')
    expect(visual.hasPreviousValue).toBe(true)
    expect(visual.actorImg).toBe('systems/swerpg/assets/lira.webp')
    expect(visual.actorName).toBe('Lira Odan')
  })

  it('skill.train with isFree — variant gain', () => {
    const entry = { type: 'skill.train', data: { skillName: 'Piloting', oldRank: 0, newRank: 1, isFree: true } }
    const visual = buildAuditLogEntryVisual(actor, entry)

    expect(visual.variant).toBe('gain')
  })

  it('species.set — variant change, previousValue and nextValue from data', () => {
    const entry = { type: 'species.set', data: { oldSpecies: 'Human', newSpecies: 'Bothan' } }
    const visual = buildAuditLogEntryVisual(actor, entry)

    expect(visual.variant).toBe('change')
    expect(visual.eventLabel).toBe('Species set')
    expect(visual.previousValue).toBe('Human')
    expect(visual.nextValue).toBe('Bothan')
    expect(visual.hasPreviousValue).toBe(true)
  })

  it('species.set — previousValue falls back to None label when oldSpecies is absent', () => {
    const entry = { type: 'species.set', data: { newSpecies: "Twi'lek" } }
    const visual = buildAuditLogEntryVisual(actor, entry)

    expect(visual.previousValue).toBe('None')
    expect(visual.hasPreviousValue).toBe(true)
  })

  it('item.purchase — variant add, nextValue contains item name', () => {
    const entry = { type: 'item.purchase', data: { itemName: 'Blaster Pistol', itemType: 'weapon', price: 100, quantity: 1 } }
    const visual = buildAuditLogEntryVisual(actor, entry)

    expect(visual.variant).toBe('add')
    expect(visual.eventLabel).toBe('Item purchased')
    expect(visual.nextValue).toBe('Blaster Pistol (weapon)')
    expect(visual.hasPreviousValue).toBe(false)
  })

  it('talent-node-purchase-failed — variant fail, nextValue is nodeId', () => {
    const entry = { type: 'talent-node-purchase-failed', data: { nodeId: 'r1c1', reasonCode: 'not-enough-xp' } }
    const visual = buildAuditLogEntryVisual(actor, entry)

    expect(visual.variant).toBe('fail')
    expect(visual.eventLabel).toBe('Talent node purchase failed')
    expect(visual.nextValue).toBe('r1c1')
    expect(visual.hasPreviousValue).toBe(false)
  })

  it('buildAuditLogEntries spreads visual fields into each entry', () => {
    const actorWithLogs = {
      ...actor,
      flags: {
        swerpg: {
          logs: [{ id: 'e1', timestamp: 100, type: 'skill.train', xpDelta: -10, data: { skillName: 'Piloting', oldRank: 1, newRank: 2, cost: 10 } }],
        },
      },
    }

    const { entries } = buildAuditLogEntries(actorWithLogs, 'all')
    expect(entries).toHaveLength(1)

    const entry = entries[0]
    expect(entry.variant).toBe('add')
    expect(entry.eventLabel).toBe('Skill trained')
    expect(entry.previousValue).toBe('1')
    expect(entry.nextValue).toBe('2')
    expect(entry.hasPreviousValue).toBe(true)
    expect(entry.actorImg).toBe('systems/swerpg/assets/lira.webp')
    expect(entry.actorName).toBe('Lira Odan')
  })

  it('advancement.level — variant change, previousValue/nextValue as level strings', () => {
    const entry = { type: 'advancement.level', data: { oldLevel: 3, newLevel: 4 } }
    const visual = buildAuditLogEntryVisual(actor, entry)

    expect(visual.variant).toBe('change')
    expect(visual.previousValue).toBe('3')
    expect(visual.nextValue).toBe('4')
    expect(visual.hasPreviousValue).toBe(true)
  })

  it('talent-node-purchase-succeeded — variant add, nextValue is talentId', () => {
    const entry = { type: 'talent-node-purchase-succeeded', data: { talentId: 'grit', specializationId: 'spec-bodyguard', cost: 10 } }
    const visual = buildAuditLogEntryVisual(actor, entry)

    expect(visual.variant).toBe('add')
    expect(visual.nextValue).toBe('grit')
  })
})

/* ============================================ */
/*  Filter aria-pressed and icon view-model    */
/* ============================================ */

describe('audit log filter isPressed and icon in _prepareContext', () => {
  let CharacterAuditLogApp

  beforeEach(async () => {
    setupFoundryMock({
      translations: {
        'SWERPG.AUDIT_LOG.FILTER.ALL': 'All',
        'SWERPG.AUDIT_LOG.FILTER.SKILLS': 'Skills',
        'SWERPG.AUDIT_LOG.FILTER.TALENTS': 'Talents',
        'SWERPG.AUDIT_LOG.FILTER.XP': 'XP',
        'SWERPG.AUDIT_LOG.FILTER.CHARACTERISTICS': 'Characteristics',
        'SWERPG.AUDIT_LOG.FILTER.DETAILS': 'Core choices',
        'SWERPG.AUDIT_LOG.FILTER.ADVANCEMENT': 'Advancement',
        'SWERPG.AUDIT_LOG.FILTER.PURCHASES': 'Purchases',
        'SWERPG.AUDIT_LOG.FILTER.SALES': 'Sales',
        'SWERPG.AUDIT_LOG.EMPTY': 'No entries',
        'SWERPG.AUDIT_LOG.VARIANT.ADD': 'Added',
        'SWERPG.AUDIT_LOG.VARIANT.REMOVE': 'Removed',
        'SWERPG.AUDIT_LOG.VARIANT.GAIN': 'Gained',
        'SWERPG.AUDIT_LOG.VARIANT.CHANGE': 'Changed',
        'SWERPG.AUDIT_LOG.VARIANT.FAIL': 'Failed',
      },
    })
    ;({ default: CharacterAuditLogApp } = await import('../../module/applications/character-audit-log.mjs'))
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    teardownFoundryMock()
  })

  function makeActor(logs = []) {
    return {
      id: 'actor-filter',
      name: 'Test',
      type: 'character',
      isOwner: true,
      system: {},
      flags: { swerpg: { logs } },
      testUserPermission: vi.fn(() => true),
    }
  }

  it('active filter has isPressed true, others have isPressed false', async () => {
    const actor = makeActor()
    const app = new CharacterAuditLogApp({ document: actor, filter: 'skills' })
    const ctx = await app._prepareContext({})

    const skillsFilter = ctx.filters.find((f) => f.id === 'skills')
    const allFilter = ctx.filters.find((f) => f.id === 'all')

    expect(skillsFilter.isPressed).toBe(true)
    expect(allFilter.isPressed).toBe(false)
  })

  it('all filter has isPressed true by default', async () => {
    const actor = makeActor()
    const app = new CharacterAuditLogApp({ document: actor })
    const ctx = await app._prepareContext({})

    const allFilter = ctx.filters.find((f) => f.id === 'all')
    expect(allFilter.isPressed).toBe(true)
  })

  it('each filter carries a non-empty icon string', async () => {
    const actor = makeActor()
    const app = new CharacterAuditLogApp({ document: actor })
    const ctx = await app._prepareContext({})

    for (const filter of ctx.filters) {
      expect(typeof filter.icon).toBe('string')
      expect(filter.icon.length).toBeGreaterThan(0)
    }
  })

  it('active filter has is-active cssClass and isPressed true consistently', async () => {
    const actor = makeActor()
    const app = new CharacterAuditLogApp({ document: actor, filter: 'talents' })
    const ctx = await app._prepareContext({})

    const talentsFilter = ctx.filters.find((f) => f.id === 'talents')
    expect(talentsFilter.cssClass).toContain('is-active')
    expect(talentsFilter.isPressed).toBe(true)
  })

  it('context exposes totalCount, filteredCount, searchQuery, dateFrom, dateTo', async () => {
    const actor = makeActor()
    const app = new CharacterAuditLogApp({ document: actor })
    const ctx = await app._prepareContext({})

    expect(typeof ctx.totalCount).toBe('number')
    expect(typeof ctx.filteredCount).toBe('number')
    expect(typeof ctx.searchQuery).toBe('string')
    expect(typeof ctx.dateFrom).toBe('string')
    expect(typeof ctx.dateTo).toBe('string')
  })

  it('isFiltered is false when family is all and no search active', async () => {
    const actor = makeActor()
    const app = new CharacterAuditLogApp({ document: actor })
    const ctx = await app._prepareContext({})

    expect(ctx.isFiltered).toBe(false)
  })

  it('isFiltered is true when family filter is active', async () => {
    const actor = makeActor()
    const app = new CharacterAuditLogApp({ document: actor, filter: 'skills' })
    const ctx = await app._prepareContext({})

    expect(ctx.isFiltered).toBe(true)
  })

  it('isFiltered is true when searchQuery is set', async () => {
    const actor = makeActor()
    const app = new CharacterAuditLogApp({ document: actor })
    app.searchQuery = 'piloting'
    const ctx = await app._prepareContext({})

    expect(ctx.isFiltered).toBe(true)
  })

  it('context exposes emptyFilteredLabel as a string', async () => {
    const actor = makeActor()
    const app = new CharacterAuditLogApp({ document: actor })
    const ctx = await app._prepareContext({})

    expect(typeof ctx.emptyFilteredLabel).toBe('string')
  })
})

/* ============================================ */
/*  Icon / glyph / aria-pressed view-model     */
/* ============================================ */

describe('audit log family icons and variant glyphs', () => {
  let buildAuditLogEntries
  let getAuditLogFamilyIcon
  let getAuditLogVariantGlyph

  const actor = {
    id: 'actor-icons',
    name: 'Kira Sol',
    img: 'systems/swerpg/assets/kira.webp',
    type: 'character',
    isOwner: true,
    system: {},
    flags: { swerpg: { logs: [] } },
    testUserPermission: vi.fn(() => true),
  }

  beforeEach(async () => {
    setupFoundryMock({
      translations: {
        'SWERPG.AUDIT_LOG.TYPE.SKILL_TRAIN': 'Skill trained',
        'SWERPG.AUDIT_LOG.TYPE.ITEM_SALE': 'Item sold',
        'SWERPG.AUDIT_LOG.TYPE.ITEM_PURCHASE': 'Item purchased',
        'SWERPG.AUDIT_LOG.TYPE.TALENT_NODE_PURCHASE_FAILED': 'Talent node purchase failed',
        'SWERPG.AUDIT_LOG.TYPE.XP_GRANT': 'XP granted',
        'SWERPG.AUDIT_LOG.TYPE.ADVANCEMENT_LEVEL': 'Level advanced',
        'SWERPG.AUDIT_LOG.TYPE.UNKNOWN': 'Unknown event',
        'SWERPG.AUDIT_LOG.FILTER.ALL': 'All',
        'SWERPG.AUDIT_LOG.FILTER.SKILLS': 'Skills',
        'SWERPG.AUDIT_LOG.FILTER.TALENTS': 'Talents',
        'SWERPG.AUDIT_LOG.FILTER.XP': 'XP',
        'SWERPG.AUDIT_LOG.FILTER.CHARACTERISTICS': 'Characteristics',
        'SWERPG.AUDIT_LOG.FILTER.DETAILS': 'Core choices',
        'SWERPG.AUDIT_LOG.FILTER.ADVANCEMENT': 'Advancement',
        'SWERPG.AUDIT_LOG.FILTER.PURCHASES': 'Purchases',
        'SWERPG.AUDIT_LOG.FILTER.SALES': 'Sales',
        'SWERPG.AUDIT_LOG.NONE': 'None',
        'SWERPG.AUDIT_LOG.UNKNOWN_ITEM': 'Unknown item',
        'SWERPG.AUDIT_LOG.UNKNOWN_VALUE': 'Unknown value',
        'SWERPG.AUDIT_LOG.VARIANT.ADD': 'Added',
        'SWERPG.AUDIT_LOG.VARIANT.REMOVE': 'Removed',
        'SWERPG.AUDIT_LOG.VARIANT.GAIN': 'Gained',
        'SWERPG.AUDIT_LOG.VARIANT.CHANGE': 'Changed',
        'SWERPG.AUDIT_LOG.VARIANT.FAIL': 'Failed',
        'SWERPG.AUDIT_LOG.DESCRIPTION.SKILL_TRAIN': 'Skill {skill}: rank {oldRank} -> {newRank}',
        'SWERPG.AUDIT_LOG.DESCRIPTION.ITEM_SALE': 'Sold {itemName} ({itemType}) for {resalePrice} credits ({fraction}% of base price)',
        'SWERPG.AUDIT_LOG.DESCRIPTION.ITEM_PURCHASE': 'Purchased {itemName} ({itemType}) for {price} credits',
        'SWERPG.AUDIT_LOG.DESCRIPTION.UNKNOWN': 'Unknown event ({type})',
      },
    })
    ;({ buildAuditLogEntries, getAuditLogFamilyIcon, getAuditLogVariantGlyph } = await import('../../module/applications/character-audit-log.mjs'))
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    teardownFoundryMock()
  })

  it('getAuditLogFamilyIcon returns a non-empty string for all known families', () => {
    const families = ['all', 'skills', 'talents', 'xp', 'characteristics', 'details', 'advancement', 'purchases', 'sales', 'other']
    for (const family of families) {
      const icon = getAuditLogFamilyIcon(family)
      expect(typeof icon).toBe('string')
      expect(icon.length).toBeGreaterThan(0)
    }
  })

  it('getAuditLogFamilyIcon falls back to the other icon for unknown families', () => {
    const fallback = getAuditLogFamilyIcon('other')
    expect(getAuditLogFamilyIcon('unknown-family')).toBe(fallback)
  })

  it('getAuditLogVariantGlyph returns a non-empty string for all canonical variants', () => {
    const variants = ['add', 'remove', 'gain', 'change', 'fail']
    for (const variant of variants) {
      const glyph = getAuditLogVariantGlyph(variant)
      expect(typeof glyph).toBe('string')
      expect(glyph.length).toBeGreaterThan(0)
    }
  })

  it('getAuditLogVariantGlyph falls back to the change glyph for unknown variants', () => {
    const fallback = getAuditLogVariantGlyph('change')
    expect(getAuditLogVariantGlyph('unknown-variant')).toBe(fallback)
  })

  it('skill.train entry carries familyIcon for skills family', () => {
    const actorWithLogs = {
      ...actor,
      flags: {
        swerpg: {
          logs: [{ id: 'e1', timestamp: 100, type: 'skill.train', xpDelta: -10, data: { skillName: 'Piloting', oldRank: 1, newRank: 2, cost: 10 } }],
        },
      },
    }

    const { entries: e1 } = buildAuditLogEntries(actorWithLogs, 'all')
    expect(e1).toHaveLength(1)
    const entry = e1[0]
    expect(entry.family).toBe('skills')
    expect(entry.familyIcon).toBe(getAuditLogFamilyIcon('skills'))
    expect(typeof entry.familyIcon).toBe('string')
    expect(entry.familyIcon.length).toBeGreaterThan(0)
  })

  it('item.sale entry carries familyIcon for sales family', () => {
    const actorWithLogs = {
      ...actor,
      flags: {
        swerpg: {
          logs: [
            {
              id: 'e2',
              timestamp: 200,
              type: 'item.sale',
              xpDelta: 0,
              creditDelta: 75,
              data: { itemName: 'Blaster', itemType: 'weapon', basePrice: 100, resalePrice: 75, fraction: 0.75, quantity: 1 },
            },
          ],
        },
      },
    }

    const { entries: e2 } = buildAuditLogEntries(actorWithLogs, 'all')
    expect(e2).toHaveLength(1)
    const entry = e2[0]
    expect(entry.family).toBe('sales')
    expect(entry.familyIcon).toBe(getAuditLogFamilyIcon('sales'))
  })

  it('skill.train entry carries variantGlyph for add variant', () => {
    const actorWithLogs = {
      ...actor,
      flags: {
        swerpg: {
          logs: [{ id: 'e1', timestamp: 100, type: 'skill.train', xpDelta: -10, data: { skillName: 'Piloting', oldRank: 1, newRank: 2, cost: 10 } }],
        },
      },
    }

    const { entries: e3 } = buildAuditLogEntries(actorWithLogs, 'all')
    const entry = e3[0]
    expect(entry.variant).toBe('add')
    expect(entry.variantGlyph).toBe(getAuditLogVariantGlyph('add'))
    expect(typeof entry.variantGlyph).toBe('string')
    expect(entry.variantGlyph.length).toBeGreaterThan(0)
  })

  it('xp.grant entry carries variantGlyph for gain variant', () => {
    const actorWithLogs = {
      ...actor,
      flags: {
        swerpg: {
          logs: [{ id: 'e3', timestamp: 300, type: 'xp.grant', xpDelta: 20, data: { amount: 20 } }],
        },
      },
    }

    const { entries: e4 } = buildAuditLogEntries(actorWithLogs, 'all')
    const entry = e4[0]
    expect(entry.variant).toBe('gain')
    expect(entry.variantGlyph).toBe(getAuditLogVariantGlyph('gain'))
  })

  it('advancement.level entry carries variantGlyph for change variant', () => {
    const actorWithLogs = {
      ...actor,
      flags: {
        swerpg: {
          logs: [{ id: 'e4', timestamp: 400, type: 'advancement.level', xpDelta: 0, data: { oldLevel: 2, newLevel: 3 } }],
        },
      },
    }

    const { entries: e5 } = buildAuditLogEntries(actorWithLogs, 'all')
    const entry = e5[0]
    expect(entry.variant).toBe('change')
    expect(entry.variantGlyph).toBe(getAuditLogVariantGlyph('change'))
  })

  it('talent-node-purchase-failed entry carries variantGlyph for fail variant', () => {
    const actorWithLogs = {
      ...actor,
      flags: {
        swerpg: {
          logs: [{ id: 'e5', timestamp: 500, type: 'talent-node-purchase-failed', xpDelta: -5, data: { nodeId: 'r1c1', reasonCode: 'not-enough-xp' } }],
        },
      },
    }

    const { entries: e6 } = buildAuditLogEntries(actorWithLogs, 'all')
    const entry = e6[0]
    expect(entry.variant).toBe('fail')
    expect(entry.variantGlyph).toBe(getAuditLogVariantGlyph('fail'))
  })

  it('entries carry a variantGlyphLabel localized string', () => {
    const actorWithLogs = {
      ...actor,
      flags: {
        swerpg: {
          logs: [{ id: 'e1', timestamp: 100, type: 'skill.train', xpDelta: -10, data: { skillName: 'Piloting', oldRank: 1, newRank: 2, cost: 10 } }],
        },
      },
    }

    const { entries: e7 } = buildAuditLogEntries(actorWithLogs, 'all')
    const entry = e7[0]
    expect(typeof entry.variantGlyphLabel).toBe('string')
    expect(entry.variantGlyphLabel).toBe('Added')
  })
})

/* ============================================ */
/*  Text search, date range, counters          */
/* ============================================ */

describe('buildAuditLogEntries — text search, date range, counters', () => {
  let buildAuditLogEntries

  const baseTranslations = {
    'SWERPG.AUDIT_LOG.FILTER.ALL': 'All',
    'SWERPG.AUDIT_LOG.FILTER.SKILLS': 'Skills',
    'SWERPG.AUDIT_LOG.FILTER.TALENTS': 'Talents',
    'SWERPG.AUDIT_LOG.FILTER.XP': 'XP',
    'SWERPG.AUDIT_LOG.FILTER.CHARACTERISTICS': 'Characteristics',
    'SWERPG.AUDIT_LOG.FILTER.DETAILS': 'Core choices',
    'SWERPG.AUDIT_LOG.FILTER.ADVANCEMENT': 'Advancement',
    'SWERPG.AUDIT_LOG.FILTER.PURCHASES': 'Purchases',
    'SWERPG.AUDIT_LOG.FILTER.SALES': 'Sales',
    'SWERPG.AUDIT_LOG.TYPE.SKILL_TRAIN': 'Skill purchase',
    'SWERPG.AUDIT_LOG.TYPE.ITEM_PURCHASE': 'Item purchased',
    'SWERPG.AUDIT_LOG.TYPE.XP_GRANT': 'XP granted',
    'SWERPG.AUDIT_LOG.TYPE.UNKNOWN': 'Unknown event',
    'SWERPG.AUDIT_LOG.NONE': 'None',
    'SWERPG.AUDIT_LOG.UNKNOWN_VALUE': 'Unknown value',
    'SWERPG.AUDIT_LOG.UNKNOWN_SKILL': 'Unknown skill',
    'SWERPG.AUDIT_LOG.UNKNOWN_ITEM': 'Unknown item',
    'SWERPG.AUDIT_LOG.DESCRIPTION.SKILL_TRAIN': 'Skill {skill}: rank {oldRank} -> {newRank}',
    'SWERPG.AUDIT_LOG.DESCRIPTION.ITEM_PURCHASE': 'Purchased {itemName} ({itemType}) for {price} credits',
    'SWERPG.AUDIT_LOG.DESCRIPTION.XP_GRANT': 'Granted {amount} XP',
    'SWERPG.AUDIT_LOG.DESCRIPTION.UNKNOWN': 'Unknown event ({type})',
    'SWERPG.AUDIT_LOG.VARIANT.ADD': 'Added',
    'SWERPG.AUDIT_LOG.VARIANT.GAIN': 'Gained',
    'SWERPG.AUDIT_LOG.VARIANT.REMOVE': 'Removed',
    'SWERPG.AUDIT_LOG.VARIANT.CHANGE': 'Changed',
    'SWERPG.AUDIT_LOG.VARIANT.FAIL': 'Failed',
  }

  beforeEach(async () => {
    setupFoundryMock({ translations: baseTranslations })
    ;({ buildAuditLogEntries } = await import('../../module/applications/character-audit-log.mjs'))
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    teardownFoundryMock()
  })

  function makeActorWithLogs(logs) {
    return {
      id: 'actor-search',
      name: 'Vara Kesh',
      type: 'character',
      isOwner: true,
      system: {},
      flags: { swerpg: { logs } },
      testUserPermission: vi.fn(() => true),
    }
  }

  // ---- counters ----

  it('returns totalCount equal to all entries and filteredCount equal to shown entries', () => {
    const actor = makeActorWithLogs([
      { id: 'e1', timestamp: 100, type: 'skill.train', xpDelta: -10, data: { skillName: 'Piloting', oldRank: 1, newRank: 2 } },
      { id: 'e2', timestamp: 200, type: 'xp.grant', xpDelta: 20, data: { amount: 20 } },
    ])

    const { totalCount, filteredCount, entries } = buildAuditLogEntries(actor, 'skills')
    expect(totalCount).toBe(2)
    expect(filteredCount).toBe(1)
    expect(entries).toHaveLength(1)
  })

  it('returns totalCount = filteredCount when filter is all and no search', () => {
    const actor = makeActorWithLogs([
      { id: 'e1', timestamp: 100, type: 'skill.train', xpDelta: -10, data: { skillName: 'Piloting', oldRank: 1, newRank: 2 } },
      { id: 'e2', timestamp: 200, type: 'xp.grant', xpDelta: 20, data: { amount: 20 } },
    ])

    const { totalCount, filteredCount } = buildAuditLogEntries(actor, 'all')
    expect(totalCount).toBe(2)
    expect(filteredCount).toBe(2)
  })

  it('returns zero filteredCount when no entry matches the search', () => {
    const actor = makeActorWithLogs([{ id: 'e1', timestamp: 100, type: 'skill.train', xpDelta: -10, data: { skillName: 'Piloting', oldRank: 1, newRank: 2 } }])

    const { totalCount, filteredCount } = buildAuditLogEntries(actor, 'all', { query: 'xyzzy-no-match' })
    expect(totalCount).toBe(1)
    expect(filteredCount).toBe(0)
  })

  // ---- text search ----

  it('text search is case-insensitive', () => {
    const actor = makeActorWithLogs([{ id: 'e1', timestamp: 100, type: 'skill.train', xpDelta: -10, data: { skillName: 'Piloting', oldRank: 1, newRank: 2 } }])

    const { entries: lower } = buildAuditLogEntries(actor, 'all', { query: 'piloting' })
    const { entries: upper } = buildAuditLogEntries(actor, 'all', { query: 'PILOTING' })
    expect(lower).toHaveLength(1)
    expect(upper).toHaveLength(1)
  })

  it('text search matches on description field', () => {
    const actor = makeActorWithLogs([
      { id: 'e1', timestamp: 100, type: 'skill.train', xpDelta: -10, data: { skillName: 'Piloting', oldRank: 1, newRank: 2 } },
      { id: 'e2', timestamp: 200, type: 'xp.grant', xpDelta: 20, data: { amount: 20 } },
    ])

    // 'Piloting' appears in the description built from DESCRIPTION.SKILL_TRAIN
    const { entries } = buildAuditLogEntries(actor, 'all', { query: 'Piloting' })
    expect(entries).toHaveLength(1)
    expect(entries[0].id).toBe('e1')
  })

  it('text search matches on typeLabel field', () => {
    const actor = makeActorWithLogs([
      { id: 'e1', timestamp: 100, type: 'skill.train', xpDelta: -10, data: { skillName: 'Piloting', oldRank: 1, newRank: 2 } },
      { id: 'e2', timestamp: 200, type: 'xp.grant', xpDelta: 20, data: { amount: 20 } },
    ])

    // 'XP granted' is the typeLabel for xp.grant
    const { entries } = buildAuditLogEntries(actor, 'all', { query: 'XP granted' })
    expect(entries).toHaveLength(1)
    expect(entries[0].id).toBe('e2')
  })

  it('empty query returns all entries regardless of content', () => {
    const actor = makeActorWithLogs([
      { id: 'e1', timestamp: 100, type: 'skill.train', xpDelta: -10, data: { skillName: 'Piloting', oldRank: 1, newRank: 2 } },
      { id: 'e2', timestamp: 200, type: 'xp.grant', xpDelta: 20, data: { amount: 20 } },
    ])

    const { entries } = buildAuditLogEntries(actor, 'all', { query: '' })
    expect(entries).toHaveLength(2)
  })

  it('text search combined with family filter is conjunctive', () => {
    const actor = makeActorWithLogs([
      { id: 'e1', timestamp: 100, type: 'skill.train', xpDelta: -10, data: { skillName: 'Piloting', oldRank: 1, newRank: 2 } },
      { id: 'e2', timestamp: 200, type: 'item.purchase', xpDelta: 0, data: { itemName: 'Blaster Pistol', itemType: 'weapon', price: 100, quantity: 1 } },
    ])

    // query 'Piloting' matches e1 (skills family), but family='purchases' excludes it
    const { entries } = buildAuditLogEntries(actor, 'purchases', { query: 'Piloting' })
    expect(entries).toHaveLength(0)

    // query 'Blaster' matches e2 (purchases family)
    const { entries: entries2 } = buildAuditLogEntries(actor, 'purchases', { query: 'Blaster' })
    expect(entries2).toHaveLength(1)
    expect(entries2[0].id).toBe('e2')
  })

  // ---- date range ----

  it('dateFrom filters out entries before the given date', () => {
    // Timestamps: Jan 1 2024 (UTC midnight = 1704067200000), Jan 15 2024
    const ts1 = new Date('2024-01-01T00:00:00Z').getTime()
    const ts2 = new Date('2024-01-15T00:00:00Z').getTime()
    const actor = makeActorWithLogs([
      { id: 'e1', timestamp: ts1, type: 'skill.train', xpDelta: -10, data: { skillName: 'Piloting', oldRank: 1, newRank: 2 } },
      { id: 'e2', timestamp: ts2, type: 'xp.grant', xpDelta: 20, data: { amount: 20 } },
    ])

    const { entries } = buildAuditLogEntries(actor, 'all', { dateFrom: '2024-01-10' })
    expect(entries).toHaveLength(1)
    expect(entries[0].id).toBe('e2')
  })

  it('dateTo filters out entries after the given date (inclusive)', () => {
    const ts1 = new Date('2024-01-01T00:00:00Z').getTime()
    const ts2 = new Date('2024-01-15T00:00:00Z').getTime()
    const actor = makeActorWithLogs([
      { id: 'e1', timestamp: ts1, type: 'skill.train', xpDelta: -10, data: { skillName: 'Piloting', oldRank: 1, newRank: 2 } },
      { id: 'e2', timestamp: ts2, type: 'xp.grant', xpDelta: 20, data: { amount: 20 } },
    ])

    // dateTo = Jan 1 — e1 should pass (same day), e2 should be excluded
    const { entries } = buildAuditLogEntries(actor, 'all', { dateTo: '2024-01-01' })
    expect(entries).toHaveLength(1)
    expect(entries[0].id).toBe('e1')
  })

  it('bounded date range [from, to] is inclusive on both ends', () => {
    const ts1 = new Date('2024-01-01T00:00:00Z').getTime()
    const ts2 = new Date('2024-01-10T12:00:00Z').getTime()
    const ts3 = new Date('2024-01-20T00:00:00Z').getTime()
    const actor = makeActorWithLogs([
      { id: 'e1', timestamp: ts1, type: 'skill.train', xpDelta: -10, data: { skillName: 'Piloting', oldRank: 1, newRank: 2 } },
      { id: 'e2', timestamp: ts2, type: 'xp.grant', xpDelta: 20, data: { amount: 20 } },
      { id: 'e3', timestamp: ts3, type: 'xp.grant', xpDelta: 10, data: { amount: 10 } },
    ])

    const { entries } = buildAuditLogEntries(actor, 'all', { dateFrom: '2024-01-05', dateTo: '2024-01-15' })
    expect(entries).toHaveLength(1)
    expect(entries[0].id).toBe('e2')
  })

  it('from > to treats the date range as open (no date filter applied)', () => {
    const ts1 = new Date('2024-01-01T00:00:00Z').getTime()
    const ts2 = new Date('2024-01-15T00:00:00Z').getTime()
    const actor = makeActorWithLogs([
      { id: 'e1', timestamp: ts1, type: 'skill.train', xpDelta: -10, data: { skillName: 'Piloting', oldRank: 1, newRank: 2 } },
      { id: 'e2', timestamp: ts2, type: 'xp.grant', xpDelta: 20, data: { amount: 20 } },
    ])

    // dateFrom after dateTo → invalid range → open filter → all returned
    const { entries } = buildAuditLogEntries(actor, 'all', { dateFrom: '2024-01-20', dateTo: '2024-01-01' })
    expect(entries).toHaveLength(2)
  })

  it('only dateFrom (no dateTo) returns entries on or after', () => {
    const ts1 = new Date('2024-01-01T00:00:00Z').getTime()
    const ts2 = new Date('2024-06-01T00:00:00Z').getTime()
    const actor = makeActorWithLogs([
      { id: 'e1', timestamp: ts1, type: 'skill.train', xpDelta: -10, data: { skillName: 'Piloting', oldRank: 1, newRank: 2 } },
      { id: 'e2', timestamp: ts2, type: 'xp.grant', xpDelta: 20, data: { amount: 20 } },
    ])

    const { entries } = buildAuditLogEntries(actor, 'all', { dateFrom: '2024-03-01' })
    expect(entries).toHaveLength(1)
    expect(entries[0].id).toBe('e2')
  })

  it('only dateTo (no dateFrom) returns entries on or before', () => {
    const ts1 = new Date('2024-01-01T00:00:00Z').getTime()
    const ts2 = new Date('2024-06-01T00:00:00Z').getTime()
    const actor = makeActorWithLogs([
      { id: 'e1', timestamp: ts1, type: 'skill.train', xpDelta: -10, data: { skillName: 'Piloting', oldRank: 1, newRank: 2 } },
      { id: 'e2', timestamp: ts2, type: 'xp.grant', xpDelta: 20, data: { amount: 20 } },
    ])

    const { entries } = buildAuditLogEntries(actor, 'all', { dateTo: '2024-03-01' })
    expect(entries).toHaveLength(1)
    expect(entries[0].id).toBe('e1')
  })

  it('invalid date string for dateFrom is ignored (treated as null)', () => {
    const ts1 = new Date('2024-01-01T00:00:00Z').getTime()
    const actor = makeActorWithLogs([{ id: 'e1', timestamp: ts1, type: 'skill.train', xpDelta: -10, data: { skillName: 'Piloting', oldRank: 1, newRank: 2 } }])

    // Invalid date string → parseDateBound returns null → open bound
    const { entries } = buildAuditLogEntries(actor, 'all', { dateFrom: 'not-a-date' })
    expect(entries).toHaveLength(1)
  })

  // ---- combination: family + text + dates ----

  it('combination of family, text, and date range all apply conjunctively', () => {
    const ts1 = new Date('2024-01-01T00:00:00Z').getTime()
    const ts2 = new Date('2024-01-15T00:00:00Z').getTime()
    const ts3 = new Date('2024-01-15T00:00:00Z').getTime()
    const actor = makeActorWithLogs([
      { id: 'e1', timestamp: ts1, type: 'skill.train', xpDelta: -10, data: { skillName: 'Piloting', oldRank: 1, newRank: 2 } },
      { id: 'e2', timestamp: ts2, type: 'skill.train', xpDelta: -5, data: { skillName: 'Gunnery', oldRank: 0, newRank: 1 } },
      { id: 'e3', timestamp: ts3, type: 'xp.grant', xpDelta: 20, data: { amount: 20 } },
    ])

    // family=skills, query='Gunnery', dateFrom='2024-01-10' → only e2 matches
    const { entries, totalCount, filteredCount } = buildAuditLogEntries(actor, 'skills', {
      query: 'Gunnery',
      dateFrom: '2024-01-10',
    })
    expect(totalCount).toBe(3)
    expect(filteredCount).toBe(1)
    expect(entries).toHaveLength(1)
    expect(entries[0].id).toBe('e2')
  })
})

/* ============================================ */
/*  buildAuditLogDateSections                  */
/* ============================================ */

describe('buildAuditLogDateSections', () => {
  let buildAuditLogDateSections
  let buildAuditLogEntries

  const baseTranslations = {
    'SWERPG.AUDIT_LOG.FILTER.ALL': 'All',
    'SWERPG.AUDIT_LOG.FILTER.SKILLS': 'Skills',
    'SWERPG.AUDIT_LOG.FILTER.TALENTS': 'Talents',
    'SWERPG.AUDIT_LOG.FILTER.XP': 'XP',
    'SWERPG.AUDIT_LOG.FILTER.CHARACTERISTICS': 'Characteristics',
    'SWERPG.AUDIT_LOG.FILTER.DETAILS': 'Core choices',
    'SWERPG.AUDIT_LOG.FILTER.ADVANCEMENT': 'Advancement',
    'SWERPG.AUDIT_LOG.FILTER.PURCHASES': 'Purchases',
    'SWERPG.AUDIT_LOG.FILTER.SALES': 'Sales',
    'SWERPG.AUDIT_LOG.TYPE.SKILL_TRAIN': 'Skill purchase',
    'SWERPG.AUDIT_LOG.TYPE.XP_GRANT': 'XP granted',
    'SWERPG.AUDIT_LOG.TYPE.UNKNOWN': 'Unknown event',
    'SWERPG.AUDIT_LOG.NONE': 'None',
    'SWERPG.AUDIT_LOG.UNKNOWN_VALUE': 'Unknown value',
    'SWERPG.AUDIT_LOG.UNKNOWN_SKILL': 'Unknown skill',
    'SWERPG.AUDIT_LOG.DESCRIPTION.SKILL_TRAIN': 'Skill {skill}: rank {oldRank} -> {newRank}',
    'SWERPG.AUDIT_LOG.DESCRIPTION.XP_GRANT': 'Granted {amount} XP',
    'SWERPG.AUDIT_LOG.DESCRIPTION.UNKNOWN': 'Unknown event ({type})',
    'SWERPG.AUDIT_LOG.VARIANT.ADD': 'Added',
    'SWERPG.AUDIT_LOG.VARIANT.GAIN': 'Gained',
    'SWERPG.AUDIT_LOG.VARIANT.REMOVE': 'Removed',
    'SWERPG.AUDIT_LOG.VARIANT.CHANGE': 'Changed',
    'SWERPG.AUDIT_LOG.VARIANT.FAIL': 'Failed',
    'SWERPG.AUDIT_LOG.DATE.TODAY': 'Today',
    'SWERPG.AUDIT_LOG.DATE.YESTERDAY': 'Yesterday',
  }

  beforeEach(async () => {
    setupFoundryMock({ translations: baseTranslations })
    ;({ buildAuditLogDateSections, buildAuditLogEntries } = await import('../../module/applications/character-audit-log.mjs'))
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    teardownFoundryMock()
  })

  function makeActorWithLogs(logs) {
    return {
      id: 'actor-sections',
      name: 'Vara Kesh',
      type: 'character',
      isOwner: true,
      system: {},
      flags: { swerpg: { logs } },
      testUserPermission: vi.fn(() => true),
    }
  }

  it('returns an empty array when entries is empty', () => {
    const sections = buildAuditLogDateSections([])
    expect(sections).toEqual([])
  })

  it('groups entries from the same day into a single section', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-03-10T14:00:00Z'))

    // Two entries on the same local day (UTC dates that map to same local day)
    const ts1 = new Date('2025-03-10T08:00:00Z').getTime()
    const ts2 = new Date('2025-03-10T12:00:00Z').getTime()

    const actor = makeActorWithLogs([
      { id: 'e1', timestamp: ts1, type: 'skill.train', xpDelta: -10, data: { skillName: 'Piloting', oldRank: 1, newRank: 2 } },
      { id: 'e2', timestamp: ts2, type: 'xp.grant', xpDelta: 20, data: { amount: 20 } },
    ])

    const { entries } = buildAuditLogEntries(actor, 'all')
    const sections = buildAuditLogDateSections(entries)

    expect(sections).toHaveLength(1)
    expect(sections[0].entries).toHaveLength(2)

    vi.useRealTimers()
  })

  it('creates separate sections for distinct days, ordered anti-chronologically', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-03-15T14:00:00Z'))

    const tsDay1 = new Date('2025-03-10T10:00:00Z').getTime()
    const tsDay2 = new Date('2025-03-12T10:00:00Z').getTime()

    const actor = makeActorWithLogs([
      { id: 'e1', timestamp: tsDay1, type: 'skill.train', xpDelta: -10, data: { skillName: 'Piloting', oldRank: 1, newRank: 2 } },
      { id: 'e2', timestamp: tsDay2, type: 'xp.grant', xpDelta: 20, data: { amount: 20 } },
    ])

    const { entries } = buildAuditLogEntries(actor, 'all')
    const sections = buildAuditLogDateSections(entries)

    // Anti-chronological: most recent day (March 12) first
    expect(sections).toHaveLength(2)
    expect(sections[0].dayKey).toBe('2025-03-12')
    expect(sections[1].dayKey).toBe('2025-03-10')

    vi.useRealTimers()
  })

  it('preserves anti-chronological order of entries within each section', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-03-10T20:00:00Z'))

    const tsEarly = new Date('2025-03-10T08:00:00Z').getTime()
    const tsLate = new Date('2025-03-10T16:00:00Z').getTime()

    const actor = makeActorWithLogs([
      { id: 'e-early', timestamp: tsEarly, type: 'skill.train', xpDelta: -10, data: { skillName: 'Piloting', oldRank: 1, newRank: 2 } },
      { id: 'e-late', timestamp: tsLate, type: 'xp.grant', xpDelta: 20, data: { amount: 20 } },
    ])

    const { entries } = buildAuditLogEntries(actor, 'all')
    const sections = buildAuditLogDateSections(entries)

    expect(sections).toHaveLength(1)
    // buildAuditLogEntries sorts anti-chronologically, so the later entry comes first
    expect(sections[0].entries[0].id).toBe('e-late')
    expect(sections[0].entries[1].id).toBe('e-early')

    vi.useRealTimers()
  })

  it("labels today's section with the TODAY i18n key", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-03-10T14:00:00Z'))

    const tsToday = new Date('2025-03-10T10:00:00Z').getTime()

    const actor = makeActorWithLogs([
      { id: 'e1', timestamp: tsToday, type: 'skill.train', xpDelta: -10, data: { skillName: 'Piloting', oldRank: 1, newRank: 2 } },
    ])

    const { entries } = buildAuditLogEntries(actor, 'all')
    const sections = buildAuditLogDateSections(entries)

    expect(sections[0].headerLabel).toBe('Today')

    vi.useRealTimers()
  })

  it("labels yesterday's section with the YESTERDAY i18n key", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-03-10T14:00:00Z'))

    const tsYesterday = new Date('2025-03-09T10:00:00Z').getTime()

    const actor = makeActorWithLogs([
      { id: 'e1', timestamp: tsYesterday, type: 'skill.train', xpDelta: -10, data: { skillName: 'Piloting', oldRank: 1, newRank: 2 } },
    ])

    const { entries } = buildAuditLogEntries(actor, 'all')
    const sections = buildAuditLogDateSections(entries)

    expect(sections[0].headerLabel).toBe('Yesterday')

    vi.useRealTimers()
  })

  it('uses a full locale date label for older days', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-03-10T14:00:00Z'))

    // A day more than 1 day ago
    const tsOld = new Date('2025-03-05T10:00:00Z').getTime()

    const actor = makeActorWithLogs([
      { id: 'e1', timestamp: tsOld, type: 'skill.train', xpDelta: -10, data: { skillName: 'Piloting', oldRank: 1, newRank: 2 } },
    ])

    const { entries } = buildAuditLogEntries(actor, 'all')
    const sections = buildAuditLogDateSections(entries)

    // Not 'Today' or 'Yesterday' — should be a locale date string
    expect(sections[0].headerLabel).not.toBe('Today')
    expect(sections[0].headerLabel).not.toBe('Yesterday')
    expect(typeof sections[0].headerLabel).toBe('string')
    expect(sections[0].headerLabel.length).toBeGreaterThan(0)

    vi.useRealTimers()
  })

  it('each section exposes a datetimeAttr equal to the dayKey', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-03-10T14:00:00Z'))

    const tsToday = new Date('2025-03-10T10:00:00Z').getTime()

    const actor = makeActorWithLogs([
      { id: 'e1', timestamp: tsToday, type: 'skill.train', xpDelta: -10, data: { skillName: 'Piloting', oldRank: 1, newRank: 2 } },
    ])

    const { entries } = buildAuditLogEntries(actor, 'all')
    const sections = buildAuditLogDateSections(entries)

    expect(sections[0].datetimeAttr).toBe(sections[0].dayKey)

    vi.useRealTimers()
  })

  it('each entry in a section carries timeOnly and entryDatetimeAttr', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-03-10T14:00:00Z'))

    const ts = new Date('2025-03-10T10:30:00Z').getTime()

    const actor = makeActorWithLogs([{ id: 'e1', timestamp: ts, type: 'skill.train', xpDelta: -10, data: { skillName: 'Piloting', oldRank: 1, newRank: 2 } }])

    const { entries } = buildAuditLogEntries(actor, 'all')
    const sections = buildAuditLogDateSections(entries)

    const entry = sections[0].entries[0]
    expect(typeof entry.timeOnly).toBe('string')
    expect(entry.timeOnly.length).toBeGreaterThan(0)
    expect(typeof entry.entryDatetimeAttr).toBe('string')
    // ISO 8601 format
    expect(entry.entryDatetimeAttr).toMatch(/^\d{4}-\d{2}-\d{2}T/)

    vi.useRealTimers()
  })

  it('context from _prepareContext exposes sections with the right shape', async () => {
    setupFoundryMock({ translations: baseTranslations })
    const { default: CharacterAuditLogApp } = await import('../../module/applications/character-audit-log.mjs')

    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-03-10T14:00:00Z'))

    const ts = new Date('2025-03-10T10:00:00Z').getTime()

    const actor = makeActorWithLogs([{ id: 'e1', timestamp: ts, type: 'skill.train', xpDelta: -10, data: { skillName: 'Piloting', oldRank: 1, newRank: 2 } }])

    const app = new CharacterAuditLogApp({ document: actor })
    const ctx = await app._prepareContext({})

    expect(Array.isArray(ctx.sections)).toBe(true)
    expect(ctx.sections).toHaveLength(1)
    expect(ctx.sections[0].headerLabel).toBe('Today')
    expect(ctx.sections[0].entries).toHaveLength(1)

    vi.useRealTimers()
  })
})

/* ============================================ */
/*  Per-family counts and empty family state   */
/* ============================================ */

describe('buildAuditLogEntries — familyCounts and filter isEmpty', () => {
  let buildAuditLogEntries

  const baseTranslations = {
    'SWERPG.AUDIT_LOG.FILTER.ALL': 'All',
    'SWERPG.AUDIT_LOG.FILTER.SKILLS': 'Skills',
    'SWERPG.AUDIT_LOG.FILTER.TALENTS': 'Talents',
    'SWERPG.AUDIT_LOG.FILTER.XP': 'XP',
    'SWERPG.AUDIT_LOG.FILTER.CHARACTERISTICS': 'Characteristics',
    'SWERPG.AUDIT_LOG.FILTER.DETAILS': 'Core choices',
    'SWERPG.AUDIT_LOG.FILTER.ADVANCEMENT': 'Advancement',
    'SWERPG.AUDIT_LOG.FILTER.PURCHASES': 'Purchases',
    'SWERPG.AUDIT_LOG.FILTER.SALES': 'Sales',
    'SWERPG.AUDIT_LOG.TYPE.SKILL_TRAIN': 'Skill purchase',
    'SWERPG.AUDIT_LOG.TYPE.XP_GRANT': 'XP granted',
    'SWERPG.AUDIT_LOG.TYPE.ITEM_PURCHASE': 'Item purchased',
    'SWERPG.AUDIT_LOG.TYPE.UNKNOWN': 'Unknown event',
    'SWERPG.AUDIT_LOG.NONE': 'None',
    'SWERPG.AUDIT_LOG.UNKNOWN_VALUE': 'Unknown value',
    'SWERPG.AUDIT_LOG.UNKNOWN_SKILL': 'Unknown skill',
    'SWERPG.AUDIT_LOG.UNKNOWN_ITEM': 'Unknown item',
    'SWERPG.AUDIT_LOG.DESCRIPTION.SKILL_TRAIN': 'Skill {skill}: rank {oldRank} -> {newRank}',
    'SWERPG.AUDIT_LOG.DESCRIPTION.XP_GRANT': 'Granted {amount} XP',
    'SWERPG.AUDIT_LOG.DESCRIPTION.ITEM_PURCHASE': 'Purchased {itemName} ({itemType}) for {price} credits',
    'SWERPG.AUDIT_LOG.DESCRIPTION.UNKNOWN': 'Unknown event ({type})',
    'SWERPG.AUDIT_LOG.VARIANT.ADD': 'Added',
    'SWERPG.AUDIT_LOG.VARIANT.GAIN': 'Gained',
    'SWERPG.AUDIT_LOG.VARIANT.REMOVE': 'Removed',
    'SWERPG.AUDIT_LOG.VARIANT.CHANGE': 'Changed',
    'SWERPG.AUDIT_LOG.VARIANT.FAIL': 'Failed',
  }

  beforeEach(async () => {
    setupFoundryMock({ translations: baseTranslations })
    ;({ buildAuditLogEntries } = await import('../../module/applications/character-audit-log.mjs'))
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    teardownFoundryMock()
  })

  function makeActorWithLogs(logs) {
    return {
      id: 'actor-family-counts',
      name: 'Vara Kesh',
      type: 'character',
      isOwner: true,
      system: {},
      flags: { swerpg: { logs } },
      testUserPermission: vi.fn(() => true),
    }
  }

  it('familyCounts contains count per family on a mixed journal', () => {
    const actor = makeActorWithLogs([
      { id: 'e1', timestamp: 100, type: 'skill.train', xpDelta: -10, data: { skillName: 'Piloting', oldRank: 1, newRank: 2 } },
      { id: 'e2', timestamp: 200, type: 'skill.train', xpDelta: -5, data: { skillName: 'Gunnery', oldRank: 0, newRank: 1 } },
      { id: 'e3', timestamp: 300, type: 'xp.grant', xpDelta: 20, data: { amount: 20 } },
    ])

    const { familyCounts } = buildAuditLogEntries(actor, 'all')

    expect(familyCounts.all).toBe(3)
    expect(familyCounts.skills).toBe(2)
    expect(familyCounts.xp).toBe(1)
    // Families with no entries are absent from the counts map
    expect(familyCounts.talents).toBeUndefined()
  })

  it('familyCounts[all] equals total entries when no text/date filter', () => {
    const actor = makeActorWithLogs([
      { id: 'e1', timestamp: 100, type: 'skill.train', xpDelta: -10, data: { skillName: 'Piloting', oldRank: 1, newRank: 2 } },
      { id: 'e2', timestamp: 200, type: 'xp.grant', xpDelta: 20, data: { amount: 20 } },
    ])

    const { familyCounts, totalCount } = buildAuditLogEntries(actor, 'all')
    expect(familyCounts.all).toBe(totalCount)
  })

  it('familyCounts is recalculated when text search reduces the corpus', () => {
    const actor = makeActorWithLogs([
      { id: 'e1', timestamp: 100, type: 'skill.train', xpDelta: -10, data: { skillName: 'Piloting', oldRank: 1, newRank: 2 } },
      { id: 'e2', timestamp: 200, type: 'skill.train', xpDelta: -5, data: { skillName: 'Gunnery', oldRank: 0, newRank: 1 } },
      { id: 'e3', timestamp: 300, type: 'xp.grant', xpDelta: 20, data: { amount: 20 } },
    ])

    // Only e1 matches "piloting"
    const { familyCounts } = buildAuditLogEntries(actor, 'all', { query: 'piloting' })
    expect(familyCounts.all).toBe(1)
    expect(familyCounts.skills).toBe(1)
    expect(familyCounts.xp).toBeUndefined()
  })

  it('familyCounts is independent of the active family filter', () => {
    const actor = makeActorWithLogs([
      { id: 'e1', timestamp: 100, type: 'skill.train', xpDelta: -10, data: { skillName: 'Piloting', oldRank: 1, newRank: 2 } },
      { id: 'e2', timestamp: 200, type: 'xp.grant', xpDelta: 20, data: { amount: 20 } },
    ])

    // When viewing skills only, familyCounts still reflects ALL families
    const { familyCounts, entries } = buildAuditLogEntries(actor, 'skills')
    expect(entries).toHaveLength(1)
    expect(familyCounts.skills).toBe(1)
    expect(familyCounts.xp).toBe(1)
    expect(familyCounts.all).toBe(2)
  })

  it('selecting a family with no entries returns an empty entries array but familyCounts still has other families', () => {
    const actor = makeActorWithLogs([{ id: 'e1', timestamp: 100, type: 'skill.train', xpDelta: -10, data: { skillName: 'Piloting', oldRank: 1, newRank: 2 } }])

    const { entries, filteredCount, familyCounts } = buildAuditLogEntries(actor, 'talents')
    expect(entries).toHaveLength(0)
    expect(filteredCount).toBe(0)
    expect(familyCounts.skills).toBe(1)
    expect(familyCounts.talents).toBeUndefined()
  })
})

/* ============================================ */
/*  isActiveFamilyEmpty and filter isEmpty     */
/*  in _prepareContext view-model              */
/* ============================================ */

describe('_prepareContext — isActiveFamilyEmpty and filter isEmpty/count', () => {
  let CharacterAuditLogApp

  const baseTranslations = {
    'SWERPG.AUDIT_LOG.FILTER.ALL': 'All',
    'SWERPG.AUDIT_LOG.FILTER.SKILLS': 'Skills',
    'SWERPG.AUDIT_LOG.FILTER.TALENTS': 'Talents',
    'SWERPG.AUDIT_LOG.FILTER.XP': 'XP',
    'SWERPG.AUDIT_LOG.FILTER.CHARACTERISTICS': 'Characteristics',
    'SWERPG.AUDIT_LOG.FILTER.DETAILS': 'Core choices',
    'SWERPG.AUDIT_LOG.FILTER.ADVANCEMENT': 'Advancement',
    'SWERPG.AUDIT_LOG.FILTER.PURCHASES': 'Purchases',
    'SWERPG.AUDIT_LOG.FILTER.SALES': 'Sales',
    'SWERPG.AUDIT_LOG.EMPTY': 'No entries',
    'SWERPG.AUDIT_LOG.EMPTY_FILTERED': 'No match',
    'SWERPG.AUDIT_LOG.EMPTY_FAMILY': 'No entries for this category.',
    'SWERPG.AUDIT_LOG.TYPE.SKILL_TRAIN': 'Skill purchase',
    'SWERPG.AUDIT_LOG.TYPE.XP_GRANT': 'XP granted',
    'SWERPG.AUDIT_LOG.TYPE.UNKNOWN': 'Unknown event',
    'SWERPG.AUDIT_LOG.NONE': 'None',
    'SWERPG.AUDIT_LOG.UNKNOWN_VALUE': 'Unknown value',
    'SWERPG.AUDIT_LOG.UNKNOWN_SKILL': 'Unknown skill',
    'SWERPG.AUDIT_LOG.DESCRIPTION.SKILL_TRAIN': 'Skill {skill}: rank {oldRank} -> {newRank}',
    'SWERPG.AUDIT_LOG.DESCRIPTION.XP_GRANT': 'Granted {amount} XP',
    'SWERPG.AUDIT_LOG.DESCRIPTION.UNKNOWN': 'Unknown event ({type})',
    'SWERPG.AUDIT_LOG.VARIANT.ADD': 'Added',
    'SWERPG.AUDIT_LOG.VARIANT.GAIN': 'Gained',
    'SWERPG.AUDIT_LOG.VARIANT.REMOVE': 'Removed',
    'SWERPG.AUDIT_LOG.VARIANT.CHANGE': 'Changed',
    'SWERPG.AUDIT_LOG.VARIANT.FAIL': 'Failed',
  }

  beforeEach(async () => {
    setupFoundryMock({ translations: baseTranslations })
    ;({ default: CharacterAuditLogApp } = await import('../../module/applications/character-audit-log.mjs'))
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    teardownFoundryMock()
  })

  function makeActor(logs = []) {
    return {
      id: 'actor-empty-family',
      name: 'Test',
      type: 'character',
      isOwner: true,
      system: {},
      flags: { swerpg: { logs } },
      testUserPermission: vi.fn(() => true),
    }
  }

  it('isActiveFamilyEmpty is false when active filter is all', async () => {
    const actor = makeActor([{ id: 'e1', timestamp: 100, type: 'skill.train', xpDelta: -10, data: { skillName: 'Piloting', oldRank: 1, newRank: 2 } }])
    const app = new CharacterAuditLogApp({ document: actor })
    const ctx = await app._prepareContext({})
    expect(ctx.isActiveFamilyEmpty).toBe(false)
  })

  it('isActiveFamilyEmpty is false when the active family has entries', async () => {
    const actor = makeActor([{ id: 'e1', timestamp: 100, type: 'skill.train', xpDelta: -10, data: { skillName: 'Piloting', oldRank: 1, newRank: 2 } }])
    const app = new CharacterAuditLogApp({ document: actor, filter: 'skills' })
    const ctx = await app._prepareContext({})
    expect(ctx.isActiveFamilyEmpty).toBe(false)
  })

  it('isActiveFamilyEmpty is true when the active family has no entries in the corpus', async () => {
    const actor = makeActor([{ id: 'e1', timestamp: 100, type: 'skill.train', xpDelta: -10, data: { skillName: 'Piloting', oldRank: 1, newRank: 2 } }])
    const app = new CharacterAuditLogApp({ document: actor, filter: 'talents' })
    const ctx = await app._prepareContext({})
    expect(ctx.isActiveFamilyEmpty).toBe(true)
    expect(ctx.hasFilteredEntries).toBe(false)
  })

  it('isActiveFamilyEmpty is true even when other families have entries', async () => {
    const actor = makeActor([
      { id: 'e1', timestamp: 100, type: 'skill.train', xpDelta: -10, data: { skillName: 'Piloting', oldRank: 1, newRank: 2 } },
      { id: 'e2', timestamp: 200, type: 'xp.grant', xpDelta: 20, data: { amount: 20 } },
    ])
    const app = new CharacterAuditLogApp({ document: actor, filter: 'talents' })
    const ctx = await app._prepareContext({})
    expect(ctx.isActiveFamilyEmpty).toBe(true)
  })

  it('context exposes emptyFamilyLabel as a string', async () => {
    const actor = makeActor()
    const app = new CharacterAuditLogApp({ document: actor })
    const ctx = await app._prepareContext({})
    expect(typeof ctx.emptyFamilyLabel).toBe('string')
    expect(ctx.emptyFamilyLabel.length).toBeGreaterThan(0)
  })

  it('each filter exposes count and isEmpty fields', async () => {
    const actor = makeActor([{ id: 'e1', timestamp: 100, type: 'skill.train', xpDelta: -10, data: { skillName: 'Piloting', oldRank: 1, newRank: 2 } }])
    const app = new CharacterAuditLogApp({ document: actor })
    const ctx = await app._prepareContext({})

    for (const filter of ctx.filters) {
      expect(typeof filter.count).toBe('number')
      expect(typeof filter.isEmpty).toBe('boolean')
    }
  })

  it('skills filter has count=1 and isEmpty=false when one skill entry exists', async () => {
    const actor = makeActor([{ id: 'e1', timestamp: 100, type: 'skill.train', xpDelta: -10, data: { skillName: 'Piloting', oldRank: 1, newRank: 2 } }])
    const app = new CharacterAuditLogApp({ document: actor })
    const ctx = await app._prepareContext({})

    const skillsFilter = ctx.filters.find((f) => f.id === 'skills')
    expect(skillsFilter.count).toBe(1)
    expect(skillsFilter.isEmpty).toBe(false)
  })

  it('talents filter has count=0 and isEmpty=true when no talent entries exist', async () => {
    const actor = makeActor([{ id: 'e1', timestamp: 100, type: 'skill.train', xpDelta: -10, data: { skillName: 'Piloting', oldRank: 1, newRank: 2 } }])
    const app = new CharacterAuditLogApp({ document: actor })
    const ctx = await app._prepareContext({})

    const talentsFilter = ctx.filters.find((f) => f.id === 'talents')
    expect(talentsFilter.count).toBe(0)
    expect(talentsFilter.isEmpty).toBe(true)
  })

  it('all filter count reflects all entries regardless of active family', async () => {
    const actor = makeActor([
      { id: 'e1', timestamp: 100, type: 'skill.train', xpDelta: -10, data: { skillName: 'Piloting', oldRank: 1, newRank: 2 } },
      { id: 'e2', timestamp: 200, type: 'xp.grant', xpDelta: 20, data: { amount: 20 } },
    ])
    const app = new CharacterAuditLogApp({ document: actor, filter: 'skills' })
    const ctx = await app._prepareContext({})

    const allFilter = ctx.filters.find((f) => f.id === 'all')
    expect(allFilter.count).toBe(2)
    expect(allFilter.isEmpty).toBe(false)
  })

  it('empty filter has is-empty in cssClass', async () => {
    const actor = makeActor([{ id: 'e1', timestamp: 100, type: 'skill.train', xpDelta: -10, data: { skillName: 'Piloting', oldRank: 1, newRank: 2 } }])
    const app = new CharacterAuditLogApp({ document: actor })
    const ctx = await app._prepareContext({})

    const talentsFilter = ctx.filters.find((f) => f.id === 'talents')
    expect(talentsFilter.cssClass).toContain('is-empty')
  })

  it('non-empty filter does not have is-empty in cssClass', async () => {
    const actor = makeActor([{ id: 'e1', timestamp: 100, type: 'skill.train', xpDelta: -10, data: { skillName: 'Piloting', oldRank: 1, newRank: 2 } }])
    const app = new CharacterAuditLogApp({ document: actor })
    const ctx = await app._prepareContext({})

    const skillsFilter = ctx.filters.find((f) => f.id === 'skills')
    expect(skillsFilter.cssClass).not.toContain('is-empty')
  })

  it('active empty filter has both is-active and is-empty in cssClass', async () => {
    const actor = makeActor([{ id: 'e1', timestamp: 100, type: 'skill.train', xpDelta: -10, data: { skillName: 'Piloting', oldRank: 1, newRank: 2 } }])
    const app = new CharacterAuditLogApp({ document: actor, filter: 'talents' })
    const ctx = await app._prepareContext({})

    const talentsFilter = ctx.filters.find((f) => f.id === 'talents')
    expect(talentsFilter.cssClass).toContain('is-active')
    expect(talentsFilter.cssClass).toContain('is-empty')
    expect(talentsFilter.isPressed).toBe(true)
  })

  it('family filter counts respect text search — empty family after search has isEmpty=true', async () => {
    const actor = makeActor([
      { id: 'e1', timestamp: 100, type: 'skill.train', xpDelta: -10, data: { skillName: 'Piloting', oldRank: 1, newRank: 2 } },
      { id: 'e2', timestamp: 200, type: 'xp.grant', xpDelta: 20, data: { amount: 20 } },
    ])
    const app = new CharacterAuditLogApp({ document: actor })
    // Text search for 'piloting' matches only the skills entry → xp family becomes empty
    app.searchQuery = 'piloting'
    const ctx = await app._prepareContext({})

    const xpFilter = ctx.filters.find((f) => f.id === 'xp')
    expect(xpFilter.count).toBe(0)
    expect(xpFilter.isEmpty).toBe(true)

    const skillsFilter = ctx.filters.find((f) => f.id === 'skills')
    expect(skillsFilter.count).toBe(1)
    expect(skillsFilter.isEmpty).toBe(false)
  })

  it('CSV export contract is not affected by familyCounts — all log entries remain exportable', async () => {
    // This verifies that the familyCounts change in buildAuditLogEntries does not
    // affect the CSV export path, which reads from raw logs independently.
    const { buildCsvContent } = await import('../../module/applications/character-audit-log.mjs')

    const actor = makeActor([
      { id: 'e1', timestamp: 100, type: 'skill.train', xpDelta: -10, data: { skillName: 'Piloting', oldRank: 1, newRank: 2 } },
      { id: 'e2', timestamp: 200, type: 'xp.grant', xpDelta: 20, data: { amount: 20 } },
    ])

    const csv = buildCsvContent(actor)
    const lines = csv.split('\n')
    // Header + 2 rows — all entries regardless of family
    expect(lines).toHaveLength(3)
  })
})

/* ============================================ */
/*  Delta unit metadata (XP vs credits)        */
/* ============================================ */

describe('buildAuditLogEntries — delta unit metadata', () => {
  let buildAuditLogEntries

  const baseTranslations = {
    'SWERPG.AUDIT_LOG.FILTER.ALL': 'All',
    'SWERPG.AUDIT_LOG.FILTER.SKILLS': 'Skills',
    'SWERPG.AUDIT_LOG.FILTER.TALENTS': 'Talents',
    'SWERPG.AUDIT_LOG.FILTER.XP': 'XP',
    'SWERPG.AUDIT_LOG.FILTER.CHARACTERISTICS': 'Characteristics',
    'SWERPG.AUDIT_LOG.FILTER.DETAILS': 'Core choices',
    'SWERPG.AUDIT_LOG.FILTER.ADVANCEMENT': 'Advancement',
    'SWERPG.AUDIT_LOG.FILTER.PURCHASES': 'Purchases',
    'SWERPG.AUDIT_LOG.FILTER.SALES': 'Sales',
    'SWERPG.AUDIT_LOG.TYPE.SKILL_TRAIN': 'Skill purchase',
    'SWERPG.AUDIT_LOG.TYPE.XP_GRANT': 'XP granted',
    'SWERPG.AUDIT_LOG.TYPE.ITEM_PURCHASE': 'Item purchased',
    'SWERPG.AUDIT_LOG.TYPE.ITEM_SALE': 'Item sold',
    'SWERPG.AUDIT_LOG.TYPE.UNKNOWN': 'Unknown event',
    'SWERPG.AUDIT_LOG.NONE': 'None',
    'SWERPG.AUDIT_LOG.UNKNOWN_VALUE': 'Unknown value',
    'SWERPG.AUDIT_LOG.UNKNOWN_SKILL': 'Unknown skill',
    'SWERPG.AUDIT_LOG.UNKNOWN_ITEM': 'Unknown item',
    'SWERPG.AUDIT_LOG.DESCRIPTION.SKILL_TRAIN': 'Skill {skill}: rank {oldRank} -> {newRank}',
    'SWERPG.AUDIT_LOG.DESCRIPTION.XP_GRANT': 'Granted {amount} XP',
    'SWERPG.AUDIT_LOG.DESCRIPTION.ITEM_PURCHASE': 'Purchased {itemName} ({itemType}) for {price} credits',
    'SWERPG.AUDIT_LOG.DESCRIPTION.ITEM_SALE': 'Sold {itemName} ({itemType}) for {resalePrice} credits ({fraction}% of base price)',
    'SWERPG.AUDIT_LOG.DESCRIPTION.UNKNOWN': 'Unknown event ({type})',
    'SWERPG.AUDIT_LOG.VARIANT.ADD': 'Added',
    'SWERPG.AUDIT_LOG.VARIANT.GAIN': 'Gained',
    'SWERPG.AUDIT_LOG.VARIANT.REMOVE': 'Removed',
    'SWERPG.AUDIT_LOG.VARIANT.CHANGE': 'Changed',
    'SWERPG.AUDIT_LOG.VARIANT.FAIL': 'Failed',
    'SWERPG.AUDIT_LOG.DELTA.UNIT.XP': 'experience points',
    'SWERPG.AUDIT_LOG.DELTA.UNIT.CREDITS': 'credits',
  }

  beforeEach(async () => {
    setupFoundryMock({ translations: baseTranslations })
    ;({ buildAuditLogEntries } = await import('../../module/applications/character-audit-log.mjs'))
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    teardownFoundryMock()
  })

  function makeActorWithLog(logs) {
    return {
      id: 'actor-delta-unit',
      name: 'Test',
      type: 'character',
      isOwner: true,
      system: {},
      flags: { swerpg: { logs } },
      testUserPermission: vi.fn(() => true),
    }
  }

  it('XP entry (skill.train) carries deltaUnit=xp, deltaUnitIcon with fa-bolt, deltaUnitLabel, deltaUnitClass', () => {
    const actor = makeActorWithLog([{ id: 'e1', timestamp: 100, type: 'skill.train', xpDelta: -10, data: { skillName: 'Piloting', oldRank: 1, newRank: 2 } }])

    const { entries } = buildAuditLogEntries(actor, 'all')
    const entry = entries[0]

    expect(entry.deltaUnit).toBe('xp')
    expect(entry.deltaUnitIcon).toContain('fa-bolt')
    expect(entry.deltaUnitLabel).toBe('experience points')
    expect(entry.deltaUnitClass).toBe('audit-log-entry__delta--unit-xp')
  })

  it('XP entry (xp.grant) carries deltaUnit=xp', () => {
    const actor = makeActorWithLog([{ id: 'e1', timestamp: 100, type: 'xp.grant', xpDelta: 20, data: { amount: 20 } }])

    const { entries } = buildAuditLogEntries(actor, 'all')
    expect(entries[0].deltaUnit).toBe('xp')
    expect(entries[0].deltaUnitIcon).toContain('fa-bolt')
  })

  it('credits entry (item.purchase) carries deltaUnit=credits, deltaUnitIcon with fa-coins, deltaUnitLabel, deltaUnitClass', () => {
    const actor = makeActorWithLog([
      {
        id: 'p1',
        timestamp: 100,
        type: 'item.purchase',
        xpDelta: 0,
        creditDelta: -150,
        data: { itemName: 'Blaster', itemType: 'weapon', price: 150, quantity: 1 },
      },
    ])

    const { entries } = buildAuditLogEntries(actor, 'all')
    const entry = entries[0]

    expect(entry.deltaUnit).toBe('credits')
    expect(entry.deltaUnitIcon).toContain('fa-coins')
    expect(entry.deltaUnitLabel).toBe('credits')
    expect(entry.deltaUnitClass).toBe('audit-log-entry__delta--unit-credits')
  })

  it('credits entry (item.sale) carries deltaUnit=credits', () => {
    const actor = makeActorWithLog([
      {
        id: 's1',
        timestamp: 200,
        type: 'item.sale',
        xpDelta: 0,
        creditDelta: 75,
        data: { itemName: 'Blaster', itemType: 'weapon', basePrice: 100, resalePrice: 75, fraction: 0.75, quantity: 1 },
      },
    ])

    const { entries } = buildAuditLogEntries(actor, 'all')
    expect(entries[0].deltaUnit).toBe('credits')
    expect(entries[0].deltaUnitIcon).toContain('fa-coins')
  })

  it('formattedDelta is preserved for XP entries (backward compat)', () => {
    const actor = makeActorWithLog([{ id: 'e1', timestamp: 100, type: 'skill.train', xpDelta: -10, data: { skillName: 'Piloting', oldRank: 1, newRank: 2 } }])

    const { entries } = buildAuditLogEntries(actor, 'all')
    expect(entries[0].formattedDelta).toBe('-10 XP')
  })

  it('formattedDelta is preserved for credits entries (backward compat)', () => {
    const actor = makeActorWithLog([
      {
        id: 'p1',
        timestamp: 100,
        type: 'item.purchase',
        xpDelta: 0,
        creditDelta: -150,
        data: { itemName: 'Blaster', itemType: 'weapon', price: 150, quantity: 1 },
      },
    ])

    const { entries } = buildAuditLogEntries(actor, 'all')
    expect(entries[0].formattedDelta).toBe('-150 cr')
  })

  it('neutral entry (unknown type with zero delta) carries deltaUnit=neutral and empty deltaUnitIcon', () => {
    const actor = makeActorWithLog([{ id: 'e1', timestamp: 100, type: 'some.unknown.type', xpDelta: 0, data: {} }])

    const { entries } = buildAuditLogEntries(actor, 'all')
    const entry = entries[0]

    expect(entry.deltaUnit).toBe('neutral')
    expect(entry.deltaUnitIcon).toBe('')
    expect(entry.deltaUnitLabel).toBe('')
    expect(entry.deltaUnitClass).toBe('audit-log-entry__delta--unit-neutral')
  })
})

/* ============================================ */
/*  Illustrated empty state — emptyState contract */
/* ============================================ */

describe('_prepareContext — illustrated emptyState contract', () => {
  let CharacterAuditLogApp

  const baseTranslations = {
    'SWERPG.AUDIT_LOG.FILTER.ALL': 'All',
    'SWERPG.AUDIT_LOG.FILTER.SKILLS': 'Skills',
    'SWERPG.AUDIT_LOG.FILTER.TALENTS': 'Talents',
    'SWERPG.AUDIT_LOG.FILTER.XP': 'XP',
    'SWERPG.AUDIT_LOG.FILTER.CHARACTERISTICS': 'Characteristics',
    'SWERPG.AUDIT_LOG.FILTER.DETAILS': 'Core choices',
    'SWERPG.AUDIT_LOG.FILTER.ADVANCEMENT': 'Advancement',
    'SWERPG.AUDIT_LOG.FILTER.PURCHASES': 'Purchases',
    'SWERPG.AUDIT_LOG.FILTER.SALES': 'Sales',
    'SWERPG.AUDIT_LOG.EMPTY': 'No entries in the history yet.',
    'SWERPG.AUDIT_LOG.EMPTY_TITLE': 'No activity recorded yet',
    'SWERPG.AUDIT_LOG.EMPTY_HINT': 'Character evolutions will appear here as the character grows.',
    'SWERPG.AUDIT_LOG.EMPTY_FILTERED': 'No entries match the current filters.',
    'SWERPG.AUDIT_LOG.EMPTY_FAMILY': 'No entries for this category in the current context.',
    'SWERPG.AUDIT_LOG.TYPE.SKILL_TRAIN': 'Skill purchase',
    'SWERPG.AUDIT_LOG.TYPE.UNKNOWN': 'Unknown event',
    'SWERPG.AUDIT_LOG.NONE': 'None',
    'SWERPG.AUDIT_LOG.UNKNOWN_VALUE': 'Unknown value',
    'SWERPG.AUDIT_LOG.UNKNOWN_SKILL': 'Unknown skill',
    'SWERPG.AUDIT_LOG.DESCRIPTION.SKILL_TRAIN': 'Skill {skill}: rank {oldRank} -> {newRank}',
    'SWERPG.AUDIT_LOG.DESCRIPTION.UNKNOWN': 'Unknown event ({type})',
    'SWERPG.AUDIT_LOG.VARIANT.ADD': 'Added',
    'SWERPG.AUDIT_LOG.VARIANT.GAIN': 'Gained',
    'SWERPG.AUDIT_LOG.VARIANT.REMOVE': 'Removed',
    'SWERPG.AUDIT_LOG.VARIANT.CHANGE': 'Changed',
    'SWERPG.AUDIT_LOG.VARIANT.FAIL': 'Failed',
  }

  beforeEach(async () => {
    setupFoundryMock({ translations: baseTranslations })
    ;({ default: CharacterAuditLogApp } = await import('../../module/applications/character-audit-log.mjs'))
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    teardownFoundryMock()
  })

  function makeActor(logs = []) {
    return {
      id: 'actor-empty-state',
      name: 'Test',
      type: 'character',
      isOwner: true,
      system: {},
      flags: { swerpg: { logs } },
      testUserPermission: vi.fn(() => true),
    }
  }

  it('context always exposes emptyState with kind, icon, title and hint fields', async () => {
    const actor = makeActor()
    const app = new CharacterAuditLogApp({ document: actor })
    const ctx = await app._prepareContext({})

    expect(ctx.emptyState).toBeDefined()
    expect(typeof ctx.emptyState.kind).toBe('string')
    expect(typeof ctx.emptyState.icon).toBe('string')
    expect(typeof ctx.emptyState.title).toBe('string')
    expect(typeof ctx.emptyState.hint).toBe('string')
  })

  it('emptyState.kind is empty-log for the primary empty state', async () => {
    const actor = makeActor()
    const app = new CharacterAuditLogApp({ document: actor })
    const ctx = await app._prepareContext({})

    expect(ctx.emptyState.kind).toBe('empty-log')
  })

  it('emptyState.title is the localized EMPTY_TITLE key', async () => {
    const actor = makeActor()
    const app = new CharacterAuditLogApp({ document: actor })
    const ctx = await app._prepareContext({})

    expect(ctx.emptyState.title).toBe('No activity recorded yet')
  })

  it('emptyState.hint is the localized EMPTY_HINT key', async () => {
    const actor = makeActor()
    const app = new CharacterAuditLogApp({ document: actor })
    const ctx = await app._prepareContext({})

    expect(ctx.emptyState.hint).toBe('Character evolutions will appear here as the character grows.')
  })

  it('emptyState.icon is a non-empty FontAwesome class string', async () => {
    const actor = makeActor()
    const app = new CharacterAuditLogApp({ document: actor })
    const ctx = await app._prepareContext({})

    expect(ctx.emptyState.icon.length).toBeGreaterThan(0)
    expect(ctx.emptyState.icon).toContain('fa-')
  })

  it('emptyState is present even when the journal has entries (not shown but contract is always available)', async () => {
    const actor = makeActor([{ id: 'e1', timestamp: 100, type: 'skill.train', xpDelta: -10, data: { skillName: 'Piloting', oldRank: 1, newRank: 2 } }])
    const app = new CharacterAuditLogApp({ document: actor })
    const ctx = await app._prepareContext({})

    // The contract is always populated; the template decides whether to show it
    expect(ctx.emptyState).toBeDefined()
    expect(ctx.emptyState.kind).toBe('empty-log')
  })

  it('hasEntries is false for a truly empty log, distinguishing it from a filtered empty result', async () => {
    const emptyActor = makeActor()
    const appEmpty = new CharacterAuditLogApp({ document: emptyActor })
    const ctxEmpty = await appEmpty._prepareContext({})

    expect(ctxEmpty.hasEntries).toBe(false)
    expect(ctxEmpty.totalCount).toBe(0)

    const actorWithLog = makeActor([{ id: 'e1', timestamp: 100, type: 'skill.train', xpDelta: -10, data: { skillName: 'Piloting', oldRank: 1, newRank: 2 } }])
    const appWithLog = new CharacterAuditLogApp({ document: actorWithLog, filter: 'talents' })
    const ctxFiltered = await appWithLog._prepareContext({})

    // With entries but filtered to empty family — totalCount is non-zero
    expect(ctxFiltered.hasEntries).toBe(true)
    expect(ctxFiltered.totalCount).toBe(1)
    expect(ctxFiltered.hasFilteredEntries).toBe(false)
  })
})

/* ============================================ */
/*  buildSnapshotDetails — snapshot normalization */
/* ============================================ */

describe('buildSnapshotDetails', () => {
  let buildSnapshotDetails

  beforeEach(async () => {
    setupFoundryMock()
    ;({ buildSnapshotDetails } = await import('../../module/applications/character-audit-log.mjs'))
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    teardownFoundryMock()
  })

  it('returns hasDetails=false and empty lines for null snapshot', () => {
    const result = buildSnapshotDetails(null)
    expect(result.hasDetails).toBe(false)
    expect(result.lines).toEqual([])
  })

  it('returns hasDetails=false and empty lines for undefined snapshot', () => {
    const result = buildSnapshotDetails(undefined)
    expect(result.hasDetails).toBe(false)
    expect(result.lines).toEqual([])
  })

  it('returns hasDetails=false and empty lines for an empty snapshot object', () => {
    const result = buildSnapshotDetails({})
    expect(result.hasDetails).toBe(false)
    expect(result.lines).toEqual([])
  })

  it('normalizes modern flat XP snapshot — xpAvailable', () => {
    const result = buildSnapshotDetails({ xpAvailable: 75 })
    expect(result.hasDetails).toBe(true)
    const keys = result.lines.map((l) => l.labelKey)
    expect(keys).toContain('SWERPG.AUDIT_LOG.SNAPSHOT.XP_AVAILABLE')
    const line = result.lines.find((l) => l.labelKey === 'SWERPG.AUDIT_LOG.SNAPSHOT.XP_AVAILABLE')
    expect(line.value).toBe(75)
  })

  it('normalizes modern flat XP snapshot — totalXpSpent and totalXpGained', () => {
    const result = buildSnapshotDetails({ xpAvailable: 50, totalXpSpent: 120, totalXpGained: 170 })
    expect(result.hasDetails).toBe(true)
    const keys = result.lines.map((l) => l.labelKey)
    expect(keys).toContain('SWERPG.AUDIT_LOG.SNAPSHOT.XP_AVAILABLE')
    expect(keys).toContain('SWERPG.AUDIT_LOG.SNAPSHOT.TOTAL_XP_SPENT')
    expect(keys).toContain('SWERPG.AUDIT_LOG.SNAPSHOT.TOTAL_XP_GAINED')
  })

  it('normalizes legacy nested XP snapshot — snapshot.xpAfter.*', () => {
    const result = buildSnapshotDetails({
      xpAfter: { xpAvailable: 30, totalXpSpent: 90, totalXpGained: 120 },
    })
    expect(result.hasDetails).toBe(true)
    const keys = result.lines.map((l) => l.labelKey)
    expect(keys).toContain('SWERPG.AUDIT_LOG.SNAPSHOT.XP_AVAILABLE')
    expect(keys).toContain('SWERPG.AUDIT_LOG.SNAPSHOT.TOTAL_XP_SPENT')
    expect(keys).toContain('SWERPG.AUDIT_LOG.SNAPSHOT.TOTAL_XP_GAINED')
    const available = result.lines.find((l) => l.labelKey === 'SWERPG.AUDIT_LOG.SNAPSHOT.XP_AVAILABLE')
    expect(available.value).toBe(30)
  })

  it('normalizes credits snapshot — creditsBefore and creditsAfter', () => {
    const result = buildSnapshotDetails({ creditsBefore: 250, creditsAfter: 150 })
    expect(result.hasDetails).toBe(true)
    const keys = result.lines.map((l) => l.labelKey)
    expect(keys).toContain('SWERPG.AUDIT_LOG.SNAPSHOT.CREDITS_BEFORE')
    expect(keys).toContain('SWERPG.AUDIT_LOG.SNAPSHOT.CREDITS_AFTER')
    const before = result.lines.find((l) => l.labelKey === 'SWERPG.AUDIT_LOG.SNAPSHOT.CREDITS_BEFORE')
    expect(before.value).toBe(250)
    const after = result.lines.find((l) => l.labelKey === 'SWERPG.AUDIT_LOG.SNAPSHOT.CREDITS_AFTER')
    expect(after.value).toBe(150)
  })

  it('combines XP and credits fields in the same snapshot', () => {
    const result = buildSnapshotDetails({ xpAvailable: 60, creditsBefore: 300, creditsAfter: 200 })
    expect(result.hasDetails).toBe(true)
    const keys = result.lines.map((l) => l.labelKey)
    expect(keys).toContain('SWERPG.AUDIT_LOG.SNAPSHOT.XP_AVAILABLE')
    expect(keys).toContain('SWERPG.AUDIT_LOG.SNAPSHOT.CREDITS_BEFORE')
    expect(keys).toContain('SWERPG.AUDIT_LOG.SNAPSHOT.CREDITS_AFTER')
  })

  it('treats xpAvailable=0 as a valid value (zero is not absent)', () => {
    const result = buildSnapshotDetails({ xpAvailable: 0 })
    expect(result.hasDetails).toBe(true)
    const line = result.lines.find((l) => l.labelKey === 'SWERPG.AUDIT_LOG.SNAPSHOT.XP_AVAILABLE')
    expect(line.value).toBe(0)
  })

  it('skips a field when its value is null in the snapshot', () => {
    const result = buildSnapshotDetails({ xpAvailable: null, creditsBefore: 100, creditsAfter: 80 })
    const keys = result.lines.map((l) => l.labelKey)
    expect(keys).not.toContain('SWERPG.AUDIT_LOG.SNAPSHOT.XP_AVAILABLE')
    expect(keys).toContain('SWERPG.AUDIT_LOG.SNAPSHOT.CREDITS_BEFORE')
  })
})

/* ============================================ */
/*  buildAuditLogEntries — hasDetails/details  */
/*  integration in entry view-model            */
/* ============================================ */

describe('buildAuditLogEntries — hasDetails and details on entries', () => {
  let buildAuditLogEntries

  const baseTranslations = {
    'SWERPG.AUDIT_LOG.FILTER.ALL': 'All',
    'SWERPG.AUDIT_LOG.FILTER.SKILLS': 'Skills',
    'SWERPG.AUDIT_LOG.FILTER.TALENTS': 'Talents',
    'SWERPG.AUDIT_LOG.FILTER.XP': 'XP',
    'SWERPG.AUDIT_LOG.FILTER.CHARACTERISTICS': 'Characteristics',
    'SWERPG.AUDIT_LOG.FILTER.DETAILS': 'Core choices',
    'SWERPG.AUDIT_LOG.FILTER.ADVANCEMENT': 'Advancement',
    'SWERPG.AUDIT_LOG.FILTER.PURCHASES': 'Purchases',
    'SWERPG.AUDIT_LOG.FILTER.SALES': 'Sales',
    'SWERPG.AUDIT_LOG.TYPE.SKILL_TRAIN': 'Skill purchase',
    'SWERPG.AUDIT_LOG.TYPE.XP_GRANT': 'XP granted',
    'SWERPG.AUDIT_LOG.TYPE.ITEM_PURCHASE': 'Item purchased',
    'SWERPG.AUDIT_LOG.TYPE.UNKNOWN': 'Unknown event',
    'SWERPG.AUDIT_LOG.NONE': 'None',
    'SWERPG.AUDIT_LOG.UNKNOWN_VALUE': 'Unknown value',
    'SWERPG.AUDIT_LOG.UNKNOWN_SKILL': 'Unknown skill',
    'SWERPG.AUDIT_LOG.UNKNOWN_ITEM': 'Unknown item',
    'SWERPG.AUDIT_LOG.DESCRIPTION.SKILL_TRAIN': 'Skill {skill}: rank {oldRank} -> {newRank}',
    'SWERPG.AUDIT_LOG.DESCRIPTION.XP_GRANT': 'Granted {amount} XP',
    'SWERPG.AUDIT_LOG.DESCRIPTION.ITEM_PURCHASE': 'Purchased {itemName} ({itemType}) for {price} credits',
    'SWERPG.AUDIT_LOG.DESCRIPTION.UNKNOWN': 'Unknown event ({type})',
    'SWERPG.AUDIT_LOG.VARIANT.ADD': 'Added',
    'SWERPG.AUDIT_LOG.VARIANT.GAIN': 'Gained',
    'SWERPG.AUDIT_LOG.VARIANT.REMOVE': 'Removed',
    'SWERPG.AUDIT_LOG.VARIANT.CHANGE': 'Changed',
    'SWERPG.AUDIT_LOG.VARIANT.FAIL': 'Failed',
    'SWERPG.AUDIT_LOG.SNAPSHOT.XP_AVAILABLE': 'XP available',
    'SWERPG.AUDIT_LOG.SNAPSHOT.TOTAL_XP_SPENT': 'Total XP spent',
    'SWERPG.AUDIT_LOG.SNAPSHOT.TOTAL_XP_GAINED': 'Total XP gained',
    'SWERPG.AUDIT_LOG.SNAPSHOT.CREDITS_BEFORE': 'Credits before',
    'SWERPG.AUDIT_LOG.SNAPSHOT.CREDITS_AFTER': 'Credits after',
  }

  beforeEach(async () => {
    setupFoundryMock({ translations: baseTranslations })
    ;({ buildAuditLogEntries } = await import('../../module/applications/character-audit-log.mjs'))
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    teardownFoundryMock()
  })

  function makeActorWithLog(logs) {
    return {
      id: 'actor-details',
      name: 'Vara Kesh',
      type: 'character',
      isOwner: true,
      system: {},
      flags: { swerpg: { logs } },
      testUserPermission: vi.fn(() => true),
    }
  }

  it('entry without snapshot has hasDetails=false and empty details array', () => {
    const actor = makeActorWithLog([{ id: 'e1', timestamp: 100, type: 'skill.train', xpDelta: -10, data: { skillName: 'Piloting', oldRank: 1, newRank: 2 } }])

    const { entries } = buildAuditLogEntries(actor, 'all')
    expect(entries[0].hasDetails).toBe(false)
    expect(entries[0].details).toEqual([])
  })

  it('XP entry with modern flat snapshot carries hasDetails=true and resolved lines with labels', () => {
    const actor = makeActorWithLog([
      {
        id: 'e1',
        timestamp: 100,
        type: 'xp.grant',
        xpDelta: 20,
        data: { amount: 20 },
        snapshot: { xpAvailable: 95, totalXpSpent: 45, totalXpGained: 140 },
      },
    ])

    const { entries } = buildAuditLogEntries(actor, 'all')
    const entry = entries[0]

    expect(entry.hasDetails).toBe(true)
    expect(Array.isArray(entry.details)).toBe(true)
    expect(entry.details.length).toBeGreaterThan(0)

    const available = entry.details.find((l) => l.labelKey === 'SWERPG.AUDIT_LOG.SNAPSHOT.XP_AVAILABLE')
    expect(available).toBeDefined()
    expect(available.value).toBe(95)
    expect(available.label).toBe('XP available')
  })

  it('XP entry with legacy nested snapshot (xpAfter) carries hasDetails=true with correct values', () => {
    const actor = makeActorWithLog([
      {
        id: 'e2',
        timestamp: 200,
        type: 'skill.train',
        xpDelta: -10,
        data: { skillName: 'Piloting', oldRank: 1, newRank: 2 },
        snapshot: { xpAfter: { xpAvailable: 30, totalXpSpent: 90, totalXpGained: 120 } },
      },
    ])

    const { entries } = buildAuditLogEntries(actor, 'all')
    const entry = entries[0]

    expect(entry.hasDetails).toBe(true)
    const available = entry.details.find((l) => l.labelKey === 'SWERPG.AUDIT_LOG.SNAPSHOT.XP_AVAILABLE')
    expect(available.value).toBe(30)
  })

  it('item.purchase with creditsBefore/creditsAfter carries hasDetails=true with credits lines', () => {
    const actor = makeActorWithLog([
      {
        id: 'p1',
        timestamp: 100,
        type: 'item.purchase',
        xpDelta: 0,
        creditDelta: -100,
        data: { itemName: 'Blaster', itemType: 'weapon', price: 100, quantity: 1 },
        snapshot: { creditsBefore: 250, creditsAfter: 150 },
      },
    ])

    const { entries } = buildAuditLogEntries(actor, 'all')
    const entry = entries[0]

    expect(entry.hasDetails).toBe(true)
    const before = entry.details.find((l) => l.labelKey === 'SWERPG.AUDIT_LOG.SNAPSHOT.CREDITS_BEFORE')
    const after = entry.details.find((l) => l.labelKey === 'SWERPG.AUDIT_LOG.SNAPSHOT.CREDITS_AFTER')
    expect(before.value).toBe(250)
    expect(before.label).toBe('Credits before')
    expect(after.value).toBe(150)
    expect(after.label).toBe('Credits after')
  })

  it('details lines carry a localized label string', () => {
    const actor = makeActorWithLog([
      {
        id: 'e3',
        timestamp: 300,
        type: 'xp.grant',
        xpDelta: 15,
        data: { amount: 15 },
        snapshot: { xpAvailable: 60 },
      },
    ])

    const { entries } = buildAuditLogEntries(actor, 'all')
    for (const line of entries[0].details) {
      expect(typeof line.label).toBe('string')
      expect(line.label.length).toBeGreaterThan(0)
    }
  })

  it('entry with snapshot={} has hasDetails=false (no exploitable fields)', () => {
    const actor = makeActorWithLog([
      {
        id: 'e4',
        timestamp: 400,
        type: 'skill.train',
        xpDelta: -5,
        data: { skillName: 'Gunnery', oldRank: 0, newRank: 1 },
        snapshot: {},
      },
    ])

    const { entries } = buildAuditLogEntries(actor, 'all')
    expect(entries[0].hasDetails).toBe(false)
    expect(entries[0].details).toEqual([])
  })

  it('CSV export is not affected by the snapshot details enrichment — all log entries remain exportable', async () => {
    const { buildCsvContent } = await import('../../module/applications/character-audit-log.mjs')

    const actor = makeActorWithLog([
      {
        id: 'e1',
        timestamp: 100,
        type: 'skill.train',
        xpDelta: -10,
        data: { skillName: 'Piloting', oldRank: 1, newRank: 2 },
        snapshot: { xpAvailable: 50, totalXpSpent: 100, totalXpGained: 150 },
      },
      {
        id: 'e2',
        timestamp: 200,
        type: 'xp.grant',
        xpDelta: 20,
        data: { amount: 20 },
      },
    ])

    const csv = buildCsvContent(actor)
    const lines = csv.split('\n')
    // Header + 2 rows — snapshot fields must not leak into CSV
    expect(lines).toHaveLength(3)
    expect(lines[0]).not.toContain('xpAvailable')
    expect(lines[0]).not.toContain('creditsBefore')
  })
})

/* ============================================ */
/*  #onExportCsv applicative contract          */
/* ============================================ */

describe('#onExportCsv — foundry.utils.saveDataToFile applicative contract', () => {
  let CharacterAuditLogApp

  const baseTranslations = {
    'SWERPG.AUDIT_LOG.NO_PERMISSION': 'No permission',
    'SWERPG.AUDIT_LOG.EXPORT_FAILED': 'Export failed',
    'SWERPG.AUDIT_LOG.FILTER.ALL': 'All',
    'SWERPG.AUDIT_LOG.FILTER.SKILLS': 'Skills',
    'SWERPG.AUDIT_LOG.FILTER.TALENTS': 'Talents',
    'SWERPG.AUDIT_LOG.FILTER.XP': 'XP',
    'SWERPG.AUDIT_LOG.FILTER.CHARACTERISTICS': 'Characteristics',
    'SWERPG.AUDIT_LOG.FILTER.DETAILS': 'Core choices',
    'SWERPG.AUDIT_LOG.FILTER.ADVANCEMENT': 'Advancement',
    'SWERPG.AUDIT_LOG.FILTER.PURCHASES': 'Purchases',
    'SWERPG.AUDIT_LOG.FILTER.SALES': 'Sales',
    'SWERPG.AUDIT_LOG.EMPTY': 'No entries',
    'SWERPG.AUDIT_LOG.TYPE.SKILL_TRAIN': 'Skill purchase',
    'SWERPG.AUDIT_LOG.TYPE.UNKNOWN': 'Unknown event',
    'SWERPG.AUDIT_LOG.NONE': 'None',
    'SWERPG.AUDIT_LOG.UNKNOWN_VALUE': 'Unknown value',
    'SWERPG.AUDIT_LOG.UNKNOWN_SKILL': 'Unknown skill',
    'SWERPG.AUDIT_LOG.DESCRIPTION.SKILL_TRAIN': 'Skill {skill}: rank {oldRank} -> {newRank}',
    'SWERPG.AUDIT_LOG.DESCRIPTION.UNKNOWN': 'Unknown event ({type})',
    'SWERPG.AUDIT_LOG.VARIANT.ADD': 'Added',
    'SWERPG.AUDIT_LOG.VARIANT.GAIN': 'Gained',
    'SWERPG.AUDIT_LOG.VARIANT.REMOVE': 'Removed',
    'SWERPG.AUDIT_LOG.VARIANT.CHANGE': 'Changed',
    'SWERPG.AUDIT_LOG.VARIANT.FAIL': 'Failed',
  }

  beforeEach(async () => {
    setupFoundryMock({ translations: baseTranslations })
    globalThis.game.users = { get: vi.fn(() => undefined) }
    ;({ default: CharacterAuditLogApp } = await import('../../module/applications/character-audit-log.mjs'))
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    teardownFoundryMock()
  })

  function makeActor(logs = []) {
    return {
      id: 'actor-export',
      name: 'Vara Kesh',
      type: 'character',
      isOwner: true,
      system: {},
      flags: { swerpg: { logs } },
      ownership: { 'owner-1': 3 },
      testUserPermission: vi.fn(() => true),
    }
  }

  it('nominal: calls foundry.utils.saveDataToFile with CSV content, text/csv MIME and the computed filename', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-12T10:00:00Z'))

    const actor = makeActor([{ id: 'e1', timestamp: 100, type: 'skill.train', xpDelta: -10, data: { skillName: 'Piloting', oldRank: 1, newRank: 2 } }])

    const app = new CharacterAuditLogApp({ document: actor })
    const fakeEvent = { preventDefault: vi.fn() }

    await CharacterAuditLogApp.DEFAULT_OPTIONS.actions.exportCsv.call(app, fakeEvent, null)

    expect(fakeEvent.preventDefault).toHaveBeenCalled()
    expect(globalThis.foundry.utils.saveDataToFile).toHaveBeenCalledOnce()

    const [csvContent, mime, filename] = globalThis.foundry.utils.saveDataToFile.mock.calls[0]

    expect(typeof csvContent).toBe('string')
    expect(csvContent).toContain('timestamp,date,userName,type,typeLabel,description,xpDelta,creditDelta,actorName,playerName')
    expect(mime).toBe('text/csv;charset=utf-8')
    expect(typeof filename).toBe('string')
    expect(filename).toMatch(/^vara_kesh_.+_2026-05-12\.csv$/)

    vi.useRealTimers()
  })

  it('error path: when foundry.utils.saveDataToFile throws, logs the error and shows EXPORT_FAILED notification', async () => {
    const exportError = new Error('disk full')
    globalThis.foundry.utils.saveDataToFile.mockImplementation(() => {
      throw exportError
    })

    const actor = makeActor()
    const app = new CharacterAuditLogApp({ document: actor })
    const fakeEvent = { preventDefault: vi.fn() }

    // Must not throw — the error is caught by #onExportCsv
    await expect(CharacterAuditLogApp.DEFAULT_OPTIONS.actions.exportCsv.call(app, fakeEvent, null)).resolves.toBeUndefined()

    expect(globalThis.ui.notifications.error).toHaveBeenCalledWith('Export failed')
  })

  it('BOM: the content passed to saveDataToFile starts with a UTF-8 BOM (﻿)', async () => {
    const actor = makeActor([{ id: 'e1', timestamp: 100, type: 'skill.train', xpDelta: -10, data: { skillName: 'Piloting', oldRank: 1, newRank: 2 } }])

    const app = new CharacterAuditLogApp({ document: actor })
    const fakeEvent = { preventDefault: vi.fn() }

    await CharacterAuditLogApp.DEFAULT_OPTIONS.actions.exportCsv.call(app, fakeEvent, null)

    const [csvContent] = globalThis.foundry.utils.saveDataToFile.mock.calls[0]
    expect(csvContent.charCodeAt(0)).toBe(0xfeff)
  })

  it('BOM: the content after the BOM starts with the CSV header', async () => {
    const actor = makeActor([])

    const app = new CharacterAuditLogApp({ document: actor })
    const fakeEvent = { preventDefault: vi.fn() }

    await CharacterAuditLogApp.DEFAULT_OPTIONS.actions.exportCsv.call(app, fakeEvent, null)

    const [csvContent] = globalThis.foundry.utils.saveDataToFile.mock.calls[0]
    // First character is BOM; the rest starts with the header
    expect(csvContent.slice(1)).toContain('timestamp,date,userName,type,typeLabel,description,xpDelta,creditDelta,actorName,playerName')
  })

  it('formula injection: a cell starting with = is neutralized with a leading single-quote in the export', async () => {
    const actor = makeActor([
      {
        id: 'e1',
        timestamp: 100,
        type: 'skill.train',
        userName: '=MALICIOUS()',
        xpDelta: -10,
        data: { skillName: 'Piloting', oldRank: 1, newRank: 2 },
      },
    ])

    const app = new CharacterAuditLogApp({ document: actor })
    const fakeEvent = { preventDefault: vi.fn() }

    await CharacterAuditLogApp.DEFAULT_OPTIONS.actions.exportCsv.call(app, fakeEvent, null)

    const [csvContent] = globalThis.foundry.utils.saveDataToFile.mock.calls[0]
    // The neutralized form must be present (leading single-quote before =)
    expect(csvContent).toContain("'=MALICIOUS()")
    // The raw unescaped form (comma immediately before =) must NOT appear anywhere
    expect(csvContent).not.toMatch(/,=MALICIOUS/)
  })

  it('formula injection: cells starting with +, -, @ are also neutralized', async () => {
    const actor = makeActor([
      { id: 'e1', timestamp: 100, type: 'skill.train', userName: '+cmd', xpDelta: -10, data: { skillName: 'Piloting', oldRank: 1, newRank: 2 } },
      { id: 'e2', timestamp: 200, type: 'skill.train', userName: '-cmd', xpDelta: -5, data: { skillName: 'Gunnery', oldRank: 0, newRank: 1 } },
      { id: 'e3', timestamp: 300, type: 'skill.train', userName: '@SUM', xpDelta: -5, data: { skillName: 'Gunnery', oldRank: 1, newRank: 2 } },
    ])

    const app = new CharacterAuditLogApp({ document: actor })
    const fakeEvent = { preventDefault: vi.fn() }

    await CharacterAuditLogApp.DEFAULT_OPTIONS.actions.exportCsv.call(app, fakeEvent, null)

    const [csvContent] = globalThis.foundry.utils.saveDataToFile.mock.calls[0]
    expect(csvContent).toContain("'+cmd")
    expect(csvContent).toContain("'-cmd")
    expect(csvContent).toContain("'@SUM")
  })
})

/* ============================================ */
/*  Segmented storage transparency              */
/* ============================================ */

describe('buildAuditLogEntries — segmented storage transparency', () => {
  beforeEach(async () => {
    setupFoundryMock({
      translations: {
        'SWERPG.AUDIT_LOG.FILTER.ALL': 'All',
        'SWERPG.AUDIT_LOG.FILTER.SKILLS': 'Skills',
        'SWERPG.AUDIT_LOG.FILTER.TALENTS': 'Talents',
        'SWERPG.AUDIT_LOG.FILTER.XP': 'XP',
        'SWERPG.AUDIT_LOG.FILTER.CHARACTERISTICS': 'Characteristics',
        'SWERPG.AUDIT_LOG.FILTER.DETAILS': 'Core choices',
        'SWERPG.AUDIT_LOG.FILTER.ADVANCEMENT': 'Advancement',
        'SWERPG.AUDIT_LOG.FILTER.PURCHASES': 'Purchases',
        'SWERPG.AUDIT_LOG.FILTER.SALES': 'Sales',
        'SWERPG.AUDIT_LOG.TYPE.SKILL_TRAIN': 'Skill purchase',
        'SWERPG.AUDIT_LOG.TYPE.XP_GRANT': 'XP granted',
        'SWERPG.AUDIT_LOG.TYPE.UNKNOWN': 'Unknown event',
        'SWERPG.AUDIT_LOG.NONE': 'None',
        'SWERPG.AUDIT_LOG.DESCRIPTION.SKILL_TRAIN': 'Skill {skill}: rank {oldRank} -> {newRank}',
        'SWERPG.AUDIT_LOG.DESCRIPTION.UNKNOWN': 'Unknown event ({type})',
        'SWERPG.AUDIT_LOG.UNKNOWN_SKILL': 'Unknown skill',
      },
    })

    globalThis.game.system.config = {
      CHARACTERISTICS: {},
    }
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    teardownFoundryMock()
  })

  it('reads from segmented format and returns the same view as legacy flat', async () => {
    const { buildAuditLogEntries } = await import('../../module/applications/character-audit-log.mjs')

    const entry1 = { id: 'e-1', timestamp: 100, type: 'skill.train', xpDelta: -10, data: { skillName: 'Piloting', oldRank: 1, newRank: 2 } }
    const entry2 = { id: 'e-2', timestamp: 200, type: 'xp.grant', xpDelta: 50, data: { amount: 50 } }

    // Legacy flat actor
    const legacyActor = {
      id: 'actor-legacy',
      name: 'Legacy',
      type: 'character',
      flags: { swerpg: { logs: [entry1, entry2] } },
      testUserPermission: vi.fn(() => true),
    }

    // Segmented actor — same entries split across two segments
    const segmentedActor = {
      id: 'actor-segmented',
      name: 'Segmented',
      type: 'character',
      flags: {
        swerpg: {
          auditLogIndex: { totalCount: 2, segmentCount: 2, segmentSize: 1 },
          auditLogSegs: [[entry1], [entry2]],
        },
      },
      testUserPermission: vi.fn(() => true),
    }

    const legacyResult = buildAuditLogEntries(legacyActor, 'all')
    const segmentedResult = buildAuditLogEntries(segmentedActor, 'all')

    expect(segmentedResult.totalCount).toBe(legacyResult.totalCount)
    expect(segmentedResult.filteredCount).toBe(legacyResult.filteredCount)
    // Entries should have the same IDs in the same order (anti-chronological after sort)
    expect(segmentedResult.entries.map((e) => e.id)).toEqual(legacyResult.entries.map((e) => e.id))
  })

  it('buildAuditLogEntries with segmented format applies family filter correctly', async () => {
    const { buildAuditLogEntries } = await import('../../module/applications/character-audit-log.mjs')

    const skillEntry = { id: 'skill-1', timestamp: 100, type: 'skill.train', xpDelta: -10, data: { skillName: 'Piloting', oldRank: 1, newRank: 2 } }
    const xpEntry = { id: 'xp-1', timestamp: 200, type: 'xp.grant', xpDelta: 50, data: { amount: 50 } }

    const actor = {
      id: 'actor-1',
      name: 'Test',
      type: 'character',
      flags: {
        swerpg: {
          auditLogIndex: { totalCount: 2, segmentCount: 1, segmentSize: 100 },
          auditLogSegs: [[skillEntry, xpEntry]],
        },
      },
      testUserPermission: vi.fn(() => true),
    }

    const { entries: skillEntries } = buildAuditLogEntries(actor, 'skills')
    expect(skillEntries).toHaveLength(1)
    expect(skillEntries[0].id).toBe('skill-1')

    const { entries: xpEntries } = buildAuditLogEntries(actor, 'xp')
    expect(xpEntries).toHaveLength(1)
    expect(xpEntries[0].id).toBe('xp-1')
  })
})

describe('buildCsvContent — segmented storage transparency', () => {
  beforeEach(async () => {
    setupFoundryMock({
      translations: {
        'SWERPG.AUDIT_LOG.TYPE.SKILL_TRAIN': 'Skill purchase',
        'SWERPG.AUDIT_LOG.DESCRIPTION.SKILL_TRAIN': 'Skill {skill}: rank {oldRank} -> {newRank}',
        'SWERPG.AUDIT_LOG.UNKNOWN_SKILL': 'Unknown skill',
        'SWERPG.AUDIT_LOG.TYPE.UNKNOWN': 'Unknown event',
        'SWERPG.AUDIT_LOG.DESCRIPTION.UNKNOWN': 'Unknown event ({type})',
      },
    })

    globalThis.game.system.config = {
      CHARACTERISTICS: {},
    }

    globalThis.game.users = { get: vi.fn(() => null) }
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    teardownFoundryMock()
  })

  it('produces the same CSV row count from segmented format as from legacy flat', async () => {
    const { buildCsvContent } = await import('../../module/applications/character-audit-log.mjs')

    const entry = { id: 'e-1', timestamp: 1000, type: 'skill.train', xpDelta: -10, userName: 'Player', data: { skillName: 'Piloting', oldRank: 1, newRank: 2 } }

    const legacyActor = {
      name: 'Tester',
      flags: { swerpg: { logs: [entry] } },
      ownership: {},
    }

    const segmentedActor = {
      name: 'Tester',
      flags: {
        swerpg: {
          auditLogIndex: { totalCount: 1, segmentCount: 1, segmentSize: 100 },
          auditLogSegs: [[entry]],
        },
      },
      ownership: {},
    }

    const legacyCsv = buildCsvContent(legacyActor)
    const segmentedCsv = buildCsvContent(segmentedActor)

    // Both should have header + 1 data row
    expect(legacyCsv.split('\n')).toHaveLength(2)
    expect(segmentedCsv.split('\n')).toHaveLength(2)

    // Data rows should be identical
    const legacyRows = legacyCsv.split('\n')
    const segmentedRows = segmentedCsv.split('\n')
    expect(legacyRows[0]).toBe(segmentedRows[0]) // header
    expect(legacyRows[1]).toBe(segmentedRows[1]) // data row
  })

  it('CSV export over multiple segments produces all entries', async () => {
    const { buildCsvContent } = await import('../../module/applications/character-audit-log.mjs')

    const entries = Array.from({ length: 5 }, (_, i) => ({
      id: `e-${i}`,
      timestamp: 1000 + i,
      type: 'skill.train',
      xpDelta: -10,
      userName: 'Player',
      data: { skillName: 'Piloting', oldRank: i, newRank: i + 1 },
    }))

    // Split into 3 segments: [2, 2, 1]
    const actor = {
      name: 'Tester',
      flags: {
        swerpg: {
          auditLogIndex: { totalCount: 5, segmentCount: 3, segmentSize: 2 },
          auditLogSegs: [entries.slice(0, 2), entries.slice(2, 4), entries.slice(4)],
        },
      },
      ownership: {},
    }

    const csv = buildCsvContent(actor)
    const rows = csv.split('\n')
    // header + 5 data rows
    expect(rows).toHaveLength(6)
  })
})
