import { describe, expect, test } from 'vitest'

import SwerpgCharacter from '../../module/models/character.mjs'

/**
 *
 * @param root0
 * @param root0.specializations
 */
function buildCharacterData({ specializations = new Set() } = {}) {
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
      specializations,
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

describe('SwerpgCharacter — owned specializations', () => {
  describe('schema', () => {
    test('specializations include specializationId and treeUuid references', () => {
      const specializationSchema = SwerpgCharacter.defineSchema().details.schema.specializations.field.schema

      expect(specializationSchema.specializationId).toBeInstanceOf(foundry.data.fields.StringField)
      expect(specializationSchema.specializationId.config.required).toBe(false)
      expect(specializationSchema.specializationId.config.blank).toBe(false)

      expect(specializationSchema.treeUuid).toBeInstanceOf(foundry.data.fields.DocumentUUIDField)
      expect(specializationSchema.treeUuid.config.required).toBe(false)
      expect(specializationSchema.treeUuid.config.type).toBe('Item')
    })

    test('details.specializations is a SetField with required:true, nullable:false, and initial:[]', () => {
      const specializationsField = SwerpgCharacter.defineSchema().details.schema.specializations

      expect(specializationsField).toBeInstanceOf(foundry.data.fields.SetField)
      expect(specializationsField.config.required).toBe(true)
      expect(specializationsField.config.nullable).toBe(false)
      expect(specializationsField.config.initial).toEqual([])
    })
  })

  describe('prepareBaseData', () => {
    test('uses the freeSkillRank of a single specialization', () => {
      const character = new SwerpgCharacter(
        buildCharacterData({
          specializations: new Set([{ name: 'Bodyguard', freeSkillRank: 4 }]),
        }),
      )

      character.prepareBaseData()

      expect(character.progression.freeSkillRanks.specialization.gained).toBe(4)
    })

    test('sums freeSkillRank across all owned specializations', () => {
      const character = new SwerpgCharacter(
        buildCharacterData({
          specializations: new Set([
            { name: 'Bodyguard', freeSkillRank: 4 },
            { name: 'Mercenary Soldier', freeSkillRank: 5 },
          ]),
        }),
      )

      character.prepareBaseData()

      expect(character.progression.freeSkillRanks.specialization.gained).toBe(9)
    })

    test('sets specialization gained ranks to zero when no specialization is owned', () => {
      const character = new SwerpgCharacter(
        buildCharacterData({
          specializations: new Set(),
        }),
      )

      character.prepareBaseData()

      expect(character.progression.freeSkillRanks.specialization.gained).toBe(0)
    })

    test('handles empty specializations without throwing', () => {
      // The SetField contract guarantees a non-null Set; buildCharacterData defaults to new Set()
      const character = new SwerpgCharacter(buildCharacterData())

      expect(() => character.prepareBaseData()).not.toThrow()
      expect(character.progression.freeSkillRanks.specialization.gained).toBe(0)
    })

    test('details.specializations is a non-null Set when initialised with the canonical default', () => {
      // buildCharacterData defaults to new Set(), reflecting the SetField initial:[] contract
      const character = new SwerpgCharacter(buildCharacterData())

      // The Set is always available — no || [] fallback needed in character.mjs
      expect(character.details.specializations).toBeInstanceOf(Set)
      expect(character.details.specializations).not.toBeNull()
      expect(character.details.specializations.size).toBe(0)

      // prepareBaseData must iterate the set directly without any fallback guard
      expect(() => character.prepareBaseData()).not.toThrow()
      expect(character.progression.freeSkillRanks.specialization.gained).toBe(0)
    })
  })
})
