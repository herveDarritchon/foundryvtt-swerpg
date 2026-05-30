import { describe, expect, it } from 'vitest'
import {
  DEFAULT_RARITY_MODIFIERS,
  DEFAULT_LOCATION_CONFIG,
  validateLocationConfig,
  validateLocationConfigMap,
  createLocationConfig,
  findLocationConfig,
  upsertLocationConfig,
  removeLocationConfig,
  parseLocationConfigMap,
  getRarityModifierForLocation,
} from '../../../module/lib/market/location-config.mjs'

/* -------------------------------------------- */
/*  Helpers                                     */
/* -------------------------------------------- */

function makeLocation(overrides = {}) {
  return {
    name: overrides.name ?? 'Mos Eisley',
    planetId: overrides.planetId ?? 'Tatooine',
    regionId: overrides.regionId ?? '',
    preferredMarketType: overrides.preferredMarketType ?? 'standard',
    rarityModifiers: overrides.rarityModifiers ?? { weapon: 1, armor: 0, gear: 0 },
  }
}

/* -------------------------------------------- */

describe('DEFAULT_RARITY_MODIFIERS', () => {
  it('has weapon, armor, gear all set to 0', () => {
    expect(DEFAULT_RARITY_MODIFIERS.weapon).toBe(0)
    expect(DEFAULT_RARITY_MODIFIERS.armor).toBe(0)
    expect(DEFAULT_RARITY_MODIFIERS.gear).toBe(0)
  })

  it('is frozen', () => {
    expect(Object.isFrozen(DEFAULT_RARITY_MODIFIERS)).toBe(true)
  })
})

describe('DEFAULT_LOCATION_CONFIG', () => {
  it('has preferredMarketType set to "standard"', () => {
    expect(DEFAULT_LOCATION_CONFIG.preferredMarketType).toBe('standard')
  })

  it('has empty planetId and regionId', () => {
    expect(DEFAULT_LOCATION_CONFIG.planetId).toBe('')
    expect(DEFAULT_LOCATION_CONFIG.regionId).toBe('')
  })

  it('is frozen', () => {
    expect(Object.isFrozen(DEFAULT_LOCATION_CONFIG)).toBe(true)
  })
})

/* -------------------------------------------- */

describe('validateLocationConfig', () => {
  it('returns empty array for a valid config', () => {
    const errors = validateLocationConfig(makeLocation())
    expect(errors).toHaveLength(0)
  })

  it('returns error when config is not an object', () => {
    expect(validateLocationConfig(null)).not.toHaveLength(0)
    expect(validateLocationConfig('string')).not.toHaveLength(0)
    expect(validateLocationConfig(42)).not.toHaveLength(0)
  })

  it('returns error when name is empty', () => {
    const errors = validateLocationConfig({ ...makeLocation(), name: '' })
    expect(errors.some((e) => e.includes('name'))).toBe(true)
  })

  it('returns error when name is not a string', () => {
    const errors = validateLocationConfig({ ...makeLocation(), name: 42 })
    expect(errors.some((e) => e.includes('name'))).toBe(true)
  })

  it('returns error when preferredMarketType is empty', () => {
    const errors = validateLocationConfig({ ...makeLocation(), preferredMarketType: '' })
    expect(errors.some((e) => e.includes('preferredMarketType'))).toBe(true)
  })

  it('returns error when rarityModifiers is not an object', () => {
    const errors = validateLocationConfig({ ...makeLocation(), rarityModifiers: 'bad' })
    expect(errors.some((e) => e.includes('rarityModifiers'))).toBe(true)
  })

  it('returns error when rarityModifiers contains non-finite value', () => {
    const errors = validateLocationConfig({ ...makeLocation(), rarityModifiers: { weapon: NaN } })
    expect(errors.some((e) => e.includes('rarityModifiers'))).toBe(true)
  })

  it('returns error when planetId is not a string', () => {
    const errors = validateLocationConfig({ ...makeLocation(), planetId: 42 })
    expect(errors.some((e) => e.includes('planetId'))).toBe(true)
  })

  it('accepts missing optional fields (planetId, regionId, rarityModifiers)', () => {
    const errors = validateLocationConfig({ name: 'Coruscant', preferredMarketType: 'standard' })
    expect(errors).toHaveLength(0)
  })
})

