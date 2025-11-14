# Stratégie de Tests - Système SweRPG

## Vue d'ensemble

Le système SweRPG (Star Wars Edge RPG pour FoundryVTT) implémente une stratégie de test complète basée sur **Vitest** pour garantir la fiabilité des mécaniques de jeu complexes et l'intégration avec FoundryVTT v13.

## Architecture de Test

### Configuration Principale

#### Vitest Configuration (`vitest.config.js`)

```javascript
export default defineConfig({
  test: {
    setupFiles: ['./tests/vitest-setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
    },
  },
})
```

#### Setup Global (`tests/vitest-setup.js`)

```javascript
beforeEach(() => {
  setupFoundryMock()
  ensureFoundryUtils()
  vi.clearAllMocks()
})

afterEach(() => {
  vi.clearAllMocks()
  teardownFoundryMock()
})
```

### Structure des Tests

```text
tests/
├── vitest-setup.js              # Configuration globale Vitest
├── setupTests.js               # Setup spécifique (legacy)
├── helpers/
│   └── mock-foundry.mjs        # Mocks centralisés FoundryVTT
├── utils/                      # Factories de test
│   ├── actors/actor.mjs        # Factory acteurs
│   ├── skills/skill.mjs        # Factory compétences
│   ├── talents/talent.mjs      # Factory talents
│   └── characteristics/characteristic.mjs
├── lib/                        # Tests logique métier
│   ├── skills/                 # Tests compétences
│   ├── talents/                # Tests talents
│   └── jauges/                 # Tests jauges
├── applications/               # Tests UI/Sheets
└── utils/                      # Tests utilitaires
```

## Patterns de Test

Respect des Meilleures Pratiques Vitest :
✅ Pattern AAA (Arrange-Act-Assert)
✅ Isolation des tests avec beforeEach/afterEach
✅ Mocks centralisés et cleanup automatique
✅ Tests paramétrés pour les cas multiples
✅ Gestion complète des cas de bordure

### 1. Organisation des Tests

#### Nomenclature

- **Tests unitaires** : `*.test.mjs` (logique métier)
- **Tests d'intégration** : `*.spec.js` (composants, sheets)
- **Structure miroir** : `/tests/` reflète `/module/`

#### Organisation en blocs

```javascript
describe('Career Free Skill', () => {
  describe('process a skill', () => {
    describe('should return an error skill if', () => {
      describe('you train a skill', () => {
        test('and career free skill rank is greater than 1', () => {
          // Test spécifique
        })
      })
    })
  })
})
```

### 2. Mocking Foundry VTT

Toujours utiliser un mock pour les appels aux APIs de FoundryVtt lorsque que l'on exécute via un Tests Unitaires.

Ne jamais faire de `// Defensive access to global Foundry object for test environments where it may be undefined.` sur les appels d'API de FoundryVTT pour éviter des problèmes lorsque l'on exécute du code dans un contexte de Test Unitaire qui n'a pas accès à Foundry VTT.

#### Mock Centralisé (`tests/helpers/mock-foundry.mjs`)

Enrichir les mocks si besoin. Si les mocks sont enrichis alors il faut enrichir ce document.

```javascript
export function setupFoundryMock(options = {}) {
  globalThis.foundry = {
    applications: {
      api: { HandlebarsApplicationMixin: (base) => base },
    },
    utils: { deepClone, getProperty, mergeObject },
  }

  globalThis.game = {
    i18n: { localize: vi.fn((key) => translations[key] || key) },
    system: { config: {} },
    packs: new Map(),
  }

  globalThis.ui = {
    notifications: {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
    },
  }
}
```

#### Utilitaires Mock

- **`setCombatMock()`** : Mock système de combat
- **`addPacksMock()`** : Mock compendia
- **`extendFoundryMock()`** : Extension dynamique

### 3. Mocking des Librairies Externes (JSZip et xml2js)

Les librairies JSZip et xml2js sont chargées via FoundryVTT (voir `system.json`) et ne sont pas disponibles dans l'environnement de test Node.js/Vitest. Il faut donc les mocker ou les shimer pour les tests.

#### JSZip Mock pour Tests d'Import

Le système utilise JSZip pour traiter les archives OggDude. En environnement de test, il faut fournir un mock minimal :

