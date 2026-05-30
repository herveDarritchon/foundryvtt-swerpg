import { describe, test, expect, beforeEach, vi } from 'vitest'
import {
  readMarketExcludedItems,
  writeMarketExcludedItems,
  readMarketTypeModifiers,
  writeMarketTypeModifiers,
  readMarketGlobalPriceModifier,
  writeMarketGlobalPriceModifier,
  readMarketLocationConfigs,
  writeMarketLocationConfigs,
  writeMarketConfig,
  SETTING_MARKET_EXCLUDED_ITEMS,
  SETTING_MARKET_TYPE_MODIFIERS,
  SETTING_MARKET_GLOBAL_PRICE_MOD,
  SETTING_MARKET_LOCATION_CONFIGS,
} from '../../../module/lib/market/market-settings.mjs'

const SYSTEM_ID = 'swerpg'

/**
 * Build a minimal game.settings stub with controllable store.
 */
function makeSettingsStub(store = {}) {
  return {
    register: vi.fn(),
    get: vi.fn((systemId, key) => store[key] ?? null),
    set: vi.fn(async (systemId, key, value) => {
      store[key] = value
    }),
  }
}

/* -------------------------------------------- */

describe('readMarketExcludedItems', () => {
  beforeEach(() => {
    global.game = { settings: makeSettingsStub() }
  })

  test('returns empty array when setting is not set', () => {
    expect(readMarketExcludedItems(SYSTEM_ID)).toEqual([])
  })

  test('returns parsed array when stored as JSON', () => {
    const uuids = ['Item.abc123', 'Compendium.swerpg.weapons.Item.xyz']
    global.game = { settings: makeSettingsStub({ [SETTING_MARKET_EXCLUDED_ITEMS]: JSON.stringify(uuids) }) }
    expect(readMarketExcludedItems(SYSTEM_ID)).toEqual(uuids)
  })

  test('returns empty array on malformed JSON', () => {
    global.game = { settings: makeSettingsStub({ [SETTING_MARKET_EXCLUDED_ITEMS]: '{broken' }) }
    expect(readMarketExcludedItems(SYSTEM_ID)).toEqual([])
  })

  test('returns empty array when stored value is not an array', () => {
    global.game = { settings: makeSettingsStub({ [SETTING_MARKET_EXCLUDED_ITEMS]: '{"a":1}' }) }
    expect(readMarketExcludedItems(SYSTEM_ID)).toEqual([])
  })

  test('returns empty array gracefully when settings.get throws', () => {
    global.game = {
      settings: {
        get: vi.fn(() => {
          throw new Error('error')
        }),
      },
    }
    expect(readMarketExcludedItems(SYSTEM_ID)).toEqual([])
  })
})

/* -------------------------------------------- */

describe('writeMarketExcludedItems', () => {
  test('calls settings.set with JSON-serialised array', async () => {
    const store = {}
    global.game = { settings: makeSettingsStub(store) }
    const uuids = ['Item.abc123']
    await writeMarketExcludedItems(SYSTEM_ID, uuids)
    expect(store[SETTING_MARKET_EXCLUDED_ITEMS]).toBe(JSON.stringify(uuids))
  })

  test('persists empty array correctly', async () => {
    const store = {}
    global.game = { settings: makeSettingsStub(store) }
    await writeMarketExcludedItems(SYSTEM_ID, [])
    expect(store[SETTING_MARKET_EXCLUDED_ITEMS]).toBe('[]')
  })
})

/* -------------------------------------------- */

