import { describe, test, expect, beforeEach, vi } from 'vitest'
import SwerpgSpecializationTree from '../../module/models/specialization-tree.mjs'

vi.mock('../../module/applications/sheets/base-item.mjs', () => {
  class MockBaseItemSheet {
    static DEFAULT_OPTIONS = {
      classes: ['swerpg', 'item', 'standard-form'],
      item: { type: undefined, includesActions: false, includesHooks: false },
    }
    static _initializeItemSheetClass() {}
    constructor() {}
  }
  return { default: MockBaseItemSheet }
})

describe('SwerpgSpecializationTree', () => {
  describe('defineSchema', () => {
    test('returns all expected top-level fields with correct types', () => {
      const schema = SwerpgSpecializationTree.defineSchema()

      expect(schema.description).toBeInstanceOf(foundry.data.fields.HTMLField)
      expect(schema.specializationId).toBeInstanceOf(foundry.data.fields.StringField)
      expect(schema.careerId).toBeInstanceOf(foundry.data.fields.StringField)
      expect(schema.source).toBeInstanceOf(foundry.data.fields.SchemaField)
      expect(schema.nodes).toBeInstanceOf(foundry.data.fields.ArrayField)
      expect(schema.connections).toBeInstanceOf(foundry.data.fields.ArrayField)
    })

    test('specializationId does not allow blank (but optional at creation)', () => {
      const field = SwerpgSpecializationTree.defineSchema().specializationId
      expect(field.config.required).toBe(false)
      expect(field.config.blank).toBe(false)
    })

    test('careerId is optional and does not allow blank', () => {
      const field = SwerpgSpecializationTree.defineSchema().careerId
      expect(field.config.required).toBe(false)
      expect(field.config.blank).toBe(false)
    })

    test('description is optional', () => {
      const field = SwerpgSpecializationTree.defineSchema().description
      expect(field.config.required).toBe(false)
    })

    test('source SchemaField contains system, book, and page string fields', () => {
      const source = SwerpgSpecializationTree.defineSchema().source
      expect(source.schema.system).toBeInstanceOf(foundry.data.fields.StringField)
      expect(source.schema.book).toBeInstanceOf(foundry.data.fields.StringField)
      expect(source.schema.page).toBeInstanceOf(foundry.data.fields.StringField)
    })

    test('nodes ArrayField wraps a SchemaField with nodeId and talentId', () => {
      const nodeField = SwerpgSpecializationTree.defineSchema().nodes.field
      expect(nodeField).toBeInstanceOf(foundry.data.fields.SchemaField)
      expect(nodeField.schema.nodeId).toBeInstanceOf(foundry.data.fields.StringField)
      expect(nodeField.schema.nodeId.config.required).toBe(true)
      expect(nodeField.schema.talentId).toBeInstanceOf(foundry.data.fields.StringField)
      expect(nodeField.schema.talentId.config.required).toBe(true)
    })

    test('connections ArrayField wraps a SchemaField with from and to', () => {
      const connField = SwerpgSpecializationTree.defineSchema().connections.field
      expect(connField).toBeInstanceOf(foundry.data.fields.SchemaField)
      expect(connField.schema.from).toBeInstanceOf(foundry.data.fields.StringField)
      expect(connField.schema.from.config.required).toBe(true)
      expect(connField.schema.to).toBeInstanceOf(foundry.data.fields.StringField)
      expect(connField.schema.to.config.required).toBe(true)
    })

    test('nodes and connections default to empty array', () => {
      const schema = SwerpgSpecializationTree.defineSchema()
      expect(schema.nodes.config.initial).toEqual([])
      expect(schema.connections.config.initial).toEqual([])
    })
  })

  describe('LOCALIZATION_PREFIXES', () => {
    test('is set to SPECIALIZATION_TREE', () => {
      expect(SwerpgSpecializationTree.LOCALIZATION_PREFIXES).toEqual(['SPECIALIZATION_TREE'])
    })
  })

  describe('validateJoint', () => {
    test('is a no-op that returns undefined', () => {
      expect(SwerpgSpecializationTree.validateJoint({})).toBeUndefined()
    })
  })

  describe('data model instance', () => {
    test('creates instance with minimal required data', () => {
      const instance = new SwerpgSpecializationTree({ specializationId: 'spec-bounty-hunter' })
      expect(instance.specializationId).toBe('spec-bounty-hunter')
    })

    test('creates instance without specializationId (create-dialog workflow)', () => {
      const instance = new SwerpgSpecializationTree({})
      expect(instance).toBeDefined()
      expect(instance.specializationId).toBeUndefined()
    })

    test('creates instance with full data', () => {
      const data = {
        specializationId: 'spec-slicer',
        careerId: 'career-technician',
        description: '<p>A slicing specialist</p>',
        source: { system: 'eote', book: 'Core Rulebook', page: '42' },
        nodes: [{ nodeId: 'n1', talentId: 'talent-slice-1' }],
        connections: [{ from: 'n1', to: 'n2' }],
      }
      const instance = new SwerpgSpecializationTree(data)
      expect(instance.specializationId).toBe('spec-slicer')
      expect(instance.careerId).toBe('career-technician')
      expect(instance.description).toBe('<p>A slicing specialist</p>')
      expect(instance.source).toEqual({ system: 'eote', book: 'Core Rulebook', page: '42' })
      expect(instance.nodes).toEqual([{ nodeId: 'n1', talentId: 'talent-slice-1' }])
      expect(instance.connections).toEqual([{ from: 'n1', to: 'n2' }])
    })

    test('toObject returns source data', () => {
      const data = { specializationId: 'spec-hired-gun' }
      const instance = new SwerpgSpecializationTree(data)
      expect(instance.toObject()).toEqual(data)
    })
  })
})

describe('SpecializationTreeSheet', () => {
  let SpecializationTreeSheet

  beforeEach(async () => {
    SpecializationTreeSheet = (await import('../../module/applications/sheets/specialization-tree.mjs')).default
  })

  test('class exists and can be referenced', () => {
    expect(SpecializationTreeSheet).toBeDefined()
    expect(SpecializationTreeSheet.name).toBe('SpecializationTreeSheet')
  })

  test('DEFAULT_OPTIONS configures specialization-tree type', () => {
    const opts = SpecializationTreeSheet.DEFAULT_OPTIONS
    expect(opts.item.type).toBe('specialization-tree')
    expect(opts.item.includesActions).toBe(false)
    expect(opts.item.includesHooks).toBe(false)
  })

  test('DEFAULT_OPTIONS specifies window and position', () => {
    const opts = SpecializationTreeSheet.DEFAULT_OPTIONS
    expect(opts.position).toEqual({ width: 600, height: 'auto' })
    expect(opts.window).toEqual({ minimizable: true, resizable: true })
  })
})
