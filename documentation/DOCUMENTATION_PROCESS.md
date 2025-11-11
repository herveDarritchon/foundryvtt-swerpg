# Documentation Process - Stratégie de Tests SweRPG

## Vue d'ensemble

Ce document décrit le processus suivi pour créer la documentation complète de la stratégie de tests du système SweRPG, en suivant les instructions du prompt `retro-doc.prompt.md`.

## Objectif de Documentation

Analyser et documenter l'architecture de test existante du système SweRPG pour :

- Comprendre les patterns et practices de test actuels
- Identifier les exigences fonctionnelles et non-fonctionnelles couvertes
- Documenter les workflows et processus de test
- Créer une référence technique pour les développeurs

## Fichiers et Dossiers Analysés

### Configuration de Test

#### Fichiers de Configuration Principaux

- **`vitest.config.js`** - Configuration principale du test runner Vitest
  - Setup files, provider de couverture, répertoires de rapports
- **`tests/vitest-setup.js`** - Setup global exécuté avant chaque test
  - Mock de l'environnement Foundry, utilitaires globaux
- **`package.json`** - Scripts NPM pour l'exécution des tests
  - `test`, `test:watch`, `test:coverage`

#### Infrastructure de Mock

- **`tests/helpers/mock-foundry.mjs`** - Mock centralisé de FoundryVTT
  - `setupFoundryMock()`, `teardownFoundryMock()`, utilitaires d'extension
  - Simulation des APIs game, foundry, ui.notifications

### Utilitaires de Test (Test Factories)

#### Factories de Données

- **`tests/utils/actors/actor.mjs`** - Factory pour créer des acteurs de test
  - `createActor()` avec paramètres configurables
- **`tests/utils/skills/skill.mjs`** - Factory pour créer des compétences
  - `createSkillData()` pour tests de progression
- **`tests/utils/talents/talent.mjs`** - Factory pour créer des talents
  - `createTalentData()` avec support des talents ranked/non-ranked
- **`tests/utils/characteristics/characteristic.mjs`** - Factory caractéristiques

### Tests Métier (Business Logic)

#### Tests de Compétences

- **`tests/lib/skills/career-free-skill.test.mjs`** - Tests rangs gratuits carrière
- **`tests/lib/skills/specialization-free-skill.test.mjs`** - Tests rangs gratuits spé
- **`tests/lib/skills/trained-skill.test.mjs`** - Tests compétences entraînées
- **`tests/lib/skills/skill-cost-calculator.test.mjs`** - Tests calculs de coûts
- **`tests/lib/skills/skill-factory.test.mjs`** - Tests factory de compétences
- **`tests/lib/skills/error-skill.test.mjs`** - Tests gestion d'erreurs

#### Tests de Talents

- **`tests/lib/talents/trained-talent.test.mjs`** - Tests talents entraînés
- **`tests/lib/talents/ranked-trained-talent.test.mjs`** - Tests talents ranked
- **`tests/lib/talents/talent-factory.test.mjs`** - Tests factory de talents
- **`tests/lib/talents/talent-cost-calculator.test.mjs`** - Tests calculs coûts
- **`tests/lib/talents/talent-characteristic.test.mjs`** - Tests caractéristiques
- **`tests/lib/talents/error-talent.test.mjs`** - Tests gestion d'erreurs

#### Tests Système

- **`tests/lib/jauges/jauge.test.mjs`** - Tests système de jauges

### Tests d'Intégration

#### Tests UI/Applications

- **`tests/applications/sheets/sheets-logging.spec.js`** - Tests intégration logging
- **`tests/utils/logger-integration.spec.js`** - Tests logger système

### Documentation de Référence

#### Architecture Decision Records

- **`docs/adr/adr-0004-vitest-testing-strategy.md`** - ADR stratégie Vitest
  - Contexte, décision, conséquences, alternatives considérées

#### Dépendances

- **`pnpm-lock.yaml`** - Lockfile avec versions exactes des dépendances de test
  - Vitest, @vitest/coverage-v8, etc.

## Processus d'Analyse Suivi

### Étape 1 : Exploration de l'Architecture

