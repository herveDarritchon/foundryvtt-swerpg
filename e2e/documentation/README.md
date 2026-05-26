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
| -------------- | --------------------------------------------------------------------- | -------------------------------------- | --------------------------------- |
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
| ----------------- | --------------------------- | -------------------------------------- |
| Données           | Lecture seule, état stable  | Mutations autorisées, cleanup par spec |
| Monde             | Stable et représentatif     | Monde contrôlé recréé ou nettoyé       |
| Reset             | Visuel uniquement           | Artefacts éphémères supprimés          |
| Artefacts de test | Préfixe `Doc-` + horodatage | Préfixe `Test-` + horodatage           |

---

## Commandes

### Capture documentaire (Playwright)

```bash
# Suite documentation headless
pnpm e2e:documentation

# Suite documentation avec navigateur visible
pnpm e2e:documentation:headed

# Suite documentation en mode UI interactif (debug)
pnpm e2e:documentation:ui
```

### Génération des guides utilisateur Markdown (séparée)

```bash
# Générer tous les guides disponibles depuis les JSON produits
pnpm run docs:generate-user-guides

# Générer un seul guide ciblé
pnpm run docs:generate-user-guides -- --guide character-sheet
```

**Ordre d'usage :**

1. Exécuter d'abord `pnpm e2e:documentation` pour produire les JSON et les screenshots.
2. Exécuter ensuite `pnpm run docs:generate-user-guides` pour transformer les JSON en Markdown anglais.

La génération Markdown est indépendante de Playwright — elle ne recapture pas les screenshots.
Si les artefacts sources (JSON ou dossier de screenshots) sont absents, la commande échoue avec un message explicite.

---

## Configuration

Fichier d'environnement : `.env.e2e.documentation`

```bash
cp .env.e2e.documentation.example .env.e2e.documentation
# Remplir les valeurs (URL, mot de passe admin, monde cible)
```

Variables requises :

| Variable                     | Rôle                        | Valeur par défaut        |
| ---------------------------- | --------------------------- | ------------------------ |
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
  screenshots/           # Captures d'écran par guide (produit par e2e:documentation)
    <guide>/             # Un sous-dossier par guide (ex: character-sheet/)
      01-<slug>.png      # Captures nommées par index et slug
      02-<slug>.png
  guides/                # Métadonnées JSON par guide (produit par e2e:documentation)
    <guide>.json         # JSON structuré décrivant le guide et ses artefacts
  markdown/              # Guides utilisateur Markdown en anglais (produit par docs:generate-user-guides)
    <guide>.md           # Guide final lisible, screenshots référencés en relatif
```

Le format JSON d'un guide est la matière première de la génération Markdown.
Exécuter `pnpm run docs:generate-user-guides` pour transformer les JSON en `documentation-output/markdown/`.

---

## Helpers de la suite

Les helpers spécifiques à la suite documentation sont dans `e2e/documentation/utils/`.
Ils sont **isolés** des helpers des suites `regression` et `smoke`.

| Helper                          | Fichier                          | Responsabilité                                                        |
| ------------------------------- | -------------------------------- | --------------------------------------------------------------------- |
| `prepareDocumentationState`     | `documentation-world-manager.ts` | Reset visuel avant capture (overlays, applications, animations)       |
| `closeAllOpenApplications`      | `documentation-world-manager.ts` | Fermeture de toutes les fenêtres Foundry ouvertes                     |
| `disableAnimations`             | `documentation-world-manager.ts` | Désactivation des animations CSS pour des captures stables            |
| `assertDocumentationWorldReady` | `documentation-world-manager.ts` | Vérification que le monde documentaire est actif                      |
| `navigateDocumentation`         | `documentation-world-manager.ts` | Navigation documentaire sans mutation                                 |
| `takeDocumentationScreenshot`   | `screenshot-helper.ts`           | Capture avec nom stable, viewport fixe et attente réseau              |
| `toKebabSlug`                   | `screenshot-helper.ts`           | Normalisation d'un texte en slug kebab-case pour les noms de fichier  |
| `createGuideStepRecorder`       | `guide-step-recorder.ts`         | Enregistrement des étapes d'un parcours documentaire                  |
| `writeGuideMetadata`            | `guide-metadata-writer.ts`       | Écriture du JSON structuré d'un guide                                 |
| `readGuideMetadata`             | `guide-metadata-writer.ts`       | Lecture des métadonnées d'un guide existant                           |
| `generateMarkdownFromMetadata`  | `markdown-guide-generator.mjs`   | Transformation d'un JSON guide en Markdown anglais (pure, sans I/O)   |
| `generateUserGuide`             | `markdown-guide-generator.mjs`   | Génération complète d'un guide Markdown depuis le JSON sur disque     |
| `discoverGuideIds`              | `markdown-guide-generator.mjs`   | Découverte des guides disponibles dans `documentation-output/guides/` |

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
    markdown-guide-generator.mjs    # Générateur Markdown anglais depuis JSON (commande séparée)
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

| #   | Titre                              | Action utilisateur                                   | État attendu                                                    |
| --- | ---------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------- |
| 01  | Vue générale du monde documentaire | Ouverture de la session dans le monde documentaire   | Page /game chargée, sidebar visible, aucune application ouverte |
| 02  | Sidebar Actors ouverte             | Clic sur l'onglet Actors dans la barre de navigation | Liste des acteurs visible dans la sidebar                       |
| 03  | Fiche de personnage ouverte        | Double-clic sur le nom de l'acteur dans la sidebar   | Fiche de personnage visible avec l'onglet par défaut chargé     |
| 04  | Onglet Compétences ouvert          | Clic sur l'onglet Compétences dans la fiche          | Onglet Compétences actif, liste des compétences visible         |

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

## Génération des guides utilisateur Markdown (issue #386)

### Commande séparée `docs:generate-user-guides`

**Entrée** : JSON produit par `pnpm e2e:documentation` dans `documentation-output/guides/`

**Sortie** : Fichiers Markdown en anglais dans `documentation-output/markdown/`

**Flux complet** :

```bash
# Étape 1 : capturer les parcours documentaires (Playwright)
pnpm e2e:documentation

