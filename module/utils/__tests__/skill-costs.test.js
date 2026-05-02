import { describe, expect, it } from 'vitest'

import { getSkillNextRankCost, getSkillPurchaseState, getPositiveDicePoolPreview } from '../skill-costs.mjs'

describe('getSkillNextRankCost tests', () => {
  describe('career skills should', () => {
    it('cost 5 XP from rank 0 to 1', () => {
      expect(getSkillNextRankCost({ rank: 0, isCareer: true })).toBe(5)
    })
    it('cost 10 XP from rank 1 to 2', () => {
      expect(getSkillNextRankCost({ rank: 1, isCareer: true })).toBe(10)
    })
    it('cost 15 XP from rank 2 to 3', () => {
      expect(getSkillNextRankCost({ rank: 2, isCareer: true })).toBe(15)
    })
  })

  describe('non-career skills should', () => {
    it('cost 10 XP from rank 0 to 1', () => {
      expect(getSkillNextRankCost({ rank: 0, isCareer: false })).toBe(10)
    })
    it('cost 15 XP from rank 1 to 2', () => {
      expect(getSkillNextRankCost({ rank: 1, isCareer: false })).toBe(15)
    })
    it('cost 20 XP from rank 2 to 3', () => {
      expect(getSkillNextRankCost({ rank: 2, isCareer: false })).toBe(20)
    })
  })

  describe('max rank should', () => {
    it('return null when at max rank (5)', () => {
      expect(getSkillNextRankCost({ rank: 5, isCareer: true })).toBeNull()
    })
    it('return null when above max rank', () => {
      expect(getSkillNextRankCost({ rank: 6, isCareer: true })).toBeNull()
    })
    it('respect custom maxRank', () => {
      expect(getSkillNextRankCost({ rank: 3, isCareer: true, maxRank: 3 })).toBeNull()
    })
  })
})

describe('getSkillPurchaseState tests', () => {
  describe('free career skill should', () => {
    it('be available at rank 0 with free career skills left', () => {
      const state = getSkillPurchaseState({
        rank: 0,
        isCareer: true,
        isSpecialization: false,
        availableXp: 0,
        freeCareerSkillsLeft: 1,
        freeSpecializationSkillsLeft: 0,
      })
      expect(state.canPurchase).toBe(true)
      expect(state.isFreePurchase).toBe(true)
      expect(state.reason).toBe('FREE_RANK_AVAILABLE')
      expect(state.nextCost).toBe(0)
    })
    it('not be free if rank > 0', () => {
      const state = getSkillPurchaseState({
        rank: 1,
        isCareer: true,
        isSpecialization: false,
        availableXp: 10,
        freeCareerSkillsLeft: 1,
        freeSpecializationSkillsLeft: 0,
      })
      expect(state.isFreePurchase).toBe(false)
      expect(state.nextCost).toBe(10)
    })
  })

  describe('free specialization skill should', () => {
    it('be available at rank 0 with free specialization skills left', () => {
      const state = getSkillPurchaseState({
        rank: 0,
        isCareer: false,
        isSpecialization: true,
        availableXp: 0,
        freeCareerSkillsLeft: 0,
        freeSpecializationSkillsLeft: 1,
      })
      expect(state.canPurchase).toBe(true)
      expect(state.isFreePurchase).toBe(true)
      expect(state.reason).toBe('FREE_RANK_AVAILABLE')
    })
  })

  describe('affordable purchase should', () => {
    it('be possible with sufficient XP', () => {
      const state = getSkillPurchaseState({
        rank: 1,
        isCareer: true,
        isSpecialization: false,
        availableXp: 15,
        freeCareerSkillsLeft: 0,
        freeSpecializationSkillsLeft: 0,
      })
      expect(state.canPurchase).toBe(true)
      expect(state.isFreePurchase).toBe(false)
      expect(state.reason).toBe('AFFORDABLE')
      expect(state.nextCost).toBe(10)
    })
  })

  describe('insufficient XP should', () => {
    it('prevent purchase', () => {
      const state = getSkillPurchaseState({
        rank: 1,
        isCareer: false,
        isSpecialization: false,
        availableXp: 5,
        freeCareerSkillsLeft: 0,
        freeSpecializationSkillsLeft: 0,
      })
      expect(state.canPurchase).toBe(false)
      expect(state.reason).toBe('INSUFFICIENT_XP')
    })
  })

  describe('max rank should', () => {
    it('prevent purchase', () => {
      const state = getSkillPurchaseState({
        rank: 5,
        isCareer: true,
        isSpecialization: false,
        availableXp: 100,
        freeCareerSkillsLeft: 0,
        freeSpecializationSkillsLeft: 0,
      })
      expect(state.canPurchase).toBe(false)
      expect(state.reason).toBe('MAX_RANK')
      expect(state.nextCost).toBeNull()
    })
  })
})

describe('getPositiveDicePoolPreview tests', () => {
  describe('characteristic higher than skill should', () => {
    it('return all ability dice', () => {
      const pool = getPositiveDicePoolPreview({ characteristicValue: 3, skillRank: 0 })
      expect(pool.ability).toBe(3)
      expect(pool.proficiency).toBe(0)
    })
    it('return 1 proficiency + 2 ability for Agi 3 + Skill 1', () => {
      const pool = getPositiveDicePoolPreview({ characteristicValue: 3, skillRank: 1 })
      expect(pool.proficiency).toBe(1)
      expect(pool.ability).toBe(2)
    })
  })

  describe('skill higher than characteristic should', () => {
    it('return 2 proficiency + 1 ability for Agi 3 + Skill 4', () => {
      const pool = getPositiveDicePoolPreview({ characteristicValue: 3, skillRank: 4 })
      expect(pool.proficiency).toBe(3)
      expect(pool.ability).toBe(1)
    })
  })

  describe('equal characteristic and skill should', () => {
    it('return all proficiency dice', () => {
      const pool = getPositiveDicePoolPreview({ characteristicValue: 3, skillRank: 3 })
      expect(pool.proficiency).toBe(3)
      expect(pool.ability).toBe(0)
    })
  })
})
