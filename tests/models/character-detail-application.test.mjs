import { beforeEach, describe, expect, it, vi } from 'vitest'

import SwerpgCharacter from '../../module/models/character.mjs'

/**
 * Regression guard for the delegation contract of the three detail-item
 * application methods in SwerpgCharacter.
 *
 * All three methods must:
 *  - call `this.parent._applyDetailItem(item, options)` exactly once;
 *  - pass `{ canApply: true, canClear: true }` as the common base options.
 *
 * `applySpecialization` additionally merges `{ isCollection: true, collectionKey: 'specializations' }`.
 * `applySpecies` and `applyCareer` pass no extra options beyond the common ones.
 */

/**
 *
 */
function buildCharacterData() {
  const characteristicRank = { base: 1, trained: 0, bonus: 0, value: 1 }

  return {
    progression: {
      freeSkillRanks: {
        career: { id: '', name: '', spent: 0, gained: 0 },
        specialization: { id: '', name: '', spent: 0, gained: 0 },
      },
      experience: { spent: 0, gained: 0, startingExperience: 0 },
    },
    details: {
      species: { characteristics: {}, freeSkills: new Set(), startingExperience: 0 },
      career: {},
      specializations: new Set(),
    },
    characteristics: {
      brawn: { rank: { ...characteristicRank } },
      agility: { rank: { ...characteristicRank } },
      intellect: { rank: { ...characteristicRank } },
      cunning: { rank: { ...characteristicRank } },
      willpower: { rank: { ...characteristicRank } },
      presence: { rank: { ...characteristicRank } },
    },
    skills: {},
    movement: { sizeBonus: 0, strideBonus: 0, engagementBonus: 0 },
    status: {},
  }
}

/**
 *
 */
function buildCharacterWithParent() {
  const character = new SwerpgCharacter(buildCharacterData())
  const applyDetailItem = vi.fn(() => Promise.resolve())
  character.parent = { _applyDetailItem: applyDetailItem }
  return { character, applyDetailItem }
}

describe('SwerpgCharacter — detail item delegation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('applySpecies', () => {
    it('delegates to parent._applyDetailItem with the item', async () => {
      const { character, applyDetailItem } = buildCharacterWithParent()
      const species = { name: 'Human', type: 'species' }

      await character.applySpecies(species)

      expect(applyDetailItem).toHaveBeenCalledOnce()
      expect(applyDetailItem).toHaveBeenCalledWith(species, expect.any(Object))
    })

    it('passes canApply: true and canClear: true as common options', async () => {
      const { character, applyDetailItem } = buildCharacterWithParent()
      const species = { name: 'Human', type: 'species' }

      await character.applySpecies(species)

      const [, options] = applyDetailItem.mock.calls[0]
      expect(options.canApply).toBe(true)
      expect(options.canClear).toBe(true)
    })

    it('does not pass isCollection or collectionKey', async () => {
      const { character, applyDetailItem } = buildCharacterWithParent()
      const species = { name: 'Human', type: 'species' }

      await character.applySpecies(species)

      const [, options] = applyDetailItem.mock.calls[0]
      expect(options.isCollection).toBeUndefined()
      expect(options.collectionKey).toBeUndefined()
    })
  })

  describe('applyCareer', () => {
    it('delegates to parent._applyDetailItem with the item', async () => {
      const { character, applyDetailItem } = buildCharacterWithParent()
      const career = { name: 'Bounty Hunter', type: 'career' }

      await character.applyCareer(career)

      expect(applyDetailItem).toHaveBeenCalledOnce()
      expect(applyDetailItem).toHaveBeenCalledWith(career, expect.any(Object))
    })

    it('passes canApply: true and canClear: true as common options', async () => {
      const { character, applyDetailItem } = buildCharacterWithParent()
      const career = { name: 'Bounty Hunter', type: 'career' }

      await character.applyCareer(career)

      const [, options] = applyDetailItem.mock.calls[0]
      expect(options.canApply).toBe(true)
      expect(options.canClear).toBe(true)
    })

    it('does not pass isCollection or collectionKey', async () => {
      const { character, applyDetailItem } = buildCharacterWithParent()
      const career = { name: 'Bounty Hunter', type: 'career' }

      await character.applyCareer(career)

      const [, options] = applyDetailItem.mock.calls[0]
      expect(options.isCollection).toBeUndefined()
      expect(options.collectionKey).toBeUndefined()
    })
  })

  describe('applySpecialization', () => {
    it('delegates to parent._applyDetailItem with the item', async () => {
      const { character, applyDetailItem } = buildCharacterWithParent()
      const specialization = { name: 'Scoundrel', type: 'specialization' }

      await character.applySpecialization(specialization)

      expect(applyDetailItem).toHaveBeenCalledOnce()
      expect(applyDetailItem).toHaveBeenCalledWith(specialization, expect.any(Object))
    })

    it('passes canApply: true and canClear: true as common options', async () => {
      const { character, applyDetailItem } = buildCharacterWithParent()
      const specialization = { name: 'Scoundrel', type: 'specialization' }

      await character.applySpecialization(specialization)

      const [, options] = applyDetailItem.mock.calls[0]
      expect(options.canApply).toBe(true)
      expect(options.canClear).toBe(true)
    })

    it('passes isCollection: true and collectionKey: "specializations"', async () => {
      const { character, applyDetailItem } = buildCharacterWithParent()
      const specialization = { name: 'Scoundrel', type: 'specialization' }

      await character.applySpecialization(specialization)

      const [, options] = applyDetailItem.mock.calls[0]
      expect(options.isCollection).toBe(true)
      expect(options.collectionKey).toBe('specializations')
    })

    it('passes the full merged options object in a single call', async () => {
      const { character, applyDetailItem } = buildCharacterWithParent()
      const specialization = { name: 'Pilot', type: 'specialization' }

      await character.applySpecialization(specialization)

      expect(applyDetailItem).toHaveBeenCalledWith(specialization, {
        canApply: true,
        canClear: true,
        isCollection: true,
        collectionKey: 'specializations',
      })
    })
  })
})
