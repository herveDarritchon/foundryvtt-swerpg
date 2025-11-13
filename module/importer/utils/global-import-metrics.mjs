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

export function markGlobalStart() {
  _runtime.globalStart = performance.now()
}

export function markGlobalEnd() {
  _runtime.globalEnd = performance.now()
}

export function markArchiveSize(size) {
  if (typeof size === 'number' && size >= 0) {
    _runtime.archiveSizeBytes = size
  }
}

export function recordDomainStart(domain) {
  _runtime.domains.set(domain, { start: performance.now(), end: 0 })
}

export function recordDomainEnd(domain) {
  const entry = _runtime.domains.get(domain)
  if (entry) {
    entry.end = performance.now()
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
export function aggregateImportMetrics() {
  const stats = getAllImportStats()
  const overallDurationMs = (_runtime.globalEnd && _runtime.globalStart) ? (_runtime.globalEnd - _runtime.globalStart) : 0
  const domains = {}
  for (const [domain, timing] of _runtime.domains.entries()) {
    domains[domain] = {
      durationMs: (timing.end && timing.start) ? (timing.end - timing.start) : 0,
    }
  }
  const errorRate = stats.totalProcessed ? stats.totalRejected / stats.totalProcessed : 0
  const itemsPerSecond = overallDurationMs > 0 ? stats.totalImported / (overallDurationMs / 1000) : 0
  return {
    overallDurationMs,
    domainsCount: Object.keys(domains).length,
    errorRate,
    archiveSizeBytes: _runtime.archiveSizeBytes,
    itemsPerSecond,
    domains,
    totalProcessed: stats.totalProcessed,
    totalRejected: stats.totalRejected,
    totalImported: stats.totalImported,
  }
}

// Alias pour compatibilité avec le plan (Task-005)
export { aggregateImportMetrics as getGlobalImportMetrics }
