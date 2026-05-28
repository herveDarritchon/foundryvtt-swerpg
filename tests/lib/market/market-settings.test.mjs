import { describe, test, expect, beforeEach, vi } from 'vitest'
import { DEFAULT_MARKET_CONFIG, MARKET_FLAG_NAMESPACE, MARKET_EXCLUDED_FLAG } from '../../../module/config/market.mjs'
import {
  readMarketConfig,
  isItemMarketExcluded,
  setItemMarketExcluded,
  SETTING_MARKET_ENABLED_SOURCES,
  SETTING_MARKET_ALLOWED_ITEM_TYPES,
  SETTING_MARKET_DEDUP_STRATEGY,
} from '../../../module/lib/market/market-settings.mjs'

const SYSTEM_ID = 'swerpg'

/**
 * Build a minimal game.settings stub with controllable return values.
 * @param {Record<string, unknown>} store
 */
function makeSettingsStub(store = {}) {
  return {
    register: vi.fn(),
    get: vi.fn((systemId, key) => store[key] ?? null),
    set: vi.fn((systemId, key, value) => {
      store[key] = value
      return Promise.resolve()
    }),
  }
}

/* -------------------------------------------- */

describe('readMarketConfig', () => {
  beforeEach(() => {
    // Reset global.game before each test
    global.game = { settings: makeSettingsStub() }
  })

  describe('default fallback', () => {
    test('returns default enabledSources when setting is not set', () => {
      const config = readMarketConfig(SYSTEM_ID)
      expect(config.enabledSources).toEqual(Array.from(DEFAULT_MARKET_CONFIG.enabledSources))
    })

    test('returns default allowedItemTypes when setting is not set', () => {
      const config = readMarketConfig(SYSTEM_ID)
      expect(config.allowedItemTypes).toEqual(Array.from(DEFAULT_MARKET_CONFIG.allowedItemTypes))
    })

    test('returns default dedupStrategy when setting is not set', () => {
      const config = readMarketConfig(SYSTEM_ID)
      expect(config.dedupStrategy).toBe(DEFAULT_MARKET_CONFIG.dedupStrategy)
    })
  })

  describe('reading from settings', () => {
    test('returns custom enabledSources when stored as JSON', () => {
      const store = { [SETTING_MARKET_ENABLED_SOURCES]: JSON.stringify(['compendium']) }
      global.game = { settings: makeSettingsStub(store) }
      const config = readMarketConfig(SYSTEM_ID)
      expect(config.enabledSources).toEqual(['compendium'])
    })

    test('returns custom allowedItemTypes when stored as JSON', () => {
      const store = { [SETTING_MARKET_ALLOWED_ITEM_TYPES]: JSON.stringify(['weapon', 'armor']) }
      global.game = { settings: makeSettingsStub(store) }
      const config = readMarketConfig(SYSTEM_ID)
      expect(config.allowedItemTypes).toEqual(['weapon', 'armor'])
    })

    test('returns custom dedupStrategy when stored as a string', () => {
      const store = { [SETTING_MARKET_DEDUP_STRATEGY]: 'prefer-newest' }
      global.game = { settings: makeSettingsStub(store) }
      const config = readMarketConfig(SYSTEM_ID)
      expect(config.dedupStrategy).toBe('prefer-newest')
    })
  })

  describe('graceful fallback on error', () => {
    test('falls back to default enabledSources when JSON is malformed', () => {
      const store = { [SETTING_MARKET_ENABLED_SOURCES]: 'not-valid-json' }
      global.game = { settings: makeSettingsStub(store) }
      const config = readMarketConfig(SYSTEM_ID)
      expect(config.enabledSources).toEqual(Array.from(DEFAULT_MARKET_CONFIG.enabledSources))
    })

    test('falls back to default allowedItemTypes when JSON is malformed', () => {
      const store = { [SETTING_MARKET_ALLOWED_ITEM_TYPES]: '{broken' }
      global.game = { settings: makeSettingsStub(store) }
      const config = readMarketConfig(SYSTEM_ID)
      expect(config.allowedItemTypes).toEqual(Array.from(DEFAULT_MARKET_CONFIG.allowedItemTypes))
    })

    test('falls back to default dedupStrategy when value is empty', () => {
      const store = { [SETTING_MARKET_DEDUP_STRATEGY]: '' }
      global.game = { settings: makeSettingsStub(store) }
      const config = readMarketConfig(SYSTEM_ID)
      expect(config.dedupStrategy).toBe(DEFAULT_MARKET_CONFIG.dedupStrategy)
    })

    test('falls back gracefully when game.settings.get throws', () => {
      global.game = {
        settings: {
          get: vi.fn(() => {
            throw new Error('settings error')
          }),
        },
      }
      const config = readMarketConfig(SYSTEM_ID)
      expect(config.enabledSources).toEqual(Array.from(DEFAULT_MARKET_CONFIG.enabledSources))
      expect(config.allowedItemTypes).toEqual(Array.from(DEFAULT_MARKET_CONFIG.allowedItemTypes))
      expect(config.dedupStrategy).toBe(DEFAULT_MARKET_CONFIG.dedupStrategy)
    })
  })

  describe('returned shape', () => {
    test('always returns an object with enabledSources, allowedItemTypes, dedupStrategy', () => {
      const config = readMarketConfig(SYSTEM_ID)
      expect(config).toHaveProperty('enabledSources')
      expect(config).toHaveProperty('allowedItemTypes')
      expect(config).toHaveProperty('dedupStrategy')
    })

    test('enabledSources is always an array', () => {
      const config = readMarketConfig(SYSTEM_ID)
      expect(Array.isArray(config.enabledSources)).toBe(true)
    })

    test('allowedItemTypes is always an array', () => {
      const config = readMarketConfig(SYSTEM_ID)
      expect(Array.isArray(config.allowedItemTypes)).toBe(true)
    })

    test('dedupStrategy is always a non-empty string', () => {
      const config = readMarketConfig(SYSTEM_ID)
      expect(typeof config.dedupStrategy).toBe('string')
      expect(config.dedupStrategy.length).toBeGreaterThan(0)
    })
  })
})

