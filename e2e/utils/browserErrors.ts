import { Page } from '@playwright/test'

/**
 * Politique de filtrage des erreurs navigateur.
 *
 * Certains messages sont connus, non bloquants, et liés à l'environnement
 * (extensions navigateur, logs Foundry non critiques, etc.).
 * Ces patterns sont exclus de la capture avant de faire échouer un test.
 */
const KNOWN_NOISE_PATTERNS: RegExp[] = [
  /favicon/i,
  /chrome-extension:/i,
  /moz-extension:/i,
  // Erreurs de licence liées aux modules tiers non chargés en monde de test
  /No module named/i,
]

/**
 * Vérifie si un message d'erreur correspond à un bruit connu et maîtrisé.
 * Retourne true si le message peut être ignoré en toute sécurité.
 */
function isKnownNoise(message: string): boolean {
  return KNOWN_NOISE_PATTERNS.some((pattern) => pattern.test(message))
}

/**
 * Collecteur d'erreurs navigateur pour un test Playwright.
 * Capture les événements `console` (type "error") et `pageerror` (exceptions non gérées).
 *
 * Usage :
 *
 * ```ts
 * const errorCollector = createBrowserErrorCollector(page)
 * // … interactions …
 * errorCollector.assertNoErrors('après chargement du monde')
 * ```
 */
export interface BrowserErrorCollector {
  /** Erreurs filtrées collectées depuis le lancement du collecteur. */
  readonly errors: readonly string[]
  /**
   * Lève une assertion Playwright si des erreurs non autorisées ont été captées.
   * Le message d'échec mentionne le contexte passé en argument pour faciliter le diagnostic.
   *
   * @param context - Description du moment où l'assertion est faite (ex: "après navigation /game")
   * @throws {Error} Si des erreurs navigateur non autorisées sont présentes
   */
  assertNoErrors(context: string): void
  /**
   * Réinitialise la liste des erreurs collectées.
   * Utile pour effacer le bruit capturé avant la phase critique d'un test.
   */
  reset(): void
}

/**
 * Crée un collecteur d'erreurs navigateur et l'attache à la page Playwright.
 *
 * Les événements `console` de type "error" et les `pageerror` sont écoutés
 * dès l'appel de cette fonction. Les bruits connus sont filtrés automatiquement.
 *
 * Appeler `assertNoErrors` en fin de test ou après un parcours critique pour
 * faire échouer immédiatement le test si une erreur inattendue a été détectée.
 *
 * @param page - Page Playwright sur laquelle attacher les listeners
 * @returns Un collecteur d'erreurs prêt à l'emploi
 */
export function createBrowserErrorCollector(page: Page): BrowserErrorCollector {
  const collected: string[] = []

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text()
      if (!isKnownNoise(text)) {
        collected.push(`[console.error] ${text}`)
      }
    }
  })

  page.on('pageerror', (err) => {
    const message = err.message
    if (!isKnownNoise(message)) {
      collected.push(`[pageerror] ${message}`)
    }
  })

  return {
    get errors(): readonly string[] {
      return collected
    },

    assertNoErrors(context: string): void {
      if (collected.length > 0) {
        const errorList = collected.map((e, i) => `  ${i + 1}. ${e}`).join('\n')
        throw new Error(`Erreurs navigateur inattendues détectées (${context}) :\n${errorList}`)
      }
    },

    reset(): void {
      collected.length = 0
    },
  }
}
