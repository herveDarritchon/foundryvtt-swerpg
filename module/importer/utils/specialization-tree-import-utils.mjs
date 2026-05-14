import { ImportStats } from './import-stats.mjs'

const specializationTreeStats = new ImportStats({
  missingCosts: 0,
  unresolvedTalents: 0,
  invalidConnections: 0,
  incompleteTrees: 0,
})

export function resetSpecializationTreeImportStats() {
  specializationTreeStats.reset({
    missingCosts: 0,
    unresolvedTalents: 0,
    invalidConnections: 0,
    incompleteTrees: 0,
  })
}

export function incrementSpecializationTreeImportStat(key, amount = 1) {
  specializationTreeStats.increment(key, amount)
}

export function addSpecializationTreeRejectionReason(reason) {
  specializationTreeStats.addRejectionReason(reason)
}

export function addSpecializationTreeMissingCost(detail) {
  specializationTreeStats.addDetail('missingCosts', detail, 'missingCostDetails')
}

export function addSpecializationTreeUnresolvedTalent(detail) {
  specializationTreeStats.addDetail('unresolvedTalents', detail, 'unresolvedTalentDetails')
}

export function addSpecializationTreeTalentUuidNotResolved(detail) {
  specializationTreeStats.addDetail('unresolvedTalents', detail, 'talentUuidNotResolvedDetails')
}

export function addSpecializationTreeInvalidConnection(detail) {
  specializationTreeStats.addDetail('invalidConnections', detail, 'invalidConnectionDetails')
}

export function getSpecializationTreeImportStats() {
  return specializationTreeStats.getStats()
}

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

export function normalizeSpecializationTreeId(rawKey) {
  return String(rawKey || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function normalizeNodeId(row, column) {
  if (!Number.isInteger(row) || row < 1 || !Number.isInteger(column) || column < 1) return null
  return `r${row}c${column}`
}

export function parsePositiveInteger(rawValue) {
  const parsed = Number.parseInt(rawValue, 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export function parseNonNegativeInteger(rawValue) {
  const parsed = Number.parseInt(rawValue, 10)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null
}

export function normalizeConnectionType(rawValue) {
  if (typeof rawValue !== 'string') return undefined

  const normalized = rawValue.trim().toLowerCase()
  if (!normalized) return undefined

  if (normalized === 'vertical' || normalized === 'horizontal') return normalized
  return normalized
}

export function isResolvedNodeReference(nodeId) {
  return typeof nodeId === 'string' && /^r\d+c\d+$/i.test(nodeId)
}

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
