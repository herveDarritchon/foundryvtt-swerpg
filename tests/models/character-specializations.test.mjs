import { describe, expect, test } from 'vitest'

import SwerpgCharacter from '../../module/models/character.mjs'

function buildCharacterData({ specializations } = {}) {
  const characteristicRank = { base: 1, trained: 0, bonus: 0, value: 1 }

  return {
    thresholds: { wounds: 0, strain: 0 },
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

    test('handles missing specializations without throwing', () => {
      const character = new SwerpgCharacter(buildCharacterData())

      expect(() => character.prepareBaseData()).not.toThrow()
      expect(character.progression.freeSkillRanks.specialization.gained).toBe(0)
    })
  })

  describe('acquireSpecialization', () => {
    test('should zero out freeSkillRank before persisting', async () => {
      const character = new SwerpgCharacter(buildCharacterData())

      const mockUpdate = { args: null }

      const mockParent = {
        update: (...args) => {
          mockUpdate.args = args
          return Promise.resolve()
        },
      }

      character.parent = mockParent

      character.details.specializations = new Set()

      const fakeItem = {
        toObject: () => ({
          name: 'Pilot',
          img: 'systems/swerpg/assets/pilot.png',
          system: {
            specializationId: 'pilot',
            freeSkillRank: 4,
            specializationSkills: [],
          },
        }),
      }

      await character.acquireSpecialization(fakeItem)

      const [payload, options] = mockUpdate.args
      const specs = payload['system.details.specializations']

      expect(specs).toHaveLength(1)
      expect(specs[0].name).toBe('Pilot')
      expect(specs[0].img).toBe('systems/swerpg/assets/pilot.png')
      expect(specs[0].specializationId).toBe('pilot')
      expect(specs[0].freeSkillRank).toBe(0)

      expect(options).toEqual({ keepEmbeddedIds: true })
    })

    test('includes xpCost in the same update when provided', async () => {
      const character = new SwerpgCharacter(buildCharacterData())

      let capturedUpdate = null
      character.parent = {
        update: (data, options) => {
          capturedUpdate = { data, options }
          return Promise.resolve()
        },
      }

      character.details.specializations = new Set()
      character.progression.experience.spent = 15

      const fakeItem = {
        toObject: () => ({
          name: 'Pilot',
          img: 'systems/swerpg/assets/pilot.png',
          system: {
            specializationId: 'pilot',
            freeSkillRank: 4,
            specializationSkills: [],
          },
        }),
      }

      await character.acquireSpecialization(fakeItem, { xpCost: 20 })

      expect(capturedUpdate.data['system.details.specializations']).toHaveLength(1)
      expect(capturedUpdate.data['system.details.specializations'][0].name).toBe('Pilot')
      expect(capturedUpdate.data['system.details.specializations'][0].freeSkillRank).toBe(0)
      expect(capturedUpdate.data['system.progression.experience.spent']).toBe(35)
      expect(capturedUpdate.options).toEqual({ keepEmbeddedIds: true })
    })

    test('does not include xpCost when xpCost is 0', async () => {
      const character = new SwerpgCharacter(buildCharacterData())

      let capturedUpdate = null
      character.parent = {
        update: (data, options) => {
          capturedUpdate = { data, options }
          return Promise.resolve()
        },
      }

      character.details.specializations = new Set()

      const fakeItem = {
        toObject: () => ({
          name: 'Pilot',
          img: 'systems/swerpg/assets/pilot.png',
          system: {
            specializationId: 'pilot',
            freeSkillRank: 4,
            specializationSkills: [],
          },
        }),
      }

      await character.acquireSpecialization(fakeItem, { xpCost: 0 })

      expect(capturedUpdate.data['system.details.specializations']).toHaveLength(1)
      expect(capturedUpdate.data['system.progression.experience.spent']).toBeUndefined()
    })
  })

  describe('removeSpecialization', () => {
    test('removes a specialization by specializationId', async () => {
      const character = new SwerpgCharacter(
        buildCharacterData({
          specializations: new Set([
            { specializationId: 'spec-a', name: 'Spec A' },
            { specializationId: 'spec-b', name: 'Spec B' },
          ]),
        }),
      )

      let capturedUpdate = null
      character.parent = {
        update: (data, options) => {
          capturedUpdate = { data, options }
          return Promise.resolve()
        },
      }

      await character.removeSpecialization('spec-a')

      expect(capturedUpdate).not.toBeNull()
      expect(capturedUpdate.data['system.details.specializations']).toHaveLength(1)
      expect(capturedUpdate.data['system.details.specializations'][0].specializationId).toBe('spec-b')
      expect(capturedUpdate.options).toEqual({ keepEmbeddedIds: true })
    })

    test('removes a specialization by name when specializationId is absent', async () => {
      const character = new SwerpgCharacter(
        buildCharacterData({
          specializations: new Set([{ name: 'Pilot' }, { specializationId: 'spec-b', name: 'Spec B' }]),
        }),
      )

      let capturedUpdate = null
      character.parent = {
        update: (data, options) => {
          capturedUpdate = { data, options }
          return Promise.resolve()
        },
      }

      await character.removeSpecialization('Pilot')

      expect(capturedUpdate).not.toBeNull()
      expect(capturedUpdate.data['system.details.specializations']).toHaveLength(1)
      expect(capturedUpdate.data['system.details.specializations'][0].specializationId).toBe('spec-b')
    })

    test('removes a specialization by treeUuid', async () => {
      const character = new SwerpgCharacter(
        buildCharacterData({
          specializations: new Set([
            { treeUuid: 'Item.tree-pilot', name: 'Pilot' },
            { specializationId: 'spec-b', name: 'Spec B' },
          ]),
        }),
      )

      let capturedUpdate = null
      character.parent = {
        update: (data, options) => {
          capturedUpdate = { data, options }
          return Promise.resolve()
        },
      }

      await character.removeSpecialization('Item.tree-pilot')

      expect(capturedUpdate).not.toBeNull()
      expect(capturedUpdate.data['system.details.specializations']).toHaveLength(1)
    })

    test('keeps all specializations when key does not match any', async () => {
      const character = new SwerpgCharacter(
        buildCharacterData({
          specializations: new Set([{ specializationId: 'spec-a', name: 'Spec A' }]),
        }),
      )

      let capturedUpdate = null
      character.parent = {
        update: (data, options) => {
          capturedUpdate = { data, options }
          return Promise.resolve()
        },
      }

      await character.removeSpecialization('nonexistent')

      expect(capturedUpdate).not.toBeNull()
      expect(capturedUpdate.data['system.details.specializations']).toHaveLength(1)
    })

    test('handles empty specializations gracefully', async () => {
      const character = new SwerpgCharacter(buildCharacterData())

      let capturedUpdate = null
      character.parent = {
        update: (data, options) => {
          capturedUpdate = { data, options }
          return Promise.resolve()
        },
      }

      await character.removeSpecialization('spec-a')

      expect(capturedUpdate).not.toBeNull()
      expect(capturedUpdate.data['system.details.specializations']).toHaveLength(0)
    })
  })
})
