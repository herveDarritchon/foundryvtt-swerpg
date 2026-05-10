export const TEST_SKILL_ID = 'cool'

/**
 * Create a skill object to be used in tests
 * @param id.id
 * @param id
 * @param base
 * @param careerFree
 * @param specializationFree
 * @param trained
 * @param value
 * @param id.base
 * @param id.careerFree
 * @param id.specializationFree
 * @param id.trained
 * @param id.value
 * @returns {{id: string, rank: {base: number, careerFree: number, specializationFree: number, trained: number, value: number}}}
 */
export function createSkillData({ id = TEST_SKILL_ID, base = 0, careerFree = 0, specializationFree = 0, trained = 0, value = 0 } = {}) {
  return {
    id,
    rank: {
      base,
      careerFree,
      specializationFree,
      trained,
      value,
    },
  }
}
