import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { setupFoundryMock, teardownFoundryMock } from '../helpers/mock-foundry.mjs'

/* ============================================ */
/*  Helpers de test — objets et diffs           */
/* ============================================ */

function deepMerge(target, source) {
  const result = structuredClone(target)

  for (const key of Object.keys(source)) {
    const sv = source[key]
    const tv = result[key]

    if (sv && typeof sv === 'object' && !Array.isArray(sv) && tv && typeof tv === 'object' && !Array.isArray(tv)) {
      result[key] = deepMerge(tv, sv)
    } else {
      result[key] = sv
    }
  }

  return result
}

function makeActor(system) {
  return {
    type: 'character',
    id: 'actor-001',
    uuid: 'Actor.actor-001',
    name: 'Test Character',
    system,
  }
}

function flattenObject(obj, prefix = '') {
  const result = {}

  if (!obj || typeof obj !== 'object') return result

  for (const key of Object.keys(obj)) {
    const path = prefix ? `${prefix}.${key}` : key
    const value = obj[key]

    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      Object.assign(result, flattenObject(value, path))
    } else {
      result[path] = value
    }
  }

  return result
}

function getProperty(object, path) {
  const keys = path.split('.')
  let current = object

  for (const key of keys) {
    if (current === null || current === undefined) return undefined
    current = current[key]
  }

  return current
}

function setProperty(object, path, value) {
  const keys = path.split('.')
  let current = object

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    if (!current[key] || typeof current[key] !== 'object') current[key] = {}
    current = current[key]
  }

  current[keys[keys.length - 1]] = value
}

function makeOldState(changes, source) {
  const oldState = {}
  const flat = flattenObject(changes)

  for (const path of Object.keys(flat)) {
    if (!path.startsWith('system.')) continue
    if (path.includes('.-=')) continue

    const value = getProperty(source, path)
    if (value !== undefined) {
      setProperty(oldState, path, structuredClone(value))
    }
  }

  return oldState
}

function applyChangesToSystem(sourceSystem, changes) {
  const flat = flattenObject(changes)
  const result = structuredClone(sourceSystem)

  for (const path of Object.keys(flat)) {
    if (!path.startsWith('system.')) continue
    if (path.includes('.-=')) continue

    const systemPath = path.replace(/^system\./, '')
    setProperty(result, systemPath, flat[path])
  }

  return result
}

function defaultSource() {
  return {
    system: {
      skills: {},
      characteristics: {},
      progression: {
        experience: {
          spent: 0,
          gained: 0,
          available: 0,
          total: 0,
        },
        freeSkillRanks: {
          career: {
            id: null,
            name: '',
            spent: 0,
            gained: 0,
            available: 0,
          },
          specialization: {
            id: null,
            name: '',
            spent: 0,
            gained: 0,
            available: 0,
          },
        },
      },
      details: {
        species: null,
        career: null,
        specializations: {},
      },
      advancement: null,
    },
  }
}

async function composeFromChanges(changes, source, userId = 'user-1') {
  const { composeEntries } = await import('../../module/utils/audit-diff.mjs')

  const expandedChanges = foundry.utils.expandObject(changes)
  const oldState = makeOldState(expandedChanges, source)
  const newSystem = applyChangesToSystem(source.system, expandedChanges)
  const actor = makeActor(newSystem)

  return composeEntries(oldState, changes, actor, userId)
}

/* ============================================ */
/*  Setup                                       */
/* ============================================ */

beforeEach(() => {
  setupFoundryMock({
    game: {
      users: {
        get: vi.fn((id) => {
          if (id === 'user-1') return { name: 'Player One' }
          if (id === 'gm-1') return { name: 'Game Master', isGM: true }
          return null
        }),
      },
    },
  })
})

afterEach(() => {
  teardownFoundryMock()
  vi.restoreAllMocks()
})

/* ============================================ */
/*  captureSnapshot                             */
/* ============================================ */