/* -------------------------------------------- */

describe('validateLocationConfigMap', () => {
  it('returns empty array for a valid map', () => {
    const map = { 'Mos Eisley': makeLocation() }
    const errors = validateLocationConfigMap(map)
    expect(errors).toHaveLength(0)
  })

  it('returns error when map is not an object', () => {
    expect(validateLocationConfigMap(null)).not.toHaveLength(0)
    expect(validateLocationConfigMap([])).not.toHaveLength(0)
    expect(validateLocationConfigMap('bad')).not.toHaveLength(0)
  })

  it('returns errors for each invalid location with key prefix', () => {
    const map = {
      'Mos Eisley': { preferredMarketType: '' },
    }
    const errors = validateLocationConfigMap(map)
    expect(errors.some((e) => e.startsWith('[Mos Eisley]'))).toBe(true)
  })

  it('returns empty array for an empty map', () => {
    expect(validateLocationConfigMap({})).toHaveLength(0)
  })
})

/* -------------------------------------------- */

describe('createLocationConfig', () => {
  it('creates a valid location with given name and defaults', () => {
    const loc = createLocationConfig('Mos Eisley')
    expect(loc.name).toBe('Mos Eisley')
    expect(loc.preferredMarketType).toBe('standard')
    expect(loc.planetId).toBe('')
    expect(loc.regionId).toBe('')
    expect(loc.rarityModifiers).toEqual(DEFAULT_RARITY_MODIFIERS)
  })

  it('merges overrides over defaults', () => {
    const loc = createLocationConfig('Tatooine', { preferredMarketType: 'local', planetId: 'Tatooine' })
    expect(loc.preferredMarketType).toBe('local')
    expect(loc.planetId).toBe('Tatooine')
  })

  it('deep-merges rarityModifiers', () => {
    const loc = createLocationConfig('Outer Rim', { rarityModifiers: { weapon: 2 } })
    expect(loc.rarityModifiers.weapon).toBe(2)
    expect(loc.rarityModifiers.armor).toBe(0)
    expect(loc.rarityModifiers.gear).toBe(0)
  })

  it('throws TypeError when name is empty', () => {
    expect(() => createLocationConfig('')).toThrow(TypeError)
  })

  it('throws TypeError when name is not a string', () => {
    expect(() => createLocationConfig(null)).toThrow(TypeError)
    expect(() => createLocationConfig(42)).toThrow(TypeError)
  })
})

/* -------------------------------------------- */

describe('findLocationConfig', () => {
  const map = {
    'Mos Eisley': makeLocation({ name: 'Mos Eisley' }),
    Coruscant: makeLocation({ name: 'Coruscant', preferredMarketType: 'specialized' }),
  }

  it('returns the config for an existing location', () => {
    const found = findLocationConfig(map, 'Mos Eisley')
    expect(found).not.toBeNull()
    expect(found.name).toBe('Mos Eisley')
  })

  it('returns null for a non-existent location', () => {
    expect(findLocationConfig(map, 'Dantooine')).toBeNull()
  })

  it('returns null when map is null or undefined', () => {
    expect(findLocationConfig(null, 'Mos Eisley')).toBeNull()
    expect(findLocationConfig(undefined, 'Mos Eisley')).toBeNull()
  })

  it('returns null when name is not a string', () => {
    expect(findLocationConfig(map, null)).toBeNull()
  })
})

/* -------------------------------------------- */

