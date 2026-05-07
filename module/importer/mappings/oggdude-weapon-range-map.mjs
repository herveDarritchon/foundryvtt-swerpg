/**
 * Mapping table for OggDude weapon range codes to SWERPG system range types.
 * Priority is given to RangeValue over Range when both are present.
 * This table ensures deterministic mapping of range codes found in OggDude XML data
 * to the standardized range identifiers used by the SWERPG system.
 *
 * @type {Record<string, string>}
 */
export const WEAPON_RANGE_MAP = {
  // Primary Range Types
  ENGAGED: 'engaged',
  Engaged: 'engaged',
  ENG: 'engaged',
  eng: 'engaged',
  wrEngaged: 'engaged',
  WREngaged: 'engaged',
  wrengaged: 'engaged',

  SHORT: 'short',
  Short: 'short',
  SHO: 'short',
  sho: 'short',
  wrShort: 'short',
  WRShort: 'short',
  wrshort: 'short',

  MEDIUM: 'medium',
  Medium: 'medium',
  MED: 'medium',
  med: 'medium',
  wrMedium: 'medium',
  WRMedium: 'medium',
  wrmedium: 'medium',

  LONG: 'long',
  Long: 'long',
  LON: 'long',
  lon: 'long',
  wrLong: 'long',
  WRLong: 'long',
  wrlong: 'long',

  EXTREME: 'extreme',
  Extreme: 'extreme',
  EXT: 'extreme',
  ext: 'extreme',
  wrExtreme: 'extreme',
  WRExtreme: 'extreme',
  wrextreme: 'extreme',

  // Alternative formats
  close: 'engaged',
  Close: 'engaged',
  CLOSE: 'engaged',
  wrClose: 'engaged',
  WRClose: 'engaged',
  wrclose: 'engaged',

  far: 'long',
  Far: 'long',
  FAR: 'long',

  personal: 'engaged',
  Personal: 'engaged',
  PERSONAL: 'engaged',

  wrNoRange: 'engaged',
  WRNoRange: 'engaged',
  wrnorange: 'engaged',
}
