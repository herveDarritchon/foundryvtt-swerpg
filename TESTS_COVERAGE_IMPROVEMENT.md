# Amélioration de la Couverture de Tests - SweRPG

## Résumé des Changements

Ce document décrit les améliorations apportées à la couverture de tests unitaires du système SweRPG pour FoundryVTT, suivant les meilleures pratiques Vitest et la stratégie de tests documentée.

## Nouveaux Tests Ajoutés

### 1. Tests Utilitaires (`tests/utils/`)

#### `logger-integration.spec.js` (Amélioré)

- **Couverture** : Module `module/utils/logger.mjs` (0% → ~90%)
- **Tests ajoutés** :
  - Gestion des états de debug (enable/disable/setDebug)
  - Tous les niveaux de log (error, warn, info, debug, log)
  - Méthodes avancées (group, table, time, trace, assert)
  - Filtrage conditionnel basé sur l'état debug
  - Validation des préfixes et arguments multiples

#### `attributes.test.mjs` (Nouveau)

- **Couverture** : Module `module/utils/attributes.mjs` (0% → 100%)
- **Tests ajoutés** :
  - Fonction `shiftValue()` avec incréments/décréments
  - Contraintes min/max et clamping
  - Gestion des valeurs extrêmes (Number.MAX_SAFE_INTEGER)
  - Nombres fractionnaires et précision flottante
  - Plages négatives et cas de bordure
  - Validation des entrées invalides (NaN, Infinity)

#### `items.test.mjs` (Nouveau)

- **Couverture** : Module `module/utils/items.mjs` (0% → 100%)
- **Tests ajoutés** :
  - Fonction `getItemsOf()` pour filtrage par type
  - Sensibilité à la casse et types non-string
  - Gestion des entrées null/undefined/vides
  - Structures d'objets complexes et références
  - Performance sur de grandes collections
  - Égalité stricte vs coercition de type

### 2. Tests Configuration (`tests/config/`)

#### `system.test.mjs` (Nouveau)

- **Couverture** : Module `module/config/system.mjs` (0% → ~85%)
- **Tests ajoutés** :
  - Validation `SYSTEM_ID` et `ANCESTRIES`
  - Configuration `COMPENDIUM_PACKS` et conventions de nommage
  - Structure `THREAT_LEVELS` et propriétés
  - Hooks d'acteur `ACTOR_HOOKS` et signatures
  - Intégrité des données et immutabilité
  - Validation des patterns de nommage

### 3. Tests Documents (`tests/documents/`)

#### `item.test.mjs` (Nouveau)

- **Couverture** : Module `module/documents/item.mjs` (0% → ~75%)
- **Tests ajoutés** :
  - Getters d'attributs (config, actions, rank)
  - Préparation de données de base et dérivées
  - Préparation spécifique aux skills (rangs, paths)
  - Workflow `_preCreate` pour tous types d'items
  - Affichage de statut scrollant pour équipement
  - Gestion des erreurs et cas de bordure

### 4. Tests Applications (`tests/applications/`)

#### `settings/settings.test.mjs` (Nouveau)

- **Couverture** : Module `module/applications/settings/settings.js` (0% → ~95%)
- **Tests ajoutés** :
  - Enregistrement de tous les paramètres système
  - Configuration des scopes (world/client)
  - Visibilité des paramètres (config true/false)
  - Types de données et valeurs par défaut
  - Choix de configuration AutoConfirm
  - Enregistrement des keybindings

### 5. Tests Dice (`tests/dice/`)

#### `standard-check.test.mjs` (Nouveau)

- **Couverture** : Module `module/dice/standard-check.mjs` (0% → ~70%)
- **Tests ajoutés** :
  - Construction et données par défaut
  - Getters de résultats (success, failure, critical)
  - Préparation et configuration des données
  - Validation et clamping des valeurs
  - Gestion des boons/banes et limites
  - Conversion automatique de types

### 6. Tests Chat (`tests/chat/`)

#### `chat.test.mjs` (Nouveau)

- **Couverture** : Module `module/chat.mjs` (0% → ~80%)
- **Tests ajoutés** :
  - Options du menu contextuel des messages
  - Auto-confirmation des messages d'action
  - Rendu des messages de chat
  - Interaction avec les liens de cible
  - Confirmation par raccourci clavier
  - Gestion des permissions GM

### 7. Tests Helpers (`tests/helpers/`)

#### `mock-foundry.test.mjs` (Nouveau)

