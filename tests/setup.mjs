/**
 * Setup for combat mixin tests
 * This file can be used to setup global mocks if needed
 */

// Mock foundry global if not present
if (typeof foundry === 'undefined') {
  global.foundry = {
    utils: {
      deepClone: (obj) => JSON.parse(JSON.stringify(obj)),
      mergeObject: (...args) => Object.assign({}, ...args)
    },
    applications: {
      api: {
        DialogV2: class DialogV2 {}
      }
    }
  }
}

// Mock game global if not present
if (typeof game === 'undefined') {
  global.game = {
    combat: null,
    settings: {
      get: () => 0,
      set: () => Promise.resolve()
    },
    system: {
      api: {
        dice: {
          AttackRoll: class AttackRoll {
            constructor(data) { this.data = data }
            static RESULT_TYPES = { HIT: 1, MISS: 2, GLANCE: 3, DODGE: 4, PARRY: 5, BLOCK: 6, ARMOR: 7, RESIST: 8 }
            evaluate() { return Promise.resolve(this) }
          }
        }
      }
    }
  }
}
