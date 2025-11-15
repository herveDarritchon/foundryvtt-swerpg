/**
 * Test minimal pour valider les corrections du mapper talent
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('Talent Import Fix Validation', () => {
  beforeEach(() => {
    // Mock minimal de foundry pour éviter les erreurs d'import
    globalThis.foundry = {
      utils: {
        mergeObject: vi.fn((a, b) => ({ ...a, ...b })),
        debounce: vi.fn((fn) => fn),
      },
      applications: {
        api: {
          // Minimal implementations instead of empty classes to satisfy extends
          DialogV2: class DialogV2 {
            render() {
              return this
            }
          },
          DocumentSheetV2: class DocumentSheetV2 {
            constructor() {
              this.element = {}
            }
            render() {
              return this
            }
          },
          ApplicationV2: class ApplicationV2 {
            render() {
              return this
            }
          },
          HandlebarsApplicationMixin: (Base) => Base,
        },
      },
      abstract: {
        DataModel: class DataModel {
          constructor(data) {
            this._source = data || {}
            Object.assign(this, data)
          }
          static defineSchema() {
            return {}
          }
          toObject() {
            return this._source
          }
        },
        TypeDataModel: class TypeDataModel {
          constructor(data) {
            this._source = data || {}
            Object.assign(this, data)
          }
          static defineSchema() {
            return {}
          }
          toObject() {
            return this._source
          }
        },
      },
      data: {
        fields: {
          StringField: vi.fn((cfg = {}) => ({ ...cfg })),
          NumberField: vi.fn((cfg = {}) => ({ ...cfg })),
          BooleanField: vi.fn((cfg = {}) => ({ ...cfg })),
          SchemaField: vi.fn((schema = {}) => ({ ...schema })),
          HTMLField: vi.fn((cfg = {}) => ({ ...cfg })),
          FilePathField: vi.fn((cfg = {}) => ({ categories: ['IMAGE'], ...cfg })),
          ArrayField: vi.fn((field, cfg = {}) => ({ field, ...cfg })),
          EmbeddedDataField: vi.fn((cls, cfg = {}) => ({ cls, ...cfg })),
          SetField: vi.fn((field, cfg = {}) => ({ field, ...cfg })),
          DocumentUUIDField: vi.fn((cfg = {}) => ({ ...cfg })),
          JavaScriptField: vi.fn((cfg = {}) => ({ ...cfg })),
        },
      },
    }

    // Mock SYSTEM minimal
    globalThis.SYSTEM = {
      TALENT_ACTIVATION: {
        passive: { id: 'passive' },
        active: { id: 'active' },
        maneuver: { id: 'maneuver' },
      },
    }
  })

  it('should import talent mapping functions without errors', async () => {
    // Test que les modules se chargent sans erreur après nos corrections
    const { resolveTalentNode } = await import('../../module/importer/mappings/oggdude-talent-node-map.mjs')
    const { createDefaultTalentAction } = await import('../../module/importer/mappings/oggdude-talent-actions-map.mjs')
    const { resetTalentImportStats, getTalentImportStats } = await import('../../module/importer/utils/talent-import-utils.mjs')

    expect(resolveTalentNode).toBeDefined()
    expect(createDefaultTalentAction).toBeDefined()
    expect(resetTalentImportStats).toBeDefined()
    expect(getTalentImportStats).toBeDefined()
  })

  it('should handle undefined node ID gracefully', async () => {
    const { resolveTalentNode } = await import('../../module/importer/mappings/oggdude-talent-node-map.mjs')

    // Should not throw error and return null for undefined
    const result = resolveTalentNode(undefined, { name: 'Test Talent' })
    expect(result).toBeNull()
  })

  it('should reset talent import stats correctly', async () => {
    const { resetTalentImportStats, getTalentImportStats } = await import('../../module/importer/utils/talent-import-utils.mjs')

    resetTalentImportStats()
    const stats = getTalentImportStats()

    expect(stats.processed).toBe(0)
    expect(stats.failed).toBe(0)
    expect(stats.transformed).toBe(0)
  })

  it('should create default action with proper ID', async () => {
    // Mock SwerpgAction class
    globalThis.SwerpgAction = class SwerpgAction {
      constructor(config) {
        if (!config?.id) throw new Error('SwerpgAction validation errors:\n  id: may not be undefined')
        Object.assign(this, config)
      }
    }

    const { createDefaultTalentAction } = await import('../../module/importer/mappings/oggdude-talent-actions-map.mjs')

    const talentContext = {
      name: 'Test Talent',
      description: 'A test talent',
    }

    const action = createDefaultTalentAction(talentContext)
    expect(action).toBeDefined()
    expect(action.id).toBeDefined()
    expect(action.id).toMatch(/test_talent_\d+_\w+/)
    expect(action.name).toBe('Test Talent')
  })
})
