# Plan d'implémentation — Issue #368

**Issue** : [#368 — PWE2 - [Tier 1 Regression] Fiabiliser les contrats d'interaction et la capture d'erreurs navigateur](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/368)
**Dépendances** : [#366 — Playwright Local Foundry Smoke Tests - Sécuriser les parcours MJ essentiels en local](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/366), [#367 — PWE1 - Stabiliser la baseline locale Playwright et le monde E2E](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/367)
**Domaine métier** : `tests`
**Source de cadrage** :

- `documentation/plan/tests/366-playwright-local-foundry-smoke-tests-securiser-les-parcours-mj-essentiels-en-local.md`
- `documentation/plan/tests/367-pwe1-stabiliser-la-baseline-locale-playwright-et-le-monde-e2e.md`
- `documentation/plan/tests/e2e/strategie-contrat-commandes-e2e-smoke-regression.md`

---

## 1. Objectif

Fiabiliser les interactions Playwright utilisées par les scénarios de régression Tier 1 et rendre toute erreur navigateur inattendue immédiatement visible, afin de réduire la flakiness et d'améliorer le diagnostic des régressions UI Foundry/SWERPG.

---

## 2. Périmètre

### Inclus

- contrat d'interaction commun pour les helpers Playwright critiques ;
- capture centralisée des erreurs `console` et `pageerror` non autorisées ;
- adoption de ces garde-fous dans les specs Tier 1 prioritaires ;
- documentation courte des règles d'usage pour les futures specs.

### Exclu

- ajout d'une large nouvelle couverture métier hors Tier 1 ;
- refonte complète de toute l'arborescence E2E sans besoin direct ;
- changements runtime applicatifs hors besoins stricts des tests Playwright.

---

## 3. Plan de travail proposé

### Étape 1 — Formaliser le contrat d'interaction partagé

**But** : supprimer les interactions fragiles dispersées et imposer des helpers de navigation/action cohérents.

**Fichiers cibles** : `e2e/utils/foundrySession.ts`, `e2e/utils/foundryUI.ts`, `e2e/fixtures/index.ts`

**Actions** :

- identifier les interactions Tier 1 réellement critiques à centraliser ;
- privilégier des helpers fondés sur rôles, labels et attentes explicites plutôt que des sélecteurs décoratifs ;
- intégrer des garde-fous de synchronisation et des messages d'échec lisibles.

### Étape 2 — Brancher une capture d'erreurs navigateur centralisée

**But** : faire échouer rapidement les scénarios quand le navigateur remonte une régression significative.

**Fichiers cibles** : `e2e/utils/playwrightTest.ts`, `e2e/fixtures/index.ts`, éventuels helpers partagés sous `e2e/utils/`

**Actions** :

- capturer de façon homogène les erreurs `console` et `pageerror` inattendues ;
- définir une politique explicite de filtrage/whitelist minimale pour les bruits connus et maîtrisés ;
- enrichir le reporting pour rattacher clairement l'erreur au scénario en échec.

### Étape 3 — Migrer les scénarios Tier 1 prioritaires vers ce contrat

**But** : appliquer immédiatement le contrat sur les parcours de régression qui doivent devenir la baseline fiable.

**Fichiers cibles** : specs Tier 1 sous `e2e/regression/**` et/ou `e2e/specs/**`, helpers partagés sous `e2e/utils/`

**Actions** :

- remplacer les interactions fragiles des scénarios prioritaires par les helpers centralisés ;
- vérifier que les scénarios échouent bien sur erreur navigateur non autorisée ;
- conserver des scénarios courts, diagnostiquables et compatibles avec la baseline locale définie par `PWE1`.

### Étape 4 — Documenter le contrat et les critères de clôture

**But** : éviter le retour de patterns fragiles lors de l'ajout de nouvelles specs.

**Fichiers cibles** : `e2e/README.md`, `documentation/tests/e2e/playwright-e2e-guide.md`

**Actions** :

- documenter quels helpers doivent être utilisés pour les interactions critiques ;
- expliciter la règle de traitement des erreurs navigateur et des exceptions tolérées ;
- ajouter une checklist courte pour toute nouvelle spec de régression Tier 1.

---

## 4. Ordre recommandé

1. Contrat d'interaction partagé
2. Capture d'erreurs navigateur
3. Migration des scénarios Tier 1 prioritaires
4. Documentation et critères de clôture

---

## 5. Validation prévue (non exécutée dans ce plan)

- exécution ciblée des specs Tier 1 concernées ;
- vérification qu'une erreur `console` / `pageerror` non autorisée fait bien échouer la spec ;
- relecture croisée helpers ↔ fixtures ↔ documentation pour confirmer un contrat unique et explicite.

---

## 6. Résultat attendu

Les scénarios Playwright Tier 1 reposent sur un contrat d'interaction stable, détectent explicitement les erreurs navigateur inattendues, et fournissent des diagnostics plus rapides en cas de régression locale ou pré-livraison.
