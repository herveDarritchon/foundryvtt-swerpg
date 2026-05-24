import * as path from 'path'
import * as fs from 'fs'
import { GuideStep } from './guide-step-recorder'

/**
 * Écrivain de métadonnées de guide documentaire.
 *
 * Produit un fichier JSON structuré décrivant le guide généré et ses artefacts.
 * Ce JSON peut être consommé par une étape de génération documentaire ultérieure
 * (ex. transformation en Markdown, intégration dans un pipeline IA).
 *
 * Format du JSON produit :
 * ```json
 * {
 *   "guide": "character-sheet",
 *   "title": "Fiche de personnage",
 *   "description": "Parcours documentaire de la fiche de personnage Swerpg",
 *   "generatedAt": "2026-05-25T10:00:00.000Z",
 *   "world": "documentation-world",
 *   "screenshotsDir": "documentation-output/screenshots/character-sheet",
 *   "steps": [
 *     {
 *       "index": 1,
 *       "title": "Ouvrir la fiche d'un personnage",
 *       "userAction": "Clic sur le nom du personnage dans la sidebar Actors",
 *       "expectedState": "La fiche de personnage est visible et entièrement chargée",
 *       "screenshotPath": "documentation-output/screenshots/character-sheet/01-ouvrir-fiche.png",
 *       "recordedAt": "2026-05-25T10:00:01.000Z"
 *     }
 *   ]
 * }
 * ```
 *
 * Le répertoire de sortie des métadonnées est `documentation-output/guides/`.
 */

/** Répertoire de sortie pour les métadonnées de guides. */
export const DOCUMENTATION_GUIDES_DIR = 'documentation-output/guides'

/**
 * Métadonnées complètes d'un guide documentaire.
 */
export interface GuideMetadata {
  /** Identifiant technique du guide en kebab-case (ex: "character-sheet"). */
  guide: string
  /** Titre lisible du guide (ex: "Fiche de personnage"). */
  title: string
  /** Description courte du parcours documenté. */
  description: string
  /** Horodatage ISO 8601 de la génération du guide. */
  generatedAt: string
  /** Nom du monde Foundry utilisé pour les captures. */
  world: string
  /** Chemin relatif du répertoire de captures pour ce guide. */
  screenshotsDir: string
  /** Liste des étapes du guide dans l'ordre d'enregistrement. */
  steps: GuideStep[]
}

/**
 * Options pour l'écriture des métadonnées d'un guide.
 */
export interface WriteGuideMetadataOptions {
  /** Identifiant technique du guide en kebab-case (ex: "character-sheet"). */
  guide: string
  /** Titre lisible du guide. */
  title: string
  /** Description courte du parcours documenté. */
  description: string
  /** Nom du monde Foundry utilisé pour les captures. */
  world: string
  /** Étapes enregistrées pendant le parcours. */
  steps: readonly GuideStep[]
}

/**
 * Résultat de l'écriture des métadonnées.
 */
export interface WriteGuideMetadataResult {
  /** Chemin absolu du fichier JSON créé. */
  absolutePath: string
  /** Chemin relatif depuis la racine du projet. */
  relativePath: string
  /** Métadonnées telles qu'écrites dans le fichier. */
  metadata: GuideMetadata
}

/**
 * Écrit un fichier JSON de métadonnées pour un guide documentaire.
 *
 * Le fichier est créé dans `documentation-output/guides/<guide>.json`.
 * Le répertoire de sortie est créé automatiquement si nécessaire.
 * Si le fichier existe déjà, il est écrasé.
 *
 * @param options - Options de l'écriture
 * @returns Le résultat de l'écriture avec les chemins et les métadonnées produites
 */
export function writeGuideMetadata(options: WriteGuideMetadataOptions): WriteGuideMetadataResult {
  const { guide, title, description, world, steps } = options

  const filename = `${guide}.json`
  const relativePath = path.join(DOCUMENTATION_GUIDES_DIR, filename)
  const absolutePath = path.resolve(relativePath)

  // Créer le répertoire de sortie si nécessaire
  const outputDir = path.dirname(absolutePath)
  fs.mkdirSync(outputDir, { recursive: true })

  const metadata: GuideMetadata = {
    guide,
    title,
    description,
    generatedAt: new Date().toISOString(),
    world,
    screenshotsDir: path.join('documentation-output', 'screenshots', guide),
    steps: steps.slice(), // Copie défensive
  }

  fs.writeFileSync(absolutePath, JSON.stringify(metadata, null, 2), 'utf-8')

  return {
    absolutePath,
    relativePath,
    metadata,
  }
}

/**
 * Lit et retourne les métadonnées d'un guide existant.
 *
 * Utile pour inspecter ou enrichir un guide produit lors d'un run précédent.
 *
 * @param guide - Identifiant du guide (ex: "character-sheet")
 * @returns Les métadonnées du guide, ou `null` si le fichier n'existe pas
 */
export function readGuideMetadata(guide: string): GuideMetadata | null {
  const relativePath = path.join(DOCUMENTATION_GUIDES_DIR, `${guide}.json`)
  const absolutePath = path.resolve(relativePath)

  if (!fs.existsSync(absolutePath)) {
    return null
  }

  try {
    const content = fs.readFileSync(absolutePath, 'utf-8')
    return JSON.parse(content) as GuideMetadata
  } catch {
    return null
  }
}
