import { describe, it, expect } from 'vitest'

import {
  evaluateSpecializationPurchase,
  BLOCKED_REASON,
  getBlockedReasonLabelKey,
} from '../../../module/lib/specializations/specialization-purchase-service.mjs'

describe('specialization-purchase-service', () => {
  describe('evaluateSpecializationPurchase', () => {
    it('allows purchase of 1st career specialization at 0 XP', () => {
      const result = evaluateSpecializationPurchase({
        ownedSpecializations: { items: [], count: 0 },
        candidateSpecialization: { specializationId: 'scoundrel', name: 'Scoundrel' },
        career: { specializations: [{ specializationId: 'scoundrel' }] },
        availableXp: 0,
      })

      expect(result.canPurchase).toBe(true)
      expect(result.blockedReasonCode).toBeNull()
      expect(result.costPreview).toMatchObject({
        finalCost: 0,
        baseCost: 0,
        nonCareerPenalty: 0,
        isCareerOrUniversal: true,
      })
      expect(result.isCareerOrUniversal).toBe(true)
    })

    it('allows purchase of 2nd career specialization with enough XP', () => {
      const result = evaluateSpecializationPurchase({
        ownedSpecializations: { items: [{ specializationId: 'scoundrel' }], count: 1 },
        candidateSpecialization: { specializationId: 'pilot', name: 'Pilot' },
        career: { specializations: [{ specializationId: 'scoundrel' }, { specializationId: 'pilot' }] },
        availableXp: 20,
      })

      expect(result.canPurchase).toBe(true)
      expect(result.blockedReasonCode).toBeNull()
      expect(result.costPreview.finalCost).toBe(20)
      expect(result.isCareerOrUniversal).toBe(true)
    })

    it('allows purchase of 2nd non-career specialization with enough XP', () => {
      const result = evaluateSpecializationPurchase({
        ownedSpecializations: { items: [{ specializationId: 'scoundrel' }], count: 1 },
        candidateSpecialization: { specializationId: 'mercenary-soldier', name: 'Mercenary Soldier' },
        career: { specializations: [{ specializationId: 'scoundrel' }] },
        availableXp: 30,
      })

      expect(result.canPurchase).toBe(true)
      expect(result.costPreview.finalCost).toBe(30)
      expect(result.isCareerOrUniversal).toBe(false)
    })

    it('rejects already owned specialization', () => {
      const result = evaluateSpecializationPurchase({
        ownedSpecializations: { items: [{ specializationId: 'scoundrel', name: 'Scoundrel' }], count: 1 },
        candidateSpecialization: { specializationId: 'scoundrel', name: 'Scoundrel' },
        career: { specializations: [{ specializationId: 'scoundrel' }] },
        availableXp: 100,
      })

      expect(result.canPurchase).toBe(false)
      expect(result.blockedReasonCode).toBe(BLOCKED_REASON.ALREADY_OWNED)
      expect(result.costPreview).toBeNull()
    })

    it('rejects owned specialization matched by name when no id', () => {
      const result = evaluateSpecializationPurchase({
        ownedSpecializations: { items: [{ name: 'Scoundrel' }], count: 1 },
        candidateSpecialization: { name: 'Scoundrel' },
        career: { specializations: [] },
        availableXp: 100,
      })

      expect(result.canPurchase).toBe(false)
      expect(result.blockedReasonCode).toBe(BLOCKED_REASON.ALREADY_OWNED)
    })

    it('rejects specialization when XP is insufficient', () => {
      const result = evaluateSpecializationPurchase({
        ownedSpecializations: { items: [{ specializationId: 'scoundrel' }], count: 1 },
        candidateSpecialization: { specializationId: 'pilot', name: 'Pilot' },
        career: { specializations: [{ specializationId: 'scoundrel' }, { specializationId: 'pilot' }] },
        availableXp: 5,
      })

      expect(result.canPurchase).toBe(false)
      expect(result.blockedReasonCode).toBe(BLOCKED_REASON.INSUFFICIENT_XP)
      expect(result.costPreview.finalCost).toBe(20)
    })

    it('rejects null candidate', () => {
      const result = evaluateSpecializationPurchase({
        ownedSpecializations: { items: [], count: 0 },
        candidateSpecialization: null,
        career: null,
        availableXp: 0,
      })

      expect(result.canPurchase).toBe(false)
      expect(result.blockedReasonCode).toBe(BLOCKED_REASON.INVALID_CANDIDATE)
      expect(result.costPreview).toBeNull()
    })

    it('rejects undefined candidate', () => {
      const result = evaluateSpecializationPurchase({
        ownedSpecializations: { items: [], count: 0 },
        candidateSpecialization: undefined,
        career: null,
        availableXp: 0,
      })

      expect(result.canPurchase).toBe(false)
      expect(result.blockedReasonCode).toBe(BLOCKED_REASON.INVALID_CANDIDATE)
    })

    it('treats universal specialization as career for purchase', () => {
      const result = evaluateSpecializationPurchase({
        ownedSpecializations: { items: [{ specializationId: 'scoundrel' }], count: 1 },
        candidateSpecialization: { specializationId: 'universal-sharpshooter', name: 'Sharpshooter' },
        career: { specializations: [{ specializationId: 'scoundrel' }] },
        availableXp: 20,
      })

      expect(result.canPurchase).toBe(true)
      expect(result.costPreview.finalCost).toBe(20)
      expect(result.isCareerOrUniversal).toBe(true)
    })

    it('handles missing availableXp as unable to afford non-free specs', () => {
      const result = evaluateSpecializationPurchase({
        ownedSpecializations: { items: [{ specializationId: 'scoundrel' }], count: 1 },
        candidateSpecialization: { specializationId: 'pilot', name: 'Pilot' },
        career: { specializations: [{ specializationId: 'scoundrel' }, { specializationId: 'pilot' }] },
        availableXp: undefined,
      })

      expect(result.canPurchase).toBe(false)
      expect(result.blockedReasonCode).toBe(BLOCKED_REASON.INSUFFICIENT_XP)
    })

    it('accepts a plain array as ownedSpecializations', () => {
      const result = evaluateSpecializationPurchase({
        ownedSpecializations: [{ specializationId: 'scoundrel' }],
        candidateSpecialization: { specializationId: 'pilot', name: 'Pilot' },
        career: { specializations: [{ specializationId: 'scoundrel' }, { specializationId: 'pilot' }] },
        availableXp: 40,
      })

      expect(result.canPurchase).toBe(true)
      expect(result.costPreview.finalCost).toBe(20)
    })

    it('allows purchase of 1st spec even with 0 XP', () => {
      const result = evaluateSpecializationPurchase({
        ownedSpecializations: { items: [], count: 0 },
        candidateSpecialization: { specializationId: 'scoundrel', name: 'Scoundrel' },
        career: { specializations: [{ specializationId: 'scoundrel' }] },
        availableXp: 0,
      })

      expect(result.canPurchase).toBe(true)
      expect(result.costPreview.finalCost).toBe(0)
    })
  })

  describe('getBlockedReasonLabelKey', () => {
    it('returns i18n key for ALREADY_OWNED', () => {
      expect(getBlockedReasonLabelKey(BLOCKED_REASON.ALREADY_OWNED)).toBe(
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.REASON.ALREADY_PURCHASED',
      )
    })

    it('returns i18n key for INSUFFICIENT_XP', () => {
      expect(getBlockedReasonLabelKey(BLOCKED_REASON.INSUFFICIENT_XP)).toBe(
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.REASON.NOT_ENOUGH_XP',
      )
    })

    it('returns i18n key for INVALID_CANDIDATE', () => {
      expect(getBlockedReasonLabelKey(BLOCKED_REASON.INVALID_CANDIDATE)).toBe(
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.PURCHASE.INVALID_CANDIDATE',
      )
    })

    it('falls back to UNKNOWN for unrecognized code', () => {
      expect(getBlockedReasonLabelKey('unknown.code')).toBe(
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.REASON.UNKNOWN',
      )
    })
  })
})
