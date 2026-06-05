import { Locator, Page } from '@playwright/test'
import { createActor, dragCompendiumItemToSheet, openActorsTab } from '../../utils/foundryUI'
import { deleteActorByName } from './world-manager'

export interface CompendiumItemRef {
  searchTerm: string
  itemName: string
}

export interface CharacterOptions {
  species?: CompendiumItemRef
  career?: CompendiumItemRef
  specialization?: CompendiumItemRef
}

/**
 * Crée un acteur de type "character", ouvre sa fiche, puis applique
 * optionnellement une species, une career et une specialization via drag-drop compendium.
 *
 * @returns Le Locator de la fiche ouverte
 */
export async function createCompleteCharacter(page: Page, name: string, options: CharacterOptions = {}): Promise<Locator> {
  await openActorsTab(page)
  await createActor(page, name, 'character')

  const sheet = page.locator('.application.sheet, .app.sheet, .window-app, dialog.sheet, [role="dialog"]').filter({ hasText: name }).first()

  if (options.species) {
    await dragCompendiumItemToSheet(page, sheet, 'editSpecies', options.species.searchTerm, options.species.itemName)
  }
  if (options.career) {
    await dragCompendiumItemToSheet(page, sheet, 'editCareer', options.career.searchTerm, options.career.itemName)
  }
  if (options.specialization) {
    await dragCompendiumItemToSheet(page, sheet, 'editSpecializations', options.specialization.searchTerm, options.specialization.itemName)
  }

  return sheet
}

/**
 * Supprime un acteur par nom. API Foundry en priorité, fallback UI.
 * Non-bloquant sur échec (log warning).
 */
export async function cleanupCharacter(page: Page, name: string): Promise<void> {
  await deleteActorByName(page, name)
}