describe('readMarketTypeModifiers', () => {
  beforeEach(() => {
    global.game = { settings: makeSettingsStub() }
  })

  test('returns empty object when setting is not set', () => {
    expect(readMarketTypeModifiers(SYSTEM_ID)).toEqual({})
  })

  test('returns parsed object when stored as JSON', () => {
    const modifiers = { weapon: { priceModifier: 0.1 }, armor: { priceModifier: -0.05 } }
    global.game = { settings: makeSettingsStub({ [SETTING_MARKET_TYPE_MODIFIERS]: JSON.stringify(modifiers) }) }
    expect(readMarketTypeModifiers(SYSTEM_ID)).toEqual(modifiers)
  })

  test('returns empty object on malformed JSON', () => {
    global.game = { settings: makeSettingsStub({ [SETTING_MARKET_TYPE_MODIFIERS]: '{broken' }) }
    expect(readMarketTypeModifiers(SYSTEM_ID)).toEqual({})
  })

  test('returns empty object when stored value is an array', () => {
    global.game = { settings: makeSettingsStub({ [SETTING_MARKET_TYPE_MODIFIERS]: '[]' }) }
    expect(readMarketTypeModifiers(SYSTEM_ID)).toEqual({})
  })

  test('returns empty object gracefully when settings.get throws', () => {
    global.game = {
      settings: {
        get: vi.fn(() => {
          throw new Error('error')
        }),
      },
    }
    expect(readMarketTypeModifiers(SYSTEM_ID)).toEqual({})
  })
})

/* -------------------------------------------- */

describe('writeMarketTypeModifiers', () => {
  test('calls settings.set with JSON-serialised object', async () => {
    const store = {}
    global.game = { settings: makeSettingsStub(store) }
    const modifiers = { weapon: { priceModifier: 0.1 } }
    await writeMarketTypeModifiers(SYSTEM_ID, modifiers)
    expect(store[SETTING_MARKET_TYPE_MODIFIERS]).toBe(JSON.stringify(modifiers))
  })
})

/* -------------------------------------------- */

describe('readMarketGlobalPriceModifier', () => {
  beforeEach(() => {
    global.game = { settings: makeSettingsStub() }
  })

  test('returns 0 when setting is not set', () => {
    expect(readMarketGlobalPriceModifier(SYSTEM_ID)).toBe(0)
  })

  test('returns the stored number', () => {
    global.game = { settings: makeSettingsStub({ [SETTING_MARKET_GLOBAL_PRICE_MOD]: 15 }) }
    expect(readMarketGlobalPriceModifier(SYSTEM_ID)).toBe(15)
  })

  test('returns 0 when stored value is NaN', () => {
    global.game = { settings: makeSettingsStub({ [SETTING_MARKET_GLOBAL_PRICE_MOD]: NaN }) }
    expect(readMarketGlobalPriceModifier(SYSTEM_ID)).toBe(0)
  })

  test('returns 0 gracefully when settings.get throws', () => {
    global.game = {
      settings: {
        get: vi.fn(() => {
          throw new Error('error')
        }),
      },
    }
    expect(readMarketGlobalPriceModifier(SYSTEM_ID)).toBe(0)
  })

  test('supports negative values', () => {
    global.game = { settings: makeSettingsStub({ [SETTING_MARKET_GLOBAL_PRICE_MOD]: -10 }) }
    expect(readMarketGlobalPriceModifier(SYSTEM_ID)).toBe(-10)
  })
})

/* -------------------------------------------- */

describe('writeMarketGlobalPriceModifier', () => {
  test('calls settings.set with the number', async () => {
    const store = {}
    global.game = { settings: makeSettingsStub(store) }
    await writeMarketGlobalPriceModifier(SYSTEM_ID, 25)
    expect(store[SETTING_MARKET_GLOBAL_PRICE_MOD]).toBe(25)
  })
})

/* -------------------------------------------- */

