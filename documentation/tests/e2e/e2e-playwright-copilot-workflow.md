# Cadre de développement des tests E2E Playwright avec Copilot

## 1. Architecture de base à mettre en place (avant même Copilot)

Tu te poses ça une bonne fois, **à la main**, ensuite Copilot ne fait que du remplissage.

### a) Un dossier `e2e/` structuré

```text
e2e/
  fixtures/
    foundry-fixtures.ts   // login, choix de world, dismiss overlays
  pages/
    foundry-setup-page.ts // tuiles de world, boutons
    foundry-game-page.ts  // scène, sidebar, chat, etc.
  specs/
    bootstrap.spec.ts
    oggdude-import.spec.ts
```

### b) Un fichier de fixtures “core”

```ts
// e2e/fixtures/foundry-fixtures.ts
import { test as base } from '@playwright/test'
import { FoundrySetupPage } from '../pages/foundry-setup-page'
import { FoundryGamePage } from '../pages/foundry-game-page'

type Fixtures = {
  setupPage: FoundrySetupPage
  gamePage: FoundryGamePage
}

export const test = base.extend<Fixtures>({
  setupPage: async ({ page }, use) => {
    const setupPage = new FoundrySetupPage(page)
    await use(setupPage)
  },
  gamePage: async ({ page }, use) => {
    const gamePage = new FoundryGamePage(page)
    await use(gamePage)
  },
})

export { expect } from '@playwright/test'
```

Ce fichier-là, tu le poses **toi**, proprement. Ensuite tu laisses Copilot t’aider à remplir les classes.

---

## 2. Comment “driver” Copilot dans les fichiers de test

L’idée : **tu écris le scénario en pseudo-code / commentaires**, Copilot te génère les étapes Playwright.

### a) Workflow pour une *nouvelle* spec

1. Tu crées le fichier :

```ts
// e2e/specs/bootstrap.spec.ts
import { test, expect } from '../fixtures/foundry-fixtures'

test.describe('Bootstrap SWERPG E2E world', () => {
  test('admin can open the dedicated E2E world', async ({ setupPage, gamePage }) => {
    // Arrange: login as admin and display world list
    // Act: select "swerpg-e2e-world" tile and launch the world
    // Assert: game canvas is loaded and system UI is visible
  })
})
```

2. Tu mets ton curseur après le premier commentaire `// Arrange...` et tu laisses Copilot proposer.
3. Tu acceptes / ajustes **ligne par ligne** (pas tout le bloc comme un bourrin).

Exemple typique :

```ts
    // Arrange: login as admin and display world list
    await setupPage.goto()
    await setupPage.loginAsAdmin(process.env.FOUNDRY_ADMIN_PASSWORD!)
    await setupPage.expectWorldListVisible()
```

Tu écris le nom de fonction, Copilot te propose le corps dans `FoundrySetupPage` quand tu vas l’ouvrir.

---

## 3. Comment utiliser Copilot dans les “page objects”

Là aussi, c’est toi le chef.

### a) Tu définis l’intention + la signature

```ts
// e2e/pages/foundry-setup-page.ts
import { expect, Page } from '@playwright/test'

export class FoundrySetupPage {
  constructor(private readonly page: Page) {}

  // Go to the Foundry setup page using baseURL
  async goto() {
    await this.page.goto('/')
  }

  // Login as admin using the provided password
  async loginAsAdmin(password: string) {
    // ...
  }

  // Select and launch a world by its title (e.g. "swerpg-e2e-world")
  async launchWorldByTitle(title: string) {
    // ...
  }

  // Wait until the world list is visible
  async expectWorldListVisible() {
    // ...
  }
}
```

Ensuite tu te mets dans `loginAsAdmin` et tu laisses Copilot faire une première proposition à partir d’un commentaire plus explicite :

```ts
  async loginAsAdmin(password: string) {
    // Fill admin password input and submit login form
    await this.page.getByLabel('Admin Access Key').fill(password)
    await this.page.getByRole('button', { name: 'Login' }).click()
    await expect(this.page.getByText('Admin authentication successful')).toBeVisible()
  }
```

Tu **corriges les sélecteurs** pour qu’ils soient stables (role, text, `data-test-id`), pas d’XPath / nth-child si tu peux l’éviter.

### b) Tu t’interdis certains trucs (et tu les refuses à Copilot)

* ❌ `locator('div:nth-child(3) …')`

* ❌ `waitForTimeout(5000)`

* ❌ `page.click('text=Play')` sans assert derrière

* ✅ `getByRole`, `getByText`, `getByTestId`

* ✅ `expect(...).toBeVisible()` après chaque action importante

* ✅ helpers dans les page objects pour les flows pénibles (login, dismiss overlays, etc.)

Dès que Copilot te propose un truc fragile → tu le réécris **à la main**, et il apprendra très vite ton style.

---

## 4. Boucle de dev avec Playwright + Copilot

Pour être concret, je te propose cette boucle pour chaque nouveau scénario :

1. **Enregistrer la vraie interaction à la main**

    * `pnpm exec playwright codegen http://localhost:30000`
    * Tu joues le scénario dans Foundry (login, choisir le world, fermer les popups).
    * Tu récupères des bouts de code / sélecteurs **juste comme base**, pas pour les coller brut.

2. **Écrire la spec à la main + commentaires**

    * Comme montré plus haut : `Arrange / Act / Assert` en commentaires.

3. **Utiliser Copilot pour le “bourrage”**

    * Laisser Copilot proposer le remplissage des fonctions dans les page objects et les asserts.
    * Ajuster immédiatement les sélecteurs, les messages, les timeouts.

4. **Stabiliser avec traces**

    * `pnpm e2e:headed e2e/specs/bootstrap.spec.ts`
    * Si ça foire → `pnpm exec playwright show-trace path/to/trace.zip`
    * Tu repères où ça coince, tu ajustes, tu rerun.

5. **Refacto régulier**

    * Dès que 2 tests copient le même bloc → tu sors un helper / méthode de page object **et tu l’annonces dans un commentaire** pour que Copilot recolle dessus ensuite.

---

## 5. Petite check-list “bonne pratique Copilot + Playwright”

* 💡 *Toujours* écrire **d’abord** le scénario en français ou en pseudo-code dans les commentaires.
* 💡 Utiliser Copilot pour :

    * générer du boilerplate (imports, signatures, boucles, petits helpers),
    * cloner des patterns déjà propres (tes propres locators, tes propres fixtures).
* 💣 Ne jamais accepter :

    * des sélecteurs illisibles,
    * des `waitForTimeout` magiques,
    * des tests qui n’ont pas d’assert ou un seul assert en fin de fichier.
* 💡 Centraliser :

    * login + choix de world + dismiss overlays dans 1–2 helpers bien nommés,
    * et toujours y faire référence par des noms explicites (`loginAsAdminAndEnterWorld('swerpg-e2e-world')`).

---

Si tu veux, prochain step : tu m’envoies **un** scénario métier Foundry (ex : “créer un perso, lui lancer un jet, vérifier le chat”) et je te fais *la spec + les commentaires exacts* pour guider Copilot dans ta base actuelle.
