/**
 * Tests pour les utilitaires d'import des talents
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  resetTalentImportStats,
  incrementTalentImportStat,
  getTalentImportStats,
  sanitizeText,
  clampNumber,
} from '../../module/importer/utils/talent-import-utils.mjs'

describe('Talent Import Utils', () => {
  beforeEach(() => {
    resetTalentImportStats()
  })

  describe('resetTalentImportStats', () => {
    it('devrait initialiser toutes les statistiques à zéro', () => {
      const stats = getTalentImportStats()
      expect(stats.processed).toBe(0)
      expect(stats.created).toBe(0)
      expect(stats.failed).toBe(0)
      expect(stats.validation_failed).toBe(0)
      expect(stats.transform_failed).toBe(0)
      expect(stats.contextMaps).toBe(0)
      expect(stats.contextMapErrors).toBe(0)
      expect(stats.duplicates).toBe(0)
      expect(stats.unknownActivations).toBe(0)
      expect(stats.unresolvedNodes).toBe(0)
      expect(stats.invalidPrerequisites).toBe(0)
      expect(stats.transformed).toBe(0)
    })
  })

  describe('incrementTalentImportStat', () => {
    it('devrait incrémenter une statistique par défaut de 1', () => {
      incrementTalentImportStat('processed')
      expect(getTalentImportStats().processed).toBe(1)

      incrementTalentImportStat('failed')
      expect(getTalentImportStats().failed).toBe(1)
    })

    it('devrait incrémenter une statistique par un montant personnalisé', () => {
      incrementTalentImportStat('created', 5)
      expect(getTalentImportStats().created).toBe(5)

      incrementTalentImportStat('duplicates', 3)
      expect(getTalentImportStats().duplicates).toBe(3)
    })

    it('devrait ignorer les statistiques inconnues', () => {
      const initialStats = { ...getTalentImportStats() }
      incrementTalentImportStat('statistique_inexistante', 10)

      expect(getTalentImportStats()).toEqual(initialStats)
    })

    it('devrait accumuler plusieurs incréments', () => {
      incrementTalentImportStat('processed', 2)
      incrementTalentImportStat('processed', 3)
      incrementTalentImportStat('processed', 1)

      expect(getTalentImportStats().processed).toBe(6)
    })
  })

  describe('getTalentImportStats', () => {
    it('devrait retourner une copie des statistiques', () => {
      incrementTalentImportStat('created', 5)

      const stats1 = getTalentImportStats()
      const stats2 = getTalentImportStats()

      expect(stats1).toEqual(stats2)
      expect(stats1).not.toBe(stats2) // Différentes instances
      expect(stats1.created).toBe(5)
    })
  })

  describe('sanitizeText', () => {
    it('devrait nettoyer le texte basique', () => {
      expect(sanitizeText('  Hello World  ')).toBe('Hello World')
      expect(sanitizeText('Text\nwith\nnewlines')).toBe('Text with newlines')
      expect(sanitizeText('Multiple   spaces')).toBe('Multiple spaces')
    })

    it('devrait gérer les valeurs non-string', () => {
      expect(sanitizeText(null)).toBe('')
      expect(sanitizeText(undefined)).toBe('')
      expect(sanitizeText(123)).toBe('123')
      expect(sanitizeText(true)).toBe('true')
    })

    it('devrait limiter la longueur du texte', () => {
      const longText = 'a'.repeat(2500)
      const sanitized = sanitizeText(longText)
      expect(sanitized.length).toBe(2000)
      expect(sanitized).toBe('a'.repeat(2000))
    })

    it('devrait préserver les caractères spéciaux nécessaires', () => {
      expect(sanitizeText('Force & Destiny')).toBe('Force & Destiny')
      expect(sanitizeText('Cost: 5-10 XP')).toBe('Cost: 5-10 XP')
      expect(sanitizeText('Tier I/II/III')).toBe('Tier I/II/III')
    })
  })

  describe('clampNumber', () => {
    it('devrait maintenir les valeurs dans les limites', () => {
      expect(clampNumber(5, 1, 10, 1)).toBe(5)
      expect(clampNumber(1, 1, 10, 1)).toBe(1)
      expect(clampNumber(10, 1, 10, 1)).toBe(10)
    })

    it('devrait clamp au minimum', () => {
      expect(clampNumber(-5, 1, 10, 1)).toBe(1)
      expect(clampNumber(0, 1, 10, 1)).toBe(1)
    })

    it('devrait clamp au maximum', () => {
      expect(clampNumber(15, 1, 10, 1)).toBe(10)
      expect(clampNumber(100, 1, 10, 1)).toBe(10)
    })

    it('devrait utiliser la valeur par défaut pour les non-nombres', () => {
      expect(clampNumber('abc', 1, 10, 5)).toBe(5)
      expect(clampNumber(null, 1, 10, 3)).toBe(3)
      expect(clampNumber(undefined, 1, 10, 7)).toBe(7)
    })

    it('devrait parser les chaînes numériques', () => {
      expect(clampNumber('5', 1, 10, 1)).toBe(5)
      expect(clampNumber('3.9', 1, 10, 1)).toBe(3) // parseInt truncate
      expect(clampNumber('15.5', 1, 10, 1)).toBe(10) // parsed puis clamped
    })
  })
})
