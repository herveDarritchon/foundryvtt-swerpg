import { describe, it, expect } from 'vitest'
import OggDudeImporter from '../../module/importer/oggDude.mjs'

// Tests ciblant uniquement les fonctions de mapping statiques (pures)

describe('OggDudeImporter - fonctions de mapping primitives', () => {
  it('mapMandatoryString retourne chaîne ou vide si invalide', () => {
    expect(OggDudeImporter.mapMandatoryString('label', 'abc')).toBe('abc')
    expect(OggDudeImporter.mapMandatoryString('label', null)).toBe('')
    expect(OggDudeImporter.mapMandatoryString('label', 12)).toBe('')
  })

  it('mapOptionalString retourne chaîne ou vide', () => {
    expect(OggDudeImporter.mapOptionalString('val')).toBe('val')
    expect(OggDudeImporter.mapOptionalString(undefined)).toBe('')
  })

  it('mapMandatoryNumber parse ou 0', () => {
    expect(OggDudeImporter.mapMandatoryNumber('num', '5')).toBe(5)
    expect(OggDudeImporter.mapMandatoryNumber('num', 'abc')).toBe(0)
    expect(OggDudeImporter.mapMandatoryNumber('num', null)).toBe(0)
  })

  it('mapOptionalNumber parse ou 0', () => {
    expect(OggDudeImporter.mapOptionalNumber('7')).toBe(7)
    expect(OggDudeImporter.mapOptionalNumber('zzz')).toBe(0)
  })

  it('mapMandatoryBoolean parse true/false ou false', () => {
    expect(OggDudeImporter.mapMandatoryBoolean('flag', 'true')).toBe(true)
    expect(OggDudeImporter.mapMandatoryBoolean('flag', 'false')).toBe(false)
    expect(OggDudeImporter.mapMandatoryBoolean('flag', null)).toBe(false)
  })

  it('mapOptionalBoolean parse', () => {
    expect(OggDudeImporter.mapOptionalBoolean('true')).toBe(true)
    expect(OggDudeImporter.mapOptionalBoolean('false')).toBe(false)
    expect(OggDudeImporter.mapOptionalBoolean(undefined)).toBe(false)
  })

  it('mapOptionalArray gère tableau, objet unique, valeur invalide', () => {
    const resultArr = OggDudeImporter.mapOptionalArray([{ a: 1 }, { a: 2 }], (v) => v.a)
    expect(resultArr).toEqual([1, 2])
    const resultObjSingle = OggDudeImporter.mapOptionalArray({ a: 3 }, (v) => v.a)
    expect(resultObjSingle).toEqual([3])
    const resultUndefined = OggDudeImporter.mapOptionalArray(null, (v) => v)
    expect(resultUndefined).toEqual([])
  })

  it('mapOptionalObject retourne {} si non objet', () => {
    const mapped = OggDudeImporter.mapOptionalObject({ x: 1 }, (v) => v)
    expect(Array.isArray(mapped)).toBe(true) // dans code actuel: retourne [mapper(value)]
    const empty = OggDudeImporter.mapOptionalObject(null, (v) => v)
    expect(empty).toEqual({})
  })
})