```javascript
// Mock JSZip global pour tests d'import
globalThis.JSZip = {
  loadAsync: async (file) => buildFakeZip(domains),
}

// Helper pour construire un faux zip avec structure OggDude
function buildFakeZip(domains = ['armor']) {
  const files = {}
  
  // Exemple pour domaine armor
  if (domains.includes('armor')) {
    const armorXml = fs.readFileSync(path.join('resources', 'integration', 'Armor.xml'), 'utf-8')
    files['Data/Armor.xml'] = {
      name: 'Data/Armor.xml',
      dir: false,
      async: async (type) => {
        if (type === 'text') return armorXml
        return armorXml
      },
    }
  }
  
  return { files }
}
```

**Structure minimale requise** : `fakeZip.files[path].async('text')` doit retourner le contenu XML.

#### xml2js Shim pour Parsing XML

Le parser XML utilise `globalThis.xml2js.js.parseStringPromise`. En environnement Vitest, il faut shimmer cette interface :

```javascript
// Import du vendor xml2js
import xml2jsModule from '../../vendors/xml2js.min.js'

// Shim global xml2js (une seule fois par test)
if (globalThis.xml2js === undefined) {
  globalThis.xml2js = { js: xml2jsModule }
}
```

**Interface requise** : `globalThis.xml2js.js.parseStringPromise(xmlString)` doit retourner une Promise avec l'objet JSON.

#### Pattern de Mock Unifié pour Tests d'Intégration

```javascript
import { describe, it, expect } from 'vitest'
import fs from 'node:fs/promises'
import xml2jsModule from '../../vendors/xml2js.min.js'

// Shim xml2js global (obligatoire avant import du parser)
if (globalThis.xml2js === undefined) {
  globalThis.xml2js = { js: xml2jsModule }
}

// Mock SYSTEM si nécessaire pour les mappers
if (!globalThis.SYSTEM) {
  globalThis.SYSTEM = {
    ARMOR: {
      CATEGORIES: { light: {}, medium: {}, heavy: {} },
      DEFAULT_CATEGORY: 'medium'
    }
  }
}

// Import des modules après shimming
import { parseXmlToJson } from '../../module/utils/xml/parser.mjs'
import { armorMapper } from '../../module/importer/items/armor-ogg-dude.mjs'

describe('Intégration Import OggDude', () => {
  it('parse et mappe les données correctement', async () => {
    const xml = await fs.readFile('resources/integration/Armor.xml', 'utf8')
    const raw = await parseXmlToJson(xml)
    const mapped = armorMapper(raw.Armors.Armor)
    
    expect(mapped.length).toBeGreaterThan(0)
    expect(mapped[0]).toHaveProperty('name')
    expect(mapped[0]).toHaveProperty('type', 'armor')
  })
})
```

#### Gestion des Erreurs de Mock

```javascript
test('gère l\'absence de xml2js vendor', async () => {
  const original = globalThis.xml2js
  globalThis.xml2js = { js: { parseStringPromise: undefined } }
  
  await expect(parseXmlToJson('<test/>')).rejects.toThrow('xml2js vendor non chargé')
  
  globalThis.xml2js = original
})
```

#### Performance avec Gros Fichiers XML

Pour les tests de performance avec des fichiers XML volumineux :

```javascript
function buildLargeWeaponsXml(count) {
  const parts = ['<Weapons>']
  for (let i = 0; i < count; i++) {
    parts.push(`<Weapon><Key>W${i}</Key><Name>Weapon ${i}</Name></Weapon>`)
  }
  parts.push('</Weapons>')
  return parts.join('')
}

// Mock JSZip pour gros fichier
const fakeZip = {
  files: {
    'Data/Weapons.xml': {
      async async(type) {
        if (type === 'text') return buildLargeWeaponsXml(75000) // ~11MB
        return ''
      }
    }
  }
}
```

### 4. Factories de Test

#### Factory Acteur (`tests/utils/actors/actor.mjs`)

Enrichir si nécessaire les Factory d'objet Foundry VTT. Si c'est enrichi, il faut les rajouter dans ce document.

