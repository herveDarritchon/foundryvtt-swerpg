---
name: 'swerpg-test-correction-plan'
description: 'Plan détaillé pour diagnostiquer et corriger les erreurs dans les tests SweRPG (unitaires et intégration).'
---

## 🎯 Objectif

Établir un processus systématique de diagnostic et correction d'erreurs dans les tests (unitaires et intégration) du système SweRPG. L'objectif n'est **pas** de faire passer les tests à tout prix, mais de **diagnostiquer la cause racine** et d'appliquer le correctif approprié (code métier OU test).

## 📋 Principes Fondamentaux

### Règle d'Or

> **Ne jamais modifier le code de production uniquement pour faire passer un test.**

Les tests doivent refléter le comportement métier attendu. Si un test échoue :

1. ✅ **D'abord** : Vérifier si le test est correct (mocks, assertions, fixtures)
2. ✅ **Ensuite** : Si le test est correct, identifier le bug métier et le corriger
3. ❌ **Jamais** : Adapter la logique métier juste pour satisfaire un test mal conçu

### Philosophie de Test

- **Tests = Documentation vivante** : Un test doit clairement exprimer l'intention métier
- **Tests = Filet de sécurité** : Les tests doivent détecter les régressions, pas les créer
- **Tests = Isolation** : Chaque test doit être indépendant et reproductible
- **Tests = Pertinence** : Tester le comportement observable, pas l'implémentation interne

---

## 🔍 Phase 1 : Diagnostic Initial

### 1.1 Collecte d'Informations

**Inputs nécessaires :**

- Fichier de test en échec : `tests/**/*.spec.mjs`
- Message d'erreur complet (stack trace, assertion échouée)
- Contexte d'exécution (CI, local, environnement)
- Commit/PR ayant introduit le test ou la fonctionnalité

**Actions :**

```bash
# Exécuter le test isolé pour reproduire l'erreur
pnpm vitest run <chemin-test-specifique>

# Activer le mode verbeux pour plus de détails
pnpm vitest run <chemin-test> --reporter=verbose

# Examiner la couverture de code si pertinent
pnpm test:coverage
```

**Checklist :**

- [ ] Message d'erreur copié intégralement
- [ ] Fichier de test identifié
- [ ] Fichier métier testé identifié
- [ ] Historique git consulté (quand introduit ?)
- [ ] Tests similaires examinés (patterns récurrents ?)

### 1.2 Classification de l'Erreur

#### Type A : Erreur d'Assertion

**Symptômes :**

- `expect(...).toBe(...)` échoue
- `expect(...).toHaveProperty(...)` échoue
- Valeur attendue ≠ valeur reçue

**Exemples :**

```javascript
// Erreur typique
expect(stats.total).toBe(5) // Reçu: 0
expect(firstObligation.system).toHaveProperty('value', 10) // Propriété manquante
```

**Questions à poser :**

- L'assertion teste-t-elle vraiment le comportement métier ?
- La valeur attendue est-elle correcte ?
- Le test a-t-il été réinitialisé correctement (`beforeEach`) ?
- Les données de fixture sont-elles cohérentes ?

#### Type B : Erreur de Mock/Shim

**Symptômes :**

- `ReferenceError: <global> is not defined`
- `TypeError: <fonction> is not a function`
- Accès à API Foundry/externe non disponible en test

**Exemples :**

```javascript
// Erreur typique
ReferenceError: foundry is not defined
TypeError: xml2js.parseStringPromise is not a function
```

**Questions à poser :**

- Le mock Foundry est-il correctement initialisé ?
- Les shims (xml2js, JSZip) sont-ils définis **avant** les imports ?
- Le mock couvre-t-il toutes les API utilisées ?
- Le test utilise-t-il `globalThis.*` correctement ?

#### Type C : Erreur de Séquençage/État

**Symptômes :**

- Test passe isolé, échoue en suite
- Valeurs inattendues entre tests
- Compteurs non réinitialisés

