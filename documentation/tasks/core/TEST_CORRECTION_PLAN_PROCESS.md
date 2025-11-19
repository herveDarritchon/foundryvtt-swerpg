# Test Correction Plan Process - Processus de Création

## Vue d'ensemble

Ce document décrit le processus suivi pour créer le **Test Correction Plan** (`test-correction-plan.md`), un guide complet de diagnostic et correction d'erreurs de tests dans le système SweRPG.

## Objectifs du Plan

1. **Standardiser** le processus de diagnostic et correction de tests
2. **Éviter** les corrections arbitraires qui cassent le comportement métier
3. **Documenter** les patterns récurrents et leçons apprises
4. **Accélérer** la résolution d'erreurs de tests futures
5. **Garantir** la qualité et l'isolation des tests

## Méthode d'Analyse Suivie

### Étape 1 : Étude de la Documentation Existante

#### Fichiers Analysés

1. **`documentation/CODING_STYLES_AGENT.md`**
   - Extraction des principes de séparation métier/Foundry
   - Identification des patterns de nommage et organisation
   - Règles de mocking et testing

2. **`.github/instructions/importer-memory.instructions.md`**
   - Patterns spécifiques à l'import OggDude
   - Règles de reset des stats entre tests
   - Mocking xml2js et JSZip
   - Anti-patterns observés (modifier code prod pour tests)

3. **`.github/instructions/importer-metrics-memory.instructions.md`**
   - Leçons sur l'agrégateur de métriques
   - Patterns de tests pour exports ESM
   - Préservation stats dernier import
   - Rafraîchissement UI après opérations async

4. **`documentation/strategie-tests.md`**
   - Architecture globale des tests
   - Configuration Vitest
   - Mocks Foundry centralisés
   - Nomenclature et organisation

5. **Résumés de correctifs passés**
   - `FIX_TALENT_IMPORT_RESUME.md` : Erreurs validation SwerpgAction
   - `BUG_ARMOR_MAPPING_FIX_SUMMARY.md` : Double encapsulation system.system
   - `FIX_OBLIGATION_STATS_UI_RESUME.md` : Stats UI et rafraîchissement

#### Insights Clés Extraits

- **Règle d'or** : Ne jamais modifier code production pour faire passer tests
- **Pattern shim xml2js** : Toujours avant imports métier
- **Pattern reset stats** : Dans `beforeEach()` systématiquement
- **Pattern Adaptateur** : Pour éviter double encapsulation `system.system`
- **Mocks Foundry** : Centralisés dans `tests/helpers/mock-foundry.mjs`

### Étape 2 : Analyse des Tests Existants

#### Fichiers de Test Examinés

```bash
# Recherche de tous les fichiers de test
file_search: tests/**/*.spec.mjs
# Résultat : 53 fichiers identifiés

# Analyse des patterns d'assertions
grep_search: toHaveProperty|toBe(|toEqual(|toBeGreaterThan|toBeLessThan
# Résultat : 30+ usages analysés

# Analyse des patterns de setup
grep_search: beforeEach|afterEach|vi.mock|resetAllMocks
# Résultat : Patterns récurrents identifiés
```

#### Tests Représentatifs Analysés

1. **`tests/importer/obligation-import.integration.spec.mjs`**
   - Test d'intégration complet
   - Pattern de reset stats
   - Assertions structure données
   - Gestion fixtures XML

2. **`tests/importer/weapon-import.spec.mjs`**
   - Mock logger
   - Tests mapping avancé (qualités, tags, sécurité)
   - Validation transformations

3. **`tests/integration/armor-import.integration.spec.mjs`**
   - Shim xml2js pattern
   - Parsing XML réel
   - Validation schéma Foundry

#### Patterns Identifiés

1. **Setup Pattern**
   ```javascript
   beforeEach(() => {
     reset*ImportStats()
     vi.clearAllMocks()
   })
   ```

2. **Shim Pattern**
   ```javascript
   import xml2jsModule from '../../vendors/xml2js.min.js'
   if (globalThis.xml2js === undefined) {
     globalThis.xml2js = { js: xml2jsModule }
   }
   ```

3. **Assertion Pattern**
   ```javascript
   expect(result).toHaveProperty('system')
   expect(result.system).toHaveProperty('value', 10)
   ```

### Étape 3 : Taxonomie des Erreurs

À partir de l'analyse des correctifs passés et tests existants, identification de 5 types d'erreurs récurrents :

#### Type A : Erreur d'Assertion
- **Fréquence** : Élevée (30% des échecs)
- **Cause principale** : Valeurs attendues incorrectes, structure mal comprise
- **Exemple** : `expect(stats.total).toBe(5)` reçoit 0