describe('captureSnapshot', () => {
  test('returns expanded XP snapshot from actor after update', async () => {
    const { captureSnapshot } = await import('../../module/utils/audit-diff.mjs')

    const actor = makeActor({
      progression: {
        experience: {
          spent: 50,
          gained: 200,
          available: 150,
          total: 200,
        },
        freeSkillRanks: {
          career: {
            id: 'career-1',
            name: 'Warrior',
            spent: 2,
            gained: 5,
            available: 3,
          },
          specialization: {
            id: 'spec-1',
            name: 'Colossus',
            spent: 0,
            gained: 3,
            available: 3,
          },
        },
      },
    })

    const snap = captureSnapshot(actor)

    expect(snap).toEqual({
      xpAvailable: 150,
      totalXpSpent: 50,
      totalXpGained: 200,
      careerFreeAvailable: 3,
      specializationFreeAvailable: 3,
    })
  })

  test('returns zeros when XP data is missing', async () => {
    const { captureSnapshot } = await import('../../module/utils/audit-diff.mjs')

    const actor = makeActor({
      progression: {},
    })

    const snap = captureSnapshot(actor)

    expect(snap).toEqual({
      xpAvailable: 0,
      totalXpSpent: 0,
      totalXpGained: 0,
      careerFreeAvailable: 0,
      specializationFreeAvailable: 0,
    })
  })
})

/* ============================================ */
/*  makeEntry                                   */
/* ============================================ */

describe('makeEntry', () => {
  test('creates well-formed entry', async () => {
    const { makeEntry } = await import('../../module/utils/audit-diff.mjs')

    const entry = makeEntry({
      type: 'skill.train',
      data: {
        skillId: 'cool',
        oldRank: 0,
        newRank: 1,
        cost: 5,
        isFree: false,
        isCareer: true,
      },
      xpDelta: -5,
      ts: 1000,
      userId: 'user-1',
      user: { name: 'Player One' },
      snapshot: {
        xpAvailable: 95,
        totalXpSpent: 5,
        totalXpGained: 100,
        careerFreeAvailable: 2,
        specializationFreeAvailable: 1,
      },
    })

    expect(entry).toMatchObject({
      id: expect.any(String),
      schemaVersion: 1,
      timestamp: 1000,
      userId: 'user-1',
      userName: 'Player One',
      type: 'skill.train',
      xpDelta: -5,
      data: {
        skillId: 'cool',
        oldRank: 0,
        newRank: 1,
        cost: 5,
        isFree: false,
        isCareer: true,
      },
      snapshot: {
        xpAvailable: 95,
        totalXpSpent: 5,
        totalXpGained: 100,
        careerFreeAvailable: 2,
        specializationFreeAvailable: 1,
      },
    })
  })

  test('fallback userName when user not found', async () => {
    const { makeEntry } = await import('../../module/utils/audit-diff.mjs')

    const entry = makeEntry({
      type: 'xp.grant',
      data: { amount: 50 },
      xpDelta: 50,
      ts: 2000,
      userId: 'unknown',
      user: null,
      snapshot: {},
    })

    expect(entry.userName).toBe('Unknown')
  })

  test('normalizes negative zero xpDelta', async () => {
    const { makeEntry } = await import('../../module/utils/audit-diff.mjs')

    const entry = makeEntry({
      type: 'test',
      data: {},
      xpDelta: -0,
      ts: 0,
      userId: 'u1',
      user: null,
      snapshot: {},
    })

    expect(Object.is(entry.xpDelta, -0)).toBe(false)
    expect(entry.xpDelta).toBe(0)
  })

  test('snapshot is shallow-cloned', async () => {
    const { makeEntry } = await import('../../module/utils/audit-diff.mjs')

    const snapshot = {
      xpAvailable: 100,
      totalXpSpent: 0,
      totalXpGained: 100,
      careerFreeAvailable: 1,
      specializationFreeAvailable: 0,
    }

    const entry = makeEntry({
      type: 'test',
      data: {},
      xpDelta: 0,
      ts: 0,
      userId: 'u1',
      user: null,
      snapshot,
    })

    snapshot.xpAvailable = 999

    expect(entry.snapshot.xpAvailable).toBe(100)
  })
})

/* ============================================ */
/*  computeCharacteristicCost                   */
/* ============================================ */

describe('computeCharacteristicCost', () => {
  test('computeCharacteristicCost', async () => {
    const { computeCharacteristicCost } = await import('../../module/utils/audit-diff.mjs')

    expect(computeCharacteristicCost(3)).toBe(30)
    expect(computeCharacteristicCost(4)).toBe(40)
  })
})

/* ============================================ */
/*  reconstructPreviousValue                    */
/* ============================================ */

