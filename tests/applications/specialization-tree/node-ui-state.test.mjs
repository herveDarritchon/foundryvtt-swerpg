import { describe, expect, it } from 'vitest'

import {
  enrichNode,
  getReasonLabelKey,
  NODE_STATE,
  NODE_STATE_LABEL_KEYS,
  NODE_STATE_VARIANTS,
  REASON_CODE,
  REASON_LABEL_DEFAULT,
  REASON_LABEL_KEYS,
} from '../../../module/applications/specialization-tree/node-ui-state.mjs'

const localize = (key) => `[${key}]`

/**
 * Build a minimal render node for testing.
 * @param {object} [overrides]
 */
function buildNode(overrides = {}) {
  return {
    nodeId: 'r1c1',
    talentId: 'Item.talent-grit',
    talentName: 'Grit',
    isRanked: true,
    xpCost: 10,
    row: 1,
    column: 1,
    x: 20,
    y: 20,
    ...overrides,
  }
}

describe('node-ui-state', () => {
  describe('enrichNode', () => {
    it('returns PURCHASED state and variant when node is purchased', () => {
      const node = buildNode()
      const result = enrichNode(node, { state: NODE_STATE.PURCHASED, reasonCode: REASON_CODE.ALREADY_PURCHASED }, localize)

      expect(result.nodeState).toBe(NODE_STATE.PURCHASED)
      expect(result.nodeStateLabel).toBe(`[${NODE_STATE_LABEL_KEYS[NODE_STATE.PURCHASED]}]`)
      expect(result.reasonCode).toBe(REASON_CODE.ALREADY_PURCHASED)
      expect(result.reasonLabel).toBe(`[${REASON_LABEL_KEYS[REASON_CODE.ALREADY_PURCHASED]}]`)
      expect(result.variant).toBe(NODE_STATE_VARIANTS[NODE_STATE.PURCHASED])
    })

    it('returns AVAILABLE state and null reasonLabel when no reasonCode', () => {
      const node = buildNode()
      const result = enrichNode(node, { state: NODE_STATE.AVAILABLE, reasonCode: '' }, localize)

      expect(result.nodeState).toBe(NODE_STATE.AVAILABLE)
      expect(result.nodeStateLabel).toBe(`[${NODE_STATE_LABEL_KEYS[NODE_STATE.AVAILABLE]}]`)
      expect(result.reasonCode).toBe('')
      expect(result.reasonLabel).toBeNull()
      expect(result.variant).toBe(NODE_STATE_VARIANTS[NODE_STATE.AVAILABLE])
    })

    it('returns LOCKED state with reason for not-enough-xp', () => {
      const node = buildNode()
      const result = enrichNode(node, { state: NODE_STATE.LOCKED, reasonCode: REASON_CODE.NOT_ENOUGH_XP }, localize)

      expect(result.nodeState).toBe(NODE_STATE.LOCKED)
      expect(result.nodeStateLabel).toBe(`[${NODE_STATE_LABEL_KEYS[NODE_STATE.LOCKED]}]`)
      expect(result.reasonCode).toBe(REASON_CODE.NOT_ENOUGH_XP)
      expect(result.reasonLabel).toBe(`[${REASON_LABEL_KEYS[REASON_CODE.NOT_ENOUGH_XP]}]`)
      expect(result.variant).toBe(NODE_STATE_VARIANTS[NODE_STATE.LOCKED])
    })

    it('returns LOCKED state with reason for node-locked (prerequisites)', () => {
      const node = buildNode()
      const result = enrichNode(node, { state: NODE_STATE.LOCKED, reasonCode: REASON_CODE.NODE_LOCKED }, localize)

      expect(result.nodeState).toBe(NODE_STATE.LOCKED)
      expect(result.reasonLabel).toBe(`[${REASON_LABEL_KEYS[REASON_CODE.NODE_LOCKED]}]`)
      expect(result.variant).toBe(NODE_STATE_VARIANTS[NODE_STATE.LOCKED])
    })

    it('returns INVALID state for each invalid reason code', () => {
      const invalidReasons = [
        REASON_CODE.SPECIALIZATION_NOT_OWNED,
        REASON_CODE.TREE_NOT_FOUND,
        REASON_CODE.TREE_INCOMPLETE,
        REASON_CODE.NODE_NOT_FOUND,
        REASON_CODE.NODE_INVALID,
      ]

      for (const reasonCode of invalidReasons) {
        const node = buildNode()
        const result = enrichNode(node, { state: NODE_STATE.INVALID, reasonCode }, localize)

        expect(result.nodeState).toBe(NODE_STATE.INVALID)
        expect(result.nodeStateLabel).toBe(`[${NODE_STATE_LABEL_KEYS[NODE_STATE.INVALID]}]`)
        expect(result.reasonCode).toBe(reasonCode)
        expect(result.reasonLabel).toBe(`[${REASON_LABEL_KEYS[reasonCode]}]`)
        expect(result.variant).toBe(NODE_STATE_VARIANTS[NODE_STATE.INVALID])
      }
    })

    it('falls back to REASON_LABEL_DEFAULT for unknown reasonCode', () => {
      const node = buildNode()
      const result = enrichNode(node, { state: NODE_STATE.LOCKED, reasonCode: 'some-unknown-reason' }, localize)

      expect(result.reasonLabel).toBe(`[${REASON_LABEL_DEFAULT}]`)
    })

    it('falls back to INVALID state when stateResult is null', () => {
      const node = buildNode()
      const result = enrichNode(node, null, localize)

      expect(result.nodeState).toBe(NODE_STATE.INVALID)
      expect(result.reasonCode).toBeNull()
      expect(result.reasonLabel).toBeNull()
      expect(result.variant).toBe(NODE_STATE_VARIANTS[NODE_STATE.INVALID])
    })

    it('falls back to INVALID state when stateResult is undefined', () => {
      const node = buildNode()
      const result = enrichNode(node, undefined, localize)

      expect(result.nodeState).toBe(NODE_STATE.INVALID)
      expect(result.variant).toBe(NODE_STATE_VARIANTS[NODE_STATE.INVALID])
    })

    it('falls back to INVALID state when state is unknown', () => {
      const node = buildNode()
      const result = enrichNode(node, { state: 'bogus-state', reasonCode: null }, localize)

      expect(result.nodeState).toBe('bogus-state')
      expect(result.nodeStateLabel).toBe(`[${NODE_STATE_LABEL_KEYS[NODE_STATE.INVALID]}]`)
      expect(result.variant).toBe(NODE_STATE_VARIANTS[NODE_STATE.INVALID])
    })

    it('preserves all original node properties', () => {
      const node = buildNode({ extraProp: 'hello', nested: { value: 42 } })
      const result = enrichNode(node, { state: NODE_STATE.AVAILABLE, reasonCode: '' }, localize)

      expect(result.nodeId).toBe('r1c1')
      expect(result.talentId).toBe('Item.talent-grit')
      expect(result.talentName).toBe('Grit')
      expect(result.isRanked).toBe(true)
      expect(result.xpCost).toBe(10)
      expect(result.row).toBe(1)
      expect(result.column).toBe(1)
      expect(result.x).toBe(20)
      expect(result.y).toBe(20)
      expect(result.extraProp).toBe('hello')
      expect(result.nested).toEqual({ value: 42 })
    })

    it('does not mutate the input node object', () => {
      const node = buildNode()
      Object.freeze(node)

      expect(() => enrichNode(node, { state: NODE_STATE.AVAILABLE, reasonCode: '' }, localize)).not.toThrow()
    })

    it('does not mutate the input stateResult object', () => {
      const node = buildNode()
      const stateResult = { state: NODE_STATE.PURCHASED, reasonCode: REASON_CODE.ALREADY_PURCHASED }
      Object.freeze(stateResult)

      expect(() => enrichNode(node, stateResult, localize)).not.toThrow()
    })

    it('returns a distinct object, not the input reference', () => {
      const node = buildNode()
      const result = enrichNode(node, { state: NODE_STATE.AVAILABLE, reasonCode: '' }, localize)

      expect(result).not.toBe(node)
    })

    it('handles unresolved talent nodes with INVALID fallback', () => {
      const node = buildNode({ talentName: 'Unresolved talent' })
      const result = enrichNode(node, null, localize)

      expect(result.nodeState).toBe(NODE_STATE.INVALID)
      expect(result.reasonLabel).toBeNull()
      expect(result.talentName).toBe('Unresolved talent')
    })
  })

  describe('getReasonLabelKey', () => {
    it('returns the correct i18n key for each known REASON_CODE', () => {
      const entries = [
        [REASON_CODE.ALREADY_PURCHASED, REASON_LABEL_KEYS[REASON_CODE.ALREADY_PURCHASED]],
        [REASON_CODE.SPECIALIZATION_NOT_OWNED, REASON_LABEL_KEYS[REASON_CODE.SPECIALIZATION_NOT_OWNED]],
        [REASON_CODE.TREE_NOT_FOUND, REASON_LABEL_KEYS[REASON_CODE.TREE_NOT_FOUND]],
        [REASON_CODE.TREE_INCOMPLETE, REASON_LABEL_KEYS[REASON_CODE.TREE_INCOMPLETE]],
        [REASON_CODE.NODE_NOT_FOUND, REASON_LABEL_KEYS[REASON_CODE.NODE_NOT_FOUND]],
        [REASON_CODE.NODE_INVALID, REASON_LABEL_KEYS[REASON_CODE.NODE_INVALID]],
        [REASON_CODE.NODE_LOCKED, REASON_LABEL_KEYS[REASON_CODE.NODE_LOCKED]],
        [REASON_CODE.NOT_ENOUGH_XP, REASON_LABEL_KEYS[REASON_CODE.NOT_ENOUGH_XP]],
      ]

      for (const [code, expectedKey] of entries) {
        expect(getReasonLabelKey(code)).toBe(expectedKey)
      }
    })

    it('returns REASON_LABEL_DEFAULT for null', () => {
      expect(getReasonLabelKey(null)).toBe(REASON_LABEL_DEFAULT)
    })

    it('returns REASON_LABEL_DEFAULT for undefined', () => {
      expect(getReasonLabelKey(undefined)).toBe(REASON_LABEL_DEFAULT)
    })

    it('returns REASON_LABEL_DEFAULT for empty string', () => {
      expect(getReasonLabelKey('')).toBe(REASON_LABEL_DEFAULT)
    })

    it('returns REASON_LABEL_DEFAULT for unknown reason code', () => {
      expect(getReasonLabelKey('no-such-reason')).toBe(REASON_LABEL_DEFAULT)
    })
  })

  describe('NODE_STATE_VARIANTS', () => {
    it('has a variant for every defined NODE_STATE', () => {
      const states = Object.values(NODE_STATE)
      for (const state of states) {
        const variant = NODE_STATE_VARIANTS[state]
        expect(variant, `Missing variant for state "${state}"`).toBeDefined()
        expect(typeof variant.fillColor).toBe('number')
        expect(typeof variant.borderColor).toBe('number')
        expect(typeof variant.borderWidth).toBe('number')
        expect(typeof variant.alpha).toBe('number')
        expect(typeof variant.textColor).toBe('number')
        expect(typeof variant.costColor).toBe('number')
      }
    })

    it('has distinct fillColor values across variants', () => {
      const variants = Object.values(NODE_STATE_VARIANTS)
      const fillColors = variants.map((v) => v.fillColor)
      const unique = new Set(fillColors)
      expect(unique.size).toBe(variants.length)
    })
  })

  describe('constants', () => {
    it('re-exports NODE_STATE from talent-node-state', () => {
      expect(NODE_STATE.PURCHASED).toBe('purchased')
      expect(NODE_STATE.AVAILABLE).toBe('available')
      expect(NODE_STATE.LOCKED).toBe('locked')
      expect(NODE_STATE.INVALID).toBe('invalid')
    })

    it('re-exports REASON_CODE from talent-node-state', () => {
      expect(REASON_CODE.NOT_ENOUGH_XP).toBe('not-enough-xp')
      expect(REASON_CODE.NODE_LOCKED).toBe('node-locked')
    })

    it('NODE_STATE_LABEL_KEYS covers all states', () => {
      const states = Object.values(NODE_STATE)
      for (const state of states) {
        expect(NODE_STATE_LABEL_KEYS[state], `Missing label key for "${state}"`).toBeDefined()
      }
    })

    it('REASON_LABEL_KEYS covers all reason codes', () => {
      const codes = Object.values(REASON_CODE)
      for (const code of codes) {
        expect(REASON_LABEL_KEYS[code], `Missing label key for "${code}"`).toBeDefined()
      }
    })

    it('REASON_LABEL_DEFAULT is a non-empty string', () => {
      expect(REASON_LABEL_DEFAULT).toBeTruthy()
      expect(typeof REASON_LABEL_DEFAULT).toBe('string')
    })
  })
})
