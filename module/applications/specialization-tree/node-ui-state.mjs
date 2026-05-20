/**
 * @module module/applications/specialization-tree/node-ui-state
 * @description Pure UI mapper for specialization tree node states and reason codes.
 *
 * Centralises the mapping between business-level `nodeState` / `reasonCode`
 * and their UI representations: i18n label keys, visual variant descriptors.
 *
 * This module has Zero dependency on `game`, `ui`, `canvas`, PIXI, or Foundry.
 * The `localize` callback must be injected at call site.
 */

import { NODE_STATE, REASON_CODE } from '../../lib/talent-node/talent-node-state.mjs'

export { NODE_STATE, REASON_CODE }

/* ── i18n label key tables ─────────────────────────────────────── */

/** Maps each NODE_STATE value to its i18n label key. */
export const NODE_STATE_LABEL_KEYS = Object.freeze({
  [NODE_STATE.PURCHASED]: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.NODE_STATE.PURCHASED',
  [NODE_STATE.AVAILABLE]: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.NODE_STATE.AVAILABLE',
  [NODE_STATE.LOCKED]: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.NODE_STATE.LOCKED',
  [NODE_STATE.INVALID]: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.NODE_STATE.INVALID',
})

/** Maps each REASON_CODE value to its i18n label key. */
export const REASON_LABEL_KEYS = Object.freeze({
  [REASON_CODE.ALREADY_PURCHASED]: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.REASON.ALREADY_PURCHASED',
  [REASON_CODE.SPECIALIZATION_NOT_OWNED]: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.REASON.SPECIALIZATION_NOT_OWNED',
  [REASON_CODE.TREE_NOT_FOUND]: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.REASON.TREE_NOT_FOUND',
  [REASON_CODE.TREE_INCOMPLETE]: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.REASON.TREE_INCOMPLETE',
  [REASON_CODE.NODE_NOT_FOUND]: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.REASON.NODE_NOT_FOUND',
  [REASON_CODE.NODE_INVALID]: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.REASON.NODE_INVALID',
  [REASON_CODE.NODE_LOCKED]: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.REASON.NODE_LOCKED',
  [REASON_CODE.NOT_ENOUGH_XP]: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.REASON.NOT_ENOUGH_XP',
})

/** Fallback i18n key when no `reasonCode` matches a known entry. */
export const REASON_LABEL_DEFAULT = 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.REASON.UNKNOWN'

/* ── Visual variant tables ─────────────────────────────────────── */

/**
 * Per-state visual descriptors consumed by the PIXI renderer.
 *
 * @typedef {Object} NodeVariant
 * @property {number} fillColor   - Background colour (hex integer).
 * @property {number} borderColor - Border colour (hex integer).
 * @property {number} borderWidth - Border thickness in pixels.
 * @property {number} alpha       - Overall node opacity.
 * @property {number} textColor   - Talent name colour.
 * @property {number} costColor   - XP cost colour.
 */

/** @type {Readonly<Record<string, NodeVariant>>} */
export const NODE_STATE_VARIANTS = Object.freeze({
  [NODE_STATE.PURCHASED]: Object.freeze({
    fillColor: 0x1a3a2a,
    borderColor: 0x4a9a6a,
    borderWidth: 2,
    alpha: 1,
    textColor: 0xcccccc,
    costColor: 0x88bb88,
  }),
  [NODE_STATE.AVAILABLE]: Object.freeze({
    fillColor: 0x1a2c44,
    borderColor: 0x78a9c2,
    borderWidth: 2,
    alpha: 1,
    textColor: 0xffffff,
    costColor: 0xcccccc,
  }),
  [NODE_STATE.LOCKED]: Object.freeze({
    fillColor: 0x222222,
    borderColor: 0x555555,
    borderWidth: 1,
    alpha: 0.7,
    textColor: 0x888888,
    costColor: 0x666666,
  }),
  [NODE_STATE.INVALID]: Object.freeze({
    fillColor: 0x3a1a1a,
    borderColor: 0x8a3333,
    borderWidth: 2,
    alpha: 1,
    textColor: 0xaaaaaa,
    costColor: 0xaa6666,
  }),
})

/* ── Pure UI mapping functions ──────────────────────────────────── */

/**
 * Resolve the i18n label key for a given reason code.
 * @param {string|null|undefined} reasonCode Business reason code.
 * @returns {string} i18n key (never null — falls back to `REASON_LABEL_DEFAULT`).
 */
export function getReasonLabelKey(reasonCode) {
  if (!reasonCode) return REASON_LABEL_DEFAULT
  return REASON_LABEL_KEYS[reasonCode] ?? REASON_LABEL_DEFAULT
}

/**
 * Enrich a bare render node with UI-ready properties derived from its business state.
 *
 * This function is ***pure***: it does not access `game.i18n`, `ui`, or any
 * Foundry global. Localisation is deferred to the injected `localize` callback.
 *
 * @param {object} node The bare render node (must NOT already carry UI properties).
 * @param {{ state: string, reasonCode?: string|null }|null|undefined} stateResult
 *        The business state result from `getTreeNodesStates()`.
 * @param {(key: string) => string} localize i18n localize function (e.g. `game.i18n.localize`).
 * @returns {object} A new object with all original node properties plus:
 *   - `nodeState`     – Normalised state string.
 *   - `nodeStateLabel`– Localised state label.
 *   - `reasonCode`    – Reason code (or `null`).
 *   - `reasonLabel`   – Localised reason label (or `null` when no reason).
 *   - `variant`       – Visual variant descriptor for the state.
 */
export function enrichNode(node, stateResult, localize) {
  const state = stateResult?.state ?? NODE_STATE.INVALID
  const reasonCode = stateResult?.reasonCode ?? null

  const nodeStateLabel = localize(NODE_STATE_LABEL_KEYS[state] ?? NODE_STATE_LABEL_KEYS[NODE_STATE.INVALID])

  const reasonLabel = reasonCode ? localize(REASON_LABEL_KEYS[reasonCode] ?? REASON_LABEL_DEFAULT) : null

  const variant = NODE_STATE_VARIANTS[state] ?? NODE_STATE_VARIANTS[NODE_STATE.INVALID]

  return {
    ...node,
    nodeState: state,
    nodeStateLabel,
    reasonCode,
    reasonLabel,
    variant,
  }
}
