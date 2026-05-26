import { Page } from '@playwright/test'
import * as path from 'path'
import * as fs from 'fs'

/**
 * Helper de capture d'écran documentaire.
 *
 * Conventions de nommage stables :
 * - Les fichiers de capture sont nommés : `<guide>/<step-index>-<slug>.png`
 * - Le répertoire de sortie documentaire est `documentation-output/screenshots/`
 * - Tous les slugs sont en kebab-case, sans espace ni caractère spécial.
 *
 * Garanties de reproductibilité :
 * - Viewport fixe 1920×1080 (défini dans la config Playwright).
 * - Animations désactivées avant la capture (via `disableAnimations` du world manager).
 * - Attente de la stabilité réseau avant la capture.
 * - Captures en pleine page par défaut pour les vues de document.
 */

/** Répertoire de sortie pour les captures documentaires. */
export const DOCUMENTATION_SCREENSHOTS_DIR = 'documentation-output/screenshots'

/**
 * Options de capture d'écran documentaire.
 */
export interface DocumentationScreenshotOptions {
  /** Nom du guide auquel appartient cette capture (ex: "character-sheet"). */
  guide: string
  /** Index de l'étape dans le guide (commence à 1). */
  stepIndex: number
  /** Slug de l'étape en kebab-case (ex: "ouvrir-fiche-personnage"). */
  stepSlug: string
  /**
   * Capture en pleine page.
   * @default true
   */
  fullPage?: boolean
  /**
   * Sélecteur CSS d'un élément spécifique à capturer (clip).
   * Si défini, la capture est limitée à cet élément et `fullPage` est ignoré.
   */
  elementSelector?: string
}

/**
 * Résultat d'une capture d'écran documentaire.
 */
export interface DocumentationScreenshotResult {
  /** Chemin absolu du fichier de capture créé. */
  absolutePath: string
  /** Chemin relatif depuis la racine du projet (utilisé dans les métadonnées). */
  relativePath: string
  /** Nom du fichier de capture (sans chemin). */
  filename: string
}

/**
 * Prend une capture d'écran documentaire avec un nom stable et reproductible.
 *
 * Le fichier est créé dans `documentation-output/screenshots/<guide>/`.
 * Le répertoire de sortie est créé automatiquement si nécessaire.
 *
 * Pré-requis : animations désactivées (`disableAnimations` appelé avant).
 *
 * @param page - Page Playwright en cours
 * @param options - Options de la capture
 * @returns Le résultat de la capture avec les chemins absolus et relatifs
 */
export async function takeDocumentationScreenshot(page: Page, options: DocumentationScreenshotOptions): Promise<DocumentationScreenshotResult> {
  const { guide, stepIndex, stepSlug, fullPage = true, elementSelector } = options

  const filename = `${String(stepIndex).padStart(2, '0')}-${stepSlug}.png`
  const relativePath = path.join(DOCUMENTATION_SCREENSHOTS_DIR, guide, filename)
  const absolutePath = path.resolve(relativePath)

  // Créer le répertoire de sortie si nécessaire
  const outputDir = path.dirname(absolutePath)
  fs.mkdirSync(outputDir, { recursive: true })

  // Attendre la stabilité réseau avant la capture
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})

  if (elementSelector) {
    // Capture d'un élément spécifique
    const element = page.locator(elementSelector).first()
    await element.waitFor({ state: 'visible', timeout: 10000 })
    await element.screenshot({ path: absolutePath })
  } else {
    // Capture de la page complète ou du viewport
    await page.screenshot({ path: absolutePath, fullPage })
  }

  return {
    absolutePath,
    relativePath,
    filename,
  }
}

/**
 * Normalise un texte en slug kebab-case pour les noms de fichier.
 *
 * Supprime les accents, remplace les espaces et caractères non alphanumériques par `-`,
 * et limite la longueur à 80 caractères.
 *
 * Exemples :
 * - "Ouvrir la fiche d'un personnage" → "ouvrir-la-fiche-d-un-personnage"
 * - "Step 1: Create Actor" → "step-1-create-actor"
 *
 * @param text - Texte à normaliser
 * @returns Slug kebab-case
 */
export function toKebabSlug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // Supprimer les diacritiques
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Remplacer les caractères non alphanumériques par -
    .replace(/^-+|-+$/g, '') // Supprimer les tirets en début/fin
    .slice(0, 80)
}
