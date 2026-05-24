# Présentation — Utiliser Playwright pour des tests end-to-end locaux sur un système Foundry VTT

## 1. Objectif du document

Ce document présente une stratégie réaliste pour introduire des tests Playwright dans le système **SWERPG** pour Foundry VTT.

L’objectif n’est pas de remplacer les tests unitaires ou les tests d’intégration. Ceux-ci restent le bon niveau pour valider les règles métier, les calculs d’XP, les contraintes de rang, les résolveurs de carrière, d’espèce, de spécialisation ou de talents.

Les tests Playwright doivent plutôt servir à valider que les grands parcours utilisateur fonctionnent réellement dans Foundry VTT, dans un navigateur, avec l’interface complète chargée.

En clair : Playwright ne doit pas prouver que les règles sont justes. Il doit prouver qu’un utilisateur peut encore utiliser le système.

## 2. Positionnement recommandé

### Ce que Playwright doit tester

Playwright est pertinent pour valider des parcours visibles et transverses :

- démarrer une instance locale de Foundry VTT ;
- rejoindre un monde de test ;
- créer un acteur de type personnage ;
- ouvrir la fiche acteur ;
- sélectionner une espèce ;
- sélectionner une carrière ;
- sélectionner une spécialisation ;
- dépenser quelques points d’expérience ;
- vérifier que la fiche se met à jour ;
- vérifier qu’aucune erreur bloquante n’apparaît dans l’interface ;
- vérifier que les fenêtres ApplicationV2 critiques s’ouvrent correctement ;
- vérifier que les boutons essentiels restent cliquables.

### Ce que Playwright ne doit pas tester

Il ne faut pas utiliser Playwright pour tester finement :

- le coût exact de toutes les compétences ;
- toutes les combinaisons espèce/carrière/spécialisation ;
- tous les états d’un arbre de talents ;
- tous les cas d’erreur métier ;
- la totalité des règles Star Wars FFG.

Ces validations appartiennent aux tests unitaires et d’intégration. Les mettre en E2E rendrait la suite lente, fragile et coûteuse à maintenir.

## 3. Philosophie de test adaptée à Foundry VTT

Foundry VTT est une application riche : elle charge un monde, des documents, des compendiums, des fenêtres, des hooks, des feuilles, des applications, parfois du canvas et des interactions asynchrones.

La stratégie recommandée est donc une suite E2E courte, locale, déterministe et orientée “smoke tests avancés”.

Le principe :

> Si cette suite passe, le système est utilisable pour les actions de base.

Ce n’est pas une preuve exhaustive de conformité métier. C’est une validation de non-régression utilisateur.

## 4. Pourquoi ne pas lancer ces tests dans GitHub Actions

La décision de ne pas lancer ces tests dans les pipelines GitHub est saine.

Les tests E2E Foundry sont plus lourds que des tests Vitest :

- ils nécessitent une vraie instance Foundry ;
- ils nécessitent un monde de test ;
- ils démarrent un navigateur ;
- ils sont plus sensibles aux temps de chargement ;
- ils consomment davantage de CPU et de mémoire ;
- ils produisent des artefacts lourds : traces, screenshots, vidéos.

Pour ton projet, le bon compromis est :

- **Vitest** en pipeline GitHub pour la logique métier ;
- **Playwright** en local pour les parcours utilisateur complets ;
- éventuellement une exécution Playwright ponctuelle avant une grosse release, mais pas à chaque PR.

## 5. Architecture cible dans le dépôt

Structure recommandée :

```txt
foundryvtt-swerpg/
├─ tests/
│  ├─ unit/
│  ├─ integration/
│  └─ e2e/
│     ├─ auth.setup.ts
│     ├─ fixtures/
│     │  └─ foundry.fixture.ts
│     ├─ pages/
│     │  ├─ foundry-login.page.ts
│     │  ├─ sidebar.page.ts
│     │  ├─ actor-directory.page.ts
│     │  └─ character-sheet.page.ts
│     ├─ flows/
│     │  └─ create-character.flow.ts
│     └─ specs/
│        └─ character-creation.spec.ts
├─ playwright.config.ts
├─ playwright-report/
├─ test-results/
└─ .auth/
   └─ foundry-gm.json
```

### Rôle des dossiers

#### `specs/`

Contient les scénarios de test lisibles.

Exemple :

```ts
test('GM can create a character and complete base creation flow', async ({ page }) => {
  // scénario métier de haut niveau
})
```

#### `pages/`

Contient les objets de page Playwright.

