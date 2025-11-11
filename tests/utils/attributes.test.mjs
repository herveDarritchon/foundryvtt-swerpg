import { describe, test, expect } from 'vitest'
import { shiftValue } from '../../module/utils/attributes.mjs'

describe('Attributes Utils', () => {
  describe('shiftValue function', () => {
    describe('Basic increment/decrement operations', () => {
      test('should increment value by positive step', () => {
        expect(shiftValue(5, 3)).toBe(8)
        expect(shiftValue(0, 1)).toBe(1)
        expect(shiftValue(-5, 10)).toBe(5)
      })

      test('should decrement value by negative step', () => {
        expect(shiftValue(10, -3)).toBe(7)
        expect(shiftValue(5, -5)).toBe(0)
        expect(shiftValue(0, -1)).toBe(-1)
      })

      test('should return same value when step is zero', () => {
        expect(shiftValue(5, 0)).toBe(5)
        expect(shiftValue(0, 0)).toBe(0)
        expect(shiftValue(-3, 0)).toBe(-3)
      })
    })

    describe('Range constraints with min and max', () => {
      test('should respect maximum constraint', () => {
        expect(shiftValue(8, 5, 0, 10)).toBe(10) // 8 + 5 = 13, clamped to 10
        expect(shiftValue(9, 2, 0, 10)).toBe(10) // 9 + 2 = 11, clamped to 10
        expect(shiftValue(10, 1, 0, 10)).toBe(10) // Already at max
      })

      test('should respect minimum constraint', () => {
        expect(shiftValue(2, -5, 0, 10)).toBe(0) // 2 - 5 = -3, clamped to 0
        expect(shiftValue(1, -2, 0, 10)).toBe(0) // 1 - 2 = -1, clamped to 0
        expect(shiftValue(0, -1, 0, 10)).toBe(0) // Already at min
      })

      test('should work within valid range', () => {
        expect(shiftValue(3, 2, 0, 10)).toBe(5) // Within range
        expect(shiftValue(7, -2, 0, 10)).toBe(5) // Within range
        expect(shiftValue(5, 0, 0, 10)).toBe(5) // No change, within range
      })
    })

    describe('Edge cases with extreme values', () => {
      test('should handle very large numbers', () => {
        const largeNumber = Number.MAX_SAFE_INTEGER - 1000
        expect(shiftValue(largeNumber, 500, 0, Number.MAX_SAFE_INTEGER)).toBe(largeNumber + 500)
      })

      test('should handle very small numbers', () => {
        const smallNumber = Number.MIN_SAFE_INTEGER + 1000
        expect(shiftValue(smallNumber, -500, Number.MIN_SAFE_INTEGER, 0)).toBe(smallNumber - 500)
      })

      test('should clamp to max when result exceeds Number.MAX_SAFE_INTEGER', () => {
        const result = shiftValue(Number.MAX_SAFE_INTEGER - 1, 2, 0, Number.MAX_SAFE_INTEGER)
        expect(result).toBe(Number.MAX_SAFE_INTEGER)
      })

      test('should clamp to min when result is below Number.MIN_SAFE_INTEGER', () => {
        const result = shiftValue(Number.MIN_SAFE_INTEGER + 1, -2, Number.MIN_SAFE_INTEGER, 0)
        expect(result).toBe(Number.MIN_SAFE_INTEGER)
      })
    })

    describe('Default parameter behavior', () => {
      test('should use default min and max when not provided', () => {
        // Should not be constrained by default min/max for normal values
        expect(shiftValue(0, 100)).toBe(100)
        expect(shiftValue(1000, -500)).toBe(500)
      })

      test('should use Number.MAX_SAFE_INTEGER as default max', () => {
        // This test ensures the function works with extreme values near MAX_SAFE_INTEGER
        const nearMaxValue = Number.MAX_SAFE_INTEGER - 10
        expect(shiftValue(nearMaxValue, 5)).toBe(nearMaxValue + 5)
      })

      test('should use Number.MIN_SAFE_INTEGER as default min', () => {
        // This test ensures the function works with extreme values near MIN_SAFE_INTEGER
        const nearMinValue = Number.MIN_SAFE_INTEGER + 10
        expect(shiftValue(nearMinValue, -5)).toBe(nearMinValue - 5)
      })
    })

    describe('Fractional and floating-point numbers', () => {
      test('should handle fractional increments correctly', () => {
        expect(shiftValue(2.5, 1.3, 0, 10)).toBeCloseTo(3.8)
        expect(shiftValue(7.8, -2.1, 0, 10)).toBeCloseTo(5.7)
      })

      test('should handle floating-point precision issues gracefully', () => {
        expect(shiftValue(0.1, 0.2, 0, 1)).toBeCloseTo(0.3)
        expect(shiftValue(1, -0.1, 0, 1)).toBeCloseTo(0.9)
      })

      test('should clamp fractional results to bounds', () => {
        expect(shiftValue(9.8, 0.5, 0, 10)).toBe(10)
        expect(shiftValue(0.2, -0.5, 0, 10)).toBe(0)
      })
    })

    describe('Negative ranges', () => {
      test('should work correctly with negative min and max values', () => {
        expect(shiftValue(-5, 2, -10, -1)).toBe(-3)
        expect(shiftValue(-8, 3, -10, -1)).toBe(-5)
        expect(shiftValue(-2, 2, -10, -1)).toBe(-1) // Clamped to max
        expect(shiftValue(-9, -2, -10, -1)).toBe(-10) // Clamped to min
      })
    })

    describe('Zero and boundary value scenarios', () => {
      test('should handle zero initial value correctly', () => {
        expect(shiftValue(0, 5, -5, 5)).toBe(5)
        expect(shiftValue(0, -3, -5, 5)).toBe(-3)
        expect(shiftValue(0, 10, -5, 5)).toBe(5) // Clamped to max
        expect(shiftValue(0, -10, -5, 5)).toBe(-5) // Clamped to min
      })

      test('should handle boundary values as initial values', () => {
        // Starting at max boundary
        expect(shiftValue(10, 1, 0, 10)).toBe(10)
        expect(shiftValue(10, -1, 0, 10)).toBe(9)
        
        // Starting at min boundary
        expect(shiftValue(0, -1, 0, 10)).toBe(0)
        expect(shiftValue(0, 1, 0, 10)).toBe(1)
      })
    })

    describe('Invalid input handling', () => {
      test('should handle NaN inputs gracefully', () => {
        // When initialValue is NaN, result should be NaN
        expect(shiftValue(Number.NaN, 5)).toBeNaN()
        
        // When step is NaN, result should be NaN
        expect(shiftValue(5, Number.NaN)).toBeNaN()
      })

      test('should handle Infinity inputs', () => {
        expect(shiftValue(Number.POSITIVE_INFINITY, 5, 0, 100)).toBe(100)
        expect(shiftValue(5, Number.POSITIVE_INFINITY, 0, 100)).toBe(100)
        expect(shiftValue(5, Number.NEGATIVE_INFINITY, 0, 100)).toBe(0)
      })

      test('should handle when min is greater than max', () => {
        // This is an edge case - behavior might be undefined, but we test current behavior
        const result = shiftValue(5, 2, 10, 0) // min > max
        // The Math.min(Math.max(...)) pattern should still work
        expect(result).toBe(0) // Math.min(Math.max(7, 10), 0) = Math.min(10, 0) = 0
      })
    })
  })
})