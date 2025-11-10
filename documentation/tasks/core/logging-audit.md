# Audit Complet des Appels de Logging Legacy

## 🔍 Résumé de l'Audit

**Date de l'audit :** 9 novembre 2025  
**Scope :** Répertoire `/module/` et fichier racine `swerpg.mjs`  
**Objectif :** Identifier tous les appels de logging à migrer vers `logger.mjs`

## 📊 Statistiques Globales

- **Fichiers avec patterns CONFIG.debug :** 11 fichiers
- **Appels conditionnels CONFIG.debug :** 22+ occurrences
- **Appels directs console.xxx :** 45+ occurrences
- **Fichiers concernés au total :** 13 fichiers

## 📋 Détail par Pattern

### Pattern 1 : `if (CONFIG.debug?.sheets) { console.xxx() }`

#### `module/applications/sheets/base-actor-sheet.mjs`

- **Ligne 127** : `if (CONFIG.debug?.sheets)` → `console.debug()`
- **Ligne 236** : `if (CONFIG.debug?.sheets)` → `console.debug()`
- **Ligne 623** : `if (CONFIG.debug?.sheets)` → `console.debug()`

#### `module/applications/sheets/base-item.mjs`

- **Ligne 145** : `if (CONFIG.debug?.sheets)` → `console.debug()`

#### `module/applications/sheets/character-sheet.mjs`

- **Ligne 155** : `if (CONFIG.debug?.sheets)` → `console.debug()`
- **Ligne 251** : `if (CONFIG.debug?.sheets)` → `console.debug()`
- **Ligne 293** : `if (CONFIG.debug?.sheets)` → `console.debug()`
- **Ligne 310** : `if (CONFIG.debug?.sheets)` → `console.debug()`
- **Ligne 410** : `if (CONFIG.debug?.sheets)` → `console.debug()`

#### `module/applications/sheets/obligation.mjs`

- **Ligne 38** : `if (CONFIG.debug?.sheets)` → `console.debug()`

#### `module/applications/sheets/origin.mjs`

- **Ligne 26** : `if (CONFIG.debug?.sheets)` → `console.debug()`
- **Ligne 56** : `if (CONFIG.debug?.sheets)` → `console.debug()`
- **Ligne 72** : `if (CONFIG.debug?.sheets)` → `console.debug()`
- **Ligne 81** : `if (CONFIG.debug?.sheets)` → `console.debug()`
- **Ligne 88** : `if (CONFIG.debug?.sheets)` → `console.debug()`
- **Ligne 97** : `if (CONFIG.debug?.sheets)` → `console.debug()`
- **Ligne 108** : `if (CONFIG.debug?.sheets)` → `console.debug()`
- **Ligne 115** : `if (CONFIG.debug?.sheets)` → `console.debug()`

#### `module/applications/sheets/taxonomy.mjs`

- **Ligne 40** : `if (CONFIG.debug?.sheets)` → `console.debug()`

### Pattern 2 : `if (CONFIG.debug.flanking)`

#### `module/canvas/token.mjs`

- **Ligne 173** : `if (CONFIG.debug.flanking)` → appel méthode visualisation
- **Ligne 441** : `if (!CONFIG.debug.flanking)` → early return

### Pattern 3 : Appels Directs `console.xxx()`

#### `swerpg.mjs` (fichier racine)

- **Ligne 39** : `console.log()` - Initialisation système
- **Ligne 53** : `console.info()` - ASCII dev mode
- **Ligne 55** : `console.info()` - ASCII normal
- **Ligne 635** : `console.log()` - Synchronisation talents
- **Ligne 638** : `console.warn()` - Erreur synchronisation
- **Ligne 644** : `console.log()` - Fin synchronisation

#### `module/config/system.mjs`

- **Ligne 247** : `console.warn()` - Erreur détection mode développement

#### `module/lib/talents/ranked-trained-talent.mjs`

- **Ligne 16** : `console.debug()` - Process talent début
- **Ligne 56** : `console.debug()` - Process talent rank/cost

#### `module/config/talent-tree.mjs`

- **Ligne 148** : `console.warn()` - Erreur configuration talent tree

#### `module/documents/item.mjs`

- **Ligne 182** : `console.debug()` - Debug item multiline
- **Ligne 206** : `console.debug()` - Debug item multiline

#### `module/documents/actor-origin.mjs`

- **Ligne 391** : `console.warn()` - Warning général
- **Ligne 713** : `console.debug()` - Hook talent call
- **Ligne 718** : `console.error()` - Erreur hook talent
- **Ligne 800** : `console.warn()` - Missing flanked effect

#### `module/documents/actor.mjs`

- **Ligne 456** : `console.warn()` - Warning général

## 🎯 Classification par Priorité

### Priorité 1 - CRITIQUE (Sheets)

**Impact :** Utilisé fréquemment par les développeurs pour debug des sheets  
**Fichiers :** 6 fichiers de sheets, 22 appels  
**Action :** Migration immédiate avec `logger.debug()`

