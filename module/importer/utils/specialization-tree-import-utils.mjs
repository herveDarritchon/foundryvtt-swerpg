import { ImportStats } from './import-stats.mjs'

const specializationTreeStats = new ImportStats({
  missingCosts: 0,
  unresolvedTalents: 0,
  invalidConnections: 0,
  incompleteTrees: 0,
})

/**
 * Reset all specialization tree import counters and detail lists to their initial zero values.
 */
export function resetSpecializationTreeImportStats() {
  specializationTreeStats.reset({
    missingCosts: 0,
    unresolvedTalents: 0,
    invalidConnections: 0,
    incompleteTrees: 0,
  })
}

/**
 * Increment a named statistic counter for the current specialization tree import run.
 * @param key
 * @param amount
 */
export function incrementSpecializationTreeImportStat(key, amount = 1) {
  specializationTreeStats.increment(key, amount)
}

/**
 * Record a rejection reason string for the current specialization tree import run.
 * @param reason
 */
export function addSpecializationTreeRejectionReason(reason) {
  specializationTreeStats.addRejectionReason(reason)
}

/**
 * Record a missing-cost detail entry for a node that could not be mapped to a cost value.
 * @param detail
 */
export function addSpecializationTreeMissingCost(detail) {
  specializationTreeStats.addDetail('missingCosts', detail, 'missingCostDetails')
}

/**
 * Record an unresolved-talent detail entry for a node whose talent could not be resolved.
 * @param detail
 */
export function addSpecializationTreeUnresolvedTalent(detail) {
  specializationTreeStats.addDetail('unresolvedTalents', detail, 'unresolvedTalentDetails')
}

/**
 * Record a detail entry for a talent node whose UUID could not be resolved to a compendium item.
 * @param detail
 */
export function addSpecializationTreeTalentUuidNotResolved(detail) {
  specializationTreeStats.addDetail('unresolvedTalents', detail, 'talentUuidNotResolvedDetails')
}

/**
 * Record an invalid-connection detail entry for a node connection that could not be resolved.
 * @param detail
 */
export function addSpecializationTreeInvalidConnection(detail) {
  specializationTreeStats.addDetail('invalidConnections', detail, 'invalidConnectionDetails')
}

/**
 * Return the accumulated statistics for the current specialization tree import run.
 */
export function getSpecializationTreeImportStats() {
  return specializationTreeStats.getStats()
}

/**
 * Merge base specialization stats with specialization-tree stats into a single combined object.
 * @param baseStats
 * @param treeStats
 */
export function getCombinedSpecializationImportStats(baseStats = {}, treeStats = {}) {
  const total = (baseStats.total || 0) + (treeStats.total || 0)
  const rejected = (baseStats.rejected || 0) + (treeStats.rejected || 0)

  return {
    ...baseStats,
    ...treeStats,
    total,
    rejected,
    imported: total - rejected,
    rejectionReasons: [...(baseStats.rejectionReasons || []), ...(treeStats.rejectionReasons || [])],
  }
}

/**
 * Normalize a raw specialization key into a lowercase hyphenated identifier.
 * @param rawKey
 */
export function normalizeSpecializationTreeId(rawKey) {
  return String(rawKey || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Build a canonical node identifier string from a positive integer row and column, returning null for invalid inputs.
 * @param row
 * @param column
 */
export function normalizeNodeId(row, column) {
  if (!Number.isInteger(row) || row < 1 || !Number.isInteger(column) || column < 1) return null
  return `r${row}c${column}`
}

/**
 * Parse a raw value as a positive integer, returning null when the result is not a positive integer.
 * @param rawValue
 */
export function parsePositiveInteger(rawValue) {
  const parsed = Number.parseInt(rawValue, 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

/**
 * Parse a raw value as a non-negative integer, returning null when the result is negative or not an integer.
 * @param rawValue
 */
export function parseNonNegativeInteger(rawValue) {
  const parsed = Number.parseInt(rawValue, 10)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null
}

/**
 * Normalize a raw connection type string to a lowercase trimmed value, returning undefined for non-string inputs.
 * @param rawValue
 */
export function normalizeConnectionType(rawValue) {
  if (typeof rawValue !== 'string') return undefined

  const normalized = rawValue.trim().toLowerCase()
  if (!normalized) return undefined

  if (normalized === 'vertical' || normalized === 'horizontal') return normalized
  return normalized
}

/**
 * Return true if the nodeId string already matches the canonical "rNcN" node reference format.
 * @param nodeId
 */
export function isResolvedNodeReference(nodeId) {
  return typeof nodeId === 'string' && /^r\d+c\d+$/i.test(nodeId)
}

/**
 * Build a diagnostics object for a specialization tree import result, combining warnings and completeness flags.
 * @param warnings
 * @param unresolved
 * @param options
 */
export function buildTreeImportDiagnostics(warnings = [], unresolved = false, options = {}) {
  const w = Array.isArray(warnings) ? [...warnings] : []
  const u = Boolean(unresolved)
  const hasNodes = options.hasNodes !== false
  const hasConnections = options.hasConnections !== false

  let status = 'valid'
  if (!hasNodes) status = 'invalid'
  else if (!hasConnections || w.length > 0 || u) status = 'incomplete'

  return { status, warnings: w, unresolved: u }
}
