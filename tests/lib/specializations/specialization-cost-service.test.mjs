import { describe, it, expect } from 'vitest'

import { calculateSpecializationCost } from '../../../module/lib/specializations/specialization-cost-service.mjs'

describe('specialization-cost-service', () => {
  describe('calculateSpecializationCost', () => {
    it('returns 0 XP when moving from 0 to 1 specialization', () => {
      const result = calculateSpecializationCost({
        ownedSpecializations: { items: [], count: 0 },
        candidateSpecialization: { specializationId: 'scoundrel', name: 'Scoundrel' },
        career: { specializations: [{ specializationId: 'scoundrel' }] },
      })

      expect(result).toMatchObject({
        baseCost: 0,
        nonCareerPenalty: 0,
        finalCost: 0,
        isCareerOrUniversal: true,
        ownedCountBefore: 0,
        ownedCountAfter: 1,
      })
    })

    it('returns 20 XP for 2nd career specialization (1→2 career)', () => {
      const result = calculateSpecializationCost({
        ownedSpecializations: { items: [{ specializationId: 'scoundrel' }], count: 1 },
        candidateSpecialization: { specializationId: 'pilot', name: 'Pilot' },
        career: { specializations: [{ specializationId: 'scoundrel' }, { specializationId: 'pilot' }] },
      })

      expect(result).toMatchObject({
        baseCost: 20,
        nonCareerPenalty: 0,
        finalCost: 20,
        isCareerOrUniversal: true,
        ownedCountBefore: 1,
        ownedCountAfter: 2,
      })
    })

    it('returns 30 XP for 2nd non-career specialization (1→2 non-career)', () => {
      const result = calculateSpecializationCost({
        ownedSpecializations: { items: [{ specializationId: 'scoundrel' }], count: 1 },
        candidateSpecialization: { specializationId: 'mercenary-soldier', name: 'Mercenary Soldier' },
        career: { specializations: [{ specializationId: 'scoundrel' }] },
      })

      expect(result).toMatchObject({
        baseCost: 20,
        nonCareerPenalty: 10,
        finalCost: 30,
        isCareerOrUniversal: false,
        ownedCountBefore: 1,
        ownedCountAfter: 2,
      })
    })

    it('returns 30 XP for 3rd career specialization (2→3 career)', () => {
      const result = calculateSpecializationCost({
        ownedSpecializations: { items: [{ specializationId: 'scoundrel' }, { specializationId: 'pilot' }], count: 2 },
        candidateSpecialization: { specializationId: 'gunner', name: 'Gunner' },
        career: { specializations: [{ specializationId: 'scoundrel' }, { specializationId: 'pilot' }, { specializationId: 'gunner' }] },
      })

      expect(result).toMatchObject({
        baseCost: 30,
        nonCareerPenalty: 0,
        finalCost: 30,
        isCareerOrUniversal: true,
        ownedCountBefore: 2,
        ownedCountAfter: 3,
      })
    })

    it('returns 40 XP for 3rd non-career specialization (2→3 non-career)', () => {
      const result = calculateSpecializationCost({
        ownedSpecializations: { items: [{ specializationId: 'scoundrel' }, { specializationId: 'pilot' }], count: 2 },
        candidateSpecialization: { specializationId: 'medic', name: 'Medic' },
        career: { specializations: [{ specializationId: 'scoundrel' }, { specializationId: 'pilot' }] },
      })

      expect(result).toMatchObject({
        baseCost: 30,
        nonCareerPenalty: 10,
        finalCost: 40,
        isCareerOrUniversal: false,
        ownedCountBefore: 2,
        ownedCountAfter: 3,
      })
    })

    it('treats universal specializations as career for cost', () => {
      const result = calculateSpecializationCost({
        ownedSpecializations: { items: [{ specializationId: 'scoundrel' }], count: 1 },
        candidateSpecialization: { specializationId: 'universal-sharpshooter', name: 'Sharpshooter' },
        career: { specializations: [{ specializationId: 'scoundrel' }] },
      })

      expect(result).toMatchObject({
        baseCost: 20,
        nonCareerPenalty: 0,
        finalCost: 20,
        isCareerOrUniversal: true,
      })
    })

    it('accepts a plain array as ownedSpecializations', () => {
      const result = calculateSpecializationCost({
        ownedSpecializations: [{ specializationId: 'scoundrel' }, { specializationId: 'pilot' }],
        candidateSpecialization: { specializationId: 'gunner', name: 'Gunner' },
        career: { specializations: [] },
      })

      expect(result.ownedCountBefore).toBe(2)
      expect(result.ownedCountAfter).toBe(3)
    })

    it('defaults count to 0 when ownedSpecializations is missing', () => {
      const result = calculateSpecializationCost({
        ownedSpecializations: null,
        candidateSpecialization: { specializationId: 'scoundrel', name: 'Scoundrel' },
        career: { specializations: [] },
      })

      expect(result.ownedCountBefore).toBe(0)
      expect(result.ownedCountAfter).toBe(1)
      expect(result.finalCost).toBe(10)
      expect(result.isCareerOrUniversal).toBe(false)
    })

    it('returns nonCareerPenalty=10 when candidate is null', () => {
      const result = calculateSpecializationCost({
        ownedSpecializations: { items: [{ specializationId: 'scoundrel' }], count: 1 },
        candidateSpecialization: null,
        career: { specializations: [{ specializationId: 'scoundrel' }] },
      })

      expect(result.isCareerOrUniversal).toBe(false)
      expect(result.nonCareerPenalty).toBe(10)
      expect(result.finalCost).toBe(30)
    })

    it('returns nonCareerPenalty=10 when candidate is undefined', () => {
      const result = calculateSpecializationCost({
        ownedSpecializations: { items: [{ specializationId: 'scoundrel' }], count: 1 },
        candidateSpecialization: undefined,
        career: { specializations: [{ specializationId: 'scoundrel' }] },
      })

      expect(result.isCareerOrUniversal).toBe(false)
      expect(result.nonCareerPenalty).toBe(10)
    })
  })
})