```javascript
export function createActor({ careerSpent = 0, specializationSpent = 0, items = [] } = {}) {
  return {
    items,
    freeSkillRanks: {
      career: { spent: careerSpent, gained: 4, available: 4 },
    },
    experiencePoints: {
      spent: 0,
      gained: 0,
      total: 100,
      available: 100,
    },
    system: {
      skills: {
        /* structure complète */
      },
    },
  }
}
```

#### Factory Talent (`tests/utils/talents/talent.mjs`)

```javascript
export function createTalentData(id, { name = 'talent-name', type = 'talent', isRanked = false } = {}) {
  const baseData = {
    name,
    type,
    id,
    system: {
      trees: ['Item.assassin00000000'],
      isRanked,
      rank: { idx: 0, cost: 0 },
    },
  }

  baseData.updateSource = function (changes) {
    // Simulation méthode Foundry
  }

  return baseData
}
```

### 5. Patterns de Test Async

#### Test avec Mocks d'Actor

```javascript
test('should update the state of the train talent', async () => {
  const data = createTalentData('1')
  const actor = createActor({ items: [] })

  const updateMock = vi.fn().mockResolvedValue({})
  actor.update = updateMock

  const createEmbeddedDocumentsMock = vi.fn().mockResolvedValue([data.toObject()])
  actor.createEmbeddedDocuments = createEmbeddedDocumentsMock

  const trainedTalent = new TrainedTalent(actor, data, params, options)
  await trainedTalent.updateState()

  expect(updateMock).toHaveBeenCalledTimes(1)
  expect(createEmbeddedDocumentsMock).toHaveBeenCalledWith('Item', [data.toObject()])
})
```

#### Gestion des Erreurs

```javascript
test('create embedded fails', async () => {
  const createEmbeddedDocumentsMock = vi.fn().mockRejectedValueOnce(new Error('Erreur sur create embedded'))
  actor.createEmbeddedDocuments = createEmbeddedDocumentsMock

  const result = await processedTalent.updateState()

  expect(result).toBeInstanceOf(ErrorTalent)
  expect(result.options.message).toContain('Erreur sur create embedded')
})
```

## Stratégie de Couverture

### Scripts NPM

```json
{
  "scripts": {
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:coverage": "pnpm vitest run --coverage"
  }
}
```

### Rapports de Couverture

- **Provider** : V8 (performance optimale)
- **Formats** : Text, LCOV, HTML
- **Répertoire** : `./coverage/`
- **Intégration CI/CD** : GitHub Actions

## Exigences Fonctionnelles Couvertes

### Compétences (Skills)

- **Requirement** : Validation des rangs de compétences gratuites
- **Type** : Must
- **Rationale** : Éviter l'exploitation des règles de progression
- **Source** : `tests/lib/skills/career-free-skill.test.mjs`
- **Priority** : Must have
- **Category** : Performance/Game Balance

### Talents

- **Requirement** : Gestion des coûts et prérequis des talents
- **Type** : Must
- **Rationale** : Intégrité du système de progression
- **Source** : `tests/lib/talents/trained-talent.test.mjs`
- **Priority** : Must have
- **Category** : Maintainability

### Intégration FoundryVTT

- **Requirement** : Simulation complète de l'environnement FoundryVTT
- **Type** : Must
- **Rationale** : Tests fiables sans dépendance externe
- **Source** : `tests/helpers/mock-foundry.mjs`
- **Priority** : Must have
- **Category** : Maintainability

## Exigences Non-Fonctionnelles

### Performance

- **Tests rapides** : < 100ms par test unitaire
- **Feedback instantané** : Mode watch pour développement
- **Parallélisation** : Exécution simultanée des suites

### Maintenabilité

- **Structure miroir** : Navigation intuitive tests ↔ code
- **Factories réutilisables** : DRY pour setup de données
- **Mocks centralisés** : Cohérence entre tests

### Fiabilité

- **Isolation** : Chaque test indépendant
- **Reproductibilité** : Même résultat à chaque exécution
- **Mock complet** : Pas de dépendance FoundryVTT réel

## Workflows de Test

### Développement Local

```mermaid
graph TD
    A[Code Change] --> B[Auto Test Watch]
    B --> C{Tests Pass?}
    C -->|Yes| D[Continue Development]
    C -->|No| E[Fix Issues]
    E --> A
    D --> F[Manual Coverage Check]
    F --> G[Commit]
```

