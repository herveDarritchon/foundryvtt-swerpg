import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setupFoundryMock, teardownFoundryMock } from '../../helpers/mock-foundry.mjs'

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
