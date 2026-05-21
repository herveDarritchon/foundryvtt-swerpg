import { describe, expect, it } from 'vitest'

import {
  enrichNode,
  getNodeVariant,
  getReasonLabelKey,
  NODE_STATE,
  NODE_STATE_LABEL_KEYS,
  NODE_STATE_SVG_ICONS,
  NODE_STATE_VARIANTS,
  NODE_TYPE,
  NODE_TYPE_INDICATORS,
  REASON_CODE,
  REASON_LABEL_DEFAULT,
  REASON_LABEL_KEYS,
  resolveNodeType,
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
      expect(result.variant).toBe(NODE_STATE_VARIANTS[NODE_STATE.PURCHASED][NODE_TYPE.PASSIVE])
    })

    it('returns AVAILABLE state and null reasonLabel when no reasonCode', () => {
      const node = buildNode()
      const result = enrichNode(node, { state: NODE_STATE.AVAILABLE, reasonCode: '' }, localize)

      expect(result.nodeState).toBe(NODE_STATE.AVAILABLE)
      expect(result.nodeStateLabel).toBe(`[${NODE_STATE_LABEL_KEYS[NODE_STATE.AVAILABLE]}]`)
      expect(result.reasonCode).toBe('')
      expect(result.reasonLabel).toBeNull()
      expect(result.variant).toBe(NODE_STATE_VARIANTS[NODE_STATE.AVAILABLE][NODE_TYPE.PASSIVE])
    })

    it('returns LOCKED state with reason for not-enough-xp', () => {
      const node = buildNode()
      const result = enrichNode(node, { state: NODE_STATE.LOCKED, reasonCode: REASON_CODE.NOT_ENOUGH_XP }, localize)

      expect(result.nodeState).toBe(NODE_STATE.LOCKED)
      expect(result.nodeStateLabel).toBe(`[${NODE_STATE_LABEL_KEYS[NODE_STATE.LOCKED]}]`)
      expect(result.reasonCode).toBe(REASON_CODE.NOT_ENOUGH_XP)
      expect(result.reasonLabel).toBe(`[${REASON_LABEL_KEYS[REASON_CODE.NOT_ENOUGH_XP]}]`)
      expect(result.variant).toBe(NODE_STATE_VARIANTS[NODE_STATE.LOCKED][NODE_TYPE.PASSIVE])
    })

    it('returns LOCKED state with reason for node-locked (prerequisites)', () => {
      const node = buildNode()
      const result = enrichNode(node, { state: NODE_STATE.LOCKED, reasonCode: REASON_CODE.NODE_LOCKED }, localize)

      expect(result.nodeState).toBe(NODE_STATE.LOCKED)
      expect(result.reasonLabel).toBe(`[${REASON_LABEL_KEYS[REASON_CODE.NODE_LOCKED]}]`)
      expect(result.variant).toBe(NODE_STATE_VARIANTS[NODE_STATE.LOCKED][NODE_TYPE.PASSIVE])
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
        expect(result.variant).toBe(NODE_STATE_VARIANTS[NODE_STATE.INVALID][NODE_TYPE.PASSIVE])
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
      expect(result.variant).toBe(NODE_STATE_VARIANTS[NODE_STATE.INVALID][NODE_TYPE.PASSIVE])
    })

    it('falls back to INVALID state when stateResult is null', () => {
      const node = buildNode()
      const result = enrichNode(node, null, localize)

      expect(result.nodeState).toBe(NODE_STATE.INVALID)
      expect(result.reasonCode).toBeNull()
      expect(result.reasonLabel).toBeNull()
      expect(result.variant).toBe(NODE_STATE_VARIANTS[NODE_STATE.INVALID][NODE_TYPE.PASSIVE])
    })

    it('falls back to INVALID state when state is unknown', () => {
      const node = buildNode()
      const result = enrichNode(node, { state: 'bogus-state', reasonCode: null }, localize)

      expect(result.nodeState).toBe('bogus-state')
      expect(result.nodeStateLabel).toBe(`[${NODE_STATE_LABEL_KEYS[NODE_STATE.INVALID]}]`)
      expect(result.variant).toBe(NODE_STATE_VARIANTS[NODE_STATE.INVALID][NODE_TYPE.PASSIVE])
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
    it('has a variant for every defined NODE_STATE × NODE_TYPE', () => {
      const states = Object.values(NODE_STATE)
      const types = Object.values(NODE_TYPE)
      for (const state of states) {
        const variants = NODE_STATE_VARIANTS[state]
        expect(variants, `Missing variants for state "${state}"`).toBeDefined()
        for (const type of types) {
          const variant = variants[type]
          expect(variant, `Missing variant for state "${state}", type "${type}"`).toBeDefined()
          expect(typeof variant.fillColor).toBe('number')
          expect(typeof variant.borderColor).toBe('number')
          expect(typeof variant.borderWidth).toBe('number')
          expect(typeof variant.alpha).toBe('number')
          expect(typeof variant.textColor).toBe('number')
          expect(typeof variant.costColor).toBe('number')
        }
      }
    })

    it('has distinct fillColor values across variants', () => {
      const types = Object.values(NODE_TYPE)
      const fillColors = []
      for (const state of Object.values(NODE_STATE)) {
        for (const type of types) {
          fillColors.push(NODE_STATE_VARIANTS[state][type].fillColor)
        }
      }
      const unique = new Set(fillColors)
      expect(unique.size).toBe(fillColors.length)
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

  describe('NODE_TYPE', () => {
    it('defines ACTIVE as "active"', () => {
      expect(NODE_TYPE.ACTIVE).toBe('active')
    })

    it('defines PASSIVE as "passive"', () => {
      expect(NODE_TYPE.PASSIVE).toBe('passive')
    })
  })

  describe('resolveNodeType', () => {
    it('returns ACTIVE when isActive is true', () => {
      expect(resolveNodeType(true)).toBe(NODE_TYPE.ACTIVE)
    })

    it('returns PASSIVE when isActive is false', () => {
      expect(resolveNodeType(false)).toBe(NODE_TYPE.PASSIVE)
    })

    it('returns PASSIVE when isActive is undefined', () => {
      expect(resolveNodeType(undefined)).toBe(NODE_TYPE.PASSIVE)
    })

    it('returns PASSIVE when isActive is null', () => {
      expect(resolveNodeType(null)).toBe(NODE_TYPE.PASSIVE)
    })
  })

  describe('getNodeVariant', () => {
    it('returns passive variant by default when nodeType is undefined', () => {
      expect(getNodeVariant(NODE_STATE.PURCHASED, undefined))
        .toBe(NODE_STATE_VARIANTS[NODE_STATE.PURCHASED][NODE_TYPE.PASSIVE])
    })

    it('returns passive variant when nodeType is null', () => {
      expect(getNodeVariant(NODE_STATE.AVAILABLE, null))
        .toBe(NODE_STATE_VARIANTS[NODE_STATE.AVAILABLE][NODE_TYPE.PASSIVE])
    })

    it('returns active variant when nodeType is active', () => {
      expect(getNodeVariant(NODE_STATE.LOCKED, NODE_TYPE.ACTIVE))
        .toBe(NODE_STATE_VARIANTS[NODE_STATE.LOCKED][NODE_TYPE.ACTIVE])
    })

    it('returns passive variant when nodeType is passive', () => {
      expect(getNodeVariant(NODE_STATE.INVALID, NODE_TYPE.PASSIVE))
        .toBe(NODE_STATE_VARIANTS[NODE_STATE.INVALID][NODE_TYPE.PASSIVE])
    })

    it('falls back to INVALID state for unknown state', () => {
      expect(getNodeVariant('bogus-state', NODE_TYPE.PASSIVE))
        .toBe(NODE_STATE_VARIANTS[NODE_STATE.INVALID][NODE_TYPE.PASSIVE])
    })
  })

  describe('NODE_STATE_SVG_ICONS', () => {
    it('has an SVG icon path for every defined NODE_STATE', () => {
      const states = Object.values(NODE_STATE)
      for (const state of states) {
        const path = NODE_STATE_SVG_ICONS[state]
        expect(path, `Missing SVG icon for state "${state}"`).toBeDefined()
        expect(typeof path).toBe('string')
        expect(path).toMatch(/\.svg$/)
      }
    })

    it('points to existing asset files', () => {
      const states = Object.values(NODE_STATE)
      for (const state of states) {
        const path = NODE_STATE_SVG_ICONS[state]
        expect(path, `Missing SVG icon for state "${state}"`).toBeDefined()
      }
    })
  })

  describe('NODE_TYPE_INDICATORS', () => {
    it('has an entry for every defined NODE_TYPE', () => {
      const types = Object.values(NODE_TYPE)
      for (const type of types) {
        const indicator = NODE_TYPE_INDICATORS[type]
        expect(indicator, `Missing indicator for type "${type}"`).toBeDefined()
        expect(typeof indicator.icon).toBe('string')
        expect(typeof indicator.label).toBe('string')
      }
    })

    it('has distinct icons for active and passive', () => {
      const icons = Object.values(NODE_TYPE_INDICATORS).map((i) => i.icon)
      const unique = new Set(icons)
      expect(unique.size).toBe(Object.keys(NODE_TYPE_INDICATORS).length)
    })
  })

  describe('pictogram (non-color signal)', () => {
    it('every state variant has a pictogram string', () => {
      const states = Object.values(NODE_STATE)
      const types = Object.values(NODE_TYPE)
      for (const state of states) {
        for (const type of types) {
          const variant = NODE_STATE_VARIANTS[state][type]
          expect(typeof variant.pictogram, `pictogram must be a string for "${state}" type "${type}"`).toBe('string')
          expect(variant.pictogram.length, `pictogram must not be empty for "${state}" type "${type}"`).toBeGreaterThan(0)
        }
      }
    })

    it('every state variant has a pictogramColor', () => {
      const states = Object.values(NODE_STATE)
      const types = Object.values(NODE_TYPE)
      for (const state of states) {
        for (const type of types) {
          const variant = NODE_STATE_VARIANTS[state][type]
          expect(typeof variant.pictogramColor, `pictogramColor must be a number for "${state}" type "${type}"`).toBe('number')
        }
      }
    })

    it('pictograms serve as a non-color signal (each state has a distinct pictogram, shared across types)', () => {
      const states = Object.values(NODE_STATE)
      const pictograms = states.map((s) => NODE_STATE_VARIANTS[s][NODE_TYPE.PASSIVE].pictogram)
      const unique = new Set(pictograms)
      expect(unique.size).toBe(states.length)
    })
  })

  describe('enrichNode with isActive', () => {
    it('sets nodeType to active when node.isActive is true', () => {
      const node = buildNode({ isActive: true })
      const result = enrichNode(node, { state: NODE_STATE.AVAILABLE, reasonCode: '' }, localize)

      expect(result.nodeType).toBe(NODE_TYPE.ACTIVE)
      expect(result.nodeTypeIcon).toBe(NODE_TYPE_INDICATORS[NODE_TYPE.ACTIVE].icon)
    })

    it('sets nodeType to passive when node.isActive is false', () => {
      const node = buildNode({ isActive: false })
      const result = enrichNode(node, { state: NODE_STATE.AVAILABLE, reasonCode: '' }, localize)

      expect(result.nodeType).toBe(NODE_TYPE.PASSIVE)
      expect(result.nodeTypeIcon).toBe(NODE_TYPE_INDICATORS[NODE_TYPE.PASSIVE].icon)
    })

    it('sets nodeType to passive when node.isActive is undefined', () => {
      const node = buildNode()
      const result = enrichNode(node, { state: NODE_STATE.AVAILABLE, reasonCode: '' }, localize)

      expect(result.nodeType).toBe(NODE_TYPE.PASSIVE)
      expect(result.nodeTypeIcon).toBe(NODE_TYPE_INDICATORS[NODE_TYPE.PASSIVE].icon)
    })

    it('preserves isActive on the enriched node', () => {
      const node = buildNode({ isActive: true })
      const result = enrichNode(node, { state: NODE_STATE.AVAILABLE, reasonCode: '' }, localize)

      expect(result.isActive).toBe(true)
    })

    it('selects active variant when node.isActive is true', () => {
      const node = buildNode({ isActive: true })
      const result = enrichNode(node, { state: NODE_STATE.PURCHASED, reasonCode: REASON_CODE.ALREADY_PURCHASED }, localize)

      expect(result.variant).toBe(NODE_STATE_VARIANTS[NODE_STATE.PURCHASED][NODE_TYPE.ACTIVE])
    })

    it('selects passive variant when node.isActive is false', () => {
      const node = buildNode({ isActive: false })
      const result = enrichNode(node, { state: NODE_STATE.AVAILABLE, reasonCode: '' }, localize)

      expect(result.variant).toBe(NODE_STATE_VARIANTS[NODE_STATE.AVAILABLE][NODE_TYPE.PASSIVE])
    })

    it('selects passive variant when isActive is not set', () => {
      const node = buildNode()
      const result = enrichNode(node, { state: NODE_STATE.LOCKED, reasonCode: REASON_CODE.NOT_ENOUGH_XP }, localize)

      expect(result.variant).toBe(NODE_STATE_VARIANTS[NODE_STATE.LOCKED][NODE_TYPE.PASSIVE])
    })

    it('sets nodeStateSvgIconPath matching the node state', () => {
      const node = buildNode()
      const result = enrichNode(node, { state: NODE_STATE.PURCHASED, reasonCode: REASON_CODE.ALREADY_PURCHASED }, localize)

      expect(result.nodeStateSvgIconPath).toBe(NODE_STATE_SVG_ICONS[NODE_STATE.PURCHASED])
    })

    it('sets nodeStateSvgIconPath even for fallback INVALID state', () => {
      const node = buildNode()
      const result = enrichNode(node, null, localize)

      expect(result.nodeStateSvgIconPath).toBe(NODE_STATE_SVG_ICONS[NODE_STATE.INVALID])
    })
  })
})
