/**
 * Tests unitaires pour le mapping des DieModifiers des talents OggDude
 * Couvre l'extraction, la normalisation et le formatage des modificateurs de dés
 */

import { describe, it, expect } from 'vitest'
import {
  extractTalentDieModifiers,
  formatTalentDieModifiersForDescription,
  extractTalentSource,
  assembleTalentDescription,
} from '../../module/importer/mappings/oggdude-talent-diemodifiers-map.mjs'

describe('extractTalentDieModifiers', () => {
  it('devrait extraire un seul DieModifier', () => {
    const talentData = {
      DieModifiers: {
        DieModifier: {
          SkillKey: 'LORE',
          SetbackCount: '1',
        },
      },
    }

    const result = extractTalentDieModifiers(talentData)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      skillKey: 'LORE',
      setbackCount: 1,
    })
  })

  it('devrait extraire plusieurs DieModifiers', () => {
    const talentData = {
      DieModifiers: {
        DieModifier: [
          {
            SkillKey: 'LORE',
            SetbackCount: '1',
          },
          {
            SkillKey: 'LORE',
            DecreaseDifficultyCount: '1',
            ApplyOnce: 'true',
          },
        ],
      },
    }

    const result = extractTalentDieModifiers(talentData)

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      skillKey: 'LORE',
      setbackCount: 1,
    })
    expect(result[1]).toEqual({
      skillKey: 'LORE',
      decreaseDifficultyCount: 1,
      applyOnce: true,
    })
  })

  it('devrait gérer les DieModifiers avec BoostCount', () => {
    const talentData = {
      DieModifiers: {
        DieModifier: {
          SkillKey: 'ATHLETICS',
          BoostCount: '2',
        },
      },
    }

    const result = extractTalentDieModifiers(talentData)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      skillKey: 'ATHLETICS',
      boostCount: 2,
    })
  })

  it('devrait gérer les DieModifiers avec RemoveSetbackCount', () => {
    const talentData = {
      DieModifiers: {
        DieModifier: {
          SkillKey: 'STEALTH',
          RemoveSetbackCount: '1',
        },
      },
    }

    const result = extractTalentDieModifiers(talentData)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      skillKey: 'STEALTH',
      removeSetbackCount: 1,
    })
  })

  it('devrait gérer les DieModifiers avec UpgradeDifficultyCount', () => {
    const talentData = {
      DieModifiers: {
        DieModifier: {
          SkillKey: 'COMBAT',
          UpgradeDifficultyCount: '2',
        },
      },
    }

    const result = extractTalentDieModifiers(talentData)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      skillKey: 'COMBAT',
      upgradeDifficultyCount: 2,
    })
  })

  it('devrait retourner un tableau vide si pas de DieModifiers', () => {
    const talentData = {
      Name: 'Some Talent',
    }

    const result = extractTalentDieModifiers(talentData)

    expect(result).toEqual([])
  })

  it('devrait retourner un tableau vide si données invalides', () => {
    const result = extractTalentDieModifiers(null)
    expect(result).toEqual([])

    const result2 = extractTalentDieModifiers(undefined)
    expect(result2).toEqual([])
  })

  it('devrait ignorer les DieModifiers sans SkillKey ni CharacteristicType', () => {
    const talentData = {
      DieModifiers: {
        DieModifier: {
          SetbackCount: '1',
          // Pas de SkillKey ni CharacteristicType
        },
      },
    }

    const result = extractTalentDieModifiers(talentData)

    expect(result).toEqual([])
  })
})

describe('formatTalentDieModifiersForDescription', () => {
  it('devrait formater un modificateur simple', () => {
    const modifiers = [
      {
        skillKey: 'LORE',
        setbackCount: 1,
      },
    ]

    const result = formatTalentDieModifiersForDescription(modifiers)

    expect(result).toContain('Die Modifiers:')
    expect(result).toContain('Skill LORE')
    expect(result).toContain('+1 Setback die')
  })

  it('devrait formater plusieurs modificateurs', () => {
    const modifiers = [
      {
        skillKey: 'LORE',
        setbackCount: 1,
      },
      {
        skillKey: 'LORE',
        decreaseDifficultyCount: 1,
        applyOnce: true,
      },
    ]

    const result = formatTalentDieModifiersForDescription(modifiers)

    expect(result).toContain('Die Modifiers:')
    expect(result).toContain('+1 Setback die')
    expect(result).toContain('Decrease difficulty by 1')
    expect(result).toContain('(Apply once)')
  })

  it('devrait utiliser le pluriel pour les dés multiples', () => {
    const modifiers = [
      {
        skillKey: 'COMBAT',
        boostCount: 2,
      },
    ]

    const result = formatTalentDieModifiersForDescription(modifiers)

    expect(result).toContain('+2 Boost dice')
  })

  it('devrait retourner une chaîne vide si pas de modificateurs', () => {
    const result = formatTalentDieModifiersForDescription([])
    expect(result).toBe('')
  })

  it('devrait gérer les RemoveSetbackCount', () => {
    const modifiers = [
      {
        skillKey: 'STEALTH',
        removeSetbackCount: 1,
      },
    ]

    const result = formatTalentDieModifiersForDescription(modifiers)

    expect(result).toContain('Remove 1 Setback die')
  })

  it('devrait gérer les UpgradeDifficultyCount', () => {
    const modifiers = [
      {
        skillKey: 'COMBAT',
        upgradeDifficultyCount: 2,
      },
    ]

    const result = formatTalentDieModifiersForDescription(modifiers)

    expect(result).toContain('Upgrade difficulty 2 times')
  })

  it('devrait gérer les UpgradeAbilityCount', () => {
    const modifiers = [
      {
        skillKey: 'ATHLETICS',
        upgradeAbilityCount: 1,
      },
    ]

    const result = formatTalentDieModifiersForDescription(modifiers)

    expect(result).toContain('Upgrade ability 1 time')
  })
})

