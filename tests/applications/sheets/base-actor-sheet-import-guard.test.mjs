import { describe, test, expect, vi } from 'vitest'

/**
 * Import guard test: verifies fail-fast behavior when Foundry global is absent prior to module import.
 * Rationale: Production code must not silently degrade; early throw surfaces environment misconfiguration.
 */
describe('Import guard for SwerpgBaseActorSheet', () => {
  test('should throw immediately if globalThis.foundry is missing', async () => {
    const previous = globalThis.foundry
    try {
      // Remove Foundry before importing the sheet module.
      delete globalThis.foundry
      // Reset module cache to force a fresh evaluation of the target module.
      vi.resetModules()
      await expect(import('../../../module/applications/sheets/base-actor-sheet.mjs')).rejects.toThrow(/foundry|applications/i)
    } finally {
      // Restore for other tests.
      globalThis.foundry = previous
    }
  })
})
