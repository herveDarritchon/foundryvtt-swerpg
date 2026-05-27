import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  createImportSession,
  publishTalentReferences,
  resolveTalentKeysFromSession,
  resolveTalentIdFromSession,
  topologicalSort,
  buildExecutionPlan,
} from '../../module/importer/utils/import-session.mjs'

// ---- Helpers ----------------------------------------------------------------

/**
 *
 * @param id
 * @param root0
 * @param root0.dependsOn
 * @param root0.softDependsOn
 * @param root0.domain
 * @param root0.type
 */
function makePipeline(id, { dependsOn = [], softDependsOn = [], domain = id, type = id } = {}) {
  return { id, domain, type, contextBuilder: () => {}, dependsOn, softDependsOn, producesReferences: [] }
}

/**
 *
 */
function makeSession() {
  return createImportSession()
}

// ---- createImportSession ----------------------------------------------------

describe('createImportSession', () => {
  it('returns an object with all required fields', () => {
    const session = createImportSession()
    expect(session.createdByPipeline).toBeInstanceOf(Map)
    expect(session.referenceIndex.talent.byOggdudeKey).toBeInstanceOf(Map)
    expect(session.referenceIndex.talent.bySystemId).toBeInstanceOf(Map)
    expect(session.referenceIndex.specializationTree.bySpecializationId).toBeInstanceOf(Map)
    expect(Array.isArray(session.unresolvedReferences)).toBe(true)
    expect(Array.isArray(session.executionOrder)).toBe(true)
  })

  it('starts with empty indexes', () => {
    const session = createImportSession()
    expect(session.referenceIndex.talent.byOggdudeKey.size).toBe(0)
    expect(session.referenceIndex.talent.bySystemId.size).toBe(0)
    expect(session.unresolvedReferences).toHaveLength(0)
  })
})

// ---- publishTalentReferences ------------------------------------------------

describe('publishTalentReferences', () => {
  it('indexes a talent by its oggdudeKey flag', () => {
    const session = makeSession()
    publishTalentReferences(session, [{ uuid: 'Item.abc123', flags: { swerpg: { oggdudeKey: 'CONV' } }, system: {} }])
    expect(session.referenceIndex.talent.byOggdudeKey.get('CONV')).toBe('Item.abc123')
  })

  it('indexes a talent by its system.id', () => {
    const session = makeSession()
    publishTalentReferences(session, [{ uuid: 'Item.xyz', flags: {}, system: { id: 'convincing-demeanor' } }])
    expect(session.referenceIndex.talent.bySystemId.get('convincing-demeanor')).toBe('Item.xyz')
  })

  it('indexes both oggdudeKey and system.id from the same document', () => {
    const session = makeSession()
    publishTalentReferences(session, [{ uuid: 'Item.both', flags: { swerpg: { oggdudeKey: 'CONV' } }, system: { id: 'convincing-demeanor' } }])
    expect(session.referenceIndex.talent.byOggdudeKey.get('CONV')).toBe('Item.both')
    expect(session.referenceIndex.talent.bySystemId.get('convincing-demeanor')).toBe('Item.both')
  })

  it('skips documents with no uuid', () => {
    const session = makeSession()
    publishTalentReferences(session, [{ flags: { swerpg: { oggdudeKey: 'NOUID' } }, system: {} }])
    expect(session.referenceIndex.talent.byOggdudeKey.has('NOUID')).toBe(false)
  })

  it('uses _id as fallback when uuid is absent', () => {
    const session = makeSession()
    publishTalentReferences(session, [{ _id: 'fallback-id', flags: { swerpg: { oggdudeKey: 'FALL' } }, system: {} }])
    expect(session.referenceIndex.talent.byOggdudeKey.get('FALL')).toBe('fallback-id')
  })

  it('gracefully handles null and undefined entries', () => {
    const session = makeSession()
    expect(() => publishTalentReferences(session, [null, undefined, { uuid: 'Item.ok', flags: { swerpg: { oggdudeKey: 'OK' } }, system: {} }])).not.toThrow()
    expect(session.referenceIndex.talent.byOggdudeKey.get('OK')).toBe('Item.ok')
  })

  it('is a no-op when passed a non-array', () => {
    const session = makeSession()
    publishTalentReferences(session, null)
    expect(session.referenceIndex.talent.byOggdudeKey.size).toBe(0)
  })
})

// ---- resolveTalentKeysFromSession -------------------------------------------