# Étape 2 : générer les guides utilisateur Markdown (Node, sans navigateur)
pnpm run docs:generate-user-guides

# Optionnel : cibler un seul guide
pnpm run docs:generate-user-guides -- --guide character-sheet
```

**Artefacts produits après le flux complet** :

```
documentation-output/
  screenshots/
    character-sheet/
      01-vue-generale-monde-documentaire.png
      ...
  guides/
    character-sheet.json          ← produit par e2e:documentation
  markdown/
    character-sheet.md            ← produit par docs:generate-user-guides
```

**Comportement en cas d'artefact manquant** :

La commande `docs:generate-user-guides` échoue explicitement avec un message d'erreur si :

- le dossier `documentation-output/guides/` est absent ou vide ;
- le fichier `<guide>.json` est absent ou illisible ;
- le dossier de screenshots référencé par le JSON est absent.

Elle ne relance pas Playwright.

**Critères de clôture (issue #386)** :

- [x] Commande séparée `pnpm run docs:generate-user-guides` disponible dans `package.json`
- [x] Génération de tous les guides disponibles par défaut, avec ciblage `--guide <id>` optionnel
- [x] Markdown en anglais avec titre, prérequis, étapes (action + résultat attendu + screenshot)
- [x] Screenshots référencés en chemins relatifs stables depuis le fichier Markdown
- [x] Sortie déterministe — deux runs identiques produisent le même fichier
- [x] Échec explicite si JSON source ou dossier screenshots absent
- [x] Aucun détail Playwright, aucune donnée technique interne dans le rendu final
- [x] Tests unitaires couvrant `generateMarkdownFromMetadata` dans `tests/documentation/`

---

## Contrat d'exploitation et mode rerun

### Quand relancer la suite

| Situation                                          | Action recommandée                                                                                              |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Mise à jour d'un parcours (spec, UI, données)      | Rerun Playwright complet (`pnpm e2e:documentation`) puis génération Markdown (`pnpm docs:generate-user-guides`) |
| Seule la mise en forme Markdown change             | Relancer uniquement `pnpm docs:generate-user-guides` — pas de rerun Playwright                                  |
| Artefacts JSON ou screenshots absents ou corrompus | Rerun Playwright obligatoire avant toute génération                                                             |
| Vérification ponctuelle de la stabilité visuelle   | Rerun Playwright ciblé sur la spec concernée                                                                    |

### Commande canonique de rerun documentaire

```bash
# Rerun complet — Playwright puis génération Markdown
pnpm e2e:documentation
pnpm docs:generate-user-guides

# Rerun ciblé sur un seul parcours
pnpm e2e:documentation -- e2e/documentation/specs/character-sheet.guide.spec.ts
pnpm docs:generate-user-guides -- --guide character-sheet