describe('reconstructPreviousValue', () => {
  test('reconstructs previous partial object over current full object', async () => {
    const { reconstructPreviousValue } = await import('../../module/utils/audit-diff.mjs')

    const current = {
      base: 0,
      careerFree: 0,
      specializationFree: 0,
      trained: 2,
    }

    const oldPartial = {
      trained: 1,
    }

    expect(reconstructPreviousValue(oldPartial, current)).toEqual({
      base: 0,
      careerFree: 0,
      specializationFree: 0,
      trained: 1,
    })
  })

  test('returns current value when old partial is undefined', async () => {
    const { reconstructPreviousValue } = await import('../../module/utils/audit-diff.mjs')

    expect(reconstructPreviousValue(undefined, 3)).toBe(3)
  })
})

/* ============================================ */
/*  Skill changes                               */
/* ============================================ */

describe('skill changes', () => {
  test('skill.train career from 0 to 1 costs 5 XP', async () => {
    const changes = {
      system: {
        skills: {
          cool: {
            rank: { trained: 1 },
          },
        },
      },
    }

    const source = defaultSource()
    source.system.skills.cool = {
      rank: {
        base: 0,
        careerFree: 0,
        specializationFree: 0,
        trained: 0,
      },
    }
    source.system.details.career = {
      name: 'Explorer',
      careerSkills: ['cool'],
    }

    const entries = await composeFromChanges(changes, source)

    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      type: 'skill.train',
      xpDelta: -5,
      data: {
        skillId: 'cool',
        oldRank: 0,
        newRank: 1,
        cost: 5,
        isCareer: true,
        isFree: false,
      },
    })
  })

  test('skill.train non-career from 0 to 1 costs 10 XP', async () => {
    const changes = {
      system: {
        skills: {
          cool: {
            rank: { trained: 1 },
          },
        },
      },
    }

    const source = defaultSource()
    source.system.skills.cool = {
      rank: {
        base: 0,
        careerFree: 0,
        specializationFree: 0,
        trained: 0,
      },
    }
    source.system.details.career = {
      name: 'Explorer',
      careerSkills: ['athletics'],
    }

    const entries = await composeFromChanges(changes, source)

    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      type: 'skill.train',
      xpDelta: -10,
      data: {
        skillId: 'cool',
        oldRank: 0,
        newRank: 1,
        cost: 10,
        isCareer: false,
        isFree: false,
      },
    })
  })

  test('skill.forget from 3 to 2 refunds rank 3 cost, not rank 2 cost', async () => {
    const changes = {
      system: {
        skills: {
          cool: {
            rank: { trained: 2 },
          },
        },
      },
    }

    const source = defaultSource()
    source.system.skills.cool = {
      rank: {
        base: 0,
        careerFree: 0,
        specializationFree: 0,
        trained: 3,
      },
    }
    source.system.details.career = {
      name: 'Explorer',
      careerSkills: ['cool'],
    }

    const entries = await composeFromChanges(changes, source)

    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      type: 'skill.forget',
      xpDelta: 15,
      data: {
        skillId: 'cool',
        oldRank: 3,
        newRank: 2,
        cost: 15,
        isCareer: true,
        isFree: false,
      },
    })
  })

  test('returns empty when skill total rank has not changed', async () => {
    const changes = {
      system: {
        skills: {
          cool: {
            rank: { trained: 2 },
          },
        },
      },
    }

    const source = defaultSource()
    source.system.skills.cool = {
      rank: {
        base: 0,
        careerFree: 0,
        specializationFree: 0,
        trained: 2,
      },
    }

    const entries = await composeFromChanges(changes, source)

    expect(entries).toEqual([])
  })

  test('marks isFree=true when only free ranks increase', async () => {
    const changes = {
      system: {
        skills: {
          cool: {
            rank: { careerFree: 1 },
          },
        },
      },
    }

    const source = defaultSource()
    source.system.skills.cool = {
      rank: {
        base: 0,
        careerFree: 0,
        specializationFree: 0,
        trained: 0,
      },
    }
    source.system.details.career = {
      name: 'Explorer',
      careerSkills: ['cool'],
    }

    const entries = await composeFromChanges(changes, source)

    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      type: 'skill.train',
      xpDelta: 0,
      data: {
        skillId: 'cool',
        oldRank: 0,
        newRank: 1,
        cost: 0,
        isCareer: true,
        isFree: true,
      },
    })
  })

  test('sets freeRankType=career on career free rank increase', async () => {
    const changes = {
      system: {
        skills: {
          cool: {
            rank: { careerFree: 1 },
          },
        },
      },
    }

    const source = defaultSource()
    source.system.skills.cool = {
      rank: {
        base: 0,
        careerFree: 0,
        specializationFree: 0,
        trained: 0,
      },
    }
    source.system.details.career = {
      name: 'Explorer',
      careerSkills: ['cool'],
    }

    const entries = await composeFromChanges(changes, source)

    expect(entries).toHaveLength(1)
    expect(entries[0].data.freeRankType).toBe('career')
    expect(entries[0].data.isFree).toBe(true)
    expect(entries[0].data.cost).toBe(0)
  })

  test('career free rank forget costs 0 XP', async () => {
    const changes = {
      system: {
        skills: {
          cool: {
            rank: { careerFree: 0 },
          },
        },
      },
    }

    const source = defaultSource()
    source.system.skills.cool = {
      rank: {
        base: 0,
        careerFree: 1,
        specializationFree: 0,
        trained: 0,
      },
    }
    source.system.details.career = {
      name: 'Explorer',
      careerSkills: ['cool'],
    }

    const entries = await composeFromChanges(changes, source)

    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      type: 'skill.forget',
      xpDelta: 0,
      data: {
        skillId: 'cool',
        oldRank: 1,
        newRank: 0,
        cost: 0,
        isFree: false,
        freeRankType: 'career',
      },
    })
  })

  test('specialization free rank forget costs 0 XP', async () => {
    const changes = {
      system: {
        skills: {
          cool: {
            rank: { specializationFree: 0 },
          },
        },
      },
    }

    const source = defaultSource()
    source.system.skills.cool = {
      rank: {
        base: 0,
        careerFree: 0,
        specializationFree: 1,
        trained: 0,
      },
    }
    source.system.details.career = {
      name: 'Explorer',
      careerSkills: [],
    }
    source.system.details.specializations = {
      spec1: {
        careerSkills: ['cool'],
      },
    }

    const entries = await composeFromChanges(changes, source)

    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      type: 'skill.forget',
      xpDelta: 0,
      data: {
        skillId: 'cool',
        oldRank: 1,
        newRank: 0,
        cost: 0,
        isFree: false,
        freeRankType: 'specialization',
      },
    })
  })

  test('includes skillName and skillCategory in entry data', async () => {
    const changes = {
      system: {
        skills: {
          cool: {
            rank: { trained: 1 },
          },
        },
      },
    }

    const source = defaultSource()
    source.system.skills.cool = {
      label: 'Cool',
      type: 'general',
      rank: {
        base: 0,
        careerFree: 0,
        specializationFree: 0,
        trained: 0,
      },
    }
    source.system.details.career = {
      name: 'Explorer',
      careerSkills: ['cool'],
    }

    const entries = await composeFromChanges(changes, source)

    expect(entries).toHaveLength(1)
    expect(entries[0].data.skillName).toBe('Cool')
    expect(entries[0].data.skillCategory).toBe('general')
  })

  test('skillName falls back to skillId when label is missing', async () => {
    const changes = {
      system: {
        skills: {
          athletics: {
            rank: { trained: 1 },
          },
        },
      },
    }

    const source = defaultSource()
    source.system.skills.athletics = {
      rank: {
        base: 0,
        careerFree: 0,
        specializationFree: 0,
        trained: 0,
      },
    }
    source.system.details.career = {
      name: 'Explorer',
      careerSkills: ['athletics'],
    }

    const entries = await composeFromChanges(changes, source)

    expect(entries).toHaveLength(1)
    expect(entries[0].data.skillName).toBe('athletics')
    expect(entries[0].data.skillCategory).toBeNull()
  })

  test('trained rank forget has freeRankType=null', async () => {
    const changes = {
      system: {
        skills: {
          cool: {
            rank: { trained: 2 },
          },
        },
      },
    }

    const source = defaultSource()
    source.system.skills.cool = {
      rank: {
        base: 0,
        careerFree: 0,
        specializationFree: 0,
        trained: 3,
      },
    }
    source.system.details.career = {
      name: 'Explorer',
      careerSkills: ['cool'],
    }

    const entries = await composeFromChanges(changes, source)

    expect(entries).toHaveLength(1)
    expect(entries[0].data.freeRankType).toBeNull()
    expect(entries[0].data.cost).toBe(15)
    expect(entries[0].data.isFree).toBe(false)
  })
})

