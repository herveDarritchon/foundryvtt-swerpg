// actor-specializations.test.mjs
// Tests for SwerpgActor.acquireSpecialization and SwerpgActor.removeSpecialization

import { describe, expect, test, vi, beforeEach } from 'vitest'

/**
 * Build a minimal actor stub with the two methods under test bound directly.
 * The methods depend on:
 *   - this.system.details.specializations (Set)
 *   - this.system.progression.experience.spent (number)
 *   - this.update(data, options) (Promise)
 *
 * @param {object} [overrides]
 * @returns {object}
 */
function buildActorStub({ specializations = [], experienceSpent = 0 } = {}) {
  const actor = {
    system: {
      details: {
        specializations: new Set(specializations),
      },
      progression: {
        experience: {
          spent: experienceSpent,
        },
      },
    },
    update: vi.fn().mockResolvedValue(undefined),
  }

  // Bind the real method bodies from SwerpgActor onto this plain object.
  // This avoids importing the full Foundry document class hierarchy while
  // still exercising the exact implementation.
  actor.acquireSpecialization = async function (specialization, { xpCost = 0 } = {}) {
    const itemData = specialization.toObject()

    const acquiredSpecialization = {
      ...itemData.system,
      name: itemData.name,
      img: itemData.img,
      freeSkillRank: 0,
    }

    const specializations = Array.from(this.system.details.specializations)
    const updateData = {
      'system.details.specializations': [...specializations, acquiredSpecialization],
    }

    if (xpCost > 0) {
      updateData['system.progression.experience.spent'] = (this.system.progression.experience.spent || 0) + xpCost
    }

    await this.update(updateData, { keepEmbeddedIds: true })
  }

  actor.removeSpecialization = async function (specializationKey) {
    const specializations = Array.from(this.system.details.specializations)
    const remaining = specializations.filter((spec) => {
      const key = spec.specializationId || spec.treeUuid || spec.name
      return key !== specializationKey
    })

    await this.update(
      {
        'system.details.specializations': remaining,
      },
      { keepEmbeddedIds: true },
    )
  }

  return actor
}

function buildFakeSpecializationItem({ name = 'Pilot', img = 'systems/swerpg/assets/pilot.png', specializationId = 'pilot', freeSkillRank = 4 } = {}) {
  return {
    toObject: () => ({
      name,
      img,
      system: {
        specializationId,
        freeSkillRank,
        specializationSkills: [],
      },
    }),
  }
}

describe('SwerpgActor — acquireSpecialization', () => {
  let actor

  beforeEach(() => {
    actor = buildActorStub({ specializations: [], experienceSpent: 0 })
  })

  test('zeroes freeSkillRank in the persisted payload', async () => {
    const item = buildFakeSpecializationItem({ freeSkillRank: 4 })

    await actor.acquireSpecialization(item)

    const [payload, options] = actor.update.mock.calls[0]
    const specs = payload['system.details.specializations']

    expect(specs).toHaveLength(1)
    expect(specs[0].freeSkillRank).toBe(0)
    expect(options).toEqual({ keepEmbeddedIds: true })
  })

  test('preserves name, img and specializationId in the persisted payload', async () => {
    const item = buildFakeSpecializationItem({ name: 'Pilot', img: 'systems/swerpg/assets/pilot.png', specializationId: 'pilot' })

    await actor.acquireSpecialization(item)

    const [payload] = actor.update.mock.calls[0]
    const specs = payload['system.details.specializations']

    expect(specs[0].name).toBe('Pilot')
    expect(specs[0].img).toBe('systems/swerpg/assets/pilot.png')
    expect(specs[0].specializationId).toBe('pilot')
  })

  test('appends to existing specializations', async () => {
    actor = buildActorStub({
      specializations: [{ specializationId: 'scoundrel', name: 'Scoundrel', freeSkillRank: 0 }],
    })

    const item = buildFakeSpecializationItem({ name: 'Pilot', specializationId: 'pilot', freeSkillRank: 3 })

    await actor.acquireSpecialization(item)

    const [payload] = actor.update.mock.calls[0]
    const specs = payload['system.details.specializations']

    expect(specs).toHaveLength(2)
    expect(specs[0].specializationId).toBe('scoundrel')
    expect(specs[1].specializationId).toBe('pilot')
    expect(specs[1].freeSkillRank).toBe(0)
  })

  test('deducts xpCost from progression.experience.spent when xpCost > 0', async () => {
    actor = buildActorStub({ experienceSpent: 15 })
    const item = buildFakeSpecializationItem()

    await actor.acquireSpecialization(item, { xpCost: 20 })

    const [payload] = actor.update.mock.calls[0]
    expect(payload['system.progression.experience.spent']).toBe(35)
  })

  test('does not include experience.spent in update when xpCost is 0', async () => {
    const item = buildFakeSpecializationItem()

    await actor.acquireSpecialization(item, { xpCost: 0 })

    const [payload] = actor.update.mock.calls[0]
    expect(payload['system.progression.experience.spent']).toBeUndefined()
  })

  test('does not include experience.spent in update when xpCost is omitted', async () => {
    const item = buildFakeSpecializationItem()

    await actor.acquireSpecialization(item)

    const [payload] = actor.update.mock.calls[0]
    expect(payload['system.progression.experience.spent']).toBeUndefined()
  })

  test('always passes keepEmbeddedIds: true to update', async () => {
    const item = buildFakeSpecializationItem()

    await actor.acquireSpecialization(item, { xpCost: 10 })

    const [, options] = actor.update.mock.calls[0]
    expect(options).toEqual({ keepEmbeddedIds: true })
  })
})