### CI/CD Pipeline

```mermaid
graph LR
    A[Push/PR] --> B[Install Dependencies]
    B --> C[Run Tests]
    C --> D[Generate Coverage]
    D --> E{Coverage OK?}
    E -->|Yes| F[Build Success]
    E -->|No| G[Build Failure]
    F --> H[Deploy/Merge]
```

### Test Execution Strategy

```mermaid
sequenceDiagram
    participant Dev as Développeur
    participant Vitest as Vitest Runner
    participant Mock as Foundry Mock
    participant Test as Test Suite

    Dev->>Vitest: npm run test
    Vitest->>Mock: setupFoundryMock()
    Mock->>Test: Environnement prêt
    Test->>Test: Exécution tests
    Test->>Mock: teardownFoundryMock()
    Mock->>Vitest: Cleanup
    Vitest->>Dev: Résultats + Coverage
```

## Patterns Avancés

### Test Logging Integration

```javascript
vi.mock('../../../module/utils/logger.mjs', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))
```

### Mock Dynamic Extension

```javascript
beforeEach(() => {
  extendFoundryMock({
    applications: {
      sheets: { CustomSheet: MockCustomSheet },
    },
  })
})
```

### Test Data Builders

```javascript
const complexActor = createActor().withExperience(150).withSkills(['cool', 'discipline']).withTalents(['adversary', 'lethal-blows']).build()
```

### Intégration des Vendors FoundryVTT

#### Problématique

FoundryVTT charge JSZip et xml2js via le `system.json` (`scripts: ["./vendors/jszip.min.js", "./vendors/xml2js.min.js"]`), mais ces librairies ne sont pas disponibles dans l'environnement de test Node.js. Le code de production accède à ces librairies via `globalThis.JSZip` et `globalThis.xml2js`.

#### Solutions par Type de Test

**Tests Unitaires** : Mock complet des interfaces

```javascript
// Mock JSZip pour tests unitaires isolés
globalThis.JSZip = {
  loadAsync: vi.fn().mockResolvedValue({
    files: {
      'Data/test.xml': {
        async: vi.fn().mockResolvedValue('<test>data</test>')
      }
    }
  })
}

// Mock xml2js pour tests unitaires
globalThis.xml2js = {
  js: {
    parseStringPromise: vi.fn().mockResolvedValue({ test: 'data' })
  }
}
```

**Tests d'Intégration** : Shim avec vraies librairies

```javascript
// Import et shim des vraies librairies
import xml2jsModule from '../../vendors/xml2js.min.js'

if (globalThis.xml2js === undefined) {
  globalThis.xml2js = { js: xml2jsModule }
}

// Construction de faux zips avec vraies données
function buildFakeZip(filesMap) {
  const files = {}
  Object.entries(filesMap).forEach(([name, content]) => {
    files[name] = {
      name,
      dir: false,
      async: async (type) => type === 'text' ? content : content,
    }
  })
  return { files }
}
```

#### Ordre d'Initialisation Critique

⚠️ **IMPORTANT** : Le shim doit être fait **AVANT** l'import des modules qui utilisent ces librairies.

```javascript
// ❌ INCORRECT - Import avant shim
import { parseXmlToJson } from '../../module/utils/xml/parser.mjs'
if (globalThis.xml2js === undefined) {
  globalThis.xml2js = { js: xml2jsModule }
}

// ✅ CORRECT - Shim avant import
if (globalThis.xml2js === undefined) {
  globalThis.xml2js = { js: xml2jsModule }
}
import { parseXmlToJson } from '../../module/utils/xml/parser.mjs'
```

#### Centralisation des Shims

Pour éviter la duplication, centraliser les shims dans `tests/helpers/vendor-shims.mjs` :

```javascript
// tests/helpers/vendor-shims.mjs
import xml2jsModule from '../../vendors/xml2js.min.js'

export function setupVendorShims() {
  if (globalThis.xml2js === undefined) {
    globalThis.xml2js = { js: xml2jsModule }
  }
  
  if (globalThis.JSZip === undefined) {
    globalThis.JSZip = {
      loadAsync: async () => ({ files: {} })
    }
  }
}

export function teardownVendorShims() {
  delete globalThis.xml2js
  delete globalThis.JSZip
}
```

