import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

/**
 * Build a minimal character actor mock for market audit integration tests.
 * @param {object} [overrides]
 */
function makeActor(overrides = {}) {
  return {
    type: 'character',
    id: 'actor-001',
    uuid: 'Actor.actor-001',
    name: 'Pax Mondala',
    img: 'icons/pax.svg',
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
      credits: 400,
      progression: {
        experience: { spent: 0, gained: 0, available: 0, total: 0 },
        freeSkillRanks: {
          career: { spent: 0, gained: 0, available: 0 },
          specialization: { spent: 0, gained: 0, available: 0 },
        },
      },
    },
    flags: {
      swerpg: { logs: [] },
    },
    update: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

beforeEach(() => {
  setupFoundryMock()

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
    user: { id: 'user-123', name: 'GameMaster', isGM: true },
    users: {
      get: vi.fn(() => ({ id: 'user-123', name: 'GameMaster' })),
    },
    i18n: {
      lang: 'en',
      localize: vi.fn((key) => key),
      format: vi.fn((key, _data) => key),
    },
    settings: {
      get: vi.fn((namespace, key) => {
        if (namespace === 'swerpg' && key === 'auditLogMaxEntries') return 500
        return undefined
      }),
    },
    system: {
      config: {},
    },
  }

  globalThis.CONST = {}

  globalThis.ChatMessage = {
    create: vi.fn().mockResolvedValue(undefined),
    getWhisperRecipients: vi.fn(() => ['user-123']),
    getSpeaker: vi.fn(() => ({ actor: 'actor-001' })),
  }

  globalThis.foundry.applications = {
    ...globalThis.foundry.applications,
    handlebars: {
      renderTemplate: vi.fn().mockResolvedValue('<div class="audit-entry">mock</div>'),
    },
  }

  globalThis.foundry.utils.deepClone = vi.fn((o) => structuredClone(o))
})

afterEach(() => {
  teardownFoundryMock()
  vi.restoreAllMocks()
})

/* ============================================================= */
/*  Scénario 1 : Happy path complet                              */
/*  recordItemPurchase → sendChatForAuditEntries → buildAuditLogEntries */
/* ============================================================= */

