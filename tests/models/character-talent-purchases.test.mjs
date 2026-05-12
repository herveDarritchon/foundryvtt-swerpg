import { describe, test, expect } from 'vitest'

import SwerpgCharacter from '../../module/models/character.mjs'

describe('SwerpgCharacter — talentPurchases', () => {
  describe('schema', () => {
    test('progression schema contains talentPurchases ArrayField', () => {
      const schema = SwerpgCharacter.defineSchema()
      expect(schema.progression).toBeDefined()
      expect(schema.progression.schema.talentPurchases).toBeInstanceOf(foundry.data.fields.ArrayField)
    })

    test('talentPurchases default is an empty array', () => {
      const field = SwerpgCharacter.defineSchema().progression.schema.talentPurchases
      expect(field.config.required).toBe(false)
      expect(field.config.initial).toEqual([])
    })

    test('talentPurchases element is a SchemaField with treeId, nodeId, talentId, specializationId', () => {
      const elementField = SwerpgCharacter.defineSchema().progression.schema.talentPurchases.field
      expect(elementField).toBeInstanceOf(foundry.data.fields.SchemaField)

      expect(elementField.schema.treeId).toBeInstanceOf(foundry.data.fields.StringField)
      expect(elementField.schema.treeId.config.required).toBe(true)
      expect(elementField.schema.treeId.config.blank).toBe(false)

      expect(elementField.schema.nodeId).toBeInstanceOf(foundry.data.fields.StringField)
      expect(elementField.schema.nodeId.config.required).toBe(true)
      expect(elementField.schema.nodeId.config.blank).toBe(false)

      expect(elementField.schema.talentId).toBeInstanceOf(foundry.data.fields.StringField)
      expect(elementField.schema.talentId.config.required).toBe(true)
      expect(elementField.schema.talentId.config.blank).toBe(false)

      expect(elementField.schema.specializationId).toBeInstanceOf(foundry.data.fields.StringField)
      expect(elementField.schema.specializationId.config.required).toBe(true)
      expect(elementField.schema.specializationId.config.blank).toBe(false)
    })

    test('no extra fields beyond the four required identifiers', () => {
      const elementField = SwerpgCharacter.defineSchema().progression.schema.talentPurchases.field
      const fieldNames = Object.keys(elementField.schema)
      expect(fieldNames).toEqual(['treeId', 'nodeId', 'talentId', 'specializationId'])
    })
  })

  describe('data model instance', () => {
    test('creates instance with empty data does not crash', () => {
      const instance = new SwerpgCharacter({})
      expect(instance).toBeDefined()
    })

    test('creates instance with empty talentPurchases', () => {
      const instance = new SwerpgCharacter({ progression: { talentPurchases: [] } })
      expect(instance.progression.talentPurchases).toEqual([])
    })

    test('creates instance with a single purchase entry', () => {
      const data = {
        progression: {
          talentPurchases: [
            { treeId: 'bodyguard-tree', nodeId: 'r1c1', talentId: 'parry', specializationId: 'bodyguard' },
          ],
        },
      }
      const instance = new SwerpgCharacter(data)
      expect(instance.progression.talentPurchases).toHaveLength(1)
      expect(instance.progression.talentPurchases[0].treeId).toBe('bodyguard-tree')
      expect(instance.progression.talentPurchases[0].nodeId).toBe('r1c1')
      expect(instance.progression.talentPurchases[0].talentId).toBe('parry')
      expect(instance.progression.talentPurchases[0].specializationId).toBe('bodyguard')
    })

    test('creates instance with multiple purchase entries', () => {
      const data = {
        progression: {
          talentPurchases: [
            { treeId: 'bodyguard-tree', nodeId: 'r1c1', talentId: 'parry', specializationId: 'bodyguard' },
            { treeId: 'slicer-tree', nodeId: 'r2c3', talentId: 'slicer-1', specializationId: 'slicer' },
            { treeId: 'bodyguard-tree', nodeId: 'r2c1', talentId: 'toughness', specializationId: 'bodyguard' },
          ],
        },
      }
      const instance = new SwerpgCharacter(data)
      expect(instance.progression.talentPurchases).toHaveLength(3)
    })

    test('toObject preserves talentPurchases data', () => {
      const data = {
        progression: {
          talentPurchases: [
            { treeId: 'merc-tree', nodeId: 'r1c2', talentId: 'grit', specializationId: 'mercenary-soldier' },
          ],
        },
      }
      const instance = new SwerpgCharacter(data)
      expect(instance.toObject().progression.talentPurchases).toEqual(data.progression.talentPurchases)
    })
  })
})
