import { describe, it, expect } from 'vitest'
import OggDudeImporter from '../../module/importer/oggDude.mjs'

describe('OggDudeImporter mapping helpers', () => {
  it('mapMandatoryString returns empty string and logs warning when invalid', () => {
    const value = OggDudeImporter.mapMandatoryString('Label', null)
    expect(value).toBe('')
  })

  it('mapOptionalString returns empty string when invalid', () => {
    expect(OggDudeImporter.mapOptionalString(null)).toBe('')
  })

  it('mapMandatoryNumber returns 0 when invalid', () => {
    expect(OggDudeImporter.mapMandatoryNumber('Num', null)).toBe(0)
  })

  it('mapOptionalNumber parses number or returns 0', () => {
    expect(OggDudeImporter.mapOptionalNumber('42')).toBe(42)
    expect(OggDudeImporter.mapOptionalNumber(undefined)).toBe(0)
  })

  it('mapMandatoryBoolean returns false when invalid', () => {
    expect(OggDudeImporter.mapMandatoryBoolean('Bool', null)).toBe(false)
  })

  it('mapOptionalBoolean maps string true', () => {
    expect(OggDudeImporter.mapOptionalBoolean('true')).toBe(true)
    expect(OggDudeImporter.mapOptionalBoolean('false')).toBe(false)
  })

  it('mapOptionalArray handles array, single object and invalid', () => {
    const mapper = (x) => x.value
    expect(OggDudeImporter.mapOptionalArray([{ value: 1 }, { value: 2 }], mapper)).toEqual([1, 2])
    expect(OggDudeImporter.mapOptionalArray({ value: 3 }, mapper)).toEqual([3])
    expect(OggDudeImporter.mapOptionalArray(null, mapper)).toEqual([])
  })

  it('mapOptionalObject returns mapped single object or empty object', () => {
    const mapper = (x) => ({ value: x.value })
    expect(OggDudeImporter.mapOptionalObject({ value: 9 }, mapper)).toEqual([{ value: 9 }])
    expect(OggDudeImporter.mapOptionalObject(null, mapper)).toEqual({})
  })
})
