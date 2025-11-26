import { describe, it, expect } from 'vitest'
import { gearMapper } from '../../module/importer/items/gear-ogg-dude.mjs'

describe('Gear importer weapon profile enrichment', () => {
  it('should map base mods and weapon modifiers into description and flags', () => {
    const [gear] = gearMapper([
      {
        Name: '"Breaker" Heavy Hydrospanner',
        Key: 'BREAKHVYHYDROSP',
        Description: '[H3]Regalis Engineering "Breaker" Heavy Hydrospanner[h3]\nPlease see page 47 of the Fully Operational Sourcebook for details.',
        Source: { _: 'Fully Operational', $: { Page: '47' } },
        Type: 'Tools/Electronics',
        Price: '250',
        Encumbrance: '3',
        Rarity: '2',
        BaseMods: {
          Mod: [
            {
              MiscDesc: 'Adds [AD] to Mechanics checks.',
              DieModifiers: {
                DieModifier: {
                  SkillKey: 'MECH',
                  AdvantageCount: '1',
                },
              },
            },
            {
              MiscDesc: 'May be used as a weapon.',
            },
          ],
        },
        WeaponModifiers: {
          WeaponModifier: {
            Unarmed: 'false',
            UnarmedName: 'Breaker Heavy Hydrospanner',
            SkillKey: 'MELEE',
            Damage: '0',
            DamageAdd: '2',
            Crit: '4',
            RangeValue: 'wrEngaged',
            Qualities: {
              Quality: [
                { Key: 'CUMBERSOME', Count: '2' },
                { Key: 'CUMBERSOME', Count: '1' },
                { Key: 'DISORIENT', Count: '1' },
                { Key: 'INACCURATE', Count: '1' },
              ],
            },
          },
        },
      },
    ])

    expect(gear.system.price).toBe(250)
    expect(gear.system.encumbrance).toBe(3)
    expect(gear.system.rarity).toBe(2)
    expect(gear.system.category).toBe('tools_electronics')

    const description = gear.system.description.public
    expect(description).toContain('Regalis Engineering "Breaker" Heavy Hydrospanner')
    expect(description).toContain('Source: Fully Operational, p.47')
    expect(description).toContain('Base Mods:')
    expect(description).toContain('- Adds [AD] to Mechanics checks.')
    expect(description).toContain('- May be used as a weapon.')
    expect(description).toContain('Weapon Use:')
    expect(description).toContain('- Skill: Melee')
    expect(description).toContain('- Damage: Brawn + 2')
    expect(description).toContain('- Crit: 4')
    expect(description).toContain('- Range: Engaged')
    expect(description).toContain('  - Cumbersome: 3')
    expect(description).toContain('  - Disorient: 1')
    expect(description).toContain('  - Inaccurate: 1')
    expect(description.includes('[H3]')).toBe(false)

    const { swerpg } = gear.flags
    expect(swerpg.oggdudeSource).toBe('Fully Operational')
    expect(swerpg.oggdudeSourcePage).toBe(47)
    expect(swerpg.oggdude.baseMods).toHaveLength(2)
    expect(swerpg.oggdude.baseMods[0]).toMatchObject({ description: 'Adds [AD] to Mechanics checks.' })
    expect(swerpg.oggdude.baseMods[0].dieModifiers[0]).toMatchObject({ skillKey: 'MECH', advantageCount: 1 })
    expect(swerpg.oggdude.weaponProfile).toMatchObject({
      skillKey: 'MELEE',
      damage: 0,
      damageAdd: 2,
      crit: 4,
      rangeValue: 'engaged',
    })
    expect(swerpg.oggdude.weaponProfile.qualities).toEqual(
      expect.arrayContaining([
        { key: 'cumbersome', rank: 3 },
        { key: 'disorient', rank: 1 },
        { key: 'inaccurate', rank: 1 },
      ]),
    )
  })

  it('should omit weapon section and flags when weapon modifiers are absent', () => {
    const [gear] = gearMapper([
      {
        Name: 'Utility Field Kit',
        Key: 'UTILITY_FIELD_KIT',
        Description: 'Comprehensive kit for field repairs.',
        Source: { _: 'Engineer Companion', $: { Page: '88' } },
        Type: 'Gear/Utility',
        Price: 75,
        BaseMods: {
          Mod: [{ MiscDesc: 'Provides advantage to Mechanics checks in the field.' }],
        },
      },
    ])

    const description = gear.system.description.public
    expect(description).toContain('Base Mods:')
    expect(description).not.toContain('Weapon Use:')
    expect(gear.flags.swerpg.oggdude.weaponProfile).toBeUndefined()
    expect(gear.flags.swerpg.oggdude.baseMods).toHaveLength(1)
    expect(gear.flags.swerpg.oggdude.baseMods[0]).toMatchObject({
      description: 'Provides advantage to Mechanics checks in the field.',
    })
  })

  it('should sanitize potentially unsafe description content and apply numeric defaults', () => {
    const [gear] = gearMapper([
      {
        Name: 'Security Override Script',
        Key: 'SEC_OVERRIDE',
        Description: '<script>alert("xss")</script>Bypasses standard locks.',
        Source: { _: 'Slicer Handbook' },
      },
    ])

    const description = gear.system.description.public
    expect(description).toContain('&lt;script')
    expect(description).toContain('Source: Slicer Handbook')
    expect(description).not.toContain(', p.')
    expect(description).not.toContain('Base Mods:')
    expect(description).not.toContain('Weapon Use:')

    expect(gear.system.price).toBe(0)
    expect(gear.system.encumbrance).toBe(1)
    expect(gear.system.rarity).toBe(1)
    expect(gear.flags.swerpg.oggdude).toBeUndefined()
  })

  it('should not append optional sections when data is missing', () => {
    const [gear] = gearMapper([
      {
        Name: 'Compact Survival Kit',
        Key: 'SURVIVAL_KIT',
        Description: 'Essential tools for harsh environments.',
        Type: 'Survival',
      },
    ])

    const description = gear.system.description.public
    expect(description).toBe('Essential tools for harsh environments.')
    expect(gear.flags.swerpg.oggdude?.baseMods).toBeUndefined()
    expect(gear.flags.swerpg.oggdude?.weaponProfile).toBeUndefined()
  })
})
