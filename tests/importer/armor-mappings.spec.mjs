/**
 * Tests pour les tables de mapping des armures OggDude
 */
import { describe, it, expect } from 'vitest'
import {
  ARMOR_CATEGORY_MAP,
  resolveArmorCategory,
  getSupportedOggDudeCategories
} from '../../module/importer/mappings/oggdude-armor-category-map.mjs'
import {
  ARMOR_PROPERTY_MAP,
  resolveArmorProperty,
  resolveArmorProperties,
  getSupportedOggDudeProperties
} from '../../module/importer/mappings/oggdude-armor-property-map.mjs'

describe('ARMOR_CATEGORY_MAP', () => {
  it('devrait contenir les catégories de base', () => {
    expect(ARMOR_CATEGORY_MAP['Light']).toBeDefined()
    expect(ARMOR_CATEGORY_MAP['Medium']).toBeDefined()
    expect(ARMOR_CATEGORY_MAP['Heavy']).toBeDefined()
    expect(ARMOR_CATEGORY_MAP['Light'].swerpgCategory).toBe('light')
    expect(ARMOR_CATEGORY_MAP['Medium'].swerpgCategory).toBe('medium')
    expect(ARMOR_CATEGORY_MAP['Heavy'].swerpgCategory).toBe('heavy')
  })

  it('devrait supporter les variantes en minuscules', () => {
    expect(ARMOR_CATEGORY_MAP['light'].swerpgCategory).toBe('light')
    expect(ARMOR_CATEGORY_MAP['medium'].swerpgCategory).toBe('medium')
    expect(ARMOR_CATEGORY_MAP['heavy'].swerpgCategory).toBe('heavy')
  })

  it('devrait supporter les catégories spéciales', () => {
    expect(ARMOR_CATEGORY_MAP['Natural'].swerpgCategory).toBe('natural')
    expect(ARMOR_CATEGORY_MAP['Unarmored'].swerpgCategory).toBe('unarmored')
  })

  it('devrait supporter les codes numériques', () => {
    expect(ARMOR_CATEGORY_MAP['0'].swerpgCategory).toBe('unarmored')
    expect(ARMOR_CATEGORY_MAP['1'].swerpgCategory).toBe('light')
    expect(ARMOR_CATEGORY_MAP['2'].swerpgCategory).toBe('medium')
    expect(ARMOR_CATEGORY_MAP['3'].swerpgCategory).toBe('heavy')
    expect(ARMOR_CATEGORY_MAP['4'].swerpgCategory).toBe('natural')
  })
})

describe('resolveArmorCategory', () => {
  it('devrait résoudre les catégories valides', () => {
    expect(resolveArmorCategory('Light')).toBe('light')
    expect(resolveArmorCategory('medium')).toBe('medium')
    expect(resolveArmorCategory('Heavy')).toBe('heavy')
    expect(resolveArmorCategory('Natural')).toBe('natural')
    expect(resolveArmorCategory('1')).toBe('light')
  })

  it('devrait retourner null pour les catégories invalides', () => {
    expect(resolveArmorCategory('InvalidCategory')).toBe(null)
    expect(resolveArmorCategory('')).toBe(null)
    expect(resolveArmorCategory(null)).toBe(null)
    expect(resolveArmorCategory(undefined)).toBe(null)
    expect(resolveArmorCategory(123)).toBe(null) // not a string
  })

  it('devrait gérer les espaces en début/fin', () => {
    expect(resolveArmorCategory(' Light ')).toBe('light')
    expect(resolveArmorCategory('\tMedium\n')).toBe('medium')
  })
})

describe('getSupportedOggDudeCategories', () => {
  it('devrait retourner toutes les clés de catégories', () => {
    const categories = getSupportedOggDudeCategories()
    expect(categories).toContain('Light')
    expect(categories).toContain('Medium')
    expect(categories).toContain('Heavy')
    expect(categories).toContain('light')
    expect(categories).toContain('medium')
    expect(categories).toContain('heavy')
    expect(categories).toContain('Natural')
    expect(categories).toContain('Unarmored')
    expect(categories).toContain('0')
    expect(categories).toContain('1')
    expect(categories).toContain('2')
    expect(categories).toContain('3')
    expect(categories).toContain('4')
  })
})

