/**
 * Mapping table for OggDude weapon Type values to SWERPG system weaponType IDs.
 * The raw Type is preserved in flags.swerpg.oggdude.type; this table normalizes
 * it into a stable slug for system.weaponType.
 *
 * Unknown types are slugified (lowercased, spaces → hyphens) with a warning.
 *
 * @type {Record<string, string>}
 */
export const WEAPON_TYPE_MAP = {
  'Blasters': 'blasters',
  'Blasters/Heavy': 'heavy-blaster',
  'Energy Weapon': 'energy-weapon',
  'Melee': 'melee',
  'Explosives/Other': 'explosive-other',
  'Vehicle': 'vehicle',
  'Slugthrower': 'slugthrower',
  'Lightsaber': 'lightsaber',
  'Lightwhip': 'lightwhip',
  'Brawling': 'brawl',
  'Thrown': 'thrown',
  'Tool': 'tool',
  'Flame Weapon': 'flame-weapon',
  'Heavy': 'heavy',
  'Grenade': 'grenade',
  'Missile': 'missile',
  'Ion Weapon': 'ion-weapon',
}

/**
 * Slugify a weapon type string for use as weaponType value.
 * Falls back gracefully for empty/null inputs.
 * @param {string} raw - The raw weapon type string
 * @returns {string} The slugified type
 */
export function slugifyWeaponType(raw) {
  if (!raw) return ''
  return String(raw)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Resolve an OggDude weapon Type into a stable SWERPG weaponType.
 * @param {string} rawType - The raw Type value from OggDude XML
 * @returns {{ weaponType: string, isMapped: boolean }}
 */
export function resolveWeaponType(rawType) {
  if (!rawType) {
    return { weaponType: '', isMapped: false }
  }
  const mapped = WEAPON_TYPE_MAP[rawType]
  if (mapped) {
    return { weaponType: mapped, isMapped: true }
  }
  return { weaponType: slugifyWeaponType(rawType), isMapped: false }
}