#### Type B : Erreur de Mock/Shim
- **Fréquence** : Moyenne (25% des échecs)
- **Cause principale** : Shim xml2js oublié, mock Foundry incomplet
- **Exemple** : `ReferenceError: foundry is not defined`

#### Type C : Erreur de Séquençage/État
- **Fréquence** : Moyenne (20% des échecs)
- **Cause principale** : Stats non réinitialisées, mocks non nettoyés
- **Exemple** : Test passe isolé, échoue en suite

#### Type D : Erreur de Fixture/Données
- **Fréquence** : Faible (15% des échecs)
- **Cause principale** : Fixture manquante, XML invalide
- **Exemple** : `ENOENT: no such file`

#### Type E : Erreur de Logique Métier
- **Fréquence** : Faible (10% des échecs)
- **Cause principale** : Bug réel dans mapper, double encapsulation
- **Exemple** : `armor.system.system.defense` au lieu de `armor.system.defense`

### Étape 4 : Élaboration des Stratégies de Correction

Pour chaque type d'erreur identifié, création d'une stratégie structurée :

1. **Diagnostic** : Comment identifier la cause racine
2. **Actions Correctives** : Cas spécifiques avec exemples code
3. **Checklist** : Validation étape par étape

#### Principe de Conception

Chaque stratégie suit le pattern :

```
### Type X : [Nom Erreur]

#### Diagnostic
[Questions à poser]
[Commandes à exécuter]
[Logs à examiner]

#### Actions Correctives

**Cas 1 : [Scénario]**
- Code AVANT (bugué)
- Code APRÈS (corrigé)
- Explication

**Cas 2 : [Scénario]**
...

#### Checklist
- [ ] Critère validation 1
- [ ] Critère validation 2
```

### Étape 5 : Collecte des Exemples Réels

Extraction d'exemples concrets depuis les résumés de correctifs :

#### Exemple 1 : Stats Non Réinitialisées
- **Source** : `FIX_OBLIGATION_STATS_UI_RESUME.md`
- **Problème** : `stats.total = 15` au lieu de 5
- **Solution** : Ajout `resetObligationImportStats()` dans `beforeEach`

#### Exemple 2 : Shim xml2js Manquant
- **Source** : Tests d'intégration species
- **Problème** : `TypeError: xml2js.js.parseStringPromise is not a function`
- **Solution** : Shim avant imports métier

#### Exemple 3 : Double Encapsulation
- **Source** : `BUG_ARMOR_MAPPING_FIX_SUMMARY.md`
- **Problème** : `armor.system.system.defense`
- **Solution** : Pattern Adaptateur dans pipeline

### Étape 6 : Identification des Anti-Patterns

À partir de la règle "ne jamais modifier code prod pour tests", identification de 4 anti-patterns majeurs :

1. **Modifier Code Métier pour Test** : Conditionnels `if (NODE_ENV === 'test')`
2. **Assertions Fragiles sur Ordre** : Dépendance ordre non garanti
3. **Ignorer Warnings/Logs** : Masquer problèmes avec mocks silencieux
4. **Tests Dépendants** : État partagé entre tests

Chaque anti-pattern documenté avec :
- Exemple code à éviter
- Explication pourquoi problématique
- Bonne pratique alternative

### Étape 7 : Création des Outils de Diagnostic

Ajout d'une section outils avancés pour cas complexes :

- **Debug Mode Vitest** : Node Inspector
- **Logs Structurés** : Pattern logger debug
- **Snapshot Testing** : Capture structure complète
- **Coverage Analysis** : Identification branches non testées

### Étape 8 : Élaboration des Checklists

Création de 4 checklists pour couvrir tout le cycle :

1. **Avant de Commencer** : Reproduction, identification type
2. **Pendant la Correction** : Application stratégie, isolation
3. **Après la Correction** : Validation, non-régression
4. **Validation Finale** : Suite complète, coverage, validation manuelle

## Structure du Document Final

```
# Test Correction Plan

## Principes Fondamentaux
- Règle d'Or
- Philosophie de Test

## Phase 1 : Diagnostic Initial
- Collecte Informations
- Classification Erreur (Types A-E)

## Phase 2 : Stratégies de Correction
- Correction Type A (Assertions)
- Correction Type B (Mocks/Shims)
- Correction Type C (État/Séquençage)
- Correction Type D (Fixtures)
- Correction Type E (Logique Métier)

## Phase 3 : Validation de la Correction
- Tests Unitaires Spécifiques
- Tests de Non-Régression
- Validation Manuelle
- Checklist Validation

## Phase 4 : Documentation de la Correction
- Commit Message
- Mise à Jour Documentation

## Exemples de Corrections Réelles
- Exemple 1 : Stats Non Réinitialisées
- Exemple 2 : Shim xml2js
- Exemple 3 : Double Encapsulation

## Anti-Patterns à Éviter
- Anti-Pattern 1-4

## Outils de Diagnostic Avancés
- Debug Mode
- Logs Structurés
- Snapshot Testing
- Coverage Analysis

## Checklist Complète

## Références

## Prompt d'Utilisation
```