L’objectif est d’éviter les tests remplis de sélecteurs CSS fragiles.

#### `flows/`

Contient les parcours réutilisables : créer un acteur, ouvrir la fiche, sélectionner une carrière, etc.

#### `fixtures/`

Contient les helpers Playwright spécifiques à Foundry : attente du chargement de Foundry, accès à `game`, nettoyage du monde de test, vérification des erreurs console.

#### `.auth/`

Contient l’état de session Playwright sauvegardé localement.

Ce dossier ne doit pas être versionné.

## 6. Installation minimale

```bash
npm install -D @playwright/test
npx playwright install
```

Scripts recommandés dans `package.json` :

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:report": "playwright show-report"
  }
}
```

## 7. Configuration Playwright proposée

Fichier : `playwright.config.ts`

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e/specs',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],
  use: {
    baseURL: process.env.FOUNDRY_URL ?? 'http://localhost:30000',
    browserName: 'chromium',
    headless: false,
    viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    storageState: '.auth/foundry-gm.json',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium-local-foundry',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],
})
```

### Pourquoi `workers: 1`

Foundry VTT manipule un monde persistant. Lancer plusieurs tests E2E en parallèle risque de créer des collisions : mêmes acteurs, mêmes compendiums, mêmes fenêtres, mêmes états de monde.

Pour une suite locale fiable, il vaut mieux être plus lent mais déterministe.

### Pourquoi `headless: false`

Au début, il est préférable de voir ce que Playwright fait dans Foundry. Lorsque les tests seront stabilisés, tu pourras passer ponctuellement en headless.

### Pourquoi `trace: retain-on-failure`

Les traces Playwright sont très utiles dans Foundry, parce qu’elles permettent de revoir l’état de l’interface au moment exact où le test a échoué.

## 8. Démarrage de Foundry pour les tests

Deux options sont possibles.

### Option A — Démarrage manuel recommandé au début

Tu démarres Foundry toi-même, puis tu lances Playwright.

Exemple :

```bash
npm run test:e2e:ui
```

Avantages :

- plus simple ;
- moins de magie ;
- plus facile à déboguer ;
- adapté à une suite locale.

Inconvénient :

- il faut penser à démarrer Foundry avant les tests.

### Option B — Démarrage automatisé via `webServer`

À envisager plus tard, si tu disposes d’une commande fiable pour lancer Foundry localement avec un monde de test.

Exemple conceptuel :

```ts
webServer: {
  command: 'npm run foundry:test-world',
  url: 'http://localhost:30000',
  reuseExistingServer: true,
  timeout: 120_000,
}
```

À ne pas mettre en place trop tôt. Le risque est de perdre du temps sur l’orchestration du serveur au lieu de stabiliser les parcours E2E.

## 9. Préparer un monde de test dédié

Il faut créer un monde Foundry réservé aux tests E2E.

Nom suggéré :

```txt
SWERPG E2E Test World
```

Ce monde doit contenir :

- le système SWERPG actif ;
- les compendiums ou données nécessaires aux parcours de base ;
- un utilisateur GM réservé aux tests ;
- éventuellement un acteur ou dossier de test initial ;
- aucun contenu de campagne réelle.

Le monde de test doit être jetable. Si un test le pollue, on doit pouvoir le réinitialiser sans conséquence.

## 10. Authentification Playwright

Le but est d’éviter de refaire la connexion Foundry à chaque test.

Fichier : `tests/e2e/auth.setup.ts`

```ts
import { test as setup, expect } from '@playwright/test'

const authFile = '.auth/foundry-gm.json'

setup('authenticate as GM', async ({ page }) => {
  await page.goto('/')

  // À adapter à ton écran de connexion Foundry réel.
  // L’objectif est de sélectionner l’utilisateur GM de test,
  // saisir le mot de passe si nécessaire, puis rejoindre le monde.

  await page.getByRole('button', { name: /join|rejoindre|login/i }).click()

  await expect(page.locator('#ui-left')).toBeVisible({ timeout: 30_000 })
  await page.context().storageState({ path: authFile })
})
```

Ce fichier devra être adapté à ton écran réel : langue de Foundry, présence ou non d’un mot de passe, nom du bouton, écran de sélection du monde, etc.

## 11. Ajouter des sélecteurs stables dans le système

C’est probablement le point le plus important.

Il ne faut pas écrire des tests Playwright dépendants de classes CSS décoratives comme :

```ts
page.locator('.subtitle .species a')
```

Ce type de sélecteur casse dès que tu modifies le HTML ou le style.

Il faut ajouter des attributs stables orientés test ou accessibilité.

