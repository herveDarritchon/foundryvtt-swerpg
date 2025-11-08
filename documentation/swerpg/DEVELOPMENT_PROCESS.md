# Processus de Développement swerpg - Refactorisation des Sheets

## Contexte

Ce document décrit le processus suivi pour implémenter la refactorisation des sheets swerpg selon le plan défini dans `SHEETS-REFACTORING-PLAN.md`.

**Date**: 8 novembre 2025  
**Branch**: `doc/ai-retro`  
**Commit**: Refactorisation des sheets - Phase 1

## Objectifs Réalisés

### ✅ Phase 1: Nettoyage et Standardisation (CRITIQUE)

1. **Correction des console.debug non conditionnels**
2. **Standardisation des patterns DEFAULT_OPTIONS**
3. **Correction du problème architectural des classes CSS**

## Analyse Préliminaire

### État Initial du Codebase

Contrairement au plan de refactorisation qui indiquait plusieurs problèmes critiques, l'analyse du code actuel a révélé que la plupart des corrections avaient déjà été appliquées :

- ✅ **Documentation JSDoc**: Correcte dans ObligationSheet, SpecializationSheet, CareerSheet
- ✅ **Console.log conditionnels**: La plupart utilisaient déjà `CONFIG.debug?.sheets`
- ❌ **DEFAULT_OPTIONS incohérents**: Problème réel identifié et corrigé
- ❌ **Classes CSS perdues**: Problème architectural critique découvert et corrigé

## Problèmes Identifiés et Corrections

### 1. Console.debug Non Conditionnels

**Fichiers concernés:**
- `module/applications/sheets/base-actor-sheet.mjs` (2 occurrences)

**Problème:**
```javascript
// ❌ Console.debug permanent
console.debug('[base-actor-sheet] initializeActorSheetClass with type', actor.type)
console.debug('[base-actor-sheet] prepareCharacteristics', characteristics)
```

**Solution appliquée:**
```javascript
// ✅ Console.debug conditionnel
if (CONFIG.debug?.sheets) {
    console.debug('[base-actor-sheet] initializeActorSheetClass with type', actor.type)
}
```

### 2. Problème Architectural Critique: Classes CSS Perdues

**Problème identifié:**
Les méthodes d'initialisation `_initializeItemSheetClass()` et `_initializeActorSheetClass()` remplaçaient complètement les classes CSS au lieu de les fusionner :

```javascript
// ❌ PROBLÈME: Remplace complètement les classes de base
this.DEFAULT_OPTIONS.classes = [actor.type]
this.DEFAULT_OPTIONS.classes = [this.DEFAULT_OPTIONS.item.type]
```

**Impact:**
- Les sheets utilisant l'approche partielle perdaient les classes importantes comme `['swerpg', 'item', 'standard-form']`
- Problèmes de styling potentiels
- Incohérence entre sheets

**Solution implémentée:**

**Dans `base-item.mjs`:**
```javascript
// ✅ SOLUTION: Fusion avec les classes de base
const baseClasses = this.DEFAULT_OPTIONS.classes || ['swerpg', 'item', 'standard-form']
const itemTypeClass = this.DEFAULT_OPTIONS.item.type
// Ensure we don't duplicate classes and always include the item type
this.DEFAULT_OPTIONS.classes = [...new Set([...baseClasses, 'sheet', 'item', itemTypeClass])]
```

**Dans `base-actor-sheet.mjs`:**
```javascript
// ✅ SOLUTION: Fusion avec les classes de base
const baseClasses = this.DEFAULT_OPTIONS.classes || ['swerpg', 'actor', 'standard-form']
const actorTypeClass = actor.type
// Ensure we don't duplicate classes and always include the actor type
this.DEFAULT_OPTIONS.classes = [...new Set([...baseClasses, 'sheet', 'actor', actorTypeClass])]
```

### 3. Standardisation des Patterns DEFAULT_OPTIONS

**Problème:**
Deux approches coexistaient :
- **Approche complète**: Redéfinition complète de DEFAULT_OPTIONS (duplication)
- **Approche partielle**: Définition seulement des propriétés spécifiques (recommandée)

**Sheets converties vers l'approche partielle:**

