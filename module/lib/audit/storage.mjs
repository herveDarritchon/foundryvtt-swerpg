/**
 * @file module/lib/audit/storage.mjs
 *
 * Pure-domain helpers for segmented Audit Log storage on actors.
 *
 * The segmented format stores the journal as an index + ordered segment array:
 *
 *   flags.swerpg.auditLogIndex  = { totalCount, segmentCount, segmentSize }
 *   flags.swerpg.auditLogSegs   = [ [...entries], [...entries], ... ]
 *
 * Actors persisted with the legacy flat format (`flags.swerpg.logs`) are fully
 * supported: all read helpers normalise both formats into a single flat array
 * before returning, so the Foundry adapter and UI layers remain transparent.
 *
 * This module MUST NOT import Foundry globals (game, ui, Hooks, CONFIG, etc.).
 * All functions accept plain objects and return plain values or plain arrays.
 */

/* -------------------------------------------- */
/*  Constants                                   */
/* -------------------------------------------- */

/**
 * Maximum number of entries stored in a single segment.
 * Chosen so that a single-segment update payload stays well below 16 KB.
 */
export const AUDIT_SEGMENT_SIZE = 100

/**
 * Proximity threshold (as a fraction of the max) at which a volume warning
 * should be emitted. 0.9 means "90% of the configured ceiling".
 */
export const AUDIT_VOLUME_WARN_THRESHOLD = 0.9

/* -------------------------------------------- */
/*  Type definitions                            */
/* -------------------------------------------- */

/**
 * @typedef {object} AuditLogMetrics
 * @property {number} totalCount         Total number of entries stored.
 * @property {number} segmentCount       Number of segments (0 for legacy flat or empty).
 * @property {boolean} isSegmented       True when the actor uses segmented storage.
 * @property {boolean} isLegacyFlat      True when the actor uses the legacy flat array.
 * @property {boolean} isEmpty           True when no entries exist.
 * @property {number} maxEntries         Configured ceiling (passed in by caller).
 * @property {number} usageRatio         totalCount / maxEntries (0–1, capped at 1).
 * @property {boolean} isNearLimit       True when usageRatio >= AUDIT_VOLUME_WARN_THRESHOLD.
 * @property {number} approximatePayloadSize  Approximate byte count of the stored entries.
 */

/* -------------------------------------------- */
/*  Internal helpers                            */
/* -------------------------------------------- */

/**
 * Return true when the actor flags contain the segmented index key.
 * Does not validate deeper structure — just detects whether segmented format exists.
 * @param {object} actorFlags  The flags object from the actor (flags.swerpg).
 * @returns {boolean}
 */
function hasSegmentedFormat(actorFlags) {
  return actorFlags != null && 'auditLogIndex' in actorFlags
}

/**
 * Compute an approximate byte size of a value by JSON-serialising it.
 * Returns 0 when serialisation fails.
 * @param {*} value
 * @returns {number}
 */
function approximateByteSize(value) {
  try {
    return JSON.stringify(value).length
  } catch {
    return 0
  }
}

/* -------------------------------------------- */
/*  Public read helpers                         */
/* -------------------------------------------- */

/**
 * Read all audit log entries from an actor's flags, normalising both the
 * legacy flat format (`flags.swerpg.logs`) and the segmented format
 * (`flags.swerpg.auditLogSegs`) into a single flat array.
 *
 * The returned array preserves insertion order (oldest first).
 * Callers are responsible for sorting when a different order is needed.
 *
 * @param {object|null|undefined} actorFlags  The `flags.swerpg` object from an actor.
 * @returns {Array<object>}  Flat array of all stored entries.
 */
export function readAuditLogEntries(actorFlags) {
  if (!actorFlags) return []

  if (hasSegmentedFormat(actorFlags)) {
    const segments = actorFlags.auditLogSegs
    if (!Array.isArray(segments) || segments.length === 0) return []
    const result = []
    for (const segment of segments) {
      if (Array.isArray(segment)) {
        for (const entry of segment) {
          result.push(entry)
        }
      }
    }
    return result
  }

  // Legacy flat format
  const logs = actorFlags.logs
  if (!Array.isArray(logs)) return []
  return [...logs]
}

