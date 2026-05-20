import { describe, expect, it } from 'vitest'

import { selectDefaultTreeKey } from '../../../module/lib/specialization-tree/default-tree-selector.mjs'

describe('selectDefaultTreeKey', () => {
  it('selects the last available entry when no selectedKey is given', () => {
    const entries = [
      { key: 'A', isAvailable: true },
      { key: 'B', isAvailable: true },
    ]
    expect(selectDefaultTreeKey(entries)).toBe('B')
  })

  it('returns the only available entry', () => {
    const entries = [{ key: 'A', isAvailable: true }]
    expect(selectDefaultTreeKey(entries)).toBe('A')
  })

  it('ignores non-available entries when falling back', () => {
    const entries = [
      { key: 'A', isAvailable: true },
      { key: 'B', isAvailable: false },
    ]
    expect(selectDefaultTreeKey(entries)).toBe('A')
  })

  it('returns null when no entry is available', () => {
    const entries = [
      { key: 'A', isAvailable: false },
      { key: 'B', isAvailable: false },
    ]
    expect(selectDefaultTreeKey(entries)).toBeNull()
  })

  it('honors selectedKey when it matches an available entry', () => {
    const entries = [
      { key: 'A', isAvailable: true },
      { key: 'B', isAvailable: true },
    ]
    expect(selectDefaultTreeKey(entries, 'A')).toBe('A')
  })

  it('returns null when selectedKey matches but entry is not available', () => {
    const entries = [{ key: 'A', isAvailable: false }]
    expect(selectDefaultTreeKey(entries, 'A')).toBeNull()
  })

  it('returns null for an empty array', () => {
    expect(selectDefaultTreeKey([])).toBeNull()
  })

  it('falls back to last available when selectedKey does not exist in entries', () => {
    const entries = [{ key: 'A', isAvailable: true }]
    expect(selectDefaultTreeKey(entries, 'nonexistent')).toBe('A')
  })

  it('prefers selectedKey over last available when both are available', () => {
    const entries = [
      { key: 'A', isAvailable: true },
      { key: 'B', isAvailable: true },
    ]
    expect(selectDefaultTreeKey(entries, 'A')).toBe('A')
  })

  it('returns null when selectedKey is null and entry is not available', () => {
    const entries = [{ key: 'A', isAvailable: false }]
    expect(selectDefaultTreeKey(entries, null)).toBeNull()
  })
})
