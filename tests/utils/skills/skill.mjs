/**
 * create a skill object to be used in tests
 * @param id
 * @param base
 * @param careerFree
 * @param specializationFree
 * @param trained
 * @param value
 * @returns {{id: string, rank: {base: number, careerFree: number, specializationFree: number, trained: number, value: number}}}
 */
export function createSkill(
    {
        id = 'skill-id',
        base = 0,
        careerFree = 0,
        specializationFree = 0,
        trained = 0,
        value = 0
    } = {}
) {
    return {
        "id": id,
        "rank": {
            "base": base,
            "careerFree": careerFree,
            "specializationFree": specializationFree,
            "trained": trained,
            "value": value,
        }
    }
}