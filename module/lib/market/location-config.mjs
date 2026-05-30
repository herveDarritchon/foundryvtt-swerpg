/**
 * @typedef {Object} LocationRarityModifiers
 * @property {number} [weapon]  Rarity offset applied to weapons at this location
 * @property {number} [armor]   Rarity offset applied to armor at this location
 * @property {number} [gear]    Rarity offset applied to gear at this location
 */

/**
 * @typedef {Object} LocationConfig
 * @property {string} name                       Display name of the location
 * @property {string} [planetId]                 Optional planet identifier
 * @property {string} [regionId]                 Optional region identifier
 * @property {string} preferredMarketType        Preferred market type key (one of MARKET_TYPES keys)
 * @property {LocationRarityModifiers} rarityModifiers  Per-type rarity offsets
 */

/**
 * @typedef {Record<string, LocationConfig>} LocationConfigMap
 *   Map of location name (key) to its configuration.
 */

/* -------------------------------------------- */

/**
 * Default rarity modifiers with no modifications.
 * All offsets default to 0 (no effect).
 * @type {Readonly<LocationRarityModifiers>}
 */
export const DEFAULT_RARITY_MODIFIERS = Object.freeze({
  weapon: 0,
  armor: 0,
  gear: 0,
})

/**
 * Default location configuration applied when creating a new location.
 * @type {Readonly<Omit<LocationConfig, 'name'>>}
 */
export const DEFAULT_LOCATION_CONFIG = Object.freeze({
  planetId: '',
  regionId: '',
  preferredMarketType: 'standard',
  rarityModifiers: DEFAULT_RARITY_MODIFIERS,
})

/* -------------------------------------------- */

/**
 * Validate a single LocationConfig object.
 * Returns an array of error strings — empty array means valid.
 *
 * Pure domain function — no Foundry dependencies.
 *
 * @param {unknown} config  The config to validate
 * @returns {string[]} Validation error messages
 */
export function validateLocationConfig(config) {
  const errors = []

  if (!config || typeof config !== 'object') {
    errors.push('LocationConfig must be a plain object')
    return errors
  }

  if (typeof config.name !== 'string' || config.name.trim().length === 0) {
    errors.push('LocationConfig.name must be a non-empty string')
  }

  if (typeof config.preferredMarketType !== 'string' || config.preferredMarketType.trim().length === 0) {
    errors.push('LocationConfig.preferredMarketType must be a non-empty string')
  }

  if (config.rarityModifiers !== undefined) {
    if (typeof config.rarityModifiers !== 'object' || config.rarityModifiers === null) {
      errors.push('LocationConfig.rarityModifiers must be an object')
    } else {
      for (const [itemType, offset] of Object.entries(config.rarityModifiers)) {
        if (typeof offset !== 'number' || !Number.isFinite(offset)) {
          errors.push(`LocationConfig.rarityModifiers.${itemType} must be a finite number`)
        }
      }
    }
  }

  if (config.planetId !== undefined && typeof config.planetId !== 'string') {
    errors.push('LocationConfig.planetId must be a string')
  }

  if (config.regionId !== undefined && typeof config.regionId !== 'string') {
    errors.push('LocationConfig.regionId must be a string')
  }

  return errors
}

/* -------------------------------------------- */

/**
 * Validate a LocationConfigMap — an object keyed by location name.
 * Returns an array of error strings — empty array means valid.
 *
 * @param {unknown} configMap  The map to validate
 * @returns {string[]} Validation error messages
 */
export function validateLocationConfigMap(configMap) {
  const errors = []

  if (!configMap || typeof configMap !== 'object' || Array.isArray(configMap)) {
    errors.push('LocationConfigMap must be a plain object')
    return errors
  }

  for (const [key, config] of Object.entries(configMap)) {
    const configErrors = validateLocationConfig({ ...config, name: key })
    for (const err of configErrors) {
      errors.push(`[${key}] ${err}`)
    }
  }

  return errors
}

