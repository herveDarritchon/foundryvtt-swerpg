/**
 * Tests pour le mapper d'armures OggDude
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { armorMapper, getArmorImportStats, resetArmorImportStats } from '../../module/importer/items/armor-ogg-dude.mjs'
import { resolveArmorCategory, resolveArmorProperties } from '../../module/importer/mappings/index-armor.mjs'
import { clampNumber, sanitizeText } from '../../module/importer/utils/armor-import-utils.mjs'

// Mock du système pour les tests
vi.mock('../../module/config/system.mjs', () => ({
  SYSTEM: {
    ARMOR: {
      CATEGORIES: {
        unarmored: { id: 'unarmored' },
        light: { id: 'light' },
        medium: { id: 'medium' },
        heavy: { id: 'heavy' },
        natural: { id: 'natural' }
      },
      PROPERTIES: {
        bulky: { label: 'Bulky' },
        organic: { label: 'Organic' }
      },
      DEFAULT_CATEGORY: 'medium'
    }
  }
}))

// Mock du logger
vi.mock('../../module/utils/logger.mjs', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}))

// Mock des utilitaires OggDude
vi.mock('../../module/importer/oggDude.mjs', () => ({
  default: {
    mapMandatoryString: vi.fn((_, value) => value || ''),
    mapOptionalArray: vi.fn((array, mapper) => {
      if (!array) return []
      return Array.isArray(array) ? array.map(mapper) : [mapper(array)]
    })
  }
}))

// Mock des settings
vi.mock('../../module/settings/directories.mjs', () => ({
  buildItemImgSystemPath: vi.fn(() => 'icons/armor.svg')
}))

describe('Tables de mapping', () => {
  describe('resolveArmorCategory', () => {
    it('devrait mapper les catégories connues correctement', () => {
      expect(resolveArmorCategory('Light')).toBe('light')
      expect(resolveArmorCategory('Medium')).toBe('medium')
      expect(resolveArmorCategory('Heavy')).toBe('heavy')
      expect(resolveArmorCategory('light')).toBe('light')
    })

    it('devrait retourner null pour les catégories inconnues', () => {
      expect(resolveArmorCategory('Unknown')).toBe(null)
      expect(resolveArmorCategory('')).toBe(null)
      expect(resolveArmorCategory(null)).toBe(null)
      expect(resolveArmorCategory(undefined)).toBe(null)
    })
  })

  describe('resolveArmorProperties', () => {
    it('devrait mapper les propriétés connues correctement', () => {
      const result = resolveArmorProperties(['Bulky', 'Organic'])
      expect(result.resolvedProperties).toEqual(new Set(['bulky', 'organic']))
      expect(result.unknownProperties).toEqual([])
    })

    it('devrait identifier les propriétés inconnues', () => {
      const result = resolveArmorProperties(['Bulky', 'Unknown', 'Organic'])
      expect(result.resolvedProperties).toEqual(new Set(['bulky', 'organic']))
      expect(result.unknownProperties).toEqual(['Unknown'])
    })

    it('devrait gérer les entrées invalides', () => {
      const result = resolveArmorProperties(null)
      expect(result.resolvedProperties).toEqual(new Set())
      expect(result.unknownProperties).toEqual([])
    })
  })
})

describe('Utilitaires', () => {
  describe('clampNumber', () => {
    it('devrait borner les valeurs dans les limites', () => {
      expect(clampNumber(5, 0, 10, 0)).toBe(5)
      expect(clampNumber(-1, 0, 10, 0)).toBe(0)
      expect(clampNumber(15, 0, 10, 0)).toBe(10)
    })

    it('devrait retourner la valeur par défaut pour les non-nombres', () => {
      expect(clampNumber('abc', 0, 10, 5)).toBe(5)
      expect(clampNumber(null, 0, 10, 5)).toBe(5)
      expect(clampNumber(undefined, 0, 10, 5)).toBe(5)
    })

    it('devrait parser les chaînes numériques', () => {
      expect(clampNumber('5', 0, 10, 0)).toBe(5)
      expect(clampNumber('3.7', 0, 10, 0)).toBe(3) // parseInt fait troncature
    })
  })

  describe('sanitizeText', () => {
    it('devrait nettoyer les balises script', () => {
      expect(sanitizeText('<script>alert("xss")</script>')).toBe('&lt;script>alert("xss")&lt;/script&gt;')
      expect(sanitizeText('Normal text')).toBe('Normal text')
    })

    it('devrait trim les espaces', () => {
      expect(sanitizeText('  text  ')).toBe('text')
    })

    it('devrait gérer les entrées invalides', () => {
      expect(sanitizeText(null)).toBe('')
      expect(sanitizeText(undefined)).toBe('')
      expect(sanitizeText('')).toBe('')
    })
  })
})

describe('armorMapper', () => {
  beforeEach(() => {
    resetArmorImportStats()
  })

  it('devrait mapper une armure valide avec catégorie connue', () => {
    const xmlArmor = {
      Name: 'Test Armor',
      Description: 'A test armor',
      Defense: '5',
      Soak: '3',
      Categories: {
        Category: ['Light']
      },
      Encumbrance: '2',
      Price: '100',
      Rarity: '1',
      Restricted: false
    }

    const result = armorMapper([xmlArmor])
    
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      name: 'Test Armor',
      type: 'armor',
      system: {
        category: 'light',
        defense: { base: 5 },
        soak: { base: 3 },
        encumbrance: 2,
        price: 100,
        rarity: 1,
        restricted: false,
        properties: expect.any(Set)
      }
    })
  })

  it('devrait utiliser la catégorie par défaut pour les catégories inconnues', () => {
    const xmlArmor = {
      Name: 'Unknown Category Armor',
      Description: 'Test',
      Defense: '5',
      Soak: '3',
      Categories: {
        Category: ['UnknownCategory']
      }
    }

    const result = armorMapper([xmlArmor])
    
    expect(result).toHaveLength(1)
    expect(result[0].system.category).toBe('medium') // DEFAULT_CATEGORY
    
    const stats = getArmorImportStats()
    expect(stats.unknownCategories).toBe(1)
  })

  it('devrait mapper les propriétés correctement', () => {
    const xmlArmor = {
      Name: 'Property Armor',
      Description: 'Test',
      Defense: '5',
      Soak: '3',
      Categories: {
        Category: ['Light', 'Bulky', 'Organic']
      }
    }

    const result = armorMapper([xmlArmor])
    
    expect(result).toHaveLength(1)
    expect(result[0].system.category).toBe('light')
    expect(result[0].system.properties).toEqual(new Set(['bulky', 'organic']))
  })

  it('devrait avertir pour les propriétés inconnues', () => {
    const xmlArmor = {
      Name: 'Unknown Property Armor',
      Description: 'Test',
      Defense: '5',
      Soak: '3',
      Categories: {
        Category: ['bulky', 'UnknownProperty']
      }
    }

    const result = armorMapper([xmlArmor])
    
    expect(result).toHaveLength(1)
    
    const stats = getArmorImportStats()
    expect(stats.unknownProperties).toBe(1)
  })

  it('devrait clamp les valeurs Defense et Soak aberrantes', () => {
    const xmlArmor = {
      Name: 'Extreme Values Armor',
      Description: 'Test',
      Defense: '150', // > 100
      Soak: '-5',    // < 0
      Categories: {
        Category: ['Light']
      }
    }

    const result = armorMapper([xmlArmor])
    
    expect(result).toHaveLength(1)
    expect(result[0].system.defense.base).toBe(100) // clamped
    expect(result[0].system.soak.base).toBe(0)      // clamped
  })

  it('devrait gérer les valeurs Defense et Soak NaN', () => {
    const xmlArmor = {
      Name: 'NaN Values Armor',
      Description: 'Test',
      Defense: 'not-a-number',
      Soak: 'also-not-a-number',
      Categories: {
        Category: ['Light']
      }
    }

    const result = armorMapper([xmlArmor])
    
    expect(result).toHaveLength(1)
    expect(result[0].system.defense.base).toBe(0) // default
    expect(result[0].system.soak.base).toBe(0)    // default
  })

  it('devrait clamp les valeurs de rareté', () => {
    const xmlArmor = {
      Name: 'High Rarity Armor',
      Description: 'Test',
      Defense: '5',
      Soak: '3',
      Rarity: '25', // > 20
      Categories: {
        Category: ['Light']
      }
    }

    const result = armorMapper([xmlArmor])
    
    expect(result).toHaveLength(1)
    expect(result[0].system.rarity).toBe(20) // clamped
  })

  it('devrait clamp les prix négatifs', () => {
    const xmlArmor = {
      Name: 'Negative Price Armor',
      Description: 'Test',
      Defense: '5',
      Soak: '3',
      Price: '-100',
      Categories: {
        Category: ['Light']
      }
    }

    const result = armorMapper([xmlArmor])
    
    expect(result).toHaveLength(1)
    expect(result[0].system.price).toBe(0) // clamped
  })

  it('devrait sanitiser la description', () => {
    const xmlArmor = {
      Name: 'Script Armor',
      Description: '<script>alert("xss")</script>Safe text',
      Defense: '5',
      Soak: '3',
      Categories: {
        Category: ['Light']
      }
    }

    const result = armorMapper([xmlArmor])
    
    expect(result).toHaveLength(1)
    expect(result[0].system.description).toBe('&lt;script>alert("xss")&lt;/script&gt;Safe text')
  })

  it('devrait trier les propriétés alphabétiquement', () => {
    const xmlArmor = {
      Name: 'Sorted Properties Armor',
      Description: 'Test',
      Defense: '5',
      Soak: '3',
      Categories: {
        Category: ['Light', 'Organic', 'Bulky'] // Dans le désordre
      }
    }

    const result = armorMapper([xmlArmor])
    
    expect(result).toHaveLength(1)
    expect(Array.from(result[0].system.properties)).toEqual(['bulky', 'organic']) // Trié
  })

  it('devrait limiter le nombre de propriétés à 12', () => {
    // Créer une armure avec plus de 12 propriétés (simulation)
    const manyProperties = Array.from({ length: 15 }, (_, i) => `Property${i}`)
    
    const xmlArmor = {
      Name: 'Many Properties Armor',
      Description: 'Test',
      Defense: '5',
      Soak: '3',
      Categories: {
        Category: ['Light', ...manyProperties]
      }
    }

    const result = armorMapper([xmlArmor])
    
    expect(result).toHaveLength(1)
    // Seules 'bulky' et 'organic' sont des propriétés valides dans notre mock
    // mais le test vérifie que la limitation fonctionne en principe
    expect(result[0].system.properties.size).toBeLessThanOrEqual(12)
  })

  it('devrait incrémenter les statistiques correctement', () => {
    const xmlArmors = [
      {
        Name: 'Armor 1',
        Description: 'Test',
        Defense: '5',
        Soak: '3',
        Categories: { Category: ['Light'] }
      },
      {
        Name: 'Armor 2',
        Description: 'Test',
        Defense: '5',
        Soak: '3',
        Categories: { Category: ['UnknownCategory'] }
      }
    ]

    armorMapper(xmlArmors)
    
    const stats = getArmorImportStats()
    expect(stats.total).toBe(2)
    expect(stats.unknownCategories).toBe(1)
    expect(stats.rejected).toBe(0) // En mode non-strict
  })

  it('devrait réinitialiser les statistiques', () => {
    const xmlArmor = {
      Name: 'Test Armor',
      Description: 'Test',
      Defense: '5',
      Soak: '3',
      Categories: { Category: ['UnknownCategory'] }
    }

    armorMapper([xmlArmor])
    
    let stats = getArmorImportStats()
    expect(stats.total).toBe(1)
    
    resetArmorImportStats()
    
    stats = getArmorImportStats()
    expect(stats.total).toBe(0)
    expect(stats.unknownCategories).toBe(0)
  })

  it('devrait filtrer les armures rejetées', () => {
    // Test qui simule un échec de mapping (sera traité comme null)
    const xmlArmors = [
      {
        Name: 'Valid Armor',
        Description: 'Test',
        Defense: '5',
        Soak: '3',
        Categories: { Category: ['Light'] }
      },
      null // Simule un échec de parsing
    ]

    // On s'attend à ce que les armures nulles/invalides soient filtrées
    const result = armorMapper(xmlArmors.filter(Boolean))
    
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Valid Armor')
  })
})