import { describe, expect, it } from 'vitest'

import {
  AUDIT_SEGMENT_SIZE,
  AUDIT_VOLUME_WARN_THRESHOLD,
  buildNextSegmentedState,
  computeAuditLogMetrics,
  readAuditLogEntries,
} from '../../../module/lib/audit/storage.mjs'

/* ============================================ */
/*  readAuditLogEntries                         */
/* ============================================ */

describe('readAuditLogEntries', () => {
  it('returns empty array when flags is null', () => {
    expect(readAuditLogEntries(null)).toEqual([])
  })

  it('returns empty array when flags is undefined', () => {
    expect(readAuditLogEntries(undefined)).toEqual([])
  })

  // --- legacy flat format ---

  it('reads from legacy flat logs array', () => {
    const flags = {
      logs: [
        { type: 'skill.train', timestamp: 1 },
        { type: 'xp.grant', timestamp: 2 },
      ],
    }
    expect(readAuditLogEntries(flags)).toEqual(flags.logs)
  })

  it('returns empty array when legacy logs is missing', () => {
    expect(readAuditLogEntries({})).toEqual([])
  })

  it('returns empty array when legacy logs is not an array', () => {
    expect(readAuditLogEntries({ logs: 'bad' })).toEqual([])
  })

  it('returns a copy of the legacy array, not the same reference', () => {
    const flags = { logs: [{ type: 'skill.train' }] }
    const result = readAuditLogEntries(flags)
    expect(result).not.toBe(flags.logs)
  })

  // --- segmented format ---

  it('reads from segmented format and flattens segments in order', () => {
    const flags = {
      auditLogIndex: { totalCount: 3, segmentCount: 2, segmentSize: 2 },
      auditLogSegs: [
        [
          { type: 'skill.train', timestamp: 1 },
          { type: 'xp.grant', timestamp: 2 },
        ],
        [{ type: 'career.set', timestamp: 3 }],
      ],
    }
    const result = readAuditLogEntries(flags)
    expect(result).toHaveLength(3)
    expect(result[0].type).toBe('skill.train')
    expect(result[1].type).toBe('xp.grant')
    expect(result[2].type).toBe('career.set')
  })

  it('returns empty array when segmented segs is missing', () => {
    const flags = { auditLogIndex: { totalCount: 0, segmentCount: 0, segmentSize: 100 } }
    expect(readAuditLogEntries(flags)).toEqual([])
  })

  it('returns empty array when segmented segs is empty', () => {
    const flags = { auditLogIndex: { totalCount: 0, segmentCount: 0, segmentSize: 100 }, auditLogSegs: [] }
    expect(readAuditLogEntries(flags)).toEqual([])
  })

  it('skips non-array segments gracefully', () => {
    const flags = {
      auditLogIndex: { totalCount: 1, segmentCount: 2, segmentSize: 100 },
      auditLogSegs: [null, [{ type: 'skill.train' }]],
    }
    const result = readAuditLogEntries(flags)
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('skill.train')
  })

  it('prefers segmented format over legacy logs when both keys are present', () => {
    // This covers the migration transition window where the actor may still have
    // a residual legacy key alongside the new segmented keys.
    const flags = {
      logs: [{ type: 'OLD', timestamp: 0 }],
      auditLogIndex: { totalCount: 1, segmentCount: 1, segmentSize: 100 },
      auditLogSegs: [[{ type: 'NEW', timestamp: 1 }]],
    }
    const result = readAuditLogEntries(flags)
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('NEW')
  })
})

/* ============================================ */
/*  computeAuditLogMetrics                      */
/* ============================================ */

