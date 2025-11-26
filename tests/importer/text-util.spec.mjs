/**
 * Tests unitaires pour le mapping des DieModifiers des talents OggDude
 * Couvre l'extraction, la normalisation et le formatage des modificateurs de dés
 */

import { describe, it, expect } from 'vitest'
import { sanitizeDescription } from '../../module/importer/utils/text.mjs'

describe('sanitizeDescription', () => {
  it('devrait nettoyer les balises script', () => {
    const description = 'Normal text <script>alert("XSS")</script> more text'

    const result = sanitizeDescription(description)

    expect(result).toBe('Normal text more text')
    expect(result).not.toContain('script')
    expect(result).not.toContain('alert')
  })

  it('devrait nettoyer les balises style', () => {
    const description = 'Normal text <style>body{display:none}</style> more text'

    const result = sanitizeDescription(description)

    expect(result).toBe('Normal text more text')
    expect(result).not.toContain('style')
  })

  it('devrait normaliser les espaces multiples', () => {
    const description = 'Text    with     multiple     spaces'

    const result = sanitizeDescription(description)

    expect(result).toBe('Text with multiple spaces')
  })

  it('devrait tronquer à la longueur maximale', () => {
    const description = 'A'.repeat(2500)

    const result = sanitizeDescription(description, 2000)

    expect(result.length).toBe(2000)
    expect(result).toMatch(/\.\.\.$/u)
  })

  it('devrait retourner une chaîne vide pour entrée nulle', () => {
    expect(sanitizeDescription(null)).toBe('')
    expect(sanitizeDescription(undefined)).toBe('')
    expect(sanitizeDescription('')).toBe('')
  })

  it('devrait trim les espaces au début et à la fin', () => {
    const description = '   Text with spaces   '

    const result = sanitizeDescription(description)

    expect(result).toBe('Text with spaces')
  })
})
