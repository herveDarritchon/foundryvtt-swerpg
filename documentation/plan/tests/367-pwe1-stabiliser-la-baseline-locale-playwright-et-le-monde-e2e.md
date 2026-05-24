# Plan d'implémentation — Issue #367

**Issue** : [#367 — PWE1 - Stabiliser la baseline locale Playwright et le monde E2E](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/367)
**Dépendance** : [#366 — Playwright Local Foundry Smoke Tests - Sécuriser les parcours MJ essentiels en local](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/366)
**Domaine métier** : `tests`
**Source de cadrage** :

- `documentation/plan/tests/366-playwright-local-foundry-smoke-tests-securiser-les-parcours-mj-essentiels-en-local.md`
- `documentation/ways-of-work/plan/tests-e2e/playwright-local-foundry-smoke-tests/issues-checklist.md`
- `documentation/tests/e2e/playwright-e2e-guide.md`
- `e2e/README.md`

---

## 1. Objectif

Stabiliser la baseline locale réellement supportée pour Playwright, lever les ambiguïtés entre les fichiers d'environnement et les mondes Foundry ciblés, puis documenter un contrat d'exécution local-first clair avant d'ouvrir les chantiers dépendants.

---

## 2. Périmètre

### Inclus

- clarification du point d'entrée local (`.env.e2e.local` ou variante explicitement retenue) ;
- identification du monde E2E cible selon chaque mode d'exécution ;
- alignement des conventions locales sur les configs Playwright et la documentation ;
- explicitation de la frontière local-first vs smoke prod / CI.

### Exclu

- ajout de nouveaux scénarios E2E métier ;
- refonte des helpers d'interaction navigateur ;
- élargissement du périmètre CI ;
- stratégie complète de reset du monde de test (traitée séparément par `PWE5`).

---

## 3. Plan de travail proposé

### Étape 1 — Converger vers un contrat d'environnement local unique

**But** : supprimer les contradictions actuelles entre les exemples d'environnement, les ports par défaut et le nom du monde E2E.

**Fichiers cibles** : `.env.e2e.example`, `.env.e2e.regression.example`, `playwright.config.ts`, `playwright.regression.config.ts`

**Actions** :

- décider quel fichier représente la baseline locale par défaut et dans quel cas les variantes `regression` et `smoke` s'appliquent ;
- aligner les valeurs par défaut documentées (`baseURL`, monde, compte) avec la réalité des configs Playwright ;
- préciser les variables strictement nécessaires pour démarrer une exécution locale reproductible.

### Étape 2 — Verrouiller le monde E2E cible et les conventions d'exécution

**But** : rendre explicite quel monde Foundry doit être utilisé pour chaque commande locale et éviter toute confusion entre monde de dev, monde de régression et monde smoke.

**Fichiers cibles** : `.env.e2e.example`, `.env.e2e.regression.example`, `.env.e2e.smoke.prod.example`, `playwright.config.ts`, `playwright.regression.config.ts`, `playwright.smoke.config.ts`

**Actions** :

- nommer sans ambiguïté le monde attendu pour `e2e`, `e2e:regression` et `e2e:smoke` ;
- confirmer les conventions locales minimales : `workers: 1`, exécution séquentielle, artefacts conservés à l'échec ;
- expliciter le scope local-first attendu pour débloquer `PWE2` et `PWE5`.

### Étape 3 — Synchroniser le runbook local et les critères de clôture

**But** : fournir une documentation courte, cohérente et directement exploitable par un développeur qui doit lancer la baseline locale sans interprétation implicite.

**Fichiers cibles** : `e2e/README.md`, `documentation/tests/e2e/playwright-e2e-guide.md`

**Actions** :

- documenter le chemin de préparation local réel : copie du bon fichier d'exemple, prérequis, commande de lancement et monde cible ;
- rappeler la frontière entre validation locale complète, smoke prod manuel et tests `[ci]` ;
- ajouter une checklist de clôture courte permettant de vérifier que l'environnement local est clarifié et reproductible.

---

## 4. Ordre recommandé

1. Contrat d'environnement local
2. Monde E2E cible et conventions d'exécution
3. Documentation de runbook et critères de clôture

---

## 5. Validation prévue (non exécutée dans ce plan)

- vérification ciblée des fichiers d'environnement retenus ;
- exécution locale d'une commande Playwright représentative du mode par défaut retenu ;
- relecture croisée `config ↔ README ↔ guide E2E` pour confirmer l'absence d'ambiguïté sur le monde cible et le scope local-first.

---

## 6. Résultat attendu

Un développeur peut identifier immédiatement quel fichier d'environnement utiliser, sur quelle instance et sur quel monde exécuter Playwright en local, avec une distinction nette entre baseline locale, régression dédiée, smoke prod et CI.
