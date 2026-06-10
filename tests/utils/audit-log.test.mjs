import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { setupFoundryMock, teardownFoundryMock } from '../helpers/mock-foundry.mjs'

vi.mock('../../module/utils/logger.mjs', () => {
  const logger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    isDebugEnabled: vi.fn(() => false),
  }
  return { logger }
})

const translations = {
  'SWERPG.AUDIT.WRITE_FAILED': 'Audit log write failed for actor "{actor}". Check the console for details.',
}

beforeEach(() => {
  setupFoundryMock({ translations })

  globalThis.Hooks = {
    on: vi.fn(),
    once: vi.fn(),
    off: vi.fn(),
    call: vi.fn(),
    callAll: vi.fn(),
  }

  globalThis.ui = {
    notifications: {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
    },
  }

  globalThis.game = {
    ...globalThis.game,
    userId: 'gm-1',
    user: { id: 'gm-1', name: 'Game Master', isGM: true },
    i18n: {
      localize: (key) => key,
      format: vi.fn((key, data) => {
        if (key === 'SWERPG.AUDIT.WRITE_FAILED') {
          return `Audit log write failed for actor "${data.actor}". Check the console for details.`
        }
        return key
      }),
    },
    settings: {
      get: vi.fn((namespace, key) => {
        if (namespace === 'swerpg' && key === 'auditLogMaxEntries') return 500
        return undefined
      }),
    },
  }

  globalThis.CONST = {}

  globalThis.ChatMessage = {
    create: vi.fn().mockResolvedValue(undefined),
    getWhisperRecipients: vi.fn(() => ['gm-1']),
    getSpeaker: vi.fn(() => ({ actor: 'actor-001' })),
  }

  globalThis.foundry.applications.handlebars = {
    renderTemplate: vi.fn().mockResolvedValue('<div class="swerpg chat-message audit-log-warning">mock</div>'),
  }
})

afterEach(() => {
  teardownFoundryMock()
  vi.restoreAllMocks()
})

/**
 * Extract the flat list of written audit log entries from an actor.update() call argument.
 * Supports the segmented format (auditLogSegs) produced by the new writeLogEntries implementation.
 * @param {object} updateArg  The first argument passed to actor.update()
 * @returns {Array<object>}
 */
function getWrittenLogs(updateArg) {
  const segs = updateArg['flags.swerpg.auditLogSegs']
  if (Array.isArray(segs)) {
    return segs.flat()
  }
  // Fallback for any test that still expects legacy format
  return updateArg['flags.swerpg.logs'] ?? []
}

/**
 *
 * @param overrides
 */
function makeCharacterActor(overrides = {}) {
  return {
    type: 'character',
    id: 'actor-001',
    uuid: 'Actor.actor-001',
    name: 'Test Character',
    _source: {
      system: {
        skills: {},
        characteristics: {},
        progression: { totalXP: 0, spentXP: 0 },
        details: {},
        advancement: {},
      },
      flags: {},
    },
    update: vi.fn(),
    ...overrides,
  }
}

/* ============================================ */
/*  isOnlyAuditChange                           */
/* ============================================ */

describe('isOnlyAuditChange', () => {
  test('returns true when only flags.swerpg.logs is in diff', async () => {
    const { isOnlyAuditChange } = await import('../../module/utils/audit-log.mjs')
    expect(isOnlyAuditChange({ flags: { swerpg: { logs: [{ timestamp: 1 }] } } })).toBe(true)
  })

  test('returns true for flat dot-notation key', async () => {
    const { isOnlyAuditChange } = await import('../../module/utils/audit-log.mjs')
    expect(isOnlyAuditChange({ 'flags.swerpg.logs': [{ timestamp: 1 }] })).toBe(true)
  })

  test('returns false when other fields are present', async () => {
    const { isOnlyAuditChange } = await import('../../module/utils/audit-log.mjs')
    const changes = { flags: { swerpg: { logs: [] } }, system: { skills: { Athletics: 1 } } }
    expect(isOnlyAuditChange(changes)).toBe(false)
  })

  test('returns false when changes is empty', async () => {
    const { isOnlyAuditChange } = await import('../../module/utils/audit-log.mjs')
    expect(isOnlyAuditChange({})).toBe(false)
  })
})

/* ============================================ */
/*  cloneValue                                  */
/* ============================================ */

describe('cloneValue', () => {
  test('deep clones plain objects', async () => {
    const { cloneValue } = await import('../../module/utils/audit-log.mjs')
    const original = { rank: 2, label: 'Test' }
    const cloned = cloneValue(original)
    expect(cloned).toEqual(original)
    expect(cloned).not.toBe(original)
  })

  test('returns undefined for undefined', async () => {
    const { cloneValue } = await import('../../module/utils/audit-log.mjs')
    expect(cloneValue(undefined)).toBeUndefined()
  })

  test('deep clones nested objects', async () => {
    const { cloneValue } = await import('../../module/utils/audit-log.mjs')
    const original = { skills: { Athletics: { rank: 2 } } }
    const cloned = cloneValue(original)
    cloned.skills.Athletics.rank = 99
    expect(original.skills.Athletics.rank).toBe(2)
  })
})

/* ============================================ */
/*  snapshotOldState                            */
/* ============================================ */

describe('snapshotOldState', () => {
  test('extracts system paths from source matching changes', async () => {
    const { snapshotOldState } = await import('../../module/utils/audit-log.mjs')
    const source = {
      system: {
        skills: { Athletics: { rank: 2 } },
        characteristics: { Brawn: 3 },
      },
    }
    const changes = { system: { skills: { Athletics: { rank: 3 } } } }
    const state = snapshotOldState(source, changes)
    expect(state).toEqual({ system: { skills: { Athletics: { rank: 2 } } } })
  })

  test('deep clones values to prevent mutation', async () => {
    const { snapshotOldState } = await import('../../module/utils/audit-log.mjs')
    const source = {
      system: {
        skills: { Athletics: { rank: 2, label: 'Athletics' } },
      },
    }
    const changes = { system: { skills: { Athletics: { rank: 3 } } } }
    const state = snapshotOldState(source, changes)
    state.system.skills.Athletics.rank = 99
    expect(source.system.skills.Athletics.rank).toBe(2)
  })

  test('returns empty object when changes have no system paths', async () => {
    const { snapshotOldState } = await import('../../module/utils/audit-log.mjs')
    const source = { flags: {} }
    const changes = { flags: { swerpg: { logs: [] } } }
    expect(snapshotOldState(source, changes)).toEqual({})
  })

  test('captures the parent collection for deletion paths (-=)', async () => {
    const { snapshotOldState } = await import('../../module/utils/audit-log.mjs')
    const source = { system: { skills: { Athletics: { rank: 2 } } } }
    const changes = { 'system.skills.-=Athletics': null }
    const state = snapshotOldState(source, changes)
    expect(state).toEqual({
      system: {
        skills: {
          Athletics: { rank: 2 },
        },
      },
    })
  })

  test('extracts multiple modified paths', async () => {
    const { snapshotOldState } = await import('../../module/utils/audit-log.mjs')
    const source = {
      system: {
        skills: { Athletics: { rank: 2 }, Lore: { rank: 1 } },
        progression: { totalXP: 100, spentXP: 50 },
      },
    }
    const changes = { system: { skills: { Athletics: { rank: 3 } }, progression: { spentXP: 60 } } }
    const state = snapshotOldState(source, changes)
    expect(state).toEqual({
      system: {
        skills: { Athletics: { rank: 2 } },
        progression: { spentXP: 50 },
      },
    })
  })
})

/* ============================================ */
/*  isDeletionPath                              */
/* ============================================ */

describe('isDeletionPath', () => {
  test('returns true for paths with -=', async () => {
    const { isDeletionPath } = await import('../../module/utils/audit-log.mjs')
    expect(isDeletionPath('system.skills.-=Athletics')).toBe(true)
  })

  test('returns false for normal paths', async () => {
    const { isDeletionPath } = await import('../../module/utils/audit-log.mjs')
    expect(isDeletionPath('system.skills.Athletics.rank')).toBe(false)
  })
})

/* ============================================ */
/*  Pending queue                               */
/* ============================================ */

describe('pending queue', () => {
  test('pushPendingEntry and shiftPendingEntry work as FIFO', async () => {
    const { pushPendingEntry, shiftPendingEntry, flushPending } = await import('../../module/utils/audit-log.mjs')
    flushPending()

    const actor = makeCharacterActor()
    const userId = 'user-1'
    pushPendingEntry(actor, userId, { changes: { x: 1 }, timestamp: 100 })
    pushPendingEntry(actor, userId, { changes: { x: 2 }, timestamp: 200 })

    const first = shiftPendingEntry(actor, userId)
    expect(first.changes).toEqual({ x: 1 })
    const second = shiftPendingEntry(actor, userId)
    expect(second.changes).toEqual({ x: 2 })
    expect(shiftPendingEntry(actor, userId)).toBeUndefined()
    flushPending()
  })

  test('popPendingEntryByOpId retrieves entry by opId regardless of insertion order', async () => {
    const { pushPendingEntry, popPendingEntryByOpId, countPendingEntries, flushPending } = await import('../../module/utils/audit-log.mjs')
    flushPending()

    const actor = makeCharacterActor()
    const userId = 'user-1'
    pushPendingEntry(actor, userId, { opId: 'op-A', changes: { x: 1 }, timestamp: 100 })
    pushPendingEntry(actor, userId, { opId: 'op-B', changes: { x: 2 }, timestamp: 200 })
    pushPendingEntry(actor, userId, { opId: 'op-C', changes: { x: 3 }, timestamp: 300 })

    // Retrieve the middle entry by opId — simulates op-A being orphaned (rejected update)
    const retrieved = popPendingEntryByOpId(actor, userId, 'op-B')
    expect(retrieved.changes).toEqual({ x: 2 })
    expect(retrieved.opId).toBe('op-B')

    // op-A and op-C must remain in the queue
    expect(countPendingEntries()).toBe(2)
    flushPending()
  })

  test('popPendingEntryByOpId returns undefined when opId does not match any entry', async () => {
    const { pushPendingEntry, popPendingEntryByOpId, flushPending } = await import('../../module/utils/audit-log.mjs')
    flushPending()

    const actor = makeCharacterActor()
    const userId = 'user-1'
    pushPendingEntry(actor, userId, { opId: 'op-A', changes: { x: 1 }, timestamp: 100 })

    expect(popPendingEntryByOpId(actor, userId, 'op-MISSING')).toBeUndefined()
    flushPending()
  })

  test('popPendingEntryByOpId removes the queue key when the last entry is consumed', async () => {
    const { pushPendingEntry, popPendingEntryByOpId, countPendingEntries, flushPending } = await import('../../module/utils/audit-log.mjs')
    flushPending()

    const actor = makeCharacterActor()
    const userId = 'user-1'
    pushPendingEntry(actor, userId, { opId: 'op-solo', changes: { x: 1 }, timestamp: 100 })

    popPendingEntryByOpId(actor, userId, 'op-solo')
    expect(countPendingEntries()).toBe(0)
    flushPending()
  })
})

/* ============================================ */
/*  writeLogEntries max size / FIFO             */
/* ============================================ */

describe('writeLogEntries max size', () => {
  test('evicts oldest entries when threshold is exceeded', async () => {
    const { writeLogEntries } = await import('../../module/utils/audit-log.mjs')

    const existingLogs = [
      { type: 'oldest', timestamp: 1 },
      { type: 'old', timestamp: 2 },
      { type: 'recent', timestamp: 3 },
    ]

    const actor = makeCharacterActor({ flags: { swerpg: { logs: existingLogs } } })

    globalThis.foundry.utils.deepClone = vi.fn((o) => structuredClone(o))

    globalThis.game.settings.get = vi.fn((namespace, key) => {
      if (namespace === 'swerpg' && key === 'auditLogMaxEntries') return 3
      return undefined
    })

    await writeLogEntries(actor, [
      { type: 'new1', timestamp: 4 },
      { type: 'new2', timestamp: 5 },
    ])

    expect(actor.update).toHaveBeenCalledTimes(1)
    const updateArg = actor.update.mock.calls[0][0]
    const logs = getWrittenLogs(updateArg)
    expect(logs).toHaveLength(3)
    expect(logs[0].type).toBe('recent')
    expect(logs[1].type).toBe('new1')
    expect(logs[2].type).toBe('new2')
  })

  test('does nothing when threshold is not exceeded', async () => {
    const { writeLogEntries } = await import('../../module/utils/audit-log.mjs')

    const existingLogs = [
      { type: 'a', timestamp: 1 },
      { type: 'b', timestamp: 2 },
    ]

    const actor = makeCharacterActor({ flags: { swerpg: { logs: existingLogs } } })

    globalThis.foundry.utils.deepClone = vi.fn((o) => structuredClone(o))

    globalThis.game.settings.get = vi.fn((namespace, key) => {
      if (namespace === 'swerpg' && key === 'auditLogMaxEntries') return 5
      return undefined
    })

    await writeLogEntries(actor, [{ type: 'c', timestamp: 3 }])

    expect(actor.update).toHaveBeenCalledTimes(1)
    const updateArg = actor.update.mock.calls[0][0]
    const logs = getWrittenLogs(updateArg)
    expect(logs).toHaveLength(3)
  })

  test('enforces low limit (100)', async () => {
    const { writeLogEntries } = await import('../../module/utils/audit-log.mjs')

    const existingLogs = Array.from({ length: 150 }, (_, i) => ({ type: `old-${i}`, idx: i }))
    const actor = makeCharacterActor({ flags: { swerpg: { logs: existingLogs } } })

    globalThis.foundry.utils.deepClone = vi.fn((o) => structuredClone(o))

    globalThis.game.settings.get = vi.fn((namespace, key) => {
      if (namespace === 'swerpg' && key === 'auditLogMaxEntries') return 100
      return undefined
    })

    await writeLogEntries(
      actor,
      Array.from({ length: 10 }, (_, i) => ({ type: `new-${i}`, idx: i })),
    )

    expect(actor.update).toHaveBeenCalledTimes(1)
    const updateArg = actor.update.mock.calls[0][0]
    const logs = getWrittenLogs(updateArg)
    expect(logs).toHaveLength(100)
  })

  test('reads setting dynamically on each call', async () => {
    const { writeLogEntries } = await import('../../module/utils/audit-log.mjs')

    const actor = makeCharacterActor()
    globalThis.foundry.utils.deepClone = vi.fn((o) => structuredClone(o))

    await writeLogEntries(actor, [{ type: 'entry' }])

    expect(globalThis.game.settings.get).toHaveBeenCalledWith('swerpg', 'auditLogMaxEntries')
  })

  test('falls back to 500 when game.settings.get throws', async () => {
    const { writeLogEntries } = await import('../../module/utils/audit-log.mjs')

    const existingLogs = Array.from({ length: 600 }, (_, i) => ({ type: `e-${i}` }))
    const actor = makeCharacterActor({ flags: { swerpg: { logs: existingLogs } } })

    globalThis.foundry.utils.deepClone = vi.fn((o) => structuredClone(o))

    globalThis.game.settings.get = vi.fn(() => {
      throw new Error('settings not ready')
    })

    await writeLogEntries(actor, [{ type: 'new' }])

    expect(actor.update).toHaveBeenCalledTimes(1)
    const updateArg = actor.update.mock.calls[0][0]
    const logs = getWrittenLogs(updateArg)
    expect(logs).toHaveLength(500)
  })

  test('existing tests still pass without hitting the limit', async () => {
    const { writeLogEntries } = await import('../../module/utils/audit-log.mjs')
    const actor = makeCharacterActor()
    globalThis.foundry.utils.deepClone = vi.fn((o) => structuredClone(o))

    const entries = [
      { type: 'skill.updated', path: 'system.skills.Athletics.rank', before: 2, after: 3 },
      { type: 'skill.updated', path: 'system.skills.Lore.rank', before: 1, after: 2 },
    ]

    await writeLogEntries(actor, entries)
    expect(actor.update).toHaveBeenCalledTimes(1)

    const updateArg = actor.update.mock.calls[0][0]
    expect(getWrittenLogs(updateArg)).toHaveLength(2)
  })
})

