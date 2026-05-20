/**
 * @module module/applications/specialization-tree/types
 * @description JSDoc typedefs for the specialization tree rendering view-model.
 * These define the contract between the view-model builder and the PIXI render layer.
 */

/**
 * View-model node states for the specialization tree renderer:
 * - `locked`: Prerequisites not met or insufficient XP.
 * - `available`: Node can be purchased (talent resolved and no blocking condition).
 * - `purchased`: Node has been purchased by the actor.
 * - `unavailable`: Node cannot be purchased (invalid tree, missing specialization, etc.).
 * - `unresolved`: Talent reference could not be resolved (fallback applied).
 *
 * @typedef {'locked'|'available'|'purchased'|'unavailable'|'unresolved'} ViewNodeState
 */

/**
 * A successfully resolved talent reference.
 * @typedef {Object} ResolvedTalent
 * @property {string} name - Display name of the talent.
 * @property {string} uuid - UUID or business key identifying the talent item.
 */

/**
 * A fallback used when a talent reference cannot be resolved.
 * @typedef {Object} FallbackTalent
 * @property {string} name - Localized unknown talent name.
 * @property {string} uuid - Always `'unknown'` for fallback entries.
 */

/**
 * @typedef {ResolvedTalent|FallbackTalent} TalentRef
 */

/**
 * A normalized render node in the specialization tree view-model.
 * @typedef {Object} RenderNode
 * @property {string} nodeId - Unique node identifier within the tree.
 * @property {TalentRef} talent - Resolved talent or fallback.
 * @property {number} cost - XP cost to purchase the node.
 * @property {number} row - Grid row position (1-based).
 * @property {number} column - Grid column position (1-based).
 * @property {ViewNodeState} state - Current node state for rendering.
 * @property {{ label: string, isPurchased: boolean, isAvailable: boolean, isLocked: boolean, isUnresolved: boolean }} displayMeta - Display metadata.
 */

/**
 * A normalized render connection between two nodes.
 * @typedef {Object} RenderConnection
 * @property {string} fromNodeId - Source node ID.
 * @property {string} toNodeId - Target node ID.
 * @property {'straight'|'angled'} type - Connection line style.
 * @property {boolean} isActive - Whether the connection is active (source purchased).
 */

/**
 * @typedef {Object} RenderViewModelMetadata
 * @property {string} treeName - Display name of the tree.
 * @property {string} treeId - Unique identifier of the tree item.
 * @property {number} totalNodes - Count of render nodes.
 * @property {number} totalConnections - Count of render connections.
 */

/**
 * The complete render view-model for a specialization tree.
 * @typedef {Object} RenderViewModel
 * @property {RenderNode[]} nodes - Normalized render nodes.
 * @property {RenderConnection[]} connections - Normalized render connections.
 * @property {RenderViewModelMetadata} metadata - View-model summary metadata.
 */

export default {}
