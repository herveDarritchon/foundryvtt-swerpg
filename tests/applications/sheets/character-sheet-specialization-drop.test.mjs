import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setupFoundryMock, teardownFoundryMock } from '../../helpers/mock-foundry.mjs'

/**
 * Tests for specialization drop routing in CharacterSheet.
 *
 * Regression guard for the creation vs post-creation distinction in
 * #handleSpecializationDrop: during character creation (actor.isL0 === true),
 * the sheet must call applySpecialization() to preserve freeSkillRank.
 * Post-creation, acquireSpecialization() must be used to zero freeSkillRank.
 */

vi.mock('../../../module/utils/logger.mjs', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('../../../module/lib/skills/skill-factory.mjs', () => ({ default: {} }))
vi.mock('../../../module/lib/talents/talent-factory.mjs', () => ({ default: {} }))
vi.mock('../../../module/lib/jauges/jauge-factory.mjs', () => ({
  default: { build: vi.fn(() => ({ create: vi.fn(() => ({})) })) },
}))
vi.mock('../../../module/lib/featured-equipment.mjs', () => ({
  computeFeaturedEquipment: vi.fn(() => []),
}))

vi.mock('../../../module/lib/specializations/specialization-purchase-flow.mjs', () => ({
  evaluateSpecializationPurchase: vi.fn(),
}))

import { evaluateSpecializationPurchase } from '../../../module/lib/specializations/specialization-purchase-flow.mjs'

function buildMockSpecializationItem({ name = 'Scoundrel', specializationId = 'scoundrel', freeSkillRank = 2 } = {}) {
  return {
    name,
    type: 'specialization',
    system: {
      specializationId,
      freeSkillRank,
      isUniversal: false,
    },
    toObject: () => ({
      name,
      img: '',
      system: {
        specializationId,
        freeSkillRank,
        isUniversal: false,
        specializationSkills: [],
      },
    }),
  }
}

function buildMockActor({ isL0 = true, xpAvailable = 0, specializations = [] } = {}) {
  return {
    isOwner: true,
    isL0,
    acquireSpecialization: vi.fn(() => Promise.resolve()),
    system: {
      details: {
        career: { name: 'Bounty Hunter', specializations: [] },
        specializations: new Set(specializations),
        species: { name: 'Human' },
      },
      progression: {
        experience: { available: xpAvailable, spent: 0, gained: 0 },
        freeSkillRanks: {
          career: { spent: 0, gained: 4, available: 4 },
          specialization: { spent: 0, gained: 0, available: 0 },
        },
      },
      skills: {},
      characteristics: { brawn: { rank: { value: 2 } } },
      resources: {
        wounds: { value: 0, threshold: 10 },
        strain: { value: 0, threshold: 10 },
      },
      points: {},
      applySpecialization: vi.fn(() => Promise.resolve()),
    },
    items: [],
    hasFreeSkillsAvailable: vi.fn(() => false),
    toObject: () => ({ name: 'Test Character', img: '', system: {} }),
  }
}

describe('CharacterSheet — specialization drop routing', () => {
  let CharacterSheet

  beforeEach(async () => {
    vi.clearAllMocks()
    setupFoundryMock()
    CharacterSheet = (await import('../../../module/applications/sheets/character-sheet.mjs')).default
  })

  afterEach(() => {
    vi.resetModules()
    teardownFoundryMock()
  })

  /**
   * Creates a real CharacterSheet instance with its actor replaced.
   * Using `new CharacterSheet()` is required because #handleSpecializationDrop
   * is a native ES private method — it requires an actual class instance.
   */
  function buildSheet(actor) {
    const sheet = new CharacterSheet()
    sheet.actor = actor
    return sheet
  }

  describe('free-add during character creation (isL0 === true)', () => {
    it('calls applySpecialization() when actor is at level 0', async () => {
      const actor = buildMockActor({ isL0: true, xpAvailable: 0 })
      const item = buildMockSpecializationItem({ name: 'Scoundrel', freeSkillRank: 2 })

      evaluateSpecializationPurchase.mockReturnValue({
        decision: 'free-add',
        specializationName: 'Scoundrel',
        cost: { finalCost: 0, ownedCountBefore: 0, ownedCountAfter: 1 },
      })

      const sheet = buildSheet(actor)

      await sheet._onDropItem({}, item)

      expect(actor.system.applySpecialization).toHaveBeenCalledOnce()
      expect(actor.system.applySpecialization).toHaveBeenCalledWith(item)
      expect(actor.acquireSpecialization).not.toHaveBeenCalled()
    })

    it('does not call acquireSpecialization during creation so freeSkillRank is preserved', async () => {
      const actor = buildMockActor({ isL0: true, xpAvailable: 0 })
      const item = buildMockSpecializationItem({ freeSkillRank: 4 })

      evaluateSpecializationPurchase.mockReturnValue({
        decision: 'free-add',
        specializationName: 'Scoundrel',
        cost: { finalCost: 0, ownedCountBefore: 0, ownedCountAfter: 1 },
      })

      const sheet = buildSheet(actor)

      await sheet._onDropItem({}, item)

      // applySpecialization preserves freeSkillRank; acquireSpecialization would zero it
      expect(actor.system.applySpecialization).toHaveBeenCalledWith(item)
      expect(actor.acquireSpecialization).not.toHaveBeenCalled()
    })
  })

  describe('free-add post-creation (isL0 === false)', () => {
    it('calls acquireSpecialization() when actor is NOT at level 0', async () => {
      const actor = buildMockActor({ isL0: false, xpAvailable: 0 })
      const item = buildMockSpecializationItem({ name: 'Pilot', freeSkillRank: 3 })

      evaluateSpecializationPurchase.mockReturnValue({
        decision: 'free-add',
        specializationName: 'Pilot',
        cost: { finalCost: 0, ownedCountBefore: 0, ownedCountAfter: 1 },
      })

      const sheet = buildSheet(actor)

      await sheet._onDropItem({}, item)

      expect(actor.acquireSpecialization).toHaveBeenCalledOnce()
      expect(actor.acquireSpecialization).toHaveBeenCalledWith(item)
      expect(actor.system.applySpecialization).not.toHaveBeenCalled()
    })

    it('does not call applySpecialization post-creation, preventing free rank re-attribution', async () => {
      // acquireSpecialization zeroes freeSkillRank; applySpecialization would preserve it.
      // Post-creation this distinction matters to avoid granting free skill ranks again.
      const actor = buildMockActor({ isL0: false, xpAvailable: 0 })
      const item = buildMockSpecializationItem({ freeSkillRank: 5 })

      evaluateSpecializationPurchase.mockReturnValue({
        decision: 'free-add',
        specializationName: 'Scoundrel',
        cost: { finalCost: 0, ownedCountBefore: 0, ownedCountAfter: 1 },
      })

      const sheet = buildSheet(actor)

      await sheet._onDropItem({}, item)

      expect(actor.acquireSpecialization).toHaveBeenCalledWith(item)
      expect(actor.system.applySpecialization).not.toHaveBeenCalled()
    })
  })

  describe('blocked-duplicate — no acquisition regardless of level', () => {
    it('does not call applySpecialization or acquireSpecialization on duplicate', async () => {
      const actor = buildMockActor({ isL0: true })
      const item = buildMockSpecializationItem()

      evaluateSpecializationPurchase.mockReturnValue({
        decision: 'blocked-duplicate',
        specializationName: 'Scoundrel',
        messageKey: 'SPECIALIZATION.PURCHASE.DUPLICATE',
      })

      const sheet = buildSheet(actor)

      await sheet._onDropItem({}, item)

      expect(actor.system.applySpecialization).not.toHaveBeenCalled()
      expect(actor.acquireSpecialization).not.toHaveBeenCalled()
    })
  })
})
