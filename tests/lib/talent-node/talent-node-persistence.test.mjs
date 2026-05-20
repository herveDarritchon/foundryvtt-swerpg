import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../module/utils/logger.mjs', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import { logger } from '../../../module/utils/logger.mjs'
import { applyTalentNodePatch } from '../../../module/lib/talent-node/talent-node-persistence.mjs'

function buildActor(overrides = {}) {
  return {
    id: 'actor-001',
    system: {
      progression: {
        talentPurchases: [],
        experience: { gained: 100, spent: 0 },
      },
    },
    update: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function buildPayload(overrides = {}) {
  return {
    specializationId: 'spec-1',
    treeId: 'tree-1',
    treeUuid: null,
    nodeId: 'r1c1',
    talentId: 'talent-parry',
    talentUuid: null,
    cost: 5,
    updatedPurchases: [
      { treeId: 'tree-1', treeUuid: null, nodeId: 'r1c1', talentId: 'talent-parry', talentUuid: null, specializationId: 'spec-1' },
    ],
    updatedSpent: 5,
    ...overrides,
  }
}

describe('applyTalentNodePatch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('happy path', () => {
    it('calls actor.update with both talentPurchases and experience.spent in a single call', async () => {
      const actor = buildActor()
      const payload = buildPayload()

      await applyTalentNodePatch(actor, payload, 'purchase')

      expect(actor.update).toHaveBeenCalledTimes(1)
      expect(actor.update).toHaveBeenCalledWith({
        'system.progression.talentPurchases': payload.updatedPurchases,
        'system.progression.experience.spent': 5,
      })
    })

    it('returns ok=true with the complete purchase entry on success', async () => {
      const actor = buildActor()
      const payload = buildPayload()

      const result = await applyTalentNodePatch(actor, payload, 'purchase')

      expect(result.ok).toBe(true)
      expect(result.purchase).toMatchObject({
        treeId: 'tree-1',
        treeUuid: null,
        nodeId: 'r1c1',
        talentId: 'talent-parry',
        talentUuid: null,
        specializationId: 'spec-1',
        cost: 5,
      })
    })

    it('handles forget action with empty updatedPurchases (XP refunded)', async () => {
      const actor = buildActor({
        system: {
          progression: {
            talentPurchases: [
              { treeId: 'tree-1', treeUuid: null, nodeId: 'r1c1', talentId: 'talent-parry', talentUuid: null, specializationId: 'spec-1' },
            ],
            experience: { gained: 100, spent: 5 },
          },
        },
      })
      const payload = buildPayload({ updatedPurchases: [], updatedSpent: 0 })

      const result = await applyTalentNodePatch(actor, payload, 'forget')

      expect(result.ok).toBe(true)
      expect(actor.update).toHaveBeenCalledWith({
        'system.progression.talentPurchases': [],
        'system.progression.experience.spent': 0,
      })
    })

    it('passes through UUID fields when present', async () => {
      const actor = buildActor()
      const payload = buildPayload({
        treeUuid: 'Item.tree-uuid-001',
        talentUuid: 'Item.talent-uuid-001',
        updatedPurchases: [
          {
            treeId: 'tree-1',
            treeUuid: 'Item.tree-uuid-001',
            nodeId: 'r1c1',
            talentId: 'talent-parry',
            talentUuid: 'Item.talent-uuid-001',
            specializationId: 'spec-1',
          },
        ],
      })

      const result = await applyTalentNodePatch(actor, payload, 'purchase')

      expect(result.ok).toBe(true)
      expect(result.purchase.treeUuid).toBe('Item.tree-uuid-001')
      expect(result.purchase.talentUuid).toBe('Item.talent-uuid-001')
    })

    it('emits a debug log entry on success', async () => {
      const actor = buildActor()
      const payload = buildPayload()

      await applyTalentNodePatch(actor, payload, 'purchase')

      expect(logger.debug).toHaveBeenCalledWith(
        '[TalentNodePersistence] Patch applied',
        expect.objectContaining({
          action: 'purchase',
          actorId: 'actor-001',
          nodeId: 'r1c1',
          specializationId: 'spec-1',
          updatedSpent: 5,
        }),
      )
    })
  })

  describe('guard clauses — no actor.update emitted', () => {
    it('returns ok=false when actor is null', async () => {
      const payload = buildPayload()

      const result = await applyTalentNodePatch(null, payload, 'purchase')

      expect(result.ok).toBe(false)
      expect(result.reasonCode).toBe('node-invalid')
      expect(result.reason).toContain('Missing actor')
    })

    it('returns ok=false when payload is null', async () => {
      const actor = buildActor()

      const result = await applyTalentNodePatch(actor, null, 'purchase')

      expect(result.ok).toBe(false)
      expect(result.reasonCode).toBe('node-invalid')
      expect(result.reason).toContain('Missing payload')
      expect(actor.update).not.toHaveBeenCalled()
    })

    it('emits a warn log when actor is missing', async () => {
      await applyTalentNodePatch(null, buildPayload(), 'purchase')

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('[TalentNodePersistence]'))
    })

    it('emits a warn log when payload is missing', async () => {
      const actor = buildActor()
      await applyTalentNodePatch(actor, null, 'purchase')

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('[TalentNodePersistence]'))
    })
  })

  describe('patch structure invariants', () => {
    it('always issues exactly one actor.update per call', async () => {
      const actor = buildActor()
      const payload = buildPayload()

      await applyTalentNodePatch(actor, payload, 'purchase')

      expect(actor.update).toHaveBeenCalledTimes(1)
    })

    it('the patch contains both progression and XP keys', async () => {
      const actor = buildActor()
      const payload = buildPayload()

      await applyTalentNodePatch(actor, payload, 'purchase')

      const [patchArg] = actor.update.mock.calls[0]
      expect(patchArg).toHaveProperty('system.progression.talentPurchases')
      expect(patchArg).toHaveProperty('system.progression.experience.spent')
    })
  })
})