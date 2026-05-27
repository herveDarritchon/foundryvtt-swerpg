import { describe, test, expect } from 'vitest'
import { SLOTS, DEFAULT_SKILL, DEFAULT_RANGE, DEFAULT_RESOURCE, SKILLS, RANGETYPES } from '../../module/config/weapon.mjs'
import { SYSTEM } from '../../module/config/system.mjs'

describe('weapon config — ADR-0018 contractual constants', () => {
  describe('SLOTS', () => {
    test('defines MAINHAND as string key "mainhand"', () => {
      expect(SLOTS.MAINHAND).toBe('mainhand')
    })

    test('defines OFFHAND as string key "offhand"', () => {
      expect(SLOTS.OFFHAND).toBe('offhand')
    })

    test('defines TWOHAND as string key "twohand"', () => {
      expect(SLOTS.TWOHAND).toBe('twohand')
    })

    test('defines EITHER as string key "either"', () => {
      expect(SLOTS.EITHER).toBe('either')
    })

    test('label() returns localization key for a known slot value', () => {
      expect(SLOTS.label(SLOTS.MAINHAND)).toBe('WEAPON.SLOT.Mainhand')
    })

    test('is exposed on SYSTEM.WEAPON.SLOTS', () => {
      expect(SYSTEM.WEAPON.SLOTS).toBe(SLOTS)
    })
  })

  describe('DEFAULT_SKILL', () => {
    test('is a key of SKILLS', () => {
      expect(DEFAULT_SKILL in SKILLS).toBe(true)
    })

    test('equals "rangedLight"', () => {
      expect(DEFAULT_SKILL).toBe('rangedLight')
    })

    test('is exposed on SYSTEM.WEAPON.DEFAULT_SKILL', () => {
      expect(SYSTEM.WEAPON.DEFAULT_SKILL).toBe(DEFAULT_SKILL)
    })
  })

  describe('DEFAULT_RANGE', () => {
    test('is a key of RANGETYPES', () => {
      expect(DEFAULT_RANGE in RANGETYPES).toBe(true)
    })

    test('equals "medium"', () => {
      expect(DEFAULT_RANGE).toBe('medium')
    })

    test('is exposed on SYSTEM.WEAPON.DEFAULT_RANGE', () => {
      expect(SYSTEM.WEAPON.DEFAULT_RANGE).toBe(DEFAULT_RANGE)
    })
  })

  describe('DEFAULT_RESOURCE', () => {
    test('equals "health"', () => {
      expect(DEFAULT_RESOURCE).toBe('health')
    })

    test('is a non-empty string', () => {
      expect(typeof DEFAULT_RESOURCE).toBe('string')
      expect(DEFAULT_RESOURCE.length).toBeGreaterThan(0)
    })

    test('is exposed on SYSTEM.WEAPON.DEFAULT_RESOURCE', () => {
      expect(SYSTEM.WEAPON.DEFAULT_RESOURCE).toBe(DEFAULT_RESOURCE)
    })
  })
})
