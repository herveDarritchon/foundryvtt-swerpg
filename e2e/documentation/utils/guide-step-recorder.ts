import { DocumentationScreenshotResult } from './screenshot-helper'

/**
 * Enregistreur d'étapes de guide documentaire.
 *
 * Chaque étape d'un guide documentaire capture :
 * - l'ordre de l'étape dans le parcours ;
 * - le titre descriptif de l'étape ;
 * - l'action utilisateur effectuée (ex: "Clic sur le bouton Créer") ;
 * - l'état attendu après l'action (ex: "La fiche du personnage est ouverte") ;
 * - le chemin du screenshot associé à cet état.
 *
 * Les étapes sont accumulées en mémoire et consommées par `guide-metadata-writer`
 * pour produire le JSON structuré du guide.
 *
 * Usage :
 * ```ts
 * const recorder = createGuideStepRecorder()
 * recorder.record({
 *   title: "Ouvrir la fiche d'un personnage",
 *   userAction: "Clic sur le nom du personnage dans la sidebar Actors",
 *   expectedState: "La fiche de personnage est visible et entièrement chargée",
 *   screenshot,
 * })
 * const steps = recorder.getSteps()
 * ```
 */

/**
 * Représentation d'une étape dans un guide documentaire.
 */
export interface GuideStep {
  /** Index de l'étape dans le guide (commence à 1, incrémenté automatiquement). */
  index: number
  /** Titre court et descriptif de l'étape (ex: "Ouvrir la fiche d'un personnage"). */
  title: string
  /** Description de l'action utilisateur effectuée à cette étape. */
  userAction: string
  /** Description de l'état visible attendu après l'action. */
  expectedState: string
  /** Chemin relatif du screenshot capturé pour cette étape. */
  screenshotPath: string
  /** Horodatage ISO 8601 de l'enregistrement de l'étape. */
  recordedAt: string
}

/**
 * Données à fournir pour enregistrer une étape.
 * L'index est géré automatiquement par le recorder.
 */
export interface GuideStepInput {
  /** Titre court et descriptif de l'étape. */
  title: string
  /** Description de l'action utilisateur effectuée à cette étape. */
  userAction: string
  /** Description de l'état visible attendu après l'action. */
  expectedState: string
  /** Résultat de la capture d'écran associée à cette étape. */
  screenshot: DocumentationScreenshotResult
}

/**
 * Enregistreur d'étapes d'un guide documentaire.
 */
export interface GuideStepRecorder {
  /**
   * Enregistre une étape dans le guide.
   * L'index est incrémenté automatiquement à partir de 1.
   *
   * @param input - Données de l'étape
   * @returns L'étape enregistrée avec son index et son horodatage
   */
  record(input: GuideStepInput): GuideStep

  /**
   * Retourne toutes les étapes enregistrées dans l'ordre d'enregistrement.
   */
  getSteps(): readonly GuideStep[]

  /**
   * Retourne le nombre d'étapes enregistrées.
   */
  readonly count: number

  /**
   * Réinitialise l'enregistreur (efface toutes les étapes).
   * Utile si le recorder est réutilisé entre plusieurs parcours dans la même spec.
   */
  reset(): void
}

/**
 * Crée un enregistreur d'étapes de guide documentaire.
 *
 * @returns Un nouvel enregistreur prêt à l'emploi
 */
export function createGuideStepRecorder(): GuideStepRecorder {
  const steps: GuideStep[] = []

  return {
    record(input: GuideStepInput): GuideStep {
      const step: GuideStep = {
        index: steps.length + 1,
        title: input.title,
        userAction: input.userAction,
        expectedState: input.expectedState,
        screenshotPath: input.screenshot.relativePath,
        recordedAt: new Date().toISOString(),
      }
      steps.push(step)
      return step
    },

    getSteps(): readonly GuideStep[] {
      return steps
    },

    get count(): number {
      return steps.length
    },

    reset(): void {
      steps.length = 0
    },
  }
}
