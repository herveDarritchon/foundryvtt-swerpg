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
