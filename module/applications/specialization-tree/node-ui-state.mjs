/**
 * @module module/applications/specialization-tree/node-ui-state
 * @description Pure UI mapper for specialization tree node states and reason codes.
 *
 * Centralises the mapping between business-level `nodeState` / `reasonCode`
 * and their UI representations: i18n label keys, visual variant descriptors,
 * pictograms, and active/passive indicators.
 *
 * This module has Zero dependency on `game`, `ui`, `canvas`, PIXI, or Foundry.
 * The `localize` callback must be injected at call site.
 */

import { NODE_STATE, REASON_CODE } from '../../lib/talent-node/talent-node-state.mjs'

export { NODE_STATE, REASON_CODE }

/* ── Node type constants ───────────────────────────────────────── */

/** @enum {string} Talent activation type. */
export const NODE_TYPE = Object.freeze({
  ACTIVE: 'active',
  PASSIVE: 'passive',
})

/**
 * Determine the node type from the talent's isActive flag.
 * @param {boolean|undefined|null} isActive
 * @returns {string} `NODE_TYPE.ACTIVE` or `NODE_TYPE.PASSIVE`.
 */
export function resolveNodeType(isActive) {
  return isActive ? NODE_TYPE.ACTIVE : NODE_TYPE.PASSIVE
}

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
  [REASON_CODE.NODE_NOT_PURCHASED]: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.REASON.NODE_NOT_PURCHASED',
  [REASON_CODE.NODE_HAS_DEPENDENTS]: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.REASON.NODE_HAS_DEPENDENTS',
})

/** Fallback i18n key when no `reasonCode` matches a known entry. */
export const REASON_LABEL_DEFAULT = 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.REASON.UNKNOWN'

/* ── Visual variant tables ─────────────────────────────────────── */

/**
 * Per-state visual descriptors consumed by the PIXI renderer.
 *
 * Each variant carries a `pictogram` — a non-color signal that makes the
 * node state identifiable without relying only on colour perception.
 *
 * @typedef {Object} NodeVariant
 * @property {number} fillColor      - Background colour (hex integer).
 * @property {number} borderColor    - Border colour (hex integer).
 * @property {number} borderWidth    - Border thickness in pixels.
 * @property {number} alpha          - Overall node opacity.
 * @property {number} textColor      - Talent name colour.
 * @property {number} textAlpha      - Talent name opacity.
 * @property {number} costColor      - XP cost colour.
 * @property {number} costAlpha      - XP cost opacity.
 * @property {'badge'|'secondary'|'plain'} costDisplay - XP cost presentation mode.
 * @property {number|null} costBadgeFillColor - Badge background colour when `costDisplay` is `badge`.
 * @property {number|null} costBadgeBorderColor - Badge border colour when `costDisplay` is `badge`.
 * @property {string} pictogram      - Non-color state signal (rendered on the node card).
 * @property {number} pictogramColor - Colour for the pictogram glyph.
 */

