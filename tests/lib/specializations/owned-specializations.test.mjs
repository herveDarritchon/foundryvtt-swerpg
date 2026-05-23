import { describe, it, expect } from 'vitest'

import {
  getOwnedSpecializations,
  normalizeSpecialization,
  isCareerSpecialization,
  isUniversalSpecialization,
  isTreatedAsCareerForCost,
} from '../../../module/lib/specializations/owned-specializations.mjs'

describe('owned-specializations', () => {
  describe('normalizeSpecialization', () => {
    it('normalizes a complete specialization entry', () => {
      const raw = {
        specializationId: 'pilot',
        treeUuid: 'Item.tree-pilot',
        name: 'Pilot',
        img: 'systems/swerpg/assets/icons/pilot.png',
        system: { specializationSkills: [{ id: 'piloting' }], freeSkillRank: 4 },
      }

      const result = normalizeSpecialization(raw)

      expect(result).toMatchObject({
        specializationId: 'pilot',
        treeUuid: 'Item.tree-pilot',
        name: 'Pilot',
        img: 'systems/swerpg/assets/icons/pilot.png',
        system: expect.objectContaining({ freeSkillRank: 4 }),
      })
    })

    it('handles partial specialization entries with defaults', () => {
      const raw = { name: 'Gunner' }

      const result = normalizeSpecialization(raw)

      expect(result).toMatchObject({
        specializationId: null,
        treeUuid: null,
        name: 'Gunner',
        img: null,
      })
    })

    it('returns null for null/undefined input', () => {
      expect(normalizeSpecialization(null)).toBeNull()
      expect(normalizeSpecialization(undefined)).toBeNull()
    })
  })

  describe('getOwnedSpecializations', () => {
    it('extracts specializations from actor structure', () => {
      const actor = {
        system: {
          details: {
            specializations: new Set([
              { specializationId: 'spec-1', name: 'Spec 1' },
              { specializationId: 'spec-2', name: 'Spec 2' },
            ]),
          },
        },
      }

      const snapshot = getOwnedSpecializations(actor)

      expect(snapshot.count).toBe(2)
      expect(snapshot.items).toHaveLength(2)
      expect(snapshot.items[0].specializationId).toBe('spec-1')
    })

    it('handles missing specializations gracefully', () => {
      const actor1 = { system: { details: {} } }
      const actor2 = { system: {} }
      const actor3 = {}
      const actor4 = null

      expect(getOwnedSpecializations(actor1).count).toBe(0)
      expect(getOwnedSpecializations(actor2).count).toBe(0)
      expect(getOwnedSpecializations(actor3).count).toBe(0)
      expect(getOwnedSpecializations(actor4).count).toBe(0)
    })
  })

  describe('isCareerSpecialization', () => {
    it('returns false when either parameter is null/undefined', () => {
      const spec = { specializationId: 'pilot', name: 'Pilot' }
      const career = { name: 'Ace', specializations: [{ specializationId: 'pilot' }] }

      expect(isCareerSpecialization(null, career)).toBe(false)
      expect(isCareerSpecialization(undefined, career)).toBe(false)
      expect(isCareerSpecialization(spec, null)).toBe(false)
      expect(isCareerSpecialization(spec, undefined)).toBe(false)
    })

    it('returns true when specializationId matches career specialization', () => {
      const spec = { specializationId: 'pilot', name: 'Pilot' }
      const career = {
        name: 'Ace',
        specializations: [{ specializationId: 'pilot' }, { specializationId: 'gunner' }],
      }

      expect(isCareerSpecialization(spec, career)).toBe(true)
    })

    it('returns true when name matches career specialization', () => {
      const spec = { name: 'Pilot' } // no specializationId
      const career = {
        name: 'Ace',
        specializations: [{ name: 'Pilot' }, { name: 'Gunner' }],
      }

      expect(isCareerSpecialization(spec, career)).toBe(true)
    })

    it('returns false when no match found', () => {
      const spec = { specializationId: 'medic', name: 'Medic' }
      const career = {
        name: 'Ace',
        specializations: [{ specializationId: 'pilot' }],
      }

      expect(isCareerSpecialization(spec, career)).toBe(false)
    })

    it('returns false when career has no specializations list', () => {
      const spec = { specializationId: 'pilot', name: 'Pilot' }
      const career = { name: 'Ace' } // no specializations field

      expect(isCareerSpecialization(spec, career)).toBe(false)
    })
  })

  describe('isUniversalSpecialization', () => {
    it('returns false for null/undefined input', () => {
      expect(isUniversalSpecialization(null)).toBe(false)
      expect(isUniversalSpecialization(undefined)).toBe(false)
    })

    it('returns true when system.isUniversal is true', () => {
      const spec1 = { system: { isUniversal: true } }
      const spec2 = { isUniversal: true } // top-level

      expect(isUniversalSpecialization(spec1)).toBe(true)
      expect(isUniversalSpecialization(spec2)).toBe(true)
    })

    it('returns true when specializationId starts with "universal-"', () => {
      const spec = { specializationId: 'universal-sharpshooter', name: 'Sharpshooter' }

      expect(isUniversalSpecialization(spec)).toBe(true)
    })

    it('returns true when name contains "universal" (case insensitive)', () => {
      const spec1 = { name: 'Universal Tech' }
      const spec2 = { name: 'UNIVERSAL Leader' }
      const spec3 = { name: 'universal' }

      expect(isUniversalSpecialization(spec1)).toBe(true)
      expect(isUniversalSpecialization(spec2)).toBe(true)
      expect(isUniversalSpecialization(spec3)).toBe(true)
    })

    it('returns false for regular specializations', () => {
      const spec1 = { specializationId: 'pilot', name: 'Pilot' }
      const spec2 = { specializationId: 'gunner', name: 'Gunner' }
      const spec3 = { name: 'Medic' }

      expect(isUniversalSpecialization(spec1)).toBe(false)
      expect(isUniversalSpecialization(spec2)).toBe(false)
      expect(isUniversalSpecialization(spec3)).toBe(false)
    })
  })

  describe('isTreatedAsCareerForCost', () => {
    it('returns true for career specializations', () => {
      const spec = { specializationId: 'pilot', name: 'Pilot' }
      const career = { specializations: [{ specializationId: 'pilot' }] }

      expect(isTreatedAsCareerForCost(spec, career)).toBe(true)
    })

    it('returns true for universal specializations (even without career match)', () => {
      const spec = { specializationId: 'universal-tech', name: 'Universal Tech' }
      const career = { specializations: [{ specializationId: 'pilot' }] } // no match in career

      expect(isTreatedAsCareerForCost(spec, career)).toBe(true)
    })

    it('returns false for non-career, non-universal specializations', () => {
      const spec = { specializationId: 'medic', name: 'Medic' }
      const career = { specializations: [{ specializationId: 'pilot' }] }

      expect(isTreatedAsCareerForCost(spec, career)).toBe(false)
    })
  })
})