### Priorité 2 - IMPORTANT (Documents & Logic)

**Impact :** Logic métier, erreurs et warnings importants  
**Fichiers :** 4 fichiers documents/lib, 10+ appels  
**Action :** Migration avec `logger.error()`, `logger.warn()`, `logger.debug()`

### Priorité 3 - MODERATE (Config & Canvas)

**Impact :** Configuration système et debug canvas  
**Fichiers :** 3 fichiers config/canvas, 5+ appels  
**Action :** Migration avec logger approprié selon niveau

### Priorité 4 - LOW (System Init)

**Impact :** Messages d'initialisation système  
**Fichiers :** `swerpg.mjs`, 6 appels  
**Action :** Migration avec `logger.info()`, `logger.log()`

## 🔧 Stratégie de Migration par Fichier

### Sheets (Applications)

```javascript
// AVANT
if (CONFIG.debug?.sheets) {
  console.debug(`[${this.constructor.name}] Context prepared:`, context)
}

// APRÈS
import { logger } from '../../../utils/logger.mjs'
logger.debug(`[${this.constructor.name}] Context prepared:`, context)
```

### Documents

```javascript
// AVANT
console.warn(warningMessage)
console.error(errorMessage, err)

// APRÈS
import { logger } from '../utils/logger.mjs'
logger.warn(warningMessage)
logger.error(errorMessage, err)
```

### Canvas (Cas spécial flanking)

```javascript
// AVANT
if (CONFIG.debug.flanking) this._visualizeEngagement(this.engagement)

// APRÈS - Option 1 : Garder la condition
if (CONFIG.debug.flanking) this._visualizeEngagement(this.engagement)

// APRÈS - Option 2 : Logger pour tracer + condition
import { logger } from '../utils/logger.mjs'
logger.debug('Flanking visualization', { engagement: this.engagement })
if (CONFIG.debug.flanking) this._visualizeEngagement(this.engagement)
```

### System Init

```javascript
// AVANT
console.log(`Initializing Swerpg Game System`)

// APRÈS
import { logger } from './module/utils/logger.mjs'
logger.info('Initializing Swerpg Game System')
```

## 🧪 Points d'Attention pour Tests

### Vérifications Critiques

1. **Sheets debug** : Vérifier que les messages de context sont visibles en mode dev
2. **Error handling** : S'assurer que les erreurs/warnings remontént même sans debug
3. **Flanking canvas** : Vérifier que la visualisation fonctionne toujours
4. **System init** : Messages d'initialisation visibles au démarrage

### Cas de Test Prioritaires

1. **Mode développement ON** : Tous les logs debug visibles
2. **Mode production OFF** : Seuls errors/warns visibles, pas de debug
3. **Performance canvas** : Pas de régression sur calculs flanking
4. **Sheets interactions** : Fonctionnalités sheets intactes

## ✅ Checklist de Validation

### Par Fichier

- [ ] `module/applications/sheets/base-actor-sheet.mjs` - 3 appels
- [ ] `module/applications/sheets/base-item.mjs` - 1 appel
- [ ] `module/applications/sheets/character-sheet.mjs` - 5+ appels
- [ ] `module/applications/sheets/obligation.mjs` - 1 appel
- [ ] `module/applications/sheets/origin.mjs` - 8 appels
- [ ] `module/applications/sheets/taxonomy.mjs` - 1 appel
- [ ] `module/canvas/token.mjs` - 2 appels spéciaux
- [ ] `module/config/system.mjs` - 1 appel
- [ ] `module/config/talent-tree.mjs` - 1 appel
- [ ] `module/lib/talents/ranked-trained-talent.mjs` - 2 appels
- [ ] `module/documents/item.mjs` - 2 appels
- [ ] `module/documents/actor-origin.mjs` - 4 appels
- [ ] `module/documents/actor.mjs` - 1 appel
- [ ] `swerpg.mjs` - 6 appels système

### Validation Globale

- [ ] Aucun appel `console.xxx()` dans `/module/` (sauf logger.mjs)
- [ ] Aucun pattern `if (CONFIG.debug?.xxx) { console.xxx() }` restant
- [ ] Tous les imports `logger` ajoutés correctement
- [ ] Tests de régression passants
- [ ] Fonctionnalités équivalentes en mode debug ON/OFF

## 📋 Notes Spéciales

### Canvas Token Flanking

Le fichier `module/canvas/token.mjs` a une logique spéciale pour `CONFIG.debug.flanking` qui contrôle l'affichage visuel. Cette condition doit probablement être conservée en plus du logging.

### System Messages

Les messages dans `swerpg.mjs` (ASCII art, initialisation) sont des messages informatifs important même en production. Utiliser `logger.info()` ou `logger.log()`.

### Error Handling

Tous les `console.error()` et `console.warn()` doivent migrer vers `logger.error()` et `logger.warn()` car le logger les laisse passer même sans debug activé.