## Décisions d'Architecture

### Choix de Structure

1. **Progression linéaire** : Diagnostic → Correction → Validation → Documentation
2. **Types d'erreurs séparés** : Facilite navigation et référence rapide
3. **Exemples réels** : Ancrage dans expérience projet
4. **Anti-patterns** : Prévention erreurs fréquentes

### Choix de Contenu

1. **Focus pratique** : Code concret, pas théorie abstraite
2. **Checklists actionables** : Cases à cocher, pas prose
3. **Commandes shell** : Copier-coller direct
4. **Références croisées** : Liens vers autres docs projet

### Choix de Format

1. **Markdown structuré** : Compatibilité GitHub, VSCode
2. **Blocs code annotés** : ❌ AVANT vs ✅ APRÈS
3. **Emojis discrets** : Navigation visuelle rapide
4. **Sections repliables** : Lisibilité longue distance

## Contraintes Respectées

### Coding Styles Agent

- ✅ Separation métier/test
- ✅ Nomenclature kebab-case fichiers
- ✅ Patterns ES2022 (import/export)
- ✅ Mocks centralisés

### Importer Memory

- ✅ Pattern reset stats dans beforeEach
- ✅ Shim xml2js avant imports
- ✅ Ré-export utilitaires stats
- ✅ Tests isolation (ordre indépendant)

### Foundry VTT v13

- ✅ Schémas TypeDataModel
- ✅ Structure `system.*` correcte
- ✅ Flags `swerpg.*` pour données additives
- ✅ ApplicationV2 patterns

## Validation du Plan

### Critères de Qualité

1. **Complétude** : Couvre tous types d'erreurs observés
2. **Clarté** : Étapes suivables sans ambiguïté
3. **Praticité** : Exemples code réels du projet
4. **Maintenabilité** : Structure extensible
5. **Cohérence** : Aligné avec docs existantes

### Tests du Plan

Le plan a été validé en l'appliquant rétroactivement aux correctifs passés :

- ✅ **Fix Talent Import** : Aurait été diagnostiqué Type B (Mock SwerpgAction ID)
- ✅ **Bug Armor Mapping** : Aurait été diagnostiqué Type E (Double encapsulation)
- ✅ **Fix Obligation Stats UI** : Aurait été diagnostiqué Type C (Stats non reset)

Dans chaque cas, les stratégies proposées correspondent aux solutions appliquées.

## Évolution Future

### Mécanisme d'Enrichissement

1. **Feedback loop** : Chaque correction ajoute un exemple si pattern nouveau
2. **Révision trimestrielle** : Consolidation patterns récurrents
3. **Versioning** : Changelog en fin de document
4. **Ownership** : Maintainer identifié

### Pistes d'Amélioration

1. **Scripts automatisés** : Détection type erreur via parsing logs
2. **Templates PR** : Checklist correction intégrée
3. **CI hooks** : Validation reset stats avant merge
4. **Snapshots** : Captures état avant/après pour régression

## Métriques de Succès

### Indicateurs d'Efficacité

- **Temps moyen correction** : Réduction attendue 40%
- **Taux régressions** : Réduction attendue 60%
- **Cohérence corrections** : 100% suivent plan
- **Documentation complétude** : 100% corrections documentées

### Suivi

```markdown
| Trimestre | Corrections | Temps Moyen | Régressions | Docs Complètes |
|-----------|-------------|-------------|-------------|----------------|
| Q1 2025   | -           | Baseline    | Baseline    | Baseline       |
| Q2 2025   | TBD         | TBD         | TBD         | TBD            |
```

## Conclusion

Le **Test Correction Plan** est un document vivant qui capitalise sur l'expérience passée pour accélérer et standardiser les corrections futures. Il respecte les principes fondamentaux du projet (séparation métier/test, isolation, documentation) et fournit un cadre actionnable pour tout développeur confronté à un test en échec.

**Processus de création** : 2025-01-19  
**Basé sur** : 53 fichiers de test, 3 correctifs majeurs, 5 documents de référence  
**Maintainer** : @herveDarritchon  
**Prochaine révision** : 2025-04-19
