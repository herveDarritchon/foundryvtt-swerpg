import { expect, test } from '../fixtures'
import { assertDocumentationWorldReady, prepareDocumentationState, disableAnimations, dismissOverlayIfPresent } from '../utils/documentation-world-manager'
import { takeDocumentationScreenshot, toKebabSlug } from '../utils/screenshot-helper'
import { createGuideStepRecorder } from '../utils/guide-step-recorder'
import { writeGuideMetadata } from '../utils/guide-metadata-writer'
import { ensureSessionActive, openActorsTab, createActor, openActorSkillsTab } from '../../utils/foundryUI'
import { deleteActorByName } from '../../regression/utils/world-manager'

/**
 * Premier parcours guide documentaire — Fiche de personnage Swerpg
 *
 * Identifiant : character-sheet
 * Commande    : pnpm e2e:documentation -- e2e/documentation/specs/character-sheet.guide.spec.ts
 *
 * Périmètre :
 *   Capture les étapes clés de la fiche de personnage Swerpg, depuis la sidebar Actors
 *   jusqu'aux onglets principaux (Attributs, Compétences). Ce parcours constitue la référence
 *   documentaire de la feature "fiche de personnage" et sert de base à la génération de guide
 *   utilisateur.
 *
 * Prérequis contrôlés (déclarés explicitement, conformément au contrat documentation) :
 *   - Un acteur de type "character" est créé avec le nom `Doc-Personnage-<timestamp>`.
 *   - L'acteur est supprimé en teardown après les assertions.
 *   - Aucune autre donnée n'est créée, modifiée ou supprimée.
 *
 * Artefacts produits :
 *   - Screenshots : documentation-output/screenshots/character-sheet/01-*.png … 04-*.png
 *   - JSON guide  : documentation-output/guides/character-sheet.json
 *
 * Étapes documentées :
 *   01 — Vue générale du monde documentaire (état de base, sidebar visible)
 *   02 — Sidebar Actors ouverte (liste des acteurs visible)
 *   03 — Fiche de personnage ouverte (vue Attributs)
 *   04 — Onglet Compétences ouvert (liste des compétences visible)
 *
 * Issue : #385 — EDG3 - Livrer un premier parcours *.guide.spec.ts avec screenshots et JSON
 */

const GUIDE_ID = 'character-sheet'
const GUIDE_TITLE = 'Fiche de personnage'
const GUIDE_DESCRIPTION = 'Parcours documentaire de la fiche de personnage Swerpg : sidebar, ouverture de fiche, onglet Attributs, onglet Compétences.'

