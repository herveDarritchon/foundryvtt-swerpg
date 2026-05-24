# Cadrage — Suite E2E Documentation pour génération de User Guides

## 1. Objectif

Mettre en place un troisième type de parcours Playwright dédié à la génération de documentation utilisateur.

Ces parcours ne doivent pas être considérés comme des tests de validation fonctionnelle classiques. Leur objectif principal est de parcourir l’application de manière déterministe, de capturer des screenshots propres et de produire des données structurées exploitables par une IA afin de générer un user guide en anglais.

La commande cible est :

```bash
pnpm run e2e:documentation
````

Le résultat attendu est un ensemble de captures d’écran, de métadonnées de parcours et de fichiers Markdown pouvant servir de base à une documentation utilisateur.

## 2. Contexte

Le projet dispose déjà de tests E2E Playwright orientés validation fonctionnelle, notamment des suites de smoke tests et de regression tests.

Le besoin ici est différent.

Les tests E2E existants répondent à la question :

> “Est-ce que l’application fonctionne correctement ?”

La suite E2E Documentation doit répondre à la question :

> “Comment documenter clairement un parcours utilisateur réel avec des captures à jour ?”

Playwright est adapté à ce besoin car il permet d’automatiser un navigateur, d’exécuter des actions utilisateur, de capturer des screenshots, de structurer des étapes avec `test.step`, et de produire des artefacts exploitables. La documentation officielle Playwright confirme le support de l’automatisation navigateur, des tests multi-navigateurs, du tracing, des reporters et des artefacts liés à l’exécution. Source : Playwright, documentation officielle, consultée le 24 mai 2026, [https://playwright.dev/](https://playwright.dev/) ([Playwright][1])

## 3. Décision de cadrage

Créer un troisième type de parcours E2E :

```txt
1. Smoke E2E
   Objectif : vérifier rapidement que les parcours critiques ne sont pas cassés.

2. Regression E2E
   Objectif : vérifier en profondeur la stabilité fonctionnelle des parcours métier.

3. Documentation E2E
   Objectif : explorer l’application, capturer des screenshots propres et produire une base de user guide en anglais.
```

La suite Documentation E2E ne doit pas être traitée comme une suite de tests bloquante au même niveau que les suites smoke ou regression.

Elle peut contenir des assertions minimales de sécurité, mais son rôle principal est documentaire.

## 4. Non-objectifs

Cette suite ne doit pas servir à :

* remplacer les tests smoke ;
* remplacer les tests de regression ;
* valider exhaustivement les règles métier ;
* détecter tous les bugs fonctionnels ;
* générer automatiquement une documentation publiable sans relecture humaine ;
* produire une documentation commerciale ou marketing ;
* documenter des états instables, aléatoires ou dépendants de données non maîtrisées.

La documentation générée par IA doit être considérée comme une première version éditoriale, jamais comme une source finale non relue.

## 5. Principe général

Le pipeline cible est le suivant :

```txt
Playwright documentation scenario
        ↓
Exploration déterministe de l’application
        ↓
Screenshots propres + metadata JSON
        ↓
Génération IA du user guide en anglais
        ↓
Markdown structuré
        ↓
Relecture humaine
        ↓
Publication documentation
```

## 6. Commande cible

Ajouter une commande dédiée dans `package.json` :

```json
{
  "scripts": {
    "e2e:documentation": "playwright test --config=e2e/documentation/playwright.documentation.config.ts"
  }
}
```

Cette commande doit exécuter uniquement les parcours documentaires.

Elle ne doit pas lancer les suites smoke ou regression.

## 7. Structure de fichiers proposée

```txt
e2e/
  documentation/
    playwright.documentation.config.ts

    fixtures/
      documentation-setup.ts

    specs/
      character-creation.guide.spec.ts
      xp-spend.guide.spec.ts
      specialization-tree.guide.spec.ts

    utils/
      documentation-world-manager.ts
      screenshot-helper.ts
      guide-step-recorder.ts
      guide-metadata-writer.ts

    output/
      raw/
        character-creation.guide.json
      screenshots/
        character-creation/
          01-open-actors-directory.png
          02-create-character-dialog.png
          03-fill-character-form.png
      markdown/
        character-creation.md
