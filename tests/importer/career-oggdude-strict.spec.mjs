import { describe, it, expect } from 'vitest'
// Mock SYSTEM with a reduced skill set to exercise strict filtering
// Override SYSTEM mock pour isoler les cas strict
globalThis.SYSTEM = {
  SKILLS: {
    athletics: { id: 'athletics' },
    perception: { id: 'perception' },
    deception: { id: 'deception' },
    science: { id: 'science' },
  },
}

import { mapCareerSkills, careerMapper } from '../../module/importer/items/career-ogg-dude.mjs'

/**
 * Tests supplémentaires portant sur le mode strict et la robustesse du filtrage.
 */
describe('mapCareerSkills strict mode', () => {
  it('filtre uniquement les skills présents dans SYSTEM.SKILLS en mode strict', () => {
    const raw = ['ATHL', 'PERC', 'DECEP', 'SCI', 'ARCANA', 'UNKNOWN', '']
    const result = mapCareerSkills(raw, { strict: true })
    expect(result).toEqual([{ id: 'athletics' }, { id: 'perception' }, { id: 'deception' }, { id: 'science' }])
  })
  it('mode non strict conserve les ids mappés connus hors SYSTEM.SKILLS', () => {
    const raw = ['ATHL', 'ARCANA', 'PERC']
    const loose = mapCareerSkills(raw, { strict: false })
    // arcana n'est pas dans le mock SYSTEM.SKILLS donc présent seulement en non strict
    expect(loose.map((s) => s.id)).toContain('arcana')
    const strict = mapCareerSkills(raw, { strict: true })
    expect(strict.map((s) => s.id)).not.toContain('arcana')
  })
  it('retourne tableau vide si tous les codes sont inconnus', () => {
    const result = mapCareerSkills(['???', 'UNKNOWN'], { strict: true })
    expect(result).toEqual([])
  })
  it("ne produit jamais d'objet avec id falsy", () => {
    const result = mapCareerSkills(['', 'UNKNOWN', 'ATHL'], { strict: true })
    expect(result).toEqual([{ id: 'athletics' }])
  })
})

describe('careerMapper strictSkills option', () => {
  it('applique strictSkills=true pour filtrer les careerSkills', () => {
    const input = [
      {
        Name: 'Scholar',
        Key: 'scholar',
        Description: 'Desc',
        CareerSkills: { CareerSkill: [{ Key: 'ATHL' }, { Key: 'ARCANA' }, { Key: 'SCI' }] },
        FreeRanks: '2',
      },
    ]
    const [strictMapped] = careerMapper(input, { strictSkills: true })
    const [looseMapped] = careerMapper(input)
    expect(strictMapped.system.careerSkills.map((s) => s.id)).toEqual(['athletics', 'science'])
    expect(looseMapped.system.careerSkills.map((s) => s.id)).toEqual(['athletics', 'arcana', 'science'])
  })
})
