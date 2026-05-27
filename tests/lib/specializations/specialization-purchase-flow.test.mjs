import { describe, it, expect } from 'vitest'

import { evaluateSpecializationPurchase } from '../../../module/lib/specializations/specialization-purchase-flow.mjs'

/**
 *
 * @param specializations
 */
function buildActor(specializations = []) {
  return {
    system: {
      details: {
        specializations: new Set(specializations),
      },
    },
  }
}

/**
 *
 * @param root0
 * @param root0.specializationId
 * @param root0.name
 * @param root0.isUniversal
 */
function buildCandidateItem({ specializationId, name, isUniversal } = {}) {
  return {
    name: name ?? 'Test Spec',
    system: {
      specializationId: specializationId ?? null,
      isUniversal: isUniversal ?? false,
    },
  }
}

describe('specialization-purchase-flow', () => {
  describe('evaluateSpecializationPurchase', () => {
    it('returns free-add when moving from 0 to 1 specialization', () => {
      const actor = buildActor([])
      const item = buildCandidateItem({ name: 'Scoundrel' })
      const career = { specializations: [] }

      const result = evaluateSpecializationPurchase({ actor, candidateItem: item, career, xpAvailable: 0 })

      expect(result.decision).toBe('free-add')
      expect(result.cost.finalCost).toBe(0)
      expect(result.cost.ownedCountBefore).toBe(0)
      expect(result.cost.ownedCountAfter).toBe(1)
    })

    it('returns blocked-duplicate when specializationId matches', () => {
      const actor = buildActor([{ specializationId: 'scoundrel', name: 'Scoundrel' }])
      const item = buildCandidateItem({ specializationId: 'scoundrel', name: 'Scoundrel' })
      const career = { specializations: [] }

      const result = evaluateSpecializationPurchase({ actor, candidateItem: item, career, xpAvailable: 100 })

      expect(result.decision).toBe('blocked-duplicate')
      expect(result.messageKey).toBe('SPECIALIZATION.PURCHASE.DUPLICATE')
    })

    it('returns blocked-duplicate when name matches without specializationId', () => {
      const actor = buildActor([{ name: 'Scoundrel' }])
      const item = buildCandidateItem({ name: 'Scoundrel' })
      const career = { specializations: [] }

      const result = evaluateSpecializationPurchase({ actor, candidateItem: item, career, xpAvailable: 100 })

      expect(result.decision).toBe('blocked-duplicate')
    })

    it('returns blocked-insufficient-xp when XP is not enough for paid specialization', () => {
      const actor = buildActor([{ specializationId: 'scoundrel', name: 'Scoundrel' }])
      const item = buildCandidateItem({ specializationId: 'pilot', name: 'Pilot' })
      const career = { specializations: [{ specializationId: 'pilot' }] }

      const result = evaluateSpecializationPurchase({ actor, candidateItem: item, career, xpAvailable: 5 })

      expect(result.decision).toBe('blocked-insufficient-xp')
      expect(result.cost.finalCost).toBe(20)
      expect(result.xpAvailable).toBe(5)
      expect(result.messageKey).toBe('SPECIALIZATION.PURCHASE.INSUFFICIENT_XP')
    })

    it('returns confirm-required when XP is sufficient for paid career specialization', () => {
      const actor = buildActor([{ specializationId: 'scoundrel', name: 'Scoundrel' }])
      const item = buildCandidateItem({ specializationId: 'pilot', name: 'Pilot' })
      const career = { specializations: [{ specializationId: 'scoundrel' }, { specializationId: 'pilot' }] }

      const result = evaluateSpecializationPurchase({ actor, candidateItem: item, career, xpAvailable: 50 })

      expect(result.decision).toBe('confirm-required')
      expect(result.cost.finalCost).toBe(20)
      expect(result.cost.isCareerOrUniversal).toBe(true)
      expect(result.xpAvailable).toBe(50)
      expect(result.xpRemaining).toBe(30)
    })

    it('returns confirm-required with correct cost for non-career specialization', () => {
      const actor = buildActor([{ specializationId: 'scoundrel', name: 'Scoundrel' }])
      const item = buildCandidateItem({ name: 'Mercenary Soldier' })
      const career = { specializations: [{ specializationId: 'scoundrel' }] }

      const result = evaluateSpecializationPurchase({ actor, candidateItem: item, career, xpAvailable: 50 })

      expect(result.decision).toBe('confirm-required')
      expect(result.cost.finalCost).toBe(30)
      expect(result.cost.isCareerOrUniversal).toBe(false)
      expect(result.cost.nonCareerPenalty).toBe(10)
      expect(result.xpRemaining).toBe(20)
    })

    it('treats universal specializations as career for cost', () => {
      const actor = buildActor([{ specializationId: 'scoundrel', name: 'Scoundrel' }])
      const item = buildCandidateItem({ name: 'Sharpshooter', isUniversal: true })
      const career = { specializations: [{ specializationId: 'scoundrel' }] }

      const result = evaluateSpecializationPurchase({ actor, candidateItem: item, career, xpAvailable: 50 })

      expect(result.decision).toBe('confirm-required')
      expect(result.cost.finalCost).toBe(20)
      expect(result.cost.isCareerOrUniversal).toBe(true)
      expect(result.cost.nonCareerPenalty).toBe(0)
    })

    it('accepts candidateItem without system.specializationId', () => {
      const actor = buildActor([])
      const item = { name: 'No Id Spec', system: {} }
      const career = { specializations: [] }

      const result = evaluateSpecializationPurchase({ actor, candidateItem: item, career, xpAvailable: 0 })

      expect(result.decision).toBe('free-add')
      expect(result.specializationName).toBe('No Id Spec')
    })
  })
})