/* ============================================ */
/*  evictOldestIfNeeded                         */
/* ============================================ */

describe('evictOldestIfNeeded', () => {
  test('evicts oldest entries when overflow occurs', async () => {
    const { evictOldestIfNeeded, pushPendingEntry, countPendingEntries, flushPending } = await import('../../module/utils/audit-log.mjs')
    flushPending()

    const actor = makeCharacterActor()
    for (let i = 0; i < 50; i++) {
      pushPendingEntry(actor, 'user-1', { changes: { idx: i }, timestamp: i })
    }

    expect(countPendingEntries()).toBe(50)
    evictOldestIfNeeded(1)
    expect(countPendingEntries()).toBe(49)
    flushPending()
  })

  test('does nothing when under limit', async () => {
    const { evictOldestIfNeeded, pushPendingEntry, countPendingEntries, flushPending } = await import('../../module/utils/audit-log.mjs')
    flushPending()

    const actor = makeCharacterActor()
    for (let i = 0; i < 10; i++) {
      pushPendingEntry(actor, 'user-1', { changes: { idx: i }, timestamp: i })
    }

    evictOldestIfNeeded(1)
    expect(countPendingEntries()).toBeLessThanOrEqual(50)
    flushPending()
  })
})

/* ============================================ */
/*  preUpdateActor handler                      */
/* ============================================ */

describe('onPreUpdateActor', () => {
  test('skips non-character actors', async () => {
    const { onPreUpdateActor } = await import('../../module/utils/audit-log.mjs')
    const npc = { type: 'npc', uuid: 'Actor.npc-001', _source: {} }
    expect(() => onPreUpdateActor(npc, { system: { skills: { Athletics: 1 } } }, {}, 'gm-1')).not.toThrow()
  })

  test('skips when changes are only audit logs', async () => {
    const { onPreUpdateActor } = await import('../../module/utils/audit-log.mjs')
    const actor = makeCharacterActor()
    const changes = { flags: { swerpg: { logs: [{ timestamp: 1 }] } } }
    expect(() => onPreUpdateActor(actor, changes, {}, 'gm-1')).not.toThrow()
  })

  test('skips when swerpgAuditLog option is false', async () => {
    const { onPreUpdateActor } = await import('../../module/utils/audit-log.mjs')
    const actor = makeCharacterActor()
    const changes = { system: { skills: { Athletics: { rank: 3 } } } }
    expect(() => onPreUpdateActor(actor, changes, { swerpgAuditLog: false }, 'gm-1')).not.toThrow()
  })

  test('captures old state snapshot for character skill changes', async () => {
    const { onPreUpdateActor } = await import('../../module/utils/audit-log.mjs')
    const actor = makeCharacterActor({
      _source: {
        system: { skills: { Athletics: { rank: 2 }, Lore: { rank: 1 } }, characteristics: {}, progression: {}, details: {}, advancement: {} },
        flags: {},
      },
    })
    const changes = { system: { skills: { Athletics: { rank: 3 } } } }
    expect(() => onPreUpdateActor(actor, changes, {}, 'gm-1')).not.toThrow()
  })
})

/* ============================================ */
/*  updateActor handler                         */
/* ============================================ */

describe('onUpdateActor', () => {
  test('skips non-character actors', async () => {
    const { onUpdateActor } = await import('../../module/utils/audit-log.mjs')
    const npc = { type: 'npc', uuid: 'Actor.npc-001', _source: {} }
    expect(() => onUpdateActor(npc, { system: { skills: {} } }, {}, 'gm-1')).not.toThrow()
  })

  test('skips when swerpgAuditLog option is false', async () => {
    const { onUpdateActor } = await import('../../module/utils/audit-log.mjs')
    const actor = makeCharacterActor()
    const changes = { system: { skills: { Athletics: { rank: 3 } } } }
    expect(() => onUpdateActor(actor, changes, { swerpgAuditLog: false }, 'gm-1')).not.toThrow()
  })

  test('does nothing when no pending entry exists', async () => {
    const { onUpdateActor } = await import('../../module/utils/audit-log.mjs')
    const actor = makeCharacterActor()
    expect(() => onUpdateActor(actor, { system: { skills: { Athletics: { rank: 3 } } } }, {}, 'gm-1')).not.toThrow()
  })

  test('ignores expired pending entries', async () => {
    const { onPreUpdateActor, onUpdateActor, flushPending } = await import('../../module/utils/audit-log.mjs')
    flushPending()

    const actor = makeCharacterActor({
      _source: {
        system: { skills: { Athletics: { rank: 2 } }, characteristics: {}, progression: {}, details: {}, advancement: {} },
        flags: {},
      },
    })

    onPreUpdateActor(actor, { system: { skills: { Athletics: { rank: 3 } } } }, {}, 'gm-1')

    const expiredTimestamp = Date.now() - 60000
    const { pushPendingEntry } = await import('../../module/utils/audit-log.mjs')
    flushPending()
    pushPendingEntry(actor, 'gm-1', {
      oldState: {},
      changes: {},
      userId: 'gm-1',
      timestamp: expiredTimestamp,
    })

    expect(() => onUpdateActor(actor, { system: { skills: { Athletics: { rank: 3 } } } }, {}, 'gm-1')).not.toThrow()
    flushPending()
  })
})

/* ============================================ */
/*  writeLogEntries                             */
/* ============================================ */

describe('writeLogEntries', () => {
  test('writes multiple entries in a single actor.update()', async () => {
    const { writeLogEntries } = await import('../../module/utils/audit-log.mjs')
    const actor = makeCharacterActor()
    globalThis.foundry.utils.deepClone = vi.fn((o) => structuredClone(o))

    const entries = [
      { type: 'skill.updated', path: 'system.skills.Athletics.rank', before: 2, after: 3 },
      { type: 'skill.updated', path: 'system.skills.Lore.rank', before: 1, after: 2 },
    ]

    await writeLogEntries(actor, entries)
    expect(actor.update).toHaveBeenCalledTimes(1)

    const updateArg = actor.update.mock.calls[0][0]
    expect(getWrittenLogs(updateArg)).toHaveLength(2)
  })

  test('does nothing when entries array is empty', async () => {
    const { writeLogEntries } = await import('../../module/utils/audit-log.mjs')
    const actor = makeCharacterActor()
    await writeLogEntries(actor, [])
    expect(actor.update).not.toHaveBeenCalled()
  })

  test('passes swerpgAuditLog: false option to prevent recursion', async () => {
    const { writeLogEntries } = await import('../../module/utils/audit-log.mjs')
    const actor = makeCharacterActor()
    await writeLogEntries(actor, [{ type: 'test' }])
    expect(actor.update).toHaveBeenCalledWith(expect.any(Object), { swerpgAuditLog: false })
  })
})

/* ============================================ */
/*  onCreateItem                                */
/* ============================================ */

describe('onCreateItem', () => {
  /**
   *
   * @param overrides
   */
  function makeCharacterActor(overrides = {}) {
    return {
      type: 'character',
      id: 'actor-001',
      uuid: 'Actor.actor-001',
      name: 'Test Character',
      _source: {
        system: {
          skills: {},
          characteristics: {},
          progression: { totalXP: 0, spentXP: 0 },
          details: {},
          advancement: {},
        },
        flags: {},
      },
      system: {
        progression: {
          experience: { spent: 0, gained: 0, available: 0, total: 0 },
          freeSkillRanks: {
            career: { spent: 0, gained: 0, available: 0 },
            specialization: { spent: 0, gained: 0, available: 0 },
          },
        },
      },
      update: vi.fn(),
      ...overrides,
    }
  }

  /**
   *
   * @param actor
   * @param overrides
   */
  function makeTalentItem(actor, overrides = {}) {
    return {
      type: 'talent',
      id: 'talent-001',
      name: 'Test Talent',
      parent: actor,
      system: {
        cost: 10,
        ranks: 1,
      },
      ...overrides,
    }
  }

  test('creates talent.purchase entry for talent on character', async () => {
    const { onCreateItem } = await import('../../module/utils/audit-log.mjs')
    globalThis.foundry.utils.deepClone = vi.fn((o) => structuredClone(o))

    const actor = makeCharacterActor()
    const item = makeTalentItem(actor)

    await onCreateItem(item, {}, {}, 'gm-1')

    expect(actor.update).toHaveBeenCalledTimes(1)
    const updateArg = actor.update.mock.calls[0][0]
    const logs = getWrittenLogs(updateArg)
    expect(logs).toHaveLength(1)
    expect(logs[0]).toMatchObject({
      type: 'talent.purchase',
      data: {
        talentId: 'talent-001',
        talentName: 'Test Talent',
        cost: 10,
        ranks: 1,
      },
      xpDelta: -10,
      userId: 'gm-1',
    })
  })

  test('uses default cost and ranks when system values are missing', async () => {
    const { onCreateItem } = await import('../../module/utils/audit-log.mjs')
    const { TALENT_PURCHASE_DEFAULT_COST, TALENT_PURCHASE_DEFAULT_RANKS } = await import('../../module/config/progression.mjs')
    globalThis.foundry.utils.deepClone = vi.fn((o) => structuredClone(o))

    const actor = makeCharacterActor()
    const item = makeTalentItem(actor, { system: {} })

    await onCreateItem(item, {}, {}, 'gm-1')

    expect(actor.update).toHaveBeenCalledTimes(1)
    const updateArg = actor.update.mock.calls[0][0]
    const logs = getWrittenLogs(updateArg)
    expect(logs[0].data.cost).toBe(TALENT_PURCHASE_DEFAULT_COST)
    expect(logs[0].data.ranks).toBe(TALENT_PURCHASE_DEFAULT_RANKS)
    expect(logs[0].xpDelta).toBe(-TALENT_PURCHASE_DEFAULT_COST)
  })

  test('ignores non-talent items', async () => {
    const { onCreateItem } = await import('../../module/utils/audit-log.mjs')
    const actor = makeCharacterActor()
    const item = makeTalentItem(actor, { type: 'weapon' })

    await onCreateItem(item, {}, {}, 'gm-1')

    expect(actor.update).not.toHaveBeenCalled()
  })

  test('ignores items on non-character actors', async () => {
    const { onCreateItem } = await import('../../module/utils/audit-log.mjs')
    const npc = { type: 'npc', id: 'npc-001', name: 'NPC', update: vi.fn(), system: {} }
    const item = makeTalentItem(npc)

    await onCreateItem(item, {}, {}, 'gm-1')

    expect(npc.update).not.toHaveBeenCalled()
  })

  test('handles null parent gracefully', async () => {
    const { onCreateItem } = await import('../../module/utils/audit-log.mjs')
    const item = makeTalentItem(null)

    expect(() => onCreateItem(item, {}, {}, 'gm-1')).not.toThrow()
  })

  test('includes valid snapshot fields', async () => {
    const { onCreateItem } = await import('../../module/utils/audit-log.mjs')
    globalThis.foundry.utils.deepClone = vi.fn((o) => structuredClone(o))

    const actor = makeCharacterActor({
      system: {
        progression: {
          experience: { spent: 50, gained: 200, available: 150, total: 200 },
          freeSkillRanks: {
            career: { spent: 2, gained: 5, available: 3 },
            specialization: { spent: 0, gained: 3, available: 3 },
          },
        },
      },
    })
    const item = makeTalentItem(actor)

    await onCreateItem(item, {}, {}, 'gm-1')

    const updateArg = actor.update.mock.calls[0][0]
    const snapshot = getWrittenLogs(updateArg)[0].snapshot
    expect(snapshot).toMatchObject({
      xpAvailable: 150,
      totalXpSpent: 50,
      totalXpGained: 200,
      careerFreeAvailable: 3,
      specializationFreeAvailable: 3,
    })
  })
})

/* ============================================ */
/*  registerAuditLogHooks                       */
/* ============================================ */

describe('registerAuditLogHooks', () => {
  test('registers six hooks via Hooks.on', async () => {
    const { registerAuditLogHooks } = await import('../../module/utils/audit-log.mjs')
    registerAuditLogHooks()
    expect(globalThis.Hooks.on).toHaveBeenCalledTimes(6)
    expect(globalThis.Hooks.on).toHaveBeenCalledWith('preUpdateActor', expect.any(Function))
    expect(globalThis.Hooks.on).toHaveBeenCalledWith('updateActor', expect.any(Function))
    expect(globalThis.Hooks.on).toHaveBeenCalledWith('createItem', expect.any(Function))
    expect(globalThis.Hooks.on).toHaveBeenCalledWith('deleteItem', expect.any(Function))
    expect(globalThis.Hooks.on).toHaveBeenCalledWith('preUpdateItem', expect.any(Function))
    expect(globalThis.Hooks.on).toHaveBeenCalledWith('updateItem', expect.any(Function))
  })
})

