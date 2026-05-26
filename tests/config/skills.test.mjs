import { describe, test, expect } from 'vitest'
import { MAX_RANK_AT_CREATION, MAX_RANK } from '../../module/config/skills.mjs'

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
