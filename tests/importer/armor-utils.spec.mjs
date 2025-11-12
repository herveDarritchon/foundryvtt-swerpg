/**
 * Tests pour les utilitaires d'import des armures
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  clampNumber,
  sanitizeText,
  FLAG_STRICT_ARMOR_VALIDATION,
  getArmorImportStats,
  resetArmorImportStats,
  incrementArmorImportStat,
  addRejectionReason
} from '../../module/importer/utils/armor-import-utils.mjs'

describe('clampNumber', () => {
  it('devrait retourner la valeur si elle est dans les limites', () => {
    expect(clampNumber(5, 0, 10, 0)).toBe(5)
    expect(clampNumber(0, 0, 10, 0)).toBe(0)
    expect(clampNumber(10, 0, 10, 0)).toBe(10)
  })

  it('devrait clamp la valeur au minimum', () => {
    expect(clampNumber(-5, 0, 10, 0)).toBe(0)
    expect(clampNumber(-100, 5, 15, 0)).toBe(5)
  })

  it('devrait clamp la valeur au maximum', () => {
    expect(clampNumber(15, 0, 10, 0)).toBe(10)
    expect(clampNumber(100, 5, 15, 0)).toBe(15)
  })

  it('devrait utiliser la valeur par défaut pour les non-nombres', () => {
    expect(clampNumber('abc', 0, 10, 5)).toBe(5)
    expect(clampNumber(null, 0, 10, 7)).toBe(7)
    expect(clampNumber(undefined, 0, 10, 3)).toBe(3)
    expect(clampNumber({}, 0, 10, 1)).toBe(1)
    expect(clampNumber([], 0, 10, 2)).toBe(2)
  })

  it('devrait parser les chaînes numériques avec parseInt', () => {
    expect(clampNumber('5', 0, 10, 0)).toBe(5)
    expect(clampNumber('3.7', 0, 10, 0)).toBe(3) // parseInt truncate
    expect(clampNumber('12.9', 0, 10, 0)).toBe(10) // parsed to 12, then clamped
    expect(clampNumber('-2.5', 0, 10, 0)).toBe(0) // parsed to -2, then clamped
  })

  it('devrait gérer les cas limites', () => {
    expect(clampNumber(Infinity, 0, 10, 0)).toBe(0) // parseInt(Infinity) => NaN
    expect(clampNumber(-Infinity, 0, 10, 0)).toBe(0) // parseInt(-Infinity) => NaN
    expect(clampNumber(Number.NaN, 0, 10, 5)).toBe(5)
  })

  it('devrait utiliser 0 comme valeur par défaut si non spécifiée', () => {
    expect(clampNumber('abc', 0, 10)).toBe(0)
    expect(clampNumber(null, 5, 15)).toBe(0)
  })
})

describe('sanitizeText', () => {
  it('devrait nettoyer les balises script (case insensitive)', () => {
    expect(sanitizeText('<script>alert("xss")</script>'))
      .toBe('&lt;script>alert("xss")&lt;/script&gt;')
    expect(sanitizeText('<SCRIPT>alert("xss")</SCRIPT>'))
      .toBe('&lt;script>alert("xss")&lt;/script&gt;')
    expect(sanitizeText('<Script>alert("xss")</Script>'))
      .toBe('&lt;script>alert("xss")&lt;/script&gt;')
  })

  it('devrait préserver le texte normal', () => {
    expect(sanitizeText('Normal text')).toBe('Normal text')
    expect(sanitizeText('Text with <b>bold</b> tags')).toBe('Text with <b>bold</b> tags')
    expect(sanitizeText('Text with <div>div</div> tags')).toBe('Text with <div>div</div> tags')
  })

  it('devrait trim les espaces en début et fin', () => {
    expect(sanitizeText('  text  ')).toBe('text')
    expect(sanitizeText('\n\ttext\r\n')).toBe('text')
    expect(sanitizeText('   ')).toBe('')
  })

  it('devrait gérer les entrées invalides', () => {
    expect(sanitizeText(null)).toBe('')
    expect(sanitizeText(undefined)).toBe('')
    expect(sanitizeText('')).toBe('')
    expect(sanitizeText(123)).toBe('') // not a string
    expect(sanitizeText({})).toBe('')
    expect(sanitizeText([])).toBe('')
  })

  it('devrait nettoyer plusieurs balises script', () => {
    expect(sanitizeText('<script>bad1</script>good<script>bad2</script>'))
      .toBe('&lt;script>bad1&lt;/script&gt;good&lt;script>bad2&lt;/script&gt;')
  })

  it('devrait gérer les cas complexes', () => {
    expect(sanitizeText('  <script>alert("test")</script>  Normal text  '))
      .toBe('&lt;script>alert("test")&lt;/script&gt;  Normal text')
  })
})

describe('FLAG_STRICT_ARMOR_VALIDATION', () => {
  it('devrait être défini comme un booléen', () => {
    expect(typeof FLAG_STRICT_ARMOR_VALIDATION).toBe('boolean')
  })

  it('devrait être false par défaut', () => {
    expect(FLAG_STRICT_ARMOR_VALIDATION).toBe(false)
  })
})

describe('Statistics d\'import', () => {
  beforeEach(() => {
    resetArmorImportStats()
  })

  describe('getArmorImportStats', () => {
    it('devrait retourner les stats initiales', () => {
      const stats = getArmorImportStats()
      expect(stats).toEqual({
        total: 0,
        rejected: 0,
        unknownCategories: 0,
        unknownProperties: 0,
        rejectionReasons: []
      })
    })

    it('devrait retourner une copie des stats (pas la référence)', () => {
      const stats1 = getArmorImportStats()
      const stats2 = getArmorImportStats()
      expect(stats1).not.toBe(stats2) // Différentes références
      expect(stats1).toEqual(stats2) // Même contenu
    })
  })

  describe('incrementArmorImportStat', () => {
    it('devrait incrémenter les stats numériques existantes', () => {
      incrementArmorImportStat('total')
      expect(getArmorImportStats().total).toBe(1)

      incrementArmorImportStat('rejected', 3)
      expect(getArmorImportStats().rejected).toBe(3)

      incrementArmorImportStat('unknownCategories', 2)
      expect(getArmorImportStats().unknownCategories).toBe(2)
    })

    it('devrait ignorer les stats inexistantes', () => {
      incrementArmorImportStat('nonExistentStat')
      const stats = getArmorImportStats()
      expect(stats).not.toHaveProperty('nonExistentStat')
    })

    it('devrait ignorer les stats non-numériques', () => {
      incrementArmorImportStat('rejectionReasons') // C'est un array, pas un number
      const stats = getArmorImportStats()
      expect(stats.rejectionReasons).toEqual([])
    })

    it('devrait utiliser 1 comme valeur par défaut', () => {
      incrementArmorImportStat('total')
      incrementArmorImportStat('total')
      expect(getArmorImportStats().total).toBe(2)
    })
  })

  describe('addRejectionReason', () => {
    it('devrait ajouter des raisons de rejet', () => {
      addRejectionReason('ARMOR_CATEGORY_UNKNOWN')
      addRejectionReason('ARMOR_SYSTEM_INVALID')
      
      const stats = getArmorImportStats()
      expect(stats.rejectionReasons).toEqual([
        'ARMOR_CATEGORY_UNKNOWN',
        'ARMOR_SYSTEM_INVALID'
      ])
    })

    it('devrait permettre les raisons dupliquées', () => {
      addRejectionReason('SAME_REASON')
      addRejectionReason('SAME_REASON')
      
      const stats = getArmorImportStats()
      expect(stats.rejectionReasons).toEqual(['SAME_REASON', 'SAME_REASON'])
    })
  })

  describe('resetArmorImportStats', () => {
    it('devrait remettre toutes les stats à zéro', () => {
      // Modifier les stats
      incrementArmorImportStat('total', 5)
      incrementArmorImportStat('rejected', 2)
      incrementArmorImportStat('unknownCategories', 3)
      incrementArmorImportStat('unknownProperties', 7)
      addRejectionReason('TEST_REASON')

      let stats = getArmorImportStats()
      expect(stats.total).toBe(5)
      expect(stats.rejected).toBe(2)
      expect(stats.unknownCategories).toBe(3)
      expect(stats.unknownProperties).toBe(7)
      expect(stats.rejectionReasons).toEqual(['TEST_REASON'])

      // Reset
      resetArmorImportStats()

      stats = getArmorImportStats()
      expect(stats).toEqual({
        total: 0,
        rejected: 0,
        unknownCategories: 0,
        unknownProperties: 0,
        rejectionReasons: []
      })
    })
  })

  describe('Intégration des stats', () => {
    it('devrait permettre un workflow complet de stats', () => {
      // Simulation d'un import avec plusieurs armures
      incrementArmorImportStat('total', 10)
      incrementArmorImportStat('unknownCategories', 2)
      incrementArmorImportStat('unknownProperties', 5)
      incrementArmorImportStat('rejected', 1)
      addRejectionReason('ARMOR_CATEGORY_UNKNOWN')

      const stats = getArmorImportStats()
      expect(stats.total).toBe(10)
      expect(stats.unknownCategories).toBe(2)
      expect(stats.unknownProperties).toBe(5)
      expect(stats.rejected).toBe(1)
      expect(stats.rejectionReasons).toEqual(['ARMOR_CATEGORY_UNKNOWN'])

      // Reset pour le prochain import
      resetArmorImportStats()
      
      const resetStats = getArmorImportStats()
      expect(resetStats.total).toBe(0)
      expect(resetStats.rejectionReasons).toEqual([])
    })
  })
})