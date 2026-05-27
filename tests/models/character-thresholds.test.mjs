import { describe, expect, test } from 'vitest'

import SwerpgCharacter from '../../module/models/character.mjs'

/**
 * Build a minimal SwerpgCharacter data payload.
 *
 * @param {object} [overrides]
 * @param {object|null} [overrides.species] Species data embedded in details.
 * @param {number} [overrides.brawn] Base brawn rank value.
 * @param {number} [overrides.willpower] Base willpower rank value.
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
 * @param {object} [characteristics] Per-characteristic base values used during #prepareSpecies.
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

/**
 * Tests for the species additive bonus methods.
 *
 * These methods return a *partial additive contribution* from the species formula,
 * not the final threshold. The final absolute values live in
 * `resources.wounds.threshold` and `resources.strain.threshold` respectively.
 * See the "threshold calculation contract" suites below for the end-to-end flow.
 */
describe('SwerpgCharacter — species additive bonus methods', () => {
  describe('_getWoundThresholdBonus — returns the species additive wound bonus (not the final threshold)', () => {
    test('returns species woundThreshold.modifier as the additive bonus when species is set', () => {
      const character = new SwerpgCharacter(buildCharacterData({ species: buildSpecies(10, 0) }))
      expect(character._getWoundThresholdBonus()).toBe(10)
    })

    test('returns 0 (no bonus) when species is null', () => {
      const character = new SwerpgCharacter(buildCharacterData({ species: null }))
      expect(character._getWoundThresholdBonus()).toBe(0)
    })

    test('returns 0 (no bonus) when species has no woundThreshold field', () => {
      const character = new SwerpgCharacter(buildCharacterData({ species: { characteristics: {}, freeSkills: new Set(), startingExperience: 0 } }))
      expect(character._getWoundThresholdBonus()).toBe(0)
    })
  })

  describe('_getStrainThresholdBonus — returns the species additive strain bonus (not the final threshold)', () => {
    test('returns species strainThreshold.modifier as the additive bonus when species is set', () => {
      const character = new SwerpgCharacter(buildCharacterData({ species: buildSpecies(0, 8) }))
      expect(character._getStrainThresholdBonus()).toBe(8)
    })

    test('returns 0 (no bonus) when species is null', () => {
      const character = new SwerpgCharacter(buildCharacterData({ species: null }))
      expect(character._getStrainThresholdBonus()).toBe(0)
    })

    test('returns 0 (no bonus) when species has no strainThreshold field', () => {
      const character = new SwerpgCharacter(buildCharacterData({ species: { characteristics: {}, freeSkills: new Set(), startingExperience: 0 } }))
      expect(character._getStrainThresholdBonus()).toBe(0)
    })
  })
})

describe('SwerpgCharacter — schema contract: no intermediate thresholds field', () => {
  test('defineSchema does not expose a thresholds field — species bonuses and final thresholds are distinct', () => {
    // The Character model has no intermediate `thresholds.wounds` or `thresholds.strain` field.
    // Species additive bonuses feed _getWoundThresholdBonus()/_getStrainThresholdBonus(),
    // which combine with characteristic ranks to produce resources.wounds.threshold / resources.strain.threshold.
    const schema = SwerpgCharacter.defineSchema()
    expect(schema).not.toHaveProperty('thresholds')
  })
})

/**
 * End-to-end contract tests for `resources.wounds.threshold`.
 *
 * The final wound threshold is the absolute value exposed to the rest of the
 * system. It is distinct from the species additive bonus
 * (`details.species.woundThreshold.modifier`) which is only a partial input.
 *
 * Formula: resources.wounds.threshold = brawn rank + _getWoundThresholdBonus()
 *   where _getWoundThresholdBonus() = details.species.woundThreshold.modifier
 */
describe('SwerpgCharacter — final wound threshold calculation (resources.wounds.threshold)', () => {
  test('final wound threshold = brawn rank + species additive wound bonus', () => {
    // brawn base comes from species.characteristics.brawn (set to 3) after #prepareSpecies.
    // The species wound bonus (10) is additive — resources.wounds.threshold is the sum, not the bonus alone.
    const species = buildSpecies(10, 0, { brawn: 3 })
    const character = new SwerpgCharacter(buildCharacterData({ species }))
    character.parent = buildMockParent()

    // prepareBaseData populates characteristic rank.value via #prepareSpecies, then
    // prepareDerivedData calls _prepareDerivedAttributes which reads rank.value and
    // _getWoundThresholdBonus() to write the final absolute threshold.
    character.prepareBaseData()
    character.prepareDerivedData()

    expect(character.resources.wounds.threshold).toBe(3 + 10)
  })

  test('final wound threshold = brawn rank when species wound bonus is 0', () => {
    const species = buildSpecies(0, 0, { brawn: 4 })
    const character = new SwerpgCharacter(buildCharacterData({ species }))
    character.parent = buildMockParent()

    character.prepareBaseData()
    character.prepareDerivedData()

    expect(character.resources.wounds.threshold).toBe(4)
  })

  test('species strain bonus does not bleed into the final wound threshold', () => {
    // wound bonus is 0 — the strain bonus (5) must not affect resources.wounds.threshold
    const species = buildSpecies(0, 5, { brawn: 2 })
    const character = new SwerpgCharacter(buildCharacterData({ species }))
    character.parent = buildMockParent()

    character.prepareBaseData()
    character.prepareDerivedData()

    expect(character.resources.wounds.threshold).toBe(2)
  })
})

/**
 * End-to-end contract tests for `resources.strain.threshold`.
 *
 * The final strain threshold is the absolute value exposed to the rest of the
 * system. It is distinct from the species additive bonus
 * (`details.species.strainThreshold.modifier`) which is only a partial input.
 *
 * Formula: resources.strain.threshold = willpower rank + _getStrainThresholdBonus()
 *   where _getStrainThresholdBonus() = details.species.strainThreshold.modifier
 */
describe('SwerpgCharacter — final strain threshold calculation (resources.strain.threshold)', () => {
  test('final strain threshold = willpower rank + species additive strain bonus', () => {
    // willpower base comes from species.characteristics.willpower (set to 3) after #prepareSpecies.
    // The species strain bonus (8) is additive — resources.strain.threshold is the sum, not the bonus alone.
    const species = buildSpecies(0, 8, { willpower: 3 })
    const character = new SwerpgCharacter(buildCharacterData({ species }))
    character.parent = buildMockParent()

    character.prepareBaseData()
    character.prepareDerivedData()

    expect(character.resources.strain.threshold).toBe(3 + 8)
  })

  test('final strain threshold = willpower rank when species strain bonus is 0', () => {
    const species = buildSpecies(0, 0, { willpower: 4 })
    const character = new SwerpgCharacter(buildCharacterData({ species }))
    character.parent = buildMockParent()

    character.prepareBaseData()
    character.prepareDerivedData()

    expect(character.resources.strain.threshold).toBe(4)
  })

  test('species wound bonus does not bleed into the final strain threshold', () => {
    // strain bonus is 0 — the wound bonus (5) must not affect resources.strain.threshold
    const species = buildSpecies(5, 0, { willpower: 2 })
    const character = new SwerpgCharacter(buildCharacterData({ species }))
    character.parent = buildMockParent()

    character.prepareBaseData()
    character.prepareDerivedData()

    expect(character.resources.strain.threshold).toBe(2)
  })
})