describe('upsertLocationConfig', () => {
  it('adds a new location to the map', () => {
    const map = {}
    const config = makeLocation({ name: 'Mos Eisley' })
    const result = upsertLocationConfig(map, config)
    expect(result['Mos Eisley']).toBeDefined()
    expect(result['Mos Eisley'].name).toBe('Mos Eisley')
  })

  it('replaces an existing location', () => {
    const map = { 'Mos Eisley': makeLocation({ name: 'Mos Eisley', preferredMarketType: 'standard' }) }
    const updated = makeLocation({ name: 'Mos Eisley', preferredMarketType: 'specialized' })
    const result = upsertLocationConfig(map, updated)
    expect(result['Mos Eisley'].preferredMarketType).toBe('specialized')
  })

  it('does not mutate the input map', () => {
    const map = {}
    upsertLocationConfig(map, makeLocation())
    expect(Object.keys(map)).toHaveLength(0)
  })

  it('throws TypeError when config.name is empty', () => {
    expect(() => upsertLocationConfig({}, { name: '' })).toThrow(TypeError)
  })

  it('throws TypeError when config.name is missing', () => {
    expect(() => upsertLocationConfig({}, {})).toThrow(TypeError)
  })
})

/* -------------------------------------------- */

describe('removeLocationConfig', () => {
  const map = {
    'Mos Eisley': makeLocation({ name: 'Mos Eisley' }),
    Coruscant: makeLocation({ name: 'Coruscant' }),
  }

  it('removes the location by name', () => {
    const result = removeLocationConfig(map, 'Mos Eisley')
    expect(result['Mos Eisley']).toBeUndefined()
    expect(result.Coruscant).toBeDefined()
  })

  it('returns the map unchanged when name does not exist', () => {
    const result = removeLocationConfig(map, 'Dantooine')
    expect(Object.keys(result)).toHaveLength(2)
  })

  it('does not mutate the input map', () => {
    removeLocationConfig(map, 'Mos Eisley')
    expect(map['Mos Eisley']).toBeDefined()
  })

  it('returns empty object when map is null', () => {
    expect(removeLocationConfig(null, 'anything')).toEqual({})
  })
})

/* -------------------------------------------- */

describe('parseLocationConfigMap', () => {
  it('returns a parsed object for valid JSON', () => {
    const map = { 'Mos Eisley': makeLocation() }
    const result = parseLocationConfigMap(JSON.stringify(map))
    expect(result['Mos Eisley']).toBeDefined()
  })

  it('returns empty object for invalid JSON', () => {
    expect(parseLocationConfigMap('{broken')).toEqual({})
  })

  it('returns empty object for empty string', () => {
    expect(parseLocationConfigMap('')).toEqual({})
  })

  it('returns empty object for a JSON array', () => {
    expect(parseLocationConfigMap('[]')).toEqual({})
  })

  it('returns empty object for a JSON null', () => {
    expect(parseLocationConfigMap('null')).toEqual({})
  })

  it('returns empty object when raw is not a string', () => {
    expect(parseLocationConfigMap(null)).toEqual({})
    expect(parseLocationConfigMap(undefined)).toEqual({})
    expect(parseLocationConfigMap(42)).toEqual({})
  })
})

/* -------------------------------------------- */

describe('getRarityModifierForLocation', () => {
  const map = {
    'Mos Eisley': makeLocation({ name: 'Mos Eisley', rarityModifiers: { weapon: 2, armor: -1, gear: 0 } }),
  }

  it('returns the rarity modifier for an existing location and type', () => {
    expect(getRarityModifierForLocation(map, 'Mos Eisley', 'weapon')).toBe(2)
    expect(getRarityModifierForLocation(map, 'Mos Eisley', 'armor')).toBe(-1)
  })

  it('returns 0 for a type with no modifier', () => {
    expect(getRarityModifierForLocation(map, 'Mos Eisley', 'gear')).toBe(0)
  })

  it('returns 0 when location does not exist', () => {
    expect(getRarityModifierForLocation(map, 'Dantooine', 'weapon')).toBe(0)
  })

  it('returns 0 for a type not present in rarityModifiers', () => {
    expect(getRarityModifierForLocation(map, 'Mos Eisley', 'unknown-type')).toBe(0)
  })

  it('returns 0 when map is null', () => {
    expect(getRarityModifierForLocation(null, 'Mos Eisley', 'weapon')).toBe(0)
  })
})