/* ============================================ */
/*  handleWriteError                            */
/* ============================================ */

describe('handleWriteError', () => {
  test('calls logger.error with actor info', async () => {
    const { handleWriteError } = await import('../../module/utils/audit-log.mjs')
    const { logger } = await import('../../module/utils/logger.mjs')
    const actor = makeCharacterActor()
    const err = new Error('DB timeout')

    await handleWriteError(actor, err)

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('[AuditLog] Write failed for actor "Test Character"'), err)
  })

  test('calls ui.notifications.warn with i18n key', async () => {
    const { handleWriteError } = await import('../../module/utils/audit-log.mjs')
    const actor = makeCharacterActor()
    const err = new Error('DB timeout')

    await handleWriteError(actor, err)

    expect(globalThis.ui.notifications.warn).toHaveBeenCalledWith(expect.stringContaining('Audit log write failed for actor'))
  })

  test('sends ChatMessage whisper to GM when user is GM', async () => {
    const { handleWriteError } = await import('../../module/utils/audit-log.mjs')
    const actor = makeCharacterActor()
    const err = new Error('DB timeout')

    await handleWriteError(actor, err)

    expect(globalThis.ChatMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        whisper: ['gm-1'],
      }),
    )
  })

  test('does NOT send ChatMessage when user is not GM', async () => {
    globalThis.game.user = { id: 'player-1', name: 'Player One', isGM: false }
    const { handleWriteError } = await import('../../module/utils/audit-log.mjs')
    const actor = makeCharacterActor()
    const err = new Error('DB timeout')

    await handleWriteError(actor, err)

    expect(globalThis.ChatMessage.create).not.toHaveBeenCalled()
  })

  test('catches ChatMessage.create failure without propagating', async () => {
    globalThis.ChatMessage.create = vi.fn().mockRejectedValue(new Error('Chat failed'))
    const { handleWriteError } = await import('../../module/utils/audit-log.mjs')
    const { logger } = await import('../../module/utils/logger.mjs')
    const actor = makeCharacterActor()
    const err = new Error('DB timeout')

    await expect(handleWriteError(actor, err)).resolves.toBeUndefined()
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('[AuditLog] Failed to send GM whisper'), expect.any(Error))
  })
})

/* ============================================ */
/*  Retry                                       */
/* ============================================ */

describe('writeLogEntries retry', () => {
  test('retries on first failure and succeeds on second attempt', async () => {
    const { writeLogEntries } = await import('../../module/utils/audit-log.mjs')
    const actor = makeCharacterActor()

    actor.update.mockRejectedValueOnce(new Error('First fail')).mockResolvedValueOnce(undefined)

    await writeLogEntries(actor, [{ type: 'test' }])

    expect(actor.update).toHaveBeenCalledTimes(2)
  })

  test('calls handleWriteError after all retries exhausted', async () => {
    const { writeLogEntries } = await import('../../module/utils/audit-log.mjs')
    const actor = makeCharacterActor()

    actor.update.mockRejectedValue(new Error('Persistent fail'))

    await writeLogEntries(actor, [{ type: 'test' }])

    expect(actor.update).toHaveBeenCalledTimes(2)
  })

  test('succeeds on first attempt without retry', async () => {
    const { writeLogEntries } = await import('../../module/utils/audit-log.mjs')
    const actor = makeCharacterActor()

    await writeLogEntries(actor, [{ type: 'test' }])

    expect(actor.update).toHaveBeenCalledTimes(1)
  })
})

/* ============================================ */
/*  pruneExpiredPending capacity warning        */
/* ============================================ */

describe('pruneExpiredPending capacity warning', () => {
  test('does not log warning when under 100 entries', async () => {
    const { logger } = await import('../../module/utils/logger.mjs')
    const { pruneExpiredPending, pushPendingEntry, flushPending, countPendingEntries } = await import('../../module/utils/audit-log.mjs')
    flushPending()

    const actor = makeCharacterActor()
    for (let i = 0; i < 50; i++) {
      pushPendingEntry(actor, 'user-1', { changes: { idx: i }, timestamp: Date.now() })
    }
    expect(countPendingEntries()).toBe(50)

    pruneExpiredPending()

    expect(logger.warn).not.toHaveBeenCalled()
    flushPending()
  })

  test('logs warning when over 100 entries', async () => {
    const { logger } = await import('../../module/utils/logger.mjs')
    const { pruneExpiredPending, pushPendingEntry, flushPending, countPendingEntries } = await import('../../module/utils/audit-log.mjs')
    flushPending()

    const actor = makeCharacterActor()
    for (let i = 0; i < 101; i++) {
      pushPendingEntry(actor, 'user-1', { changes: { idx: i }, timestamp: Date.now() })
    }
    expect(countPendingEntries()).toBe(101)

    pruneExpiredPending()

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('pendingOldStates has 101 entries'))
    flushPending()
  })
})

/* ============================================ */
/*  recordTalentNodePurchase                    */
/* ============================================ */

describe('recordTalentNodePurchase', () => {
  /**
   *
   * @param overrides
   */
  function makeActor(overrides = {}) {
    return {
      type: 'character',
      id: 'actor-001',
      name: 'Test Character',
      _source: {
        system: {
          skills: {},
          characteristics: {},
          progression: { totalXP: 0, spentXP: 0 },
          details: {},
          advancement: {},
        },
        flags: {},
      },
      system: {
        progression: {
          experience: { spent: 0, gained: 0, available: 0, total: 0 },
          freeSkillRanks: {
            career: { spent: 0, gained: 0, available: 0 },
            specialization: { spent: 0, gained: 0, available: 0 },
          },
        },
      },
      update: vi.fn(),
      ...overrides,
    }
  }

  test('creates a talent-node-purchase entry with all data', async () => {
    const { recordTalentNodePurchase } = await import('../../module/utils/audit-log.mjs')
    globalThis.foundry.utils.deepClone = vi.fn((o) => structuredClone(o))
    globalThis.game.users = { get: vi.fn(() => ({ id: 'gm-1', name: 'Game Master' })) }

    const actor = makeActor()
    const purchaseData = {
      specializationId: 'spec-1',
      treeId: 'tree-1',
      nodeId: 'r2c3',
      talentId: 'talent-deflect',
      cost: 10,
      previousXp: 50,
      nextXp: 60,
    }

    await recordTalentNodePurchase(actor, purchaseData)

    expect(actor.update).toHaveBeenCalledTimes(1)
    const updateArg = actor.update.mock.calls[0][0]
    const log = getWrittenLogs(updateArg)[0]
    expect(log.type).toBe('talent-node-purchase-succeeded')
    expect(log.data).toMatchObject({
      actorId: 'actor-001',
      specializationId: 'spec-1',
      treeId: 'tree-1',
      nodeId: 'r2c3',
      talentId: 'talent-deflect',
      cost: 10,
      source: 'specialization-tree',
      previousXp: 50,
      nextXp: 60,
    })
    expect(log.xpDelta).toBe(-10)
    expect(log.userId).toBe('gm-1')
    expect(log.userName).toBe('Game Master')
  })

  test('handles missing xp range data gracefully', async () => {
    const { recordTalentNodePurchase } = await import('../../module/utils/audit-log.mjs')
    globalThis.foundry.utils.deepClone = vi.fn((o) => structuredClone(o))

    const actor = makeActor()
    const purchaseData = {
      specializationId: 'spec-1',
      treeId: 'tree-1',
      nodeId: 'r1c1',
      talentId: 'talent-parry',
      cost: 5,
    }

    await recordTalentNodePurchase(actor, purchaseData)

    const updateArg = actor.update.mock.calls[0][0]
    const log = getWrittenLogs(updateArg)[0]
    expect(log.data.previousXp).toBeUndefined()
    expect(log.data.nextXp).toBeUndefined()
    expect(log.xpDelta).toBe(-5)
  })

  test('includes snapshot of actor XP state', async () => {
    const { recordTalentNodePurchase } = await import('../../module/utils/audit-log.mjs')
    globalThis.foundry.utils.deepClone = vi.fn((o) => structuredClone(o))

    const actor = makeActor({
      system: {
        progression: {
          experience: { spent: 50, gained: 200, available: 150, total: 200 },
          freeSkillRanks: {
            career: { spent: 2, gained: 5, available: 3 },
            specialization: { spent: 0, gained: 3, available: 3 },
          },
        },
      },
    })
    const purchaseData = {
      specializationId: 'spec-1',
      treeId: 'tree-1',
      nodeId: 'r1c1',
      talentId: 'talent-parry',
      cost: 5,
    }

    await recordTalentNodePurchase(actor, purchaseData)

    const updateArg = actor.update.mock.calls[0][0]
    const snapshot = getWrittenLogs(updateArg)[0].snapshot
    expect(snapshot).toMatchObject({
      xpAvailable: 150,
      totalXpSpent: 50,
      totalXpGained: 200,
      careerFreeAvailable: 3,
      specializationFreeAvailable: 3,
    })
  })

  test('does nothing when actor.update throws', async () => {
    const { recordTalentNodePurchase } = await import('../../module/utils/audit-log.mjs')
    globalThis.foundry.utils.deepClone = vi.fn((o) => structuredClone(o))

    const actor = makeActor()
    actor.update.mockRejectedValue(new Error('DB fail'))

    await expect(
      recordTalentNodePurchase(actor, {
        specializationId: 'spec-1',
        treeId: 'tree-1',
        nodeId: 'r1c1',
        talentId: 'talent-parry',
        cost: 5,
      }),
    ).resolves.toBeUndefined()
  })
})

/* ============================================ */
/*  recordTalentNodeOperation                   */
/* ============================================ */

describe('recordTalentNodeOperation', () => {
  /**
   *
   * @param overrides
   */
  function makeActor(overrides = {}) {
    return {
      type: 'character',
      id: 'actor-001',
      name: 'Test Character',
      _source: {
        system: {
          skills: {},
          characteristics: {},
          progression: { totalXP: 0, spentXP: 0 },
          details: {},
          advancement: {},
        },
        flags: {},
      },
      system: {
        progression: {
          experience: { spent: 0, gained: 0, available: 0, total: 0 },
          freeSkillRanks: {
            career: { spent: 0, gained: 0, available: 0 },
            specialization: { spent: 0, gained: 0, available: 0 },
          },
        },
      },
      update: vi.fn(),
      ...overrides,
    }
  }

  test('creates a purchase-succeeded entry with all data', async () => {
    const { recordTalentNodeOperation } = await import('../../module/utils/audit-log.mjs')
    globalThis.foundry.utils.deepClone = vi.fn((o) => structuredClone(o))
    globalThis.game.users = { get: vi.fn(() => ({ id: 'gm-1', name: 'Game Master' })) }

    const actor = makeActor()
    const data = {
      specializationId: 'spec-1',
      treeId: 'tree-1',
      nodeId: 'r2c3',
      talentId: 'talent-deflect',
      cost: 10,
      previousXp: 50,
      nextXp: 60,
    }

    await recordTalentNodeOperation(actor, 'purchase', 'succeeded', data)

    expect(actor.update).toHaveBeenCalledTimes(1)
    const updateArg = actor.update.mock.calls[0][0]
    const log = getWrittenLogs(updateArg)[0]
    expect(log.type).toBe('talent-node-purchase-succeeded')
    expect(log.data).toMatchObject({
      actorId: 'actor-001',
      specializationId: 'spec-1',
      treeId: 'tree-1',
      nodeId: 'r2c3',
      talentId: 'talent-deflect',
      cost: 10,
      source: 'specialization-tree',
      previousXp: 50,
      nextXp: 60,
    })
    expect(log.xpDelta).toBe(-10)
    expect(log.userId).toBe('gm-1')
    expect(log.userName).toBe('Game Master')
  })

  test('creates a forget-succeeded entry with positive XP delta', async () => {
    const { recordTalentNodeOperation } = await import('../../module/utils/audit-log.mjs')
    globalThis.foundry.utils.deepClone = vi.fn((o) => structuredClone(o))
    globalThis.game.users = { get: vi.fn(() => ({ id: 'gm-1', name: 'Game Master' })) }

    const actor = makeActor()
    const data = {
      specializationId: 'spec-1',
      treeId: 'tree-1',
      nodeId: 'r1c1',
      talentId: 'talent-parry',
      cost: 5,
      previousXp: 50,
      nextXp: 45,
    }

    await recordTalentNodeOperation(actor, 'forget', 'succeeded', data)

    const updateArg = actor.update.mock.calls[0][0]
    const log = getWrittenLogs(updateArg)[0]
    expect(log.type).toBe('talent-node-forget-succeeded')
    expect(log.xpDelta).toBe(5)
    expect(log.data.actorId).toBe('actor-001')
    expect(log.data.cost).toBe(5)
  })

  test('creates a purchase-failed entry with reasonCode', async () => {
    const { recordTalentNodeOperation } = await import('../../module/utils/audit-log.mjs')
    globalThis.foundry.utils.deepClone = vi.fn((o) => structuredClone(o))

    const actor = makeActor()
    const data = {
      specializationId: 'spec-1',
      nodeId: 'r1c1',
      cost: 5,
      reasonCode: 'not-enough-xp',
      reason: 'Not enough XP available',
    }

    await recordTalentNodeOperation(actor, 'purchase', 'failed', data)

    const updateArg = actor.update.mock.calls[0][0]
    const log = getWrittenLogs(updateArg)[0]
    expect(log.type).toBe('talent-node-purchase-failed')
    expect(log.xpDelta).toBe(-5)
    expect(log.data.reasonCode).toBe('not-enough-xp')
    expect(log.data.reason).toBe('Not enough XP available')
  })

  test('creates a forget-failed entry with reasonCode', async () => {
    const { recordTalentNodeOperation } = await import('../../module/utils/audit-log.mjs')
    globalThis.foundry.utils.deepClone = vi.fn((o) => structuredClone(o))

    const actor = makeActor()
    const data = {
      specializationId: 'spec-1',
      nodeId: 'r1c1',
      cost: 5,
      reasonCode: 'node-has-dependents',
      reason: 'Node has dependent nodes',
    }

    await recordTalentNodeOperation(actor, 'forget', 'failed', data)

    const updateArg = actor.update.mock.calls[0][0]
    const log = getWrittenLogs(updateArg)[0]
    expect(log.type).toBe('talent-node-forget-failed')
    expect(log.xpDelta).toBe(5)
    expect(log.data.reasonCode).toBe('node-has-dependents')
  })

  test('includes snapshot of actor XP state', async () => {
    const { recordTalentNodeOperation } = await import('../../module/utils/audit-log.mjs')
    globalThis.foundry.utils.deepClone = vi.fn((o) => structuredClone(o))

    const actor = makeActor({
      system: {
        progression: {
          experience: { spent: 50, gained: 200, available: 150, total: 200 },
          freeSkillRanks: {
            career: { spent: 2, gained: 5, available: 3 },
            specialization: { spent: 0, gained: 3, available: 3 },
          },
        },
      },
    })
    const data = {
      specializationId: 'spec-1',
      treeId: 'tree-1',
      nodeId: 'r1c1',
      talentId: 'talent-parry',
      cost: 5,
    }

    await recordTalentNodeOperation(actor, 'purchase', 'succeeded', data)

    const updateArg = actor.update.mock.calls[0][0]
    const snapshot = getWrittenLogs(updateArg)[0].snapshot
    expect(snapshot).toMatchObject({
      xpAvailable: 150,
      totalXpSpent: 50,
      totalXpGained: 200,
      careerFreeAvailable: 3,
      specializationFreeAvailable: 3,
    })
  })
})