**Exemples :**

```javascript
// Stats d'import qui fuient entre tests
expect(stats.total).toBe(5) // Reçu: 15 (tests précédents non resetés)
```

**Questions à poser :**

- `beforeEach()` appelle-t-il les fonctions de reset ?
- Les mocks sont-ils nettoyés après chaque test ?
- Y a-t-il des effets de bord (globals, singletons) ?
- L'ordre d'exécution affecte-t-il les résultats ?

#### Type D : Erreur de Fixture/Données

**Symptômes :**

- Parsing XML/JSON échoue
- Fichier de fixture introuvable
- Structure de données inattendue

**Exemples :**

```javascript
// Fixture manquante ou mal formée
const xml = await fs.readFile('resources/integration/Missing.xml', 'utf8')
// Erreur: ENOENT
```

**Questions à poser :**

- Le fichier de fixture existe-t-il au bon chemin ?
- Le contenu XML/JSON est-il valide ?
- La structure correspond-elle aux attentes du mapper ?
- Les données de test sont-elles représentatives ?

#### Type E : Erreur de Logique Métier

**Symptômes :**

- Test correctement écrit mais mapper produit mauvais résultat
- Validation rejette données valides
- Transformation incorrecte

**Exemples :**

```javascript
// Double encapsulation system.system
expect(armor.system.defense).toBe(2) // Reçu: undefined (car armor.system.system.defense)
```

**Questions à poser :**

- Le mapper respecte-t-il le schéma Foundry attendu ?
- Les transformations XML → JSON → Item sont-elles correctes ?
- Les valeurs par défaut sont-elles appliquées ?
- Les cas limites sont-ils gérés ?

---

## 🔧 Phase 2 : Stratégies de Correction par Type

### 2.1 Correction Type A : Assertions

#### Diagnostic

```javascript
// Examiner l'assertion échouée
expect(result.system.value).toBe(10)
//        ^^^^^^^^^^^^^^^ Qu'est-ce qui est réellement produit ?

// Ajouter un log pour voir la structure réelle
console.log('DEBUG result:', JSON.stringify(result, null, 2))
```

#### Actions Correctives

**Cas 1 : Assertion incorrecte (corriger le test)**

```javascript
// ❌ AVANT : Test attend valeur par défaut incorrecte
expect(obligation.system.value).toBe(10)

// ✅ APRÈS : Test corrigé pour refléter comportement réel
expect(obligation.system.value).toBe(0) // Valeur par défaut si non spécifiée
```

**Cas 2 : Comportement métier incorrect (corriger le code)**

```javascript
// Test est correct, mapper a un bug
// Corriger dans module/importer/items/obligation-ogg-dude.mjs
system: {
  value: mapOptionalNumber(xml.Value) || 10 // Ajouter fallback manquant
}
```

**Checklist :**

- [ ] Structure de données attendue documentée
- [ ] Valeurs par défaut validées contre spec métier
- [ ] Cas limites testés (undefined, null, "", 0)
- [ ] Assertion utilise le bon matcher Vitest

### 2.2 Correction Type B : Mocks/Shims

#### Diagnostic

```javascript
// Identifier quelle API manque
ReferenceError: foundry is not defined
//               ^^^^^^^ Quelle partie de l'API ?

// Vérifier ordre des imports
import xml2jsModule from '../../vendors/xml2js.min.js' // ✅ En premier
// Shim AVANT import des modules qui l'utilisent
globalThis.xml2js = { js: xml2jsModule }
import { parseXmlToJson } from '../../module/utils/xml/parser.mjs' // ✅ Après shim
```

#### Actions Correctives

**Cas 1 : Shim xml2js manquant (pattern établi)**

```javascript
// ✅ TOUJOURS en tête de fichier de test, AVANT autres imports
import xml2jsModule from '../../vendors/xml2js.min.js'

if (globalThis.xml2js === undefined) {
  globalThis.xml2js = { js: xml2jsModule }
}
```

