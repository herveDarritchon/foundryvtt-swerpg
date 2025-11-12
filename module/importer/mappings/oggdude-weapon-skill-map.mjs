/**
 * Mapping table for OggDude weapon skill keys to SWERPG system skill IDs.
 * This table ensures deterministic mapping of skill codes found in OggDude XML data
 * to the standardized skill identifiers used by the SWERPG system.
 *
 * @type {Record<string, string>}
 */
export const WEAPON_SKILL_MAP = {
  // Ranged Skills
  RANGL: 'rangedLight',
  RANGED_LIGHT: 'rangedLight',
  RangedLight: 'rangedLight',
  RL: 'rangedLight',

  RANGH: 'rangedHeavy',
  RANGED_HEAVY: 'rangedHeavy',
  RangedHeavy: 'rangedHeavy',
  RH: 'rangedHeavy',

  GUNN: 'gunnery',
  GUNNERY: 'gunnery',
  Gunnery: 'gunnery',
  GUN: 'gunnery',

  // Melee Skills
  BRAWL: 'brawl',
  Brawl: 'brawl',
  BR: 'brawl',

  MELEE: 'melee',
  Melee: 'melee',
  MEL: 'melee',

  LTSABER: 'lightSaber',
  LIGHTSABER: 'lightSaber',
  LightSaber: 'lightSaber',
  LS: 'lightSaber',
  LIGHTSABRE: 'lightSaber',
}