/* ============================================ */
/*  Characteristic changes                      */
/* ============================================ */

describe('characteristic changes', () => {
  test('characteristic.increase from 2 to 3 costs 30 XP', async () => {
    const changes = {
      system: {
        characteristics: {
          brawn: {
            rank: { trained: 1 },
          },
        },
      },
    }

    const source = defaultSource()
    source.system.characteristics.brawn = {
      rank: {
        base: 2,
        trained: 0,
        bonus: 0,
      },
    }

    const entries = await composeFromChanges(changes, source)

    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      type: 'characteristic.increase',
      xpDelta: -30,
      data: {
        characteristicId: 'brawn',
        oldValue: 2,
        newValue: 3,
        cost: 30,
      },
    })
  })

  test('returns empty for characteristic decrease', async () => {
    const changes = {
      system: {
        characteristics: {
          brawn: {
            rank: { trained: 0 },
          },
        },
      },
    }

    const source = defaultSource()
    source.system.characteristics.brawn = {
      rank: {
        base: 2,
        trained: 1,
        bonus: 0,
      },
    }

    const entries = await composeFromChanges(changes, source)

    expect(entries).toEqual([])
  })

  test.each(['brawn', 'agility', 'intellect', 'cunning', 'willpower', 'presence'])(
    'characteristic.increase for %s from 2 to 3 costs 30 XP',
    async (charId) => {
      const changes = {
        system: {
          characteristics: {
            [charId]: {
              rank: { trained: 1 },
            },
          },
        },
      }

      const source = defaultSource()
      source.system.characteristics[charId] = {
        rank: { base: 2, trained: 0, bonus: 0 },
      }

      const entries = await composeFromChanges(changes, source)

      expect(entries).toHaveLength(1)
      expect(entries[0]).toMatchObject({
        type: 'characteristic.increase',
        xpDelta: -30,
        data: {
          characteristicId: charId,
          oldValue: 2,
          newValue: 3,
          cost: 30,
        },
      })
    },
  )

  test('characteristic.increase at max (5→6) costs 60 XP', async () => {
    const changes = {
      system: {
        characteristics: {
          brawn: {
            rank: { trained: 1 },
          },
        },
      },
    }

    const source = defaultSource()
    source.system.characteristics.brawn = {
      rank: { base: 5, trained: 0, bonus: 0 },
    }

    const entries = await composeFromChanges(changes, source)

    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      type: 'characteristic.increase',
      xpDelta: -60,
      data: {
        characteristicId: 'brawn',
        oldValue: 5,
        newValue: 6,
        cost: 60,
      },
    })
  })

  test('bonus-only rank increase creates characteristic.increase entry', async () => {
    const changes = {
      system: {
        characteristics: {
          brawn: {
            rank: { bonus: 1 },
          },
        },
      },
    }

    const source = defaultSource()
    source.system.characteristics.brawn = {
      rank: { base: 2, trained: 0, bonus: 0 },
    }

    const entries = await composeFromChanges(changes, source)

    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      type: 'characteristic.increase',
      xpDelta: -30,
      data: {
        characteristicId: 'brawn',
        oldValue: 2,
        newValue: 3,
        cost: 30,
      },
    })
  })

  test('does not create xp.spend when characteristic increase also changes spent', async () => {
    const changes = {
      system: {
        characteristics: {
          brawn: {
            rank: { trained: 1 },
          },
        },
        progression: {
          experience: {
            spent: 30,
          },
        },
      },
    }

    const source = defaultSource()
    source.system.characteristics.brawn = {
      rank: { base: 2, trained: 0, bonus: 0 },
    }
    source.system.progression.experience = {
      spent: 0,
      gained: 200,
      available: 200,
      total: 200,
    }

    const entries = await composeFromChanges(changes, source)

    expect(entries).toHaveLength(1)
    expect(entries[0].type).toBe('characteristic.increase')
    expect(entries.find((e) => e.type.startsWith('xp.'))).toBeUndefined()
  })
})

