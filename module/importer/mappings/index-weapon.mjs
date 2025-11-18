/**
 * Central exports for OggDude weapon mapping tables and utilities.
 * This module provides all the mapping tables and utility functions needed
 * to convert OggDude XML weapon data to SWERPG system format.
 */

export { WEAPON_SKILL_MAP } from './oggdude-weapon-skill-map.mjs'
export { WEAPON_RANGE_MAP } from './oggdude-weapon-range-map.mjs'
export { WEAPON_QUALITY_MAP } from './oggdude-weapon-quality-map.mjs'
export { WEAPON_HANDS_MAP } from './oggdude-weapon-hands-map.mjs'
export { clampNumber, sanitizeText, parseOggDudeBoolean, sanitizeOggDudeWeaponDescription } from './oggdude-weapon-utils.mjs'
