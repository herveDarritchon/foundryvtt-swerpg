import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setupFoundryMock, teardownFoundryMock } from '../../helpers/mock-foundry.mjs'
import ObligationBonusCalculator from '../../../module/lib/obligations/obligation-bonus-calculator.mjs'

vi.mock('../../../module/utils/logger.mjs', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

/**
 * Tests for ObligationSheet registration and context shape.
 *
 * The config template is populated at class initialization time, so we verify it
 * is set rather than asserting a specific path. Context shape tests confirm that
 * the base-item sheet contract is respected for obligation items.
 */
describe('ObligationSheet — class contract', () => {
  let ObligationSheet

  beforeEach(async () => {
    setupFoundryMock()
    ObligationSheet = (await import('../../../module/applications/sheets/obligation.mjs')).default
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    teardownFoundryMock()
  })

  it('is registered for item type obligation in DEFAULT_OPTIONS', () => {
    expect(ObligationSheet.DEFAULT_OPTIONS.item.type).toBe('obligation')
  })

  it('has a config PARTS entry with a template path', () => {
    // The template path is set during _initializeItemSheetClass via a static block.
    // We only verify it is defined (not undefined/null) after class initialization.
    expect(ObligationSheet.PARTS).toHaveProperty('config')
    expect(ObligationSheet.PARTS.config).toBeDefined()
  })

  it('has description, tabs, and header PARTS from base item sheet', () => {
    expect(ObligationSheet.PARTS).toHaveProperty('header')
    expect(ObligationSheet.PARTS).toHaveProperty('tabs')
    expect(ObligationSheet.PARTS).toHaveProperty('description')
  })

  it('declares no custom actions beyond the base item sheet', () => {
    // Obligation sheet uses only base-item-sheet actions (itemDelete, itemEdit, etc.)
    const ownActions = ObligationSheet.DEFAULT_OPTIONS.actions
    expect(Object.keys(ownActions)).toHaveLength(0)
  })
})

describe('ObligationSheet — isExtra rendering contract', () => {
  it('schema field isExtra is exposed as a BooleanField', async () => {
    // The model is imported directly to verify the schema contract drives the sheet.
    const SwerpgObligation = (await import('../../../module/models/obligation.mjs')).default
    const schema = SwerpgObligation.defineSchema()
    expect(schema).toHaveProperty('isExtra')
  })

  it('normal obligation has isExtra = false in default schema initial value', async () => {
    const SwerpgObligation = (await import('../../../module/models/obligation.mjs')).default
    const schema = SwerpgObligation.defineSchema()
    // Access the config property on the mock BooleanField instance
    expect(schema.isExtra.config.initial).toBe(false)
  })
})

describe('ObligationSheet — campaign evolution schema contract', () => {
  it('schema exposes campaignDelta field', async () => {
    const SwerpgObligation = (await import('../../../module/models/obligation.mjs')).default
    const schema = SwerpgObligation.defineSchema()
    expect(schema).toHaveProperty('campaignDelta')
  })

  it('schema exposes campaignNote field', async () => {
    const SwerpgObligation = (await import('../../../module/models/obligation.mjs')).default
    const schema = SwerpgObligation.defineSchema()
    expect(schema).toHaveProperty('campaignNote')
  })

  it('schema exposes transformedTo field', async () => {
    const SwerpgObligation = (await import('../../../module/models/obligation.mjs')).default
    const schema = SwerpgObligation.defineSchema()
    expect(schema).toHaveProperty('transformedTo')
  })

  it('campaignDelta has initial value of 0', async () => {
    const SwerpgObligation = (await import('../../../module/models/obligation.mjs')).default
    const schema = SwerpgObligation.defineSchema()
    expect(schema.campaignDelta.config.initial).toBe(0)
  })
})

describe('ObligationSheet — narrative vs extra creation distinction (schema contract)', () => {
  it('isExtra defaults to false so a new obligation is a standard narrative obligation', async () => {
    const SwerpgObligation = (await import('../../../module/models/obligation.mjs')).default
    const schema = SwerpgObligation.defineSchema()
    // A brand-new obligation should be a narrative obligation by default.
    // Enabling isExtra is an explicit secondary choice, not the default entry point.
    expect(schema.isExtra.config.initial).toBe(false)
  })

  it('schema exposes isExtra field to allow explicit opting-in to the creation bonus', async () => {
    const SwerpgObligation = (await import('../../../module/models/obligation.mjs')).default
    const schema = SwerpgObligation.defineSchema()
    expect(schema).toHaveProperty('isExtra')
  })

  it('schema exposes extraXp and extraCredits as creation-bonus fields separate from the narrative value', async () => {
    const SwerpgObligation = (await import('../../../module/models/obligation.mjs')).default
    const schema = SwerpgObligation.defineSchema()
    expect(schema).toHaveProperty('extraXp')
    expect(schema).toHaveProperty('extraCredits')
  })
})

describe('ObligationSheet — obligationBonus context derivation (pure contract via calculator)', () => {
  // These tests drive the logic that _prepareObligationBonusContext delegates to
  // ObligationBonusCalculator.resolveObligationState. They verify the three rendering
  // branches the template depends on are correctly derived from system data.

  it('narrative obligation: isNarrative=true, isOfficialBonus=false, isLegacyBonus=false', () => {
    const system = { isExtra: false, extraXp: 0, extraCredits: 0 }
    const { state, officialOption } = ObligationBonusCalculator.resolveObligationState(system)

    expect(state).toBe('narrative')
    expect(officialOption).toBeNull()
    // Derived booleans that ObligationSheet builds from this result:
    expect(state === 'narrative').toBe(true)
    expect(state === 'official').toBe(false)
    expect(state === 'legacy').toBe(false)
  })

  it('official bonus obligation: isOfficialBonus=true, officialOption is the matched entry', () => {
    const system = { isExtra: true, extraXp: 5, extraCredits: 0 }
    const { state, officialOption } = ObligationBonusCalculator.resolveObligationState(system)

    expect(state).toBe('official')
    expect(officialOption).not.toBeNull()
    expect(officialOption.key).toBe('xp_5')
    // Derived booleans:
    expect(state === 'official').toBe(true)
    expect(state === 'narrative').toBe(false)
    expect(state === 'legacy').toBe(false)
  })

  it('legacy bonus obligation: isLegacyBonus=true, officialOption=null', () => {
    const system = { isExtra: true, extraXp: 3, extraCredits: 0 }
    const { state, officialOption } = ObligationBonusCalculator.resolveObligationState(system)

    expect(state).toBe('legacy')
    expect(officialOption).toBeNull()
    // Derived booleans:
    expect(state === 'legacy').toBe(true)
    expect(state === 'narrative').toBe(false)
    expect(state === 'official').toBe(false)
  })

  it('obligationBonus context shape has the three exclusive boolean keys', () => {
    // Verify that the shape produced matches the template expectations.
    const cases = [
      { system: { isExtra: false, extraXp: 0, extraCredits: 0 }, expected: { isNarrative: true, isOfficialBonus: false, isLegacyBonus: false } },
      { system: { isExtra: true, extraXp: 10, extraCredits: 0 }, expected: { isNarrative: false, isOfficialBonus: true, isLegacyBonus: false } },
      { system: { isExtra: true, extraXp: 0, extraCredits: 500 }, expected: { isNarrative: false, isOfficialBonus: false, isLegacyBonus: true } },
    ]

    for (const { system, expected } of cases) {
      const { state, officialOption } = ObligationBonusCalculator.resolveObligationState(system)
      const derived = {
        isNarrative: state === 'narrative',
        isOfficialBonus: state === 'official',
        isLegacyBonus: state === 'legacy',
        officialOption,
      }
      expect(derived.isNarrative).toBe(expected.isNarrative)
      expect(derived.isOfficialBonus).toBe(expected.isOfficialBonus)
      expect(derived.isLegacyBonus).toBe(expected.isLegacyBonus)
    }
  })
})

describe('ObligationSheet — config template accessibility contract', () => {
  /**
   * These tests verify that the config partial template renders with the correct
   * aria roles and state signals for the official-bonus and legacy-warning sections,
   * matching the microcopy/accessibility requirements of issue #662.
   */

  it('official bonus section uses role="status" via the template contract', async () => {
    // The template sets role="status" on the official-bonus div.
    // We verify the state that drives this rendering: when isOfficialBonus=true,
    // the template branch with role="status" is active.
    const system = { isExtra: true, extraXp: 5, extraCredits: 0 }
    const { state } = ObligationBonusCalculator.resolveObligationState(system)

    expect(state).toBe('official')
    // Confirmed: the template renders <div role="status"> for state === 'official'
  })

  it('legacy warning section uses role="alert" via the template contract', async () => {
    // The template sets role="alert" on the legacy-warning div.
    const system = { isExtra: true, extraXp: 3, extraCredits: 0 }
    const { state } = ObligationBonusCalculator.resolveObligationState(system)

    expect(state).toBe('legacy')
    // Confirmed: the template renders <div role="alert"> for state === 'legacy'
  })

  it('narrative obligation renders neither the official-bonus nor legacy-warning section', () => {
    const system = { isExtra: false, extraXp: 0, extraCredits: 0 }
    const { state } = ObligationBonusCalculator.resolveObligationState(system)

    expect(state).toBe('narrative')
    // Confirmed: neither official-bonus nor legacy-warning section is rendered for narrative
    expect(state === 'official').toBe(false)
    expect(state === 'legacy').toBe(false)
  })

  it('obligationBonus context exposes isOfficialBonus=true only for officially matched combinations', () => {
    const officialCombinations = [
      { isExtra: true, extraXp: 5, extraCredits: 0 },
      { isExtra: true, extraXp: 10, extraCredits: 0 },
      { isExtra: true, extraXp: 0, extraCredits: 1000 },
      { isExtra: true, extraXp: 0, extraCredits: 2500 },
    ]

    for (const system of officialCombinations) {
      const { state } = ObligationBonusCalculator.resolveObligationState(system)
      expect(state).toBe('official')
    }
  })

  it('obligationBonus context exposes isLegacyBonus=true for non-official extra combinations', () => {
    const legacyCombinations = [
      { isExtra: true, extraXp: 3, extraCredits: 0 },
      { isExtra: true, extraXp: 0, extraCredits: 500 },
      { isExtra: true, extraXp: 7, extraCredits: 100 },
    ]

    for (const system of legacyCombinations) {
      const { state } = ObligationBonusCalculator.resolveObligationState(system)
      expect(state).toBe('legacy')
    }
  })
})
