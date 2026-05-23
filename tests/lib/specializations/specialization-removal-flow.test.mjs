import { describe, it, expect } from 'vitest'

import { evaluateSpecializationRemoval } from '../../../module/lib/specializations/specialization-removal-flow.mjs'

function makeSpec(overrides = {}) {
  return {
    specializationId: overrides.specializationId ?? null,
    treeUuid: overrides.treeUuid ?? null,
    name: overrides.name ?? '',
    img: overrides.img ?? null,
    ...overrides,
  }
}

describe('specialization-removal-flow', () => {
  describe('evaluateSpecializationRemoval', () => {
    it('allows removal of a specialization that is not the current tree', () => {
      const items = [
        makeSpec({ specializationId: 'spec-a', name: 'Spec A' }),
        makeSpec({ specializationId: 'spec-b', name: 'Spec B' }),
      ]

      const result = evaluateSpecializationRemoval({
        items,
        specializationKey: 'spec-a',
        selectedTreeKey: 'spec-b',
      })

      expect(result.allowed).toBe(true)
      expect(result.decision).toBe('allowed')
      expect(result.specializationName).toBe('Spec A')
      expect(result.targetFound).toBe(true)
      expect(result.fallbackTreeKey).toBe('spec-b')
      expect(result.hasRemainingSpecializations).toBe(true)
      expect(result.reasonCode).toBeNull()
    })

    it('allows removal and falls back to another specialization when removing current tree', () => {
      const items = [
        makeSpec({ specializationId: 'spec-a', name: 'Spec A' }),
        makeSpec({ specializationId: 'spec-b', name: 'Spec B' }),
      ]

      const result = evaluateSpecializationRemoval({
        items,
        specializationKey: 'spec-a',
        selectedTreeKey: 'spec-a',
      })

      expect(result.allowed).toBe(true)
      expect(result.decision).toBe('allowed')
      expect(result.fallbackTreeKey).toBe('spec-b')
      expect(result.hasRemainingSpecializations).toBe(true)
    })

    it('allows removal and sets fallback to null when removing the last specialization', () => {
      const items = [
        makeSpec({ specializationId: 'spec-a', name: 'Spec A' }),
      ]

      const result = evaluateSpecializationRemoval({
        items,
        specializationKey: 'spec-a',
        selectedTreeKey: 'spec-a',
      })

      expect(result.allowed).toBe(true)
      expect(result.fallbackTreeKey).toBeNull()
      expect(result.hasRemainingSpecializations).toBe(false)
    })

    it('blocks removal when specialization is not found', () => {
      const items = [
        makeSpec({ specializationId: 'spec-a', name: 'Spec A' }),
      ]

      const result = evaluateSpecializationRemoval({
        items,
        specializationKey: 'nonexistent',
        selectedTreeKey: 'spec-a',
      })

      expect(result.allowed).toBe(false)
      expect(result.decision).toBe('blocked-not-found')
      expect(result.reasonCode).toBe('SPECIALIZATION.REMOVAL.NOT_FOUND')
      expect(result.targetFound).toBe(false)
      expect(result.hasRemainingSpecializations).toBe(true)
    })

    it('returns blocked when items is not an array', () => {
      const result = evaluateSpecializationRemoval({
        items: null,
        specializationKey: 'spec-a',
        selectedTreeKey: null,
      })

      expect(result.allowed).toBe(false)
      expect(result.decision).toBe('blocked-not-found')
      expect(result.targetFound).toBe(false)
      expect(result.hasRemainingSpecializations).toBe(false)
    })

    it('handles matching by treeUuid when specializationId is null', () => {
      const items = [
        makeSpec({ specializationId: null, treeUuid: 'Item.tree-pilot', name: 'Pilot' }),
        makeSpec({ specializationId: 'spec-b', treeUuid: null, name: 'Spec B' }),
      ]

      const result = evaluateSpecializationRemoval({
        items,
        specializationKey: 'Item.tree-pilot',
        selectedTreeKey: 'spec-b',
      })

      expect(result.allowed).toBe(true)
      expect(result.specializationName).toBe('Pilot')
    })

    it('preserves current selection when removing a different specialization', () => {
      const items = [
        makeSpec({ specializationId: 'spec-a', name: 'Spec A' }),
        makeSpec({ specializationId: 'spec-b', name: 'Spec B' }),
        makeSpec({ specializationId: 'spec-c', name: 'Spec C' }),
      ]

      const result = evaluateSpecializationRemoval({
        items,
        specializationKey: 'spec-a',
        selectedTreeKey: 'spec-b',
      })

      expect(result.fallbackTreeKey).toBe('spec-b')
      expect(result.allowed).toBe(true)
    })

    it('falls back when current selection would be invalid after removal', () => {
      const items = [
        makeSpec({ specializationId: 'spec-a', name: 'Spec A' }),
        makeSpec({ specializationId: 'spec-b', name: 'Spec B' }),
      ]

      const result = evaluateSpecializationRemoval({
        items,
        specializationKey: 'spec-a',
        selectedTreeKey: 'spec-a',
      })

      expect(result.fallbackTreeKey).toBe('spec-b')
      expect(result.allowed).toBe(true)
    })
  })
})