/* ============================================ */
/*  XP changes                                  */
/* ============================================ */

describe('XP changes', () => {
  test('creates xp.spend entry for pure spent increase', async () => {
    const changes = {
      system: {
        progression: {
          experience: {
            spent: 75,
          },
        },
      },
    }

    const source = defaultSource()
    source.system.progression.experience = {
      spent: 50,
      gained: 200,
      available: 150,
      total: 200,
    }

    const entries = await composeFromChanges(changes, source)

    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      type: 'xp.spend',
      xpDelta: -25,
      data: {
        amount: 25,
        oldSpent: 50,
        newSpent: 75,
      },
    })
  })

  test('creates xp.refund entry for pure spent decrease', async () => {
    const changes = {
      system: {
        progression: {
          experience: {
            spent: 30,
          },
        },
      },
    }

    const source = defaultSource()
    source.system.progression.experience = {
      spent: 50,
      gained: 200,
      available: 150,
      total: 200,
    }

    const entries = await composeFromChanges(changes, source)

    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      type: 'xp.refund',
      xpDelta: 20,
      data: {
        amount: 20,
        oldSpent: 50,
        newSpent: 30,
      },
    })
  })

  test('creates xp.grant entry for gained increase', async () => {
    const changes = {
      system: {
        progression: {
          experience: {
            gained: 250,
          },
        },
      },
    }

    const source = defaultSource()
    source.system.progression.experience = {
      spent: 50,
      gained: 200,
      available: 150,
      total: 200,
    }

    const entries = await composeFromChanges(changes, source)

    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      type: 'xp.grant',
      xpDelta: 50,
      data: {
        amount: 50,
        oldGained: 200,
        newGained: 250,
      },
    })
  })

  test('creates xp.remove when gained decreases, not xp.grant with negative amount', async () => {
    const changes = {
      system: {
        progression: {
          experience: {
            gained: 150,
          },
        },
      },
    }

    const source = defaultSource()
    source.system.progression.experience = {
      spent: 50,
      gained: 200,
      available: 150,
      total: 200,
    }

    const entries = await composeFromChanges(changes, source)

    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      type: 'xp.remove',
      xpDelta: -50,
      data: {
        amount: 50,
        oldGained: 200,
        newGained: 150,
      },
    })

    expect(entries[0].type).not.toBe('xp.grant')
    expect(entries[0].data.amount).toBeGreaterThan(0)
  })

  test('returns empty when XP value is unchanged', async () => {
    const changes = {
      system: {
        progression: {
          experience: {
            spent: 50,
          },
        },
      },
    }

    const source = defaultSource()
    source.system.progression.experience = {
      spent: 50,
      gained: 200,
      available: 150,
      total: 200,
    }

    const entries = await composeFromChanges(changes, source)

    expect(entries).toEqual([])
  })

  test('does not create xp entry when skill change also updates experience.spent', async () => {
    const changes = {
      system: {
        skills: {
          cool: {
            rank: { trained: 1 },
          },
        },
        progression: {
          experience: {
            spent: 5,
          },
        },
      },
    }

    const source = defaultSource()
    source.system.skills.cool = {
      rank: {
        base: 0,
        careerFree: 0,
        specializationFree: 0,
        trained: 0,
      },
    }
    source.system.details.career = {
      name: 'Explorer',
      careerSkills: ['cool'],
    }
    source.system.progression.experience = {
      spent: 0,
      gained: 100,
      available: 100,
      total: 100,
    }

    const entries = await composeFromChanges(changes, source)

    expect(entries).toHaveLength(1)
    expect(entries[0].type).toBe('skill.train')
    expect(entries[0].data.cost).toBe(5)

    expect(entries.find((e) => e.type.startsWith('xp.'))).toBeUndefined()
  })
})

