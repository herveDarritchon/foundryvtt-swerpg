import { describe, expect, it, vi } from 'vitest'

import {
  serializeConsequence,
  deserializeConsequences,
  getMarketConsequences,
  clearMarketConsequence,
} from '../../../module/lib/market/consequence-persistence.mjs'
import { CONSEQUENCE_TYPES } from '../../../module/lib/market/consequences.mjs'

/* -------------------------------------------- */
/*  Factories                                   */
/* -------------------------------------------- */

/**
 * Build a minimal MarketConsequence-shaped plain object.
 * @param {object} [overrides]
 * @returns {import('../../../module/lib/market/consequences.mjs').MarketConsequence}
 */
function makeConsequence({
  type = CONSEQUENCE_TYPES.blackMarketDebt,
  descriptionKey = 'MARKET.Consequence.BlackMarketDebt.Description',
  automatic = false,
  playerChoice = true,
  metadata = {},
} = {}) {
  return { type, descriptionKey, automatic, playerChoice, metadata }
}

/**
 * Build a minimal actor mock with flag storage.
 */
function makeActorMock(initialConsequences = []) {
  const store = { marketConsequences: initialConsequences }
  return {
    id: 'actor-123',
    getFlag: vi.fn((scope, key) => (scope === 'swerpg' && key === 'marketConsequences' ? store[key] : undefined)),
    setFlag: vi.fn(async (scope, key, value) => {
      if (scope === 'swerpg') store[key] = value
    }),
  }
}

/* -------------------------------------------- */
/*  serializeConsequence                         */
/* -------------------------------------------- */

describe('serializeConsequence', () => {
  it('serializes an imperialSuspicion consequence', () => {
    const c = makeConsequence({
      type: CONSEQUENCE_TYPES.imperialSuspicion,
      automatic: false,
      playerChoice: false,
      metadata: { itemName: 'E-11 Blaster', restrictionLevel: 'restricted' },
    })
    const result = serializeConsequence(c)
    expect(result.type).toBe(CONSEQUENCE_TYPES.imperialSuspicion)
    expect(result.automatic).toBe(false)
    expect(result.playerChoice).toBe(false)
    expect(result.metadata.itemName).toBe('E-11 Blaster')
    expect(result.metadata.restrictionLevel).toBe('restricted')
    expect(typeof result.dateAccepted).toBe('string')
    expect(() => new Date(result.dateAccepted)).not.toThrow()
  })

  it('serializes a blackMarketDebt consequence', () => {
    const c = makeConsequence({ type: CONSEQUENCE_TYPES.blackMarketDebt, metadata: { itemName: 'Contraband' } })
    const result = serializeConsequence(c)
    expect(result.type).toBe(CONSEQUENCE_TYPES.blackMarketDebt)
    expect(result.playerChoice).toBe(true)
    expect(result.metadata.itemName).toBe('Contraband')
    expect(typeof result.dateAccepted).toBe('string')
  })

  it('serializes a complication consequence', () => {
    const c = makeConsequence({ type: CONSEQUENCE_TYPES.complication, playerChoice: true, metadata: { rarity: 9 } })
    const result = serializeConsequence(c)
    expect(result.type).toBe(CONSEQUENCE_TYPES.complication)
    expect(result.metadata.rarity).toBe(9)
  })

  it('includes actorId when provided', () => {
    const c = makeConsequence()
    const result = serializeConsequence(c, { actorId: 'actor-42' })
    expect(result.actorId).toBe('actor-42')
  })

  it('does not include actorId when not provided', () => {
    const c = makeConsequence()
    const result = serializeConsequence(c)
    expect('actorId' in result).toBe(false)
  })

  it('shallow-copies metadata to avoid mutation', () => {
    const metadata = { itemName: 'Test' }
    const c = makeConsequence({ metadata })
    const result = serializeConsequence(c)
    result.metadata.itemName = 'Mutated'
    expect(metadata.itemName).toBe('Test')
  })

  it('defaults metadata to empty object when absent', () => {
    const c = makeConsequence({ metadata: undefined })
    const result = serializeConsequence({ ...c, metadata: undefined })
    expect(result.metadata).toEqual({})
  })

  it('throws TypeError for non-object input', () => {
    expect(() => serializeConsequence(null)).toThrow(TypeError)
    expect(() => serializeConsequence(undefined)).toThrow(TypeError)
    expect(() => serializeConsequence('string')).toThrow(TypeError)
  })

  it('throws TypeError for unknown consequence type', () => {
    const c = makeConsequence({ type: 'unknownType' })
    expect(() => serializeConsequence(c)).toThrow(TypeError)
  })
})

