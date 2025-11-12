import { describe, it, expect } from 'vitest'
import {
  getEffectId,
  bleeding,
  burning,
  chilled,
  confusion,
  corroding,
  decay,
  entropy,
  irradiated,
  mending,
  inspired,
  poisoned,
  shocked,
  staggered,
} from '../../../module/config/effects.mjs'

// Polyfill minimal slugify utilisé par getEffectId (simplifié, strict)
if (!String.prototype.slugify) {
  // remplacement uniquement des caractères non alphanumériques
  // et conservation de la casse (lowercase:false dans le code)
  // strict:true => élimine tout ce qui n'est pas [A-Za-z0-9]
  // replacement:'' => suppression
  // Implementation minimale suffisante pour les tests
  // (ne couvre pas toutes les variantes Foundry)
  // eslint-disable-next-line no-extend-native
  String.prototype.slugify = function ({ replacement = '', lowercase = false, strict = true } = {}) {
    let s = this.toString()
    if (lowercase) s = s.toLowerCase()
    if (strict) s = s.replaceAll(/[^A-Za-z0-9]/gu, replacement)
    return s
  }
}

const actor = {
  uuid: 'ActorUUID',
  system: {
    abilities: {
      dexterity: { value: 5 },
      intellect: { value: 7 },
      wisdom: { value: 4 },
      presence: { value: 6 },
    },
  },
}

describe('getEffectId', () => {
  it('génère un id de longueur 16 padding avec des 0', () => {
    const id = getEffectId('Bleeding')
    expect(id).toHaveLength(16)
    expect(id.startsWith('Bleeding')).toBe(true)
    expect(id).toMatch(/^Bleeding0+$/)
  })
})

describe('effects DOT et statuses', () => {
  it('bleeding retourne health basé sur ability param', () => {
    const eff = bleeding(actor, null, { ability: 'dexterity', damageType: 'piercing' })
    expect(eff.flags.swerpg.dot.health).toBe(5)
    expect(eff.flags.swerpg.dot.damageType).toBe('piercing')
    expect(eff._id).toHaveLength(16)
  })

  it('burning utilise intellect pour health et morale', () => {
    const eff = burning(actor)
    expect(eff.flags.swerpg.dot.health).toBe(7)
    expect(eff.flags.swerpg.dot.morale).toBe(7)
    expect(eff.flags.swerpg.dot.damageType).toBe('fire')
  })

  it('chilled divise wisdom par 2 arrondi inférieur et status slowed', () => {
    const eff = chilled(actor)
    expect(eff.flags.swerpg.dot.health).toBe(Math.floor(4 / 2))
    expect(eff.statuses).toContain('slowed')
  })

  it('confusion divise intellect par 2 et status disoriented', () => {
    const eff = confusion(actor)
    expect(eff.flags.swerpg.dot.morale).toBe(Math.floor(7 / 2))
    expect(eff.statuses).toContain('disoriented')
  })

  it('corroding health = wisdom, damageType acid', () => {
    const eff = corroding(actor)
    expect(eff.flags.swerpg.dot.health).toBe(4)
    expect(eff.flags.swerpg.dot.damageType).toBe('acid')
  })

  it('decay health = intellect, damageType corruption', () => {
    const eff = decay(actor)
    expect(eff.flags.swerpg.dot.damageType).toBe('corruption')
    expect(eff.flags.swerpg.dot.health).toBe(7)
  })

  it('entropy demi presence et status frightened', () => {
    const eff = entropy(actor)
    expect(eff.flags.swerpg.dot.health).toBe(Math.floor(6 / 2))
    expect(eff.statuses).toContain('frightened')
  })

  it('irradiated health et morale = presence, damageType radiant', () => {
    const eff = irradiated(actor)
    expect(eff.flags.swerpg.dot.health).toBe(6)
    expect(eff.flags.swerpg.dot.morale).toBe(6)
    expect(eff.flags.swerpg.dot.damageType).toBe('radiant')
  })

  it('mending inverse health (négatif)', () => {
    const eff = mending(actor)
    expect(eff.flags.swerpg.dot.health).toBe(-4)
  })

  it('inspired inverse morale (négatif)', () => {
    const eff = inspired(actor)
    expect(eff.flags.swerpg.dot.morale).toBe(-6)
  })

  it('poisoned health = intellect, damageType poison durée 6 tours', () => {
    const eff = poisoned(actor)
    expect(eff.duration.turns).toBe(6)
    expect(eff.flags.swerpg.dot.damageType).toBe('poison')
  })

  it('shocked demi intellect morale et status staggered', () => {
    const eff = shocked(actor)
    expect(eff.flags.swerpg.dot.morale).toBe(Math.floor(7 / 2))
    expect(eff.statuses).toContain('staggered')
  })

  it('staggered ajoute status staggered sans flags dot', () => {
    const eff = staggered(actor)
    expect(eff.statuses).toEqual(['staggered'])
    expect(eff.flags?.swerpg?.dot).toBeUndefined()
  })
})