/* ============================================ */
/*  sendChatForAuditEntries                     */
/* ============================================ */

describe('sendChatForAuditEntries', () => {
  /**
   *
   * @param overrides
   */
  function makeActor(overrides = {}) {
    return {
      type: 'character',
      id: 'actor-001',
      uuid: 'Actor.actor-001',
      name: 'Test Character',
      img: 'icons/test-character.svg',
      _source: {
        system: {
          skills: {},
          characteristics: {},
          progression: { totalXP: 0, spentXP: 0 },
          details: {},
          advancement: {},
        },
        flags: {},
      },
      system: {
        progression: {
          experience: { spent: 0, gained: 0, available: 0, total: 0 },
          freeSkillRanks: {
            career: { spent: 0, gained: 0, available: 0 },
            specialization: { spent: 0, gained: 0, available: 0 },
          },
        },
      },
      update: vi.fn(),
      ...overrides,
    }
  }

  /**
   *
   * @param overrides
   */
  function makeEntry(overrides = {}) {
    return {
      id: 'entry-001',
      timestamp: 1000,
      userId: 'user-1',
      userName: 'Player One',
      type: 'skill.train',
      data: {
        skillId: 'athletics',
        skillName: 'Athletics',
        oldRank: 2,
        newRank: 3,
        cost: 10,
        isFree: false,
        isCareer: true,
      },
      xpDelta: -10,
      snapshot: {
        xpAvailable: 90,
        totalXpSpent: 10,
        totalXpGained: 100,
        careerFreeAvailable: 2,
        specializationFreeAvailable: 1,
      },
      ...overrides,
    }
  }

  test('sends one chat per entry for skill.train', async () => {
    const { sendChatForAuditEntries } = await import('../../module/utils/audit-log.mjs')
    const actor = makeActor()
    const entry = makeEntry()

    await sendChatForAuditEntries(actor, [entry])

    expect(globalThis.ChatMessage.create).toHaveBeenCalledTimes(1)
    expect(globalThis.ChatMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.any(String),
        speaker: expect.any(Object),
        flags: expect.objectContaining({
          swerpg: expect.objectContaining({
            auditChat: true,
            auditType: 'skill.train',
            auditEntryId: entry.id,
          }),
        }),
      }),
    )
  })

  test('sends one chat per entry for skill.forget', async () => {
    const { sendChatForAuditEntries } = await import('../../module/utils/audit-log.mjs')
    const actor = makeActor()
    const entry = makeEntry({ type: 'skill.forget', data: { ...makeEntry().data, oldRank: 3, newRank: 2, cost: 10 }, xpDelta: 10 })

    await sendChatForAuditEntries(actor, [entry])

    expect(globalThis.ChatMessage.create).toHaveBeenCalledTimes(1)
    expect(globalThis.ChatMessage.create.mock.calls[0][0].flags.swerpg.auditType).toBe('skill.forget')
  })

  test('sends one chat per entry for characteristic.increase', async () => {
    const { sendChatForAuditEntries } = await import('../../module/utils/audit-log.mjs')
    const actor = makeActor()
    const entry = makeEntry({ type: 'characteristic.increase', data: { characteristicId: 'brawn', oldValue: 3, newValue: 4, cost: 40 }, xpDelta: -40 })

    await sendChatForAuditEntries(actor, [entry])

    expect(globalThis.ChatMessage.create).toHaveBeenCalledTimes(1)
  })

  test('sends one chat per entry for xp.grant', async () => {
    const { sendChatForAuditEntries } = await import('../../module/utils/audit-log.mjs')
    const actor = makeActor()
    const entry = makeEntry({ type: 'xp.grant', data: { amount: 50 }, xpDelta: 50 })

    await sendChatForAuditEntries(actor, [entry])

    expect(globalThis.ChatMessage.create).toHaveBeenCalledTimes(1)
  })

  test('sends one chat per entry for species.set', async () => {
    const { sendChatForAuditEntries } = await import('../../module/utils/audit-log.mjs')
    const actor = makeActor()
    const entry = makeEntry({ type: 'species.set', data: { oldSpecies: null, newSpecies: 'Human' }, xpDelta: 0 })

    await sendChatForAuditEntries(actor, [entry])

    expect(globalThis.ChatMessage.create).toHaveBeenCalledTimes(1)
  })

  test('sends one chat per entry for talent-node-purchase-succeeded', async () => {
    const { sendChatForAuditEntries } = await import('../../module/utils/audit-log.mjs')
    const actor = makeActor()
    const entry = makeEntry({
      type: 'talent-node-purchase-succeeded',
      data: { specializationId: 'spec-1', nodeId: 'r1c1', talentId: 'grit', cost: 5 },
      xpDelta: -5,
    })

    await sendChatForAuditEntries(actor, [entry])

    expect(globalThis.ChatMessage.create).toHaveBeenCalledTimes(1)
  })

  test('sends one chat per entry for talent-node-purchase-failed', async () => {
    const { sendChatForAuditEntries } = await import('../../module/utils/audit-log.mjs')
    const actor = makeActor()
    const entry = makeEntry({ type: 'talent-node-purchase-failed', data: { nodeId: 'r1c1', reasonCode: 'not-enough-xp', cost: 5 }, xpDelta: -5 })

    await sendChatForAuditEntries(actor, [entry])

    expect(globalThis.ChatMessage.create).toHaveBeenCalledTimes(1)
  })

  test('sends one chat per entry for advancement.level', async () => {
    const { sendChatForAuditEntries } = await import('../../module/utils/audit-log.mjs')
    const actor = makeActor()
    const entry = makeEntry({ type: 'advancement.level', data: { oldLevel: 3, newLevel: 4 }, xpDelta: 0 })

    await sendChatForAuditEntries(actor, [entry])

    expect(globalThis.ChatMessage.create).toHaveBeenCalledTimes(1)
  })

  test('sends one chat per entry for unknown type (fallback)', async () => {
    const { sendChatForAuditEntries } = await import('../../module/utils/audit-log.mjs')
    const actor = makeActor()
    const entry = makeEntry({ type: 'unknown.event', data: {} })

    await sendChatForAuditEntries(actor, [entry])

    expect(globalThis.ChatMessage.create).toHaveBeenCalledTimes(1)
  })

  test('sends one chat per entry in a batch', async () => {
    const { sendChatForAuditEntries } = await import('../../module/utils/audit-log.mjs')
    const actor = makeActor()
    const entries = [
      makeEntry({ type: 'skill.train' }),
      makeEntry({ type: 'characteristic.increase', data: { characteristicId: 'brawn', oldValue: 3, newValue: 4, cost: 40 }, xpDelta: -40 }),
      makeEntry({ type: 'species.set', data: { oldSpecies: null, newSpecies: 'Human' }, xpDelta: 0 }),
    ]

    await sendChatForAuditEntries(actor, entries)

    expect(globalThis.ChatMessage.create).toHaveBeenCalledTimes(3)
  })

  test('does not propagate ChatMessage.create error', async () => {
    const { sendChatForAuditEntries } = await import('../../module/utils/audit-log.mjs')
    const actor = makeActor()
    const entry = makeEntry()
    globalThis.ChatMessage.create = vi.fn().mockRejectedValue(new Error('Chat failed'))

    await expect(sendChatForAuditEntries(actor, [entry])).resolves.toBeUndefined()
  })

  test('calls renderTemplate with audit-entry.hbs and expected context for skill.train', async () => {
    const { sendChatForAuditEntries } = await import('../../module/utils/audit-log.mjs')
    const actor = makeActor()
    const entry = makeEntry()

    await sendChatForAuditEntries(actor, [entry])

    expect(globalThis.foundry.applications.handlebars.renderTemplate).toHaveBeenCalledWith(
      'systems/swerpg/templates/chat/audit-entry.hbs',
      expect.objectContaining({
        actorImg: 'icons/test-character.svg',
        actorName: 'Test Character',
        previousValue: '2',
        nextValue: '3',
        variant: 'add',
      }),
    )
  })

  test('species.set: previousValue and nextValue are set separately, no concatenated string', async () => {
    const { sendChatForAuditEntries } = await import('../../module/utils/audit-log.mjs')
    const actor = makeActor()
    const entry = makeEntry({ type: 'species.set', data: { oldSpecies: 'Wookiee', newSpecies: 'Human' }, xpDelta: 0 })

    await sendChatForAuditEntries(actor, [entry])

    const ctx = globalThis.foundry.applications.handlebars.renderTemplate.mock.calls[0][1]
    expect(ctx.previousValue).toBe('Wookiee')
    expect(ctx.nextValue).toBe('Human')
    expect(ctx.variant).toBe('change')
    // Ensure no old concatenated field
    expect(ctx.changeText).toBeUndefined()
  })

  test('career.set: previousValue and nextValue are set separately, no concatenated string', async () => {
    const { sendChatForAuditEntries } = await import('../../module/utils/audit-log.mjs')
    const actor = makeActor()
    const entry = makeEntry({ type: 'career.set', data: { oldCareer: 'Smuggler', newCareer: 'Bounty Hunter' }, xpDelta: 0 })

    await sendChatForAuditEntries(actor, [entry])

    const ctx = globalThis.foundry.applications.handlebars.renderTemplate.mock.calls[0][1]
    expect(ctx.previousValue).toBe('Smuggler')
    expect(ctx.nextValue).toBe('Bounty Hunter')
    expect(ctx.variant).toBe('change')
    expect(ctx.changeText).toBeUndefined()
  })

  test('species.set with null oldSpecies: previousValue uses NONE label', async () => {
    const { sendChatForAuditEntries } = await import('../../module/utils/audit-log.mjs')
    const actor = makeActor()
    const entry = makeEntry({ type: 'species.set', data: { oldSpecies: null, newSpecies: 'Human' }, xpDelta: 0 })

    await sendChatForAuditEntries(actor, [entry])

    const ctx = globalThis.foundry.applications.handlebars.renderTemplate.mock.calls[0][1]
    expect(ctx.previousValue).toBe('SWERPG.AUDIT_LOG.NONE')
    expect(ctx.nextValue).toBe('Human')
  })

  test('specialization.add: nextValue is the specialization name, variant is add', async () => {
    const { sendChatForAuditEntries } = await import('../../module/utils/audit-log.mjs')
    const actor = makeActor()
    const entry = makeEntry({ type: 'specialization.add', data: { specializationId: 'spec-ace', specializationName: 'Ace Pilot', cost: 25 }, xpDelta: -25 })

    await sendChatForAuditEntries(actor, [entry])

    const ctx = globalThis.foundry.applications.handlebars.renderTemplate.mock.calls[0][1]
    expect(ctx.nextValue).toBe('Ace Pilot')
    expect(ctx.previousValue).toBeNull()
    expect(ctx.variant).toBe('add')
    expect(ctx.metaLeft).toBe('SKILL.CHAT.COST')
    expect(ctx.changeText).toBeUndefined()
  })

  test('specialization.remove: nextValue is the specialization name, variant is remove', async () => {
    const { sendChatForAuditEntries } = await import('../../module/utils/audit-log.mjs')
    const actor = makeActor()
    const entry = makeEntry({ type: 'specialization.remove', data: { specializationId: 'spec-ace', specializationName: 'Ace Pilot' }, xpDelta: 0 })

    await sendChatForAuditEntries(actor, [entry])

    const ctx = globalThis.foundry.applications.handlebars.renderTemplate.mock.calls[0][1]
    expect(ctx.nextValue).toBe('Ace Pilot')
    expect(ctx.variant).toBe('remove')
  })

  test('skill.train free: variant is gain, metaLeft is free cost label', async () => {
    const { sendChatForAuditEntries } = await import('../../module/utils/audit-log.mjs')
    const actor = makeActor()
    const entry = makeEntry({
      type: 'skill.train',
      data: { skillId: 'athletics', skillName: 'Athletics', oldRank: 0, newRank: 1, cost: 0, isFree: true, isCareer: true },
      xpDelta: 0,
    })

    await sendChatForAuditEntries(actor, [entry])

    const ctx = globalThis.foundry.applications.handlebars.renderTemplate.mock.calls[0][1]
    expect(ctx.variant).toBe('gain')
    expect(ctx.previousValue).toBe('0')
    expect(ctx.nextValue).toBe('1')
    expect(ctx.metaLeft).toBe('SKILL.CHAT.FREE_COST')
  })

  test('hasMeta is true when metaLeft is set', async () => {
    const { sendChatForAuditEntries } = await import('../../module/utils/audit-log.mjs')
    const actor = makeActor()
    const entry = makeEntry()

    await sendChatForAuditEntries(actor, [entry])

    const ctx = globalThis.foundry.applications.handlebars.renderTemplate.mock.calls[0][1]
    expect(ctx.hasMeta).toBe(true)
  })

  test('hasMeta is false when no metaLeft or metaRight', async () => {
    const { sendChatForAuditEntries } = await import('../../module/utils/audit-log.mjs')
    const actor = makeActor()
    const entry = makeEntry({ type: 'species.set', data: { oldSpecies: 'Wookiee', newSpecies: 'Human' }, xpDelta: 0, snapshot: {} })

    await sendChatForAuditEntries(actor, [entry])

    const ctx = globalThis.foundry.applications.handlebars.renderTemplate.mock.calls[0][1]
    expect(ctx.hasMeta).toBe(false)
  })

  test('talent-node-purchase-failed: variant is fail and description is set', async () => {
    const { sendChatForAuditEntries } = await import('../../module/utils/audit-log.mjs')
    const actor = makeActor()
    const entry = makeEntry({ type: 'talent-node-purchase-failed', data: { nodeId: 'r1c1', reasonCode: 'not-enough-xp', cost: 5 }, xpDelta: -5 })

    await sendChatForAuditEntries(actor, [entry])

    const ctx = globalThis.foundry.applications.handlebars.renderTemplate.mock.calls[0][1]
    expect(ctx.variant).toBe('fail')
    expect(ctx.description).toBeTruthy()
    expect(ctx.nextValue).toBe('r1c1')
  })

  test('item.purchase: variant is add, metaLeft and metaRight are set', async () => {
    const { sendChatForAuditEntries } = await import('../../module/utils/audit-log.mjs')
    const actor = makeActor()
    const entry = makeEntry({
      type: 'item.purchase',
      data: { itemName: 'Blaster Pistol', itemType: 'weapon', price: 100, quantity: 1 },
      xpDelta: 0,
      snapshot: { creditsBefore: 150, creditsAfter: 50 },
    })

    await sendChatForAuditEntries(actor, [entry])

    const ctx = globalThis.foundry.applications.handlebars.renderTemplate.mock.calls[0][1]
    expect(ctx.variant).toBe('add')
    expect(ctx.nextValue).toBe('Blaster Pistol (weapon)')
    expect(ctx.eventLabel).toBe('SWERPG.AUDIT_LOG.TYPE.ITEM_PURCHASE')
    expect(ctx.hasMeta).toBe(true)
    expect(ctx.metaLeft).toBe('SWERPG.AUDIT_LOG.META.PRICE')
    expect(ctx.metaRight).toBe('SWERPG.AUDIT_LOG.META.CREDITS_REMAINING')
  })

  test('item.purchase: hasMeta is true even when creditsAfter is 0', async () => {
    const { sendChatForAuditEntries } = await import('../../module/utils/audit-log.mjs')
    const actor = makeActor()
    const entry = makeEntry({
      type: 'item.purchase',
      data: { itemName: 'Blaster Pistol', itemType: 'weapon', price: 100, quantity: 1 },
      xpDelta: 0,
      snapshot: { creditsBefore: 100, creditsAfter: 0 },
    })

    await sendChatForAuditEntries(actor, [entry])

    const ctx = globalThis.foundry.applications.handlebars.renderTemplate.mock.calls[0][1]
    expect(ctx.hasMeta).toBe(true)
    expect(ctx.metaRight).toBe('SWERPG.AUDIT_LOG.META.CREDITS_REMAINING')
  })

  test('item.purchase: metaRight is not set when creditsAfter is undefined', async () => {
    const { sendChatForAuditEntries } = await import('../../module/utils/audit-log.mjs')
    const actor = makeActor()
    const entry = makeEntry({
      type: 'item.purchase',
      data: { itemName: 'Blaster Pistol', itemType: 'weapon', price: 100, quantity: 1 },
      xpDelta: 0,
      snapshot: {},
    })

    await sendChatForAuditEntries(actor, [entry])

    const ctx = globalThis.foundry.applications.handlebars.renderTemplate.mock.calls[0][1]
    expect(ctx.metaRight).toBeNull()
    expect(ctx.hasMeta).toBe(true)
  })

  test('item.purchase with priceModifier: description carries the modifier and metaRight still shows CREDITS_REMAINING', async () => {
    // Regression test for AL6 — AppliedModifier must not overwrite creditsRemaining slot (metaRight)
    const { sendChatForAuditEntries } = await import('../../module/utils/audit-log.mjs')
    const actor = makeActor()
    const entry = makeEntry({
      type: 'item.purchase',
      data: { itemName: 'Blaster Pistol', itemType: 'weapon', price: 120, quantity: 1 },
      xpDelta: 0,
      snapshot: { creditsBefore: 500, creditsAfter: 380 },
      outcome: { priceModifier: 0.2, narrativeKeys: [] },
    })

    await sendChatForAuditEntries(actor, [entry])

    const ctx = globalThis.foundry.applications.handlebars.renderTemplate.mock.calls[0][1]
    expect(ctx.metaRight).toBe('SWERPG.AUDIT_LOG.META.CREDITS_REMAINING')
    expect(ctx.description).toBe('MARKET.CommerceOutcome.AppliedModifier')
    expect(ctx.metaLeft).toBe('SWERPG.AUDIT_LOG.META.PRICE')
    expect(ctx.hasMeta).toBe(true)
  })

  test('item.purchase with priceModifier and narrativeKeys: both appear in description', async () => {
    const { sendChatForAuditEntries } = await import('../../module/utils/audit-log.mjs')
    const actor = makeActor()
    const entry = makeEntry({
      type: 'item.purchase',
      data: { itemName: 'Thermal Detonator', itemType: 'gear', price: 200, quantity: 1 },
      xpDelta: 0,
      snapshot: { creditsBefore: 600, creditsAfter: 400 },
      outcome: { priceModifier: -0.1, narrativeKeys: ['MARKET.Narrative.StreetContacts'] },
    })

    await sendChatForAuditEntries(actor, [entry])

    const ctx = globalThis.foundry.applications.handlebars.renderTemplate.mock.calls[0][1]
    expect(ctx.metaRight).toBe('SWERPG.AUDIT_LOG.META.CREDITS_REMAINING')
    expect(ctx.description).toContain('MARKET.CommerceOutcome.AppliedModifier')
    expect(ctx.description).toContain('MARKET.Narrative.StreetContacts')
    expect(ctx.metaLeft).toBe('SWERPG.AUDIT_LOG.META.PRICE')
  })

  test('item.purchase with zero priceModifier: description stays null when no narrativeKeys', async () => {
    const { sendChatForAuditEntries } = await import('../../module/utils/audit-log.mjs')
    const actor = makeActor()
    const entry = makeEntry({
      type: 'item.purchase',
      data: { itemName: 'Blaster Pistol', itemType: 'weapon', price: 100, quantity: 1 },
      xpDelta: 0,
      snapshot: { creditsBefore: 400, creditsAfter: 300 },
      outcome: { priceModifier: 0, narrativeKeys: [] },
    })

    await sendChatForAuditEntries(actor, [entry])

    const ctx = globalThis.foundry.applications.handlebars.renderTemplate.mock.calls[0][1]
    expect(ctx.description).toBeNull()
    expect(ctx.metaRight).toBe('SWERPG.AUDIT_LOG.META.CREDITS_REMAINING')
  })

  test('item.purchase with null outcome: description stays null, metaRight shows CREDITS_REMAINING', async () => {
    const { sendChatForAuditEntries } = await import('../../module/utils/audit-log.mjs')
    const actor = makeActor()
    const entry = makeEntry({
      type: 'item.purchase',
      data: { itemName: 'Blaster Pistol', itemType: 'weapon', price: 100, quantity: 1 },
      xpDelta: 0,
      snapshot: { creditsBefore: 400, creditsAfter: 300 },
      outcome: null,
    })

    await sendChatForAuditEntries(actor, [entry])

    const ctx = globalThis.foundry.applications.handlebars.renderTemplate.mock.calls[0][1]
    expect(ctx.description).toBeNull()
    expect(ctx.metaRight).toBe('SWERPG.AUDIT_LOG.META.CREDITS_REMAINING')
  })
})