**Cas 2 : Mock Foundry incomplet**

```javascript
// Étendre le mock dans beforeEach
beforeEach(() => {
  globalThis.foundry = {
    utils: {
      deepClone: vi.fn((obj) => JSON.parse(JSON.stringify(obj))),
      mergeObject: vi.fn((target, source) => ({ ...target, ...source })),
    },
    applications: {
      api: {
        HandlebarsApplicationMixin: (base) => base,
      },
    },
  }
})
```

**Cas 3 : Mock SYSTEM pour mappers**

```javascript
// Si mapper lit SYSTEM.SKILLS à l'import time
beforeEach(() => {
  globalThis.SYSTEM = {
    SKILLS: {
      rangedLight: { label: 'Ranged Light' },
      // ... autres compétences nécessaires
    },
    WEAPON: {
      QUALITIES: {
        blast: { label: 'Blast' },
      },
    },
  }
})
```

**Checklist :**

- [ ] Shim xml2js avant tous imports métier
- [ ] Mock Foundry couvre toutes API utilisées
- [ ] Mock SYSTEM défini si mapper y accède
- [ ] Imports ordonnés correctement (shims → mocks → métier)

### 2.3 Correction Type C : État/Séquençage

#### Diagnostic

```javascript
// Reproduire avec test isolé vs suite
pnpm vitest run tests/importer/obligation-import.integration.spec.mjs -t "should successfully map"
// ✅ Passe isolé

pnpm vitest run tests/importer/obligation-import.integration.spec.mjs
// ❌ Échoue en suite → fuite d'état
```

#### Actions Correctives

**Cas 1 : Stats non réinitialisées**

```javascript
// ✅ TOUJOURS appeler reset dans beforeEach
import { resetObligationImportStats } from '../../module/importer/utils/obligation-import-utils.mjs'

beforeEach(() => {
  resetObligationImportStats() // Nettoyer l'état avant chaque test
})
```

**Cas 2 : Mocks non nettoyés**

```javascript
import { vi } from 'vitest'

beforeEach(() => {
  vi.clearAllMocks() // Nettoyer historique des mocks
})

afterEach(() => {
  vi.restoreAllMocks() // Restaurer implémentations originales si nécessaire
})
```

**Cas 3 : Globals non restaurés**

```javascript
afterEach(() => {
  // Nettoyer globaux modifiés
  delete globalThis.xml2js
  delete globalThis.SYSTEM
  delete globalThis.foundry
})
```

**Checklist :**

- [ ] `reset*ImportStats()` dans `beforeEach`
- [ ] `vi.clearAllMocks()` dans `beforeEach`
- [ ] Globals nettoyés dans `afterEach`
- [ ] Tests passent en isolation ET en suite

### 2.4 Correction Type D : Fixtures

#### Diagnostic

```bash
# Vérifier existence fixture
ls -la resources/integration/Obligations.xml

# Valider format XML
xmllint --noout resources/integration/Obligations.xml

# Parser manuellement pour debug
node -e "
  const fs = require('fs');
  const xml = fs.readFileSync('resources/integration/Obligations.xml', 'utf8');
  console.log(xml.substring(0, 500));
"
```

#### Actions Correctives

**Cas 1 : Fixture manquante**

```bash
# Créer fixture minimale pour tests
cat > resources/integration/Obligations.xml << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<Obligations>
  <Obligation>
    <Key>DEBT</Key>
    <Name>Debt</Name>
    <Description>You owe someone money.</Description>
  </Obligation>
</Obligations>
EOF
```

**Cas 2 : Structure XML invalide**

```javascript
// Adapter parser ou corriger XML
const raw = await parseXmlToJson(xml)

// Vérifier structure attendue
expect(raw).toHaveProperty('Obligations.Obligation')

// Normaliser en tableau si nécessaire
const obligationNodes = Array.isArray(raw.Obligations.Obligation)
  ? raw.Obligations.Obligation
  : [raw.Obligations.Obligation]
```

