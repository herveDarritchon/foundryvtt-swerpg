/**
 * Mapping table for OggDude weapon hands values to SWERPG system slot identifiers.
 * This table maps various representations of hand requirements to standardized slot values.
 *
 * @type {Record<string, string>}
 */
export const WEAPON_HANDS_MAP = {
  // One-handed weapon mappings
  1: 'mainhand',
  One: 'mainhand',
  one: 'mainhand',
  ONE: 'mainhand',
  Single: 'mainhand',
  single: 'mainhand',
  SINGLE: 'mainhand',
  Main: 'mainhand',
  main: 'mainhand',
  MAIN: 'mainhand',

  // Two-handed weapon mappings
  2: 'twohand',
  Two: 'twohand',
  two: 'twohand',
  TWO: 'twohand',
  TwoHanded: 'twohand',
  'Two-Handed': 'twohand',
  twoHanded: 'twohand',
  'two-handed': 'twohand',
  TWO_HANDED: 'twohand',
  Both: 'twohand',
  both: 'twohand',
  BOTH: 'twohand',

  // Either hand (flexible) - defaults to mainhand
  Either: 'mainhand',
  either: 'mainhand',
  EITHER: 'mainhand',
  Any: 'mainhand',
  any: 'mainhand',
  ANY: 'mainhand',
}
