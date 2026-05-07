/**
 * Mapping and resolver for OggDude weapon Categories → system.category.
 *
 * Resolution priority (from ADR-0007):
 * 1. First recognised <Categories> value → canonical system category
 * 2. Fallback via mapped SkillKey → category
 * 3. Fallback via mapped Range → category
 * 4. Ultimate fallback → DEFAULT_CATEGORY ('ranged')
 */

/**
 * Direct mapping from OggDude Category values to canonical system category IDs.
 * @type {Record<string, string>}
 */
export const WEAPON_CATEGORY_MAP = {
  // Direct matches
  'Ranged': 'ranged',
  'Melee': 'melee',
  'Thrown': 'thrown',
  'Vehicle': 'vehicle',
  'Starship': 'vehicle',
  'Explosive': 'explosive',
  'Heavy': 'gunnery',
  'Laser': 'ranged',

  // Compound / subtype categories → resolved to canonical
  'Cutting Edge Melee': 'melee',
  'Powered Melee': 'melee',
  'Bludgeoning Melee': 'melee',
  'Template (Brawl and Melee)': 'melee',
  'Brawling': 'natural',
  'Bludgeoning Brawl': 'natural',
  'Portable Gunnery': 'gunnery',
  'Template (Ranged)': 'ranged',
  'Grenade': 'explosive',
  'Missile': 'vehicle',
  'Lightsaber': 'melee',
  'Shield': 'melee',
  'Space Mine': 'explosive',
  'Ion': 'ranged',
  'Micro-Rocket': 'explosive',
  'Rocket': 'explosive',
  'Proton Torpedo': 'vehicle',
  'Proton Bomb': 'explosive',
  'Flak': 'explosive',
  'Mine': 'explosive',
  'Tractor': 'vehicle',
}

/**
 * Mapping from mapped skill IDs to fallback system category.
 * Used when no Category tag is recognised.
 * @type {Record<string, string>}
 */
export const SKILL_TO_CATEGORY_MAP = {
  'rangedLight': 'ranged',
  'rangedHeavy': 'ranged',
  'gunnery': 'gunnery',
  'brawl': 'natural',
  'melee': 'melee',
  'lightSaber': 'melee',
}

/**
 * Mapping from mapped range IDs to fallback system category.
 * Used when neither Category nor SkillKey yields a category.
 * @type {Record<string, string>}
 */
export const RANGE_TO_CATEGORY_MAP = {
  'engaged': 'melee',
  'short': 'ranged',
  'medium': 'ranged',
  'long': 'ranged',
  'extreme': 'ranged',
}

/**
 * Resolve a weapon's category from its OggDude data using the ADR-0007 priority chain.
 * @param {string[]} rawCategories - Array of category strings from OggDude XML
 * @param {string} mappedSkill - The already-mapped SWERPG skill ID
 * @param {string} mappedRange - The already-mapped SWERPG range ID
 * @param {string} defaultCategory - Fallback if nothing matches
 * @returns {{ category: string, source: string }} The resolved category and how it was resolved
 */
export function resolveWeaponCategory(rawCategories, mappedSkill, mappedRange, defaultCategory = 'ranged') {
  // Priority 1: direct match from Categories
  if (Array.isArray(rawCategories) && rawCategories.length > 0) {
    for (const raw of rawCategories) {
      const trimmed = raw?.trim()
      if (!trimmed) continue
      const mapped = WEAPON_CATEGORY_MAP[trimmed]
      if (mapped) {
        return { category: mapped, source: 'category' }
      }
    }
  }

  // Priority 2: fallback from SkillKey
  if (mappedSkill && SKILL_TO_CATEGORY_MAP[mappedSkill]) {
    return { category: SKILL_TO_CATEGORY_MAP[mappedSkill], source: 'skill' }
  }

  // Priority 3: fallback from Range
  if (mappedRange && RANGE_TO_CATEGORY_MAP[mappedRange]) {
    return { category: RANGE_TO_CATEGORY_MAP[mappedRange], source: 'range' }
  }

  // Priority 4: default
  return { category: defaultCategory, source: 'default' }
}
