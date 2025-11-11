import { describe, it, expect, vi } from 'vitest'

/**
 * Tests de validation responsive pour la sidebar Current Equipment.
 * Simule les contextes avec différents nombres d'items pour vérifier
 * l'activation appropriée du mode compact.
 */

describe('Sidebar Current Equipment - Mode Compact', () => {
  // Mock minimal d'un acteur sheet
  class MockActorSheet {
    constructor() {
      this.featuredEquipment = []
    }

    /**
     * Simule la méthode privée #applyFeaturedEquipmentCompactMode
     * selon l'implémentation réelle dans base-actor-sheet.mjs
     */
    applyFeaturedEquipmentCompactMode(context) {
      const count = context.featuredEquipment?.length ?? 0
      context.compactMode = count > 3
    }

    /**
     * Simule _prepareContext pour inclure la logique compact mode
     */
    _prepareContext() {
      const context = {
        featuredEquipment: this.featuredEquipment,
      }
      this.applyFeaturedEquipmentCompactMode(context)
      return context
    }
  }

  function mockEquipmentItem(id) {
    return {
      id,
      name: `Item ${id}`,
      img: 'icon.png',
      type: 'weapon',
      slot: 'mainhand',
      tags: ['Dmg'],
      cssClass: 'equipped',
      isEquipped: true,
      system: { equipped: true },
    }
  }

  it('0 items => compactMode désactivé', () => {
    const sheet = new MockActorSheet()
    sheet.featuredEquipment = []
    const context = sheet._prepareContext()
    expect(context.compactMode).toBe(false)
  })

  it('2 items => compactMode désactivé', () => {
    const sheet = new MockActorSheet()
    sheet.featuredEquipment = [mockEquipmentItem('i1'), mockEquipmentItem('i2')]
    const context = sheet._prepareContext()
    expect(context.compactMode).toBe(false)
  })

  it('3 items => compactMode désactivé (seuil)', () => {
    const sheet = new MockActorSheet()
    sheet.featuredEquipment = [mockEquipmentItem('i1'), mockEquipmentItem('i2'), mockEquipmentItem('i3')]
    const context = sheet._prepareContext()
    expect(context.compactMode).toBe(false)
  })

  it('4 items => compactMode activé', () => {
    const sheet = new MockActorSheet()
    sheet.featuredEquipment = [mockEquipmentItem('i1'), mockEquipmentItem('i2'), mockEquipmentItem('i3'), mockEquipmentItem('i4')]
    const context = sheet._prepareContext()
    expect(context.compactMode).toBe(true)
  })

  it('5+ items => compactMode activé', () => {
    const sheet = new MockActorSheet()
    sheet.featuredEquipment = Array.from({ length: 6 }, (_, i) => mockEquipmentItem(`i${i + 1}`))
    const context = sheet._prepareContext()
    expect(context.compactMode).toBe(true)
  })
})
