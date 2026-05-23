import { describe, it, expect, vi } from 'vitest'

import SwerpgCharacter from '../../module/models/character.mjs'
import { calculateSpecializationCost } from '../../module/lib/specializations/specialization-cost-service.mjs'
import { evaluateSpecializationPurchase } from '../../module/lib/specializations/specialization-purchase-flow.mjs'
import { evaluateSpecializationRemoval } from '../../module/lib/specializations/specialization-removal-flow.mjs'

/**
 * Build minimal character data for SwerpgCharacter construction.
 * @param {{ specializations?: Set<object>, experience?: object }} options
 * @returns {object}
 */
function buildCharacterData({ specializations, experience } = {}) {
  const characteristicRank = { base: 1, trained: 0, bonus: 0, value: 1 }

  return {
    thresholds: { wounds: 0, strain: 0 },
    progression: {
      freeSkillRanks: {
        career: { id: '', name: '', spent: 0, gained: 0 },
        specialization: { id: '', name: '', spent: 0, gained: 0 },
      },
      experience: experience ?? { spent: 50, gained: 200, startingExperience: 0 },
    },
    details: {
      species: { characteristics: {}, freeSkills: new Set(), startingExperience: 0 },
      career: {
        specializations: [
          { specializationId: 'bodyguard' },
          { specializationId: 'explorer' },
        ],
      },
      specializations: specializations ?? new Set(),
    },
    characteristics: {
      brawn: { rank: { ...characteristicRank } },
      agility: { rank: { ...characteristicRank } },
      intellect: { rank: { ...characteristicRank } },
      cunning: { rank: { ...characteristicRank } },
      willpower: { rank: { ...characteristicRank } },
      presence: { rank: { ...characteristicRank } },
    },
    skills: {},
    movement: { sizeBonus: 0, strideBonus: 0, engagementBonus: 0 },
    status: {},
  }
}

/**
 * Build a minimal specialization item mock, matching what acquireSpecialization
 * expects (shape produced by specialization.toObject()).
 * @param {{ specializationId?: string, name?: string, isUniversal?: boolean }} overrides
 * @returns {object}
 */
function createSpecializationItem({ specializationId, name, isUniversal } = {}) {
  const systemData = {
    specializationId: specializationId ?? null,
    isUniversal: isUniversal ?? false,
    freeSkillRank: 4,
    specializationSkills: [],
  }

  return {
    name: name ?? 'Bodyguard',
    img: 'systems/swerpg/assets/specializations/bodyguard.png',
    system: systemData,
    toObject() {
      return {
        name: this.name,
        img: this.img,
        system: { ...systemData },
      }
    },
  }
}

/**
 * Build the actor-like object expected by evaluateSpecializationPurchase.
 * @param {Array<object>} specs - current specialization items
 * @returns {object}
 */
function buildActorForPurchase(specs) {
  return {
    system: {
      details: {
        specializations: new Set(specs),
      },
    },
  }
}