describe('resolveTalentKeysFromSession', () => {
  let session

  beforeEach(() => {
    session = makeSession()
    // Ensure no global game leaks between tests
    if (typeof globalThis.game !== 'undefined') delete globalThis.game
  })

  afterEach(() => {
    if (typeof globalThis.game !== 'undefined') delete globalThis.game
  })

  it('resolves a key present in the session index', () => {
    session.referenceIndex.talent.byOggdudeKey.set('CONV', 'Item.conv-uuid')
    const { resolvedUUIDs, unresolvedKeys } = resolveTalentKeysFromSession(session, ['CONV'], 'BOTH')
    expect(resolvedUUIDs).toContain('Item.conv-uuid')
    expect(unresolvedKeys).toHaveLength(0)
  })

  it('records unresolved keys in session.unresolvedReferences', () => {
    const { unresolvedKeys } = resolveTalentKeysFromSession(session, ['MISSING'], 'BOTH')
    expect(unresolvedKeys).toContain('MISSING')
    expect(session.unresolvedReferences).toHaveLength(1)
    expect(session.unresolvedReferences[0]).toMatchObject({ domain: 'species', key: 'MISSING', ownerKey: 'BOTH' })
  })

  it('handles an empty keys array', () => {
    const { resolvedUUIDs, unresolvedKeys } = resolveTalentKeysFromSession(session, [], 'TEST')
    expect(resolvedUUIDs).toHaveLength(0)
    expect(unresolvedKeys).toHaveLength(0)
  })

  it('handles null keys gracefully', () => {
    const { resolvedUUIDs, unresolvedKeys } = resolveTalentKeysFromSession(session, null)
    expect(resolvedUUIDs).toHaveLength(0)
    expect(unresolvedKeys).toHaveLength(0)
  })

  it('skips empty string keys', () => {
    const { unresolvedKeys } = resolveTalentKeysFromSession(session, ['', 'VALID'], 'X')
    // '' is skipped, VALID goes to unresolved
    expect(unresolvedKeys).toContain('VALID')
    expect(unresolvedKeys).not.toContain('')
  })

  it('falls back to game.items when key is not in session', () => {
    globalThis.game = {
      items: {
        find: (fn) => {
          const fakeItem = {
            type: 'talent',
            uuid: 'Item.world-uuid',
            getFlag: (s, k) => (s === 'swerpg' && k === 'oggdudeKey' ? 'WITEM' : null),
            system: {},
            name: '',
          }
          return fn(fakeItem) ? fakeItem : undefined
        },
      },
      packs: { values: () => [] },
    }
    const { resolvedUUIDs, unresolvedKeys } = resolveTalentKeysFromSession(session, ['WITEM'], 'BOTH')
    expect(resolvedUUIDs).toContain('Item.world-uuid')
    expect(unresolvedKeys).toHaveLength(0)
  })

  it('session index takes priority over game.items for the same key', () => {
    session.referenceIndex.talent.byOggdudeKey.set('CONV', 'Item.session-uuid')
    globalThis.game = {
      items: {
        find: (fn) => {
          const fakeItem = {
            type: 'talent',
            uuid: 'Item.world-uuid',
            getFlag: (s, k) => (s === 'swerpg' && k === 'oggdudeKey' ? 'CONV' : null),
            system: {},
            name: '',
          }
          return fn(fakeItem) ? fakeItem : undefined
        },
      },
      packs: { values: () => [] },
    }
    const { resolvedUUIDs } = resolveTalentKeysFromSession(session, ['CONV'])
    expect(resolvedUUIDs).toContain('Item.session-uuid')
    expect(resolvedUUIDs).not.toContain('Item.world-uuid')
  })
})

// ---- resolveTalentIdFromSession ---------------------------------------------

describe('resolveTalentIdFromSession', () => {
  it('resolves via bySystemId (case-insensitive)', () => {
    const session = makeSession()
    session.referenceIndex.talent.bySystemId.set('convincing-demeanor', 'Item.uuid-cd')
    expect(resolveTalentIdFromSession(session, 'Convincing-Demeanor')).toBe('Item.uuid-cd')
  })

  it('resolves via byOggdudeKey when bySystemId has no match', () => {
    const session = makeSession()
    session.referenceIndex.talent.byOggdudeKey.set('CONV', 'Item.uuid-conv')
    expect(resolveTalentIdFromSession(session, 'conv')).toBe('Item.uuid-conv')
  })

  it('returns null when not found in session', () => {
    const session = makeSession()
    expect(resolveTalentIdFromSession(session, 'NOTHERE')).toBeNull()
  })

  it('returns null for falsy id', () => {
    const session = makeSession()
    expect(resolveTalentIdFromSession(session, null)).toBeNull()
    expect(resolveTalentIdFromSession(session, '')).toBeNull()
  })
})

// ---- topologicalSort --------------------------------------------------------

