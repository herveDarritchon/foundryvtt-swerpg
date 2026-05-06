import { vi } from 'vitest'
import { ResourcesMixin } from '../../../module/documents/actor-mixins/resources.mjs'
import { EquipmentMixin } from '../../../module/documents/actor-mixins/equipment.mjs'
import { CombatMixin } from '../../../module/documents/actor-mixins/combat/index.mjs'

/**
 * Create a mock SwerpgActor for unit testing.
 * Uses ResourcesMixin to provide real method implementations.
 *
 * @param {object} [overrides={}] - Override default mock values
 * @returns {object} A mock actor object
 */
export function createMockActor(overrides = {}) {
  // Create a base class that includes ResourcesMixin
  // Create base class with all available mixins (without TalentsMixin - to be added after creation)
  const MockActorBase = CombatMixin(EquipmentMixin(ResourcesMixin(class Base {
    constructor(data) {
      Object.assign(this, data)
    }
  })))

  const baseData = {
    system: {
      abilities: {
        strength: { value: 3 },
        dexterity: { value: 4 },
        intellect: { value: 2 },
        cunning: { value: 3 },
        willpower: { value: 5 },
        presence: { value: 2 },
      },
      characteristics: {
        strength: { base: 3, trained: 0, value: 3 },
        dexterity: { base: 4, trained: 0, value: 4 },
        intellect: { base: 2, trained: 0, value: 2 },
        cunning: { base: 3, trained: 0, value: 3 },
        willpower: { base: 5, trained: 0, value: 5 },
        presence: { base: 2, trained: 0, value: 2 },
      },
      skills: {
        cool: { rank: 0, cost: 5, path: null },
        discipline: { rank: 1, cost: 10, path: 'warrior' },
        vigilance: { rank: 3, cost: 15, path: null },
        brawl: { rank: 5, cost: 25, path: 'brawler' },
      },
      resources: {
        action: { value: 2, threshold: 6, max: 6 },
        focus: { value: 1, threshold: 3, max: 3 },
        health: { value: 20, threshold: 30, max: 30 },
        wounds: { value: 0, threshold: 10, max: 10 },
        morale: { value: 15, threshold: 20, max: 20 },
        madness: { value: 0, threshold: 10, max: 10 },
      },
      details: { species: null, career: null, specialization: null },
      advancement: { level: 1 },
      status: null,
      resistances: {},
    },
    points: {
      skill: { available: 10, spent: 0, total: 10, requireInput: false },
      ability: { pool: 6, spent: 0, available: 6, requireInput: false },
      talent: { available: 5, spent: 0, total: 5 },
    },
  }

  const mockActor = new MockActorBase(baseData)

  // Add mock methods
  mockActor.update = vi.fn().mockResolvedValue(mockActor)
  mockActor.updateExperiencePoints = vi.fn().mockImplementation(async (params = {}) => {
    const updates = {}
    if (params.spent !== undefined) updates['system.progression.experience.spent'] = params.spent
    if (params.gained !== undefined) updates['system.progression.experience.gained'] = params.gained
    if (params.total !== undefined) updates['system.progression.experience.total'] = params.total
    return mockActor.update(updates)
  })
  mockActor.updateFreeSkillRanks = vi.fn().mockImplementation(async (type, params = {}) => {
    const updates = {}
    if (params.spent !== undefined) updates[`system.progression.freeSkillRanks.${type}.spent`] = params.spent
    if (params.gained !== undefined) updates[`system.progression.freeSkillRanks.${type}.gained`] = params.gained
    return mockActor.update(updates)
  })
  mockActor.updateEmbeddedDocuments = vi.fn().mockResolvedValue([])
  mockActor.deleteEmbeddedDocuments = vi.fn().mockResolvedValue([])
  mockActor.createEmbeddedDocuments = vi.fn().mockResolvedValue([])
  mockActor.reset = vi.fn()
  mockActor.expireEffects = vi.fn().mockResolvedValue()
  mockActor.applyDamageOverTime = vi.fn().mockResolvedValue()
  mockActor.callActorHooks = vi.fn()
  mockActor._sheet = { render: vi.fn() }

  // Mock methods that are on the class prototype (for testing)
  mockActor.canPurchaseCharacteristic = vi.fn().mockReturnValue(true)
  mockActor.purchaseCharacteristic = vi.fn().mockResolvedValue()
  mockActor.levelUp = vi.fn().mockResolvedValue({})
  // Note: addTalent and resetTalents will be tested for real after TalentsMixin is integrated
  mockActor.onStartTurn = vi.fn().mockResolvedValue()
  mockActor.onEndTurn = vi.fn().mockResolvedValue()
  mockActor.useAction = vi.fn().mockResolvedValue([])
  mockActor.applyTargetBoons = vi.fn().mockReturnValue({ boons: {}, banes: {} })
  mockActor.equipArmor = vi.fn().mockResolvedValue({})
  mockActor.equipWeapon = vi.fn().mockResolvedValue({})

  // Maps and Sets
  mockActor.items = new Map()
  mockActor.itemTypes = { talent: [] }
  mockActor.talents = []
  mockActor.talentIds = new Set()
  mockActor.permanentTalentIds = new Set()
  mockActor.effects = new Map()
  mockActor.combatant = null

  // Properties
  mockActor.type = 'character'
  mockActor.id = 'mock-actor-id'
  mockActor.name = 'Mock Actor'
  mockActor.isL0 = false
  mockActor.level = 1
  mockActor.actor = mockActor // self-reference
  mockActor.flags = {}
  mockActor._cachedResources = {}

  // Apply overrides
  Object.assign(mockActor, overrides)

  return mockActor
}