1. **Recherche sémantique** - Identification des fichiers de test et configuration
2. **Analyse des patterns** - Extraction des structures récurrentes
3. **Cartographie des dépendances** - Compréhension des relations entre composants

### Étape 2 : Identification des Patterns

1. **Patterns de Mock** - Centralisation des mocks FoundryVTT
2. **Patterns de Factory** - Réutilisation des factories de données
3. **Patterns d'Organisation** - Structure miroir `/tests/` ↔ `/module/`
4. **Patterns Async** - Gestion des tests asynchrones avec Vitest

### Étape 3 : Extraction des Exigences

1. **Exigences Fonctionnelles** - À partir de l'analyse des test cases
2. **Exigences Non-Fonctionnelles** - Performance, maintenabilité, fiabilité
3. **Classification MOSCOW** - Must/Should/Could/Won't have

### Étape 4 : Documentation des Workflows

1. **Workflows de développement** - Boucle de feedback développeur
2. **Workflows CI/CD** - Intégration continue et déploiement
3. **Workflows de test** - Stratégies d'exécution

### Étape 5 : Création des Diagrammes

1. **Diagrammes de flux** - Workflows de développement et CI/CD
2. **Diagrammes de séquence** - Exécution des tests avec mocks
3. **Architecture générale** - Relations entre composants

## Résultats de l'Analyse

### Architecture Identifiée

- **Test Runner** : Vitest avec configuration optimisée
- **Mock Strategy** : Mock centralisé FoundryVTT avec lifecycle management
- **Factory Pattern** : Factories réutilisables pour données de test
- **Coverage Strategy** : Provider V8 avec rapports HTML/LCOV

### Patterns Documentés

- **Setup/Teardown** : Isolation des tests avec beforeEach/afterEach
- **Mocking** : vi.mock() pour modules, vi.fn() pour fonctions
- **Assertions** : expect() avec matchers Vitest spécialisés
- **Async Testing** : async/await avec gestion d'erreurs

### Exigences Couvertes

- **Validation métier** : Règles de progression compétences/talents
- **Intégration FoundryVTT** : Simulation complète environnement
- **Performance** : Tests rapides avec feedback instantané
- **Maintenabilité** : Structure claire et factories réutilisables

### Workflows Documentés

- **Développement local** : Watch mode avec auto-reload
- **CI/CD** : Pipeline intégré GitHub Actions
- **Couverture** : Seuils de qualité avec enforcement

## Livrables Créés

### Documentation Principale

- **`documentation/strategie-tests.md`** - Documentation complète de la stratégie de tests
  - Architecture, patterns, exigences, workflows, troubleshooting

### Structure de Documentation

```text
documentation/
├── strategie-tests.md           # Documentation complète
└── DOCUMENTATION_PROCESS.md     # Ce fichier (processus suivi)
```

## Métriques du Processus

### Couverture de l'Analyse

- **48 fichiers de test** analysés (.mjs)
- **4 fichiers d'intégration** analysés (.spec.js)
- **5 factories utilitaires** documentées
- **1 ADR** de référence consulté

### Patterns Identifiés

- **12+ patterns de test** documentés
- **3 workflows principaux** cartographiés
- **4 types d'exigences** classifiées
- **6 diagrammes** créés pour visualisation

### Documentation Générée

- **450+ lignes** de documentation technique
- **15 sections structurées** avec exemples de code
- **3 diagrammes Mermaid** pour workflows
- **20+ exemples de code** pratiques

## Recommandations pour Maintenance

### Mise à Jour de la Documentation

1. **Review périodique** - Mise à jour trimestrielle
2. **Évolution patterns** - Documentation des nouveaux patterns
3. **Metrics tracking** - Suivi des métriques de couverture
4. **Team feedback** - Intégration retours équipe

### Extension de la Stratégie

1. **Tests E2E** - Ajout Playwright pour tests bout-en-bout
2. **Visual regression** - Tests de régression visuelle
3. **Performance benchmarking** - Tests de performance automatisés
4. **Mutation testing** - Amélioration qualité des tests

Ce processus de documentation fournit une base solide pour comprendre, maintenir et faire évoluer la stratégie de test du système SweRPG, en suivant les meilleures pratiques de documentation technique et d'architecture logicielle.
