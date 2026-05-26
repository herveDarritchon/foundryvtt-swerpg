import { describe, expect, test } from 'vitest'

import SwerpgCharacter from '../../module/models/character.mjs'

/**
 * Build a minimal SwerpgCharacter data payload.
 *
 * @param {object} [overrides]
 * @param {object|null} [overrides.species] - Species data embedded in details.
 * @param {number} [overrides.brawn] - Base brawn rank value.
 * @param {number} [overrides.willpower] - Base willpower rank value.
 * @returns {object} Plain data object suitable for `new SwerpgCharacter(data)`.
 */
function buildCharacterData({ species = null, brawn = 2, willpower = 2 } = {}) {
  const makeRank = (base) => ({ base, trained: 0, bonus: 0, value: base })

  return {
    progression: {
      freeSkillRanks: {
        career: { id: '', name: '', spent: 0, gained: 0 },
        specialization: { id: '', name: '', spent: 0, gained: 0 },
      },
      experience: { spent: 0, gained: 0, startingExperience: 0 },
    },
    details: {
      species,
      career: {},
      specializations: new Set(),
    },
    characteristics: {
      brawn: { rank: makeRank(brawn) },
      agility: { rank: makeRank(2) },
      intellect: { rank: makeRank(2) },
      cunning: { rank: makeRank(2) },
      willpower: { rank: makeRank(willpower) },
      presence: { rank: makeRank(2) },
    },
    // Include all resource pools accessed during _prepareResources and _prepareDerivedAttributes
    // so that preparation methods can run without crashing on undefined references.
    resources: {
      action: { value: 0, threshold: 0 },
      wounds: { value: 0, threshold: 0 },
      strain: { value: 0, threshold: 0 },
      encumbrance: { value: 0, threshold: 0 },
    },
    skills: {},
    movement: { sizeBonus: 0, strideBonus: 0, engagementBonus: 0 },
    status: {},
  }
}

/**
 * Minimal species data mirroring the fields read by
 * `_getWoundThresholdBonus` and `_getStrainThresholdBonus`.
 *
 * @param {number} woundModifier
 * @param {number} strainModifier
 * @param {object} [characteristics] - Per-characteristic base values used during #prepareSpecies.
 *   Defaults to 2 for all characteristics when not supplied.
 * @returns {object}
 */
function buildSpecies(woundModifier, strainModifier, characteristics = {}) {
  const baseCharacteristics = {
    brawn: 2,
    agility: 2,
    intellect: 2,
    cunning: 2,
    willpower: 2,
    presence: 2,
    ...characteristics,
  }
  return {
    characteristics: baseCharacteristics,
    freeSkills: new Set(),
    startingExperience: 0,
    woundThreshold: { modifier: woundModifier },
    strainThreshold: { modifier: strainModifier },
  }
}

/**
 * Minimal mock parent sufficient for `_prepareResources` and `prepareDerivedData`.
 * Provides the actor-level properties accessed during derived data preparation.
 *
 * @returns {object}
 */
function buildMockParent() {
  return {
    isIncapacitated: false,
    isWeakened: false,
    statuses: new Set(),
    callActorHooks: () => {},
    isL0: false,
    items: [],
    type: 'character',
  }
}

describe('SwerpgCharacter — threshold bonus methods', () => {
  describe('_getWoundThresholdBonus', () => {
    test('returns species woundThreshold modifier when species is set', () => {
      const character = new SwerpgCharacter(buildCharacterData({ species: buildSpecies(10, 0) }))
      expect(character._getWoundThresholdBonus()).toBe(10)
    })

    test('returns 0 when species is null', () => {
      const character = new SwerpgCharacter(buildCharacterData({ species: null }))
      expect(character._getWoundThresholdBonus()).toBe(0)
    })

    test('returns 0 when species has no woundThreshold', () => {
      const character = new SwerpgCharacter(buildCharacterData({ species: { characteristics: {}, freeSkills: new Set(), startingExperience: 0 } }))
      expect(character._getWoundThresholdBonus()).toBe(0)
    })
  })

  describe('_getStrainThresholdBonus', () => {
    test('returns species strainThreshold modifier when species is set', () => {
      const character = new SwerpgCharacter(buildCharacterData({ species: buildSpecies(0, 8) }))
      expect(character._getStrainThresholdBonus()).toBe(8)
    })

    test('returns 0 when species is null', () => {
      const character = new SwerpgCharacter(buildCharacterData({ species: null }))
      expect(character._getStrainThresholdBonus()).toBe(0)
    })

    test('returns 0 when species has no strainThreshold', () => {
      const character = new SwerpgCharacter(buildCharacterData({ species: { characteristics: {}, freeSkills: new Set(), startingExperience: 0 } }))
      expect(character._getStrainThresholdBonus()).toBe(0)
    })
  })
})