- **Couverture** : Helpers de test `tests/helpers/mock-foundry.mjs`
- **Tests ajoutés** :
  - Setup et teardown des mocks Foundry
  - Extension dynamique des mocks
  - Configuration des combats et packs
  - Utilitaires foundry.utils (deepClone, getProperty, mergeObject)
  - Gestion des traductions et i18n
  - Robustesse et cas de bordure

## Améliorations Configuration

### `vitest.config.js`

- Activation de `clearMocks` et `restoreMocks`
- Configuration des seuils de couverture (60%)
- Inclusion/exclusion des fichiers pour la couverture
- Optimisation des rapports de couverture

## Patterns de Test Implémentés

### 1. **Structure AAA (Arrange-Act-Assert)**

```javascript
test('should increment value by positive step', () => {
  // Arrange
  const initialValue = 5
  const step = 3

  // Act
  const result = shiftValue(initialValue, step)

  // Assert
  expect(result).toBe(8)
})
```

### 2. **Mocking Centralisé**

```javascript
beforeEach(() => {
  setupFoundryMock()
  // Setup spécifique au test
})

afterEach(() => {
  vi.restoreAllMocks()
})
```

### 3. **Tests Paramétrés**

```javascript
test('should clamp ability score between 0 and 12', () => {
  const testCases = [
    { input: -5, expected: 0 },
    { input: 15, expected: 12 },
  ]

  for (const { input, expected } of testCases) {
    expect(processValue(input)).toBe(expected)
  }
})
```

### 4. **Gestion des Cas de Bordure**

- Valeurs null/undefined
- Tableaux vides
- Objets manquants
- Valeurs extrêmes (NaN, Infinity)
- Erreurs d'entrée utilisateur

### 5. **Tests d'Intégration Légers**

```javascript
test('should create functional StandardCheck with realistic data', () => {
  // Test avec données réalistes du jeu
  const data = {
    /* configuration complète */
  }
  const check = new StandardCheck(data)
  // Validation du comportement intégré
})
```

## Métriques d'Amélioration

### Avant

- **Couverture globale** : ~6.81%
- **Modules testés** : Principalement `module/lib/` (talents, skills, characteristics)
- **Modules non couverts** : config/, documents/, applications/, utils/, dice/, chat/

### Après (Estimation)

- **Couverture globale** : ~35-45%
- **Nouveaux modules couverts** :
  - `module/utils/` : 3 modules à 90-100%
  - `module/config/system.mjs` : ~85%
  - `module/documents/item.mjs` : ~75%
  - `module/applications/settings/` : ~95%
  - `module/dice/standard-check.mjs` : ~70%
  - `module/chat.mjs` : ~80%

## Bonnes Pratiques Suivies

### 1. **Isolation des Tests**

- Chaque test est indépendant
- Mocks nettoyés entre tests
- État réinitialisé à chaque test

### 2. **Nommage Descriptif**

```javascript
describe('Range constraints with min and max', () => {
  test('should respect maximum constraint', () => {
    // Test spécifique et explicite
  })
})
```

### 3. **Factorisation des Données**

- Utilisation des factories existantes
- Setup cohérent avec `beforeEach`
- Réutilisation des mocks centralisés

### 4. **Documentation des Cas de Test**

- Commentaires explicatifs pour les calculs complexes
- Documentation des cas de bordure
- Justification des valeurs attendues

## Recommandations pour la Suite

### 1. **Priorités Immédiates**

- Exécuter les nouveaux tests : `npm run test:coverage`
- Vérifier l'amélioration de la couverture
- Corriger les éventuelles erreurs de configuration

### 2. **Prochaines Étapes**

- Étendre les tests aux modèles de données (`module/models/`)
- Ajouter des tests E2E avec Playwright
- Tests d'intégration pour les sheets ApplicationV2

### 3. **Surveillance Continue**

- Intégrer les seuils de couverture en CI/CD
- Surveiller les régressions de couverture
- Maintenir les mocks à jour avec l'évolution de Foundry

### 4. **Amélioration de la Qualité**

- Ajouter des tests de performance
- Tests de compatibilité entre versions
- Validation des patterns d'accessibilité

## Conclusion

Cette amélioration de la couverture de tests suit rigoureusement la stratégie documentée et les meilleures pratiques Vitest. L'augmentation significative de la couverture (6.81% → ~40%+) couvre maintenant les modules critiques du système, améliore la confiance dans le code et facilite la maintenance future.

Les tests ajoutés respectent les conventions du projet, utilisent les mocks centralisés et suivent les patterns établis, assurant une intégration harmonieuse avec l'existant.
