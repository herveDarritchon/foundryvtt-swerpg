# Squelette de spec Playwright E2E : `mon-parcours.spec.ts`

Ce document fournit un modèle de spec Playwright E2E pour Swerpg, destiné à servir de **guide** lors de l’ajout de nouvelles fonctionnalités testées end-to-end.

Le squelette suivant est conçu pour :

- réutiliser les **fixtures** communes (`../fixtures`),
- partir d’un monde Swerpg déjà chargé en `/game`,
- illustrer un **parcours fonctionnel** MJ/joueur simple mais complet,
- encourager l’usage de **locators accessibles** (`getByRole`, `getByText`, etc.).

---

## 1. Squelette de spec : `e2e/specs/mon-parcours.spec.ts`

> À copier/coller comme point de départ pour toute nouvelle spec.

```ts
import { test, expect } from '../fixtures'

test.describe('Swerpg - Mon parcours fonctionnel', () => {
  test('doit exécuter le parcours métier de bout en bout', async ({ page }) => {
    // --- 1. Préconditions : le monde Swerpg est chargé ---

    // La fixture ../fixtures prépare normalement la session et arrive sur /game
    await expect(page).toHaveURL(/.*game/)

    // Vérifie que l’on est bien sur un monde Swerpg (classe CSS système)
    const body = page.locator('body.system-swerpg')
    await expect(body).toHaveCount(1)

    // --- 2. Navigation vers la zone d’UI ciblée (à adapter) ---

    // Exemple : ouvrir un onglet ou un panneau via un tab / bouton accessible
    // Remplacer les labels par ceux de la fonctionnalité réelle.
    await page.getByRole('tab', { name: /Mon onglet système/i }).click()

    // Exemple : ouvrir une fiche, un panneau ou un dialogue spécifique
    await page.getByRole('button', { name: /Ouvrir mon panneau/i }).click()

    // --- 3. Assertions métier sur l’UI ---

    // Vérifier que le panneau / la feuille ciblé(e) est visible
    const dialog = page.getByRole('dialog', { name: /Mon panneau Swerpg/i })
    await expect(dialog).toBeVisible()

    // Vérifier la présence d’un contrôle clé (bouton, champ, onglet, etc.)
    const actionButton = dialog.getByRole('button', { name: /Lancer mon action/i })
    await expect(actionButton).toBeVisible()

    // Optionnel : interaction simple pour vérifier un comportement
    // await actionButton.click()
    // await expect(dialog.getByText(/Résultat de mon action/i)).toBeVisible()
  })
})
```

---

## 2. Comment utiliser ce squelette pour une nouvelle feature

### 2.1. Création de la spec

1. Créer un nouveau fichier dans `e2e/specs/`, par exemple :

   ```text
   e2e/specs/ma-nouvelle-feature.spec.ts
   ```

2. Copier le contenu du squelette ci-dessus dans ce nouveau fichier.

3. Vérifier l’import des fixtures :

   ```ts
   import { test, expect } from '../fixtures'
   ```

   Cela garantit que la session Foundry (licence, login admin, lancement du monde, join MJ) est gérée par les helpers existants.

### 2.2. Adapter le parcours métier

Remplacer progressivement les parties génériques par ton cas réel :

- **Nom du describe**

  ```ts
  test.describe('Swerpg - Configuration des motivations', () => {
    // ...
  })
  ```

- **Nom du test**

  ```ts
  test('doit permettre de configurer une motivation et la sauvegarder', async ({ page }) => {
    // ...
  })
  ```

- **Navigation (section 2 du squelette)**

  - Adapter les tabs / boutons ciblés :

    ```ts
    await page.getByRole('tab', { name: /Game Settings/i }).click()
    await page.getByRole('button', { name: /Configure Settings/i }).click()
    await page.getByRole('button', { name: /Star Wars Edge RPG/i }).click()
    ```

  - Ouvrir ensuite la partie d’UI spécifique à ta feature (panneau, section de formulaire, etc.).

### 2.3. Définir des assertions métier ciblées

Dans la section "Assertions métier" du squelette, remplace les contrôles génériques par ceux qui valident réellement ta feature :

- Vérifier la présence de champs ou boutons obligatoires :

  ```ts
  const motivationInput = dialog.getByLabel('Motivation principale')
  await expect(motivationInput).toBeVisible()
  ```

- Vérifier que des valeurs par défaut attendues sont présentes :

  ```ts
  await expect(motivationInput).toHaveValue('Défaut attendu')
  ```

- Vérifier un comportement simple après clic :

  ```ts
  const saveButton = dialog.getByRole('button', { name: /Save/i })
  await saveButton.click()

  await expect(page.getByText(/Motivation enregistrée avec succès/i)).toBeVisible()
  ```

L’idée est de garder **1 à 3 assertions clés** par scénario, focalisées sur ce qui prouve que la fonctionnalité marche du point de vue MJ/joueur.

### 2.4. Bonnes pratiques à respecter

- **Toujours** vérifier que la page est bien en `/game` avec `body.system-swerpg` au début du test :

  ```ts
  await expect(page).toHaveURL(/.*game/)
  await expect(page.locator('body.system-swerpg')).toHaveCount(1)
  ```

- Utiliser des **locators accessibles** :
  - `getByRole('button', { name: /…/i })`
  - `getByRole('tab', { name: /…/i })`
  - `getByLabel('…')`
  - `getByText('…')` en dernier recours.

- Garder les scénarios **courts et lisibles** :
  - Une spec = un parcours métier cohérent,
  - Éviter les enchaînements de 10+ actions si possible,
  - Quand c’est complexe, scinder en plusieurs tests dans le même `describe`.

- Ne pas dupliquer la logique de login / lancement de monde :
  - S’appuyer sur les fixtures et helpers (`foundrySession.ts`, `e2eTest.ts`).

### 2.5. Exécution rapide de la nouvelle spec

Pour exécuter uniquement ta nouvelle spec :

```bash
pnpm e2e -- e2e/specs/ma-nouvelle-feature.spec.ts
```

Pour la déboguer en mode headed :

```bash
pnpm e2e:headed -- e2e/specs/ma-nouvelle-feature.spec.ts
```

---

## 3. Résumé

- Ce squelette `mon-parcours.spec.ts` fournit un point de départ standardisé pour tout nouveau test E2E Swerpg.
- Il illustre un parcours complet mais simple : vérification du monde, navigation dans l’UI, assertions métier.
- Pour chaque nouvelle feature, il suffit de :
  1. Copier ce modèle dans `e2e/specs/`.
  2. Adapter les labels / interactions à la feature réelle.
  3. Ajouter 1–3 assertions métier robustes.

En suivant ce modèle, la suite E2E reste homogène, lisible et plus facile à maintenir au fur et à mesure de l’évolution du système Swerpg.
