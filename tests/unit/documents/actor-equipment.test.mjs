/**
 * Tests for EquipmentMixin extracted from actor.mjs
 * Issue #47: Refactoring - Extract equipment methods to actor-mixins/equipment.mjs
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { EquipmentMixin } from '../../../module/documents/actor-mixins/equipment.mjs'

// Mock Foundry globals
globalThis.getDocumentClass = (type) => {
  return class MockItem {
    constructor(data, options) {
      Object.assign(this, data)
      if (options?.parent) this.parent = options.parent
    }
    prepareData() {}
    update(data) { return Promise.resolve(this) }
  }
}

globalThis.ui = {
  notifications: {
    warn: (msg) => console.warn(msg)
  }
}

globalThis.game = {
  i18n: {
    format: (key, data) => `${key}: ${JSON.stringify(data)}`,
    localize: (key) => key
  }
}

globalThis.foundry = {
  utils: {
    setProperty: (obj, key, value) => { obj[key] = value }
  }
}

globalThis.SYSTEM = {
  ARMOR: {
    UNARMORED_DATA: { system: { category: 'unarmored' } }
  },
  WEAPON: {
    SLOTS: {
      MAINHAND: 'mainhand',
      OFFHAND: 'offhand',
      TWOHAND: 'twohand',
      EITHER: 'either',
      label: (slot) => slot
    }
  }
}

// Mock Actor base class
class MockActor {
  constructor(data, context) {
    this.data = data
    this._items = new Map()
    this.system = {
      resources: { action: { value: 10 } },
      status: {},
      details: {}
    }
    this.equipment = null
    this.talentIds = new Set()
    this.statuses = new Set()
    this.itemTypes = { armor: [], weapon: [], accessory: [] }
    this.name = 'Test Actor'
    this.id = 'actor1'
    this.type = 'character'
    this.isWeakened = false
    this.combatant = null
  }

  get items() {
    return {
      get: (id) => this._items.get(id)
    }
  }

  update(data) {
    Object.assign(this.system, data)
    return Promise.resolve(this)
  }

  updateEmbeddedDocuments(type, updates) {
    return Promise.resolve()
  }

  alterResources(changes, updates) {
    return Promise.resolve()
  }

  prepareEmbeddedDocuments() {
    // Base implementation
  }
}

const TestActor = EquipmentMixin(MockActor)

describe('EquipmentMixin', () => {
  let actor

  beforeEach(() => {
    actor = new TestActor({}, {})
    actor._items = new Map()
    actor.itemTypes = { armor: [], weapon: [], accessory: [] }
  })

  describe('_prepareArmor', () => {
    it('should return unarmored armor when no equipped armor', () => {
      const armorItems = []
      const result = actor._prepareArmor(armorItems)
      expect(result).toBeDefined()
      expect(result.system.category).toBe('unarmored')
    })

    it('should return equipped armor when present', () => {
      const mockArmor = {
        system: { equipped: true, category: 'light' },
        name: 'Test Armor'
      }
      const armorItems = [mockArmor]
      const result = actor._prepareArmor(armorItems)
      expect(result).toBe(mockArmor)
    })
  })

  describe('_prepareWeapons', () => {
    it('should return weapons object with mainhand', () => {
      const weaponItems = []
      const result = actor._prepareWeapons(weaponItems)
      expect(result).toHaveProperty('mainhand')
    })
  })

  describe('prepareEmbeddedDocuments', () => {
    it('should set this.equipment when called', () => {
      actor.prepareEmbeddedDocuments()
      expect(actor.equipment).toBeDefined()
      expect(actor.equipment).toHaveProperty('armor')
      expect(actor.equipment).toHaveProperty('weapons')
      expect(actor.equipment).toHaveProperty('accessories')
    })
  })
})

describe('Equipment Methods Integration', () => {
  it('should have all required methods', () => {
    const TestActor = EquipmentMixin(MockActor)
    const actor = new TestActor({}, {})
    
    expect(typeof actor._prepareArmor).toBe('function')
    expect(typeof actor._prepareWeapons).toBe('function')
    expect(typeof actor._getUnarmoredArmor).toBe('function')
    expect(typeof actor._getUnarmedWeapon).toBe('function')
    expect(typeof actor.equipArmor).toBe('function')
    expect(typeof actor.equipWeapon).toBe('function')
  })

  it('should have _prepareEquipment method', () => {
    const TestActor = EquipmentMixin(MockActor)
    const actor = new TestActor({}, {})
    expect(typeof actor._prepareEquipment).toBe('function')
  })
})