describe('computeAuditLogMetrics', () => {
  it('returns isEmpty=true when flags is null', () => {
    const m = computeAuditLogMetrics(null, 500)
    expect(m.isEmpty).toBe(true)
    expect(m.totalCount).toBe(0)
  })

  it('returns correct totalCount for legacy flat format', () => {
    const flags = { logs: [{ type: 'a' }, { type: 'b' }, { type: 'c' }] }
    const m = computeAuditLogMetrics(flags, 500)
    expect(m.totalCount).toBe(3)
    expect(m.isLegacyFlat).toBe(true)
    expect(m.isSegmented).toBe(false)
  })

  it('returns correct totalCount from index for segmented format', () => {
    const flags = {
      auditLogIndex: { totalCount: 150, segmentCount: 2, segmentSize: 100 },
      auditLogSegs: [new Array(100).fill({ type: 'x' }), new Array(50).fill({ type: 'y' })],
    }
    const m = computeAuditLogMetrics(flags, 500)
    expect(m.totalCount).toBe(150)
    expect(m.segmentCount).toBe(2)
    expect(m.isSegmented).toBe(true)
    expect(m.isLegacyFlat).toBe(false)
  })

  it('computes usageRatio correctly', () => {
    const flags = { logs: new Array(250).fill({ type: 'x' }) }
    const m = computeAuditLogMetrics(flags, 500)
    expect(m.usageRatio).toBeCloseTo(0.5)
    expect(m.isNearLimit).toBe(false)
  })

  it('sets isNearLimit=true when usageRatio >= AUDIT_VOLUME_WARN_THRESHOLD', () => {
    const flags = { logs: new Array(450).fill({ type: 'x' }) }
    const m = computeAuditLogMetrics(flags, 500)
    expect(m.usageRatio).toBeGreaterThanOrEqual(AUDIT_VOLUME_WARN_THRESHOLD)
    expect(m.isNearLimit).toBe(true)
  })

  it('caps usageRatio at 1 when totalCount exceeds maxEntries', () => {
    const flags = { logs: new Array(600).fill({ type: 'x' }) }
    const m = computeAuditLogMetrics(flags, 500)
    expect(m.usageRatio).toBe(1)
  })

  it('defaults maxEntries to 500 when 0 is passed', () => {
    const flags = { logs: new Array(400).fill({ type: 'x' }) }
    const m = computeAuditLogMetrics(flags, 0)
    expect(m.maxEntries).toBe(500)
    expect(m.usageRatio).toBeCloseTo(0.8)
  })

  it('reports approximatePayloadSize > 0 for non-empty journal', () => {
    const flags = { logs: [{ type: 'skill.train', timestamp: 1000 }] }
    const m = computeAuditLogMetrics(flags, 500)
    expect(m.approximatePayloadSize).toBeGreaterThan(0)
  })
})

/* ============================================ */
/*  buildNextSegmentedState                     */
/* ============================================ */

