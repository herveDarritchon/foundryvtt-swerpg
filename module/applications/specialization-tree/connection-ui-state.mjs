/**
 * @module module/applications/specialization-tree/connection-ui-state
 * @description Pure UI state descriptors for specialization tree connection lines.
 *
 * Defines the visual contract (color, alpha, thickness) for connection rendering
 * between talent nodes. This module is pure — it has no dependency on `game`,
 * `ui`, `canvas`, PIXI, or any Foundry runtime.
 *
 * The renderer consumes these descriptors rather than encoding hardcoded line
 * styles. Future variants (highlighted / active / inactive) are defined here.
 */

/**
 * @typedef {Object} ConnectionVisualStyle
 * @property {number} color   - Line colour as a hex integer (e.g. 0x78a9c2).
 * @property {number} alpha   - Line opacity (0..1).
 * @property {number} thickness - Line width in pixels.
 */

/**
 * Predefined connection visual styles.
 * @enum {ConnectionVisualStyle}
 */
export const CONNECTION_VISUAL_STYLES = Object.freeze({
  default: Object.freeze({
    color: 0x78a9c2,
    alpha: 0.6,
    thickness: 2,
  }),
  active: Object.freeze({
    color: 0x95c9ff,
    alpha: 0.9,
    thickness: 2,
  }),
  inactive: Object.freeze({
    color: 0x3a5a6e,
    alpha: 0.3,
    thickness: 1,
  }),
  highlighted: Object.freeze({
    color: 0xffd700,
    alpha: 0.85,
    thickness: 3,
  }),
})

/**
 * Resolve the visual style for a single connection.
 *
 * Currently returns the `default` style for all connections. Future extensions
 * may inspect connection or node state to return `active`, `inactive`, or
 * `highlighted` variants.
 *
 * @param {object} _connection - A render connection descriptor.
 * @param {Map<string, object>} [_nodeStates] - Optional node state map keyed by nodeId.
 * @returns {ConnectionVisualStyle} The visual style to apply.
 */
export function getConnectionStyle(_connection, _nodeStates) {
  return CONNECTION_VISUAL_STYLES.default
}