const PASSIVE_NODE_VARIANTS = Object.freeze({
  [NODE_STATE.PURCHASED]: Object.freeze({
    fillColor: 0x1f4f8c,
    borderColor: 0x95c9ff,
    borderWidth: 2,
    alpha: 0.6,
    textColor: 0xffffff,
    textAlpha: 1,
    costColor: 0xb9d9ff,
    costAlpha: 0.72,
    costDisplay: 'secondary',
    costBadgeFillColor: null,
    costBadgeBorderColor: null,
    pictogram: '\u25C9',
    pictogramColor: 0x95c9ff,
  }),
  [NODE_STATE.AVAILABLE]: Object.freeze({
    fillColor: 0x21344d,
    borderColor: 0x5f85ad,
    borderWidth: 2,
    alpha: 1,
    textColor: 0xf5f9ff,
    textAlpha: 1,
    costColor: 0xffffff,
    costAlpha: 1,
    costDisplay: 'badge',
    costBadgeFillColor: 0x355a84,
    costBadgeBorderColor: 0x8cb8e8,
    pictogram: '\u25C7',
    pictogramColor: 0x8cb8e8,
  }),
  [NODE_STATE.LOCKED]: Object.freeze({
    fillColor: 0x1f2630,
    borderColor: 0x7a7a7a,
    borderWidth: 2,
    alpha: 0.6,
    textColor: 0xd7dbe2,
    textAlpha: 0.68,
    costColor: 0x999999,
    costAlpha: 1,
    costDisplay: 'plain',
    costBadgeFillColor: null,
    costBadgeBorderColor: null,
    pictogram: '\u2014',
    pictogramColor: 0x9a9a9a,
  }),
  [NODE_STATE.INVALID]: Object.freeze({
    fillColor: 0x2b1f28,
    borderColor: 0x7c4e5a,
    borderWidth: 2,
    alpha: 0.6,
    textColor: 0xf1dfe4,
    textAlpha: 1,
    costColor: 0xf1dfe4,
    costAlpha: 1,
    costDisplay: 'plain',
    costBadgeFillColor: null,
    costBadgeBorderColor: null,
    pictogram: '\u25B2',
    pictogramColor: 0xb86f82,
  }),
})

const ACTIVE_NODE_VARIANTS = Object.freeze({
  [NODE_STATE.PURCHASED]: Object.freeze({
    fillColor: 0x7a2323,
    borderColor: 0xffa2a2,
    borderWidth: 2,
    alpha: 1,
    textColor: 0xfff7f7,
    textAlpha: 1,
    costColor: 0xffc7c7,
    costAlpha: 0.72,
    costDisplay: 'secondary',
    costBadgeFillColor: null,
    costBadgeBorderColor: null,
    pictogram: '\u25C9',
    pictogramColor: 0xffb3b3,
  }),
  [NODE_STATE.AVAILABLE]: Object.freeze({
    fillColor: 0x4d2525,
    borderColor: 0xb87676,
    borderWidth: 2,
    alpha: 1,
    textColor: 0xfff5f5,
    textAlpha: 1,
    costColor: 0xffffff,
    costAlpha: 1,
    costDisplay: 'badge',
    costBadgeFillColor: 0x7a3e3e,
    costBadgeBorderColor: 0xd9a0a0,
    pictogram: '\u25C7',
    pictogramColor: 0xd9a0a0,
  }),
  [NODE_STATE.LOCKED]: Object.freeze({
    fillColor: 0x302020,
    borderColor: 0x7a7a7a,
    borderWidth: 2,
    alpha: 0.6,
    textColor: 0xe2d7d7,
    textAlpha: 0.68,
    costColor: 0x999999,
    costAlpha: 1,
    costDisplay: 'plain',
    costBadgeFillColor: null,
    costBadgeBorderColor: null,
    pictogram: '\u2014',
    pictogramColor: 0x9a9a9a,
  }),
  [NODE_STATE.INVALID]: Object.freeze({
    fillColor: 0x3c1d1d,
    borderColor: 0x8f4a4a,
    borderWidth: 2,
    alpha: 0.6,
    textColor: 0xffe8e8,
    textAlpha: 1,
    costColor: 0xffe8e8,
    costAlpha: 1,
    costDisplay: 'plain',
    costBadgeFillColor: null,
    costBadgeBorderColor: null,
    pictogram: '\u25B2',
    pictogramColor: 0xd07b7b,
  }),
})

