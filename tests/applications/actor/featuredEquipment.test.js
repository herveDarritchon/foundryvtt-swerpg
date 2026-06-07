import { describe, it, expect } from 'vitest'
import { computeFeaturedEquipment } from '../../../module/lib/featured-equipment.mjs'

/**
 *
 * @param root0
 * @param root0.id
 * @param root0.name
 * @param root0.img
 * @param root0.type
 * @param root0.system
 * @param root0.tags
 */
function mockItem({ id, name, img = 'icon.png', type, system = {}, tags = {} }) {
  return {
    id,
    name,
    img,
    type,
    system: { ...system },
    getTags(mode) {
      if (mode === 'short') return tags
      return tags
    },
  }
}

/**
 *
 * @param obj
 */
function deepClone(obj) {
  if (Array.isArray(obj)) return obj.map(deepClone)
  if (obj && typeof obj === 'object') {
    const cloned = {}
    for (const [key, value] of Object.entries(obj)) {
      // Préserver les fonctions pour le test d'immutabilité
      cloned[key] = typeof value === 'function' ? value : deepClone(value)
    }
    return cloned
  }
  return obj
}

describe('computeFeaturedEquipment', () => {
  it('armure seule -> une entrée slot armor', () => {
    const armor = mockItem({ id: 'a1', name: 'Armure Légère', type: 'armor', system: { equipped: true, soak: 2 } })
    const out = computeFeaturedEquipment({ armor, weapons: [] })
    expect(out).toHaveLength(1)
    expect(out[0].slot).toBe('armor')
    expect(out[0].type).toBe('armor')
    expect(out[0].tags.length).toBeGreaterThan(0)
  })

  it('arme twohand ignore offhand', () => {
    const twoHand = mockItem({ id: 'w1', name: 'Sabre Laser 2M', type: 'weapon', system: { equipped: true, slot: 'twohand' } })
    const offHand = mockItem({ id: 'w2', name: 'Blaster Off', type: 'weapon', system: { equipped: true, slot: 'offhand' } })
    const out = computeFeaturedEquipment({ weapons: [twoHand, offHand] })
    expect(out).toHaveLength(1)
    expect(out[0].slot).toBe('twohand')
  })

  it('deux armes main/offhand', () => {
    const main = mockItem({ id: 'w1', name: 'Blaster Principal', type: 'weapon', system: { equipped: true, slot: 'mainhand' } })
    const off = mockItem({ id: 'w2', name: 'Blaster Secondaire', type: 'weapon', system: { equipped: true, slot: 'offhand' } })
    const out = computeFeaturedEquipment({ weapons: [main, off] })
    expect(out).toHaveLength(2)
    const slots = out.map((e) => e.slot).sort()
    expect(slots).toEqual(['mainhand', 'offhand'])
  })

  it('arme cassée -> cssClass contient broken', () => {
    const broken = mockItem({ id: 'wBroken', name: 'Blaster Cassé', type: 'weapon', system: { equipped: true, slot: 'mainhand', broken: true } })
    const out = computeFeaturedEquipment({ weapons: [broken] })
    expect(out[0].cssClass).toMatch(/broken/)
  })

  it('aucun équipement -> tableau vide', () => {
    const out = computeFeaturedEquipment({})
    expect(out).toHaveLength(0)
  })

  it('performance < 50ms pour mocks', () => {
    const weapons = Array.from({ length: 2 }, (_, i) =>
      mockItem({ id: `w${i}`, name: `Arme ${i}`, type: 'weapon', system: { equipped: true, slot: i === 0 ? 'mainhand' : 'offhand' } }),
    )
    const armor = mockItem({ id: 'a1', name: 'Armure', type: 'armor', system: { equipped: true } })
    const t0 = performance.now()
    computeFeaturedEquipment({ armor, weapons })
    const dt = performance.now() - t0
    expect(dt).toBeLessThan(50)
  })

  it('tags contenant NaN sont filtrés (régression #629)', () => {
    // Simule un item dont getTags retourne une valeur NaN interpolée (ex: damage non initialisé)
    const weapon = mockItem({
      id: 'w-nan',
      name: 'Blaster NaN',
      type: 'weapon',
      system: { equipped: true, slot: 'mainhand' },
      tags: { damage: 'NaN Damage', category: 'Blaster' },
    })
    const out = computeFeaturedEquipment({ weapons: [weapon] })
    expect(out).toHaveLength(1)
    const tags = out[0].tags
    const hasNaN = tags.some((t) => t.includes('NaN'))
    expect(hasNaN).toBe(false)
  })

  it('tags partiellement invalides: les tags valides restent présents (régression #629)', () => {
    // Seul le tag "NaN Damage" est filtré — "Blaster" doit rester
    const weapon = mockItem({
      id: 'w-partial',
      name: 'Blaster Partiel',
      type: 'weapon',
      system: { equipped: true, slot: 'mainhand' },
      tags: { damage: 'NaN Damage', category: 'Blaster', range: 'NaN Range' },
    })
    const out = computeFeaturedEquipment({ weapons: [weapon] })
    expect(out[0].tags).toContain('Blaster')
    expect(out[0].tags).not.toContain('NaN Damage')
    expect(out[0].tags).not.toContain('NaN Range')
  })

  it('tous les tags sont NaN: fallback appliqué (régression #629)', () => {
    // Quand tous les tags sont invalides, le fallback ['Dmg','Range'] est utilisé
    const weapon = mockItem({
      id: 'w-allnan',
      name: 'Blaster Tout NaN',
      type: 'weapon',
      system: { equipped: true, slot: 'mainhand' },
      tags: { damage: 'NaN Damage', range: 'NaN Range' },
    })
    const out = computeFeaturedEquipment({ weapons: [weapon] })
    expect(out[0].tags).toEqual(['Dmg', 'Range'])
  })

  it('armure avec tags NaN: tag invalide filtré (régression #629)', () => {
    const armor = mockItem({
      id: 'a-nan',
      name: 'Armure NaN',
      type: 'armor',
      system: { equipped: true },
      tags: { defense: 'NaN Armor', category: 'Légère' },
    })
    const out = computeFeaturedEquipment({ armor, weapons: [] })
    expect(out).toHaveLength(1)
    expect(out[0].tags).not.toContain('NaN Armor')
    expect(out[0].tags).toContain('Légère')
  })

  it('immutabilité: sources non modifiés', () => {
    const armor = mockItem({ id: 'a1', name: 'Armure', type: 'armor', system: { equipped: true, soak: 2 } })
    const weapons = [mockItem({ id: 'w1', name: 'Blaster', type: 'weapon', system: { equipped: true, slot: 'mainhand', damage: 5 } })]
    const beforeArmor = deepClone(armor)
    const beforeWeapons = deepClone(weapons)
    computeFeaturedEquipment({ armor, weapons })
    expect(armor).toEqual(beforeArmor)
    expect(weapons).toEqual(beforeWeapons)
  })
})