/* ============================================ */
/*  Detail changes                              */
/* ============================================ */

describe('detail changes', () => {
  test('creates species.set entry', async () => {
    const changes = {
      system: {
        details: {
          species: {
            name: 'Human',
          },
        },
      },
    }

    const source = defaultSource()
    source.system.details.species = null

    const entries = await composeFromChanges(changes, source)

    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      type: 'species.set',
      xpDelta: 0,
      data: {
        oldSpecies: null,
        newSpecies: 'Human',
      },
    })
  })

  test('creates career.set entry', async () => {
    const changes = {
      system: {
        details: {
          career: {
            name: 'Mercenary',
          },
        },
      },
    }

    const source = defaultSource()
    source.system.details.career = null

    const entries = await composeFromChanges(changes, source)

    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      type: 'career.set',
      xpDelta: 0,
      data: {
        oldCareer: null,
        newCareer: 'Mercenary',
      },
    })
  })

  test('detects specialization.add on real addition', async () => {
    const changes = {
      system: {
        details: {
          specializations: {
            spec1: {
              name: 'Bodyguard',
            },
          },
        },
      },
    }

    const source = defaultSource()
    source.system.details.specializations = {}

    const entries = await composeFromChanges(changes, source)
    const addEntries = entries.filter((e) => e.type === 'specialization.add')

    expect(addEntries).toHaveLength(1)
    expect(addEntries[0]).toMatchObject({
      type: 'specialization.add',
      xpDelta: 0,
      data: {
        specializationId: 'spec1',
      },
    })
  })

  test('does not detect specialization.add for internal specialization update', async () => {
    const changes = {
      system: {
        details: {
          specializations: {
            spec1: {
              name: 'Bodyguard Updated',
            },
          },
        },
      },
    }

    const source = defaultSource()
    source.system.details.specializations = {
      spec1: {
        name: 'Bodyguard',
      },
    }

    const entries = await composeFromChanges(changes, source)
    const addEntries = entries.filter((e) => e.type === 'specialization.add')

    expect(addEntries).toHaveLength(0)
  })

  test('detects specialization.remove from -= key', async () => {
    const changes = {
      system: {
        details: {
          specializations: {
            '-=spec1': null,
          },
        },
      },
    }

    const source = defaultSource()
    source.system.details.specializations = {
      spec1: {
        name: 'Bodyguard',
      },
    }

    const entries = await composeFromChanges(changes, source)
    const removeEntries = entries.filter((e) => e.type === 'specialization.remove')

    expect(removeEntries).toHaveLength(1)
    expect(removeEntries[0]).toMatchObject({
      type: 'specialization.remove',
      xpDelta: 0,
      data: {
        specializationId: 'spec1',
      },
    })
  })

  test('creates species.set entry when clearing species', async () => {
    const changes = {
      system: {
        details: {
          species: null,
        },
      },
    }

    const source = defaultSource()
    source.system.details.species = { name: 'Human' }

    const entries = await composeFromChanges(changes, source)

    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      type: 'species.set',
      xpDelta: 0,
      data: {
        oldSpecies: 'Human',
        newSpecies: null,
      },
    })
  })

  test('creates career.set entry when clearing career', async () => {
    const changes = {
      system: {
        details: {
          career: null,
        },
      },
    }

    const source = defaultSource()
    source.system.details.career = { name: 'Mercenary' }

    const entries = await composeFromChanges(changes, source)

    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      type: 'career.set',
      xpDelta: 0,
      data: {
        oldCareer: 'Mercenary',
        newCareer: null,
      },
    })
  })

  test('detects specialization.add with unnormalized key', async () => {
    const changes = {
      system: {
        details: {
          specializations: {
            'my spec!': {
              name: 'Bodyguard',
            },
          },
        },
      },
    }

    const source = defaultSource()

    const entries = await composeFromChanges(changes, source)
    const addEntries = entries.filter((e) => e.type === 'specialization.add')

    expect(addEntries).toHaveLength(1)
    expect(addEntries[0]).toMatchObject({
      type: 'specialization.add',
      xpDelta: 0,
      data: {
        specializationId: 'my spec!',
      },
    })
  })

  test('returns empty when details values are unchanged', async () => {
    const changes = {
      system: {
        details: {
          species: {
            name: 'Human',
          },
          career: {
            name: 'Mercenary',
          },
        },
      },
    }

    const source = defaultSource()
    source.system.details.species = { name: 'Human' }
    source.system.details.career = { name: 'Mercenary' }

    const entries = await composeFromChanges(changes, source)

    expect(entries).toEqual([])
  })
})

