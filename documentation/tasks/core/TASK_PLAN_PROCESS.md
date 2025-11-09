# Processus de Création du Plan de Tâches

## 📋 Méthodologie Appliquée

Ce document détaille les étapes suivies pour créer le plan de tâches de migration du logging vers `logger.mjs`, conformément aux instructions du prompt `task-doc-writer.prompt.md`.

## 🔍 Étapes d'Investigation

### 1. Exploration du Système de Logger Existant

**Fichiers inspectés :**
- `module/utils/logger.mjs` : Analyse complète de l'implémentation du logger centralisé
- Découverte des méthodes disponibles : `log()`, `info()`, `warn()`, `error()`, `debug()`, `group()`, etc.
- Identification du système de contrôle debug via `shouldLog()` et `debugEnabled`

### 2. Audit des Appels de Logging Legacy

**Commandes de recherche utilisées :**
```bash
# Recherche des patterns CONFIG.debug
grep -r "if.*CONFIG.*debug" module/

# Recherche des appels console directs
grep -r "console\.(log|error|warn|info|debug)" module/

# Recherche des imports logger existants
grep -r "import.*logger" .
```

**Résultats de l'audit :**
- **20+ fichiers** avec patterns `if (CONFIG.debug?.sheets) { console.xxx() }`
- **40+ appels directs** à `console.xxx()` dans le module
- **Aucun usage actuel** du logger dans le codebase de production
- **Documentation existante** dans `CODING_STYLES_AGENT.md` spécifiant l'usage du logger

### 3. Analyse de l'Architecture Existante

**Fichiers d'architecture inspectés :**
- `swerpg.mjs` : Point d'entrée principal, hook `init`
- `module/config/system.mjs` : Configuration système et `detectDevelopmentMode()`
- `module/applications/sheets/*.mjs` : Sheets avec appels debug
- `module/documents/*.mjs` : Documents avec logging
- `module/canvas/*.mjs` : Canvas avec debug flanking

### 4. Identification des Contraintes

**Contraintes du projet identifiées :**
- **Foundry VTT v13** : Compatibilité ApplicationV2, DocumentSheetV2
- **Standards de coding** : `CODING_STYLES_AGENT.md` spécifie l'usage obligatoire du logger
- **Tests existants** : Framework Vitest en place
- **Architecture ES6** : Modules import/export

## 🏗️ Construction du Plan

### 1. Définition de la Portée

**Inclus :**
- Migration de tous les patterns `if (CONFIG.debug?.xxx) { console.xxx() }`
- Migration des appels directs `console.xxx()` dans `/module/`
- Intégration du logger au cycle d'initialisation

**Exclus :**
- Scripts de build (hors système Foundry)
- Documentation (conservation des exemples)
- Le logger lui-même

### 2. Architecture de Migration

**Flux identifié :**
1. Configuration du logger dans `swerpg.mjs` hook `init`
2. Import du logger dans chaque module concerné
3. Remplacement systématique des appels legacy
4. Tests de validation

### 3. Priorisation des Tâches

**Ordre de migration choisi :**
1. **Configuration système** : Intégration logger dans `init`
2. **Application Sheets** : Plus nombreux et uniformes
3. **Documents** : Logique métier critique
4. **Autres modules** : Config, lib, canvas
5. **Tests et validation** : Vérification de la migration

## 📊 Analyse des Risques

### Risques Identifiés

1. **Ordre d'initialisation** : Logger doit être configuré avant usage
   - **Mitigation** : Configuration dans hook `init` après `detectDevelopmentMode()`

2. **Performance** : Création d'objets en logs debug
   - **Mitigation** : Logger gère déjà le filtrage via `shouldLog()`

3. **Régressions fonctionnelles** : Changement de comportement subtil
   - **Mitigation** : Tests de régression exhaustifs

4. **Patterns manqués** : Appels de logging non détectés
   - **Mitigation** : Multiples patterns regex, revue manuelle, script de validation finale

## 🎯 Décisions d'Architecture

### 1. Configuration du Logger

**Décision** : Intégrer dans `swerpg.mjs` hook `init`
**Rationale** : Point central d'initialisation, `detectDevelopmentMode()` déjà disponible

### 2. Import Strategy

**Décision** : Import relatif `import { logger } from '../utils/logger.mjs'`  
**Rationale** : Cohérent avec l'architecture ES6 du projet

### 3. Niveau de Debug

**Décision** : Conserver les mêmes informations de debug
**Rationale** : Éviter les régressions, faciliter la validation

### 4. Gestion des Erreurs

**Décision** : `console.warn()` → `logger.warn()`, `console.error()` → `logger.error()`
**Rationale** : Logger passe toujours les erreurs et warnings même sans debug

## 📋 Contraintes Appliquées

### Standards CODING_STYLES_AGENT.md

- ✅ **ES6+ modules** : Import/export respectés
- ✅ **camelCase** : Nommage cohérent
- ✅ **JSDoc** : Documentation des méthodes publiques
- ✅ **Logger centralisé** : Objectif principal de la migration
- ✅ **Performance** : Pas de `innerHTML`, optimisation debug

### Foundry VTT v13

- ✅ **ApplicationV2** : Sheets compatibles
- ✅ **Hooks lifecycle** : Intégration dans `init`
- ✅ **ES modules** : Architecture respectée

### Tests et Qualité

- ✅ **Vitest** : Framework de test en place
- ✅ **Coverage** : Cibles définies (>90%)
- ✅ **Mocks** : Stratégie pour Foundry APIs

## ❓ Questions Ouvertes et Assumptions

### Questions Ouvertes

1. **Performance canvas** : Impact du logging sur les calculs de flanking ?
   - **Action** : Tests de performance spécifiques

2. **Niveau de détail** : Faut-il regrouper certains logs debug ?
   - **Action** : Évaluation lors de l'implémentation

### Assumptions

1. **Logger fonctionnel** : `module/utils/logger.mjs` est complet et testé
2. **Mode debug** : `detectDevelopmentMode()` fonctionne correctement
3. **Import paths** : Structure de dossiers stable
4. **Tests existants** : Peuvent être adaptés sans régression majeure

## 🔧 Outils et Méthodes Utilisés

### Recherche de Code
- `grep_search` avec regex pour patterns de logging
- `file_search` pour localiser les fichiers
- `read_file` pour analyse détaillée du contenu

### Analyse d'Architecture
- Exploration de la structure de dossiers
- Identification des points d'intégration Foundry
- Mappage des dépendances entre modules

### Documentation
- Format Markdown avec Mermaid pour les diagrammes
- Structure claire avec Acceptance Criteria
- Estimation et priorisation des tâches

## 📈 Métriques de Validation

### Couverture de Migration
- **Cible** : 100% des appels `if (CONFIG.debug?.xxx)`
- **Cible** : 100% des appels directs `console.xxx()` dans `/module/`

### Qualité
- **Tests** : >90% de couverture pour les nouveaux codes
- **Performance** : Aucune dégradation mesurable
- **Fonctionnalité** : 0 régression sur les features existantes

### Documentation
- **Standards** : 100% de conformité CODING_STYLES_AGENT.md
- **JSDoc** : Toutes les méthodes publiques documentées