Exemple dans une feuille :

```html
<button
  type="button"
  data-action="editSpecies"
  data-testid="character-edit-species"
>
  {{species.name}}
</button>
```

Puis côté Playwright :

```ts
await page.getByTestId('character-edit-species').click()
```

### Convention recommandée

Utiliser une convention explicite :

```txt
data-testid="character-create"
data-testid="character-edit-species"
data-testid="character-edit-career"
data-testid="character-edit-specialization"
data-testid="character-xp-available"
data-testid="skill-rank-athletics"
data-testid="specialization-tree-open"
data-testid="specialization-tree-buy-button"
```

Les `data-testid` ne doivent pas porter de logique métier. Ils doivent uniquement stabiliser les tests.

## 12. Page objects recommandés

### `foundry-login.page.ts`

```ts
import { expect, Page } from '@playwright/test'

export class FoundryLoginPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/')
  }

  async expectWorldLoaded() {
    await expect(this.page.locator('#ui-left')).toBeVisible({ timeout: 30_000 })
    await expect(this.page.locator('#sidebar')).toBeVisible({ timeout: 30_000 })
  }
}
```

### `actor-directory.page.ts`

```ts
import { Page, expect } from '@playwright/test'

export class ActorDirectoryPage {
  constructor(private readonly page: Page) {}

  async openActorsTab() {
    await this.page.locator('[data-tab="actors"]').click()
  }

  async createCharacter(name: string) {
    await this.openActorsTab()

    await this.page.getByRole('button', { name: /create actor|nouvel acteur|créer un acteur/i }).click()

    await this.page.getByLabel(/name|nom/i).fill(name)

    // À adapter selon le libellé réel du type d’acteur.
    await this.page.getByLabel(/type/i).selectOption('character')

    await this.page.getByRole('button', { name: /create|créer/i }).click()

    await expect(this.page.getByText(name)).toBeVisible()
  }
}
```

### `character-sheet.page.ts`

```ts
import { expect, Page } from '@playwright/test'

export class CharacterSheetPage {
  constructor(private readonly page: Page) {}

  async open(name: string) {
    await this.page.getByText(name).dblclick()
    await expect(this.page.locator('.swerpg.actor.sheet')).toBeVisible()
  }

  async selectSpecies(speciesName: string) {
    await this.page.getByTestId('character-edit-species').click()
    await this.page.getByText(speciesName, { exact: true }).click()
    await expect(this.page.getByTestId('character-species-name')).toHaveText(speciesName)
  }

  async selectCareer(careerName: string) {
    await this.page.getByTestId('character-edit-career').click()
    await this.page.getByText(careerName, { exact: true }).click()
    await expect(this.page.getByTestId('character-career-name')).toHaveText(careerName)
  }

  async selectSpecialization(specializationName: string) {
    await this.page.getByTestId('character-edit-specialization').click()
    await this.page.getByText(specializationName, { exact: true }).click()
    await expect(this.page.getByTestId('character-specialization-name')).toHaveText(specializationName)
  }

  async expectXpAvailable(value: number) {
    await expect(this.page.getByTestId('character-xp-available')).toHaveText(String(value))
  }
}
```

Ces exemples ne sont pas copiables tels quels sans adaptation, car les libellés exacts et le DOM réel de ta sheet doivent être alignés. Ils donnent la structure cible.

## 13. Exemple de test E2E de haut niveau

Fichier : `tests/e2e/specs/character-creation.spec.ts`

```ts
import { test, expect } from '@playwright/test'
import { ActorDirectoryPage } from '../pages/actor-directory.page'
import { CharacterSheetPage } from '../pages/character-sheet.page'

test.describe('SWERPG character creation smoke flow', () => {
  test('GM can create a character and complete the base creation choices', async ({ page }) => {
    const actorName = `E2E Character ${Date.now()}`

    const actors = new ActorDirectoryPage(page)
    const sheet = new CharacterSheetPage(page)

    await page.goto('/game')

    await expect(page.locator('#ui-left')).toBeVisible({ timeout: 30_000 })

    await actors.createCharacter(actorName)
    await sheet.open(actorName)

    await sheet.selectSpecies('Bothan')
    await sheet.selectCareer('Explorer')
    await sheet.selectSpecialization('Ambassador')

    await expect(page.getByText(actorName)).toBeVisible()
    await expect(page.getByTestId('character-species-name')).toHaveText('Bothan')
    await expect(page.getByTestId('character-career-name')).toHaveText('Explorer')
    await expect(page.getByTestId('character-specialization-name')).toHaveText('Ambassador')
  })
})
```

