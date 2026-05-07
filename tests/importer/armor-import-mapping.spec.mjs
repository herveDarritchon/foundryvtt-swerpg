/**
 * Tests pour le mapping des armures OggDude - Version simplifiée
 */
import { describe, it, expect, vi } from 'vitest'
import { buildArmorDescription, normalizeArmorCategoryTag } from '../../module/importer/utils/armor-import-utils.mjs'

describe('Armor Import Mapping - Utils', () => {
  it('should build armor description correctly', () => {
    const result = buildArmorDescription({ Name: 'Test Armor', Description: 'A test description.' })
    expect(result).toContain('Test Armor')
    expect(result).toContain('A test description.')
  })

  it('should normalize category to property', () => {
    expect(normalizeArmorCategoryTag('Full Body')).toBe('full-body')
    expect(normalizeArmorCategoryTag('Sealed')).toBe('sealed')
    expect(normalizeArmorCategoryTag('Unknown')).toBe('unknown')
  })

  it('should handle empty description', () => {
    const result = buildArmorDescription({})
    expect(result).toBe('')
  })
})