/* ============================================ */
/*  readAuditChatSummaryEnabled                 */
/* ============================================ */

describe('readAuditChatSummaryEnabled', () => {
  test('returns false when setting is not set', async () => {
    const { readAuditChatSummaryEnabled } = await import('../../module/utils/audit-log.mjs')
    globalThis.game.settings.get = vi.fn((namespace, key) => {
      if (namespace === 'swerpg' && key === 'auditLogChatSummary') return false
      return undefined
    })
    expect(readAuditChatSummaryEnabled()).toBe(false)
  })

  test('returns true when setting is enabled', async () => {
    const { readAuditChatSummaryEnabled } = await import('../../module/utils/audit-log.mjs')
    globalThis.game.settings.get = vi.fn((namespace, key) => {
      if (namespace === 'swerpg' && key === 'auditLogChatSummary') return true
      return undefined
    })
    expect(readAuditChatSummaryEnabled()).toBe(true)
  })

  test('falls back to false when game.settings.get throws', async () => {
    const { readAuditChatSummaryEnabled } = await import('../../module/utils/audit-log.mjs')
    globalThis.game.settings.get = vi.fn(() => {
      throw new Error('settings not ready')
    })
    expect(readAuditChatSummaryEnabled()).toBe(false)
  })
})

/* ============================================ */
/*  sendChatForAuditEntries — summary mode      */
/* ============================================ */

describe('sendChatForAuditEntries — summary mode', () => {
  /**
   *
   * @param overrides
   */
  function makeActor(overrides = {}) {
    return {
      type: 'character',
      id: 'actor-001',
      uuid: 'Actor.actor-001',
      name: 'Test Character',
      img: 'icons/test-character.svg',
      update: vi.fn(),
      ...overrides,
    }
  }

  /**
   *
   * @param overrides
   */
  function makeEntry(overrides = {}) {
    return {
      id: `entry-${Math.random().toString(36).slice(2)}`,
      timestamp: 1000,
      userId: 'user-1',
      userName: 'Player One',
      type: 'skill.train',
      data: { skillId: 'athletics', skillName: 'Athletics', oldRank: 2, newRank: 3, cost: 10, isFree: false, isCareer: true },
      xpDelta: -10,
      snapshot: { xpAvailable: 90 },
      ...overrides,
    }
  }

  test('setting disabled + multi-entry batch → sends one card per entry', async () => {
    globalThis.game.settings.get = vi.fn((namespace, key) => {
      if (namespace === 'swerpg' && key === 'auditLogChatSummary') return false
      if (namespace === 'swerpg' && key === 'auditLogMaxEntries') return 500
      return undefined
    })

    const { sendChatForAuditEntries } = await import('../../module/utils/audit-log.mjs')
    const actor = makeActor()
    const entries = [makeEntry(), makeEntry({ type: 'characteristic.increase', data: { characteristicId: 'brawn', oldValue: 2, newValue: 3, cost: 40 } })]

    await sendChatForAuditEntries(actor, entries)

    expect(globalThis.ChatMessage.create).toHaveBeenCalledTimes(2)
  })

  test('setting enabled + multi-entry batch → sends exactly one summary card', async () => {
    globalThis.game.settings.get = vi.fn((namespace, key) => {
      if (namespace === 'swerpg' && key === 'auditLogChatSummary') return true
      if (namespace === 'swerpg' && key === 'auditLogMaxEntries') return 500
      return undefined
    })
    globalThis.game.i18n.format = vi.fn((key, data) => `${key}:${JSON.stringify(data)}`)

    const { sendChatForAuditEntries } = await import('../../module/utils/audit-log.mjs')
    const actor = makeActor()
    const entries = [makeEntry(), makeEntry({ type: 'characteristic.increase', data: { characteristicId: 'brawn', oldValue: 2, newValue: 3, cost: 40 } })]

    await sendChatForAuditEntries(actor, entries)

    expect(globalThis.ChatMessage.create).toHaveBeenCalledTimes(1)
  })

  test('setting enabled + multi-entry batch → summary card uses audit-entry-summary.hbs', async () => {
    globalThis.game.settings.get = vi.fn((namespace, key) => {
      if (namespace === 'swerpg' && key === 'auditLogChatSummary') return true
      return undefined
    })
    globalThis.game.i18n.format = vi.fn((key, data) => `${key}:${JSON.stringify(data)}`)

    const { sendChatForAuditEntries } = await import('../../module/utils/audit-log.mjs')
    const actor = makeActor()
    const entries = [makeEntry(), makeEntry({ type: 'species.set', data: { oldSpecies: null, newSpecies: 'Human' } })]

    await sendChatForAuditEntries(actor, entries)

    expect(globalThis.foundry.applications.handlebars.renderTemplate).toHaveBeenCalledWith(
      'systems/swerpg/templates/chat/audit-entry-summary.hbs',
      expect.objectContaining({
        actorImg: 'icons/test-character.svg',
        actorName: 'Test Character',
        count: 2,
        items: expect.arrayContaining([expect.objectContaining({ variant: expect.any(String) })]),
      }),
    )
  })

  test('setting enabled + multi-entry batch → summary flags carry auditSummary and auditEntryIds', async () => {
    globalThis.game.settings.get = vi.fn((namespace, key) => {
      if (namespace === 'swerpg' && key === 'auditLogChatSummary') return true
      return undefined
    })
    globalThis.game.i18n.format = vi.fn((key) => key)

    const { sendChatForAuditEntries } = await import('../../module/utils/audit-log.mjs')
    const actor = makeActor()
    const e1 = makeEntry({ id: 'id-1' })
    const e2 = makeEntry({ id: 'id-2', type: 'characteristic.increase', data: { characteristicId: 'brawn', oldValue: 2, newValue: 3, cost: 40 } })

    await sendChatForAuditEntries(actor, [e1, e2])

    const createArg = globalThis.ChatMessage.create.mock.calls[0][0]
    expect(createArg.flags.swerpg.auditSummary).toBe(true)
    expect(createArg.flags.swerpg.auditEntryIds).toEqual(['id-1', 'id-2'])
  })

  test('setting enabled + single entry → falls through to historical one-card path', async () => {
    globalThis.game.settings.get = vi.fn((namespace, key) => {
      if (namespace === 'swerpg' && key === 'auditLogChatSummary') return true
      return undefined
    })

    const { sendChatForAuditEntries } = await import('../../module/utils/audit-log.mjs')
    const actor = makeActor()
    const entry = makeEntry()

    await sendChatForAuditEntries(actor, [entry])

    // Uses audit-entry.hbs, not summary
    expect(globalThis.foundry.applications.handlebars.renderTemplate).toHaveBeenCalledWith('systems/swerpg/templates/chat/audit-entry.hbs', expect.any(Object))
    expect(globalThis.ChatMessage.create).toHaveBeenCalledTimes(1)
    const createArg = globalThis.ChatMessage.create.mock.calls[0][0]
    expect(createArg.flags.swerpg.auditSummary).toBeUndefined()
  })

  test('setting enabled + summary renderTemplate failure → does not propagate', async () => {
    globalThis.game.settings.get = vi.fn((namespace, key) => {
      if (namespace === 'swerpg' && key === 'auditLogChatSummary') return true
      return undefined
    })
    globalThis.game.i18n.format = vi.fn((key) => key)
    globalThis.foundry.applications.handlebars.renderTemplate = vi.fn().mockRejectedValue(new Error('Render failed'))

    const { sendChatForAuditEntries } = await import('../../module/utils/audit-log.mjs')
    const actor = makeActor()

    await expect(sendChatForAuditEntries(actor, [makeEntry(), makeEntry()])).resolves.toBeUndefined()
  })
})