#### Debugging des Mocks Vendors

```javascript
test('debug xml2js interface', () => {
  console.log('xml2js available:', !!globalThis.xml2js)
  console.log('parseStringPromise available:', !!globalThis.xml2js?.js?.parseStringPromise)
  
  expect(globalThis.xml2js.js.parseStringPromise).toBeTypeOf('function')
})
```

## Métriques et Monitoring

### Objectifs de Couverture

- **Branches** : 80%+
- **Functions** : 80%+
- **Lines** : 80%+
- **Statements** : 80%+

### Types de Tests

- **Unit Tests** : ~70% (logique métier isolée)
- **Integration Tests** : ~25% (composants + interactions)
- **End-to-End Tests** : ~5% (workflows complets)

## Migration et Évolution

### Historique

- **v1.0** : Jest → Vitest migration (ADR-0004)
- **v1.1** : Ajout coverage V8
- **v1.2** : Mock FoundryVTT centralisé

### Roadmap

- **Phase 2** : Tests E2E avec Playwright
- **Phase 3** : Visual regression testing
- **Phase 4** : Performance benchmarking

## Troubleshooting

### Problèmes Courants

#### Mock Path Issues

```javascript
// ❌ Incorrect
vi.mock('../../module/utils/logger.mjs')

// ✅ Correct
vi.mock('../../../module/utils/logger.mjs')
```

#### Vendor Libraries Issues

```javascript
// ❌ xml2js non disponible
ReferenceError: xml2js is not defined

// ✅ Solution : Shim avant import
import xml2jsModule from '../../vendors/xml2js.min.js'
if (globalThis.xml2js === undefined) {
  globalThis.xml2js = { js: xml2jsModule }
}

// ❌ JSZip loadAsync undefined
TypeError: Cannot read property 'loadAsync' of undefined

// ✅ Solution : Mock JSZip global
globalThis.JSZip = {
  loadAsync: async (file) => buildFakeZip()
}
```

#### Interface Validation Errors

```javascript
// Erreur courante : interface xml2js incomplète
// Error: xml2js vendor non chargé ou interface invalide

// Validation de l'interface
test('validate xml2js interface', () => {
  expect(globalThis.xml2js).toBeDefined()
  expect(globalThis.xml2js.js).toBeDefined()
  expect(globalThis.xml2js.js.parseStringPromise).toBeTypeOf('function')
})
```

#### Async Test Timeouts

```javascript
// Configuration timeout
test('slow operation', async () => {
  // Implementation
}, 10000) // 10s timeout
```

#### Memory Leaks

```javascript
afterEach(() => {
  vi.clearAllMocks()
  teardownFoundryMock()
  // Nettoyage des vendors
  delete globalThis.xml2js
  delete globalThis.JSZip
  // Force garbage collection
  if (global.gc) global.gc()
})
```

#### Import Order Issues

```javascript
// ❌ Module importé avant shim disponible
// ReferenceError au moment de l'évaluation du module

// ✅ Solution : Import dynamique après shim
beforeEach(async () => {
  setupVendorShims()
  const { parseXmlToJson } = await import('../../module/utils/xml/parser.mjs')
})
```

## Documentation Process

### Fichiers Analysés

- `vitest.config.js` - Configuration principale
- `tests/vitest-setup.js` - Setup global
- `tests/helpers/mock-foundry.mjs` - Mocks centralisés
- `tests/utils/**/*.mjs` - Factories de test
- `tests/lib/**/*.test.mjs` - Tests métier
- `tests/applications/**/*.spec.js` - Tests UI
- `package.json` - Scripts et dépendances
- `docs/adr/adr-0004-vitest-testing-strategy.md` - ADR référence

### Processus de Documentation

1. **Analyse du code source** - Exploration structure tests
2. **Identification des patterns** - Extraction patterns récurrents
3. **Cartographie fonctionnelle** - Mapping features ↔ tests
4. **Documentation workflows** - Processus développement
5. **Création diagrammes** - Visualisation architecture

Cette documentation sert de référence complète pour comprendre, maintenir et faire évoluer la stratégie de test du système SweRPG.
