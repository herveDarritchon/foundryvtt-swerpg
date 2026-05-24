# Plan d'implémentation — Issue #372

**Issue** : [#372 — PWE6 - Matrice de couverture regression et validation finale de la stratégie à deux étages](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/372)
**Dépendances** : [#366 — Playwright Local Foundry Smoke Tests - Sécuriser les parcours MJ essentiels en local](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/366), [#367 — PWE1 - Stabiliser la baseline locale Playwright et le monde E2E](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/367), [#368 — PWE2 - Fiabiliser les contrats d'interaction et la capture d'erreurs navigateur](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/368), [#369 — PWE3 - Tier 1 Regression Spec : création personnage et ouverture de fiche](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/369), [#370 — PWE4 - Tier 1 Regression Spec : dépense simple d'XP et ouverture arbre de spécialisation](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/370), [#371 — PWE5 - Hygiène monde de test Tier 1 et stratégie de reset déterministe](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/371)
**Domaine métier** : `tests/e2e`
**Source de cadrage** :

- `documentation/plan/tests/366-playwright-local-foundry-smoke-tests-securiser-les-parcours-mj-essentiels-en-local.md`
- `documentation/plan/tests/371-pwe5-tier-1-regression-hygiene-monde-de-test-tier-1-et-strategie-de-reset-deterministe.md`
- `documentation/plan/tests/e2e/strategie-e2e-deux-etages-regression-et-smoke-prod.md`
- `documentation/ways-of-work/plan/tests-e2e/playwright-local-foundry-smoke-tests/project-plan.md`
- `documentation/ways-of-work/plan/tests-e2e/playwright-local-foundry-smoke-tests/issues-checklist.md`
- `documentation/tests/e2e/playwright-e2e-guide.md`
- `e2e/README.md`

---

## 1. Objectif

Finaliser la stratégie E2E à deux étages en rendant explicite la couverture actuelle `regression` / `smoke`, en synchronisant la documentation et les contrats d'exécution, puis en fermant l'issue avec des critères de validation lisibles et reproductibles.

---

## 2. Périmètre

### Inclus

- matrice de couverture reliant domaines fonctionnels, parcours critiques, specs Playwright et éventuels relais Vitest ;
- validation documentaire finale de la frontière `regression` / `smoke` / `[ci]` ;
- consolidation des critères de clôture : erreurs navigateur, artefacts conservés à l'échec, exécution locale vs CI.

### Exclu

- ajout d'une nouvelle feature métier hors couverture déjà décidée ;
- extension opportuniste de la suite Playwright au-delà des parcours déjà priorisés ;
- refonte technique large des helpers ou des configs sans écart documenté à corriger.

---

## 3. Plan de travail proposé

### Étape 1 — Établir la matrice de couverture de référence

**But** : rendre visible ce qui est réellement couvert par `regression`, `smoke` et les tests `[ci]`, ainsi que ce qui reste volontairement hors scope Playwright.

**Fichiers cibles** : nouvelle documentation dédiée sous `documentation/tests/e2e/`, `e2e/README.md`, `documentation/tests/e2e/playwright-e2e-guide.md`

**Actions** :

- inventorier les specs existantes sous `e2e/regression/specs/`, `e2e/smoke/` et `e2e/specs/` legacy ;
- lister par domaine les parcours et champs critiques déjà contractualisés (`bootstrap`, création personnage, XP simple, arbre de spécialisation, import si déjà assumé) ;
- relier chaque ligne de matrice à une spec Playwright, à un test Vitest si la bonne couche est unitaire, ou à un statut explicite `non couvert / hors scope`.

### Étape 2 — Verrouiller le contrat final de la stratégie à deux étages

**But** : supprimer les ambiguïtés restantes entre commandes, environnements, règles de mutation et frontière CI / validation locale manuelle.

**Fichiers cibles** : `documentation/tests/e2e/playwright-e2e-guide.md`, `e2e/README.md`, éventuels fichiers de configuration ou scripts E2E seulement si un écart documentaire prouvé doit être réaligné

**Actions** :

- vérifier la cohérence croisée `README ↔ guide E2E ↔ stratégie à deux étages` sur `pnpm e2e`, `pnpm e2e:regression`, `pnpm e2e:smoke` et `pnpm e2e:ci` ;
- expliciter la règle finale sur la capture des erreurs `console` / `pageerror`, la conservation des artefacts à l'échec et l'interdiction de mutation en `smoke` ;
- documenter la place résiduelle des specs legacy `[ci]` et leur frontière avec les suites métier `regression` / `smoke`.

### Étape 3 — Standardiser le report HTML Playwright (local uniquement)

**But** : rendre les runs `regression` et `smoke` auditables via un report HTML exploitable pour diagnostic local, preuve de validation et clôture PWE6. **Aucun report HTML n'est généré en CI** — les tests Playwright ne tournent jamais en GitHub Actions.

**Fichiers cibles** : `playwright.regression.config.ts`, `playwright.smoke.config.ts`, `documentation/tests/e2e/playwright-e2e-guide.md`, `e2e/README.md`, éventuels scripts npm ou doc de la matrice

**Actions** :

- définir le contrat cible de reporting pour chaque suite :
  - `e2e:regression` → report HTML dans `playwright-regression-report/` systématiquement en local ;
  - `e2e:smoke` → report HTML dans `playwright-smoke-report/` systématiquement en local ;
  - `e2e:ci` (unique suite CI) → reporter `list` seulement, pas de HTML (cohérent avec l'absence de Playwright en CI dans ce projet) ;
- choisir une convention claire de dossiers de sortie et les aligner entre suites (`playwright-{suite}-report/`) ;
- documenter comment ouvrir et exploiter les reports HTML (`pnpm exec playwright show-report <dossier>`) pour analyser résultats, traces, screenshots et vidéos ;
- spécifier que le report HTML est généré systématiquement sur tout run local (pas seulement en cas d'échec), pour servir de preuve reproductible ;
- adapter les configurations Playwright : passer le reporter de `'list'` à `[['list'], ['html', { outputFolder: 'playwright-smoke-report' }]]` pour `smoke`, et vérifier que `regression` a déjà `list + html` en local (pas seulement en CI) ;
- intégrer le report HTML dans la checklist de validation finale PWE6 comme artefact de clôture.

### Étape 4 — Préparer la validation finale et les critères de clôture PWE6

**But** : fermer la boucle avec une checklist opérationnelle permettant de conclure que la stratégie est effectivement stabilisée.

**Fichiers cibles** : matrice de couverture créée à l'étape 1, `documentation/tests/e2e/playwright-e2e-guide.md`, `e2e/README.md`

**Actions** :

- définir l'ordre de validation recommandé : parcours `PWE3` / `PWE4` côté `regression`, puis contrôle `smoke` non destructif, puis revue des scénarios `[ci]` encore légitimes ;
- formaliser les signaux de clôture : aucune erreur navigateur inattendue, matrice à jour, commandes et prérequis alignés, frontière CI documentée, report HTML produit et vérifié pour chaque suite ;
- vérifier que le report HTML attendu (`playwright-regression-report/`, `playwright-smoke-report/`) est bien généré à l'issue des runs, et que les artefacts (traces, screenshots, vidéos) sont retrouvables depuis le report ;
- isoler explicitement les trous de couverture restant acceptés pour éviter qu'ils soient confondus avec des oublis.

---

## 4. Ordre recommandé

1. Construire la matrice de couverture
2. Synchroniser le contrat documentaire final
3. Standardiser le report HTML Playwright (configs + doc)
4. Formaliser la checklist de validation et clôture

---

## 5. Validation prévue (non exécutée dans ce plan)

- exécution ciblée des parcours `PWE3` et `PWE4` sur la suite `regression` ;
- exécution manuelle de la suite `smoke` pour confirmer la lecture seule et l'absence d'erreur navigateur inattendue ;
- vérification que les scénarios `[ci]` restant hors `regression` / `smoke` sont justifiés et documentés ;
- relecture croisée `matrice ↔ README ↔ guide E2E ↔ stratégie à deux étages` pour confirmer un contrat unique ;
- vérification que les reports HTML sont bien générés pour les suites `regression` et `smoke` sur un run local complet, et que les artefacts d'échec sont accessibles depuis le report.

---

## 6. Résultat attendu

Le projet dispose d'une matrice de couverture E2E exploitable, d'une stratégie `regression` / `smoke` définitivement clarifiée, d'un reporting HTML standardisé pour les runs locaux, et d'un paquet de critères de validation permettant de conclure la phase PWE6 sans ambiguïté sur le périmètre réellement automatisé.