## 14. Vérifier les erreurs console

Un test E2E peut passer visuellement tout en produisant des erreurs JavaScript. Pour un système Foundry, c’est dangereux.

Ajouter une fixture qui échoue en cas d’erreur console non autorisée.

Fichier : `tests/e2e/fixtures/foundry.fixture.ts`

```ts
import { test as base } from '@playwright/test'

const ignoredConsoleErrors = [
  // À documenter explicitement si certains warnings Foundry sont connus et acceptés.
]

export const test = base.extend({
  page: async ({ page }, use) => {
    const errors: string[] = []

    page.on('console', (message) => {
      if (message.type() !== 'error') return

      const text = message.text()
      const ignored = ignoredConsoleErrors.some((pattern) => text.includes(pattern))

      if (!ignored) errors.push(text)
    })

    page.on('pageerror', (error) => {
      errors.push(error.message)
    })

    await use(page)

    if (errors.length > 0) {
      throw new Error(`Unexpected browser errors:\n${errors.join('\n')}`)
    }
  },
})

export { expect } from '@playwright/test'
```

Puis dans les specs :

```ts
import { test, expect } from '../fixtures/foundry.fixture'
```

## 15. Nettoyage des données de test

Deux stratégies sont possibles.

### Stratégie 1 — noms uniques et nettoyage manuel

Chaque test crée des acteurs avec un nom unique :

```ts
const actorName = `E2E Character ${Date.now()}`
```

C’est simple, mais le monde se pollue progressivement.

### Stratégie 2 — nettoyage via l’API Foundry côté navigateur

Après le test, on supprime les documents créés.

Exemple conceptuel :

```ts
await page.evaluate(async (actorName) => {
  const actor = game.actors?.find((a) => a.name === actorName)
  if (actor) await actor.delete()
}, actorName)
```

Cette approche est plus propre, mais elle dépend de l’API Foundry côté client. Elle doit rester confinée à des helpers E2E.

### Recommandation

Commencer par la stratégie 1, puis ajouter la stratégie 2 lorsque les tests sont stabilisés.

## 16. Tests E2E prioritaires pour SWERPG

### Test 1 — Démarrage du monde

But : vérifier que Foundry charge le monde SWERPG sans erreur bloquante.

Validation :

- le monde est chargé ;
- la sidebar est visible ;
- aucune erreur console critique ;
- le système SWERPG est actif.

### Test 2 — Création d’un personnage

But : vérifier que l’acteur personnage peut être créé et que sa fiche s’ouvre.

Validation :

- acteur créé ;
- fiche visible ;
- nom visible ;
- sections principales visibles.

### Test 3 — Parcours de création de base

But : vérifier le flux utilisateur minimal.

Validation :

- choix d’une espèce ;
- choix d’une carrière ;
- choix d’une spécialisation ;
- valeurs visibles sur la fiche ;
- XP disponible visible ;
- pas d’erreur console.

### Test 4 — Dépense simple d’XP

But : vérifier qu’une action de progression simple fonctionne via l’UI.

Validation :

- augmentation d’un rang de compétence ;
- XP disponible diminuée ;
- rang affiché mis à jour ;
- sauvegarde persistée après fermeture/réouverture de la fiche.

### Test 5 — Ouverture de l’arbre de spécialisation

But : vérifier que l’application graphique s’ouvre.

Validation :

- bouton d’ouverture visible ;
- `SpecializationTreeApp` ouverte ;
- canvas ou conteneur graphique visible ;
- au moins un nœud affiché ;
- sidebar de l’arbre visible ;
- pas d’erreur console.

## 17. Ce qu’il faut éviter

### Éviter les tests trop précis sur le CSS

Mauvais test :

```ts
await expect(page.locator('.node.available .cost')).toHaveCSS('color', 'rgb(255, 204, 0)')
```

Meilleur test :

```ts
await expect(page.getByTestId('talent-node-state')).toHaveText('Available')
```

Le rendu visuel doit être testé avec parcimonie. Playwright peut faire du screenshot testing, mais pour Foundry, ce sera probablement fragile à cause des fenêtres, thèmes, polices, canvas et différences de rendu.

### Éviter de tester tous les cas métier en E2E

Un test E2E ne doit pas devenir une matrice exhaustive de règles.

Mauvais objectif :

> Tester toutes les espèces, toutes les carrières et toutes les spécialisations.

Bon objectif :

> Vérifier qu’au moins un parcours complet représentatif fonctionne réellement dans l’interface.