/** @type {Readonly<Record<string, Readonly<Record<string, NodeVariant>>>>} */
export const NODE_STATE_VARIANTS = Object.freeze({
  [NODE_STATE.PURCHASED]: Object.freeze({
    [NODE_TYPE.ACTIVE]: ACTIVE_NODE_VARIANTS[NODE_STATE.PURCHASED],
    [NODE_TYPE.PASSIVE]: PASSIVE_NODE_VARIANTS[NODE_STATE.PURCHASED],
  }),
  [NODE_STATE.AVAILABLE]: Object.freeze({
    [NODE_TYPE.ACTIVE]: ACTIVE_NODE_VARIANTS[NODE_STATE.AVAILABLE],
    [NODE_TYPE.PASSIVE]: PASSIVE_NODE_VARIANTS[NODE_STATE.AVAILABLE],
  }),
  [NODE_STATE.LOCKED]: Object.freeze({
    [NODE_TYPE.ACTIVE]: ACTIVE_NODE_VARIANTS[NODE_STATE.LOCKED],
    [NODE_TYPE.PASSIVE]: PASSIVE_NODE_VARIANTS[NODE_STATE.LOCKED],
  }),
  [NODE_STATE.INVALID]: Object.freeze({
    [NODE_TYPE.ACTIVE]: ACTIVE_NODE_VARIANTS[NODE_STATE.INVALID],
    [NODE_TYPE.PASSIVE]: PASSIVE_NODE_VARIANTS[NODE_STATE.INVALID],
  }),
})

/** Maps each NODE_STATE value to its fallback SVG asset path. */
export const NODE_STATE_SVG_ICONS = Object.freeze({
  [NODE_STATE.PURCHASED]: 'assets/images/icons/sell-card.svg',
  [NODE_STATE.AVAILABLE]: 'assets/images/icons/buy-card.svg',
  [NODE_STATE.LOCKED]: 'assets/images/icons/padlock.svg',
  [NODE_STATE.INVALID]: 'assets/images/icons/hazard-sign.svg',
})

/* ── Connection visual variants ──────────────────────────────── */

/**
 * Connection visual variant categories.
 *
 * - `PURCHASED`: Link between two purchased nodes — represents an already-traversed path.
 * - `AVAILABLE`: Link from a purchased node to an available node — the immediate progression front.
 * - `LOCKED`: Link involving a locked or invalid node — progression not yet reachable.
 * - `HOVER_PREREQUISITE`: Link from a hovered node back to one of its direct prerequisites.
 * - `HOVER_UNLOCKS`: Link from a hovered node forward to a node it unlocks.
 *
 * @enum {string}
 */
export const CONNECTION_VARIANT = Object.freeze({
  PURCHASED: 'purchased',
  AVAILABLE: 'available',
  LOCKED: 'locked',
  HOVER_PREREQUISITE: 'hover-prerequisite',
  HOVER_UNLOCKS: 'hover-unlocks',
})

/**
 * Visual descriptor for a connection line between two nodes.
 *
 * @typedef {Object} ConnectionLineStyle
 * @property {number} color  - Line color (hex integer).
 * @property {number} width  - Line width in pixels.
 * @property {number} alpha  - Line opacity (0–1).
 */

/** @type {Readonly<Record<string, ConnectionLineStyle>>} */
export const CONNECTION_LINE_STYLES = Object.freeze({
  [CONNECTION_VARIANT.PURCHASED]: Object.freeze({ color: 0x95c9ff, width: 3, alpha: 0.9 }),
  [CONNECTION_VARIANT.AVAILABLE]: Object.freeze({ color: 0x5f85ad, width: 2, alpha: 0.7 }),
  [CONNECTION_VARIANT.LOCKED]: Object.freeze({ color: 0x4a4a4a, width: 1, alpha: 0.35 }),
  [CONNECTION_VARIANT.HOVER_PREREQUISITE]: Object.freeze({ color: 0xffd700, width: 3, alpha: 1.0 }),
  [CONNECTION_VARIANT.HOVER_UNLOCKS]: Object.freeze({ color: 0x88ff88, width: 3, alpha: 1.0 }),
})

/**
 * Resolve the connection visual variant from the states of the two connected nodes.
 *
 * Precendence (highest to lowest):
 *  1. If either end is in hover-prerequisite role → `HOVER_PREREQUISITE`
 *  2. If either end is in hover-unlocks role → `HOVER_UNLOCKS`
 *  3. Both purchased → `PURCHASED`
 *  4. One purchased + one available → `AVAILABLE`
 *  5. All other combinations → `LOCKED`
 *
 * @param {string} fromState NODE_STATE of the source node.
 * @param {string} toState   NODE_STATE of the target node.
 * @returns {string} One of the `CONNECTION_VARIANT` values.
 */