**Cas 3 : Données test non représentatives**

```xml
<!-- Ajouter cas limites dans fixture -->
<Obligation>
  <Key>EMPTY_DESC</Key>
  <Name>No Description</Name>
  <!-- Description absente intentionnellement -->
</Obligation>
<Obligation>
  <Key>MALFORMED</Key>
  <!-- Name manquant pour tester robustesse -->
  <Description>Invalid data</Description>
</Obligation>
```

**Checklist :**

- [ ] Fixtures existent dans `resources/integration/`
- [ ] XML/JSON valide syntaxiquement
- [ ] Données couvrent cas nominaux ET limites
- [ ] Structure cohérente avec mapper

### 2.5 Correction Type E : Logique Métier

#### Diagnostic

```javascript
// Isoler la transformation problématique
const testInput = {
  Key: 'TEST',
  Name: 'Test Obligation',
  Value: '5',
}

// Appeler mapper directement
const result = obligationMapper([testInput])
console.log('Result:', result)

// Comparer avec structure attendue
const expected = {
  type: 'obligation',
  name: 'Test Obligation',
  system: {
    value: 5, // Number, pas string
  },
}
```

#### Actions Correctives

**Cas 1 : Double encapsulation (pattern récurrent)**

```javascript
// ❌ AVANT : Mapper retourne { system: {...} }
function obligationMapper(obligations) {
  return obligations.map((xml) => ({
    system: {
      // ...
    },
  }))
}

// Pipeline encapsule à nouveau → system.system

// ✅ APRÈS : Pattern Adaptateur dans pipeline
function _storeItems(items) {
  for (const item of items) {
    const systemData = item.system ?? item // Accepter les deux formats
    await Item.create({
      ...item,
      system: systemData, // Garantir une seule encapsulation
    })
  }
}
```

**Cas 2 : Parsing type incorrect**

```javascript
// ❌ AVANT : String au lieu de Number
system: {
  value: xml.Value // "10" (string)
}

// ✅ APRÈS : Coercition type explicite
system: {
  value: Number(xml.Value) || 0 // 10 (number)
}
```

**Cas 3 : Valeurs par défaut manquantes**

```javascript
// ❌ AVANT : Propriétés undefined si absentes
system: {
  extraXp: xml.ExtraXP // undefined si non présent
}

// ✅ APRÈS : Fallbacks explicites
system: {
  extraXp: Number(xml.ExtraXP) || 0 // Toujours un nombre
}
```

**Checklist :**

- [ ] Types corrects (Number, Boolean, String)
- [ ] Valeurs par défaut pour champs optionnels
- [ ] Structure conforme schéma Foundry
- [ ] Pas de double encapsulation `system.system`

---

## 🧪 Phase 3 : Validation de la Correction

### 3.1 Tests Unitaires Spécifiques

```bash
# Re-exécuter test corrigé isolément
pnpm vitest run tests/importer/obligation-import.integration.spec.mjs -t "should successfully map"

# Exécuter suite complète du module
pnpm vitest run tests/importer/obligation-import.integration.spec.mjs

# Exécuter tous tests d'import pour détecter régressions
pnpm vitest run tests/importer/
```

### 3.2 Tests de Non-Régression

```bash
# Suite complète système
pnpm test

# Couverture pour vérifier branches testées
pnpm test:coverage
```

### 3.3 Validation Manuelle (si applicable)

```bash
# Build système
pnpm run build

# Lancer Foundry localement et tester workflow d'import OggDude
# 1. Ouvrir Settings → OggDude Importer
# 2. Charger fichier ZIP test
# 3. Importer domaine corrigé
# 4. Vérifier Items créés dans Compendium/World
```

### 3.4 Checklist Validation

- [ ] Test corrigé passe isolément
- [ ] Test passe en suite complète
- [ ] Aucune régression détectée sur autres tests
- [ ] Couverture maintenue ou améliorée
- [ ] Validation manuelle OK (si UI/UX)
- [ ] Documentation mise à jour si pattern nouveau

