import { describe, it, expect, beforeEach } from 'vitest'
import {
  obligationMapper,
  getObligationImportStats,
} from '../../module/importer/items/obligation-ogg-dude.mjs'

describe('obligationMapper', () => {
  beforeEach(() => {
    // Stats are reset at the start of each obligationMapper call
  })

  describe('Valid obligation mapping', () => {
    it('should map basic obligation with all standard fields', () => {
      const xmlItems = [
        {
          Key: 'DEBT',
          Name: 'Debt',
          Description: 'The character owes a debt to someone.',
          Source: 'Edge of the Empire Core Rulebook',
        },
      ]

      const result = obligationMapper(xmlItems)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        name: 'Debt',
        type: 'obligation',
        system: {
          description: 'The character owes a debt to someone.',
          value: 10,
          isExtra: false,
          extraXp: 0,
          extraCredits: 0,
        },
        flags: {
          swerpg: {
            oggdudeKey: 'DEBT',
            oggdudeSource: 'Edge of the Empire Core Rulebook',
          },
        },
      })
    })

    it('should map obligation with multiple sources', () => {
      const xmlItems = [
        {
          Key: 'BOU',
          Name: 'Bounty',
          Description: 'A bounty on the character\'s head.',
          Sources: {
            Source: ['Source 1', 'Source 2', 'Source 3'],
          },
        },
      ]

      const result = obligationMapper(xmlItems)

      expect(result).toHaveLength(1)
      expect(result[0].flags.swerpg).toHaveProperty('oggdudeSources')
      expect(result[0].flags.swerpg.oggdudeSources).toEqual(['Source 1', 'Source 2', 'Source 3'])
    })

    it('should handle single source in Sources array', () => {
      const xmlItems = [
        {
          Key: 'FAM',
          Name: 'Family',
          Description: 'Family obligations.',
          Sources: {
            Source: 'Single Source',
          },
        },
      ]

      const result = obligationMapper(xmlItems)

      expect(result).toHaveLength(1)
      expect(result[0].flags.swerpg.oggdudeSources).toEqual(['Single Source'])
    })

    it('should map obligation without description', () => {
      const xmlItems = [
        {
          Key: 'TEST',
          Name: 'Test Obligation',
        },
      ]

      const result = obligationMapper(xmlItems)

      expect(result).toHaveLength(1)
      expect(result[0].system.description).toBe('')
    })

    it('should map multiple obligations correctly', () => {
      const xmlItems = [
        {
          Key: 'DEBT',
          Name: 'Debt',
          Description: 'Debt description',
        },
        {
          Key: 'FAM',
          Name: 'Family',
          Description: 'Family description',
        },
        {
          Key: 'BOU',
          Name: 'Bounty',
          Description: 'Bounty description',
        },
      ]

      const result = obligationMapper(xmlItems)

      expect(result).toHaveLength(3)
      expect(result[0].name).toBe('Debt')
      expect(result[1].name).toBe('Family')
      expect(result[2].name).toBe('Bounty')
    })
  })

  describe('Missing mandatory fields', () => {
    it('should reject obligation with missing Name', () => {
      const xmlItems = [
        {
          Key: 'TEST',
          Description: 'Test description',
        },
      ]

      const result = obligationMapper(xmlItems)
      const stats = getObligationImportStats()

      expect(result).toHaveLength(0)
      expect(stats.total).toBe(1)
      expect(stats.rejected).toBe(1)
      expect(stats.imported).toBe(0)
    })

    it('should reject obligation with missing Key', () => {
      const xmlItems = [
        {
          Name: 'Test Obligation',
          Description: 'Test description',
        },
      ]

      const result = obligationMapper(xmlItems)
      const stats = getObligationImportStats()

      expect(result).toHaveLength(0)
      expect(stats.rejected).toBe(1)
    })

    it('should reject obligation with empty Name', () => {
      const xmlItems = [
        {
          Key: 'TEST',
          Name: '',
          Description: 'Test description',
        },
      ]

      const result = obligationMapper(xmlItems)
      const stats = getObligationImportStats()

      expect(result).toHaveLength(0)
      expect(stats.rejected).toBe(1)
    })

    it('should reject obligation with empty Key', () => {
      const xmlItems = [
        {
          Key: '',
          Name: 'Test Obligation',
          Description: 'Test description',
        },
      ]

      const result = obligationMapper(xmlItems)
      const stats = getObligationImportStats()

      expect(result).toHaveLength(0)
      expect(stats.rejected).toBe(1)
    })

    it('should handle mixed valid and invalid obligations', () => {
      const xmlItems = [
        {
          Key: 'VALID1',
          Name: 'Valid Obligation 1',
        },
        {
          Key: 'INVALID',
          // Missing Name
        },
        {
          Key: 'VALID2',
          Name: 'Valid Obligation 2',
        },
        {
          // Missing Key
          Name: 'Invalid Obligation',
        },
      ]

      const result = obligationMapper(xmlItems)
      const stats = getObligationImportStats()

      expect(result).toHaveLength(2)
      expect(stats.total).toBe(4)
      expect(stats.imported).toBe(2)
      expect(stats.rejected).toBe(2)
    })
  })

  describe('Statistics tracking', () => {
    it('should track total count correctly', () => {
      const xmlItems = [
        { Key: 'KEY1', Name: 'Name1' },
        { Key: 'KEY2', Name: 'Name2' },
        { Key: 'KEY3', Name: 'Name3' },
      ]

      obligationMapper(xmlItems)
      const stats = getObligationImportStats()

      expect(stats.total).toBe(3)
    })

    it('should track imported count correctly', () => {
      const xmlItems = [
        { Key: 'KEY1', Name: 'Name1' },
        { Key: 'KEY2', Name: 'Name2' },
      ]

      obligationMapper(xmlItems)
      const stats = getObligationImportStats()

      expect(stats.imported).toBe(2)
    })

    it('should track rejected count correctly', () => {
      const xmlItems = [
        { Key: 'KEY1', Name: 'Name1' },
        { Key: 'KEY2' }, // Missing Name
        { Name: 'Name3' }, // Missing Key
      ]

      obligationMapper(xmlItems)
      const stats = getObligationImportStats()

      expect(stats.total).toBe(3)
      expect(stats.imported).toBe(1)
      expect(stats.rejected).toBe(2)
    })

    it('should reset stats between calls', () => {
      obligationMapper([{ Key: 'KEY1', Name: 'Name1' }])
      const stats1 = getObligationImportStats()
      expect(stats1.total).toBe(1)

      obligationMapper([{ Key: 'KEY2', Name: 'Name2' }])
      const stats2 = getObligationImportStats()
      expect(stats2.total).toBe(1) // Reset, not cumulative
    })
  })

  describe('Error handling', () => {
    it('should handle empty array', () => {
      const result = obligationMapper([])
      const stats = getObligationImportStats()

      expect(result).toHaveLength(0)
      expect(stats.total).toBe(0)
      expect(stats.imported).toBe(0)
      expect(stats.rejected).toBe(0)
    })

    it('should handle malformed XML objects gracefully', () => {
      const xmlItems = [
        {
          Key: 'VALID',
          Name: 'Valid',
        },
        null,
        undefined,
        {
          Key: 'ANOTHER',
          Name: 'Another Valid',
        },
      ]

      const result = obligationMapper(xmlItems)

      // Should not crash and should process valid items
      expect(result.length).toBeGreaterThanOrEqual(2)
    })
  })
})
