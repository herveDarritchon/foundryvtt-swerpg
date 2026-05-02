/**
 * Calculate the cost for the next skill rank based on FFG Edge of the Empire rules.
 * Career skills: nextRank * 5 XP
 * Non-career skills: nextRank * 5 XP + 5 XP
 * @param {Object} params
 * @param {number} params.rank - Current skill rank
 * @param {boolean} params.isCareer - Whether the skill is a career skill
 * @param {number} [params.maxRank=5] - Maximum rank allowed
 * @returns {number|null} - Cost for next rank, or null if max rank reached
 */
export function getSkillNextRankCost({ rank, isCareer, maxRank = 5 }) {
  const nextRank = rank + 1

  if (nextRank > maxRank) {
    return null
  }

  const baseCost = nextRank * 5
  return isCareer ? baseCost : baseCost + 5
}

/**
 * Determine the purchase state for a skill
 * @param {Object} params
 * @param {number} params.rank - Current skill rank
 * @param {boolean} params.isCareer - Whether the skill is a career skill
 * @param {boolean} params.isSpecialization - Whether the skill is a specialization skill
 * @param {number} params.availableXp - Available XP
 * @param {number} params.freeCareerSkillsLeft - Number of free career skills left
 * @param {number} params.freeSpecializationSkillsLeft - Number of free specialization skills left
 * @param {number} [params.maxRank=5] - Maximum rank allowed
 * @returns {Object} Purchase state
 */
export function getSkillPurchaseState({
  rank,
  isCareer,
  isSpecialization,
  availableXp,
  freeCareerSkillsLeft,
  freeSpecializationSkillsLeft,
  maxRank = 5,
}) {
  const nextRank = rank + 1
  const nextCost = getSkillNextRankCost({ rank, isCareer, maxRank })

  if (nextCost === null) {
    return {
      canPurchase: false,
      isFreePurchase: false,
      reason: 'MAX_RANK',
      nextRank,
      nextCost: null,
    }
  }

  const canUseCareerFreeRank = isCareer && freeCareerSkillsLeft > 0 && rank === 0
  const canUseSpecializationFreeRank =
    isSpecialization && freeSpecializationSkillsLeft > 0 && rank === 0

  if (canUseCareerFreeRank || canUseSpecializationFreeRank) {
    return {
      canPurchase: true,
      isFreePurchase: true,
      reason: 'FREE_RANK_AVAILABLE',
      nextRank,
      nextCost: 0,
    }
  }

  if (availableXp >= nextCost) {
    return {
      canPurchase: true,
      isFreePurchase: false,
      reason: 'AFFORDABLE',
      nextRank,
      nextCost,
    }
  }

  return {
    canPurchase: false,
    isFreePurchase: false,
    reason: 'INSUFFICIENT_XP',
    nextRank,
    nextCost,
  }
}

/**
 * Calculate the positive dice pool preview based on characteristic value and skill rank
 * @param {Object} params
 * @param {number} params.characteristicValue - The characteristic value
 * @param {number} params.skillRank - The skill rank
 * @returns {Object} Dice pool with ability and proficiency dice counts
 */
export function getPositiveDicePoolPreview({ characteristicValue, skillRank }) {
  const totalDice = Math.max(characteristicValue, skillRank)
  const proficiencyDice = Math.min(characteristicValue, skillRank)
  const abilityDice = totalDice - proficiencyDice

  return {
    ability: abilityDice,
    proficiency: proficiencyDice,
  }
}