---

## 📝 Phase 4 : Documentation de la Correction

### 4.1 Commit Message

Suivre convention Conventional Commits :

```bash
# Format standard
<type>(<scope>): <description courte>

[Corps optionnel expliquant WHY, pas WHAT]

[Footer avec références issues/PRs]

# Exemples
fix(tests): correct obligation mapper stats reset in beforeEach

The test suite was failing because import stats were leaking between
tests. Added resetObligationImportStats() call in beforeEach hook
to ensure clean state.

Refs: #123

test(importer): add fixture for obligation edge cases

Added test cases for obligations with missing descriptions and
malformed data to improve mapper robustness.

fix(importer): prevent double encapsulation in obligation mapper

Applied Adaptateur pattern in _storeItems pipeline to handle
both { system: {...} } and direct {...} formats, preventing
system.system nesting bug.

Closes: #124
```

### 4.2 Mise à Jour Documentation

Si pattern nouveau ou leçon apprise, documenter dans :

- **`documentation/strategie-tests.md`** : Ajouter pattern de test
- **`.github/instructions/importer-memory.instructions.md`** : Leçons spécifiques import
- **`documentation/tasks/core/test-correction-plan.md`** : Enrichir ce plan

**Template de documentation :**

```markdown
## [Titre du Pattern/Leçon]

**Problème identifié** : [Description symptômes]

**Cause racine** : [Explication technique]

**Solution appliquée** : [Pattern de correction]

**Code exemple** :

\`\`\`javascript
// AVANT (bugué)
// ...

// APRÈS (corrigé)
// ...
\`\`\`

**Checklist validation** :

- [ ] Critère 1
- [ ] Critère 2

**Références** :

- PR: #XXX
- Issue: #YYY
- Commit: abc123
```

---

## 🎓 Exemples de Corrections Réelles

### Exemple 1 : Stats Non Réinitialisées (Obligation Import)

**Problème :**

```javascript
// Test échouait : stats.total = 15 au lieu de 5
expect(stats.total).toBe(5) // ❌ Reçu: 15
```

**Diagnostic :**

- Tests précédents dans la suite avaient mappé 10 obligations
- Stats globales non réinitialisées entre tests

**Correction :**

```javascript
import { resetObligationImportStats } from '../../module/importer/utils/obligation-import-utils.mjs'

describe('Obligation Import Integration Tests', () => {
  beforeEach(() => {
    resetObligationImportStats() // ✅ Ajout reset
  })

  it('should successfully map obligations', async () => {
    const sampled = obligationNodes.slice(0, 5)
    const mapped = obligationMapper(sampled)
    const stats = getObligationImportStats()
    expect(stats.total).toBe(5) // ✅ Maintenant correct
  })
})
```

**Leçon :**

Toujours appeler `reset*ImportStats()` dans `beforeEach` pour isolation.

### Exemple 2 : Shim xml2js Manquant (Species Import)

**Problème :**

```javascript
// Test échouait avec erreur
TypeError: xml2js.js.parseStringPromise is not a function
```

**Diagnostic :**

- Shim xml2js absent du fichier de test
- Parser XML tentait d'accéder à API non disponible en Node

**Correction :**

```javascript
// ✅ Ajouter EN TÊTE de fichier, AVANT autres imports
import xml2jsModule from '../../vendors/xml2js.min.js'

if (globalThis.xml2js === undefined) {
  globalThis.xml2js = { js: xml2jsModule }
}

import { parseXmlToJson } from '../../module/utils/xml/parser.mjs'
```

**Leçon :**

Shim xml2js TOUJOURS avant imports utilisant parsing XML.

### Exemple 3 : Double Encapsulation (Armor Mapper)

**Problème :**

```javascript
// Items créés avec armor.system.system.defense
expect(armor.system.defense.base).toBe(2) // ❌ Reçu: undefined
```