/* -------------------------------------------- */

/**
 * Create a new LocationConfig with defaults merged with the provided overrides.
 * Merges rarityModifiers deeply.
 *
 * Pure domain function — no Foundry dependencies.
 *
 * @param {string} name       Display name for the location
 * @param {Partial<LocationConfig>} [overrides]  Optional config overrides
 * @returns {LocationConfig}
 * @throws {TypeError} If name is not a non-empty string
 */
export function createLocationConfig(name, overrides = {}) {
  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new TypeError('createLocationConfig: name must be a non-empty string')
  }

  const rarityModifiers = {
    ...DEFAULT_RARITY_MODIFIERS,
    ...(overrides.rarityModifiers ?? {}),
  }

  return {
    name,
    planetId: overrides.planetId ?? DEFAULT_LOCATION_CONFIG.planetId,
    regionId: overrides.regionId ?? DEFAULT_LOCATION_CONFIG.regionId,
    preferredMarketType: overrides.preferredMarketType ?? DEFAULT_LOCATION_CONFIG.preferredMarketType,
    rarityModifiers,
  }
}

/* -------------------------------------------- */

/**
 * Look up a LocationConfig by name in the given map.
 * Returns null when the location is not found.
 *
 * @param {LocationConfigMap} configMap  The location config map
 * @param {string}            name       Location name to look up
 * @returns {LocationConfig|null}
 */
export function findLocationConfig(configMap, name) {
  if (!configMap || typeof name !== 'string') return null
  return configMap[name] ?? null
}

/* -------------------------------------------- */

/**
 * Add or replace a LocationConfig entry in the given map.
 * Returns a new map — does not mutate the input.
 *
 * @param {LocationConfigMap} configMap  The existing map
 * @param {LocationConfig}    config     The config to add or update (uses config.name as key)
 * @returns {LocationConfigMap}
 * @throws {TypeError} If config.name is not a non-empty string
 */
export function upsertLocationConfig(configMap, config) {
  if (!config || typeof config.name !== 'string' || config.name.trim().length === 0) {
    throw new TypeError('upsertLocationConfig: config.name must be a non-empty string')
  }
  return { ...configMap, [config.name]: config }
}

/* -------------------------------------------- */

/**
 * Remove a LocationConfig entry from the map by name.
 * Returns a new map — does not mutate the input.
 * If the name does not exist in the map, returns the map unchanged.
 *
 * @param {LocationConfigMap} configMap  The existing map
 * @param {string}            name       Location name to remove
 * @returns {LocationConfigMap}
 */
export function removeLocationConfig(configMap, name) {
  if (!configMap || !name) return configMap ?? {}
  const { [name]: _removed, ...remaining } = configMap
  return remaining
}

/* -------------------------------------------- */

/**
 * Parse a JSON string into a LocationConfigMap.
 * Returns an empty object on any parse or validation error.
 *
 * @param {string} raw  Raw JSON string
 * @returns {LocationConfigMap}
 */
export function parseLocationConfigMap(raw) {
  if (typeof raw !== 'string' || raw.trim().length === 0) return {}
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}
    return parsed
  } catch {
    return {}
  }
}

/* -------------------------------------------- */

/**
 * Get the rarity offset for a given item type at a specific location.
 * Returns 0 when the location is not found or has no modifier for the given type.
 *
 * @param {LocationConfigMap} configMap   The location config map
 * @param {string}            locationName  Location name to look up
 * @param {string}            itemType      Item type key (e.g. 'weapon', 'armor', 'gear')
 * @returns {number}  Rarity offset (integer or fractional, may be negative)
 */
export function getRarityModifierForLocation(configMap, locationName, itemType) {
  const config = findLocationConfig(configMap, locationName)
  if (!config) return 0
  return config.rarityModifiers?.[itemType] ?? 0
}
