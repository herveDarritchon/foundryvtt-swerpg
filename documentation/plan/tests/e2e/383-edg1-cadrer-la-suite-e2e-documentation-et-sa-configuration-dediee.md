# Plan d'implémentation — Issue #383

**Issue** : [#383 — EDG1 - Cadrer la suite e2e:documentation et sa configuration dédiée](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/383)
**Domaine métier** : `tests/e2e`
**Source de cadrage** :

- issue fournie par l'utilisateur ;
- `documentation/plan/tests/e2e/strategie-e2e-deux-etages-regression-et-smoke-prod.md` ;
- `documentation/plan/tests/e2e/372-pwe6-matrice-de-couverture-regression-et-validation-finale-de-la-strategie-a-deux-etages.md`.

---

## 1. Objectif

Définir un cadre d'implémentation court et exploitable pour une suite `e2e:documentation`, en précisant sa place dans la stratégie E2E existante, sa configuration Playwright dédiée, son arborescence cible et ses règles d'exécution avant toute implémentation des specs.

---

## 2. Périmètre

### Inclus

- positionnement de `e2e:documentation` par rapport aux suites `regression`, `smoke` et aux scénarios `[ci]` ;
- cadrage de la configuration dédiée : script npm, fichier Playwright, variables d'environnement, reporters et artefacts ;
- définition de l'emplacement cible des specs et helpers associés ;
- synchronisation de la documentation d'usage E2E pour éviter plusieurs contrats concurrents.

### Exclu

- ajout opportuniste de nouveaux scénarios métier hors besoin documentaire ;
- refonte large des suites `regression` ou `smoke` sans écart prouvé ;
- implémentation complète de la suite au-delà du cadrage et de la configuration cible.

---

## 3. Plan de travail proposé

### Étape 1 — Positionner la suite `e2e:documentation` dans la stratégie E2E

**But** : définir clairement le rôle de la nouvelle suite et sa frontière avec les autres campagnes Playwright déjà cadrées.

**Fichiers cibles** : `e2e/README.md`, `documentation/tests/e2e/playwright-e2e-guide.md`, documentation E2E complémentaire si nécessaire.

**Actions** :

- expliciter les surfaces documentaires exactes à couvrir par la suite (parcours, pages, captures, invariants visibles, absence d'erreurs navigateur) ;
- fixer ce qui relève de `documentation` vs `regression` vs `smoke`, pour éviter les doublons et les zones grises ;
- décider si la suite est strictement en lecture seule ou si certains prérequis contrôlés sont autorisés pour produire des états documentés stables.

### Étape 2 — Cadrer la configuration Playwright dédiée

**But** : rendre l'exécution de `e2e:documentation` explicite, reproductible et distincte des autres suites.

**Fichiers cibles** : fichier de configuration Playwright dédié à nommer, `package.json`, éventuels exemples d'environnement E2E, documentation E2E associée.

**Actions** :

- nommer le script d'exécution cible (`pnpm e2e:documentation` et variantes éventuelles) ;
- définir le contrat de configuration : base URL, authentification, timeouts, workers, projets navigateur, politique headed/headless ;
- verrouiller la stratégie de reporting et d'artefacts (report HTML, traces, screenshots, vidéos) cohérente avec le besoin documentaire.

### Étape 3 — Définir l'arborescence et les contrats techniques minimaux

**But** : préparer une structure de suite maintenable avant d'ajouter les premières specs.

**Fichiers cibles** : répertoire cible sous `e2e/`, éventuels helpers partagés sous `e2e/utils/`, documentation d'organisation E2E.

**Actions** :

- choisir l'emplacement canonique des specs `documentation` et la frontière avec les helpers mutualisés ;
- définir les conventions de sélection, de capture d'erreurs `console` / `pageerror` et de stabilisation des données visibles ;
- préciser les garde-fous pour que la suite reste déterministe et exploitable comme support de validation documentaire.

### Étape 4 — Formaliser la validation et la documentation finale

**But** : produire un contrat de mise en œuvre lisible pour l'implémentation et la clôture de l'issue.

**Fichiers cibles** : `e2e/README.md`, `documentation/tests/e2e/playwright-e2e-guide.md`, éventuelle note dédiée à la suite `documentation`.

**Actions** :

- documenter les prérequis, commandes, sorties attendues et usage des reports ;
- définir les critères d'acceptation minimaux de la suite cadrée (configuration dédiée, périmètre stable, doc synchronisée) ;
- lister les points de validation à exécuter pendant l'implémentation pour confirmer que la suite reste distincte et compréhensible.

---

## 4. Ordre recommandé

1. Positionner `e2e:documentation` dans la stratégie globale
2. Cadrer la configuration dédiée
3. Définir l'arborescence et les contrats techniques
4. Synchroniser la documentation et les critères de validation

---

## 5. Validation prévue (non exécutée dans ce plan)

- relecture croisée `README E2E ↔ guide E2E ↔ configuration dédiée ↔ scripts npm` ;
- vérification que le périmètre de `e2e:documentation` ne duplique pas un contrat déjà couvert par `regression` ou `smoke` ;
- exécution ciblée de la future commande `e2e:documentation` et contrôle des artefacts/reporters retenus lors de l'implémentation.

---

## 6. Résultat attendu

Le projet dispose d'un cadrage prêt à implémenter pour une suite `e2e:documentation`, avec un périmètre clair, une configuration dédiée assumée, une arborescence cible cohérente et une documentation E2E alignée sur un seul contrat d'exécution.
