import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../module/utils/logger.mjs', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { resolveTalentDetail, resolveTalentItem, buildTalentDefinitionsMap } from '../../../module/lib/talent-node/talent-reference-resolver.mjs'

function mockFromUuidSync(uuid) {
  globalThis.fromUuidSync = vi.fn((lookup) => {
    if (lookup === 'Item.talent-parry-uuid') {
      return { name: 'Parry', system: { isRanked: true } }
    }
    if (lookup === 'Item.talent-grit-uuid') {
      return { name: 'Grit', system: { isRanked: false } }
    }
    return undefined
  })
}

function mockGameItems(items = []) {
  globalThis.game = {
    ...globalThis.game,
    items: items,
    i18n: { localize: vi.fn((key) => key) },
  }
}

describe('TalentReferenceResolver', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    globalThis.fromUuidSync = undefined
    globalThis.game = globalThis.game ?? {}
    globalThis.game.i18n = { localize: vi.fn((key) => key) }
    globalThis.game.items = undefined
    globalThis.game.packs = undefined
  })

  describe('resolveTalentDetail', () => {
    it('resolves by talentUuid via fromUuidSync', () => {
      mockFromUuidSync()
      mockGameItems()

      const result = resolveTalentDetail({ talentUuid: 'Item.talent-parry-uuid', talentId: 'talent-parry' })

      expect(result.name).toBe('Parry')
      expect(result.isRanked).toBe(true)
    })

    it('falls back to talentId business key when fromUuidSync returns nothing', () => {
      globalThis.fromUuidSync = vi.fn(() => undefined)
      mockGameItems([{ name: 'Grit', type: 'talent', system: { id: 'grit', isRanked: false } }])

      const result = resolveTalentDetail({ talentUuid: 'Item.nonexistent', talentId: 'grit' })

      expect(result.name).toBe('Grit')
      expect(result.isRanked).toBe(false)
    })

    it('returns unknown when neither UUID nor business key resolves', () => {
      globalThis.fromUuidSync = vi.fn(() => undefined)
      mockGameItems([])

      const result = resolveTalentDetail({ talentUuid: 'Item.nonexistent', talentId: 'unknown-id' })

      expect(result.name).toBe('SWERPG.TALENT.UNKNOWN')
      expect(result.isRanked).toBe(false)
    })

    it('resolves by string UUID', () => {
      mockFromUuidSync()
      mockGameItems()

      const result = resolveTalentDetail('Item.talent-parry-uuid')

      expect(result.name).toBe('Parry')
      expect(result.isRanked).toBe(true)
    })

    it('returns unknown when nodeRef is null', () => {
      const result = resolveTalentDetail({ talentUuid: null, talentId: null })

      expect(result.name).toBe('SWERPG.TALENT.UNKNOWN')
    })

    it('handles fromUuidSync throwing gracefully', () => {
      globalThis.fromUuidSync = vi.fn(() => {
        throw new Error('bad')
      })
      mockGameItems([{ name: 'Grit', type: 'talent', system: { id: 'grit', isRanked: false } }])

      const result = resolveTalentDetail({ talentUuid: 'Item.bad', talentId: 'grit' })

      expect(result.name).toBe('Grit')
      expect(result.isRanked).toBe(false)
    })
  })

  describe('resolveTalentItem', () => {
    it('returns just the name', () => {
      mockFromUuidSync()
      mockGameItems()

      const result = resolveTalentItem({ talentUuid: 'Item.talent-parry-uuid', talentId: 'talent-parry' })

      expect(result).toBe('Parry')
    })

    it('returns unknown label when unresolved', () => {
      globalThis.fromUuidSync = vi.fn(() => undefined)
      mockGameItems([])

      const result = resolveTalentItem({ talentUuid: null, talentId: 'void' })

      expect(result).toBe('SWERPG.TALENT.UNKNOWN')
    })
  })

  describe('buildTalentDefinitionsMap', () => {
    it('indexes by uuid and by system.id', () => {
      mockGameItems([
        { uuid: 'Item.abc', name: 'Parry', type: 'talent', system: { id: 'talent-parry', activation: 'active', isRanked: true } },
        { uuid: 'Item.def', name: 'Grit', type: 'talent', system: { id: 'grit', activation: 'passive', isRanked: false } },
      ])

      const map = buildTalentDefinitionsMap()

      expect(map.get('Item.abc')).toEqual({ name: 'Parry', activation: 'active', isRanked: true, isActive: true })
      expect(map.get('talent-parry')).toEqual({ name: 'Parry', activation: 'active', isRanked: true, isActive: true })
      expect(map.get('Item.def')).toEqual({ name: 'Grit', activation: 'passive', isRanked: false, isActive: true })
      expect(map.get('grit')).toEqual({ name: 'Grit', activation: 'passive', isRanked: false, isActive: true })
    })

    it('falls back to item.id when system.id is missing', () => {
      mockGameItems([{ uuid: 'Item.xyz', id: 'Item.xyz', name: 'Old Talent', type: 'talent', system: { activation: 'active', isRanked: false } }])

      const map = buildTalentDefinitionsMap()

      expect(map.get('Item.xyz')).toEqual({ name: 'Old Talent', activation: 'active', isRanked: false, isActive: true })
    })

    it('skips non-talent items', () => {
      mockGameItems([
        { uuid: 'Item.skill', name: 'Some Skill', type: 'skill', system: {} },
        { uuid: 'Item.talent', name: 'Parry', type: 'talent', system: { id: 'parry', activation: 'active', isRanked: true } },
      ])

      const map = buildTalentDefinitionsMap()

      expect(map.size).toBe(2)
      expect(map.get('parry')).toBeTruthy()
    })

    it('returns empty map when game.items is undefined', () => {
      globalThis.game.items = undefined

      const map = buildTalentDefinitionsMap()

      expect(map.size).toBe(0)
    })
  })
})