describe('readMarketLocationConfigs', () => {
  beforeEach(() => {
    global.game = { settings: makeSettingsStub() }
  })

  test('returns empty object when setting is not set', () => {
    expect(readMarketLocationConfigs(SYSTEM_ID)).toEqual({})
  })

  test('returns parsed map when stored as JSON', () => {
    const configs = {
      'Mos Eisley': { name: 'Mos Eisley', preferredMarketType: 'standard', rarityModifiers: { weapon: 1, armor: 0, gear: 0 } },
    }
    global.game = { settings: makeSettingsStub({ [SETTING_MARKET_LOCATION_CONFIGS]: JSON.stringify(configs) }) }
    const result = readMarketLocationConfigs(SYSTEM_ID)
    expect(result['Mos Eisley']).toBeDefined()
    expect(result['Mos Eisley'].preferredMarketType).toBe('standard')
  })

  test('returns empty object on malformed JSON', () => {
    global.game = { settings: makeSettingsStub({ [SETTING_MARKET_LOCATION_CONFIGS]: '{broken' }) }
    expect(readMarketLocationConfigs(SYSTEM_ID)).toEqual({})
  })

  test('returns empty object gracefully when settings.get throws', () => {
    global.game = {
      settings: {
        get: vi.fn(() => {
          throw new Error('error')
        }),
      },
    }
    expect(readMarketLocationConfigs(SYSTEM_ID)).toEqual({})
  })
})

/* -------------------------------------------- */

describe('writeMarketLocationConfigs', () => {
  test('calls settings.set with JSON-serialised map', async () => {
    const store = {}
    global.game = { settings: makeSettingsStub(store) }
    const configs = { 'Mos Eisley': { name: 'Mos Eisley', preferredMarketType: 'standard' } }
    await writeMarketLocationConfigs(SYSTEM_ID, configs)
    expect(store[SETTING_MARKET_LOCATION_CONFIGS]).toBe(JSON.stringify(configs))
  })
})

/* -------------------------------------------- */

describe('writeMarketConfig', () => {
  test('writes all three base market settings', async () => {
    const store = {}
    global.game = { settings: makeSettingsStub(store) }
    await writeMarketConfig(SYSTEM_ID, {
      enabledSources: ['compendium'],
      allowedItemTypes: ['weapon', 'armor'],
      dedupStrategy: 'prefer-newest',
    })
    expect(store.marketEnabledSources).toBe(JSON.stringify(['compendium']))
    expect(store.marketAllowedItemTypes).toBe(JSON.stringify(['weapon', 'armor']))
    expect(store.marketDedupStrategy).toBe('prefer-newest')
  })
})

/* -------------------------------------------- */

describe('SETTING_* constant keys', () => {
  test('SETTING_MARKET_EXCLUDED_ITEMS is a non-empty string', () => {
    expect(typeof SETTING_MARKET_EXCLUDED_ITEMS).toBe('string')
    expect(SETTING_MARKET_EXCLUDED_ITEMS.length).toBeGreaterThan(0)
  })

  test('SETTING_MARKET_TYPE_MODIFIERS is a non-empty string', () => {
    expect(typeof SETTING_MARKET_TYPE_MODIFIERS).toBe('string')
    expect(SETTING_MARKET_TYPE_MODIFIERS.length).toBeGreaterThan(0)
  })

  test('SETTING_MARKET_GLOBAL_PRICE_MOD is a non-empty string', () => {
    expect(typeof SETTING_MARKET_GLOBAL_PRICE_MOD).toBe('string')
    expect(SETTING_MARKET_GLOBAL_PRICE_MOD.length).toBeGreaterThan(0)
  })

  test('SETTING_MARKET_LOCATION_CONFIGS is a non-empty string', () => {
    expect(typeof SETTING_MARKET_LOCATION_CONFIGS).toBe('string')
    expect(SETTING_MARKET_LOCATION_CONFIGS.length).toBeGreaterThan(0)
  })

  test('all four new Phase 9 setting keys are distinct', () => {
    const keys = new Set([SETTING_MARKET_EXCLUDED_ITEMS, SETTING_MARKET_TYPE_MODIFIERS, SETTING_MARKET_GLOBAL_PRICE_MOD, SETTING_MARKET_LOCATION_CONFIGS])
    expect(keys.size).toBe(4)
  })
})
