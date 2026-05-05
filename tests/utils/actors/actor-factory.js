import { vi } from 'vitest'

/**
 * Create a mock SwerpgActor for unit testing.
 * Minimal implementation focused on testability with limited mocking.
 *
 * @param {object} [overrides={}] - Override default mock values
 * @returns {object} A mock actor object
 */
export function createMockActor(overrides = {}) {
  const mockActor = {
    // System data (minimal structure)
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
        action: { value: 2, threshold: 6 },
        focus: { value: 1, threshold: 3 },
        health: { value: 20, threshold: 30 },
        wounds: { value: 0, threshold: 10 },
        morale: { value: 15, threshold: 20 },
        madness: { value: 0, threshold: 10 },
      },
      details: { species: null, career: null, specialization: null },
      advancement: { level: 1 },
      status: null,
    },

    // Points
    points: {
      skill: { available: 10, spent: 0, total: 10, requireInput: false },
      ability: { pool: 6, spent: 0, available: 6, requireInput: false },
      talent: { available: 5, spent: 0, total: 5 },
    },

    // Experience
    experiencePoints: {
      gained: 0,
      spent: 0,
      startingExperience: 100,
      total: 100,
      available: 100,
    },

    // Properties
    type: 'character',
    id: 'mock-actor-id',
    name: 'Mock Actor',
    isL0: false,
    isIncapacitated: false,
    isWeakened: false,
    isBroken: false,
    level: 1,

    // Mock Foundry methods
    update: vi.fn().mockResolvedValue({}),
    updateEmbeddedDocuments: vi.fn().mockResolvedValue([]),
    deleteEmbeddedDocuments: vi.fn().mockResolvedValue([]),
    reset: vi.fn(),
    expireEffects: vi.fn().mockResolvedValue(),
    applyDamageOverTime: vi.fn().mockResolvedValue(),
    alterResources: vi.fn().mockResolvedValue(),
    callActorHooks: vi.fn(),
    _sheet: { render: vi.fn() },

    // Mock methods that are on the class prototype (for testing)
    canPurchaseSkill: vi.fn().mockReturnValue(true),
    purchaseSkill: vi.fn().mockResolvedValue({}),
    canPurchaseCharacteristic: vi.fn().mockReturnValue(true),
    purchaseCharacteristic: vi.fn().mockResolvedValue(),
    levelUp: vi.fn().mockResolvedValue({}),
    addTalent: vi.fn().mockResolvedValue({}),
    resetTalents: vi.fn().mockResolvedValue(),
    onStartTurn: vi.fn().mockResolvedValue(),
    onEndTurn: vi.fn().mockResolvedValue(),
    useAction: vi.fn().mockResolvedValue([]),
    applyTargetBoons: vi.fn().mockReturnValue({ boons: {}, banes: {} }),
    equipArmor: vi.fn().mockResolvedValue({}),
    equipWeapon: vi.fn().mockResolvedValue({}),

    // Maps and Sets
    items: new Map(),
    itemTypes: { talent: [] },
    talents: [],
    talentIds: new Set(),
    permanentTalentIds: new Set(),
    combatant: null,

    // Other
    actor: null, // self-reference for some methods
    flags: {},

    // Add computeResourceValue method (refactored from private #computeResourceValue)
    computeResourceValue(resource, action) {
      if (action === 'increase') {
        return Math.min(resource.value + 1, resource.threshold)
      } else if (action === 'decrease') {
        return Math.max(resource.value - 1, 0)
      }
      throw new Error(`Invalid action "${action}" for jauge type "${resource.type}"`)
    },

    // Add modifyResource method
    async modifyResource(jaugeType, action) {
      const resource = this.system.resources[jaugeType]
      const value = this.computeResourceValue(resource, action)
      resource.value = value
      const updateData = { [`system.resources.${jaugeType}`]: resource }
      return this.update(updateData)
    },

    ...overrides,
  }

  // Self-reference for methods that use `this.actor`
  if (!mockActor.actor) {
    mockActor.actor = mockActor
  }

  return mockActor
}