# Rerun avec navigateur visible (debug)
pnpm e2e:documentation:headed
```

### Prérequis avant tout rerun

1. Instance Foundry accessible et stabilisée sur le port configuré dans `E2E_FOUNDRY_BASE_URL` (port 30000 par défaut).
2. Fichier `.env.e2e.documentation` configuré avec les bonnes valeurs.
3. Monde documentaire (`documentation-world` ou valeur de `E2E_FOUNDRY_WORLD`) dans un état stable et représentatif **avant** le run — la suite ne le crée pas et ne le réinitialise pas.
4. Artefacts du run précédent présents dans `documentation-output/` si seule la génération Markdown est relancée.

### Caractère non bloquant et documentaire

La suite `e2e:documentation` est **strictement documentaire et non bloquante** :

- elle ne fait partie d'aucun pipeline CI ;
- ses résultats ne conditionnent pas un merge, une release ni une validation fonctionnelle ;
- un échec de spec documentaire ne bloque pas le développement — il indique que les captures sont à régénérer ou qu'un invariant visible a régressé ;
- la suite ne remplace pas `e2e:smoke` ni `e2e:regression`.

### Environnement recommandé

La suite documentaire doit être exécutée sur un **environnement contrôlé dédié**, jamais sur :

- un environnement de production partagé avec des utilisateurs actifs ;
- un environnement client ou de démonstration ;
- un environnement instable ou en cours de migration.

Le monde documentaire `documentation-world` doit être distinct du monde de production et du monde de régression. Aucune donnée critique ne doit y être présente.

---

## Gouvernance et responsabilités

### Qui maintient quoi

| Périmètre                                                                    | Responsable              |
| ---------------------------------------------------------------------------- | ------------------------ |
| Parcours Playwright (`*.guide.spec.ts`)                                      | Dev / QA                 |
| Screenshots et artefacts documentaires (`documentation-output/`)             | Dev / QA                 |
| Monde documentaire (`documentation-world`) — stabilité et état représentatif | Dev / QA                 |
| Relecture métier des guides générés                                          | Documentation / PO       |
| Validation de la pertinence et de la publication des guides                  | Documentation / PO       |
| Génération Markdown (`docs:generate-user-guides`)                            | Dev / QA (déclenchement) |

### Rôle de l'IA dans la génération

La commande `docs:generate-user-guides` utilise une assistance IA pour rédiger les guides Markdown en anglais depuis les métadonnées JSON.

L'IA **assiste la rédaction** mais :

- ne valide **pas** la cohérence fonctionnelle du contenu ;
- ne valide **pas** que les captures reflètent fidèlement le comportement attendu ;
- ne prend **pas** de décision de publication.

La validation du fond fonctionnel et la décision de diffusion appartiennent exclusivement à Documentation / PO.

### Point de passage avant diffusion

Avant toute mise à jour ou diffusion d'un guide généré :

1. Dev / QA confirme que les captures sont à jour et représentatives.
2. Documentation / PO relit le contenu sur le fond fonctionnel.
3. Documentation / PO valide ou demande une correction.
4. Le guide est diffusé uniquement après validation explicite de Documentation / PO.

---

## Non-objectifs de la suite documentaire

La suite `e2e:documentation` **ne fait pas** :

- validation fonctionnelle des features (c'est le rôle de `e2e:regression`) ;
- vérification de la santé de surface de production (c'est le rôle de `e2e:smoke`) ;
- validation métier humaine des parcours utilisateur ;
- gate de qualité bloquant un merge ou une release ;
- détection de régressions fonctionnelles profondes.

Les invariants minimaux vérifiés (i18n, absence de placeholder cassé, absence d'erreur navigateur inattendue) sont des **garde-fous documentaires**, pas des checks de validation fonctionnelle.

---

## Prérequis

1. Instance Foundry accessible sur le port configuré dans `E2E_FOUNDRY_BASE_URL`
2. Fichier `.env.e2e.documentation` configuré
3. Monde stable dans un état représentatif des captures attendues (configuré dans `E2E_FOUNDRY_WORLD`)

---

## Contrat de stabilité des captures et des artefacts (EDG6)

### Invariants attendus entre deux reruns identiques

Pour qu'un guide soit diffable et relisible avant release, les éléments suivants doivent rester déterministes :

| Invariant                     | Mécanisme                                                                                                   |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Ordre des captures            | Préfixe d'index `01-`, `02-`, `03-`, `04-` — incrémenté dans l'ordre des étapes de la spec                  |
| Viewport constant             | `1920×1080` défini dans `playwright.documentation.config.ts` — ne pas modifier entre les runs               |
| Nommage déterministe          | Slugs kebab-case fixes (`toKebabSlug`) — pas d'horodatage ni d'identifiant aléatoire dans le nom de fichier |
| Écrans sans bruit parasite    | `prepareDocumentationState` appelé avant chaque capture (overlays, apps, animations)                        |
| Cohérence JSON ↔ screenshots | `writeGuideMetadata` écrit les chemins dans l'ordre d'enregistrement — aligné avec les fichiers produits    |

### Écarts tolérés

- Légère variation de rendu due à la police ou au zoom entre machines.
- Durée de chargement variable — le helper attend `networkidle` avant chaque capture.
- Artefacts d'un run précédent dans `documentation-output/` — les fichiers sont écrasés lors du rerun.

### Écarts bloquants avant release documentaire

- Capture manquante ou fichier PNG corrompu → rerun obligatoire.
- Ordre des captures incohérent avec le JSON → rerun obligatoire.
- Nom de fichier contenant un identifiant aléatoire ou un horodatage → correction de la spec + rerun.
- Donnée sensible visible dans une capture → nettoyage du monde + rerun obligatoire.
- JSON dont un `screenshotPath` pointe vers un fichier absent → rerun obligatoire.

---

## Sûreté des données du monde documentaire (EDG6)

### Données interdites dans les artefacts

Les catégories suivantes ne doivent **jamais** apparaître dans `screenshots/`, `guides/*.json` ou `markdown/*.md` :

| Catégorie                                                                | Mécanisme d'évitement                                                                   |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| Identifiants réels (noms d'utilisateurs, comptes client, emails)         | Monde dédié, noms neutres (`Doc-<Prefixe>-${Date.now()}`)                               |
| Données client ou de campagne réelle                                     | Monde documentaire isolé, distinct de la production                                     |
| Secrets et tokens (mots de passe, clés API, tokens de session)           | Monde dédié, captures sans zone sensible                                                |
| URLs non prévues ou redirections vers un autre environnement             | Contrôle du point d'entrée avant run                                                    |
| Bruit de session (notifications d'usage, alertes de mise à jour, popups) | `dismissOverlayIfPresent` + `closeAllOpenApplications` dans `prepareDocumentationState` |
| États non représentatifs (erreur, migration incomplète)                  | Monde stable et représentatif avant run                                                 |

### Point de contrôle documentaire

La génération Markdown (`pnpm run docs:generate-user-guides`) ne peut introduire aucune information hors JSON source.
Le JSON source ne contient que les métadonnées déclarées dans la spec : titre, actions utilisateur, états attendus, chemins de screenshots.

Avant diffusion d'un guide :

1. Dev/QA confirme que les captures sont à jour et représentatives.
2. Documentation/PO relit le contenu sur le fond fonctionnel.
3. Documentation/PO valide ou demande une correction.
4. Le guide est diffusé uniquement après validation explicite de Documentation/PO.

---

## Checklist de release `e2e:documentation` (EDG6)

La checklist complète est disponible dans `documentation/tests/e2e/edg6-release-checklist.md`.

### Séquence canonique (rappel court)

```
1. Préparer le monde documentaire (état stable, aucune donnée sensible)
2. Lancer la capture : pnpm e2e:documentation
3. Vérifier screenshots + JSON (ordre, nommage, cohérence, sûreté des données)
4. Générer le Markdown : pnpm run docs:generate-user-guides
5. Relecture humaine Dev/QA + Documentation/PO avant diffusion
```

### Signal de clôture EDG6

Un flux documentaire peut être rerun, relu et diffusé quand :

- [x] Captures stables et déterministes entre deux reruns identiques
- [x] Artefacts sûrs — aucune donnée sensible, client ou non maîtrisée visible
- [x] Checklist de release courte et exécutable (`edg6-release-checklist.md`)
- [x] Rerun compréhensible — commandes canoniques, prérequis et cas de rerun documentés
- [x] Revue humaine explicitement requise avant toute diffusion

### Feu vert documentaire vs release applicative globale

La suite `e2e:documentation` est **strictement documentaire et non bloquante** :

- Elle ne fait partie d'aucun pipeline CI.
- Ses résultats ne conditionnent pas un merge, une release ni une validation fonctionnelle.
- Un guide documentaire non à jour ne bloque pas la livraison — il indique que la documentation est à régénérer.

---

## Critères de clôture EDG6 (issue #388)

- [x] Contrat de stabilité des captures formalisé : invariants documentés (ordre, viewport, nommage, reset visuel) dans ce README
- [x] Écarts tolérés vs écarts bloquants définis explicitement avant release documentaire
- [x] Catégories de données interdites dans les artefacts documentées et mécanismes d'évitement en place
- [x] Point de contrôle documentaire : la génération Markdown ne peut introduire aucune information hors JSON source
- [x] Checklist de release courte et exécutable disponible dans `documentation/tests/e2e/edg6-release-checklist.md`
- [x] Séquence canonique de 5 étapes définie : préparation monde → capture → vérification → génération Markdown → relecture humaine
- [x] Signal de clôture EDG6 unique et non ambigu dans ce README (section `Signal de clôture EDG6`)
- [x] Preuves minimales à conserver à la clôture listées dans `edg6-release-checklist.md`
- [x] Feu vert documentaire distingué explicitement de la release applicative globale
- [x] Revue humaine Dev/QA + Documentation/PO requise avant toute diffusion d'un guide généré
- [x] Un seul contrat de release documentaire : ce README + `e2e/README.md` + `playwright-e2e-guide.md` + `edg6-release-checklist.md` sans consignes concurrentes