/* -------------------------------------------- */

describe('isItemMarketExcluded', () => {
  test('returns true when getFlag returns true', () => {
    const item = { name: 'Test', getFlag: vi.fn(() => true) }
    expect(isItemMarketExcluded(item)).toBe(true)
    expect(item.getFlag).toHaveBeenCalledWith(MARKET_FLAG_NAMESPACE, MARKET_EXCLUDED_FLAG)
  })

  test('returns false when getFlag returns false', () => {
    const item = { name: 'Test', getFlag: vi.fn(() => false) }
    expect(isItemMarketExcluded(item)).toBe(false)
  })

  test('returns false when getFlag returns undefined', () => {
    const item = { name: 'Test', getFlag: vi.fn(() => undefined) }
    expect(isItemMarketExcluded(item)).toBe(false)
  })

  test('returns false when getFlag returns a non-boolean truthy value', () => {
    const item = { name: 'Test', getFlag: vi.fn(() => 'yes') }
    expect(isItemMarketExcluded(item)).toBe(false)
  })

  test('returns false gracefully when getFlag throws', () => {
    const item = {
      name: 'ErrorItem',
      getFlag: vi.fn(() => {
        throw new Error('flag error')
      }),
    }
    expect(isItemMarketExcluded(item)).toBe(false)
  })
})

/* -------------------------------------------- */

describe('setItemMarketExcluded', () => {
  test('calls setFlag with true to exclude item', async () => {
    const item = { name: 'Test', setFlag: vi.fn(async () => item) }
    await setItemMarketExcluded(item, true)
    expect(item.setFlag).toHaveBeenCalledWith(MARKET_FLAG_NAMESPACE, MARKET_EXCLUDED_FLAG, true)
  })

  test('calls setFlag with false to restore item eligibility', async () => {
    const item = { name: 'Test', setFlag: vi.fn(async () => item) }
    await setItemMarketExcluded(item, false)
    expect(item.setFlag).toHaveBeenCalledWith(MARKET_FLAG_NAMESPACE, MARKET_EXCLUDED_FLAG, false)
  })

  test('coerces non-boolean to false', async () => {
    const item = { name: 'Test', setFlag: vi.fn(async () => item) }
    await setItemMarketExcluded(item, undefined)
    expect(item.setFlag).toHaveBeenCalledWith(MARKET_FLAG_NAMESPACE, MARKET_EXCLUDED_FLAG, false)
  })
})

/* -------------------------------------------- */

describe('SETTING_* key constants', () => {
  test('SETTING_MARKET_ENABLED_SOURCES is a non-empty string', () => {
    expect(typeof SETTING_MARKET_ENABLED_SOURCES).toBe('string')
    expect(SETTING_MARKET_ENABLED_SOURCES.length).toBeGreaterThan(0)
  })

  test('SETTING_MARKET_ALLOWED_ITEM_TYPES is a non-empty string', () => {
    expect(typeof SETTING_MARKET_ALLOWED_ITEM_TYPES).toBe('string')
    expect(SETTING_MARKET_ALLOWED_ITEM_TYPES.length).toBeGreaterThan(0)
  })

  test('SETTING_MARKET_DEDUP_STRATEGY is a non-empty string', () => {
    expect(typeof SETTING_MARKET_DEDUP_STRATEGY).toBe('string')
    expect(SETTING_MARKET_DEDUP_STRATEGY.length).toBeGreaterThan(0)
  })

  test('all three setting keys are distinct', () => {
    const keys = new Set([SETTING_MARKET_ENABLED_SOURCES, SETTING_MARKET_ALLOWED_ITEM_TYPES, SETTING_MARKET_DEDUP_STRATEGY])
    expect(keys.size).toBe(3)
  })
})