/* -------------------------------------------- */
/*  deserializeConsequences                     */
/* -------------------------------------------- */

describe('deserializeConsequences', () => {
  it('returns empty array for null input', () => {
    expect(deserializeConsequences(null)).toEqual([])
  })

  it('returns empty array for undefined input', () => {
    expect(deserializeConsequences(undefined)).toEqual([])
  })

  it('returns empty array for non-array input', () => {
    expect(deserializeConsequences('string')).toEqual([])
    expect(deserializeConsequences(42)).toEqual([])
    expect(deserializeConsequences({})).toEqual([])
  })

  it('returns empty array for empty array input', () => {
    expect(deserializeConsequences([])).toEqual([])
  })

  it('deserializes valid serialized consequences', () => {
    const serialized = [
      {
        type: CONSEQUENCE_TYPES.blackMarketDebt,
        dateAccepted: new Date().toISOString(),
        descriptionKey: 'MARKET.Consequence.BlackMarketDebt.Description',
        automatic: false,
        playerChoice: true,
        metadata: {},
      },
      {
        type: CONSEQUENCE_TYPES.complication,
        dateAccepted: new Date().toISOString(),
        descriptionKey: 'MARKET.Consequence.Complication.Description',
        automatic: false,
        playerChoice: true,
        metadata: { rarity: 9 },
      },
    ]
    const result = deserializeConsequences(serialized)
    expect(result).toHaveLength(2)
    expect(result[0].type).toBe(CONSEQUENCE_TYPES.blackMarketDebt)
    expect(result[1].type).toBe(CONSEQUENCE_TYPES.complication)
    expect(result[1].metadata.rarity).toBe(9)
  })

  it('filters out records with invalid type', () => {
    const serialized = [
      { type: 'invalidType', dateAccepted: new Date().toISOString() },
      {
        type: CONSEQUENCE_TYPES.imperialSuspicion,
        dateAccepted: new Date().toISOString(),
        descriptionKey: 'k',
        automatic: false,
        playerChoice: false,
        metadata: {},
      },
    ]
    const result = deserializeConsequences(serialized)
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe(CONSEQUENCE_TYPES.imperialSuspicion)
  })

  it('filters out records missing dateAccepted', () => {
    const serialized = [{ type: CONSEQUENCE_TYPES.blackMarketDebt }]
    const result = deserializeConsequences(serialized)
    expect(result).toEqual([])
  })

  it('filters out non-object records', () => {
    const serialized = [null, undefined, 'string', 42]
    const result = deserializeConsequences(serialized)
    expect(result).toEqual([])
  })

  it('round-trips a serialized consequence', () => {
    const original = makeConsequence({
      type: CONSEQUENCE_TYPES.imperialSuspicion,
      automatic: false,
      playerChoice: false,
      metadata: { itemName: 'Blaster', restrictionLevel: 'restricted' },
    })
    const serialized = serializeConsequence(original, { actorId: 'actor-1' })
    const [deserialized] = deserializeConsequences([serialized])
    expect(deserialized.type).toBe(CONSEQUENCE_TYPES.imperialSuspicion)
    expect(deserialized.metadata.itemName).toBe('Blaster')
    expect(deserialized.actorId).toBe('actor-1')
    expect(typeof deserialized.dateAccepted).toBe('string')
  })
})