**Diagnostic :**

- Mapper retournait `{ system: { defense: {...} } }`
- Pipeline `_storeItems` encapsulait à nouveau dans `.system`
- Résultat : `system.system.defense`

**Correction :**

```javascript
// ✅ Pattern Adaptateur dans pipeline
function _storeItems(items) {
  for (const item of items) {
    const systemData = item.system ?? item // Accepter les deux formats
    await Item.create({
      type: item.type,
      name: item.name,
      system: systemData, // Une seule encapsulation garantie
      flags: item.flags,
    })
  }
}
```

**Leçon :**

Utiliser pattern Adaptateur pour backward compatibility et éviter nesting.

---

## 🚨 Anti-Patterns à Éviter

### ❌ Anti-Pattern 1 : Modifier Code Métier pour Test

```javascript
// ❌ NE JAMAIS FAIRE
// Ajouter logique conditionnelle juste pour tests
function obligationMapper(obligations) {
  if (process.env.NODE_ENV === 'test') {
    // Comportement spécial en test
    return []
  }
  // Comportement normal
}
```

**Pourquoi c'est mauvais :**

- Pollue le code métier avec logique de test
- Crée divergence comportement prod vs test
- Masque bugs réels

**Bonne pratique :**

Corriger le test ou les mocks, pas le métier.

### ❌ Anti-Pattern 2 : Assertions Fragiles sur Ordre

```javascript
// ❌ NE JAMAIS FAIRE
// Test dépend de l'ordre de retour non garanti
expect(result[0].name).toBe('First')
expect(result[1].name).toBe('Second')
```

**Pourquoi c'est mauvais :**

- Ordre non contractuel peut changer
- Test casse sans raison métier

**Bonne pratique :**

```javascript
// ✅ FAIRE
// Tester contenu sans ordre
expect(result.map((r) => r.name).sort()).toEqual(['First', 'Second'].sort())
// ou
expect(result).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'First' })]))
```

### ❌ Anti-Pattern 3 : Ignorer Warnings/Logs

```javascript
// ❌ NE JAMAIS FAIRE
// Supprimer logs pour faire "passer" le test
vi.spyOn(console, 'warn').mockImplementation(() => {}) // Cache les vrais problèmes
```

**Pourquoi c'est mauvais :**

- Masque warnings légitimes
- Peut cacher bugs futurs

**Bonne pratique :**

```javascript
// ✅ FAIRE
// Vérifier ET documenter warnings attendus
const warnSpy = vi.spyOn(logger, 'warn')
// ... code qui génère warning
expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown skill'))
// Warning attendu et documenté
```

### ❌ Anti-Pattern 4 : Tests Dépendants (State Leaking)

```javascript
// ❌ NE JAMAIS FAIRE
let sharedState = []

it('test 1', () => {
  sharedState.push('item1')
  expect(sharedState).toHaveLength(1)
})

it('test 2', () => {
  // Dépend du test 1 !
  expect(sharedState).toHaveLength(1) // ❌ Échoue si test 1 skip
})
```

**Pourquoi c'est mauvais :**

- Tests couplés
- Ordre exécution affecte résultats
- Impossible à paralléliser

**Bonne pratique :**

```javascript
// ✅ FAIRE
describe('Suite', () => {
  let isolatedState

  beforeEach(() => {
    isolatedState = [] // État frais par test
  })

  it('test 1', () => {
    isolatedState.push('item1')
    expect(isolatedState).toHaveLength(1)
  })

  it('test 2', () => {
    isolatedState.push('item2')
    expect(isolatedState).toHaveLength(1) // ✅ Indépendant
  })
})
```

---

## 🔬 Outils de Diagnostic Avancés

### Debug Mode Vitest

```bash
# Mode debug avec Node Inspector
node --inspect-brk ./node_modules/vitest/vitest.mjs run <test-file>

# Puis ouvrir chrome://inspect dans Chrome
# Ajouter breakpoints et inspecter état
```

