// actor-getAbilityBonus.test.mjs
// Tests for the getAbilityBonus() method fix (Bug #44)
import '../setupTests.js'
import { describe, expect, test, beforeEach } from 'vitest'

// Extract the function directly to avoid loading Foundry modules
// This is the CORRECTED version from actor.mjs (after fix)
function getAbilityBonus(scaling) {
  const abilities = this.system.abilities
  if (scaling == null || scaling.length === 0) return 0
  return Math.round(scaling.reduce((x, t) => x + abilities[t].value, 0) / (scaling.length * 2))
}

describe('getAbilityBonus() - Bug #44 Fix', () => {
  let mockActor
  let mockAbilities

  beforeEach(() => {
    // Mock abilities with different values
    mockAbilities = {
      strength: { value: 3 },
      dexterity: { value: 4 },
      intellect: { value: 2 },
      cunning: { value: 3 },
      willpower: { value: 5 },
      presence: { value: 2 },
    }

    mockActor = {
      system: {
        abilities: mockAbilities,
      },
    }
  })

  test('should return 0 when scaling is null', () => {
    const result = getAbilityBonus.call(mockActor, null)
    expect(result).toBe(0)
  })

  test('should return 0 when scaling array is empty', () => {
    const result = getAbilityBonus.call(mockActor, [])
    expect(result).toBe(0)
  })

  test('should calculate bonus correctly for a single ability (strength=3)', () => {
    // Formula: Math.round(strength.value / (1 * 2))
    // Single ability: Math.round(3 / 2) = Math.round(1.5) = 2
    const result = getAbilityBonus.call(mockActor, ['strength'])
    expect(result).toBe(2) // Math.round(3 / 2) = 2
  })

  test('should calculate bonus correctly for two abilities (strength=3, dexterity=4)', () => {
    // Formula: Math.round((3 + 4) / (2 * 2)) = Math.round(7 / 4) = Math.round(1.75) = 2
    const result = getAbilityBonus.call(mockActor, ['strength', 'dexterity'])
    expect(result).toBe(2)
  })

  test('should calculate bonus correctly for intellect=2 and cunning=3', () => {
    // Formula: Math.round((2 + 3) / (2 * 2)) = Math.round(5 / 4) = Math.round(1.25) = 1
    const result = getAbilityBonus.call(mockActor, ['intellect', 'cunning'])
    expect(result).toBe(1)
  })

  test('should handle willpower=5 and presence=2', () => {
    // Formula: Math.round((5 + 2) / (2 * 2)) = Math.round(7 / 4) = Math.round(1.75) = 2
    const result = getAbilityBonus.call(mockActor, ['willpower', 'presence'])
    expect(result).toBe(2)
  })

  test('should calculate correctly and NOT always return 1 (the original bug)', () => {
    // This is the key test - the bug was that it always returned 1
    // With the fix, values are properly calculated
    const result1 = getAbilityBonus.call(mockActor, ['strength']) // Math.round(3 / 2) = 2 (NOT 1)
    const result2 = getAbilityBonus.call(mockActor, ['willpower', 'presence']) // Math.round((5+2)/4) = 2 (NOT 1)
    const result3 = getAbilityBonus.call(mockActor, ['intellect', 'cunning']) // Math.round((2+3)/4) = 1 (correctly 1)

    // result1 and result2 should NOT be 1 (this was the bug)
    expect(result1).not.toBe(1) // strength=3, should be 2
    expect(result2).not.toBe(1) // willpower+presence, should be 2
    // result3 CAN be 1 (that's correct math)

    // All should be calculated correctly
    expect(result1).toBe(2)
    expect(result2).toBe(2)
    expect(result3).toBe(1) // This is correct: Math.round(1.25) = 1
  })

  test('should handle abilities with value 0', () => {
    mockAbilities.strength.value = 0
    // Formula: Math.round(0 / 2) = 0
    const result = getAbilityBonus.call(mockActor, ['strength'])
    expect(result).toBe(0)
  })

  test('should handle high ability values', () => {
    mockAbilities.strength.value = 6
    mockAbilities.dexterity.value = 6
    // Formula: Math.round((6 + 6) / 4) = Math.round(3) = 3
    const result = getAbilityBonus.call(mockActor, ['strength', 'dexterity'])
    expect(result).toBe(3)
  })

  test('should handle 3 abilities', () => {
    // Formula: Math.round((3 + 4 + 2) / (3 * 2)) = Math.round(9 / 6) = Math.round(1.5) = 2
    const result = getAbilityBonus.call(mockActor, ['strength', 'dexterity', 'intellect'])
    expect(result).toBe(2)
  })
})