test.describe('Guide documentaire — fiche de personnage', () => {
  test('parcours complet character-sheet : screenshots ordonnés et JSON intermédiaire', async ({ page, documentationReady }) => {
    const world = process.env.E2E_FOUNDRY_WORLD ?? 'documentation-world'
    const actorName = `Doc-Personnage-${Date.now()}`
    const recorder = createGuideStepRecorder()

    // -------------------------------------------------------------------------
    // Garde-fous d'entrée
    // -------------------------------------------------------------------------

    await assertDocumentationWorldReady(page, { world })
    await ensureSessionActive(page)

    // -------------------------------------------------------------------------
    // Étape 01 — Vue générale du monde documentaire
    // -------------------------------------------------------------------------

    await prepareDocumentationState(page)

    const shot01 = await takeDocumentationScreenshot(page, {
      guide: GUIDE_ID,
      stepIndex: 1,
      stepSlug: toKebabSlug('vue generale monde documentaire'),
    })

    recorder.record({
      title: 'Vue générale du monde documentaire',
      userAction: 'Ouverture de la session dans le monde documentaire',
      expectedState: 'La page /game est chargée avec la sidebar visible et aucune application ouverte',
      screenshot: shot01,
    })

    // Invariant : sidebar présente
    await expect(page.locator('#sidebar')).toBeVisible()

    // -------------------------------------------------------------------------
    // Étape 02 — Sidebar Actors ouverte
    // -------------------------------------------------------------------------

    await openActorsTab(page)
    await expect(page.locator('#actors')).toBeVisible()

    await prepareDocumentationState(page)

    const shot02 = await takeDocumentationScreenshot(page, {
      guide: GUIDE_ID,
      stepIndex: 2,
      stepSlug: toKebabSlug('sidebar actors ouverte'),
    })

    recorder.record({
      title: 'Sidebar Actors ouverte',
      userAction: 'Clic sur l\'onglet Actors dans la barre de navigation de la sidebar',
      expectedState: 'La liste des acteurs est visible dans la sidebar',
      screenshot: shot02,
    })

    // -------------------------------------------------------------------------
    // Prérequis contrôlé : création de l'acteur documentaire
    // -------------------------------------------------------------------------

    await createActor(page, actorName, 'character')

    // La fiche s'ouvre automatiquement après la création
    const actorSheet = page
      .locator('.application.sheet, .app.sheet, .window-app, dialog.sheet, [role="dialog"]')
      .filter({ hasText: actorName })
      .first()

    await expect(actorSheet).toBeVisible()

    // -------------------------------------------------------------------------
    // Étape 03 — Fiche de personnage ouverte (vue par défaut)
    // -------------------------------------------------------------------------

    // Ne pas fermer les apps ici : la fiche doit rester ouverte pour la capture
    await dismissOverlayIfPresent(page)
    await disableAnimations(page)

    const shot03 = await takeDocumentationScreenshot(page, {
      guide: GUIDE_ID,
      stepIndex: 3,
      stepSlug: toKebabSlug('fiche personnage ouverte'),
    })

    recorder.record({
      title: 'Fiche de personnage ouverte',
      userAction: 'Double-clic sur le nom de l\'acteur dans la sidebar Actors',
      expectedState: 'La fiche de personnage est visible avec l\'onglet par défaut chargé',
      screenshot: shot03,
    })

    // Invariant : fiche visible avec le nom de l'acteur
    await expect(actorSheet).toBeVisible()

    // -------------------------------------------------------------------------
    // Étape 04 — Onglet Compétences ouvert
    // -------------------------------------------------------------------------

    await openActorSkillsTab(page, actorName)
    await ensureSessionActive(page)

    // Ne pas fermer les apps ici : la fiche doit rester ouverte pour la capture
    await dismissOverlayIfPresent(page)
    await disableAnimations(page)

    const shot04 = await takeDocumentationScreenshot(page, {
      guide: GUIDE_ID,
      stepIndex: 4,
      stepSlug: toKebabSlug('onglet competences ouvert'),
    })

    recorder.record({
      title: 'Onglet Compétences ouvert',
      userAction: 'Clic sur l\'onglet "Compétences" dans la fiche de personnage',
      expectedState: 'L\'onglet Compétences est actif et la liste des compétences est visible',
      screenshot: shot04,
    })

    // Invariant : au moins une compétence est affichée
    await expect(actorSheet.locator('[data-skill-id]').first()).toBeVisible()

    // -------------------------------------------------------------------------
    // Production du JSON intermédiaire
    // -------------------------------------------------------------------------

    const metadataResult = writeGuideMetadata({
      guide: GUIDE_ID,
      title: GUIDE_TITLE,
      description: GUIDE_DESCRIPTION,
      world,
      steps: recorder.getSteps(),
    })

    // Vérifier que le JSON a été produit et est cohérent avec les étapes capturées
    expect(metadataResult.metadata.steps).toHaveLength(recorder.count)
    expect(metadataResult.metadata.guide).toBe(GUIDE_ID)
    expect(metadataResult.metadata.steps[0].screenshotPath).toContain('01-')
    expect(metadataResult.metadata.steps[1].screenshotPath).toContain('02-')
    expect(metadataResult.metadata.steps[2].screenshotPath).toContain('03-')
    expect(metadataResult.metadata.steps[3].screenshotPath).toContain('04-')

    // -------------------------------------------------------------------------
    // Teardown : suppression de l'artefact documentaire contrôlé
    // -------------------------------------------------------------------------

    await deleteActorByName(page, actorName)
  })
})
