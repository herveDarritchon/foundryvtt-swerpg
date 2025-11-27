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
      expect(stats.total).toBe(0)
      expect(stats.rejected).toBe(0)
      expect(stats.imported).toBe(0)
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
      resetTalentImportStats()
      incrementTalentImportStat('total')
      expect(getTalentImportStats().total).toBe(1)

      incrementTalentImportStat('rejected')
      expect(getTalentImportStats().rejected).toBe(1)
    })

    it('devrait incrémenter une statistique par un montant personnalisé', () => {
      resetTalentImportStats()
      incrementTalentImportStat('total', 5)
      expect(getTalentImportStats().total).toBe(5)

      incrementTalentImportStat('duplicates', 3)
      expect(getTalentImportStats().duplicates).toBe(3)
    })

    it('devrait créer automatiquement les statistiques inconnues', () => {
      resetTalentImportStats()
      incrementTalentImportStat('statistique_inexistante', 10)

      const stats = getTalentImportStats()
      expect(stats.statistique_inexistante).toBe(10)
    })

    it('devrait accumuler plusieurs incréments', () => {
      resetTalentImportStats()
      incrementTalentImportStat('total', 2)
      incrementTalentImportStat('total', 3)
      incrementTalentImportStat('total', 1)

      expect(getTalentImportStats().total).toBe(6)
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
      expect(sanitizeText('Text\nwith\nnewlines')).toBe('Text\nwith\nnewlines')
      expect(sanitizeText('Multiple   spaces')).toBe('Multiple   spaces')
    })

    it('devrait gérer les valeurs non-string en retournant une chaîne vide', () => {
      expect(sanitizeText(null)).toBe('')
      expect(sanitizeText(undefined)).toBe('')
      expect(sanitizeText(123)).toBe('')
      expect(sanitizeText(true)).toBe('')
    })

    it('devrait préserver la longueur du texte (pas de limite)', () => {
      const longText = 'a'.repeat(2500)
      const sanitized = sanitizeText(longText)
      expect(sanitized.length).toBe(2500)
      expect(sanitized).toBe('a'.repeat(2500))
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