/* ============================================ */
/*  Advancement changes                         */
/* ============================================ */

describe('advancement changes', () => {
  test('creates advancement.level entry', async () => {
    const changes = {
      system: {
        advancement: {
          level: 2,
        },
      },
    }

    const source = defaultSource()
    source.system.advancement = {
      level: 1,
    }

    const entries = await composeFromChanges(changes, source)

    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      type: 'advancement.level',
      xpDelta: 0,
      data: {
        oldLevel: 1,
        newLevel: 2,
      },
    })
  })

  test('returns empty when advancement level is unchanged', async () => {
    const changes = {
      system: {
        advancement: {
          level: 1,
        },
      },
    }

    const source = defaultSource()
    source.system.advancement = {
      level: 1,
    }

    const entries = await composeFromChanges(changes, source)

    expect(entries).toEqual([])
  })
})

/* ============================================ */
/*  composeEntries — intégration                */
/* ============================================ */

describe('composeEntries', () => {
  test('returns empty array for empty changes', async () => {
    const { composeEntries } = await import('../../module/utils/audit-diff.mjs')

    const actor = makeActor({})
    const entries = composeEntries({}, {}, actor, 'user-1')

    expect(entries).toEqual([])
  })

  test('returns empty array for non-system changes', async () => {
    const { composeEntries } = await import('../../module/utils/audit-diff.mjs')

    const actor = makeActor({})
    const entries = composeEntries({}, { flags: {} }, actor, 'user-1')

    expect(entries).toEqual([])
  })

  test('handles unknown user gracefully', async () => {
    const changes = {
      system: {
        skills: {
          cool: {
            rank: { trained: 1 },
          },
        },
      },
    }

    const source = defaultSource()
    source.system.skills.cool = {
      rank: {
        base: 0,
        careerFree: 0,
        specializationFree: 0,
        trained: 0,
      },
    }

    const entries = await composeFromChanges(changes, source, 'nonexistent-user')

    expect(entries).toHaveLength(1)
    expect(entries[0].userName).toBe('Unknown')
    expect(entries[0].userId).toBe('nonexistent-user')
  })

  test('accepts flat Foundry diff via expandObject', async () => {
    const { composeEntries } = await import('../../module/utils/audit-diff.mjs')

    const source = defaultSource()
    source.system.skills.cool = {
      rank: {
        base: 0,
        careerFree: 0,
        specializationFree: 0,
        trained: 0,
      },
    }
    source.system.details.career = {
      name: 'Explorer',
      careerSkills: ['cool'],
    }

    const flatChanges = {
      'system.skills.cool.rank.trained': 1,
    }

    const expandedChanges = foundry.utils.expandObject(flatChanges)
    const oldState = makeOldState(expandedChanges, source)
    const newSystem = applyChangesToSystem(source.system, expandedChanges)
    const actor = makeActor(newSystem)

    const entries = composeEntries(oldState, flatChanges, actor, 'user-1')

    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      type: 'skill.train',
      xpDelta: -5,
      data: {
        skillId: 'cool',
        oldRank: 0,
        newRank: 1,
        cost: 5,
        isCareer: true,
      },
    })
  })

  test('returns [] when analysis fails', async () => {
    const { composeEntries } = await import('../../module/utils/audit-diff.mjs')

    const originalExpandObject = foundry.utils.expandObject

    foundry.utils.expandObject = vi.fn(() => {
      throw new Error('boom')
    })

    const actor = makeActor(defaultSource().system)
    const entries = composeEntries({}, { system: { skills: {} } }, actor, 'user-1')

    expect(entries).toEqual([])

    foundry.utils.expandObject = originalExpandObject
  })
})

