import { describe, test, expect, beforeEach, vi } from 'vitest'
import SwerpgSpecializationTree from '../../module/models/specialization-tree.mjs'
import { logger } from '../../module/utils/logger.mjs'

vi.mock('../../module/utils/logger.mjs', () => ({
  logger: {
    warn: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}))

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

    test('nodes ArrayField wraps a SchemaField with nodeId, talentId, row, column, cost', () => {
      const nodeField = SwerpgSpecializationTree.defineSchema().nodes.field
      expect(nodeField).toBeInstanceOf(foundry.data.fields.SchemaField)
      expect(nodeField.schema.nodeId).toBeInstanceOf(foundry.data.fields.StringField)
      expect(nodeField.schema.nodeId.config.required).toBe(true)
      expect(nodeField.schema.talentId).toBeInstanceOf(foundry.data.fields.StringField)
      expect(nodeField.schema.talentId.config.required).toBe(true)
      expect(nodeField.schema.row).toBeInstanceOf(foundry.data.fields.NumberField)
      expect(nodeField.schema.column).toBeInstanceOf(foundry.data.fields.NumberField)
      expect(nodeField.schema.cost).toBeInstanceOf(foundry.data.fields.NumberField)
    })

    test('node row field is optional, integer, min 1, max 10, initial 1', () => {
      const field = SwerpgSpecializationTree.defineSchema().nodes.field.schema.row
      expect(field.config.required).toBe(false)
      expect(field.config.nullable).toBe(false)
      expect(field.config.integer).toBe(true)
      expect(field.config.min).toBe(1)
      expect(field.config.max).toBe(10)
      expect(field.config.initial).toBe(1)
    })

    test('node column field is optional, integer, min 1, max 10, initial 1', () => {
      const field = SwerpgSpecializationTree.defineSchema().nodes.field.schema.column
      expect(field.config.required).toBe(false)
      expect(field.config.nullable).toBe(false)
      expect(field.config.integer).toBe(true)
      expect(field.config.min).toBe(1)
      expect(field.config.max).toBe(10)
      expect(field.config.initial).toBe(1)
    })

    test('node cost field is optional, integer, min 0, initial 5', () => {
      const field = SwerpgSpecializationTree.defineSchema().nodes.field.schema.cost
      expect(field.config.required).toBe(false)
      expect(field.config.nullable).toBe(false)
      expect(field.config.integer).toBe(true)
      expect(field.config.min).toBe(0)
      expect(field.config.initial).toBe(5)
    })

    test('connections ArrayField wraps a SchemaField with from, to, and optional type', () => {
      const connField = SwerpgSpecializationTree.defineSchema().connections.field
      expect(connField).toBeInstanceOf(foundry.data.fields.SchemaField)
      expect(connField.schema.from).toBeInstanceOf(foundry.data.fields.StringField)
      expect(connField.schema.from.config.required).toBe(true)
      expect(connField.schema.to).toBeInstanceOf(foundry.data.fields.StringField)
      expect(connField.schema.to.config.required).toBe(true)
      expect(connField.schema.type).toBeInstanceOf(foundry.data.fields.StringField)
      expect(connField.schema.type.config.required).toBe(false)
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
    test('returns undefined for empty data', () => {
      expect(SwerpgSpecializationTree.validateJoint({})).toBeUndefined()
    })

    test('returns undefined when nodes is empty array', () => {
      expect(SwerpgSpecializationTree.validateJoint({ nodes: [] })).toBeUndefined()
    })

    test('passes silently when nodeId matches row/column convention', () => {
      logger.warn.mockClear()
      SwerpgSpecializationTree.validateJoint({
        nodes: [
          { nodeId: 'r1c1', row: 1, column: 1, cost: 5 },
          { nodeId: 'r2c3', row: 2, column: 3, cost: 10 },
        ],
      })
      expect(logger.warn).not.toHaveBeenCalled()
    })

    test('warns when nodeId does not match row/column convention', () => {
      logger.warn.mockClear()
      SwerpgSpecializationTree.validateJoint({
        nodes: [
          { nodeId: 'wrong', row: 1, column: 2, cost: 5 },
        ],
      })
      expect(logger.warn).toHaveBeenCalledWith(
        '[SwerpgSpecializationTree] Node nodeId mismatch with row/column',
        expect.objectContaining({ nodeId: 'wrong', expectedId: 'r1c2', row: 1, column: 2 }),
      )
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

    test('creates instance with full data including node position and cost', () => {
      const data = {
        specializationId: 'spec-slicer',
        careerId: 'career-technician',
        description: '<p>A slicing specialist</p>',
        source: { system: 'eote', book: 'Core Rulebook', page: '42' },
        nodes: [
          { nodeId: 'r1c1', talentId: 'talent-slice-1', row: 1, column: 1, cost: 5 },
          { nodeId: 'r1c2', talentId: 'talent-slice-2', row: 1, column: 2, cost: 10 },
        ],
        connections: [{ from: 'r1c1', to: 'r1c2', type: 'horizontal' }],
      }
      const instance = new SwerpgSpecializationTree(data)
      expect(instance.specializationId).toBe('spec-slicer')
      expect(instance.careerId).toBe('career-technician')
      expect(instance.description).toBe('<p>A slicing specialist</p>')
      expect(instance.source).toEqual({ system: 'eote', book: 'Core Rulebook', page: '42' })
      expect(instance.nodes).toEqual([
        { nodeId: 'r1c1', talentId: 'talent-slice-1', row: 1, column: 1, cost: 5 },
        { nodeId: 'r1c2', talentId: 'talent-slice-2', row: 1, column: 2, cost: 10 },
      ])
      expect(instance.connections).toEqual([{ from: 'r1c1', to: 'r1c2', type: 'horizontal' }])
    })

    test('creates instance with nodes without row/column/cost (backward compat)', () => {
      const data = {
        specializationId: 'spec-bounty-hunter',
        nodes: [{ nodeId: 'legacy-node', talentId: 'talent-old' }],
      }
      const instance = new SwerpgSpecializationTree(data)
      expect(instance.nodes).toEqual([{ nodeId: 'legacy-node', talentId: 'talent-old' }])
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
