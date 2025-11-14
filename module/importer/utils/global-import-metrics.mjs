// Agrégateur global des statistiques d'import OggDude
// Fournit une vue consolidée pour observabilité / logging / UI.

import { getArmorImportStats } from './armor-import-utils.mjs'
import { getWeaponImportStats } from './weapon-import-utils.mjs'
import { getGearImportStats } from './gear-import-utils.mjs'
import { getSpeciesImportStats } from './species-import-utils.mjs'
import { getCareerImportStats } from './career-import-utils.mjs'

// Runtime metrics (durations, sizes) – kept internal and exposed via aggregate function
const _runtime = {
  globalStart: 0,
  globalEnd: 0,
  archiveSizeBytes: 0,
  domains: new Map(), // domain -> { start:number, end:number }
}

// For tests and reset scenarios we expose a reset helper so consumers (tests) can
// ensure a clean state between runs.
export function resetRuntimeMetrics() {
  _runtime.globalStart = 0
  _runtime.globalEnd = 0
  _runtime.archiveSizeBytes = 0
  _runtime.domains = new Map()
}

export function markGlobalStart() {
  _runtime.globalStart = typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now()
}

export function markGlobalEnd() {
  _runtime.globalEnd = typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now()
}

export function markArchiveSize(size) {
  if (typeof size === 'number' && size >= 0) {
    _runtime.archiveSizeBytes = size
  }
}

export function recordDomainStart(domain) {
  const now = typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now()
  _runtime.domains.set(domain, { start: now, end: 0 })
}

export function recordDomainEnd(domain) {
  const entry = _runtime.domains.get(domain)
  if (entry) {
    entry.end = typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now()
  }
}

/**
 * Récupère toutes les statistiques d'import par type.
 * @returns {{armor:Object,weapon:Object,gear:Object,species:Object,career:Object,totalImported:number,totalRejected:number,totalProcessed:number}}
 */
export function getAllImportStats() {
  const armor = safeCall(getArmorImportStats)
  const weapon = safeCall(getWeaponImportStats)
  const gear = safeCall(getGearImportStats)
  const species = safeCall(getSpeciesImportStats)
  const career = safeCall(getCareerImportStats)

  const totalProcessed = armor.total + weapon.total + gear.total + species.total + career.total
  const totalRejected = armor.rejected + weapon.rejected + gear.rejected + species.rejected + career.rejected
  const totalImported = totalProcessed - totalRejected

  return {
    armor,
    weapon,
    gear,
    species,
    career,
    totalProcessed,
    totalRejected,
    totalImported,
  }
}

function safeCall(fn) {
  try {
    return fn()
  } catch {
    return { total: 0, rejected: 0, imported: 0 }
  }
}

/**
 * Agrège les métriques globales (durées, taux d'erreur, vitesse, taille archive)
 * @returns {{overallDurationMs:number, domainsCount:number, errorRate:number, archiveSizeBytes:number, itemsPerSecond:number, domains: Object<string,{durationMs:number}>, totalProcessed:number, totalRejected:number, totalImported:number}}
 */
export function aggregateImportMetrics(statsOverride) {
  const stats = statsOverride || getAllImportStats()
  const hasValidGlobal = Number.isFinite(_runtime.globalEnd) && Number.isFinite(_runtime.globalStart) && _runtime.globalEnd >= _runtime.globalStart
  const overallDurationMs = hasValidGlobal ? (_runtime.globalEnd - _runtime.globalStart) : 0
  const domains = {}
  for (const [domain, timing] of _runtime.domains.entries()) {
    const hasValidDomain = Number.isFinite(timing?.end) && Number.isFinite(timing?.start) && timing.end >= timing.start
    domains[domain] = {
      durationMs: hasValidDomain ? (timing.end - timing.start) : 0,
    }
  }
  const errorRate = stats && stats.totalProcessed ? (stats.totalRejected / stats.totalProcessed) : 0
  const itemsPerSecond = overallDurationMs > 0 && stats ? (stats.totalImported / (overallDurationMs / 1000)) : 0
  return {
    overallDurationMs,
    domainsCount: Object.keys(domains).length,
    errorRate,
    archiveSizeBytes: Number.isFinite(_runtime.archiveSizeBytes) ? _runtime.archiveSizeBytes : 0,
    itemsPerSecond,
    domains,
    totalProcessed: stats?.totalProcessed || 0,
    totalRejected: stats?.totalRejected || 0,
    totalImported: stats?.totalImported || 0,
  }
}

// Alias pour compatibilité avec le plan (Task-005)
export { aggregateImportMetrics as getGlobalImportMetrics }
