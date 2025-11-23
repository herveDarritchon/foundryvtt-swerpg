import { describe, it, expect, beforeEach } from 'vitest'
import { specializationMapper, mapSpecializationSkills } from '../../module/importer/items/specialization-ogg-dude.mjs'
import { resetSpecializationImportStats, getSpecializationImportStats } from '../../module/importer/utils/specialization-import-utils.mjs'

describe('specializationMapper', () => {
  beforeEach(() => {
    resetSpecializationImportStats()
  })

  it('should map valid specialization', () => {
    const input = [{
      Key: 'PILOT',
      Name: 'Pilote',
      Description: 'Test description',
      CareerSkills: {
        Key: ['PILOTPL', 'PILOTSP', 'GUNN']
      },
      FreeRanks: '0'
    }]

    const result = specializationMapper(input)
    const stats = getSpecializationImportStats()

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Pilote')
    expect(result[0].type).toBe('specialization')
    expect(stats.total).toBe(1)
    expect(stats.imported).toBe(1)
    expect(stats.rejected).toBe(0)
  })

  it('should reject specialization with missing Name', () => {
    const input = [{
      Key: 'TEST',
      // Name manquant
      CareerSkills: { Key: ['PILOTPL'] }
    }]

    const result = specializationMapper(input)
    const stats = getSpecializationImportStats()

    expect(result).toHaveLength(0)
    expect(stats.total).toBe(1)
    expect(stats.imported).toBe(0)
    expect(stats.rejected).toBe(1)
  })

  it('should reject specialization with missing Key', () => {
    const input = [{
      Name: 'Test Specialization',
      // Key manquant
      CareerSkills: { Key: ['PILOTPL'] }
    }]

    const result = specializationMapper(input)
    const stats = getSpecializationImportStats()

    expect(result).toHaveLength(0)
    expect(stats.total).toBe(1)
    expect(stats.imported).toBe(0)
    expect(stats.rejected).toBe(1)
  })

  it('should handle 123 specializations', () => {
    const input = Array.from({ length: 123 }, (_, i) => ({
      Key: `SPEC_${i}`,
      Name: `Specialization ${i}`,
      Description: 'Test',
      CareerSkills: { Key: ['PILOTPL'] },
      FreeRanks: '0'
    }))

    const result = specializationMapper(input)
    const stats = getSpecializationImportStats()

    expect(result).toHaveLength(123)
    expect(stats.total).toBe(123)
    expect(stats.imported).toBe(123)
    expect(stats.rejected).toBe(0)
  })

  it('should handle empty input array', () => {
    const input = []

    const result = specializationMapper(input)
    const stats = getSpecializationImportStats()

    expect(result).toHaveLength(0)
    expect(stats.total).toBe(0)
    expect(stats.imported).toBe(0)
    expect(stats.rejected).toBe(0)
  })

  it('should handle mixed valid and invalid specializations', () => {
    const input = [
      { Key: 'VALID1', Name: 'Valid 1', CareerSkills: { Key: ['PILOTPL'] } },
      { Key: 'INVALID', CareerSkills: { Key: ['PILOTPL'] } }, // missing Name
      { Name: 'Invalid 2', CareerSkills: { Key: ['PILOTPL'] } }, // missing Key
      { Key: 'VALID2', Name: 'Valid 2', CareerSkills: { Key: ['GUNN'] } }
    ]

    const result = specializationMapper(input)
    const stats = getSpecializationImportStats()

    expect(result).toHaveLength(2)
    expect(stats.total).toBe(4)
    expect(stats.imported).toBe(2)
    expect(stats.rejected).toBe(2)
  })
})

describe('mapSpecializationSkills', () => {
  it('should map valid skill codes', () => {
    const input = ['PILOTPL', 'PILOTSP', 'GUNN']
    const result = mapSpecializationSkills(input)

    expect(result).toBeDefined()
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it('should handle empty input', () => {
    const input = []
    const result = mapSpecializationSkills(input)

    expect(result).toEqual([])
  })

  it('should filter unknown codes in strict mode', () => {
    const input = ['PILOTPL', 'UNKNOWN_CODE_XYZ']
    const result = mapSpecializationSkills(input, { strict: true })

    // En mode strict, les codes inconnus doivent être filtrés
    expect(result.every(item => item.id)).toBe(true)
  })
})

