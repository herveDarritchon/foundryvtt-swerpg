// Agrégateur global des statistiques d'import OggDude
// Fournit une vue consolidée pour observabilité / logging / UI.

import { getArmorImportStats } from './armor-import-utils.mjs'
import { getWeaponImportStats } from './weapon-import-utils.mjs'
import { getGearImportStats } from './gear-import-utils.mjs'
import { getSpeciesImportStats } from './species-import-utils.mjs'
import { getCareerImportStats } from './career-import-utils.mjs'
import { getTalentImportStats } from './talent-import-utils.mjs'

// Runtime metrics (durations, sizes) – kept internal and exposed via aggregate function
const _runtime = {
  globalStart: 0,
  globalEnd: 0,
  archiveSizeBytes: 0,
  domains: new Map(), // domain -> { start:number, end:number }
  lastImportStats: null, // Préserver les stats du dernier import réussi
}

// For tests and reset scenarios we expose a reset helper so consumers (tests) can
// ensure a clean state between runs.
export function resetRuntimeMetrics(preserveLastImportStats = false) {
  _runtime.globalStart = 0
  _runtime.globalEnd = 0
  _runtime.archiveSizeBytes = 0
  _runtime.domains = new Map()
  if (!preserveLastImportStats) {
    _runtime.lastImportStats = null
  }
}

export function markGlobalStart() {
  _runtime.globalStart = typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now()
  console.debug('[GlobalMetrics] markGlobalStart called, timestamp:', _runtime.globalStart)
}

export function markGlobalEnd() {
  _runtime.globalEnd = typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now()
  const duration = _runtime.globalEnd - _runtime.globalStart
  console.debug('[GlobalMetrics] markGlobalEnd called, timestamp:', _runtime.globalEnd, 'duration:', duration)
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
 * @returns {{armor:Object,weapon:Object,gear:Object,species:Object,career:Object,talent:Object,totalImported:number,totalRejected:number,totalProcessed:number}}
 */
export function getAllImportStats() {
  const armor = safeCall(getArmorImportStats)
  const weapon = safeCall(getWeaponImportStats)
  const gear = safeCall(getGearImportStats)
  const species = safeCall(getSpeciesImportStats)
  const career = safeCall(getCareerImportStats)
  const talent = safeCall(getTalentImportStats)

  const totalProcessed = armor.total + weapon.total + gear.total + species.total + career.total + talent.total
  const totalRejected = armor.rejected + weapon.rejected + gear.rejected + species.rejected + career.rejected + talent.rejected
  const totalImported = totalProcessed - totalRejected

  return {
    armor,
    weapon,
    gear,
    species,
    career,
    talent,
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
  const currentStats = statsOverride || getAllImportStats()

  // Si les stats actuelles sont vides mais qu'on a des stats de dernier import valides, les utiliser
  const shouldUseLastImportStats = currentStats.totalImported === 0 && _runtime.lastImportStats && _runtime.lastImportStats.totalImported > 0
  const stats = shouldUseLastImportStats ? _runtime.lastImportStats : currentStats

  // Si les stats actuelles ne sont pas vides, les sauvegarder comme dernier import réussi
  if (currentStats.totalImported > 0) {
    _runtime.lastImportStats = { ...currentStats }
  }

  const hasValidGlobal = Number.isFinite(_runtime.globalEnd) && Number.isFinite(_runtime.globalStart) && _runtime.globalEnd >= _runtime.globalStart
  const overallDurationMs = hasValidGlobal ? _runtime.globalEnd - _runtime.globalStart : 0
  console.debug(
    '[GlobalMetrics] aggregateImportMetrics - globalStart:',
    _runtime.globalStart,
    'globalEnd:',
    _runtime.globalEnd,
    'hasValidGlobal:',
    hasValidGlobal,
    'overallDurationMs:',
    overallDurationMs,
    'usingLastImportStats:',
    shouldUseLastImportStats,
  )
  const domains = {}
  for (const [domain, timing] of _runtime.domains.entries()) {
    const hasValidDomain = Number.isFinite(timing?.end) && Number.isFinite(timing?.start) && timing.end >= timing.start
    domains[domain] = {
      durationMs: hasValidDomain ? timing.end - timing.start : 0,
    }
  }
  const errorRate = stats?.totalProcessed ? stats.totalRejected / stats.totalProcessed : 0
  const itemsPerSecond = overallDurationMs > 0 && stats ? stats.totalImported / (overallDurationMs / 1000) : 0
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

// ---- Format helpers (human readable) ---------------------------------

function _formatBytes(bytes, decimals = 2) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const value = bytes / Math.pow(1024, i)
  return `${value.toFixed(decimals)} ${units[i]}`
}

function _formatDurationMs(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return '0 ms'
  if (ms >= 1000) {
    const s = ms / 1000
    return `${s.toFixed(2)} s (${Math.round(ms)} ms)`
  }
  return `${Math.round(ms)} ms`
}

function _formatPercent(value, decimals = 2) {
  if (!Number.isFinite(value)) return '0%'
  return `${(value * 100).toFixed(decimals)}%`
}

function _formatNumber(value, decimals = 2) {
  if (!Number.isFinite(value)) return '0'
  return Number.isInteger(value) ? String(value) : value.toFixed(decimals)
}

/**
 * Retourne un objet contenant les mêmes métriques mais avec des champs lisibles
 * par un humain (chaînes) en complément des valeurs brutes.
 * @param {Object} rawMetrics - Résultat de `aggregateImportMetrics()`
 * @returns {Object}
 */
export function formatGlobalMetrics(rawMetrics) {
  const m = rawMetrics || aggregateImportMetrics()
  const formattedDomains = {}
  for (const [d, info] of Object.entries(m.domains || {})) {
    formattedDomains[d] = {
      durationMs: info.durationMs,
      duration: _formatDurationMs(info.durationMs),
    }
  }

  return {
    // raw values preserved
    raw: { ...m },
    // human readable
    overallDuration: _formatDurationMs(m.overallDurationMs),
    domainsCount: _formatNumber(m.domainsCount, 0),
    errorRate: _formatPercent(m.errorRate, 2),
    archiveSize: _formatBytes(m.archiveSizeBytes, 2),
    itemsPerSecond: _formatNumber(m.itemsPerSecond, 2),
    domains: formattedDomains,
    totalProcessed: _formatNumber(m.totalProcessed, 0),
    totalRejected: _formatNumber(m.totalRejected, 0),
    totalImported: _formatNumber(m.totalImported, 0),
  }
}

/**
 * Génère une chaîne multi-lignes prête à être affichée dans la sortie console/UI.
 * @param {Object} rawMetrics - Résultat de `aggregateImportMetrics()`
 * @returns {string}
 */
export function formatMetricsForDisplay(rawMetrics) {
  const f = formatGlobalMetrics(rawMetrics)
  const lines = [
    'Global Metrics',
    `Overall Duration: ${f.overallDuration}`,
    `Error Rate: ${f.errorRate}`,
    `Items / Second: ${f.itemsPerSecond}`,
    `Archive Size: ${f.archiveSize}`,
    `Total Processed: ${f.totalProcessed}`,
  ]

  const domainNames = Object.keys(f.domains || {})
  if (domainNames.length) {
    const domainLines = ['Domains:', ...domainNames.map((dn) => `  - ${dn}: ${f.domains[dn].duration}`)]
    lines.push(...domainLines)
  }

  return lines.join('\n')
}