describe('buildNextSegmentedState', () => {
  // --- initial write on empty actor ---

  it('creates first segment from empty actor', () => {
    const { auditLogSegs, auditLogIndex, clearLegacy } = buildNextSegmentedState(null, [{ type: 'skill.train' }], 500)
    expect(auditLogSegs).toHaveLength(1)
    expect(auditLogSegs[0]).toHaveLength(1)
    expect(auditLogIndex.totalCount).toBe(1)
    expect(auditLogIndex.segmentCount).toBe(1)
    expect(clearLegacy).toBe(false)
  })

  it('creates first segment from empty flags object', () => {
    const { auditLogSegs, auditLogIndex } = buildNextSegmentedState({}, [{ type: 'xp.grant', timestamp: 1 }], 500)
    expect(auditLogSegs[0]).toHaveLength(1)
    expect(auditLogIndex.totalCount).toBe(1)
  })

  // --- migration from legacy flat ---

  it('migrates legacy flat format: sets clearLegacy=true', () => {
    const flags = { logs: [{ type: 'old', timestamp: 1 }] }
    const { clearLegacy } = buildNextSegmentedState(flags, [{ type: 'new', timestamp: 2 }], 500)
    expect(clearLegacy).toBe(true)
  })

  it('migrates legacy flat: preserves existing entries and appends new ones', () => {
    const flags = { logs: [{ type: 'existing', timestamp: 1 }] }
    const { auditLogSegs, auditLogIndex } = buildNextSegmentedState(flags, [{ type: 'new', timestamp: 2 }], 500)
    const all = auditLogSegs.flat()
    expect(all).toHaveLength(2)
    expect(all[0].type).toBe('existing')
    expect(all[1].type).toBe('new')
    expect(auditLogIndex.totalCount).toBe(2)
  })

  it('does not set clearLegacy when legacy logs is empty', () => {
    const flags = { logs: [] }
    const { clearLegacy } = buildNextSegmentedState(flags, [{ type: 'new' }], 500)
    expect(clearLegacy).toBe(false)
  })

  // --- FIFO retention ---

  it('enforces maxEntries ceiling: oldest entries are evicted first', () => {
    const existing = Array.from({ length: 5 }, (_, i) => ({ type: `old-${i}`, timestamp: i }))
    const flags = { auditLogIndex: { totalCount: 5, segmentCount: 1, segmentSize: 100 }, auditLogSegs: [existing] }
    const newEntries = [
      { type: 'new-0', timestamp: 10 },
      { type: 'new-1', timestamp: 11 },
    ]

    const { auditLogSegs, auditLogIndex } = buildNextSegmentedState(flags, newEntries, 5)
    const all = auditLogSegs.flat()

    expect(auditLogIndex.totalCount).toBe(5)
    expect(all).toHaveLength(5)
    // The oldest two are evicted; the remaining 3 + 2 new = 5
    expect(all[0].type).toBe('old-2')
    expect(all[3].type).toBe('new-0')
    expect(all[4].type).toBe('new-1')
  })

  it('does not evict entries when below ceiling', () => {
    const existing = [
      { type: 'a', timestamp: 1 },
      { type: 'b', timestamp: 2 },
    ]
    const flags = { auditLogIndex: { totalCount: 2, segmentCount: 1, segmentSize: 100 }, auditLogSegs: [existing] }
    const { auditLogSegs, auditLogIndex } = buildNextSegmentedState(flags, [{ type: 'c', timestamp: 3 }], 10)
    expect(auditLogIndex.totalCount).toBe(3)
    expect(auditLogSegs.flat()).toHaveLength(3)
  })

  // --- segment partitioning ---

  it('creates a new segment when the current segment reaches segmentSize', () => {
    // Fill first segment to capacity
    const firstSegment = Array.from({ length: AUDIT_SEGMENT_SIZE }, (_, i) => ({ type: `e-${i}`, timestamp: i }))
    const flags = {
      auditLogIndex: { totalCount: AUDIT_SEGMENT_SIZE, segmentCount: 1, segmentSize: AUDIT_SEGMENT_SIZE },
      auditLogSegs: [firstSegment],
    }
    const { auditLogSegs, auditLogIndex } = buildNextSegmentedState(flags, [{ type: 'overflow', timestamp: AUDIT_SEGMENT_SIZE + 1 }], 500)
    expect(auditLogIndex.segmentCount).toBe(2)
    expect(auditLogSegs).toHaveLength(2)
    expect(auditLogSegs[1]).toHaveLength(1)
    expect(auditLogSegs[1][0].type).toBe('overflow')
  })

  it('respects custom segmentSize parameter', () => {
    const { auditLogSegs } = buildNextSegmentedState(
      {},
      Array.from({ length: 10 }, (_, i) => ({ type: `e-${i}` })),
      500,
      3,
    )
    // 10 entries with segment size 3 → ceil(10/3) = 4 segments
    expect(auditLogSegs).toHaveLength(4)
    expect(auditLogSegs[0]).toHaveLength(3)
    expect(auditLogSegs[3]).toHaveLength(1)
  })

  // --- no duplication on append ---

  it('does not duplicate entries when appending to existing segmented state', () => {
    const existing = [{ type: 'first', timestamp: 1 }]
    const flags = { auditLogIndex: { totalCount: 1, segmentCount: 1, segmentSize: 100 }, auditLogSegs: [existing] }

    const result1 = buildNextSegmentedState(flags, [{ type: 'second', timestamp: 2 }], 500)
    const newFlags = { auditLogIndex: result1.auditLogIndex, auditLogSegs: result1.auditLogSegs }
    const result2 = buildNextSegmentedState(newFlags, [{ type: 'third', timestamp: 3 }], 500)

    const all = result2.auditLogSegs.flat()
    const types = all.map((e) => e.type)
    expect(types).toEqual(['first', 'second', 'third'])
  })

  // --- idempotency on empty new entries ---

  it('returns unchanged state when newEntries is empty', () => {
    const existing = [{ type: 'a' }]
    const flags = { auditLogIndex: { totalCount: 1, segmentCount: 1, segmentSize: 100 }, auditLogSegs: [existing] }
    const { auditLogSegs, auditLogIndex } = buildNextSegmentedState(flags, [], 500)
    expect(auditLogIndex.totalCount).toBe(1)
    expect(auditLogSegs.flat()).toHaveLength(1)
  })

  // --- index fields ---

  it('auditLogIndex includes totalCount, segmentCount, and segmentSize', () => {
    const { auditLogIndex } = buildNextSegmentedState(null, [{ type: 'x' }], 500)
    expect(typeof auditLogIndex.totalCount).toBe('number')
    expect(typeof auditLogIndex.segmentCount).toBe('number')
    expect(typeof auditLogIndex.segmentSize).toBe('number')
  })

  it('defaults maxEntries to 500 when 0 is passed', () => {
    const entries = Array.from({ length: 600 }, (_, i) => ({ type: `e-${i}` }))
    const { auditLogIndex } = buildNextSegmentedState(null, entries, 0)
    expect(auditLogIndex.totalCount).toBe(500)
  })
})

/* ============================================ */
/*  Module-level constants                      */
/* ============================================ */

describe('module constants', () => {
  it('AUDIT_SEGMENT_SIZE is a positive integer', () => {
    expect(AUDIT_SEGMENT_SIZE).toBeGreaterThan(0)
    expect(Number.isInteger(AUDIT_SEGMENT_SIZE)).toBe(true)
  })

  it('AUDIT_VOLUME_WARN_THRESHOLD is between 0 and 1', () => {
    expect(AUDIT_VOLUME_WARN_THRESHOLD).toBeGreaterThan(0)
    expect(AUDIT_VOLUME_WARN_THRESHOLD).toBeLessThan(1)
  })
})