/* ============================================ */
/*  inferIsCareer / getCareerSkillIds           */
/* ============================================ */

describe('inferIsCareer', () => {
  test('returns true when skill is in career careerSkills', async () => {
    const { inferIsCareer } = await import('../../module/utils/audit-diff.mjs')

    const actor = makeActor({
      skills: {},
      details: {
        career: {
          name: 'Explorer',
          careerSkills: ['cool'],
        },
        specializations: {},
      },
    })

    expect(inferIsCareer('cool', {}, actor)).toBe(true)
  })

  test('returns true when skill is in specialization careerSkills', async () => {
    const { inferIsCareer } = await import('../../module/utils/audit-diff.mjs')

    const actor = makeActor({
      skills: {},
      details: {
        career: {
          name: 'Explorer',
          careerSkills: [],
        },
        specializations: {
          ambassador: {
            name: 'Ambassador',
            careerSkills: ['charm'],
          },
        },
      },
    })

    expect(inferIsCareer('charm', {}, actor)).toBe(true)
  })

  test('returns false when skill is not in career or specialization skills', async () => {
    const { inferIsCareer } = await import('../../module/utils/audit-diff.mjs')

    const actor = makeActor({
      skills: {},
      details: {
        career: {
          name: 'Explorer',
          careerSkills: ['athletics'],
        },
        specializations: {
          ambassador: {
            name: 'Ambassador',
            careerSkills: ['charm'],
          },
        },
      },
    })

    expect(inferIsCareer('cool', {}, actor)).toBe(false)
  })
})

describe('getCareerSkillIds', () => {
  test('collects career and specialization career skills', async () => {
    const { getCareerSkillIds } = await import('../../module/utils/audit-diff.mjs')

    const actor = makeActor({
      details: {
        career: {
          name: 'Explorer',
          careerSkills: ['cool', { id: 'athletics' }],
        },
        specializations: {
          ambassador: {
            careerSkills: ['charm', { id: 'negotiation' }],
          },
        },
      },
    })

    expect([...getCareerSkillIds(actor)].sort()).toEqual(['athletics', 'charm', 'cool', 'negotiation'])
  })
})