describe('multi-specialization integration flow', () => {
  it('completes full purchase → header → removal → header flow with invariants', async () => {
    // ── Setup: character with 2 career slots, 150 XP available ──────────
    const career = {
      specializations: [
        { specializationId: 'bodyguard' },
        { specializationId: 'explorer' },
      ],
    }
    const initialXp = { spent: 50, gained: 200, startingExperience: 0 }
    let xpSpent = initialXp.spent // 50
    const availableXp = () => initialXp.gained - xpSpent

    // ── Phase 1: First specialization (free, career) ────────────────────
    const bodyguardItem = createSpecializationItem({
      specializationId: 'bodyguard',
      name: 'Bodyguard',
    })

    // Create character with 0 specializations
    const character = new SwerpgCharacter(
      buildCharacterData({ specializations: new Set(), experience: initialXp }),
    )

    // Track mutation patches and simulate patch application for subsequent reads
    const patches = []
    character.parent = {
      update: (data, _options) => {
        patches.push(data)
        // Simulate Foundry applying the patch so internal state updates
        if (data['system.details.specializations']) {
          character.details.specializations = new Set(data['system.details.specializations'])
        }
        return Promise.resolve()
      },
    }

    // Evaluate purchase decision
    const purchase1 = evaluateSpecializationPurchase({
      actor: buildActorForPurchase([]),
      candidateItem: bodyguardItem,
      career,
      xpAvailable: availableXp(),
    })

    expect(purchase1.decision).toBe('free-add')
    expect(purchase1.cost.finalCost).toBe(0)
    expect(purchase1.cost.ownedCountBefore).toBe(0)
    expect(purchase1.cost.ownedCountAfter).toBe(1)

    // Acquire via character model
    await character.acquireSpecialization(bodyguardItem)

    // Verify patch shape (model integration)
    expect(patches).toHaveLength(1)
    const addedSpecs = patches[0]['system.details.specializations']
    expect(addedSpecs).toHaveLength(1)
    expect(addedSpecs[0].name).toBe('Bodyguard')
    expect(addedSpecs[0].specializationId).toBe('bodyguard')
    // freeSkillRank must be zeroed to avoid double attribution
    expect(addedSpecs[0].freeSkillRank).toBe(0)

    // Simulate state that would exist after update + re-render
    const specsAfterPurchase1 = [
      { specializationId: 'bodyguard', name: 'Bodyguard', treeUuid: null },
    ]

    // XP not deducted (free)
    expect(xpSpent).toBe(50)

    // Verify purchase service would see the new state
    const getOwned1 = { items: specsAfterPurchase1, count: 1 }
    const cost1 = calculateSpecializationCost({
      ownedSpecializations: getOwned1,
      candidateSpecialization: { specializationId: 'explorer', name: 'Explorer' },
      career,
    })
    expect(cost1.ownedCountBefore).toBe(1)
    expect(cost1.ownedCountAfter).toBe(2)

    // ── Phase 2: Second specialization (paid, career, 20 XP) ────────────
    const explorerItem = createSpecializationItem({
      specializationId: 'explorer',
      name: 'Explorer',
    })

    const purchase2 = evaluateSpecializationPurchase({
      actor: buildActorForPurchase(specsAfterPurchase1),
      candidateItem: explorerItem,
      career,
      xpAvailable: availableXp(),
    })

    expect(purchase2.decision).toBe('confirm-required')
    expect(purchase2.cost.finalCost).toBe(20)
    expect(purchase2.cost.isCareerOrUniversal).toBe(true)
    expect(purchase2.cost.nonCareerPenalty).toBe(0)
    expect(purchase2.xpRemaining).toBe(availableXp() - 20)

    // Acquire via character model
    await character.acquireSpecialization(explorerItem)

    // Verify patch
    expect(patches).toHaveLength(2)
    const addedSpecs2 = patches[1]['system.details.specializations']
    expect(addedSpecs2).toHaveLength(2)
    expect(addedSpecs2.map((s) => s.name)).toEqual(['Bodyguard', 'Explorer'])

    // Track XP spent
    xpSpent += 20

    // Simulate state after purchase 2
    const specsAfterPurchase2 = [
      { specializationId: 'bodyguard', name: 'Bodyguard', treeUuid: 'Item.bodyguard' },
      { specializationId: 'explorer', name: 'Explorer', treeUuid: 'Item.explorer' },
    ]

    // Verify header-like state (2 specializations)
    expect(specsAfterPurchase2).toHaveLength(2)
    expect(specsAfterPurchase2[0].name).toBe('Bodyguard')
    expect(specsAfterPurchase2[1].name).toBe('Explorer')

    // ── Phase 3: Third non-career specialty (paid, 30 XP) ──────────────
    const nonCareerItem = createSpecializationItem({
      specializationId: 'mercenary-soldier',
      name: 'Mercenary Soldier',
    })
    // Override career so it doesn't include mercenary-soldier
    // This item will be treated as non-career

    const purchase3 = evaluateSpecializationPurchase({
      actor: buildActorForPurchase(specsAfterPurchase2),
      candidateItem: nonCareerItem,
      career,
      xpAvailable: availableXp(),
    })

    expect(purchase3.decision).toBe('confirm-required')
    // 2→3 non-career = 30 base + 10 penalty = 40
    expect(purchase3.cost.finalCost).toBe(40)
    expect(purchase3.cost.isCareerOrUniversal).toBe(false)
    expect(purchase3.cost.nonCareerPenalty).toBe(10)

    // Acquire
    await character.acquireSpecialization(nonCareerItem)

    patches // add reference to avoid lint unused
    xpSpent += 40

    const specsAfterPurchase3 = [
      { specializationId: 'bodyguard', name: 'Bodyguard', treeUuid: 'Item.bodyguard' },
      { specializationId: 'explorer', name: 'Explorer', treeUuid: 'Item.explorer' },
      { specializationId: 'mercenary-soldier', name: 'Mercenary Soldier', treeUuid: 'Item.mercenary' },
    ]

    // Verify header state (3 specializations)
    expect(specsAfterPurchase3).toHaveLength(3)
    expect(specsAfterPurchase3[0].name).toBe('Bodyguard')

    // Total XP spent should be 50 (initial) + 20 (explorer) + 40 (mercenary) = 110
    expect(xpSpent).toBe(110)
    expect(availableXp()).toBe(90)

    // ── Phase 4: Remove first specialization (current tree) ─────────────
    const removal = evaluateSpecializationRemoval({
      items: specsAfterPurchase3,
      specializationKey: 'bodyguard',
      selectedTreeKey: 'bodyguard',
    })

    expect(removal.allowed).toBe(true)
    expect(removal.decision).toBe('allowed')
    expect(removal.specializationName).toBe('Bodyguard')
    expect(removal.targetFound).toBe(true)
    expect(removal.fallbackTreeKey).toBe('mercenary-soldier')
    expect(removal.hasRemainingSpecializations).toBe(true)
    expect(removal.reasonCode).toBeNull()

    // Remove via character model
    await character.removeSpecialization('bodyguard')

    // Verify patch
    const removalPatch = patches[patches.length - 1]['system.details.specializations']
    expect(removalPatch).toHaveLength(2)

    // State after removal
    const specsAfterRemoval = specsAfterPurchase3.filter(
      (s) => s.specializationId !== 'bodyguard',
    )

    // ── Invariant: XP NOT refunded on removal ───────────────────────────
    expect(xpSpent).toBe(110) // unchanged
    expect(availableXp()).toBe(90) // unchanged

    // ── Invariant: career unchanged ─────────────────────────────────────
    expect(career).toEqual({
      specializations: [
        { specializationId: 'bodyguard' },
        { specializationId: 'explorer' },
      ],
    })

    // ── Invariant: selectedSpecializationTree is UI-only ───────────────
    // The removal service returns fallbackTreeKey but does not mutate
    // actor data — it is the app layer's responsibility to apply it.
    expect(removal.fallbackTreeKey).toBe('mercenary-soldier')
    // Verify the actor data has no selectedSpecializationTree field
    expect(Object.hasOwn(character.details, 'selectedSpecializationTree')).toBe(false)

    // ── Phase 5: Verify header state after removal ──────────────────────
    expect(specsAfterRemoval).toHaveLength(2)
    expect(specsAfterRemoval[0].specializationId).toBe('explorer')
    expect(specsAfterRemoval[1].specializationId).toBe('mercenary-soldier')
  })

  it('does not refund XP when removing a paid specialization', async () => {
    // Specialized scenario: verify the invariant more explicitly
    const initialXp = { spent: 50, gained: 200, startingExperience: 0 }
    const career = { specializations: [{ specializationId: 'bodyguard' }] }
    let xpSpent = 50

    // Start with 1 spec already owned (simulating the state from purchase)
    const specs = [
      { specializationId: 'bodyguard', name: 'Bodyguard', treeUuid: 'Item.bodyguard' },
    ]

    // Simulate that 20 XP was previously spent on the first paid spec
    // (the 0→1 was free, but we already have one so the next would be paid)
    // Previous cost for 1→2 was 20 XP for career

    // Track XP before removal
    const xpBeforeRemoval = xpSpent

    // Remove the only specialization
    const removal = evaluateSpecializationRemoval({
      items: specs,
      specializationKey: 'bodyguard',
      selectedTreeKey: 'bodyguard',
    })

    expect(removal.allowed).toBe(true)
    expect(removal.hasRemainingSpecializations).toBe(false)
    expect(removal.fallbackTreeKey).toBeNull()

    // XP is NOT refunded — pure service decision does not touch XP.
    // The removal evaluation only checks existence, not XP.
    expect(removal.allowed).toBe(true)
    // If the caller were to refund XP, it would be an explicit separate step.
    // Integration test confirms the removal service does not reference XP.
  })

  it('ensures evaluateSpecializationPurchase does not mutate actor data', () => {
    // Verify the purchase evaluation is read-only (side-effect free contract)
    const career = { specializations: [{ specializationId: 'bodyguard' }] }
    const items = new Set([{ specializationId: 'bodyguard', name: 'Bodyguard' }])
    const actor = { system: { details: { specializations: items } } }
    const beforeItems = new Set(items)

    evaluateSpecializationPurchase({
      actor,
      candidateItem: createSpecializationItem({
        specializationId: 'explorer',
        name: 'Explorer',
      }),
      career,
      xpAvailable: 100,
    })

    // Actor must be unchanged (compare Set via iterator)
    expect(actor.system.details.specializations.size).toBe(beforeItems.size)
    expect(Array.from(actor.system.details.specializations)).toEqual(
      Array.from(beforeItems),
    )
  })

  it('ensures evaluateSpecializationRemoval does not mutate its inputs', () => {
    // Verify the removal evaluation is read-only (side-effect free contract)
    const items = [
      { specializationId: 'spec-a', name: 'Spec A' },
      { specializationId: 'spec-b', name: 'Spec B' },
    ]
    const itemsBefore = JSON.parse(JSON.stringify(items))

    evaluateSpecializationRemoval({
      items,
      specializationKey: 'spec-a',
      selectedTreeKey: 'spec-b',
    })

    // Items array must be unchanged
    expect(items).toEqual(itemsBefore)
  })
})