export function resolveConnectionVariant(fromState, toState) {
  if (fromState === NODE_STATE.PURCHASED && toState === NODE_STATE.PURCHASED) {
    return CONNECTION_VARIANT.PURCHASED
  }
  if ((fromState === NODE_STATE.PURCHASED && toState === NODE_STATE.AVAILABLE) || (fromState === NODE_STATE.AVAILABLE && toState === NODE_STATE.PURCHASED)) {
    return CONNECTION_VARIANT.AVAILABLE
  }
  return CONNECTION_VARIANT.LOCKED
}

/**
 * Resolve the hover-aware connection variant from the connection and the set of
 * hover-highlighted nodeIds.
 *
 * When a node is hovered, its direct prerequisites and direct unlockables are
 * identified by the caller. This function maps a connection to either a hover
 * variant (prerequisite / unlocks) or falls back to the nominal progression
 * variant.
 *
 * @param {string} fromNodeId Source node ID.
 * @param {string} toNodeId   Target node ID.
 * @param {string} fromState  NODE_STATE of the source node.
 * @param {string} toState    NODE_STATE of the target node.
 * @param {Set<string>} prerequisiteNodeIds NodeIds of direct prerequisites of the hovered node.
 * @param {Set<string>} unlockNodeIds       NodeIds of nodes the hovered node directly unlocks.
 * @param {string|null}  hoveredNodeId      Currently hovered node ID (or null).
 * @returns {string} One of the `CONNECTION_VARIANT` values.
 */
export function resolveHoverConnectionVariant(fromNodeId, toNodeId, fromState, toState, prerequisiteNodeIds, unlockNodeIds, hoveredNodeId) {
  if (!hoveredNodeId) return resolveConnectionVariant(fromState, toState)

  // Connection from prerequisite to hovered node
  if (prerequisiteNodeIds.has(fromNodeId) && toNodeId === hoveredNodeId) {
    return CONNECTION_VARIANT.HOVER_PREREQUISITE
  }
  // Connection from hovered node to unlocked node
  if (fromNodeId === hoveredNodeId && unlockNodeIds.has(toNodeId)) {
    return CONNECTION_VARIANT.HOVER_UNLOCKS
  }
  return resolveConnectionVariant(fromState, toState)
}

/* ── Active/passive type indicators ─────────────────────────────── */

/**
 * Active/passive type indicators rendered on each node card.
 * These are non-color visual cues that distinguish active talents
 * from passive ones.
 *
 * @typedef {Object} NodeTypeIndicator
 * @property {string} icon  - Pictogram for the talent type.
 * @property {string} label - Short label (unused in rendering, available for tooltip).
 */

/**
 * Per-type indicator descriptors consumed by the PIXI renderer.
 * @type {Readonly<Record<string, NodeTypeIndicator>>}
 */
export const NODE_TYPE_INDICATORS = Object.freeze({
  [NODE_TYPE.ACTIVE]: Object.freeze({
    icon: '\u26A1',
    label: 'Active',
  }),
  [NODE_TYPE.PASSIVE]: Object.freeze({
    icon: '\u25CB',
    label: 'Passive',
  }),
})

/* ── Icon slot paths (PXP2) ─────────────────────────────────────── */

/**
 * Icon slot paths for the three stable corner positions on each node card.
 *
 * - `topLeft`    — Active/inactive type icon (electric.svg / plain-circle.svg).
 * - `topRight`   — Primary action icon (buy-card.svg for purchase, sell-card.svg for forget).
 * - `bottomRight`— Ranked indicator icon (rank.svg when isRanked === true).
 *
 * @typedef {Object} NodeIconSlots
 * @property {string|null} topLeft    - SVG icon path for the active/passive type indicator.
 * @property {string|null} topRight   - SVG icon path for the primary action (or null).
 * @property {string|null} bottomRight - SVG icon path for the ranked indicator (or null).
 */

