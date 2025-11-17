/**
 * Tests pour le mapping des armures OggDude
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { armorMapper } from '../../module/importer/items/armor-ogg-dude.mjs'
import { buildArmorDescription, normalizeCategoryToProperty } from '../../module/importer/utils/armor-import-utils.mjs'

describe('Armor Import Mapping', () => {
  beforeEach(() => {
    // Mock minimal de foundry pour éviter les erreurs d'import
    globalThis.foundry = {
      utils: {
        mergeObject: vi.fn((a, b) => ({ ...a, ...b })),
        debounce: vi.fn((fn) => fn),
      },
      data: {
        fields: {
          StringField: vi.fn((cfg = {}) => ({ ...cfg })),
          NumberField: vi.fn((cfg = {}) => ({ ...cfg })),
          BooleanField: vi.fn((cfg = {}) => ({ ...cfg })),
          SchemaField: vi.fn((schema = {}) => ({ ...schema })),
          HTMLField: vi.fn((cfg = {}) => ({ ...cfg })),
          FilePathField: vi.fn((cfg = {}) => ({ categories: ['IMAGE'], ...cfg })),
          ArrayField: vi.fn((field, cfg = {}) => ({ field, ...cfg })),
          EmbeddedDataField: vi.fn((cls, cfg = {}) => ({ cls, ...cfg })),
          SetField: vi.fn((field, cfg = {}) => ({ field, ...cfg })),
        },
      },
    }

    // Mock SYSTEM minimal
    globalThis.SYSTEM = {
      ARMOR: {
        CATEGORIES: {
          light: { id: 'light' },
          medium: { id: 'medium' },
          heavy: { id: 'heavy' },
          natural: { id: 'natural' },
          unarmored: { id: 'unarmored' },
        },
        DEFAULT_CATEGORY: 'medium',
        PROPERTIES: {
          bulky: { label: 'ARMOR.PROPERTIES.BULKY' },
          organic: { label: 'ARMOR.PROPERTIES.ORGANIC' },
          sealed: { label: 'ARMOR.PROPERTIES.SEALED' },
          'full-body': { label: 'ARMOR.PROPERTIES.FULL_BODY' },
          restricted: { label: 'ARMOR.PROPERTIES.RESTRICTED' },
        },
      },
    }
  })

  it('should map basic armor values correctly', async () => {
    const { armorMapper } = await import('../../module/importer/items/armor-ogg-dude.mjs')

    const mockXmlArmor = {
      Key: 'TESTARMOR',
      Name: 'Test Armor',
      Description: 'A test armor description.',
      Defense: '2',
      Soak: '1',
      Price: '1000',
      Encumbrance: '3',
      Rarity: '4',
      HP: '2',
      Restricted: 'false',
      Categories: {
        Category: ['Light'],
      },
    }

    const result = armorMapper([mockXmlArmor])
    expect(result).toHaveLength(1)

    const armor = result[0]
    expect(armor.name).toBe('Test Armor')
    expect(armor.type).toBe('armor')
    expect(armor.system.defense.base).toBe(2)
    expect(armor.system.soak.base).toBe(1)
    expect(armor.system.price).toBe(1000)
    expect(armor.system.encumbrance).toBe(3)
    expect(armor.system.rarity).toBe(4)
    expect(armor.system.hardPoints).toBe(2)
    expect(armor.system.description.public).toContain('Test Armor')
  })

  it('should handle description with H3 tags', async () => {
    const { buildArmorDescription } = await import('../../module/importer/utils/armor-import-utils.mjs')

    const xmlArmor = {
      Name: 'Test Armor',
      Description: '[H3]Test Armor[h3]\nThis is a description with H3 tags.',
      Source: { _: 'Test Book', $: { Page: '42' } },
    }

    const description = buildArmorDescription(xmlArmor)
    expect(description).not.toContain('[H3]')
    expect(description).not.toContain('[h3]')
    expect(description).toContain('Test Armor')
    expect(description).toContain('Source: Test Book, p.42')
  })

  it('should normalize category tags correctly', async () => {
    const { normalizeArmorCategoryTag } = await import('../../module/importer/utils/armor-import-utils.mjs')

    expect(normalizeArmorCategoryTag('Full Body')).toBe('full-body')
    expect(normalizeArmorCategoryTag('Sealed')).toBe('sealed')
    expect(normalizeArmorCategoryTag('"Heavy Armor"')).toBe('heavy-armor')
    expect(normalizeArmorCategoryTag('')).toBe('')
    expect(normalizeArmorCategoryTag(null)).toBe('')
  })

  it('should add restricted property when armor is restricted', async () => {
    const { armorMapper } = await import('../../module/importer/items/armor-ogg-dude.mjs')

    const mockXmlArmor = {
      Key: 'RESTRICTEDARMOR',
      Name: 'Restricted Armor',
      Description: 'A restricted armor.',
      Defense: '1',
      Soak: '1',
      Restricted: 'true',
      Categories: { Category: [] },
    }

    const result = armorMapper([mockXmlArmor])
    const armor = result[0]

    expect(Array.from(armor.system.properties)).toContain('restricted')
  })

  it('should handle BaseMods correctly', async () => {
    const { extractBaseMods, buildArmorDescription } = await import('../../module/importer/utils/armor-import-utils.mjs')

    const xmlArmor = {
      Name: 'Test Armor',
      Description: 'Test description',
      BaseMods: {
        Mod: [
          {
            MiscDesc: 'Adds [BO] to Perception checks.',
            DieModifiers: {
              DieModifier: {
                SkillKey: 'PERC',
                BoostCount: '1',
              },
            },
          },
          {
            MiscDesc: 'Removes [SE] imposed by cold weather.',
          },
        ],
      },
    }

    const baseMods = extractBaseMods(xmlArmor)
    expect(baseMods).toHaveLength(2)
    expect(baseMods[0].text).toBe('Adds [BO] to Perception checks.')
    expect(baseMods[0].skillKey).toBe('PERC')
    expect(baseMods[0].boostCount).toBe(1)

    const description = buildArmorDescription(xmlArmor)
    expect(description).toContain('Base Mods:')
    expect(description).toContain('- Adds [BO] to Perception checks.')
    expect(description).toContain('- Removes [SE] imposed by cold weather.')
  })

  it('should sanitize script injection in description', async () => {
    const { sanitizeText } = await import('../../module/importer/utils/armor-import-utils.mjs')

    const maliciousInput = '<script>alert("xss")</script>Safe text'
    const result = sanitizeText(maliciousInput)

    expect(result).not.toContain('<script>')
    expect(result).toContain('&lt;script')
    expect(result).toContain('Safe text')
  })

  it('should handle empty or missing BaseMods', async () => {
    const { buildArmorDescription, extractBaseMods } = await import('../../module/importer/utils/armor-import-utils.mjs')

    const xmlArmorWithoutMods = {
      Name: 'Simple Armor',
      Description: 'Just a simple armor.',
    }

    const description = buildArmorDescription(xmlArmorWithoutMods)
    expect(description).not.toContain('Base Mods:')

    const baseMods = extractBaseMods(xmlArmorWithoutMods)
    expect(baseMods).toEqual([])
  })

  it('should preserve dice codes in description', async () => {
    const { buildArmorDescription } = await import('../../module/importer/utils/armor-import-utils.mjs')

    const xmlArmor = {
      Name: 'Magic Armor',
      Description: 'Grants [BO][BO] to resist [SE] effects.',
      BaseMods: {
        Mod: {
          MiscDesc: 'Reduces [DI] by 1 when attacked.',
        },
      },
    }

    const description = buildArmorDescription(xmlArmor)
    expect(description).toContain('[BO][BO]')
    expect(description).toContain('[SE]')
    expect(description).toContain('[DI]')
  })
})