/* ============================================ */
/*  recordItemPurchase                          */
/* ============================================ */

describe('recordItemPurchase', () => {
  /**
   *
   * @param overrides
   */
  function makeActor(overrides = {}) {
    return {
      type: 'character',
      id: 'actor-001',
      name: 'Test Character',
      _source: {
        system: {
          skills: {},
          characteristics: {},
          progression: { totalXP: 0, spentXP: 0 },
          details: {},
          advancement: {},
        },
        flags: {},
      },
      system: {
        credits: 150,
        progression: {
          experience: { spent: 0, gained: 0, available: 0, total: 0 },
          freeSkillRanks: {
            career: { spent: 0, gained: 0, available: 0 },
            specialization: { spent: 0, gained: 0, available: 0 },
          },
        },
      },
      update: vi.fn(),
      ...overrides,
    }
  }

  test('creates an item.purchase entry with all required fields', async () => {
    const { recordItemPurchase } = await import('../../module/utils/audit-log.mjs')
    globalThis.foundry.utils.deepClone = vi.fn((o) => structuredClone(o))
    globalThis.game.users = { get: vi.fn(() => ({ id: 'gm-1', name: 'Game Master' })) }

    const actor = makeActor()
    await recordItemPurchase(actor, {
      itemName: 'Blaster Pistol',
      itemType: 'weapon',
      price: 100,
      quantity: 1,
      creditsAfter: 50,
    })

    expect(actor.update).toHaveBeenCalledTimes(1)
    const updateArg = actor.update.mock.calls[0][0]
    const logs = getWrittenLogs(updateArg)
    expect(logs).toHaveLength(1)
    const entry = logs[0]
    expect(entry.type).toBe('item.purchase')
    expect(entry.data).toMatchObject({
      itemName: 'Blaster Pistol',
      itemType: 'weapon',
      price: 100,
      quantity: 1,
    })
    expect(entry.creditDelta).toBe(-100)
    expect(entry.xpDelta).toBe(0)
  })

  test('creditDelta is derived from snapshot.creditsDelta (canonical source), not from -(price * quantity)', async () => {
    // AL11 regression guard: creditDelta must always equal -snapshot.creditsDelta so that
    // price modifiers and rounding are reflected consistently in the audit entry.
    const { recordItemPurchase } = await import('../../module/utils/audit-log.mjs')
    globalThis.foundry.utils.deepClone = vi.fn((o) => structuredClone(o))

    // actor.system.credits = 150 (from makeActor); price=25, quantity=3 → list cost = 75.
    // creditsAfter reflects what the actor actually paid (75), so creditsBefore - creditsAfter = 75.
    const actor = makeActor()
    await recordItemPurchase(actor, {
      itemName: 'Stun Grenade',
      itemType: 'gear',
      price: 25,
      quantity: 3,
      creditsAfter: 75, // 150 - 75 (actual cost paid)
    })

    const updateArg = actor.update.mock.calls[0][0]
    const entry = getWrittenLogs(updateArg)[0]
    expect(entry.snapshot.creditsDelta).toBe(75)
    expect(entry.creditDelta).toBe(-75)
    expect(entry.creditDelta).toBe(-entry.snapshot.creditsDelta)
    expect(entry.data.quantity).toBe(3)
  })

  test('defaults quantity to 1 when not provided', async () => {
    const { recordItemPurchase } = await import('../../module/utils/audit-log.mjs')
    globalThis.foundry.utils.deepClone = vi.fn((o) => structuredClone(o))

    const actor = makeActor()
    await recordItemPurchase(actor, {
      itemName: 'Blaster Pistol',
      itemType: 'weapon',
      price: 100,
      creditsAfter: 50,
    })

    const updateArg = actor.update.mock.calls[0][0]
    const entry = getWrittenLogs(updateArg)[0]
    expect(entry.data.quantity).toBe(1)
    expect(entry.creditDelta).toBe(-100)
  })

  test('captures creditsBefore from system.credits', async () => {
    const { recordItemPurchase } = await import('../../module/utils/audit-log.mjs')
    globalThis.foundry.utils.deepClone = vi.fn((o) => structuredClone(o))

    const actor = makeActor({ system: { credits: 200 } })
    await recordItemPurchase(actor, {
      itemName: 'Armor',
      itemType: 'armor',
      price: 150,
      quantity: 1,
      creditsAfter: 50,
    })

    const updateArg = actor.update.mock.calls[0][0]
    const entry = getWrittenLogs(updateArg)[0]
    expect(entry.snapshot.creditsBefore).toBe(200)
    expect(entry.snapshot.creditsAfter).toBe(50)
  })

  test('captures creditsBefore from creditBudget.availableCredits when present', async () => {
    const { recordItemPurchase } = await import('../../module/utils/audit-log.mjs')
    globalThis.foundry.utils.deepClone = vi.fn((o) => structuredClone(o))

    const actor = makeActor({
      system: {
        creditBudget: { availableCredits: 300 },
        credits: 999,
      },
    })
    await recordItemPurchase(actor, {
      itemName: 'Blaster Rifle',
      itemType: 'weapon',
      price: 250,
      quantity: 1,
      creditsAfter: 50,
    })

    const updateArg = actor.update.mock.calls[0][0]
    const entry = getWrittenLogs(updateArg)[0]
    expect(entry.snapshot.creditsBefore).toBe(300)
  })

  test('uses userId from game.user', async () => {
    const { recordItemPurchase } = await import('../../module/utils/audit-log.mjs')
    globalThis.foundry.utils.deepClone = vi.fn((o) => structuredClone(o))
    globalThis.game.users = { get: vi.fn(() => ({ id: 'gm-1', name: 'Game Master' })) }

    const actor = makeActor()
    await recordItemPurchase(actor, {
      itemName: 'Blaster Pistol',
      itemType: 'weapon',
      price: 100,
      creditsAfter: 50,
    })

    const updateArg = actor.update.mock.calls[0][0]
    const entry = getWrittenLogs(updateArg)[0]
    expect(entry.userId).toBe('gm-1')
    expect(entry.userName).toBe('Game Master')
  })

  test('is exported from the module', async () => {
    const module = await import('../../module/utils/audit-log.mjs')
    expect(typeof module.recordItemPurchase).toBe('function')
  })

  test('does not throw when actor.update fails', async () => {
    const { recordItemPurchase } = await import('../../module/utils/audit-log.mjs')
    globalThis.foundry.utils.deepClone = vi.fn((o) => structuredClone(o))

    const actor = makeActor()
    actor.update.mockRejectedValue(new Error('DB fail'))

    await expect(
      recordItemPurchase(actor, {
        itemName: 'Blaster Pistol',
        itemType: 'weapon',
        price: 100,
        creditsAfter: 50,
      }),
    ).resolves.toBeUndefined()
  })

  test('captures itemId in entry.data when provided', async () => {
    const { recordItemPurchase } = await import('../../module/utils/audit-log.mjs')
    globalThis.foundry.utils.deepClone = vi.fn((o) => structuredClone(o))

    const actor = makeActor({ system: { credits: 250 } })
    await recordItemPurchase(actor, {
      itemName: 'Blaster Pistol',
      itemType: 'weapon',
      price: 100,
      quantity: 1,
      creditsAfter: 150,
      itemId: 'item-uuid-12345',
    })

    const updateArg = actor.update.mock.calls[0][0]
    const entry = getWrittenLogs(updateArg)[0]
    expect(entry.data.itemId).toBe('item-uuid-12345')
  })

  test('itemId is undefined in entry.data when not provided', async () => {
    const { recordItemPurchase } = await import('../../module/utils/audit-log.mjs')
    globalThis.foundry.utils.deepClone = vi.fn((o) => structuredClone(o))

    const actor = makeActor({ system: { credits: 250 } })
    await recordItemPurchase(actor, {
      itemName: 'Blaster Pistol',
      itemType: 'weapon',
      price: 100,
      quantity: 1,
      creditsAfter: 150,
    })

    const updateArg = actor.update.mock.calls[0][0]
    const entry = getWrittenLogs(updateArg)[0]
    expect(entry.data.itemId).toBeUndefined()
  })

  test('calculates creditsDelta in snapshot as creditsBefore - creditsAfter', async () => {
    const { recordItemPurchase } = await import('../../module/utils/audit-log.mjs')
    globalThis.foundry.utils.deepClone = vi.fn((o) => structuredClone(o))

    const actor = makeActor({ system: { credits: 250 } })
    await recordItemPurchase(actor, {
      itemName: 'Blaster Pistol',
      itemType: 'weapon',
      price: 100,
      quantity: 1,
      creditsAfter: 150,
      itemId: 'item-uuid-12345',
    })

    const updateArg = actor.update.mock.calls[0][0]
    const entry = getWrittenLogs(updateArg)[0]
    expect(entry.snapshot.creditsBefore).toBe(250)
    expect(entry.snapshot.creditsAfter).toBe(150)
    expect(entry.snapshot.creditsDelta).toBe(100) // 250 - 150
    expect(entry.creditDelta).toBe(-100) // -(100 * 1)
  })

  test('creditsDelta is null when creditsBefore is null', async () => {
    const { recordItemPurchase } = await import('../../module/utils/audit-log.mjs')
    globalThis.foundry.utils.deepClone = vi.fn((o) => structuredClone(o))

    const actor = makeActor({ system: {} }) // no credits field
    await recordItemPurchase(actor, {
      itemName: 'Armor',
      itemType: 'armor',
      price: 50,
      quantity: 1,
      creditsAfter: null,
    })

    const updateArg = actor.update.mock.calls[0][0]
    const entry = getWrittenLogs(updateArg)[0]
    expect(entry.snapshot.creditsBefore).toBeNull()
    expect(entry.snapshot.creditsDelta).toBeNull()
  })
})

/* ============================================ */
/*  recordItemSale                              */
/* ============================================ */

describe('recordItemSale', () => {
  /**
   *
   * @param overrides
   */
  function makeActor(overrides = {}) {
    return {
      type: 'character',
      id: 'actor-001',
      name: 'Test Character',
      _source: {
        system: {
          skills: {},
          characteristics: {},
          progression: { totalXP: 0, spentXP: 0 },
          details: {},
          advancement: {},
        },
        flags: {},
      },
      system: {
        credits: 100,
        progression: {
          experience: { spent: 0, gained: 0, available: 0, total: 0 },
          freeSkillRanks: {
            career: { spent: 0, gained: 0, available: 0 },
            specialization: { spent: 0, gained: 0, available: 0 },
          },
        },
      },
      update: vi.fn(),
      ...overrides,
    }
  }

  test('creates an item.sale entry with all required fields', async () => {
    const { recordItemSale } = await import('../../module/utils/audit-log.mjs')
    globalThis.foundry.utils.deepClone = vi.fn((o) => structuredClone(o))
    globalThis.game.users = { get: vi.fn(() => ({ id: 'gm-1', name: 'Game Master' })) }

    const actor = makeActor()
    await recordItemSale(actor, {
      itemName: 'Blaster Pistol',
      itemType: 'weapon',
      basePrice: 400,
      resalePrice: 100,
      fraction: 0.25,
      quantity: 1,
      creditsAfter: 200,
    })

    expect(actor.update).toHaveBeenCalledTimes(1)
    const updateArg = actor.update.mock.calls[0][0]
    const logs = getWrittenLogs(updateArg)
    expect(logs).toHaveLength(1)
    const entry = logs[0]
    expect(entry.type).toBe('item.sale')
    expect(entry.data).toMatchObject({
      itemName: 'Blaster Pistol',
      itemType: 'weapon',
      basePrice: 400,
      resalePrice: 100,
      fraction: 0.25,
      quantity: 1,
    })
    expect(entry.creditDelta).toBe(100)
    expect(entry.xpDelta).toBe(0)
  })

  test('defaults quantity to 1 when not provided', async () => {
    const { recordItemSale } = await import('../../module/utils/audit-log.mjs')
    globalThis.foundry.utils.deepClone = vi.fn((o) => structuredClone(o))

    const actor = makeActor()
    await recordItemSale(actor, {
      itemName: 'Blaster Pistol',
      itemType: 'weapon',
      basePrice: 400,
      resalePrice: 100,
      fraction: 0.25,
      creditsAfter: 200,
    })

    const updateArg = actor.update.mock.calls[0][0]
    const entry = getWrittenLogs(updateArg)[0]
    expect(entry.data.quantity).toBe(1)
  })

  test('stores quantity > 1 in entry.data for multi-unit sale', async () => {
    const { recordItemSale } = await import('../../module/utils/audit-log.mjs')
    globalThis.foundry.utils.deepClone = vi.fn((o) => structuredClone(o))

    const actor = makeActor()
    await recordItemSale(actor, {
      itemName: 'Stun Grenade',
      itemType: 'gear',
      basePrice: 100,
      resalePrice: 75, // total resale for 3 units = 25 each × 3
      fraction: 0.25,
      quantity: 3,
      creditsAfter: 175,
    })

    const updateArg = actor.update.mock.calls[0][0]
    const entry = getWrittenLogs(updateArg)[0]
    expect(entry.data.quantity).toBe(3)
    expect(entry.creditDelta).toBe(75) // total resale
  })

  test('creditDelta equals resalePrice (total, not per-unit)', async () => {
    const { recordItemSale } = await import('../../module/utils/audit-log.mjs')
    globalThis.foundry.utils.deepClone = vi.fn((o) => structuredClone(o))

    const actor = makeActor()
    await recordItemSale(actor, {
      itemName: 'Armor',
      itemType: 'armor',
      basePrice: 200,
      resalePrice: 150, // this is the total amount received
      fraction: 0.25,
      quantity: 2,
      creditsAfter: 250,
    })

    const updateArg = actor.update.mock.calls[0][0]
    const entry = getWrittenLogs(updateArg)[0]
    expect(entry.creditDelta).toBe(150)
  })

  test('defaults negotiationOutcome to failure when not provided', async () => {
    const { recordItemSale } = await import('../../module/utils/audit-log.mjs')
    globalThis.foundry.utils.deepClone = vi.fn((o) => structuredClone(o))

    const actor = makeActor()
    await recordItemSale(actor, {
      itemName: 'Gear',
      itemType: 'gear',
      basePrice: 50,
      resalePrice: 12,
      fraction: 0.25,
      creditsAfter: 112,
    })

    const updateArg = actor.update.mock.calls[0][0]
    const entry = getWrittenLogs(updateArg)[0]
    expect(entry.data.negotiationOutcome).toBe('failure')
  })

  test('is exported from the module', async () => {
    const module = await import('../../module/utils/audit-log.mjs')
    expect(typeof module.recordItemSale).toBe('function')
  })
})