1. **CareerSheet** (`module/applications/sheets/career.mjs`)
2. **ObligationSheet** (`module/applications/sheets/obligation.mjs`) 
3. **SpecializationSheet** (`module/applications/sheets/specialization.mjs`)
4. **SpeciesSheet** (`module/applications/sheets/species.mjs`)
5. **AncestrySheet** (`module/applications/sheets/ancestry.mjs`)
6. **CharacterSheet** (`module/applications/sheets/character-sheet.mjs`)

**Exemple de conversion:**
```javascript
// ❌ AVANT: Approche complète avec duplication
static DEFAULT_OPTIONS = {
    classes: ['swerpg', 'sheet', 'item', 'career'],
    position: { width: 600, height: 'auto' },
    window: { minimizable: true, resizable: true },
    item: { type: 'career' },
    actions: { toggleCareer: CareerSheet.#onToggleCareerSkill },
}

// ✅ APRÈS: Approche partielle héritant des bases
static DEFAULT_OPTIONS = {
    position: { width: 600, height: 'auto' },
    window: { minimizable: true, resizable: true },
    item: { type: 'career' },
    actions: { toggleCareer: CareerSheet.#onToggleCareerSkill },
}
```

## Impact des Changements

### Bénéfices

1. **Cohérence architecturale**: Toutes les sheets suivent maintenant le même pattern
2. **Maintien des classes CSS**: Plus de risque de perdre les styles de base
3. **Réduction de la duplication**: Moins de code dupliqué entre les sheets
4. **Héritage correct**: Les sheets héritent proprement des configurations de base
5. **Logs propres**: Tous les logs de debug sont maintenant conditionnels

### Fichiers Modifiés

```
module/applications/sheets/
├── base-actor-sheet.mjs      # Fix classes CSS + logs conditionnels
├── base-item.mjs             # Fix classes CSS
├── ancestry.mjs              # Conversion approche partielle
├── career.mjs                # Conversion approche partielle
├── character-sheet.mjs       # Conversion approche partielle
├── obligation.mjs            # Conversion approche partielle
├── specialization.mjs        # Conversion approche partielle
└── species.mjs               # Conversion approche partielle
```

### Tests de Régression

- ✅ **Compilation**: `npm run build` réussie sans erreurs
- ✅ **Format**: Code formaté avec Prettier
- ✅ **Intégrité**: Aucune erreur de syntaxe

## Recommandations pour la Suite

### Phase 2: Validation et Tests Fonctionnels

1. **Tests manuels** des sheets modifiées dans Foundry VTT
2. **Vérification du styling** - s'assurer que les classes CSS fonctionnent
3. **Tests de compatibilité** avec les modules externes

### Phase 3: Optimisations Futures

1. **Factorisation des méthodes communes** (selon le plan original)
2. **Amélioration de la gestion des événements ApplicationV2**
3. **Optimisation des performances de rendu**

## Bonnes Pratiques Établies

### Pattern DEFAULT_OPTIONS Recommandé

```javascript
// ✅ Approche partielle recommandée
static DEFAULT_OPTIONS = {
    // Seulement les propriétés qui diffèrent de la base
    position: { width: 600, height: 'auto' },
    window: { minimizable: true, resizable: true },
    item: { type: 'monType' }, // ou actor: { type: 'monType' }
    actions: {
        // Actions spécifiques à cette sheet
    },
}
```

### Pattern de Debug Conditionnel

```javascript
// ✅ Logs conditionnels obligatoires
if (CONFIG.debug?.sheets) {
    console.debug(`[${this.constructor.name}] Message`, data)
}
```

### Architecture des Classes CSS

Les méthodes d'initialisation fusionnent maintenant correctement :
- Classes de base: `['swerpg', 'sheet', 'item'/'actor', 'standard-form']`
- Classe spécifique: `[typeSpecifique]`
- Résultat: `['swerpg', 'sheet', 'item', 'standard-form', 'typeSpecifique']`

## Conclusion

Cette refactorisation Phase 1 a permis de :
- Corriger un problème architectural critique dans la gestion des classes CSS
- Standardiser l'approche DEFAULT_OPTIONS sur tout le codebase
- Nettoyer les logs de debug non conditionnels
- Établir des patterns cohérents pour l'avenir

Le système est maintenant plus maintenable et respecte les standards ApplicationV2 de Foundry VTT v13.

---

**Auteur**: GitHub Copilot & Hervé Darritchon  
**Révision**: 1.0  
**Statut**: Phase 1 Complétée