```

## 8. Convention de nommage

Les fichiers de parcours documentaires doivent utiliser le suffixe :

```txt
*.guide.spec.ts
```

Exemples :

```txt
character-creation.guide.spec.ts
xp-spend.guide.spec.ts
specialization-tree.guide.spec.ts
```

Les captures doivent être préfixées avec un numéro d’ordre stable :

```txt
01-open-actors-directory.png
02-click-create-character.png
03-fill-character-name.png
04-confirm-character-creation.png
```

Cette convention permet de garantir un ordre lisible dans le user guide généré.

## 9. Comportement attendu des parcours Documentation E2E

Chaque parcours documentaire doit :

1. préparer un état applicatif déterministe ;
2. ouvrir l’écran cible ;
3. effectuer les actions utilisateur représentatives ;
4. capturer un screenshot à chaque étape importante ;
5. enregistrer une description structurée de chaque étape ;
6. produire un fichier JSON intermédiaire ;
7. optionnellement déclencher la génération Markdown via IA.

Exemple de données structurées :

```json
{
  "guideId": "character-creation",
  "title": "Creating a Character",
  "audience": "End user",
  "language": "en",
  "steps": [
    {
      "order": 1,
      "title": "Open the Actors directory",
      "userAction": "Click the Actors tab in the sidebar.",
      "expectedScreenState": "The Actors directory is visible.",
      "screenshot": "screenshots/character-creation/01-open-actors-directory.png"
    },
    {
      "order": 2,
      "title": "Create a new character",
      "userAction": "Click the Create Actor button.",
      "expectedScreenState": "The character creation dialog is displayed.",
      "screenshot": "screenshots/character-creation/02-create-character-dialog.png"
    }
  ]
}
```

## 10. Rôle de Playwright

Playwright est utilisé pour :

* piloter le navigateur ;
* ouvrir l’application ;
* cliquer dans l’interface ;
* remplir des formulaires ;
* stabiliser les attentes avant capture ;
* capturer des screenshots ;
* produire des artefacts techniques ;
* structurer les étapes de parcours.

Playwright ne doit pas être utilisé ici pour faire des assertions métier complexes. Les assertions doivent rester limitées aux conditions nécessaires pour garantir que la capture est pertinente.

Exemples d’assertions acceptables :

```ts
await expect(page.getByRole('heading', { name: 'Actors' })).toBeVisible();
await expect(page.getByRole('button', { name: 'Create Actor' })).toBeVisible();
```

Exemples d’assertions à éviter dans cette suite :

```ts
await expect(character.xp).toBe(42);
await expect(databaseState).toEqual(expectedComplexState);
```

Ces vérifications appartiennent aux suites regression.

## 11. Rôle de l’IA

L’IA est utilisée pour transformer les données structurées et les screenshots en user guide anglais.

Elle peut :

* reformuler les étapes en anglais clair ;
* produire des titres lisibles ;
* générer une introduction ;
* générer des notes utilisateur ;
* proposer des warnings ou tips si fournis dans les métadonnées ;
* transformer le JSON intermédiaire en Markdown ;
* harmoniser le ton et le niveau de détail.

L’IA ne doit pas :

* inventer des fonctionnalités ;
* ajouter des boutons qui ne sont pas présents dans le parcours ;
* extrapoler des règles métier ;
* modifier le sens d’une étape ;
* remplacer la validation humaine ;
* produire une documentation finale sans relecture.

## 12. Format cible du user guide

Le user guide doit être généré en anglais.

Format recommandé : Markdown.

Exemple :

```md
# Creating a Character

This guide explains how to create a new character from the Actors directory.

## Prerequisites

- The application is running.
- The user has access to the Actors directory.

## Step 1 — Open the Actors directory

Click the **Actors** tab in the sidebar.

![Open the Actors directory](../screenshots/character-creation/01-open-actors-directory.png)

## Step 2 — Create a new character

Click **Create Actor** to open the character creation dialog.

![Create character dialog](../screenshots/character-creation/02-create-character-dialog.png)

## Step 3 — Fill in the character information

Enter the character name and confirm the creation.

![Fill character form](../screenshots/character-creation/03-fill-character-form.png)
```

## 13. Exemple de spec Playwright documentaire

```ts
import { test, expect } from '@playwright/test';
import { createGuideRecorder } from '../utils/guide-step-recorder';