/* ============================================ */
/*  isInitiatingClient                          */
/* ============================================ */

describe('isInitiatingClient', () => {
  test('returns true when game.userId matches userId', async () => {
    const { isInitiatingClient } = await import('../../module/utils/audit-log.mjs')
    globalThis.game.userId = 'user-1'
    expect(isInitiatingClient('user-1')).toBe(true)
  })

  test('returns false when game.userId does not match userId', async () => {
    const { isInitiatingClient } = await import('../../module/utils/audit-log.mjs')
    globalThis.game.userId = 'user-1'
    expect(isInitiatingClient('user-2')).toBe(false)
  })
})

/* ============================================ */
/*  Mono-writer guard — onPreUpdateActor        */
/* ============================================ */

describe('onPreUpdateActor — mono-writer guard', () => {
  test('non-initiating client does not capture pending state', async () => {
    const { onPreUpdateActor, flushPending, countPendingEntries } = await import('../../module/utils/audit-log.mjs')
    flushPending()

    globalThis.game.userId = 'user-1'

    const actor = makeCharacterActor({
      _source: {
        system: { skills: { Athletics: { rank: 2 } }, characteristics: {}, progression: {}, details: {}, advancement: {} },
        flags: {},
      },
    })

    onPreUpdateActor(actor, { system: { skills: { Athletics: { rank: 3 } } } }, {}, 'user-2')

    expect(countPendingEntries()).toBe(0)
    flushPending()
  })

  test('initiating client captures pending state', async () => {
    const { onPreUpdateActor, flushPending, countPendingEntries } = await import('../../module/utils/audit-log.mjs')
    flushPending()

    globalThis.game.userId = 'user-1'

    const actor = makeCharacterActor({
      _source: {
        system: { skills: { Athletics: { rank: 2 } }, characteristics: {}, progression: {}, details: {}, advancement: {} },
        flags: {},
      },
    })

    onPreUpdateActor(actor, { system: { skills: { Athletics: { rank: 3 } } } }, {}, 'user-1')

    expect(countPendingEntries()).toBe(1)
    flushPending()
  })
})

/* ============================================ */
/*  Mono-writer guard — onUpdateActor           */
/* ============================================ */

describe('onUpdateActor — mono-writer guard', () => {
  test('non-initiating client does not write audit entries', async () => {
    const { onPreUpdateActor, onUpdateActor, flushPending } = await import('../../module/utils/audit-log.mjs')
    flushPending()

    // The initiating client captures the pending state
    globalThis.game.userId = 'user-1'
    const actor = makeCharacterActor({
      _source: {
        system: { skills: { Athletics: { rank: 2 } }, characteristics: {}, progression: {}, details: {}, advancement: {} },
        flags: {},
      },
    })
    onPreUpdateActor(actor, { system: { skills: { Athletics: { rank: 3 } } } }, {}, 'user-1')

    // Switch to a different client for the update
    globalThis.game.userId = 'user-2'
    onUpdateActor(actor, { system: { skills: { Athletics: { rank: 3 } } } }, {}, 'user-2')

    expect(actor.update).not.toHaveBeenCalled()
    flushPending()
  })

  test('initiating client consumes the pending entry (not left in queue after onUpdateActor)', async () => {
    const { onPreUpdateActor, onUpdateActor, flushPending, countPendingEntries } = await import('../../module/utils/audit-log.mjs')
    flushPending()

    globalThis.game.userId = 'user-1'
    globalThis.foundry.utils.deepClone = vi.fn((o) => structuredClone(o))

    const actor = makeCharacterActor({
      _source: {
        system: { skills: { Athletics: { rank: 2 } }, characteristics: {}, progression: {}, details: {}, advancement: {} },
        flags: {},
      },
    })

    onPreUpdateActor(actor, { system: { skills: { Athletics: { rank: 3 } } } }, {}, 'user-1')
    expect(countPendingEntries()).toBe(1)

    onUpdateActor(actor, { system: { skills: { Athletics: { rank: 3 } } } }, {}, 'user-1')

    // The pending entry must be consumed regardless of whether composeEntries produces audit entries
    expect(countPendingEntries()).toBe(0)
    flushPending()
  })
})

/* ============================================ */
/*  Corrélation old/new par opId               */
/*  Régression AL7 — update rejetée + retry    */
/* ============================================ */

describe('opId correlation — rejected update followed by successful retry', () => {
  test('second update uses its own oldState, not the orphaned snapshot from the first attempt', async () => {
    const { onPreUpdateActor, onUpdateActor, flushPending, countPendingEntries } = await import('../../module/utils/audit-log.mjs')
    flushPending()

    globalThis.game.userId = 'gm-1'
    globalThis.foundry.utils.deepClone = vi.fn((o) => structuredClone(o))

    const actor = makeCharacterActor({
      _source: {
        system: {
          skills: { Athletics: { rank: 2 }, Lore: { rank: 1 } },
          characteristics: {},
          progression: {},
          details: {},
          advancement: {},
        },
        flags: {},
      },
    })

    // First attempt: preUpdate captures oldState with Athletics rank 2
    const options1 = {}
    onPreUpdateActor(actor, { system: { skills: { Athletics: { rank: 3 } } } }, options1, 'gm-1')
    expect(countPendingEntries()).toBe(1)

    // The first update is rejected — onUpdateActor is never called for options1.
    // The orphaned entry stays in the queue with opId from options1.

    // Actor source is not actually modified (update was rejected).
    // Second attempt: preUpdate captures oldState again (still rank 2)
    const options2 = {}
    onPreUpdateActor(actor, { system: { skills: { Athletics: { rank: 3 } } } }, options2, 'gm-1')
    expect(countPendingEntries()).toBe(2)

    // The second update succeeds — onUpdateActor is called with options2
    onUpdateActor(actor, { system: { skills: { Athletics: { rank: 3 } } } }, options2, 'gm-1')

    // The orphaned entry from options1 must remain; only the matched entry was consumed.
    expect(countPendingEntries()).toBe(1)

    // Verify the options1 opId is different from options2 opId (both were stamped)
    expect(options1._swerpgOpId).toBeDefined()
    expect(options2._swerpgOpId).toBeDefined()
    expect(options1._swerpgOpId).not.toBe(options2._swerpgOpId)

    flushPending()
  })

  test('onPreUpdateActor stamps a unique _swerpgOpId onto options', async () => {
    const { onPreUpdateActor, flushPending } = await import('../../module/utils/audit-log.mjs')
    flushPending()

    globalThis.game.userId = 'gm-1'

    const actor = makeCharacterActor({
      _source: {
        system: { skills: { Athletics: { rank: 2 } }, characteristics: {}, progression: {}, details: {}, advancement: {} },
        flags: {},
      },
    })

    const optA = {}
    const optB = {}
    onPreUpdateActor(actor, { system: { skills: { Athletics: { rank: 3 } } } }, optA, 'gm-1')
    onPreUpdateActor(actor, { system: { skills: { Athletics: { rank: 4 } } } }, optB, 'gm-1')

    expect(typeof optA._swerpgOpId).toBe('string')
    expect(typeof optB._swerpgOpId).toBe('string')
    expect(optA._swerpgOpId).not.toBe(optB._swerpgOpId)

    flushPending()
  })

  test('onUpdateActor without opId on options falls back to FIFO (backward-compat)', async () => {
    const { onPreUpdateActor, onUpdateActor, countPendingEntries, flushPending } = await import('../../module/utils/audit-log.mjs')
    flushPending()

    globalThis.game.userId = 'gm-1'
    globalThis.foundry.utils.deepClone = vi.fn((o) => structuredClone(o))

    const actor = makeCharacterActor({
      _source: {
        system: { skills: { Athletics: { rank: 2 } }, characteristics: {}, progression: {}, details: {}, advancement: {} },
        flags: {},
      },
    })

    const optPre = {}
    onPreUpdateActor(actor, { system: { skills: { Athletics: { rank: 3 } } } }, optPre, 'gm-1')
    expect(countPendingEntries()).toBe(1)

    // Pass a fresh options object with no _swerpgOpId to simulate an external caller
    const optPost = {}
    onUpdateActor(actor, { system: { skills: { Athletics: { rank: 3 } } } }, optPost, 'gm-1')

    // Entry consumed via FIFO fallback
    expect(countPendingEntries()).toBe(0)

    flushPending()
  })
})

/* ============================================ */
/*  Mono-writer guard — onCreateItem            */
/* ============================================ */

describe('onCreateItem — mono-writer guard', () => {
  function makeCharacterActorWithSystem(overrides = {}) {
    return {
      type: 'character',
      id: 'actor-001',
      uuid: 'Actor.actor-001',
      name: 'Test Character',
      _source: {
        system: { skills: {}, characteristics: {}, progression: { totalXP: 0, spentXP: 0 }, details: {}, advancement: {} },
        flags: {},
      },
      system: {
        progression: {
          experience: { spent: 0, gained: 0, available: 0, total: 0 },
          freeSkillRanks: {
            career: { spent: 0, gained: 0, available: 0 },
            specialization: { spent: 0, gained: 0, available: 0 },
          },
        },
      },
      update: vi.fn(),
      ...overrides,
    }
  }

  test('non-initiating client does not write audit entry', async () => {
    const { onCreateItem } = await import('../../module/utils/audit-log.mjs')
    globalThis.game.userId = 'user-1'

    const actor = makeCharacterActorWithSystem()
    const item = { type: 'talent', id: 'talent-001', name: 'Parry', parent: actor, system: { cost: 5, ranks: 1 } }

    await onCreateItem(item, {}, {}, 'user-2')

    expect(actor.update).not.toHaveBeenCalled()
  })

  test('initiating client writes exactly one audit entry', async () => {
    const { onCreateItem } = await import('../../module/utils/audit-log.mjs')
    globalThis.game.userId = 'user-1'
    globalThis.foundry.utils.deepClone = vi.fn((o) => structuredClone(o))

    const actor = makeCharacterActorWithSystem()
    const item = { type: 'talent', id: 'talent-001', name: 'Parry', parent: actor, system: { cost: 5, ranks: 1 } }

    await onCreateItem(item, {}, {}, 'user-1')

    expect(actor.update).toHaveBeenCalledTimes(1)
    const logs = getWrittenLogs(actor.update.mock.calls[0][0])
    expect(logs).toHaveLength(1)
    expect(logs[0].type).toBe('talent.purchase')
    expect(logs[0].userId).toBe('user-1')
  })
})

/* ============================================ */
/*  onCreateItem — obligation.create            */
/* ============================================ */

describe('onCreateItem — obligation.create', () => {
  function makeCharacterActorWithSystem(overrides = {}) {
    return {
      type: 'character',
      id: 'actor-001',
      uuid: 'Actor.actor-001',
      name: 'Test Character',
      _source: {
        system: { skills: {}, characteristics: {}, progression: { totalXP: 0, spentXP: 0 }, details: {}, advancement: {} },
        flags: {},
      },
      system: {
        progression: {
          experience: { spent: 0, gained: 0, available: 0, total: 0 },
          freeSkillRanks: {
            career: { spent: 0, gained: 0, available: 0 },
            specialization: { spent: 0, gained: 0, available: 0 },
          },
        },
      },
      update: vi.fn(),
      ...overrides,
    }
  }

  function makeObligationItem(actor, overrides = {}) {
    return {
      type: 'obligation',
      id: 'obl-001',
      name: 'Debt',
      parent: actor,
      system: { value: 10, isExtra: false, extraXp: 0, extraCredits: 0 },
      ...overrides,
    }
  }

  test('creates obligation.create entry for obligation on character', async () => {
    const { onCreateItem } = await import('../../module/utils/audit-log.mjs')
    globalThis.foundry.utils.deepClone = vi.fn((o) => structuredClone(o))
    globalThis.game.userId = 'gm-1'

    const actor = makeCharacterActorWithSystem()
    const item = makeObligationItem(actor)

    await onCreateItem(item, {}, {}, 'gm-1')

    expect(actor.update).toHaveBeenCalledTimes(1)
    const logs = getWrittenLogs(actor.update.mock.calls[0][0])
    expect(logs).toHaveLength(1)
    expect(logs[0].type).toBe('obligation.create')
    expect(logs[0].data).toMatchObject({
      obligationId: 'obl-001',
      obligationName: 'Debt',
      value: 10,
      isExtra: false,
      extraXp: 0,
      extraCredits: 0,
    })
    expect(logs[0].xpDelta).toBe(0)
    expect(logs[0].userId).toBe('gm-1')
  })

  test('includes extra bonus metadata for creation-bonus obligation', async () => {
    const { onCreateItem } = await import('../../module/utils/audit-log.mjs')
    globalThis.foundry.utils.deepClone = vi.fn((o) => structuredClone(o))
    globalThis.game.userId = 'gm-1'

    const actor = makeCharacterActorWithSystem()
    const item = makeObligationItem(actor, { system: { value: 5, isExtra: true, extraXp: 5, extraCredits: 1000 } })

    await onCreateItem(item, {}, {}, 'gm-1')

    const logs = getWrittenLogs(actor.update.mock.calls[0][0])
    expect(logs[0].data.extraXp).toBe(5)
    expect(logs[0].data.extraCredits).toBe(1000)
    expect(logs[0].data.isExtra).toBe(true)
  })

  test('does not write obligation.create when swerpgAuditLog option is false', async () => {
    const { onCreateItem } = await import('../../module/utils/audit-log.mjs')
    globalThis.game.userId = 'gm-1'

    const actor = makeCharacterActorWithSystem()
    const item = makeObligationItem(actor)

    await onCreateItem(item, {}, { swerpgAuditLog: false }, 'gm-1')

    expect(actor.update).not.toHaveBeenCalled()
  })

  test('does not write obligation.create when not the initiating client', async () => {
    const { onCreateItem } = await import('../../module/utils/audit-log.mjs')
    globalThis.game.userId = 'user-1'

    const actor = makeCharacterActorWithSystem()
    const item = makeObligationItem(actor)

    await onCreateItem(item, {}, {}, 'user-2')

    expect(actor.update).not.toHaveBeenCalled()
  })

  test('does not write obligation.create for obligation on non-character actor', async () => {
    const { onCreateItem } = await import('../../module/utils/audit-log.mjs')
    globalThis.game.userId = 'gm-1'

    const npc = { type: 'npc', id: 'npc-001', name: 'NPC', update: vi.fn(), system: {} }
    const item = makeObligationItem(npc, { parent: npc })

    await onCreateItem(item, {}, {}, 'gm-1')

    expect(npc.update).not.toHaveBeenCalled()
  })

  test('does not write obligation.create when item type is neither talent nor obligation', async () => {
    const { onCreateItem } = await import('../../module/utils/audit-log.mjs')
    globalThis.game.userId = 'gm-1'

    const actor = makeCharacterActorWithSystem()
    const item = makeObligationItem(actor, { type: 'weapon' })

    await onCreateItem(item, {}, {}, 'gm-1')

    expect(actor.update).not.toHaveBeenCalled()
  })

  test('talent.purchase still works after obligation.create changes (backward compat)', async () => {
    const { onCreateItem } = await import('../../module/utils/audit-log.mjs')
    globalThis.foundry.utils.deepClone = vi.fn((o) => structuredClone(o))
    globalThis.game.userId = 'gm-1'

    const actor = makeCharacterActorWithSystem()
    const talent = { type: 'talent', id: 'talent-001', name: 'Parry', parent: actor, system: { cost: 5, ranks: 1 } }

    await onCreateItem(talent, {}, {}, 'gm-1')

    const logs = getWrittenLogs(actor.update.mock.calls[0][0])
    expect(logs[0].type).toBe('talent.purchase')
  })
})

