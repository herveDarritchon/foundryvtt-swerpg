# Plan d'implémentation — Issue #366

**Issue** : [#366 — Playwright Local Foundry Smoke Tests - Securiser les parcours MJ essentiels en local](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/366)
**Dépendance** : [#365 — Tests E2E](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/365)
**Domaine métier** : `tests`
**Source de cadrage** :

- `documentation/ways-of-work/plan/tests-e2e/playwright-local-foundry-smoke-tests/project-plan.md`
- `documentation/ways-of-work/plan/tests-e2e/playwright-local-foundry-smoke-tests/issues-checklist.md`
- `documentation/tests/e2e/playwright-e2e-guide.md`

---

## 1. Objectif

Mettre en place une suite Playwright locale courte, fiable et maintenable pour sécuriser les parcours MJ essentiels dans Foundry : démarrage du monde, création de personnage, dépense simple d'XP, ouverture de l'arbre de spécialisation, avec détection des erreurs console et une frontière locale-first / CI explicitée.

---

## 2. Périmètre

### Inclus

- baseline locale E2E reproductible ;
- contrats d'interaction stables pour Foundry et SWERPG ;
- 3 à 5 smoke tests prioritaires ;
- hygiène du monde de test et stratégie de reset ;
- documentation de validation locale et de la frontière CI.

### Exclu

- couverture E2E exhaustive de toutes les règles métier ;
- dépendance à des sélecteurs CSS décoratifs ;
- exécution CI élargie au-delà des parcours explicitement retenus ;
- refonte générale de l'outillage E2E hors besoin direct du smoke scope.

---

## 3. Plan de travail proposé

### Étape 1 — Stabiliser la baseline locale Playwright et le monde E2E

**But** : verrouiller un environnement local reproductible avant d'ajouter de nouveaux scénarios.

**Fichiers cibles** : `playwright.config.ts`, `.env.e2e.example`, `e2e/README.md`, `documentation/tests/e2e/playwright-e2e-guide.md`

**Actions** :

- confirmer les variables d'environnement minimales et le monde cible ;
- expliciter le mode local-first, `workers: 1`, les artefacts à conserver uniquement à l'échec ;
- documenter clairement les prérequis de démarrage et les conventions d'exécution locale.

### Étape 2 — Fiabiliser les contrats d'interaction et la capture d'erreurs navigateur

**But** : rendre les scénarios robustes face à l'UI Foundry et visibles en cas de régression navigateur.

**Fichiers cibles** : `e2e/utils/foundrySession.ts`, `e2e/utils/foundryUI.ts`, `e2e/utils/playwrightTest.ts`, `e2e/fixtures/index.ts`

**Actions** :

- centraliser les helpers de session et de navigation réellement nécessaires aux smoke tests ;
- privilégier `getByRole`, `getByLabel` et `data-testid` seulement quand l'accessibilité ne suffit pas ;
- brancher une capture systématique des erreurs `console` et `pageerror` non autorisées dans les scénarios.

### Étape 3 — Couvrir le démarrage du monde et la création de personnage

**But** : sécuriser le premier parcours MJ à forte valeur.

**Fichiers cibles** : `e2e/specs/bootstrap.spec.ts`, `e2e/specs/*.spec.ts` dédiés aux smoke tests personnage, helpers partagés sous `e2e/utils/`

**Actions** :

- vérifier que le monde SWERPG se charge correctement et que l'interface MJ critique est disponible ;
- ajouter un smoke test focalisé sur la création d'un personnage et l'ouverture de sa fiche ;
- faire échouer le scénario en cas d'erreur console inattendue.

### Étape 4 — Couvrir la dépense simple d'XP et l'ouverture de l'arbre de spécialisation

**But** : sécuriser un flux métier central sans transformer la suite locale en test d'intégration exhaustif.

**Fichiers cibles** : `e2e/specs/*.spec.ts` dédiés aux flux XP/spécialisation, helpers partagés sous `e2e/utils/`

**Actions** :

- couvrir une augmentation simple à impact visible sur l'XP disponible ;
- vérifier la persistance minimale après réouverture du document concerné ;
- ouvrir l'arbre de spécialisation et contrôler l'absence d'erreur bloquante et la présence du conteneur attendu.

### Étape 5 — Formaliser l'hygiène du monde de test et la stratégie de reset

**But** : éviter la dérive de données et la flakiness entre exécutions locales.

**Fichiers cibles** : `documentation/tests/e2e/playwright-e2e-guide.md`, `e2e/README.md`, éventuels helpers de cleanup sous `e2e/utils/` ou `e2e/fixtures/`

**Actions** :

- définir la politique de données jetables, noms uniques et nettoyage ;
- documenter le niveau minimal de reset requis entre scénarios ;
- garder la stratégie compatible avec une exécution locale simple et déterministe.

### Étape 6 — Valider la non-régression locale et documenter la frontière CI

**But** : fermer le scope avec des critères de validation clairs et maintenables.

**Fichiers cibles** : `documentation/tests/e2e/playwright-e2e-guide.md`, `e2e/README.md`, `playwright.config.ts`

**Actions** :

- documenter la liste des smoke tests retenus pour la validation locale ;
- expliciter quels scénarios peuvent être taggés `[ci]` et pourquoi ;
- confirmer que les artefacts lourds restent limités aux échecs et que les erreurs console sont traitées comme des régressions.

---

## 4. Ordre recommandé

1. Baseline locale
2. Contrats d'interaction
3. Smoke test monde + création personnage
4. Hygiène / reset du monde de test
5. Smoke test XP + arbre de spécialisation
6. Validation finale et frontière CI

---

## 5. Validation prévue (à exécuter pendant l'implémentation, non exécutée dans ce plan)

- `pnpm e2e -- --project=chromium`
- `pnpm e2e -- --project=firefox`
- `pnpm e2e -- e2e/specs/bootstrap.spec.ts`
- exécution ciblée des nouvelles specs smoke locales

---

## 6. Résultat attendu

Une suite Playwright locale courte et fiable couvre les parcours MJ essentiels, remonte les erreurs console inattendues, reste compatible avec l'outillage E2E existant, et distingue explicitement ce qui relève de la validation locale complète de ce qui mérite une exécution CI ciblée.
