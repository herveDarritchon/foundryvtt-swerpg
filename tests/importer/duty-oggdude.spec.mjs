import { describe, it, expect, beforeEach } from 'vitest'
import { dutyMapper, getDutyImportStats } from '../../module/importer/items/duty-ogg-dude.mjs'

describe('dutyMapper', () => {
  beforeEach(() => {
  })

  describe('Valid duty mapping', () => {
    it('should map basic duty with all standard fields', () => {
      const xmlItems = [
        {
          Key: 'MILITARY',
          Name: 'Military Service',
          Description: 'The character has a military obligation.',
          Source: { _: 'Age of Rebellion Core Rulebook', Page: '42' },
        },
      ]

      const result = dutyMapper(xmlItems)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        name: 'Military Service',
        type: 'duty',
        system: {
          description: 'The character has a military obligation.',
          value: 10,
        },
        flags: {
          swerpg: {
            oggdudeKey: 'MILITARY',
          },
        },
      })
    })

    it('should map duty with sources', () => {
      const xmlItems = [
        {
          Key: 'INTEL',
          Name: 'Counter-Intelligence',
          Sources: {
            Source: [
              { _: 'Source 1', Page: '10' },
              { _: 'Source 2', Page: '20' },
            ],
          },
        },
      ]

      const result = dutyMapper(xmlItems)

      expect(result).toHaveLength(1)
      expect(result[0].system.sources).toHaveLength(2)
      expect(result[0].system.sources[0].book).toBe('Source 1')
      expect(result[0].system.sources[0].page).toBe('10')
      expect(result[0].system.sources[1].book).toBe('Source 2')
      expect(result[0].system.sources[1].page).toBe('20')
    })

    it('should handle single source in Sources array', () => {
      const xmlItems = [
        {
          Key: 'DIPLO',
          Name: 'Diplomacy',
          Sources: {
            Source: { _: 'Single Source', Page: '5' },
          },
        },
      ]

      const result = dutyMapper(xmlItems)

      expect(result).toHaveLength(1)
      expect(result[0].system.sources).toHaveLength(1)
      expect(result[0].system.sources[0].book).toBe('Single Source')
    })

    it('should map duty without description', () => {
      const xmlItems = [
        {
          Key: 'COMBAT',
          Name: 'Combat Veterans',
        },
      ]

      const result = dutyMapper(xmlItems)

      expect(result).toHaveLength(1)
      expect(result[0].system.description).toBe('')
    })

    it('should map multiple duties correctly', () => {
      const xmlItems = [
        { Key: 'KEY1', Name: 'Duty 1', Description: 'Desc 1' },
        { Key: 'KEY2', Name: 'Duty 2', Description: 'Desc 2' },
        { Key: 'KEY3', Name: 'Duty 3', Description: 'Desc 3' },
      ]

      const result = dutyMapper(xmlItems)

      expect(result).toHaveLength(3)
      expect(result[0].name).toBe('Duty 1')
      expect(result[1].name).toBe('Duty 2')
      expect(result[2].name).toBe('Duty 3')
    })
  })

  describe('Missing mandatory fields', () => {
    it('should reject duty with missing Name', () => {
      const xmlItems = [
        {
          Key: 'TEST',
          Description: 'Test description',
        },
      ]

      const result = dutyMapper(xmlItems)
      const stats = getDutyImportStats()

      expect(result).toHaveLength(0)
      expect(stats.total).toBe(1)
      expect(stats.rejected).toBe(1)
      expect(stats.imported).toBe(0)
    })

    it('should reject duty with missing Key', () => {
      const xmlItems = [
        {
          Name: 'Test Duty',
          Description: 'Test description',
        },
      ]

      const result = dutyMapper(xmlItems)
      const stats = getDutyImportStats()

      expect(result).toHaveLength(0)
      expect(stats.rejected).toBe(1)
    })

    it('should reject duty with empty Name', () => {
      const xmlItems = [
        {
          Key: 'TEST',
          Name: '',
          Description: 'Test description',
        },
      ]

      const result = dutyMapper(xmlItems)
      const stats = getDutyImportStats()

      expect(result).toHaveLength(0)
      expect(stats.rejected).toBe(1)
    })

    it('should reject duty with empty Key', () => {
      const xmlItems = [
        {
          Key: '',
          Name: 'Test Duty',
          Description: 'Test description',
        },
      ]

      const result = dutyMapper(xmlItems)
      const stats = getDutyImportStats()

      expect(result).toHaveLength(0)
      expect(stats.rejected).toBe(1)
    })

    it('should handle mixed valid and invalid duties', () => {
      const xmlItems = [
        {
          Key: 'VALID1',
          Name: 'Valid Duty 1',
        },
        {
          Key: 'INVALID',
        },
        {
          Key: 'VALID2',
          Name: 'Valid Duty 2',
        },
        {
          Name: 'Invalid Duty',
        },
      ]

      const result = dutyMapper(xmlItems)
      const stats = getDutyImportStats()

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

      dutyMapper(xmlItems)
      const stats = getDutyImportStats()

      expect(stats.total).toBe(3)
    })

    it('should track imported count correctly', () => {
      const xmlItems = [
        { Key: 'KEY1', Name: 'Name1' },
        { Key: 'KEY2', Name: 'Name2' },
      ]

      dutyMapper(xmlItems)
      const stats = getDutyImportStats()

      expect(stats.imported).toBe(2)
    })

    it('should track rejected count correctly', () => {
      const xmlItems = [
        { Key: 'KEY1', Name: 'Name1' },
        { Key: 'KEY2' },
        { Name: 'Name3' },
      ]

      dutyMapper(xmlItems)
      const stats = getDutyImportStats()

      expect(stats.total).toBe(3)
      expect(stats.imported).toBe(1)
      expect(stats.rejected).toBe(2)
    })

    it('should reset stats between calls', () => {
      dutyMapper([{ Key: 'KEY1', Name: 'Name1' }])
      const stats1 = getDutyImportStats()
      expect(stats1.total).toBe(1)

      dutyMapper([{ Key: 'KEY2', Name: 'Name2' }])
      const stats2 = getDutyImportStats()
      expect(stats2.total).toBe(1)
    })
  })

  describe('Error handling', () => {
    it('should handle empty array', () => {
      const result = dutyMapper([])
      const stats = getDutyImportStats()

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

      const result = dutyMapper(xmlItems)

      expect(result.length).toBeGreaterThanOrEqual(2)
    })
  })
})