describe('ARMOR_PROPERTY_MAP', () => {
  it('devrait contenir les propriétés de base', () => {
    expect(ARMOR_PROPERTY_MAP['Bulky']).toBeDefined()
    expect(ARMOR_PROPERTY_MAP['Organic']).toBeDefined()
    expect(ARMOR_PROPERTY_MAP['Bulky'].swerpgProperty).toBe('bulky')
    expect(ARMOR_PROPERTY_MAP['Organic'].swerpgProperty).toBe('organic')
  })

  it('devrait supporter les variantes en minuscules', () => {
    expect(ARMOR_PROPERTY_MAP['bulky'].swerpgProperty).toBe('bulky')
    expect(ARMOR_PROPERTY_MAP['organic'].swerpgProperty).toBe('organic')
  })

  it('devrait mapper les propriétés similaires', () => {
    expect(ARMOR_PROPERTY_MAP['Heavy'].swerpgProperty).toBe('bulky')
    expect(ARMOR_PROPERTY_MAP['Unwieldy'].swerpgProperty).toBe('bulky')
    expect(ARMOR_PROPERTY_MAP['Natural'].swerpgProperty).toBe('organic')
    expect(ARMOR_PROPERTY_MAP['Leather'].swerpgProperty).toBe('organic')
    expect(ARMOR_PROPERTY_MAP['Hide'].swerpgProperty).toBe('organic')
  })

  it('devrait supporter les codes numériques', () => {
    expect(ARMOR_PROPERTY_MAP['1'].swerpgProperty).toBe('bulky')
    expect(ARMOR_PROPERTY_MAP['2'].swerpgProperty).toBe('organic')
  })
})

describe('resolveArmorProperty', () => {
  it('devrait résoudre les propriétés valides', () => {
    expect(resolveArmorProperty('Bulky')).toBe('bulky')
    expect(resolveArmorProperty('organic')).toBe('organic')
    expect(resolveArmorProperty('Heavy')).toBe('bulky')
    expect(resolveArmorProperty('Natural')).toBe('organic')
    expect(resolveArmorProperty('1')).toBe('bulky')
  })

  it('devrait retourner null pour les propriétés invalides', () => {
    expect(resolveArmorProperty('InvalidProperty')).toBe(null)
    expect(resolveArmorProperty('')).toBe(null)
    expect(resolveArmorProperty(null)).toBe(null)
    expect(resolveArmorProperty(undefined)).toBe(null)
    expect(resolveArmorProperty(123)).toBe(null) // not a string
  })

  it('devrait gérer les espaces en début/fin', () => {
    expect(resolveArmorProperty(' Bulky ')).toBe('bulky')
    expect(resolveArmorProperty('\tOrganic\n')).toBe('organic')
  })
})

describe('resolveArmorProperties', () => {
  it('devrait résoudre un tableau de propriétés valides', () => {
    const result = resolveArmorProperties(['Bulky', 'Organic', 'Heavy'])
    expect(result.resolvedProperties).toEqual(new Set(['bulky', 'organic']))
    expect(result.unknownProperties).toEqual([])
  })

  it('devrait identifier les propriétés inconnues', () => {
    const result = resolveArmorProperties(['Bulky', 'UnknownProp', 'Organic', 'AnotherUnknown'])
    expect(result.resolvedProperties).toEqual(new Set(['bulky', 'organic']))
    expect(result.unknownProperties).toEqual(['UnknownProp', 'AnotherUnknown'])
  })

  it('devrait dédupliquer les propriétés résolues', () => {
    const result = resolveArmorProperties(['Bulky', 'Heavy', 'Unwieldy']) // Tous mappent vers 'bulky'
    expect(result.resolvedProperties).toEqual(new Set(['bulky']))
    expect(result.unknownProperties).toEqual([])
  })

  it('devrait gérer les entrées invalides', () => {
    expect(resolveArmorProperties(null)).toEqual({
      resolvedProperties: new Set(),
      unknownProperties: []
    })
    expect(resolveArmorProperties(undefined)).toEqual({
      resolvedProperties: new Set(),
      unknownProperties: []
    })
    expect(resolveArmorProperties([])).toEqual({
      resolvedProperties: new Set(),
      unknownProperties: []
    })
  })

  it('devrait gérer les tableaux avec des valeurs nulles/undefined', () => {
    const result = resolveArmorProperties(['Bulky', null, undefined, 'Organic', ''])
    expect(result.resolvedProperties).toEqual(new Set(['bulky', 'organic']))
    expect(result.unknownProperties).toEqual([null, undefined, ''])
  })
})

describe('getSupportedOggDudeProperties', () => {
  it('devrait retourner toutes les clés de propriétés', () => {
    const properties = getSupportedOggDudeProperties()
    expect(properties).toContain('Bulky')
    expect(properties).toContain('Organic')
    expect(properties).toContain('bulky')
    expect(properties).toContain('organic')
    expect(properties).toContain('Heavy')
    expect(properties).toContain('Unwieldy')
    expect(properties).toContain('Natural')
    expect(properties).toContain('Leather')
    expect(properties).toContain('Hide')
    expect(properties).toContain('1')
    expect(properties).toContain('2')
  })
})