/**
 * Compute observability metrics for the audit log stored on an actor.
 *
 * @param {object|null|undefined} actorFlags  The `flags.swerpg` object.
 * @param {number} maxEntries  The configured ceiling (from auditLogMaxEntries setting).
 * @returns {AuditLogMetrics}
 */
export function computeAuditLogMetrics(actorFlags, maxEntries) {
  const isEmpty = !actorFlags
  const isSegmented = !isEmpty && hasSegmentedFormat(actorFlags)
  const isLegacyFlat = !isEmpty && !isSegmented

  let totalCount = 0
  let segmentCount = 0
  let approximatePayloadSize = 0

  if (isSegmented) {
    const index = actorFlags.auditLogIndex ?? {}
    totalCount = index.totalCount ?? 0
    segmentCount = index.segmentCount ?? 0
    approximatePayloadSize = approximateByteSize(actorFlags.auditLogSegs)
  } else if (isLegacyFlat) {
    const logs = actorFlags.logs
    totalCount = Array.isArray(logs) ? logs.length : 0
    approximatePayloadSize = approximateByteSize(logs)
  }

  const safeMax = maxEntries > 0 ? maxEntries : 500
  const usageRatio = Math.min(totalCount / safeMax, 1)
  const isNearLimit = usageRatio >= AUDIT_VOLUME_WARN_THRESHOLD

  return {
    totalCount,
    segmentCount,
    isSegmented,
    isLegacyFlat,
    isEmpty: totalCount === 0,
    maxEntries: safeMax,
    usageRatio,
    isNearLimit,
    approximatePayloadSize,
  }
}

/* -------------------------------------------- */
/*  Public write helpers                        */
/* -------------------------------------------- */

/**
 * Compute the next segmented storage state after appending new entries and
 * trimming the total to `maxEntries` (FIFO — oldest evicted first).
 *
 * This is a pure function: it takes the existing flags and the new entries,
 * and returns the complete `auditLogSegs` and `auditLogIndex` values to be
 * persisted. The caller is responsible for writing them back via `actor.update()`.
 *
 * Migration from legacy flat format is handled automatically: when the actor
 * has `flags.swerpg.logs`, the existing entries are read, migrated, and the
 * legacy key is cleared in the returned payload.
 *
 * @param {object|null|undefined} actorFlags  Current `flags.swerpg` object.
 * @param {Array<object>} newEntries           New entries to append (oldest first).
 * @param {number} maxEntries                  Maximum total entries to retain.
 * @param {number} [segmentSize=AUDIT_SEGMENT_SIZE]  Target max entries per segment.
 * @returns {{ auditLogSegs: Array<Array<object>>, auditLogIndex: object, clearLegacy: boolean }}
 */
export function buildNextSegmentedState(actorFlags, newEntries, maxEntries, segmentSize = AUDIT_SEGMENT_SIZE) {
  // 1. Aggregate all existing entries (handles both formats)
  const existing = readAuditLogEntries(actorFlags)
  const clearLegacy = !hasSegmentedFormat(actorFlags) && Array.isArray(actorFlags?.logs) && actorFlags.logs.length > 0

  // 2. Combine and enforce FIFO ceiling
  const combined = [...existing, ...newEntries]
  const safeMax = maxEntries > 0 ? maxEntries : 500
  const trimmed = combined.length > safeMax ? combined.slice(combined.length - safeMax) : combined

  // 3. Partition into segments of at most `segmentSize` entries
  const segments = []
  for (let i = 0; i < trimmed.length; i += segmentSize) {
    segments.push(trimmed.slice(i, i + segmentSize))
  }

  // 4. Build the index
  const auditLogIndex = {
    totalCount: trimmed.length,
    segmentCount: segments.length,
    segmentSize,
  }

  return { auditLogSegs: segments, auditLogIndex, clearLegacy }
}