test.describe('User Guide — Character Creation', () => {
  test('Generate documentation assets for character creation', async ({ page }) => {
    const guide = createGuideRecorder({
      guideId: 'character-creation',
      title: 'Creating a Character',
      language: 'en',
      outputDir: 'e2e/documentation/output',
    });

    await page.goto('/');

    await test.step('Open the Actors directory', async () => {
      await page.getByRole('tab', { name: 'Actors' }).click();

      await expect(
        page.getByRole('heading', { name: 'Actors' })
      ).toBeVisible();

      await guide.captureStep(page, {
        title: 'Open the Actors directory',
        userAction: 'Click the Actors tab in the sidebar.',
        expectedScreenState: 'The Actors directory is visible.',
        screenshotName: '01-open-actors-directory.png',
      });
    });

    await test.step('Create a new character', async () => {
      await page.getByRole('button', { name: 'Create Actor' }).click();

      await expect(
        page.getByRole('dialog')
      ).toBeVisible();

      await guide.captureStep(page, {
        title: 'Create a new character',
        userAction: 'Click the Create Actor button.',
        expectedScreenState: 'The character creation dialog is displayed.',
        screenshotName: '02-create-character-dialog.png',
      });
    });

    await guide.writeMetadata();
  });
});
```

## 14. Configuration Playwright dédiée

Créer une configuration séparée :

```ts
// e2e/documentation/playwright.documentation.config.ts

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:30000',
    screenshot: 'off',
    video: 'off',
    trace: 'retain-on-failure',
    viewport: {
      width: 1440,
      height: 1000,
    },
  },

  reporter: [
    ['list'],
    ['html', { outputFolder: 'e2e/documentation/output/playwright-report', open: 'never' }],
  ],
});
```

Décision importante : `fullyParallel: false`.

Pour de la documentation, la priorité n’est pas la vitesse. La priorité est la stabilité, la lisibilité et la reproductibilité des captures.

## 15. Gestion des screenshots

Les screenshots doivent être :

* stables ;
* lisibles ;
* non bruités ;
* exempts de données personnelles ;
* produits avec une taille de viewport constante ;
* nommés explicitement ;
* versionnables si nécessaire ;
* ou générés en artefacts CI si l’équipe ne veut pas les committer.

Recommandation :

```ts
await page.screenshot({
  path: screenshotPath,
  fullPage: false,
  animations: 'disabled',
});
```

Les animations doivent être désactivées ou neutralisées autant que possible pour éviter les captures instables.

## 16. Données de test

La suite Documentation E2E doit utiliser un monde ou un état applicatif dédié.

Elle ne doit jamais être exécutée sur :

* un environnement de production ;
* un environnement client partagé ;
* une base contenant des données sensibles ;
* un monde de test utilisé en parallèle par une autre suite.

Recommandation :

```txt
documentation-world
```

Ce monde doit être réinitialisé avant chaque génération documentaire.

## 17. Relation avec le reset déterministe

La suite Documentation E2E peut réutiliser les helpers de reset déterministe existants, mais avec prudence.

Si les helpers actuels sont orientés regression, il est préférable de créer une couche dédiée :

```txt
documentation-world-manager.ts
```

Objectif : garantir un état visuel propre, pas seulement un état fonctionnel valide.

Exemples de responsabilités :

* supprimer les entités créées par une génération précédente ;
* recréer les données minimales nécessaires ;
* garantir des noms stables ;
* éviter les timestamps variables ;
* éviter les états aléatoires ;
* nettoyer les notifications ou popups parasites.

## 18. Intégration IA

Deux options sont possibles.

### Option A — Génération séparée

La commande `pnpm run e2e:documentation` génère uniquement les screenshots et JSON.

Puis une seconde commande génère le guide :

```bash
pnpm run docs:generate-user-guides
```

Avantage : séparation propre entre automation et génération éditoriale.

### Option B — Génération intégrée

La commande `pnpm run e2e:documentation` exécute tout :

```txt
Playwright
→ screenshots
→ JSON
→ IA
→ Markdown
```

Avantage : plus simple pour l’utilisateur final.

Inconvénient : plus fragile, car une erreur IA peut faire échouer toute la génération.

Recommandation : commencer avec l’option A.

## 19. Commandes recommandées

```json
{
  "scripts": {
    "e2e:documentation": "playwright test --config=e2e/documentation/playwright.documentation.config.ts",
    "docs:generate-user-guides": "tsx scripts/generate-user-guides.ts",
    "docs:user-guides": "pnpm run e2e:documentation && pnpm run docs:generate-user-guides"
  }
}
```

Ainsi :

```bash
pnpm run e2e:documentation
```

génère les assets.

```bash
pnpm run docs:generate-user-guides
```

génère les guides Markdown.

```bash
pnpm run docs:user-guides
```

génère l’ensemble.

## 20. Prompt IA recommandé

Le prompt IA doit être strict pour éviter les hallucinations.

Exemple :

```txt
You are generating an English user guide from structured Playwright documentation metadata.

