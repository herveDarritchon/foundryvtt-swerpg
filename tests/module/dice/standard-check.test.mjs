import { describe, it, expect, vi, beforeEach } from 'vitest'
import StandardCheck from '../../../module/dice/standard-check.mjs'
import { logger } from '../../../module/utils/logger.mjs'

// SYSTEM constants pour les tests
globalThis.SYSTEM = { id: 'swerpg', dice: { MAX_BOONS: 6, DIE_STEP: 2, MAX_DIE: 12, MIN_DIE: 4 } }

// Polyfill Math.clamp pour les tests (pas fourni par les mocks globaux)
if (!Math.clamp) {
  Math.clamp = function (value, min, max) {
    if (Number.isNaN(value)) return min
    return Math.min(Math.max(value, min), max)
  }
}

describe('StandardCheck _prepareData', () => {
  beforeEach(() => {
    vi.spyOn(logger, 'warn').mockImplementation(() => {})
  })

  it('log warn si boons est numérique', () => {
    const sc = new StandardCheck('', {})
    sc._prepareData({ boons: 3 })
    expect(logger.warn).toHaveBeenCalledWith('StandardCheck received boons passed as a number instead of an object')
  })

  it('log warn si banes est numérique', () => {
    const sc = new StandardCheck('', {})
    sc._prepareData({ banes: 2 })
    expect(logger.warn).toHaveBeenCalledWith('StandardCheck received boons passed as a number instead of an object')
  })

  it('_prepareData retourne un objet avec les bonnes propriétés', () => {
    const sc = new StandardCheck('', {})
    const data = sc._prepareData({ ability: 5, skill: 2, enchantment: 1 })
    expect(data).toHaveProperty('ability')
    expect(data).toHaveProperty('skill')
    expect(data).toHaveProperty('enchantment')
    expect(data).toHaveProperty('dc')
    expect(data).toHaveProperty('totalBoons')
    expect(data).toHaveProperty('totalBanes')
  })
})

function make(evaluatedTotal, dc = 20, thresholds = {}) {
  const sc = new StandardCheck('', { dc, ...thresholds })
  sc.total = evaluatedTotal
  sc._evaluated = true
  return sc
}

describe('StandardCheck getters success/failure/critical', () => {

  it('isSuccess true si total > dc', () => {
    expect(make(21).isSuccess).toBe(true)
    expect(make(20).isSuccess).toBe(false)
  })

  it('isCriticalSuccess > dc + threshold (default 6)', () => {
    expect(make(27).isCriticalSuccess).toBe(true)
    expect(make(26).isCriticalSuccess).toBe(false)
    expect(make(25, 20, { criticalSuccessThreshold: 4 }).isCriticalSuccess).toBe(true)
  })

  it('isFailure <= dc', () => {
    expect(make(19).isFailure).toBe(true)
    expect(make(20).isFailure).toBe(true)
    expect(make(21).isFailure).toBe(false)
  })

  it('isCriticalFailure < dc - threshold (strict)', () => {
    expect(make(13).isCriticalFailure).toBe(true) // 13 < 14 (20-6)
    expect(make(14).isCriticalFailure).toBe(false)
    expect(make(11, 20, { criticalFailureThreshold: 8 }).isCriticalFailure).toBe(true) // 11 < 12 (20-8)
  })
})

describe('StandardCheck.parse ajuste le pool avec boons/banes', () => {
  it('augmente faces à gauche avec boons et réduit à droite avec banes', () => {
    const data = { totalBoons: 2, totalBanes: 2, ability: 1, skill: 2, enchantment: 3 }
    const terms = StandardCheck.parse('', data)
    expect(Array.isArray(terms)).toBe(true)
    // Structure simple : premier élément contient formule générée
    const formulaTerm = terms[0].term
    // Avec 2 boons: [8,8,8] -> [12,8,8] après boons; avec 2 banes: [12,8,8] -> [12,8,4] après banes
    expect(formulaTerm).toContain('1d12 + 1d8 + 1d4')
    expect(formulaTerm).toContain('+ 1 + 2 + 3')
  })
})

describe('StandardCheck.toJSON copie data', () => {
  it('inclut data clonée', () => {
    const sc = new StandardCheck('', { ability: 2 })
    sc.data = sc._prepareData({ ability: 2 })
    const j = sc.toJSON()
    expect(j.data.ability).toBe(2)
  })
})