### Éviter les sélecteurs dépendants des traductions

Les tests qui cliquent sur du texte traduit peuvent casser si tu changes une clé i18n.

Il vaut mieux privilégier :

- `data-testid` pour les actions critiques ;
- `getByRole` quand les libellés sont stables ;
- `getByLabel` pour les champs de formulaire ;
- les assertions sur données visibles seulement quand elles sont métier.

## 18. Commandes de travail recommandées

### Lancer la suite complète

```bash
npm run test:e2e
```

### Lancer en mode visuel interactif

```bash
npm run test:e2e:ui
```

### Lancer avec navigateur visible

```bash
npm run test:e2e:headed
```

### Déboguer un test

```bash
npm run test:e2e:debug
```

### Voir le rapport HTML

```bash
npm run test:e2e:report
```

### Générer une première version d’un test

```bash
npx playwright codegen http://localhost:30000
```

Le code généré doit être considéré comme un brouillon. Il faut ensuite le refactorer en page objects et remplacer les sélecteurs fragiles par des sélecteurs stables.

## 19. Critères d’acceptation pour l’introduction de Playwright

Une première issue Playwright peut être considérée comme terminée si :

- Playwright est installé ;
- `playwright.config.ts` existe ;
- les scripts npm locaux existent ;
- les dossiers `tests/e2e`, `pages`, `flows`, `fixtures`, `specs` existent ;
- un monde Foundry local de test est documenté ;
- `.auth/` est ignoré par Git ;
- un premier test vérifie le chargement du monde ;
- un deuxième test crée un acteur personnage ;
- les traces, screenshots et vidéos sont conservés uniquement en cas d’échec ;
- les tests ne sont pas appelés par GitHub Actions.

## 20. Découpage conseillé en issues

### Issue 1 — Installer et configurer Playwright localement

Objectif : poser l’infrastructure minimale.

Contenu :

- dépendance `@playwright/test` ;
- `playwright.config.ts` ;
- scripts npm ;
- `.gitignore` pour `.auth/`, `playwright-report/`, `test-results/` ;
- documentation de lancement local.

### Issue 2 — Créer le monde Foundry de test E2E

Objectif : disposer d’un environnement manuel reproductible.

Contenu :

- monde dédié ;
- utilisateur GM de test ;
- système SWERPG actif ;
- données minimales disponibles ;
- procédure de reset documentée.

### Issue 3 — Ajouter les premiers sélecteurs stables dans la fiche personnage

Objectif : rendre la fiche testable proprement.

Contenu :

- `data-testid` sur les actions critiques ;
- `data-testid` sur les valeurs affichées importantes ;
- aucun impact métier ;
- aucun impact visuel.

### Issue 4 — Ajouter les fixtures Foundry Playwright

Objectif : fiabiliser les tests.

Contenu :

- attente de chargement du monde ;
- capture des erreurs console ;
- helpers de nettoyage optionnels ;
- helpers d’accès aux documents Foundry si nécessaire.

### Issue 5 — Ajouter le premier parcours E2E complet

Objectif : valider le flux utilisateur de base.

Contenu :

- création d’un personnage ;
- ouverture de la fiche ;
- choix espèce ;
- choix carrière ;
- choix spécialisation ;
- validation des valeurs visibles ;
- absence d’erreur console.

## 21. Recommandation finale

La meilleure approche n’est pas de “tester Foundry avec Playwright”.

La bonne approche est de créer une petite couche de tests E2E qui répond à une seule question :

> Après mes refactors, est-ce qu’un MJ peut encore accomplir les actions essentielles dans l’interface SWERPG ?

C’est cette question qui doit guider le scope.

Pour ton système, je recommande de viser une première suite de 3 à 5 tests maximum :

1. le monde SWERPG démarre ;
2. un personnage peut être créé ;
3. le parcours espèce → carrière → spécialisation fonctionne ;
4. une dépense simple d’XP fonctionne et persiste ;
5. l’arbre de spécialisation s’ouvre sans erreur.

Au-delà, le risque est de reconstruire en Playwright une deuxième pyramide de tests métier, plus lente et plus fragile que celle que tu as déjà avec Vitest.

## 22. Sources techniques consultées

- Documentation officielle Playwright — configuration, locators, codegen, UI mode, trace viewer, storage state.
- Documentation officielle Foundry VTT — configuration serveur, port par défaut, `--world`, `--dataPath`, documentation API v14, ApplicationV2.
- Documentation communautaire Foundry VTT — guides de développement système et conversion ApplicationV2.