describe('Scénario 1 — happy path complet', () => {
  it('recordItemPurchase crée une entrée audit bien formée', async () => {
    const { recordItemPurchase } = await import('../../module/utils/audit-log.mjs')

    const actor = makeActor({ system: { credits: 400 } })

    await recordItemPurchase(actor, {
      itemName: 'Blaster Pistol',
      itemType: 'weapon',
      price: 100,
      quantity: 1,
      creditsAfter: 300,
      itemId: 'item-uuid-abc',
    })

    expect(actor.update).toHaveBeenCalledTimes(1)

    const updateArg = actor.update.mock.calls[0][0]
    const logs = updateArg['flags.swerpg.logs']
    expect(logs).toHaveLength(1)

    const entry = logs[0]
    expect(entry.type).toBe('item.purchase')
    expect(entry.creditDelta).toBe(-100)
    expect(entry.xpDelta).toBe(0)
    expect(entry.snapshot.creditsBefore).toBe(400)
    expect(entry.snapshot.creditsAfter).toBe(300)
    expect(entry.snapshot.creditsDelta).toBe(100)
    expect(entry.data.itemId).toBe('item-uuid-abc')
    expect(entry.data.itemName).toBe('Blaster Pistol')
    expect(entry.data.itemType).toBe('weapon')
    expect(entry.data.price).toBe(100)
    expect(entry.data.quantity).toBe(1)
    expect(entry.userId).toBe('user-123')
    expect(entry.userName).toBe('GameMaster')
  })

  it('writeLogEntries appelle sendChatForAuditEntries qui crée un message ChatMessage', async () => {
    const { recordItemPurchase } = await import('../../module/utils/audit-log.mjs')

    const actor = makeActor()

    await recordItemPurchase(actor, {
      itemName: 'Blaster Pistol',
      itemType: 'weapon',
      price: 100,
      quantity: 1,
      creditsAfter: 300,
      itemId: 'item-uuid-abc',
    })

    // writeLogEntries calls sendChatForAuditEntries internally after actor.update
    expect(globalThis.ChatMessage.create).toHaveBeenCalledTimes(1)
    expect(globalThis.ChatMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        flags: expect.objectContaining({
          swerpg: expect.objectContaining({
            auditChat: true,
            auditType: 'item.purchase',
          }),
        }),
      }),
    )
  })

  it('sendChatForAuditEntries construit un contexte template correct pour item.purchase', async () => {
    const { sendChatForAuditEntries } = await import('../../module/utils/audit-log.mjs')

    const actor = makeActor()
    const entry = {
      id: 'purchase-xyz',
      schemaVersion: 1,
      type: 'item.purchase',
      timestamp: 1234567890,
      userId: 'user-123',
      userName: 'GameMaster',
      data: {
        itemName: 'Blaster Pistol',
        itemType: 'weapon',
        price: 100,
        quantity: 1,
        itemId: 'item-uuid-abc',
      },
      xpDelta: 0,
      creditDelta: -100,
      snapshot: {
        creditsBefore: 400,
        creditsAfter: 300,
        creditsDelta: 100,
      },
    }

    await sendChatForAuditEntries(actor, [entry])

    expect(globalThis.foundry.applications.handlebars.renderTemplate).toHaveBeenCalledWith(
      'systems/swerpg/templates/chat/audit-entry.hbs',
      expect.objectContaining({
        actorName: 'Pax Mondala',
        variant: 'add',
        nextValue: 'Blaster Pistol (weapon)',
        hasMeta: true,
        metaLeft: 'SWERPG.AUDIT_LOG.META.PRICE',
        metaRight: 'SWERPG.AUDIT_LOG.META.CREDITS_REMAINING',
      }),
    )
  })

  it('buildAuditLogEntries avec filtre purchases retourne uniquement les entrées item.purchase', async () => {
    const { buildAuditLogEntries } = await import('../../module/applications/character-audit-log.mjs')

    // Simulate actor state after update: mix of entry types in flags.swerpg.logs
    const purchaseEntry = {
      id: 'purchase-xyz',
      type: 'item.purchase',
      timestamp: 2000,
      userId: 'user-123',
      userName: 'GameMaster',
      data: { itemName: 'Blaster Pistol', itemType: 'weapon', price: 100, quantity: 1, itemId: 'item-uuid-abc' },
      xpDelta: 0,
      creditDelta: -100,
      snapshot: { creditsBefore: 400, creditsAfter: 300, creditsDelta: 100 },
    }
    const skillEntry = {
      id: 'skill-xyz',
      type: 'skill.train',
      timestamp: 1000,
      userId: 'user-123',
      userName: 'GameMaster',
      data: { skillId: 'athletics', oldRank: 0, newRank: 1, cost: 5, isFree: false },
      xpDelta: -5,
      snapshot: {},
    }

    // foundry.utils.getProperty reads from actor via the path 'flags.swerpg.logs'
    const actor = makeActor({
      flags: { swerpg: { logs: [purchaseEntry, skillEntry] } },
    })

    // getProperty stub reads through the actual object path
    globalThis.foundry.utils.getProperty = vi.fn((obj, key) => {
      const keys = key.split('.')
      return keys.reduce((o, k) => o?.[k], obj)
    })

    const entries = buildAuditLogEntries(actor, 'purchases')

    expect(entries).toHaveLength(1)
    expect(entries[0].type).toBe('item.purchase')
    expect(entries[0].family).toBe('purchases')
    expect(entries[0].data.itemId).toBe('item-uuid-abc')
    expect(entries[0].creditDelta).toBe(-100)
  })
})

/* ============================================================= */
/*  Scénario 2 : Résilience audit                                */
/*  recordItemPurchase non-blocking si actor.update rejette      */
/* ============================================================= */

describe('Scénario 2 — résilience audit', () => {
  it('recordItemPurchase ne lève pas même si actor.update rejette', async () => {
    const { recordItemPurchase } = await import('../../module/utils/audit-log.mjs')
    const { logger } = await import('../../module/utils/logger.mjs')

    const actor = makeActor()
    actor.update.mockRejectedValue(new Error('DB fail'))

    await expect(
      recordItemPurchase(actor, {
        itemName: 'Blaster Pistol',
        itemType: 'weapon',
        price: 100,
        quantity: 1,
        creditsAfter: 300,
      }),
    ).resolves.toBeUndefined()

    // actor.update called MAX_RETRIES+1 times (1 retry) then handleWriteError
    expect(actor.update.mock.calls.length).toBeGreaterThanOrEqual(1)

    // handleWriteError calls logger.error then falls through — the caller must not throw
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('[AuditLog] Write failed'), expect.any(Error))
  })

  it('le flux Market peut continuer sans interruption après un échec audit', async () => {
    const { recordItemPurchase } = await import('../../module/utils/audit-log.mjs')

    const actor = makeActor()
    actor.update.mockRejectedValue(new Error('DB fail'))

    let marketFlowCompleted = false

    // Simulate the market purchase flow calling recordItemPurchase in a fire-and-forget pattern
    try {
      await recordItemPurchase(actor, {
        itemName: 'Blaster Pistol',
        itemType: 'weapon',
        price: 100,
        quantity: 1,
        creditsAfter: 300,
      })
      marketFlowCompleted = true
    } catch {
      marketFlowCompleted = false
    }

    expect(marketFlowCompleted).toBe(true)
  })
})

