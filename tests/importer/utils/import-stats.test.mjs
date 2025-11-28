import { describe, it, expect, beforeEach } from 'vitest'
import { ImportStats } from '../../../module/importer/utils/import-stats.mjs'

describe('ImportStats', () => {
  let stats

  beforeEach(() => {
    stats = new ImportStats()
  })

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const result = stats.getStats()
      expect(result).toMatchObject({
        total: 0,
        rejected: 0,
        imported: 0,
        rejectionReasons: [],
      })
    })

    it('should accept initial stats', () => {
      const customStats = new ImportStats({ unknownSkills: 0 })
      const result = customStats.getStats()
      expect(result).toMatchObject({
        total: 0,
        rejected: 0,
        imported: 0,
        unknownSkills: 0,
      })
    })
  })

  describe('increment', () => {
    it('should increment total', () => {
      stats.increment('total')
      expect(stats.getStats().total).toBe(1)
    })

    it('should increment by custom amount', () => {
      stats.increment('total', 5)
      expect(stats.getStats().total).toBe(5)
    })

    it('should initialize undefined counters', () => {
      stats.increment('newCounter')
      expect(stats.getStats().newCounter).toBe(1)
    })
  })

  describe('addDetail', () => {
    it('should track unique details', () => {
      stats.addDetail('unknownSkills', 'skill1', 'skillDetails')
      stats.addDetail('unknownSkills', 'skill2', 'skillDetails')
      stats.addDetail('unknownSkills', 'skill1', 'skillDetails') // duplicate

      const result = stats.getStats()
      expect(result.unknownSkills).toBe(2)
      expect(result.skillDetails).toEqual(['skill1', 'skill2'])
    })
  })

  describe('addRejectionReason', () => {
    it('should collect rejection reasons', () => {
      stats.addRejectionReason('Invalid data')
      stats.addRejectionReason('Missing field')

      const result = stats.getStats()
      expect(result.rejectionReasons).toEqual(['Invalid data', 'Missing field'])
    })
  })

  describe('reset', () => {
    it('should reset to default state', () => {
      stats.increment('total', 10)
      stats.increment('rejected', 2)
      stats.addDetail('unknownSkills', 'skill1', 'skillDetails')

      stats.reset()

      const result = stats.getStats()
      expect(result).toMatchObject({
        total: 0,
        rejected: 0,
        imported: 0,
        rejectionReasons: [],
      })
      expect(result.skillDetails).toBeUndefined()
    })

    it('should reset with custom initial values', () => {
      const customStats = new ImportStats({ customCounter: 0 })
      customStats.increment('customCounter', 5)
      customStats.reset({ customCounter: 0 })

      const result = customStats.getStats()
      expect(result.customCounter).toBe(0)
    })
  })

  describe('getStats', () => {
    it('should calculate imported as total - rejected', () => {
      stats.increment('total', 10)
      stats.increment('rejected', 3)

      const result = stats.getStats()
      expect(result.imported).toBe(7)
    })

    it('should include custom sets as arrays', () => {
      stats.addDetail('unknownSkills', 'skill1', 'skillDetails')
      stats.addDetail('unknownSkills', 'skill2', 'skillDetails')

      const result = stats.getStats()
      expect(result.skillDetails).toEqual(['skill1', 'skill2'])
    })
  })
})
