import { describe, it, expect } from 'vitest'
import { getSkillNextRankCost, getSkillPurchaseState, getPositiveDicePoolPreview } from '../../module/utils/skill-costs.mjs'

describe('getSkillNextRankCost', () => {
  it('should return 5 XP for rank 0 career skill', () => {
    expect(getSkillNextRankCost({ rank: 0, isCareer: true })).toBe(5)
  })

  it('should return 10 XP for rank 1 career skill', () => {
    expect(getSkillNextRankCost({ rank: 1, isCareer: true })).toBe(10)
  })

  it('should return 25 XP for rank 4 career skill', () => {
    expect(getSkillNextRankCost({ rank: 4, isCareer: true })).toBe(25)
  })

  it('should return null when max rank reached (rank 5)', () => {
    expect(getSkillNextRankCost({ rank: 5, isCareer: true })).toBeNull()
  })

  it('should return 10 XP for rank 0 non-career skill (5+5)', () => {
    expect(getSkillNextRankCost({ rank: 0, isCareer: false })).toBe(10)
  })

  it('should return 15 XP for rank 1 non-career skill (10+5)', () => {
    expect(getSkillNextRankCost({ rank: 1, isCareer: false })).toBe(15)
  })

  it('should respect custom maxRank parameter', () => {
    // nextRank = 3, baseCost = 3*5 = 15 (career)
    expect(getSkillNextRankCost({ rank: 2, isCareer: true, maxRank: 3 })).toBe(15)
    expect(getSkillNextRankCost({ rank: 3, isCareer: true, maxRank: 3 })).toBeNull()
  })
})

describe('getPositiveDicePoolPreview', () => {
  it('should return all ability dice when no skill rank (char 3, rank 0)', () => {
    const result = getPositiveDicePoolPreview({ characteristicValue: 3, skillRank: 0 })
    expect(result).toEqual({ ability: 3, proficiency: 0 })
  })

  it('should return all ability dice when characteristic > skill rank (char 4, rank 2)', () => {
    const result = getPositiveDicePoolPreview({ characteristicValue: 4, skillRank: 2 })
    expect(result).toEqual({ ability: 2, proficiency: 2 })
  })

  it('should return correct dice when skill rank > characteristic (char 2, rank 5)', () => {
    // totalDice = max(2,5) = 5, proficiency = min(2,5) = 2, ability = 5-2 = 3
    const result = getPositiveDicePoolPreview({ characteristicValue: 2, skillRank: 5 })
    expect(result).toEqual({ ability: 3, proficiency: 2 })
  })

  it('should return equal ability and proficiency when char equals skill rank (char 3, rank 3)', () => {
    const result = getPositiveDicePoolPreview({ characteristicValue: 3, skillRank: 3 })
    expect(result).toEqual({ ability: 0, proficiency: 3 })
  })

  it('should handle zero characteristic value', () => {
    // totalDice = max(0,2) = 2, proficiency = min(0,2) = 0, ability = 2-0 = 2
    const result = getPositiveDicePoolPreview({ characteristicValue: 0, skillRank: 2 })
    expect(result).toEqual({ ability: 2, proficiency: 0 })
  })

  it('should handle zero skill rank', () => {
    const result = getPositiveDicePoolPreview({ characteristicValue: 3, skillRank: 0 })
    expect(result).toEqual({ ability: 3, proficiency: 0 })
  })

  it('should handle both zero', () => {
    const result = getPositiveDicePoolPreview({ characteristicValue: 0, skillRank: 0 })
    expect(result).toEqual({ ability: 0, proficiency: 0 })
  })
})

describe('getSkillPurchaseState', () => {
  const baseParams = {
    rank: 0,
    isCareer: false,
    isSpecialization: false,
    availableXp: 100,
    freeCareerSkillsLeft: 0,
    freeSpecializationSkillsLeft: 0,
  }

  it('should allow free purchase for career skill at rank 0 when free ranks left', () => {
    const result = getSkillPurchaseState({
      ...baseParams,
      rank: 0,
      isCareer: true,
      freeCareerSkillsLeft: 2,
    })
    expect(result.canPurchase).toBe(true)
    expect(result.isFreePurchase).toBe(true)
    expect(result.reason).toBe('FREE_RANK_AVAILABLE')
    expect(result.nextCost).toBe(0)
  })

  it('should allow free purchase for specialization skill at rank 0 when free ranks left', () => {
    const result = getSkillPurchaseState({
      ...baseParams,
      rank: 0,
      isSpecialization: true,
      freeSpecializationSkillsLeft: 1,
    })
    expect(result.canPurchase).toBe(true)
    expect(result.isFreePurchase).toBe(true)
    expect(result.reason).toBe('FREE_RANK_AVAILABLE')
  })

  it('should allow affordable purchase when XP is sufficient', () => {
    const result = getSkillPurchaseState({
      ...baseParams,
      rank: 0,
      isCareer: false,
      availableXp: 20,
    })
    expect(result.canPurchase).toBe(true)
    expect(result.isFreePurchase).toBe(false)
    expect(result.reason).toBe('AFFORDABLE')
    expect(result.nextCost).toBe(10)
  })

  it('should deny purchase when XP is insufficient', () => {
    const result = getSkillPurchaseState({
      ...baseParams,
      rank: 2,
      isCareer: true,
      availableXp: 5,
    })
    // nextRank = 3, cost = 3*5 = 15 (career)
    expect(result.canPurchase).toBe(false)
    expect(result.isFreePurchase).toBe(false)
    expect(result.reason).toBe('INSUFFICIENT_XP')
    expect(result.nextCost).toBe(15)
  })

  it('should return MAX_RANK when rank is at maximum', () => {
    const result = getSkillPurchaseState({
      ...baseParams,
      rank: 5,
      isCareer: true,
      availableXp: 1000,
    })
    expect(result.canPurchase).toBe(false)
    expect(result.reason).toBe('MAX_RANK')
    expect(result.nextCost).toBeNull()
  })

  it('should prioritize free rank over paid when both available', () => {
    const result = getSkillPurchaseState({
      ...baseParams,
      rank: 0,
      isCareer: true,
      isSpecialization: true,
      freeCareerSkillsLeft: 1,
      freeSpecializationSkillsLeft: 1,
      availableXp: 100,
    })
    expect(result.isFreePurchase).toBe(true)
    expect(result.reason).toBe('FREE_RANK_AVAILABLE')
  })

  it('should not allow free purchase at rank > 0 even with free ranks left', () => {
    const result = getSkillPurchaseState({
      ...baseParams,
      rank: 1,
      isCareer: true,
      freeCareerSkillsLeft: 2,
    })
    expect(result.isFreePurchase).toBe(false)
    expect(result.reason).toBe('AFFORDABLE')
  })

  it('should respect custom maxRank', () => {
    const result = getSkillPurchaseState({
      ...baseParams,
      rank: 3,
      isCareer: true,
      availableXp: 100,
      maxRank: 3,
    })
    expect(result.canPurchase).toBe(false)
    expect(result.reason).toBe('MAX_RANK')
  })
})
