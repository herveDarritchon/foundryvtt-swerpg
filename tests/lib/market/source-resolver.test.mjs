import { describe, test, expect } from 'vitest'
import { resolveMarketSources, filterDuplicates, filterByActiveConfig, DEDUP_STRATEGIES } from '../../../module/lib/market/source-resolver.mjs'

describe('resolveMarketSources', () => {
  describe('with no allSources pool', () => {
    test('returns only enabled sources', () => {
      const configs = [
        { id: 'pack-a', sourceType: 'compendium', label: 'Pack A', enabled: true, allowedTypes: ['*'] },
        { id: 'pack-b', sourceType: 'compendium', label: 'Pack B', enabled: false, allowedTypes: ['*'] },
      ]
      const result = resolveMarketSources(configs)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('pack-a')
    })

    test('returns empty array when no sources are enabled', () => {
      const configs = [{ id: 'pack-a', sourceType: 'compendium', label: 'Pack A', enabled: false, allowedTypes: [] }]
      const result = resolveMarketSources(configs)
      expect(result).toEqual([])
    })

    test('returns empty array for empty input', () => {
      expect(resolveMarketSources([])).toEqual([])
    })

    test('returns empty array for non-array input', () => {
      expect(resolveMarketSources(null)).toEqual([])
      expect(resolveMarketSources(undefined)).toEqual([])
    })
  })

  describe('with allSources pool', () => {
    test('filters enabled sources against available pool', () => {
      const configs = [
        { id: 'pack-a', sourceType: 'compendium', label: 'Pack A', enabled: true, allowedTypes: ['*'] },
        { id: 'pack-b', sourceType: 'compendium', label: 'Pack B', enabled: true, allowedTypes: ['*'] },
      ]
      const allSources = [{ id: 'pack-a', sourceType: 'compendium', label: 'Pack A', enabled: true }]
      const result = resolveMarketSources(configs, allSources)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('pack-a')
    })

    test('returns empty array when enabled source is not in allSources pool', () => {
      const configs = [{ id: 'pack-x', sourceType: 'world', label: 'Pack X', enabled: true, allowedTypes: ['weapon'] }]
      const allSources = [{ id: 'pack-a', sourceType: 'compendium', label: 'Pack A', enabled: true }]
      const result = resolveMarketSources(configs, allSources)
      expect(result).toEqual([])
    })
  })
})

describe('filterDuplicates', () => {
  describe('keep-all strategy', () => {
    test('returns all entries unchanged', () => {
      const entries = [
        { name: 'Blaster', itemType: 'weapon', sourceType: 'compendium' },
        { name: 'Blaster', itemType: 'weapon', sourceType: 'world' },
      ]
      const result = filterDuplicates(entries, DEDUP_STRATEGIES.KEEP_ALL)
      expect(result).toHaveLength(2)
    })

    test('returns empty array for empty input', () => {
      expect(filterDuplicates([], DEDUP_STRATEGIES.KEEP_ALL)).toEqual([])
    })
  })

  describe('prefer-compendium strategy (default)', () => {
    test('keeps compendium entry when there is a world duplicate', () => {
      const entries = [
        { name: 'Blaster', itemType: 'weapon', sourceType: 'world' },
        { name: 'Blaster', itemType: 'weapon', sourceType: 'compendium' },
      ]
      const result = filterDuplicates(entries)
      expect(result).toHaveLength(1)
      expect(result[0].sourceType).toBe('compendium')
    })

    test('keeps first-seen entry when both are same source type', () => {
      const entries = [
        { name: 'Blaster', itemType: 'weapon', sourceType: 'world' },
        { name: 'Blaster', itemType: 'weapon', sourceType: 'world' },
      ]
      const result = filterDuplicates(entries)
      expect(result).toHaveLength(1)
    })

    test('does not remove entries with different names', () => {
      const entries = [
        { name: 'Blaster', itemType: 'weapon', sourceType: 'compendium' },
        { name: 'Vibroblade', itemType: 'weapon', sourceType: 'compendium' },
      ]
      const result = filterDuplicates(entries)
      expect(result).toHaveLength(2)
    })

    test('does not remove entries with same name but different type', () => {
      const entries = [
        { name: 'Standard', itemType: 'weapon', sourceType: 'compendium' },
        { name: 'Standard', itemType: 'armor', sourceType: 'compendium' },
      ]
      const result = filterDuplicates(entries)
      expect(result).toHaveLength(2)
    })

    test('is case-insensitive for name comparison', () => {
      const entries = [
        { name: 'BLASTER', itemType: 'weapon', sourceType: 'compendium' },
        { name: 'blaster', itemType: 'weapon', sourceType: 'world' },
      ]
      const result = filterDuplicates(entries)
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('BLASTER')
    })

    test('explicit PREFER_COMPENDIUM strategy is the same as default', () => {
      const entries = [
        { name: 'Blaster', itemType: 'weapon', sourceType: 'world' },
        { name: 'Blaster', itemType: 'weapon', sourceType: 'compendium' },
      ]
      const resultDefault = filterDuplicates(entries)
      const resultExplicit = filterDuplicates(entries, DEDUP_STRATEGIES.PREFER_COMPENDIUM)
      expect(resultDefault).toEqual(resultExplicit)
    })
  })

  describe('prefer-newest strategy', () => {
    test('keeps entry with highest createdAt timestamp', () => {
      const entries = [
        { name: 'Blaster', itemType: 'weapon', sourceType: 'world', createdAt: 1000 },
        { name: 'Blaster', itemType: 'weapon', sourceType: 'compendium', createdAt: 2000 },
      ]
      const result = filterDuplicates(entries, DEDUP_STRATEGIES.PREFER_NEWEST)
      expect(result).toHaveLength(1)
      expect(result[0].createdAt).toBe(2000)
    })

    test('uses 0 as default timestamp when createdAt is absent', () => {
      const entries = [
        { name: 'Blaster', itemType: 'weapon', sourceType: 'world' },
        { name: 'Blaster', itemType: 'weapon', sourceType: 'compendium', createdAt: 1000 },
      ]
      const result = filterDuplicates(entries, DEDUP_STRATEGIES.PREFER_NEWEST)
      expect(result).toHaveLength(1)
      expect(result[0].createdAt).toBe(1000)
    })
  })

  describe('edge cases', () => {
    test('returns empty array for empty input', () => {
      expect(filterDuplicates([])).toEqual([])
    })

    test('returns empty array for null input', () => {
      expect(filterDuplicates(null)).toEqual([])
    })

    test('returns copy, not original array reference', () => {
      const entries = [{ name: 'Blaster', itemType: 'weapon', sourceType: 'compendium' }]
      const result = filterDuplicates(entries, DEDUP_STRATEGIES.KEEP_ALL)
      expect(result).not.toBe(entries)
    })
  })

  describe('DEDUP_STRATEGIES constants', () => {
    test('contains prefer-compendium, prefer-newest, keep-all', () => {
      expect(DEDUP_STRATEGIES.PREFER_COMPENDIUM).toBe('prefer-compendium')
      expect(DEDUP_STRATEGIES.PREFER_NEWEST).toBe('prefer-newest')
      expect(DEDUP_STRATEGIES.KEEP_ALL).toBe('keep-all')
    })

    test('is frozen', () => {
      expect(Object.isFrozen(DEDUP_STRATEGIES)).toBe(true)
    })
  })
})