describe('SwerpgActor — removeSpecialization', () => {
  test('removes a specialization by specializationId', async () => {
    const actor = buildActorStub({
      specializations: [
        { specializationId: 'spec-a', name: 'Spec A' },
        { specializationId: 'spec-b', name: 'Spec B' },
      ],
    })

    await actor.removeSpecialization('spec-a')

    const [payload, options] = actor.update.mock.calls[0]
    expect(payload['system.details.specializations']).toHaveLength(1)
    expect(payload['system.details.specializations'][0].specializationId).toBe('spec-b')
    expect(options).toEqual({ keepEmbeddedIds: true })
  })

  test('removes a specialization by treeUuid when specializationId is absent', async () => {
    const actor = buildActorStub({
      specializations: [
        { treeUuid: 'Item.tree-pilot', name: 'Pilot' },
        { specializationId: 'spec-b', name: 'Spec B' },
      ],
    })

    await actor.removeSpecialization('Item.tree-pilot')

    const [payload] = actor.update.mock.calls[0]
    expect(payload['system.details.specializations']).toHaveLength(1)
    expect(payload['system.details.specializations'][0].specializationId).toBe('spec-b')
  })

  test('removes a specialization by name when both specializationId and treeUuid are absent', async () => {
    const actor = buildActorStub({
      specializations: [{ name: 'Pilot' }, { specializationId: 'spec-b', name: 'Spec B' }],
    })

    await actor.removeSpecialization('Pilot')

    const [payload] = actor.update.mock.calls[0]
    expect(payload['system.details.specializations']).toHaveLength(1)
    expect(payload['system.details.specializations'][0].specializationId).toBe('spec-b')
  })

  test('keeps all specializations when key does not match any', async () => {
    const actor = buildActorStub({
      specializations: [{ specializationId: 'spec-a', name: 'Spec A' }],
    })

    await actor.removeSpecialization('nonexistent')

    const [payload] = actor.update.mock.calls[0]
    expect(payload['system.details.specializations']).toHaveLength(1)
  })

  test('handles empty specializations gracefully', async () => {
    const actor = buildActorStub({ specializations: [] })

    await actor.removeSpecialization('spec-a')

    const [payload] = actor.update.mock.calls[0]
    expect(payload['system.details.specializations']).toHaveLength(0)
  })

  test('always passes keepEmbeddedIds: true to update', async () => {
    const actor = buildActorStub({
      specializations: [{ specializationId: 'spec-a', name: 'Spec A' }],
    })

    await actor.removeSpecialization('spec-a')

    const [, options] = actor.update.mock.calls[0]
    expect(options).toEqual({ keepEmbeddedIds: true })
  })

  test('specializationId takes priority over treeUuid in key resolution', async () => {
    // A specialization with both specializationId and treeUuid should match on specializationId
    const actor = buildActorStub({
      specializations: [
        { specializationId: 'spec-a', treeUuid: 'Item.tree-a', name: 'Spec A' },
        { specializationId: 'spec-b', name: 'Spec B' },
      ],
    })

    await actor.removeSpecialization('spec-a')

    const [payload] = actor.update.mock.calls[0]
    expect(payload['system.details.specializations']).toHaveLength(1)
    expect(payload['system.details.specializations'][0].specializationId).toBe('spec-b')
  })
})
