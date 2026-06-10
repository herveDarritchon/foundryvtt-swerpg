import { describe, expect, it } from 'vitest'

import { diffObligationNormalized, normalizeObligationItem } from '../../../module/lib/audit/obligation-events.mjs'

/* ============================================ */
/*  normalizeObligationItem                     */
/* ============================================ */

describe('normalizeObligationItem', () => {
  it('extracts all business fields from an obligation item', () => {
    const item = {
      id: 'obl-1',
      name: 'Debt',
      system: {
        value: 10,
        campaignDelta: 2,
        extraXp: 5,
        extraCredits: 1000,
        isExtra: true,
        transformedTo: null,
        campaignNote: 'some note',
        description: '<p>Some HTML</p>',
      },
    }
    const norm = normalizeObligationItem(item)
    expect(norm).toEqual({
      obligationId: 'obl-1',
      obligationName: 'Debt',
      value: 10,
      campaignDelta: 2,
      extraXp: 5,
      extraCredits: 1000,
      isExtra: true,
      transformedTo: null,
      campaignNote: 'some note',
      hasDescription: true,
    })
  })

  it('hasDescription is true when description is non-empty HTML', () => {
    const item = { id: 'obl-1', name: 'X', system: { description: '<p>text</p>' } }
    expect(normalizeObligationItem(item).hasDescription).toBe(true)
  })

  it('hasDescription is false when description is empty string', () => {
    const item = { id: 'obl-1', name: 'X', system: { description: '' } }
    expect(normalizeObligationItem(item).hasDescription).toBe(false)
  })

  it('hasDescription is false when description is whitespace only', () => {
    const item = { id: 'obl-1', name: 'X', system: { description: '   ' } }
    expect(normalizeObligationItem(item).hasDescription).toBe(false)
  })

  it('hasDescription is false when description is undefined', () => {
    const item = { id: 'obl-1', name: 'X', system: {} }
    expect(normalizeObligationItem(item).hasDescription).toBe(false)
  })

  it('does not expose raw HTML in any field', () => {
    const item = { id: 'obl-1', name: 'X', system: { description: '<script>alert("xss")</script>' } }
    const norm = normalizeObligationItem(item)
    const serialized = JSON.stringify(norm)
    expect(serialized).not.toContain('<script>')
  })

  it('falls back to defaults when system is empty', () => {
    const item = { id: 'obl-1', name: 'Empty', system: {} }
    const norm = normalizeObligationItem(item)
    expect(norm.value).toBe(0)
    expect(norm.campaignDelta).toBe(0)
    expect(norm.extraXp).toBe(0)
    expect(norm.extraCredits).toBe(0)
    expect(norm.isExtra).toBe(false)
    expect(norm.transformedTo).toBeNull()
    expect(norm.campaignNote).toBeNull()
    expect(norm.hasDescription).toBe(false)
  })

  it('handles null item gracefully', () => {
    const norm = normalizeObligationItem(null)
    expect(norm.obligationId).toBeNull()
    expect(norm.obligationName).toBeNull()
    expect(norm.value).toBe(0)
  })
})

/* ============================================ */
/*  diffObligationNormalized                    */
/* ============================================ */

describe('diffObligationNormalized', () => {
  function baseNorm(overrides = {}) {
    return {
      obligationId: 'obl-1',
      obligationName: 'Debt',
      value: 10,
      campaignDelta: 0,
      extraXp: 0,
      extraCredits: 0,
      isExtra: false,
      transformedTo: null,
      campaignNote: null,
      hasDescription: false,
      ...overrides,
    }
  }

  it('returns no business change when all fields are identical', () => {
    const diff = diffObligationNormalized(baseNorm(), baseNorm())
    expect(diff.hasBusinessChange).toBe(false)
  })

  it('detects value change', () => {
    const diff = diffObligationNormalized(baseNorm({ value: 10 }), baseNorm({ value: 15 }))
    expect(diff.valueChanged).toBe(true)
    expect(diff.hasBusinessChange).toBe(true)
  })

  it('detects campaignDelta change', () => {
    const diff = diffObligationNormalized(baseNorm({ campaignDelta: 0 }), baseNorm({ campaignDelta: 5 }))
    expect(diff.campaignDeltaChanged).toBe(true)
    expect(diff.hasBusinessChange).toBe(true)
  })

  it('detects extraXp change', () => {
    const diff = diffObligationNormalized(baseNorm({ extraXp: 0 }), baseNorm({ extraXp: 5 }))
    expect(diff.extraXpChanged).toBe(true)
    expect(diff.hasBusinessChange).toBe(true)
  })

  it('detects extraCredits change', () => {
    const diff = diffObligationNormalized(baseNorm({ extraCredits: 0 }), baseNorm({ extraCredits: 1000 }))
    expect(diff.extraCreditsChanged).toBe(true)
    expect(diff.hasBusinessChange).toBe(true)
  })

  it('detects isExtra change', () => {
    const diff = diffObligationNormalized(baseNorm({ isExtra: false }), baseNorm({ isExtra: true }))
    expect(diff.isExtraChanged).toBe(true)
    expect(diff.hasBusinessChange).toBe(true)
  })

  it('detects transformedTo change', () => {
    const diff = diffObligationNormalized(baseNorm({ transformedTo: null }), baseNorm({ transformedTo: 'resolved' }))
    expect(diff.transformedToChanged).toBe(true)
    expect(diff.hasBusinessChange).toBe(true)
  })

  it('detects campaignNote change', () => {
    const diff = diffObligationNormalized(baseNorm({ campaignNote: null }), baseNorm({ campaignNote: 'Paid off half' }))
    expect(diff.campaignNoteChanged).toBe(true)
    expect(diff.hasBusinessChange).toBe(true)
  })

  it('detects description presence change (empty → non-empty)', () => {
    const diff = diffObligationNormalized(baseNorm({ hasDescription: false }), baseNorm({ hasDescription: true }))
    expect(diff.descriptionChanged).toBe(true)
    expect(diff.hasBusinessChange).toBe(true)
  })

  it('detects description presence change (non-empty → empty)', () => {
    const diff = diffObligationNormalized(baseNorm({ hasDescription: true }), baseNorm({ hasDescription: false }))
    expect(diff.descriptionChanged).toBe(true)
    expect(diff.hasBusinessChange).toBe(true)
  })

  it('does not flag description change when presence did not change', () => {
    const diff = diffObligationNormalized(baseNorm({ hasDescription: true }), baseNorm({ hasDescription: true }))
    expect(diff.descriptionChanged).toBe(false)
  })

  it('returns false for valueChanged when only a non-value field changes', () => {
    const diff = diffObligationNormalized(baseNorm({ value: 10 }), baseNorm({ value: 10, campaignDelta: 3 }))
    expect(diff.valueChanged).toBe(false)
    expect(diff.campaignDeltaChanged).toBe(true)
  })
})