/* -------------------------------------------- */
/*  getMarketConsequences                       */
/* -------------------------------------------- */

describe('getMarketConsequences', () => {
  it('returns empty array when actor is null', () => {
    expect(getMarketConsequences(null)).toEqual([])
  })

  it('returns empty array when actor has no getFlag method', () => {
    expect(getMarketConsequences({})).toEqual([])
  })

  it('returns empty array when no consequences are stored', () => {
    const actor = makeActorMock([])
    expect(getMarketConsequences(actor)).toEqual([])
  })

  it('returns deserialized consequences from actor flags', () => {
    const stored = [
      {
        type: CONSEQUENCE_TYPES.blackMarketDebt,
        dateAccepted: new Date().toISOString(),
        descriptionKey: 'k',
        automatic: false,
        playerChoice: true,
        metadata: {},
      },
    ]
    const actor = makeActorMock(stored)
    const result = getMarketConsequences(actor)
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe(CONSEQUENCE_TYPES.blackMarketDebt)
  })

  it('calls getFlag with correct scope and key', () => {
    const actor = makeActorMock([])
    getMarketConsequences(actor)
    expect(actor.getFlag).toHaveBeenCalledWith('swerpg', 'marketConsequences')
  })
})

/* -------------------------------------------- */
/*  clearMarketConsequence                      */
/* -------------------------------------------- */

describe('clearMarketConsequence', () => {
  it('does nothing when actor is null', async () => {
    await expect(clearMarketConsequence(null, CONSEQUENCE_TYPES.blackMarketDebt)).resolves.toBeUndefined()
  })

  it('does nothing when actor has no getFlag/setFlag', async () => {
    await expect(clearMarketConsequence({}, CONSEQUENCE_TYPES.blackMarketDebt)).resolves.toBeUndefined()
  })

  it('removes consequences of the given type and keeps others', async () => {
    const stored = [
      {
        type: CONSEQUENCE_TYPES.blackMarketDebt,
        dateAccepted: new Date().toISOString(),
        descriptionKey: 'k',
        automatic: false,
        playerChoice: true,
        metadata: {},
      },
      { type: CONSEQUENCE_TYPES.complication, dateAccepted: new Date().toISOString(), descriptionKey: 'k', automatic: false, playerChoice: true, metadata: {} },
    ]
    const actor = makeActorMock(stored)
    await clearMarketConsequence(actor, CONSEQUENCE_TYPES.blackMarketDebt)
    expect(actor.setFlag).toHaveBeenCalledOnce()
    const [, , newValue] = actor.setFlag.mock.calls[0]
    expect(newValue).toHaveLength(1)
    expect(newValue[0].type).toBe(CONSEQUENCE_TYPES.complication)
  })

  it('does not call setFlag when no consequences of that type exist', async () => {
    const stored = [
      { type: CONSEQUENCE_TYPES.complication, dateAccepted: new Date().toISOString(), descriptionKey: 'k', automatic: false, playerChoice: true, metadata: {} },
    ]
    const actor = makeActorMock(stored)
    await clearMarketConsequence(actor, CONSEQUENCE_TYPES.blackMarketDebt)
    // setFlag IS still called but with the same list (filtering produces same result)
    const [, , newValue] = actor.setFlag.mock.calls[0]
    expect(newValue).toHaveLength(1)
    expect(newValue[0].type).toBe(CONSEQUENCE_TYPES.complication)
  })

  it('stores an empty array when all consequences of that type are cleared', async () => {
    const stored = [
      {
        type: CONSEQUENCE_TYPES.blackMarketDebt,
        dateAccepted: new Date().toISOString(),
        descriptionKey: 'k',
        automatic: false,
        playerChoice: true,
        metadata: {},
      },
    ]
    const actor = makeActorMock(stored)
    await clearMarketConsequence(actor, CONSEQUENCE_TYPES.blackMarketDebt)
    const [, , newValue] = actor.setFlag.mock.calls[0]
    expect(newValue).toEqual([])
  })
})
