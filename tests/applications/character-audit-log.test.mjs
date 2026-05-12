import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setupFoundryMock, teardownFoundryMock } from '../helpers/mock-foundry.mjs'

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

    const filtered = buildAuditLogEntries(actor, 'skills')
    expect(filtered).toHaveLength(1)
    expect(filtered[0].id).toBe('entry-1')
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

    ;({
      escapeCsvCell,
      buildCsvContent,
      buildExportFilename,
      getPrimaryOwnerName,
    } = await import('../../module/applications/character-audit-log.mjs'))
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
      expect(lines[0]).toBe('timestamp,date,userName,type,typeLabel,description,xpDelta,actorName,playerName')
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
  })
})