describe('extractTalentSource', () => {
  it('devrait extraire la source avec page', () => {
    const talentData = {
      Sources: {
        Source: {
          _text: 'Unlimited Power',
          Page: '33',
        },
      },
    }

    const result = extractTalentSource(talentData)

    expect(result).toBe('Source: Unlimited Power p.33')
  })

  it('devrait extraire la source sans page', () => {
    const talentData = {
      Sources: {
        Source: {
          _text: 'Core Rulebook',
        },
      },
    }

    const result = extractTalentSource(talentData)

    expect(result).toBe('Source: Core Rulebook')
  })

  it('devrait gérer la source comme chaîne simple', () => {
    const talentData = {
      Sources: {
        Source: 'Core Rulebook',
      },
    }

    const result = extractTalentSource(talentData)

    expect(result).toBe('Source: Core Rulebook')
  })

  it('devrait prendre la première source avec page si plusieurs sources', () => {
    const talentData = {
      Sources: {
        Source: [
          { _text: 'Book 1' },
          { _text: 'Book 2', Page: '42' },
          { _text: 'Book 3', Page: '99' },
        ],
      },
    }

    const result = extractTalentSource(talentData)

    expect(result).toBe('Source: Book 2 p.42')
  })

  it('devrait retourner une chaîne vide si pas de source', () => {
    const talentData = {
      Name: 'Some Talent',
    }

    const result = extractTalentSource(talentData)

    expect(result).toBe('')
  })

  it('devrait gérer la source avec propriété text', () => {
    const talentData = {
      Sources: {
        Source: {
          text: 'Unlimited Power',
          Page: '33',
        },
      },
    }

    const result = extractTalentSource(talentData)

    expect(result).toBe('Source: Unlimited Power p.33')
  })

  it('devrait gérer la source avec propriété BookName', () => {
    const talentData = {
      Sources: {
        Source: {
          BookName: 'Unlimited Power',
          Page: '33',
        },
      },
    }

    const result = extractTalentSource(talentData)

    expect(result).toBe('Source: Unlimited Power p.33')
  })
})

describe('assembleTalentDescription', () => {
  it('devrait assembler description complète avec tous les éléments', () => {
    const baseDescription = 'Please see page 33 of the Unlimited Power Sourcebook for details.'
    const source = 'Source: Unlimited Power p.33'
    const dieModifiers = [
      {
        skillKey: 'LORE',
        setbackCount: 1,
      },
      {
        skillKey: 'LORE',
        decreaseDifficultyCount: 1,
        applyOnce: true,
      },
    ]

    const result = assembleTalentDescription({
      baseDescription,
      source,
      dieModifiers,
    })

    expect(result).toContain('Please see page 33')
    expect(result).toContain('Source: Unlimited Power p.33')
    expect(result).toContain('Die Modifiers:')
    expect(result).toContain('+1 Setback die')
    expect(result).toContain('Decrease difficulty by 1')
  })

  it('devrait assembler description sans DieModifiers', () => {
    const baseDescription = 'This is a talent description.'
    const source = 'Source: Core Rulebook p.100'

    const result = assembleTalentDescription({
      baseDescription,
      source,
      dieModifiers: [],
    })

    expect(result).toContain('This is a talent description.')
    expect(result).toContain('Source: Core Rulebook p.100')
    expect(result).not.toContain('Die Modifiers:')
  })

  it('devrait assembler description sans source', () => {
    const baseDescription = 'This is a talent description.'
    const dieModifiers = [
      {
        skillKey: 'COMBAT',
        boostCount: 1,
      },
    ]

    const result = assembleTalentDescription({
      baseDescription,
      source: '',
      dieModifiers,
    })

    expect(result).toContain('This is a talent description.')
    expect(result).toContain('Die Modifiers:')
    expect(result).not.toContain('Source:')
  })

  it('devrait tronquer si la description dépasse maxLength', () => {
    const baseDescription = 'A'.repeat(1900)
    const source = 'Source: Some Book p.1'
    const dieModifiers = [
      {
        skillKey: 'LORE',
        setbackCount: 1,
      },
    ]

    const result = assembleTalentDescription({
      baseDescription,
      source,
      dieModifiers,
      maxLength: 2000,
    })

    expect(result.length).toBeLessThanOrEqual(2000)
    // Devrait prioriser DieModifiers et Source
    expect(result).toContain('Die Modifiers:')
    expect(result).toContain('Source: Some Book p.1')
  })

  it('devrait retourner une chaîne vide si pas de contenu', () => {
    const result = assembleTalentDescription({
      baseDescription: '',
      source: '',
      dieModifiers: [],
    })

    expect(result).toBe('')
  })

  it('devrait gérer la description seule', () => {
    const baseDescription = 'Just a simple description.'

    const result = assembleTalentDescription({
      baseDescription,
      source: '',
      dieModifiers: [],
    })

    expect(result).toBe('Just a simple description.')
  })
})