/* ============================================ */
/*  onDeleteItem — obligation.delete            */
/* ============================================ */

describe('onDeleteItem — obligation.delete', () => {
  function makeCharacterActorWithSystem(overrides = {}) {
    return {
      type: 'character',
      id: 'actor-001',
      uuid: 'Actor.actor-001',
      name: 'Test Character',
      _source: {
        system: { skills: {}, characteristics: {}, progression: { totalXP: 0, spentXP: 0 }, details: {}, advancement: {} },
        flags: {},
      },
      system: {
        progression: {
          experience: { spent: 0, gained: 0, available: 0, total: 0 },
          freeSkillRanks: {
            career: { spent: 0, gained: 0, available: 0 },
            specialization: { spent: 0, gained: 0, available: 0 },
          },
        },
      },
      update: vi.fn(),
      ...overrides,
    }
  }

  function makeObligationItem(actor, overrides = {}) {
    return {
      type: 'obligation',
      id: 'obl-001',
      name: 'Debt',
      parent: actor,
      system: { value: 10, isExtra: false, extraXp: 0, extraCredits: 0 },
      ...overrides,
    }
  }

  test('creates obligation.delete entry for obligation on character', async () => {
    const { onDeleteItem } = await import('../../module/utils/audit-log.mjs')
    globalThis.foundry.utils.deepClone = vi.fn((o) => structuredClone(o))
    globalThis.game.userId = 'gm-1'

    const actor = makeCharacterActorWithSystem()
    const item = makeObligationItem(actor)

    await onDeleteItem(item, {}, 'gm-1')

    expect(actor.update).toHaveBeenCalledTimes(1)
    const logs = getWrittenLogs(actor.update.mock.calls[0][0])
    expect(logs).toHaveLength(1)
    expect(logs[0].type).toBe('obligation.delete')
    expect(logs[0].data).toMatchObject({
      obligationId: 'obl-001',
      obligationName: 'Debt',
      value: 10,
      isExtra: false,
    })
    expect(logs[0].xpDelta).toBe(0)
    expect(logs[0].userId).toBe('gm-1')
  })

  test('does not write obligation.delete when not the initiating client', async () => {
    const { onDeleteItem } = await import('../../module/utils/audit-log.mjs')
    globalThis.game.userId = 'user-1'

    const actor = makeCharacterActorWithSystem()
    const item = makeObligationItem(actor)

    await onDeleteItem(item, {}, 'user-2')

    expect(actor.update).not.toHaveBeenCalled()
  })

  test('does not write obligation.delete when swerpgAuditLog option is false', async () => {
    const { onDeleteItem } = await import('../../module/utils/audit-log.mjs')
    globalThis.game.userId = 'gm-1'

    const actor = makeCharacterActorWithSystem()
    const item = makeObligationItem(actor)

    await onDeleteItem(item, { swerpgAuditLog: false }, 'gm-1')

    expect(actor.update).not.toHaveBeenCalled()
  })

  test('does not write obligation.delete for non-obligation items', async () => {
    const { onDeleteItem } = await import('../../module/utils/audit-log.mjs')
    globalThis.game.userId = 'gm-1'

    const actor = makeCharacterActorWithSystem()
    const item = makeObligationItem(actor, { type: 'talent' })

    await onDeleteItem(item, {}, 'gm-1')

    expect(actor.update).not.toHaveBeenCalled()
  })

  test('does not write obligation.delete for obligation on non-character actor', async () => {
    const { onDeleteItem } = await import('../../module/utils/audit-log.mjs')
    globalThis.game.userId = 'gm-1'

    const npc = { type: 'npc', id: 'npc-001', name: 'NPC', update: vi.fn(), system: {} }
    const item = makeObligationItem(npc, { parent: npc })

    await onDeleteItem(item, {}, 'gm-1')

    expect(npc.update).not.toHaveBeenCalled()
  })

  test('includes extra bonus metadata in delete entry', async () => {
    const { onDeleteItem } = await import('../../module/utils/audit-log.mjs')
    globalThis.foundry.utils.deepClone = vi.fn((o) => structuredClone(o))
    globalThis.game.userId = 'gm-1'

    const actor = makeCharacterActorWithSystem()
    const item = makeObligationItem(actor, { system: { value: 5, isExtra: true, extraXp: 5, extraCredits: 1000 } })

    await onDeleteItem(item, {}, 'gm-1')

    const logs = getWrittenLogs(actor.update.mock.calls[0][0])
    expect(logs[0].data.extraXp).toBe(5)
    expect(logs[0].data.extraCredits).toBe(1000)
    expect(logs[0].data.isExtra).toBe(true)
  })
})

/* ============================================ */
/*  onPreUpdateItem / onUpdateItem              */
/*  obligation.update                           */
/* ============================================ */

describe('onPreUpdateItem / onUpdateItem — obligation.update', () => {
  function makeCharacterActorWithSystem(overrides = {}) {
    return {
      type: 'character',
      id: 'actor-001',
      uuid: 'Actor.actor-001',
      name: 'Test Character',
      _source: {
        system: { skills: {}, characteristics: {}, progression: { totalXP: 0, spentXP: 0 }, details: {}, advancement: {} },
        flags: {},
      },
      system: {
        progression: {
          experience: { spent: 0, gained: 0, available: 0, total: 0 },
          freeSkillRanks: {
            career: { spent: 0, gained: 0, available: 0 },
            specialization: { spent: 0, gained: 0, available: 0 },
          },
        },
      },
      update: vi.fn(),
      ...overrides,
    }
  }

  function makeObligationItem(actor, systemOverrides = {}) {
    return {
      type: 'obligation',
      id: 'obl-001',
      uuid: 'Item.obl-001',
      name: 'Debt',
      parent: actor,
      system: {
        value: 10,
        isExtra: false,
        extraXp: 0,
        extraCredits: 0,
        campaignDelta: 0,
        description: '',
        campaignNote: null,
        transformedTo: null,
        ...systemOverrides,
      },
    }
  }

  test('writes obligation.update entry when value changes', async () => {
    const { onPreUpdateItem, onUpdateItem, flushObligationPending } = await import('../../module/utils/audit-log.mjs')
    flushObligationPending()
    globalThis.foundry.utils.deepClone = vi.fn((o) => structuredClone(o))
    globalThis.game.userId = 'gm-1'

    const actor = makeCharacterActorWithSystem()
    const itemBefore = makeObligationItem(actor, { value: 10 })
    const itemAfter = makeObligationItem(actor, { value: 15 })

    onPreUpdateItem(itemBefore, { 'system.value': 15 }, {}, 'gm-1')
    await onUpdateItem(itemAfter, { 'system.value': 15 }, {}, 'gm-1')

    expect(actor.update).toHaveBeenCalledTimes(1)
    const logs = getWrittenLogs(actor.update.mock.calls[0][0])
    expect(logs).toHaveLength(1)
    expect(logs[0].type).toBe('obligation.update')
    expect(logs[0].data.oldValue).toBe(10)
    expect(logs[0].data.newValue).toBe(15)
    expect(logs[0].data.obligationId).toBe('obl-001')
    expect(logs[0].data.obligationName).toBe('Debt')
    flushObligationPending()
  })

  test('writes obligation.update entry when campaignDelta changes', async () => {
    const { onPreUpdateItem, onUpdateItem, flushObligationPending } = await import('../../module/utils/audit-log.mjs')
    flushObligationPending()
    globalThis.foundry.utils.deepClone = vi.fn((o) => structuredClone(o))
    globalThis.game.userId = 'gm-1'

    const actor = makeCharacterActorWithSystem()
    const itemBefore = makeObligationItem(actor, { campaignDelta: 0 })
    const itemAfter = makeObligationItem(actor, { campaignDelta: 5 })

    onPreUpdateItem(itemBefore, { 'system.campaignDelta': 5 }, {}, 'gm-1')
    await onUpdateItem(itemAfter, { 'system.campaignDelta': 5 }, {}, 'gm-1')

    const logs = getWrittenLogs(actor.update.mock.calls[0][0])
    expect(logs[0].type).toBe('obligation.update')
    expect(logs[0].data.oldCampaignDelta).toBe(0)
    expect(logs[0].data.newCampaignDelta).toBe(5)
    flushObligationPending()
  })

  test('does NOT write an entry when no business field changes', async () => {
    const { onPreUpdateItem, onUpdateItem, flushObligationPending } = await import('../../module/utils/audit-log.mjs')
    flushObligationPending()
    globalThis.game.userId = 'gm-1'

    const actor = makeCharacterActorWithSystem()
    // Same system state before and after — only a non-tracked field would differ
    const item = makeObligationItem(actor, { value: 10, campaignDelta: 0 })

    onPreUpdateItem(item, {}, {}, 'gm-1')
    await onUpdateItem(item, {}, {}, 'gm-1')

    expect(actor.update).not.toHaveBeenCalled()
    flushObligationPending()
  })

  test('signals descriptionChanged without exposing HTML content', async () => {
    const { onPreUpdateItem, onUpdateItem, flushObligationPending } = await import('../../module/utils/audit-log.mjs')
    flushObligationPending()
    globalThis.foundry.utils.deepClone = vi.fn((o) => structuredClone(o))
    globalThis.game.userId = 'gm-1'

    const actor = makeCharacterActorWithSystem()
    const itemBefore = makeObligationItem(actor, { description: '' })
    const itemAfter = makeObligationItem(actor, { description: '<p>Long narrative text that should not appear in the log</p>' })

    onPreUpdateItem(itemBefore, { 'system.description': '<p>...</p>' }, {}, 'gm-1')
    await onUpdateItem(itemAfter, { 'system.description': '<p>...</p>' }, {}, 'gm-1')

    const logs = getWrittenLogs(actor.update.mock.calls[0][0])
    expect(logs[0].type).toBe('obligation.update')
    expect(logs[0].data.descriptionChanged).toBe(true)
    // Ensure HTML is not present in any data field
    const serialized = JSON.stringify(logs[0])
    expect(serialized).not.toContain('<p>')
    flushObligationPending()
  })

  test('does not write obligation.update when not the initiating client', async () => {
    const { onPreUpdateItem, onUpdateItem, flushObligationPending } = await import('../../module/utils/audit-log.mjs')
    flushObligationPending()
    globalThis.game.userId = 'user-1'

    const actor = makeCharacterActorWithSystem()
    const itemBefore = makeObligationItem(actor, { value: 10 })
    const itemAfter = makeObligationItem(actor, { value: 15 })

    onPreUpdateItem(itemBefore, { 'system.value': 15 }, {}, 'user-2')
    await onUpdateItem(itemAfter, { 'system.value': 15 }, {}, 'user-2')

    expect(actor.update).not.toHaveBeenCalled()
    flushObligationPending()
  })

  test('does not write obligation.update when swerpgAuditLog option is false', async () => {
    const { onPreUpdateItem, onUpdateItem, flushObligationPending } = await import('../../module/utils/audit-log.mjs')
    flushObligationPending()
    globalThis.game.userId = 'gm-1'

    const actor = makeCharacterActorWithSystem()
    const itemBefore = makeObligationItem(actor, { value: 10 })
    const itemAfter = makeObligationItem(actor, { value: 15 })

    onPreUpdateItem(itemBefore, { 'system.value': 15 }, { swerpgAuditLog: false }, 'gm-1')
    await onUpdateItem(itemAfter, { 'system.value': 15 }, { swerpgAuditLog: false }, 'gm-1')

    expect(actor.update).not.toHaveBeenCalled()
    flushObligationPending()
  })

  test('does not write obligation.update for non-obligation items', async () => {
    const { onPreUpdateItem, onUpdateItem, flushObligationPending } = await import('../../module/utils/audit-log.mjs')
    flushObligationPending()
    globalThis.game.userId = 'gm-1'

    const actor = makeCharacterActorWithSystem()
    const item = { type: 'talent', id: 'talent-001', uuid: 'Item.talent-001', name: 'Parry', parent: actor, system: { cost: 5 } }

    onPreUpdateItem(item, { 'system.cost': 10 }, {}, 'gm-1')
    await onUpdateItem({ ...item, system: { cost: 10 } }, { 'system.cost': 10 }, {}, 'gm-1')

    expect(actor.update).not.toHaveBeenCalled()
    flushObligationPending()
  })

  test('does not write obligation.update when no preUpdateItem snapshot was captured', async () => {
    const { onUpdateItem, flushObligationPending } = await import('../../module/utils/audit-log.mjs')
    flushObligationPending()
    globalThis.game.userId = 'gm-1'

    const actor = makeCharacterActorWithSystem()
    const itemAfter = makeObligationItem(actor, { value: 15 })

    // Call onUpdateItem without a preceding onPreUpdateItem
    await onUpdateItem(itemAfter, { 'system.value': 15 }, {}, 'gm-1')

    expect(actor.update).not.toHaveBeenCalled()
    flushObligationPending()
  })
})