### Logs Structurés

```javascript
// Ajouter logs temporaires pour debugging
import { logger } from '../../module/utils/logger.mjs'

it('debug test', () => {
  const result = obligationMapper(sample)
  logger.debug('[TEST] Mapped result:', {
    length: result.length,
    first: result[0],
    systemKeys: Object.keys(result[0].system),
  })
})
```

### Snapshot Testing (si pertinent)

```javascript
// Capturer structure complète pour comparaison
it('should match structure snapshot', () => {
  const result = obligationMapper(sample)
  expect(result).toMatchSnapshot()
})

// Mettre à jour snapshot si changement intentionnel
// pnpm vitest run -u
```

### Coverage Analysis

```bash
# Identifier branches non testées
pnpm test:coverage

# Examiner rapport HTML
open coverage/index.html

# Identifier quelles lignes du mapper ne sont pas couvertes
# Ajouter tests ciblés pour ces branches
```

---

## 📊 Checklist Complète de Correction

### Avant de Commencer

- [ ] Reproduire l'erreur localement
- [ ] Lire le message d'erreur complet
- [ ] Identifier type d'erreur (A/B/C/D/E)
- [ ] Consulter historique git (quand introduit ?)
- [ ] Examiner tests similaires (patterns existants ?)

### Pendant la Correction

- [ ] Appliquer stratégie appropriée au type
- [ ] Corriger code métier OU test (pas les deux arbitrairement)
- [ ] Vérifier isolation test (beforeEach/afterEach)
- [ ] Valider fixtures si pertinent
- [ ] Ajouter logs debug si nécessaire

### Après la Correction

- [ ] Test passe isolément
- [ ] Test passe en suite
- [ ] Aucune régression détectée
- [ ] Couverture maintenue/améliorée
- [ ] Commit avec message clair
- [ ] Documentation mise à jour si pattern nouveau

### Validation Finale

- [ ] `pnpm test` passe entièrement
- [ ] `pnpm test:coverage` satisfaisant
- [ ] Validation manuelle OK (si UI)
- [ ] PR reviewable avec contexte clair

---

## 📚 Références

### Documentation Projet

- **Stratégie Tests** : `documentation/strategie-tests.md`
- **Importer Memory** : `.github/instructions/importer-memory.instructions.md`
- **Coding Styles** : `documentation/CODING_STYLES_AGENT.md`

### Exemples Correctifs Passés

- **Fix Talent Import** : `FIX_TALENT_IMPORT_RESUME.md`
- **Bug Armor Mapping** : `BUG_ARMOR_MAPPING_FIX_SUMMARY.md`
- **Fix Obligation Stats UI** : `FIX_OBLIGATION_STATS_UI_RESUME.md`

### Ressources Externes

- **Vitest Documentation** : https://vitest.dev/
- **Testing Best Practices** : https://github.com/goldbergyoni/javascript-testing-best-practices
- **Mocking Patterns** : https://martinfowler.com/articles/mocksArentStubs.html

---

## 🎯 Prompt d'Utilisation

Pour utiliser ce plan lors d'une correction de test :

```markdown
# Contexte

Je travaille sur le système SweRPG (Foundry VTT v13, JavaScript ES2022, Vitest).

# Problème

Le test suivant échoue :

[Copier fichier test complet]

Erreur :

[Copier message erreur complet]

# Objectif

Diagnostiquer la cause racine et appliquer la correction appropriée en suivant le plan `documentation/tasks/core/test-correction-plan.md`.

# Analyse attendue

1. Classification du type d'erreur (A/B/C/D/E)
2. Diagnostic détaillé de la cause racine
3. Proposition de correction (code métier OU test)
4. Justification de la correction
5. Checklist de validation

# Contraintes

- Respecter principes du plan (ne pas modifier métier juste pour test)
- Appliquer patterns existants du projet
- Documenter si pattern nouveau
- Garantir isolation et reproductibilité
```