/** @type {string} */
export const ACTIVE_TYPE_ICON_PATH = 'assets/images/icons/electric.svg'

/** @type {string} */
export const PASSIVE_TYPE_ICON_PATH = 'assets/images/icons/plain-circle.svg'

/** @type {string} */
export const PURCHASE_ACTION_ICON_PATH = 'assets/images/icons/buy-card.svg'

/** @type {string} */
export const FORGET_ACTION_ICON_PATH = 'assets/images/icons/sell-card.svg'

/** @type {string} */
export const RANKED_ICON_PATH = 'assets/images/icons/rank.svg'

/**
 * Build the icon slot descriptor for a render node.
 *
 * Pure function — no Foundry dependencies.
 * Consumes the node's enriched properties (nodeType, isRanked) and the
 * actionable sub-view-model (primaryAction) to produce the stable three-corner
 * icon contract consumed by the PIXI renderer.
 *
 * @param {object} node - Enriched render node with `nodeType`, `isRanked`,
 *        and `actionable` (which must carry `primaryAction` if set).
 * @returns {NodeIconSlots} Icon paths for the three corner slots.
 */
export function buildIconSlots(node) {
  const nodeType = node?.nodeType ?? resolveNodeType(node?.isActive)

  const topLeft = nodeType === NODE_TYPE.ACTIVE
    ? ACTIVE_TYPE_ICON_PATH
    : PASSIVE_TYPE_ICON_PATH

  let topRight = null
  if (node.actionable?.primaryAction === 'purchase') {
    topRight = PURCHASE_ACTION_ICON_PATH
  } else if (node.actionable?.primaryAction === 'forget') {
    topRight = FORGET_ACTION_ICON_PATH
  }

  const bottomRight = node.isRanked ? RANKED_ICON_PATH : null

  return { topLeft, topRight, bottomRight }
}

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
 * Resolve the visual variant for a given node state and node type.
 * @param {string|null|undefined} state
 * @param {string|null|undefined} nodeType
 * @returns {NodeVariant}
 */
export function getNodeVariant(state, nodeType) {
  const normalizedState = NODE_STATE_VARIANTS[state] ? state : NODE_STATE.INVALID
  const normalizedType = nodeType === NODE_TYPE.ACTIVE ? NODE_TYPE.ACTIVE : NODE_TYPE.PASSIVE
  return NODE_STATE_VARIANTS[normalizedState][normalizedType]
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
 *   - `nodeType`      – `'active'` or `'passive'`.
 *   - `nodeTypeIcon`  – Type indicator icon string.
 */
export function enrichNode(node, stateResult, localize) {
  const state = stateResult?.state ?? NODE_STATE.INVALID
  const reasonCode = stateResult?.reasonCode ?? null
  const nodeType = resolveNodeType(node.isActive)

  const nodeStateLabel = localize(NODE_STATE_LABEL_KEYS[state] ?? NODE_STATE_LABEL_KEYS[NODE_STATE.INVALID])

  const reasonLabel = reasonCode ? localize(REASON_LABEL_KEYS[reasonCode] ?? REASON_LABEL_DEFAULT) : null

  const variant = getNodeVariant(state, nodeType)
  const typeIndicator = NODE_TYPE_INDICATORS[nodeType] ?? NODE_TYPE_INDICATORS[NODE_TYPE.PASSIVE]
  const nodeStateSvgIconPath = NODE_STATE_SVG_ICONS[state] ?? NODE_STATE_SVG_ICONS[NODE_STATE.INVALID]

  return {
    ...node,
    nodeState: state,
    nodeStateLabel,
    reasonCode,
    reasonLabel,
    variant,
    nodeType,
    nodeTypeIcon: typeIndicator.icon,
    nodeStateSvgIconPath,
  }
}
