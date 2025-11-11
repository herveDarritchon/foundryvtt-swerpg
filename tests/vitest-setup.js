import { beforeEach, afterEach, vi } from 'vitest'
import { setupFoundryMock, teardownFoundryMock } from './helpers/mock-foundry.mjs'

// Extension utilitaire pour exposer foundry.utils (deepClone, getProperty, mergeObject) attendus par le code métier.
// Certains tests n'importent pas explicitement setupTests.js (qui contenait ces mocks), donc on les garantit ici.
function ensureFoundryUtils() {
  if (!globalThis.foundry) globalThis.foundry = {}
  if (!globalThis.foundry.utils) {
    // Implémentations minimalistes conformes aux besoins des tests
    const deepClone = (original, { strict = false, _d = 0 } = {}) => {
      if (_d > 100) throw new Error('Maximum depth exceeded')
      _d++
      if (typeof original !== 'object' || original === null) return original
      if (Array.isArray(original)) return original.map((o) => deepClone(o, { strict, _d }))
      if (original instanceof Date) return new Date(original)
      if (original.constructor && original.constructor !== Object) {
        return strict
          ? (() => {
              throw new Error('deepClone cannot clone advanced objects')
            })()
          : original
      }
      const clone = {}
      for (const k of Object.keys(original)) clone[k] = deepClone(original[k], { strict, _d })
      return clone
    }
    const getProperty = (object, key) => {
      if (!key || !object) return undefined
      if (key in object) return object[key]
      let target = object
      for (const p of key.split('.')) {
        if (!target || typeof target !== 'object') return undefined
        if (p in target) target = target[p]
        else return undefined
      }
      return target
    }
    const mergeObject = (original, other) => {
      const isObject = (obj) => obj && typeof obj === 'object' && obj.constructor === Object
      if (!isObject(original)) return deepClone(other)
      if (!isObject(other)) return deepClone(original)
      const merged = deepClone(original)
      for (const [key, value] of Object.entries(other)) {
        merged[key] = isObject(value) && isObject(merged[key]) ? mergeObject(merged[key], value) : deepClone(value)
      }
      return merged
    }
    globalThis.foundry.utils = { deepClone: vi.fn(deepClone), getProperty: vi.fn(getProperty), mergeObject: vi.fn(mergeObject) }
  }
}

beforeEach(() => {
  setupFoundryMock()
  ensureFoundryUtils()
  vi.clearAllMocks()
})

afterEach(() => {
  vi.clearAllMocks()
  teardownFoundryMock()
})
