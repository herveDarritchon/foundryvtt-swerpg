# Suite E2E Documentation

Ce dossier contient la suite Playwright dédiée à la validation documentaire de Swerpg.

---

## Rôle et périmètre

La suite `e2e:documentation` produit des captures d'écran et valide les invariants visibles
(i18n, placeholders, absence d'erreurs navigateur) sur les parcours documentaires de l'application.

**Ce que couvre cette suite :**

- parcours et pages documentables (feuilles d'acteur, compendium, interfaces clés) ;
- captures d'écran reproductibles pour la documentation utilisateur ;
- invariants visibles : absence de placeholder cassé (`undefined`, `null`, clé brute `SWERPG.*`) ;
- absence d'erreurs `console.error` ou `pageerror` inattendues dans les zones documentées.

**Frontière avec les autres suites :**

| Critère        | `documentation`                                                       | `regression`                           | `smoke`                           |
|----------------|-----------------------------------------------------------------------|----------------------------------------|-----------------------------------|
| Objectif       | Captures documentaires, invariants visibles                           | Validation fonctionnelle pré-livraison | Santé de surface post-déploiement |
| Mutations      | Lecture seule par défaut (prérequis contrôlés acceptés si documentés) | Autorisées                             | Interdites                        |
| Instance cible | Port 30000 (production ou dédiée stable)                              | Port 31001 (dédiée, monde jetable)     | Port 30000 (production)           |
| Exécution      | Manuelle                                                              | Manuelle                               | Manuelle                          |
| CI             | Non                                                                   | Non                                    | Non                               |

**Décision : lecture seule par défaut**

Les specs documentation sont en lecture seule. Si une spec a besoin de créer un état stable
pour une capture (ex. personnage pré-configuré), elle doit :

1. déclarer explicitement ce prérequis dans sa description ;
2. assurer son propre cleanup après les assertions ;
3. utiliser un nom d'artefact horodaté unique (`Doc-<Prefixe>-${Date.now()}`).

---

## Monde documentaire déterministe

### Nom et usage

Le monde documentaire cible est `documentation-world` (configurable via `E2E_FOUNDRY_WORLD`).
Ce monde est **distinct** du monde de régression (`Swerpg-Regression-World`) et du monde de production.

**Règles d'hygiène :**

- Le monde doit être dans un état stable et représentatif des captures attendues **avant** chaque run.
- La suite ne crée ni ne recrée le monde — il doit exister et être accessible.
- En dehors des prérequis contrôlés explicitement déclarés dans les specs, aucune donnée n'est modifiée.

### Reset visuel avant capture

Avant chaque capture documentaire, le helper `documentation-world-manager` applique le reset visuel minimal :

1. Fermeture des overlays et notifications Foundry (tours, popups de partage d'usage).
2. Fermeture de toutes les applications ouvertes (fiches, dialogs).
3. Désactivation des animations CSS pour des captures instantanées stables.

Ce reset est visuel uniquement — il ne touche aucune donnée persistée.

### Frontière documentation vs régression

| Aspect            | Documentation               | Régression                             |
|-------------------|-----------------------------|----------------------------------------|
| Données           | Lecture seule, état stable  | Mutations autorisées, cleanup par spec |
| Monde             | Stable et représentatif     | Monde contrôlé recréé ou nettoyé       |
| Reset             | Visuel uniquement           | Artefacts éphémères supprimés          |
| Artefacts de test | Préfixe `Doc-` + horodatage | Préfixe `Test-` + horodatage           |

---

## Commandes

```bash
# Suite documentation headless
pnpm e2e:documentation

# Suite documentation avec navigateur visible
pnpm e2e:documentation:headed

# Suite documentation en mode UI interactif (debug)
pnpm e2e:documentation:ui
```

---

## Configuration

Fichier d'environnement : `.env.e2e.documentation`

```bash
cp .env.e2e.documentation.example .env.e2e.documentation
# Remplir les valeurs (URL, mot de passe admin, monde cible)
```

Variables requises :

| Variable                     | Rôle                        | Valeur par défaut        |
|------------------------------|-----------------------------|--------------------------|
| `E2E_FOUNDRY_BASE_URL`       | URL de l'instance Foundry   | `http://localhost:30000` |
| `E2E_FOUNDRY_ADMIN_PASSWORD` | Mot de passe administrateur | — (requis)               |
| `E2E_FOUNDRY_USERNAME`       | Nom du compte               | `Gamemaster`             |
| `E2E_FOUNDRY_PASSWORD`       | Mot de passe du compte      | — (vide si non requis)   |
| `E2E_FOUNDRY_WORLD`          | Monde stable cible          | `test-v14-309`           |

---

## Artefacts produits

### Report Playwright

Le report HTML est généré systématiquement dans `playwright-documentation-report/`.

```bash
pnpm exec playwright show-report playwright-documentation-report
```

Les captures d'écran sont conservées dans le report HTML.
Les traces sont activées sur tous les runs (pas seulement en échec) pour permettre
l'inspection complète des états documentaires capturés.

### Artefacts documentaires structurés

En plus du report Playwright, les helpers de la suite produisent des artefacts structurés
dans `documentation-output/` :

```
documentation-output/
  screenshots/           # Captures d'écran par guide
    <guide>/             # Un sous-dossier par guide (ex: character-sheet/)
      01-<slug>.png      # Captures nommées par index et slug
      02-<slug>.png
  guides/                # Métadonnées JSON par guide
    <guide>.json         # JSON structuré décrivant le guide et ses artefacts
```

Le format JSON d'un guide est exploitable pour générer de la documentation Markdown
ou alimenter un pipeline de génération documentaire.

---

## Helpers de la suite

Les helpers spécifiques à la suite documentation sont dans `e2e/documentation/utils/`.
Ils sont **isolés** des helpers des suites `regression` et `smoke`.

| Helper                          | Fichier                          | Responsabilité                                                       |
|---------------------------------|----------------------------------|----------------------------------------------------------------------|
| `prepareDocumentationState`     | `documentation-world-manager.ts` | Reset visuel avant capture (overlays, applications, animations)      |
| `closeAllOpenApplications`      | `documentation-world-manager.ts` | Fermeture de toutes les fenêtres Foundry ouvertes                    |
| `disableAnimations`             | `documentation-world-manager.ts` | Désactivation des animations CSS pour des captures stables           |
| `assertDocumentationWorldReady` | `documentation-world-manager.ts` | Vérification que le monde documentaire est actif                     |
| `navigateDocumentation`         | `documentation-world-manager.ts` | Navigation documentaire sans mutation                                |
| `takeDocumentationScreenshot`   | `screenshot-helper.ts`           | Capture avec nom stable, viewport fixe et attente réseau             |
| `toKebabSlug`                   | `screenshot-helper.ts`           | Normalisation d'un texte en slug kebab-case pour les noms de fichier |
| `createGuideStepRecorder`       | `guide-step-recorder.ts`         | Enregistrement des étapes d'un parcours documentaire                 |
| `writeGuideMetadata`            | `guide-metadata-writer.ts`       | Écriture du JSON structuré d'un guide                                |
| `readGuideMetadata`             | `guide-metadata-writer.ts`       | Lecture des métadonnées d'un guide existant                          |

### Usage typique dans une spec

```ts
import { test, expect } from '../fixtures'
import { prepareDocumentationState, assertDocumentationWorldReady } from '../utils/documentation-world-manager'
import { takeDocumentationScreenshot, toKebabSlug } from '../utils/screenshot-helper'
import { createGuideStepRecorder } from '../utils/guide-step-recorder'
import { writeGuideMetadata } from '../utils/guide-metadata-writer'

test('Parcours documentaire — fiche de personnage', async ({ page, documentationReady }) => {
  const world = process.env.E2E_FOUNDRY_WORLD ?? 'documentation-world'
  const recorder = createGuideStepRecorder()

  // 1. Vérifier l'état du monde
  await assertDocumentationWorldReady(page, { world })

  // 2. Préparer l'état visuel (reset overlays, apps, animations)
  await prepareDocumentationState(page)

  // 3. Naviguer et capturer
  const screenshot = await takeDocumentationScreenshot(page, {
    guide: 'character-sheet',
    stepIndex: 1,
    stepSlug: toKebabSlug('Vue générale de la fiche'),
  })

  // 4. Enregistrer l'étape
  recorder.record({
    title: 'Vue générale de la fiche de personnage',
    userAction: 'Ouverture de la fiche depuis la sidebar Actors',
    expectedState: 'La fiche est visible avec toutes les sections chargées',
    screenshot,
  })

  // 5. Écrire les métadonnées du guide
  writeGuideMetadata({
    guide: 'character-sheet',
    title: 'Fiche de personnage',
    description: 'Parcours documentaire de la fiche de personnage Swerpg',
    world,
    steps: recorder.getSteps(),
  })
})
```

---

## Structure du dossier

```
e2e/documentation/
  specs/               # Specs documentation — un fichier par domaine documenté
  utils/               # Helpers spécifiques à la suite documentation
    documentation-world-manager.ts  # Préparation déterministe du monde documentaire
    screenshot-helper.ts            # Captures avec nom stable et viewport fixe
    guide-step-recorder.ts          # Enregistrement des étapes d'un parcours
    guide-metadata-writer.ts        # Écriture du JSON structuré du guide
  fixtures.ts          # Fixture documentationReady — navigation sans mutation par défaut
  global-setup.ts      # Vérification de connectivité avant les specs
  README.md
```

---

## Écrire une nouvelle spec documentation

1. Créer le fichier dans `e2e/documentation/specs/`.
2. Importer la fixture : `import { test, expect } from '../fixtures'`
3. Brancher `documentationReady` : `async ({ page, documentationReady }) => { ... }`
4. Appeler `prepareDocumentationState(page)` avant chaque capture pour garantir un état propre.
5. Utiliser `takeDocumentationScreenshot` pour les captures (nom stable, viewport fixe).
6. Utiliser `createGuideStepRecorder` et `writeGuideMetadata` pour les artefacts structurés.
7. Vérifier les invariants visibles : i18n, absence de placeholder cassé, absence d'erreur console.

### Checklist pour toute nouvelle spec documentation

- [ ] Importer depuis `../fixtures` (fixture `documentationReady`)
- [ ] Pas de listener ad hoc `page.on('console')` ou `page.on('pageerror')` — la fixture s'en charge
- [ ] `prepareDocumentationState(page)` appelé avant chaque séquence de capture
- [ ] `assertDocumentationWorldReady(page, { world })` appelé en début de spec
- [ ] Captures via `takeDocumentationScreenshot` (pas de `page.screenshot` direct)
- [ ] Étapes enregistrées via `createGuideStepRecorder` et `writeGuideMetadata`
- [ ] Interactions via helpers de `e2e/utils/foundryUI.ts` et `e2e/utils/foundrySession.ts`
- [ ] `ensureSessionActive` avant toute séquence longue
- [ ] Pas de `waitForTimeout` — utiliser des assertions web-first
- [ ] Si un prérequis contrôlé est créé : nom `Doc-<Prefixe>-${Date.now()}`, cleanup explicite, mention dans la
  description
- [ ] Pas de `click({ force: true })` sans justification écrite

---

## Critères de clôture du socle documentaire (issue #384)

- [x] Monde documentaire dédié identifié (`documentation-world`) et son usage documenté
- [x] Reset visuel documenté : overlays, applications ouvertes, animations
- [x] Frontière documentation/régression explicite dans le README et les helpers
- [x] Helper `documentation-world-manager` isolé et opérationnel
- [x] Helper `screenshot-helper` avec viewport fixe et conventions de nommage stables
- [x] Helper `guide-step-recorder` pour capturer ordre, titre, action, état attendu, screenshot
- [x] Helper `guide-metadata-writer` pour produire un JSON structuré exploitable
- [x] Artefacts structurés dans `documentation-output/` séparés du report Playwright

---

## Premier parcours guide documentaire (issue #385)

### Parcours `character-sheet`

**Spec** : `e2e/documentation/specs/character-sheet.guide.spec.ts`

**Commande d'exécution** :

```bash
pnpm e2e:documentation -- e2e/documentation/specs/character-sheet.guide.spec.ts
```

**Étapes documentées** :

| #  | Titre                              | Action utilisateur                                   | État attendu                                                    |
|----|------------------------------------|------------------------------------------------------|-----------------------------------------------------------------|
| 01 | Vue générale du monde documentaire | Ouverture de la session dans le monde documentaire   | Page /game chargée, sidebar visible, aucune application ouverte |
| 02 | Sidebar Actors ouverte             | Clic sur l'onglet Actors dans la barre de navigation | Liste des acteurs visible dans la sidebar                       |
| 03 | Fiche de personnage ouverte        | Double-clic sur le nom de l'acteur dans la sidebar   | Fiche de personnage visible avec l'onglet par défaut chargé     |
| 04 | Onglet Compétences ouvert          | Clic sur l'onglet Compétences dans la fiche          | Onglet Compétences actif, liste des compétences visible         |

**Artefacts produits** :

```
documentation-output/
  screenshots/
    character-sheet/
      01-vue-generale-monde-documentaire.png
      02-sidebar-actors-ouverte.png
      03-fiche-personnage-ouverte.png
      04-onglet-competences-ouvert.png
  guides/
    character-sheet.json
```

**JSON intermédiaire** : `documentation-output/guides/character-sheet.json`

Le JSON produit est exploitable pour générer de la documentation Markdown ou alimenter un pipeline de génération
documentaire.

**Critères de clôture (issue #385)** :

- [x] Spec complète dans `e2e/documentation/specs/character-sheet.guide.spec.ts`
- [x] Captures exploitables avec préfixe d'ordre stable (`01-`, `02-`, `03-`, `04-`)
- [x] Ordre des étapes stable et reproductible
- [x] JSON intermédiaire fidèle aux étapes capturées avec chemins d'artefacts corrects
- [x] Artefacts rangés dans `documentation-output/`
- [x] Prérequis contrôlé documenté (acteur `Doc-Personnage-<timestamp>`, cleanup explicite)
- [x] Aucune mutation persistée hors artefact éphémère déclaré

---

## Prérequis

1. Instance Foundry accessible sur le port configuré dans `E2E_FOUNDRY_BASE_URL`
2. Fichier `.env.e2e.documentation` configuré
3. Monde stable dans un état représentatif des captures attendues (configuré dans `E2E_FOUNDRY_WORLD`)