Rules:
- Use only the provided steps.
- Do not invent features, buttons, labels, screens, warnings, or business rules.
- Keep the guide clear and user-oriented.
- Use Markdown.
- Include each screenshot exactly where it belongs.
- If information is missing, write a neutral sentence or omit the detail.
- Do not mention Playwright, automated tests, or internal implementation details.
- The target audience is an end user, not a developer.

Input:
{{GUIDE_JSON}}
```

## 21. Critères d’acceptation

La mise en place est considérée comme valide si :

* une commande `pnpm run e2e:documentation` existe ;
* la commande exécute uniquement les specs `*.guide.spec.ts` ;
* au moins un parcours documentaire complet est disponible ;
* le parcours génère des screenshots stables ;
* le parcours génère un fichier JSON structuré ;
* une commande séparée permet de générer un user guide Markdown en anglais ;
* le Markdown référence correctement les screenshots ;
* les captures ne contiennent pas de données sensibles ;
* les specs documentaires ne sont pas mélangées avec les specs smoke ou regression ;
* la documentation explique clairement comment relancer la génération.

## 22. Exemple de sortie attendue

```txt
e2e/documentation/output/
  raw/
    character-creation.guide.json

  screenshots/
    character-creation/
      01-open-actors-directory.png
      02-create-character-dialog.png
      03-fill-character-form.png

  markdown/
    character-creation.md

  playwright-report/
    index.html
```

## 23. Risques identifiés

### Risque 1 — Confusion entre test et documentation

Les specs documentaires peuvent être perçues comme des tests de regression.

Mesure :

* utiliser le suffixe `*.guide.spec.ts` ;
* documenter explicitement leur rôle ;
* ne pas les inclure dans les pipelines bloquants de validation fonctionnelle.

### Risque 2 — Screenshots instables

Les captures peuvent varier à cause d’animations, de données dynamiques ou de résolutions différentes.

Mesure :

* viewport fixe ;
* données déterministes ;
* animations désactivées ;
* reset documentaire dédié ;
* masquage des éléments variables si nécessaire.

### Risque 3 — Hallucinations IA

L’IA peut inventer des étapes, des fonctionnalités ou des explications.

Mesure :

* prompt restrictif ;
* JSON structuré ;
* interdiction d’utiliser des informations hors input ;
* relecture humaine obligatoire.

### Risque 4 — Maintenance excessive

Les guides peuvent casser si l’interface change souvent.

Mesure :

* cibler uniquement les parcours utilisateur stables ;
* commencer avec peu de guides ;
* réutiliser les helpers Playwright ;
* éviter les sélecteurs fragiles.

## 24. Recommandation de gouvernance

La suite Documentation E2E doit être maintenue par les mêmes personnes que les parcours E2E, mais validée par une personne responsable de la documentation produit.

Responsabilités recommandées :

```txt
Développeur / QA
- maintient les parcours Playwright ;
- garantit la stabilité des screenshots ;
- maintient les fixtures et le reset.

Rédacteur / Product Owner
- relit le user guide généré ;
- valide le vocabulaire métier ;
- confirme que le guide est compréhensible pour un utilisateur final.

IA
- transforme les données structurées en brouillon Markdown ;
- harmonise la langue anglaise ;
- ne prend aucune décision fonctionnelle.
```

## 25. Position recommandée

Il est pertinent d’ajouter cette troisième suite E2E, mais elle doit être assumée comme une suite documentaire, pas comme une suite de tests.

Le nom `e2e:documentation` est bon, car il évite l’ambiguïté.

La bonne séparation est :

```txt
e2e:smoke
→ qualité minimale immédiate

e2e:regression
→ validation fonctionnelle approfondie

e2e:documentation
→ génération assistée de user guides
```

Cette approche permet de produire une documentation utilisateur plus fiable, plus visuelle et plus facile à maintenir, tout en évitant de polluer les tests de validation existants.

[1]: https://playwright.dev/?utm_source=chatgpt.com "Playwright: Fast and reliable end-to-end testing for modern ..."