describe('topologicalSort', () => {
  it('sorts talent before species (hard dependency)', () => {
    const pipelines = [makePipeline('species', { dependsOn: ['talent'] }), makePipeline('talent')]
    const { sorted, hasCycle } = topologicalSort(pipelines)
    expect(hasCycle).toBe(false)
    const ids = sorted.map((p) => p.id)
    expect(ids.indexOf('talent')).toBeLessThan(ids.indexOf('species'))
  })

  it('sorts talent before specialization-tree (hard dependency)', () => {
    const pipelines = [makePipeline('specialization-tree', { dependsOn: ['talent'] }), makePipeline('talent')]
    const { sorted, hasCycle } = topologicalSort(pipelines)
    expect(hasCycle).toBe(false)
    const ids = sorted.map((p) => p.id)
    expect(ids.indexOf('talent')).toBeLessThan(ids.indexOf('specialization-tree'))
  })

  it('preserves stable order for independent pipelines', () => {
    const pipelines = [makePipeline('weapon'), makePipeline('armor'), makePipeline('gear')]
    const { sorted, hasCycle } = topologicalSort(pipelines)
    expect(hasCycle).toBe(false)
    expect(sorted.map((p) => p.id)).toEqual(['weapon', 'armor', 'gear'])
  })

  it('does not block when a soft dependency is not selected', () => {
    // specialization-tree soft depends on career, but career is not in the list
    const pipelines = [makePipeline('specialization-tree', { dependsOn: ['talent'], softDependsOn: ['career'] }), makePipeline('talent')]
    const { sorted, hasCycle } = topologicalSort(pipelines)
    expect(hasCycle).toBe(false)
    expect(sorted.map((p) => p.id)).toContain('specialization-tree')
  })

  it('detects a cycle on hard dependencies and returns hasCycle=true', () => {
    const pipelines = [makePipeline('A', { dependsOn: ['B'] }), makePipeline('B', { dependsOn: ['A'] })]
    const { hasCycle, cycleDetails } = topologicalSort(pipelines)
    expect(hasCycle).toBe(true)
    expect(cycleDetails.length).toBeGreaterThan(0)
  })

  it('handles a dependency not in the selected set (unknown dep)', () => {
    // 'talent' depends on 'career' which is not in the list → should not throw
    const pipelines = [makePipeline('talent', { dependsOn: ['career'] })]
    const { sorted, hasCycle } = topologicalSort(pipelines)
    expect(hasCycle).toBe(false)
    expect(sorted.map((p) => p.id)).toContain('talent')
  })

  it('handles an empty pipeline list', () => {
    const { sorted, hasCycle } = topologicalSort([])
    expect(hasCycle).toBe(false)
    expect(sorted).toHaveLength(0)
  })
})

// ---- buildExecutionPlan -----------------------------------------------------

describe('buildExecutionPlan', () => {
  /**
   *
   * @param entries
   */
  function makeRegistry(entries) {
    return new Map(entries.map(([domain, pipelines]) => [domain, pipelines]))
  }

  it('returns pipelines sorted by hard dependencies', () => {
    const registry = makeRegistry([
      ['talent', [makePipeline('talent')]],
      ['species', [makePipeline('species', { dependsOn: ['talent'] })]],
    ])
    const plan = buildExecutionPlan(['species', 'talent'], registry)
    const ids = plan.map((p) => p.id)
    expect(ids.indexOf('talent')).toBeLessThan(ids.indexOf('species'))
  })

  it('includes only selected domains', () => {
    const registry = makeRegistry([
      ['talent', [makePipeline('talent')]],
      ['species', [makePipeline('species', { dependsOn: ['talent'] })]],
      ['armor', [makePipeline('armor')]],
    ])
    const plan = buildExecutionPlan(['talent', 'species'], registry)
    const ids = plan.map((p) => p.id)
    expect(ids).toContain('talent')
    expect(ids).toContain('species')
    expect(ids).not.toContain('armor')
  })

  it('handles an unknown domain id without throwing', () => {
    const registry = makeRegistry([['talent', [makePipeline('talent')]]])
    expect(() => buildExecutionPlan(['talent', 'nonexistent'], registry)).not.toThrow()
  })

  it('handles empty selected domains', () => {
    const registry = makeRegistry([['talent', [makePipeline('talent')]]])
    const plan = buildExecutionPlan([], registry)
    expect(plan).toHaveLength(0)
  })

  it('deduplicates pipelines that appear in multiple domain entries', () => {
    // specialization domain has two pipelines sharing different ids
    const registry = makeRegistry([
      ['specialization', [makePipeline('specialization'), makePipeline('specialization-tree', { dependsOn: ['talent'] })]],
      ['talent', [makePipeline('talent')]],
    ])
    const plan = buildExecutionPlan(['talent', 'specialization'], registry)
    // No duplicate ids
    const ids = plan.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
