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

    const entries = buildAuditLogEntries(actor, 'all')
    expect(entries).toHaveLength(2)
    expect(entries[0].id).toBe('entry-2')
    expect(entries[0].description).toBe('Removed specialization Bodyguard')
    expect(entries[1].formattedXpDelta).toBe('-10 XP')
    expect(entries[1].xpDeltaClass).toBe('is-spend')
    expect(entries[1].formattedDelta).toBe('-10 XP')
    expect(entries[1].deltaClass).toBe('is-spend')
    expect(entries[1].hasDelta).toBe(true)

    const filtered = buildAuditLogEntries(actor, 'skills')
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

    const entries = buildAuditLogEntries(actor, 'talents')
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

    const entries = buildAuditLogEntries(actor, 'talents')
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

    const entries = buildAuditLogEntries(actor, 'all')
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

    const entries = buildAuditLogEntries(actor, 'purchases')
    expect(entries).toHaveLength(1)
    expect(entries[0].family).toBe('purchases')
  })

  it('item.purchase is excluded from talents filter', () => {
    const actor = createActorWithLog([
      { id: 'p1', timestamp: 100, type: 'item.purchase', xpDelta: 0, data: { itemName: 'Blaster', itemType: 'weapon', price: 100, quantity: 1 } },
    ])

    const entries = buildAuditLogEntries(actor, 'talents')
    expect(entries).toHaveLength(0)
  })

  it('item.purchase is included in all filter', () => {
    const actor = createActorWithLog([
      { id: 'p1', timestamp: 100, type: 'item.purchase', xpDelta: 0, data: { itemName: 'Blaster', itemType: 'weapon', price: 100, quantity: 1 } },
    ])

    const entries = buildAuditLogEntries(actor, 'all')
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

    const entries = buildAuditLogEntries(actor, 'all')
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

    const entries = buildAuditLogEntries(actor, 'all')
    expect(entries[0].formattedDelta).toBe('-150 cr')
    expect(entries[0].deltaClass).toBe('is-spend')
    expect(entries[0].hasDelta).toBe(true)
    expect(entries[0].formattedDelta).not.toContain('XP')
  })

  it('item.purchase with zero creditDelta has is-neutral class and hasDelta false', () => {
    const actor = createActorWithLog([
      { id: 'p1', timestamp: 100, type: 'item.purchase', xpDelta: 0, creditDelta: 0, data: { itemName: 'Free Item', itemType: 'gear', price: 0, quantity: 1 } },
    ])

    const entries = buildAuditLogEntries(actor, 'all')
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

    const entries = buildAuditLogEntries(actor, 'all')
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
    const entries = buildAuditLogEntries(actor, 'purchases')
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
})