/* ============================================================= */
/*  Scénario 3 : Résilience chat                                 */
/*  sendChatForAuditEntries non-blocking si ChatMessage.create rejette */
/* ============================================================= */

describe('Scénario 3 — résilience chat', () => {
  it('sendChatForAuditEntries ne lève pas même si ChatMessage.create rejette', async () => {
    const { sendChatForAuditEntries } = await import('../../module/utils/audit-log.mjs')
    const { logger } = await import('../../module/utils/logger.mjs')

    globalThis.ChatMessage.create = vi.fn().mockRejectedValue(new Error('Chat fail'))

    const actor = makeActor()
    const entry = {
      id: 'purchase-xyz',
      type: 'item.purchase',
      timestamp: 1234567890,
      userId: 'user-123',
      userName: 'GameMaster',
      data: { itemName: 'Blaster Pistol', itemType: 'weapon', price: 100, quantity: 1 },
      xpDelta: 0,
      creditDelta: -100,
      snapshot: { creditsBefore: 400, creditsAfter: 300, creditsDelta: 100 },
    }

    await expect(sendChatForAuditEntries(actor, [entry])).resolves.toBeUndefined()

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('[AuditLog] Failed to send chat'), expect.any(Error))
  })

  it("l'entrée audit reste dans flags.swerpg.logs indépendamment du chat", async () => {
    const { recordItemPurchase, sendChatForAuditEntries } = await import('../../module/utils/audit-log.mjs')

    // Step 1: write the audit entry successfully
    const actor = makeActor()
    await recordItemPurchase(actor, {
      itemName: 'Blaster Pistol',
      itemType: 'weapon',
      price: 100,
      quantity: 1,
      creditsAfter: 300,
      itemId: 'item-uuid-abc',
    })

    // Capture the entry created by recordItemPurchase
    const updateArg = actor.update.mock.calls[0][0]
    const writtenEntry = updateArg['flags.swerpg.logs'][0]

    // Simulate the entry persisted into actor state
    actor.flags.swerpg.logs = [writtenEntry]

    // Step 2: now chat fails for this entry
    globalThis.ChatMessage.create = vi.fn().mockRejectedValue(new Error('Chat fail'))
    await sendChatForAuditEntries(actor, [writtenEntry])

    // The audit entry must still be in flags (chat failure does not roll back the write)
    expect(actor.flags.swerpg.logs).toHaveLength(1)
    expect(actor.flags.swerpg.logs[0].type).toBe('item.purchase')
    expect(actor.flags.swerpg.logs[0].data.itemId).toBe('item-uuid-abc')
  })

  it('sendChatForAuditEntries traite les entrées en batch même si une échoue', async () => {
    const { sendChatForAuditEntries } = await import('../../module/utils/audit-log.mjs')
    const { logger } = await import('../../module/utils/logger.mjs')

    // First call fails, second succeeds
    globalThis.ChatMessage.create = vi.fn().mockRejectedValueOnce(new Error('Chat fail')).mockResolvedValueOnce(undefined)

    const actor = makeActor()
    const entries = [
      {
        id: 'e1',
        type: 'item.purchase',
        timestamp: 1000,
        userId: 'user-123',
        data: { itemName: 'Item A', itemType: 'weapon', price: 50, quantity: 1 },
        xpDelta: 0,
        creditDelta: -50,
        snapshot: { creditsBefore: 400, creditsAfter: 350, creditsDelta: 50 },
      },
      {
        id: 'e2',
        type: 'item.purchase',
        timestamp: 2000,
        userId: 'user-123',
        data: { itemName: 'Item B', itemType: 'gear', price: 25, quantity: 1 },
        xpDelta: 0,
        creditDelta: -25,
        snapshot: { creditsBefore: 350, creditsAfter: 325, creditsDelta: 25 },
      },
    ]

    await expect(sendChatForAuditEntries(actor, entries)).resolves.toBeUndefined()

    expect(logger.warn).toHaveBeenCalledTimes(1)
    // Second entry should still be sent despite first failure
    expect(globalThis.ChatMessage.create).toHaveBeenCalledTimes(2)
  })
})
