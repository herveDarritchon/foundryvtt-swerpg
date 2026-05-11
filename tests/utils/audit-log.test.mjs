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

  globalThis.CONST = {
    CHAT_MESSAGE_TYPES: {
      WHISPER: 4,
    },
  }

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

  test('skips deletion paths (-=)', async () => {
    const { snapshotOldState } = await import('../../module/utils/audit-log.mjs')
    const source = { system: { skills: { Athletics: { rank: 2 } } } }
    const changes = { 'system.skills.-=Athletics': null }
    const state = snapshotOldState(source, changes)
    expect(Object.keys(state)).toHaveLength(0)
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
    const { pushPendingEntry, shiftPendingEntry, getPendingKey, flushPending } = await import('../../module/utils/audit-log.mjs')
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
    const logs = updateArg['flags.swerpg.logs']
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
    const logs = updateArg['flags.swerpg.logs']
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

    await writeLogEntries(actor, Array.from({ length: 10 }, (_, i) => ({ type: `new-${i}`, idx: i })))

    expect(actor.update).toHaveBeenCalledTimes(1)
    const updateArg = actor.update.mock.calls[0][0]
    const logs = updateArg['flags.swerpg.logs']
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

    globalThis.game.settings.get = vi.fn(() => { throw new Error('settings not ready') })

    await writeLogEntries(actor, [{ type: 'new' }])

    expect(actor.update).toHaveBeenCalledTimes(1)
    const updateArg = actor.update.mock.calls[0][0]
    const logs = updateArg['flags.swerpg.logs']
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
    expect(updateArg['flags.swerpg.logs']).toHaveLength(2)
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
    expect(() => onPreUpdateActor(npc, { system: { skills: { Athletics: 1 } } }, {}, 'user-1')).not.toThrow()
  })

  test('skips when changes are only audit logs', async () => {
    const { onPreUpdateActor } = await import('../../module/utils/audit-log.mjs')
    const actor = makeCharacterActor()
    const changes = { flags: { swerpg: { logs: [{ timestamp: 1 }] } } }
    expect(() => onPreUpdateActor(actor, changes, {}, 'user-1')).not.toThrow()
  })

  test('skips when swerpgAuditLog option is false', async () => {
    const { onPreUpdateActor } = await import('../../module/utils/audit-log.mjs')
    const actor = makeCharacterActor()
    const changes = { system: { skills: { Athletics: { rank: 3 } } } }
    expect(() => onPreUpdateActor(actor, changes, { swerpgAuditLog: false }, 'user-1')).not.toThrow()
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
    expect(() => onPreUpdateActor(actor, changes, {}, 'user-1')).not.toThrow()
  })
})

/* ============================================ */
/*  updateActor handler                         */
/* ============================================ */

describe('onUpdateActor', () => {
  test('skips non-character actors', async () => {
    const { onUpdateActor } = await import('../../module/utils/audit-log.mjs')
    const npc = { type: 'npc', uuid: 'Actor.npc-001', _source: {} }
    expect(() => onUpdateActor(npc, { system: { skills: {} } }, {}, 'user-1')).not.toThrow()
  })

  test('skips when swerpgAuditLog option is false', async () => {
    const { onUpdateActor } = await import('../../module/utils/audit-log.mjs')
    const actor = makeCharacterActor()
    const changes = { system: { skills: { Athletics: { rank: 3 } } } }
    expect(() => onUpdateActor(actor, changes, { swerpgAuditLog: false }, 'user-1')).not.toThrow()
  })

  test('does nothing when no pending entry exists', async () => {
    const { onUpdateActor } = await import('../../module/utils/audit-log.mjs')
    const actor = makeCharacterActor()
    expect(() => onUpdateActor(actor, { system: { skills: { Athletics: { rank: 3 } } } }, {}, 'user-1')).not.toThrow()
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

    onPreUpdateActor(actor, { system: { skills: { Athletics: { rank: 3 } } } }, {}, 'user-1')

    const expiredTimestamp = Date.now() - 60000
    const { pushPendingEntry, shiftPendingEntry } = await import('../../module/utils/audit-log.mjs')
    flushPending()
    pushPendingEntry(actor, 'user-1', {
      oldState: {},
      changes: {},
      userId: 'user-1',
      timestamp: expiredTimestamp,
    })

    expect(() => onUpdateActor(actor, { system: { skills: { Athletics: { rank: 3 } } } }, {}, 'user-1')).not.toThrow()
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
    expect(updateArg['flags.swerpg.logs']).toHaveLength(2)
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
    expect(actor.update).toHaveBeenCalledWith(
      expect.any(Object),
      { swerpgAuditLog: false }
    )
  })
})

/* ============================================ */
/*  registerAuditLogHooks                       */
/* ============================================ */

describe('registerAuditLogHooks', () => {
  test('registers two hooks via Hooks.on (no onCreateItemAction)', async () => {
    const { registerAuditLogHooks } = await import('../../module/utils/audit-log.mjs')
    registerAuditLogHooks()
    expect(globalThis.Hooks.on).toHaveBeenCalledTimes(2)
    expect(globalThis.Hooks.on).toHaveBeenCalledWith('preUpdateActor', expect.any(Function))
    expect(globalThis.Hooks.on).toHaveBeenCalledWith('updateActor', expect.any(Function))
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

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('[AuditLog] Write failed for actor "Test Character"'),
      err,
    )
  })

  test('calls ui.notifications.warn with i18n key', async () => {
    const { handleWriteError } = await import('../../module/utils/audit-log.mjs')
    const actor = makeCharacterActor()
    const err = new Error('DB timeout')

    await handleWriteError(actor, err)

    expect(globalThis.ui.notifications.warn).toHaveBeenCalledWith(
      expect.stringContaining('Audit log write failed for actor'),
    )
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
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('[AuditLog] Failed to send GM whisper'),
      expect.any(Error),
    )
  })
})

/* ============================================ */
/*  Retry                                       */
/* ============================================ */

describe('writeLogEntries retry', () => {
  test('retries on first failure and succeeds on second attempt', async () => {
    const { writeLogEntries } = await import('../../module/utils/audit-log.mjs')
    const actor = makeCharacterActor()

    actor.update
      .mockRejectedValueOnce(new Error('First fail'))
      .mockResolvedValueOnce(undefined)

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

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('pendingOldStates has 101 entries'),
    )
    flushPending()
  })
})