describe('SwerpgCharacter — threshold schema', () => {
  test('defineSchema does not include a thresholds field', () => {
    const schema = SwerpgCharacter.defineSchema()
    expect(schema).not.toHaveProperty('thresholds')
  })
})

describe('SwerpgCharacter — wound threshold calculation contract', () => {
  test('wounds.threshold equals brawn + species woundThreshold modifier', () => {
    // brawn base comes from species.characteristics.brawn (set to 3) after #prepareSpecies
    const species = buildSpecies(10, 0, { brawn: 3 })
    const character = new SwerpgCharacter(buildCharacterData({ species }))
    character.parent = buildMockParent()

    // prepareBaseData populates characteristic rank.value via #prepareSpecies, then
    // _prepareDerivedAttributes reads rank.value and _getWoundThresholdBonus() to set the threshold
    character.prepareBaseData()
    character.prepareDerivedData()

    expect(character.resources.wounds.threshold).toBe(3 + 10)
  })

  test('wounds.threshold equals brawn when species woundThreshold.modifier is 0', () => {
    const species = buildSpecies(0, 0, { brawn: 4 })
    const character = new SwerpgCharacter(buildCharacterData({ species }))
    character.parent = buildMockParent()

    character.prepareBaseData()
    character.prepareDerivedData()

    expect(character.resources.wounds.threshold).toBe(4)
  })

  test('wounds.threshold equals brawn with non-zero strain modifier only', () => {
    // wound modifier is 0 — the strain modifier (5) must not bleed into wound threshold
    const species = buildSpecies(0, 5, { brawn: 2 })
    const character = new SwerpgCharacter(buildCharacterData({ species }))
    character.parent = buildMockParent()

    character.prepareBaseData()
    character.prepareDerivedData()

    expect(character.resources.wounds.threshold).toBe(2)
  })
})

describe('SwerpgCharacter — strain threshold calculation contract', () => {
  test('strain.threshold equals willpower + species strainThreshold modifier', () => {
    // willpower base comes from species.characteristics.willpower (set to 3) after #prepareSpecies
    const species = buildSpecies(0, 8, { willpower: 3 })
    const character = new SwerpgCharacter(buildCharacterData({ species }))
    character.parent = buildMockParent()

    character.prepareBaseData()
    character.prepareDerivedData()

    expect(character.resources.strain.threshold).toBe(3 + 8)
  })

  test('strain.threshold equals willpower when species strainThreshold.modifier is 0', () => {
    const species = buildSpecies(0, 0, { willpower: 4 })
    const character = new SwerpgCharacter(buildCharacterData({ species }))
    character.parent = buildMockParent()

    character.prepareBaseData()
    character.prepareDerivedData()

    expect(character.resources.strain.threshold).toBe(4)
  })

  test('strain.threshold equals willpower with non-zero wound modifier only', () => {
    // strain modifier is 0 — the wound modifier (5) must not bleed into strain threshold
    const species = buildSpecies(5, 0, { willpower: 2 })
    const character = new SwerpgCharacter(buildCharacterData({ species }))
    character.parent = buildMockParent()

    character.prepareBaseData()
    character.prepareDerivedData()

    expect(character.resources.strain.threshold).toBe(2)
  })
})