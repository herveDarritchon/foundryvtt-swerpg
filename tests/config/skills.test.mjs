import { describe, test, expect } from 'vitest'
import { MAX_RANK_AT_CREATION, MAX_RANK, RANKS, RANK_IDS, CATEGORIES, SKILLS } from '../../module/config/skills.mjs'
import { SYSTEM } from '../../module/config/system.mjs'

describe('Skills config — rank limit constants', () => {
  test('MAX_RANK_AT_CREATION is 2 (contractual lock)', () => {
    expect(MAX_RANK_AT_CREATION).toBe(2)
  })

  test('MAX_RANK is 5 (contractual lock)', () => {
    expect(MAX_RANK).toBe(5)
  })

  test('MAX_RANK_AT_CREATION is strictly less than MAX_RANK', () => {
    expect(MAX_RANK_AT_CREATION).toBeLessThan(MAX_RANK)
  })
})

describe('Skills config — RANKS registry (ADR-0018)', () => {
  test('RANKS is an object with numeric keys 0 through 5', () => {
    for (let i = 0; i <= 5; i++) {
      expect(RANKS).toHaveProperty(String(i))
    }
  })

  test('each RANKS entry has required fields: id, rank, label, description, cost, spent, bonus, path', () => {
    const required = ['id', 'rank', 'label', 'description', 'cost', 'spent', 'bonus', 'path']
    for (const entry of Object.values(RANKS)) {
      for (const field of required) {
        expect(entry).toHaveProperty(field)
      }
    }
  })

  test('RANKS[0] is untrained with rank 0 and no cost', () => {
    expect(RANKS[0].id).toBe('untrained')
    expect(RANKS[0].rank).toBe(0)
    expect(RANKS[0].cost).toBe(0)
    expect(RANKS[0].spent).toBe(0)
  })

  test('RANKS[5] is master — the maximum rank', () => {
    expect(RANKS[5].id).toBe('master')
    expect(RANKS[5].rank).toBe(MAX_RANK)
  })

  test('RANKS ranks are non-negative integers in ascending order', () => {
    const ranks = Object.values(RANKS).map((r) => r.rank)
    for (let i = 0; i < ranks.length; i++) {
      expect(ranks[i]).toBe(i)
    }
  })

  test('RANKS is exposed on SYSTEM.SKILL.RANKS', () => {
    expect(SYSTEM.SKILL.RANKS).toBe(RANKS)
  })
})

describe('Skills config — RANK_IDS registry (ADR-0018)', () => {
  test('RANK_IDS is frozen', () => {
    expect(Object.isFrozen(RANK_IDS)).toBe(true)
  })

  test('RANK_IDS maps all rank labels to their numeric value', () => {
    expect(RANK_IDS.untrained).toBe(0)
    expect(RANK_IDS.novice).toBe(1)
    expect(RANK_IDS.apprentice).toBe(2)
    expect(RANK_IDS.specialist).toBe(3)
    expect(RANK_IDS.adept).toBe(4)
    expect(RANK_IDS.master).toBe(5)
  })

  test('RANK_IDS is consistent with RANKS ids (bijection check)', () => {
    for (const [id, rank] of Object.entries(RANK_IDS)) {
      expect(RANKS[rank].id).toBe(id)
    }
  })

  test('RANK_IDS is exposed on SYSTEM.SKILL.RANK_IDS', () => {
    expect(SYSTEM.SKILL.RANK_IDS).toBe(RANK_IDS)
  })
})

describe('Skills config — CATEGORIES registry (ADR-0018)', () => {
  test('CATEGORIES defines exp, kno, soc', () => {
    expect(CATEGORIES).toHaveProperty('exp')
    expect(CATEGORIES).toHaveProperty('kno')
    expect(CATEGORIES).toHaveProperty('soc')
  })

  test('each category has label, hint, defaultIcon', () => {
    for (const cat of Object.values(CATEGORIES)) {
      expect(cat).toHaveProperty('label')
      expect(cat).toHaveProperty('hint')
      expect(cat).toHaveProperty('defaultIcon')
    }
  })

  test('CATEGORIES is exposed on SYSTEM.SKILL.CATEGORIES', () => {
    expect(SYSTEM.SKILL.CATEGORIES).toBe(CATEGORIES)
  })
})

describe('Skills config — SKILLS registry (ADR-0018)', () => {
  test('SKILLS is non-empty', () => {
    expect(Object.keys(SKILLS).length).toBeGreaterThan(0)
  })

  test('each SKILLS entry has id, category, characteristics', () => {
    for (const skill of Object.values(SKILLS)) {
      expect(skill).toHaveProperty('id')
      expect(skill).toHaveProperty('category')
      expect(skill).toHaveProperty('characteristics')
      expect(Array.isArray(skill.characteristics)).toBe(true)
    }
  })

  test('each skill id matches its registry key', () => {
    for (const [key, skill] of Object.entries(SKILLS)) {
      expect(skill.id).toBe(key)
    }
  })

  test('each skill category is a key of CATEGORIES', () => {
    for (const skill of Object.values(SKILLS)) {
      expect(CATEGORIES).toHaveProperty(skill.category)
    }
  })

  test('SKILLS is exposed on SYSTEM.SKILL.SKILLS', () => {
    expect(SYSTEM.SKILL.SKILLS).toBe(SKILLS)
  })
})
