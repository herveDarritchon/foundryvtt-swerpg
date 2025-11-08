/**
 * Create a characteristic object to be used in tests
 * @param id.id
 * @param id
 * @param base
 * @param trained
 * @param value
 * @param id.base
 * @param id.trained
 * @param id.value
 * @returns {{id: string, rank: {base: number, trained: number, value: number}}}
 */
export function createCharacteristicData({ id = 'characteristic-id', base = 1, trained = 0, value = 1 } = {}) {
  return {
    id: id,
    rank: {
      base: base,
      trained: trained,
      value: value,
    },
  }
}