/* -------------------------------------------- */

describe('filterByActiveConfig', () => {
  const makeEntry = (sourceType, itemType) => ({ sourceType, itemType, name: 'Test' })

  describe('basic filtering', () => {
    test('keeps entries whose sourceType and itemType are both enabled', () => {
      const entries = [makeEntry('compendium', 'weapon'), makeEntry('world', 'armor')]
      const result = filterByActiveConfig(entries, ['compendium', 'world'], ['weapon', 'armor'])
      expect(result).toHaveLength(2)
    })

    test('removes entries whose sourceType is not in enabledSources', () => {
      const entries = [makeEntry('import', 'weapon'), makeEntry('compendium', 'weapon')]
      const result = filterByActiveConfig(entries, ['compendium'], ['weapon'])
      expect(result).toHaveLength(1)
      expect(result[0].sourceType).toBe('compendium')
    })

    test('removes entries whose itemType is not in allowedItemTypes', () => {
      const entries = [makeEntry('compendium', 'weapon'), makeEntry('compendium', 'gear')]
      const result = filterByActiveConfig(entries, ['compendium'], ['weapon'])
      expect(result).toHaveLength(1)
      expect(result[0].itemType).toBe('weapon')
    })

    test('removes entries failing both source and type filter', () => {
      const entries = [makeEntry('import', 'gear')]
      const result = filterByActiveConfig(entries, ['compendium'], ['weapon'])
      expect(result).toHaveLength(0)
    })
  })

  describe('empty config rules', () => {
    test('returns empty array when enabledSources is empty', () => {
      const entries = [makeEntry('compendium', 'weapon')]
      const result = filterByActiveConfig(entries, [], ['weapon'])
      expect(result).toEqual([])
    })

    test('returns empty array when allowedItemTypes is empty', () => {
      const entries = [makeEntry('compendium', 'weapon')]
      const result = filterByActiveConfig(entries, ['compendium'], [])
      expect(result).toEqual([])
    })
  })

  describe('edge cases', () => {
    test('returns empty array for empty entries', () => {
      expect(filterByActiveConfig([], ['compendium'], ['weapon'])).toEqual([])
    })

    test('returns empty array for null entries', () => {
      expect(filterByActiveConfig(null, ['compendium'], ['weapon'])).toEqual([])
    })

    test('returns empty array when enabledSources is not an array', () => {
      const entries = [makeEntry('compendium', 'weapon')]
      expect(filterByActiveConfig(entries, null, ['weapon'])).toEqual([])
    })

    test('returns empty array when allowedItemTypes is not an array', () => {
      const entries = [makeEntry('compendium', 'weapon')]
      expect(filterByActiveConfig(entries, ['compendium'], null)).toEqual([])
    })
  })

  describe('canonical integration with DEFAULT_MARKET_CONFIG', () => {
    test('all entries pass when config is the full default', () => {
      const entries = [makeEntry('compendium', 'weapon'), makeEntry('world', 'armor'), makeEntry('import', 'gear')]
      // Default config includes all source types and all purchasable types
      const enabledSources = ['compendium', 'world', 'import']
      const allowedItemTypes = ['weapon', 'armor', 'gear']
      const result = filterByActiveConfig(entries, enabledSources, allowedItemTypes)
      expect(result).toHaveLength(3)
    })
  })
})
