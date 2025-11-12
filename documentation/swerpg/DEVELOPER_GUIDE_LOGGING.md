# Guide du Développeur SWERPG - Logging Centralisé

## Mise à jour du 11 novembre 2025

Suite à la migration vers le logger centralisé, ce guide a été mis à jour pour refléter les nouvelles pratiques obligatoires de logging dans le projet SWERPG.

---

## 📋 Règles de Logging Obligatoires

### ❌ Ce qui est INTERDIT

```javascript
// ❌ INTERDIT : Appels console directs
console.log('Message de debug')
console.warn('Attention')
console.error('Erreur')
console.info('Information')
console.debug('Debug')

// ❌ INTERDIT : Conditions CONFIG.debug avec console
if (CONFIG.debug?.sheets) {
  console.debug('Debug conditionnel')
}
```

### ✅ Ce qui est OBLIGATOIRE

```javascript
// ✅ OBLIGATOIRE : Import et utilisation du logger
import { logger } from '../utils/logger.mjs'

// Logging standard
logger.info('Initialisation du système', { module: 'core' })
logger.warn('Jet sans compétence associée', rollData)
logger.error('Impossible de charger le pack', packId)
logger.debug('Debug détaillé', { context: data })

// Conditions debug avec logger
if (logger.isDebugEnabled()) {
  this._performExpensiveDebugOperation()
}
```

---

## 🎛️ API du Logger Centralisé

### Méthodes de Base

| Méthode          | Niveau  | Toujours visible | Usage recommandé                          |
| ---------------- | ------- | ---------------- | ----------------------------------------- |
| `logger.error()` | Error   | ✅ Oui           | Erreurs critiques, exceptions             |
| `logger.warn()`  | Warning | ✅ Oui           | Avertissements, configurations manquantes |
| `logger.info()`  | Info    | ❌ Debug only    | Messages informatifs système              |
| `logger.debug()` | Debug   | ❌ Debug only    | Debug détaillé, données complexes         |
| `logger.log()`   | Log     | ❌ Debug only    | Usage général debug                       |

### Méthodes Avancées

```javascript
// Groupes pour organiser les logs
logger.group('Initialisation Talent Tree')
logger.debug('Chargement des noeuds...')
logger.debug('Calcul des prérequis...')
logger.groupEnd()

// Mesure de performance
logger.time('CharacterSheet.render')
// ... code à mesurer
logger.timeEnd('CharacterSheet.render')

// Affichage de données tabulaires
logger.table([
  { name: 'Actor1', level: 5 },
  { name: 'Actor2', level: 3 },
])

// Trace de pile (debugging)
logger.trace('Point de debug critique')

// Assertions conditionnelles
logger.assert(actor.system, 'Actor doit avoir un système')
```

### Configuration du Logger

```javascript
// Contrôle du mode debug (généralement géré automatiquement)
logger.setDebug(true) // Active le debug
logger.disableDebug() // Désactive le debug
logger.enableDebug() // Active le debug
logger.isDebugEnabled() // Retourne true/false

// Le logger est automatiquement configuré via detectDevelopmentMode()
// dans swerpg.mjs
```

---

## 🏗️ Patterns d'Utilisation par Contexte

### Applications et Sheets

```javascript
import { logger } from '../../utils/logger.mjs'

export class SwerpgActorSheet extends HandlebarsApplicationMixin(ApplicationV2) {
  async _prepareContext() {
    logger.debug(`[${this.constructor.name}] Preparing context for actor`, this.actor.name)

    const context = await super._prepareContext()

    logger.debug(`[${this.constructor.name}] Context prepared:`, context)
    return context
  }

  _onRender(context, options) {
    super._onRender(context, options)
    logger.info(`Sheet rendered for ${this.actor.name}`)
  }
}
```

### Documents (Actor/Item)

```javascript
import { logger } from '../utils/logger.mjs'

export class SwerpgActor extends Actor {
  prepareDerivedData() {
    super.prepareDerivedData()

    logger.debug('Preparing derived data for actor', this.name)

    try {
      this._calculateThresholds()
      logger.debug('Thresholds calculated', this.system.thresholds)
    } catch (error) {
      logger.error('Error calculating thresholds', error)
      throw error
    }
  }
}
```

### Helpers et Utilitaires

```javascript
import { logger } from '../utils/logger.mjs'

export function importOggDudeData(zipFile) {
  logger.info('Starting OggDude import', { filename: zipFile.name })

  try {
    const data = processZipFile(zipFile)
    logger.debug('Zip file processed', { entries: data.length })

    return data
  } catch (error) {
    logger.error('OggDude import failed', error)
    throw error
  }
}
```

### Modules Métier (lib/)

```javascript
import { logger } from '../../utils/logger.mjs'

export function calculateTalentCost(talent, character) {
  logger.debug('Calculating talent cost', {
    talent: talent.name,
    character: character.name,
  })

  const baseCost = talent.system.cost
  const modifier = character.system.talentCostModifier || 1

  const finalCost = baseCost * modifier

  logger.debug('Talent cost calculated', {
    baseCost,
    modifier,
    finalCost,
  })

  return finalCost
}
```

---

## 🎯 Guides par Niveau de Logging

### 🔥 logger.error() - Erreurs Critiques

**Utilisation** : Erreurs qui cassent le fonctionnement normal
**Visibilité** : Toujours affiché (même sans debug)

```javascript
// Exceptions non récupérables
try {
  await actor.update(data)
} catch (error) {
  logger.error('Actor update failed', { actor: actor.id, error })
  throw error
}

// Données manquantes critiques
if (!talent.system.prerequisites) {
  logger.error('Talent missing prerequisites', talent)
  return false
}
```

### ⚠️ logger.warn() - Avertissements

**Utilisation** : Situations anormales mais non critiques
**Visibilité** : Toujours affiché (même sans debug)

```javascript
// Configuration manquante avec fallback
if (!settings.customRules) {
  logger.warn('Custom rules not configured, using defaults')
  settings.customRules = DEFAULT_RULES
}

// Données incohérentes mais récupérables
if (actor.system.experience < 0) {
  logger.warn('Negative experience detected, setting to 0', {
    actor: actor.name,
    experience: actor.system.experience,
  })
  actor.system.experience = 0
}
```

### ℹ️ logger.info() - Informations Système

**Utilisation** : Messages informatifs importants
**Visibilité** : Uniquement en mode debug

```javascript
// Initialisation de systèmes
logger.info('Talent tree initialized', { nodes: nodeCount })

// Opérations importantes réussies
logger.info('Character sheet rendered successfully', {
  actor: actor.name,
  renderTime: performance.now() - startTime,
})

// État du système
logger.info('Development mode detected', {
  features: developmentFeatures,
})
```

### 🔍 logger.debug() - Debug Détaillé

**Utilisation** : Informations détaillées pour le debugging
**Visibilité** : Uniquement en mode debug

```javascript
// Flux de données complexes
logger.debug('Processing talent prerequisites', {
  talent: talent.name,
  prerequisites: talent.system.prerequisites,
  characterTalents: character.items.filter((i) => i.type === 'talent'),
})

// États intermédiaires
logger.debug('Dice roll calculation steps', {
  basePool: basePool,
  modifiers: modifiers,
  finalPool: finalPool,
})

// Données de contexte étendues
logger.debug('Sheet context prepared', context)
```

---

## 🚦 Gestion du Mode Debug

### Détection Automatique

Le logger est automatiquement configuré dans `swerpg.mjs` :

```javascript
// Configuration automatique basée sur la détection du mode développement
logger.setDebug(swerpg.developmentMode)

// Exposition dans l'API pour accès externe
swerpg.api = {
  // ...autres propriétés
  logger,
  // ...
}
```

### Contrôle Manual (Développement)

```javascript
// Dans la console du navigateur
swerpg.api.logger.enableDebug() // Active tous les logs
swerpg.api.logger.disableDebug() // Ne garde que warn/error
swerpg.api.logger.isDebugEnabled() // Vérifie l'état
```

### Conditions de Debug Coûteuses

```javascript
// Pour des opérations coûteuses uniquement en debug
if (logger.isDebugEnabled()) {
  const expensiveDebugData = calculateComplexDebugInfo()
  logger.debug('Complex debug info', expensiveDebugData)
}

// Pour des visualisations debug
if (logger.isDebugEnabled()) {
  this._visualizeEngagementRanges()
  this._highlightTalentDependencies()
}
```

---

## 📁 Imports Relatifs par Dossier

### Structure des Imports

```javascript
// Depuis module/applications/sheets/
import { logger } from '../../utils/logger.mjs'

// Depuis module/documents/
import { logger } from '../utils/logger.mjs'

// Depuis module/lib/talents/
import { logger } from '../../utils/logger.mjs'

// Depuis module/helpers/
import { logger } from '../utils/logger.mjs'

// Depuis swerpg.mjs (racine)
import { logger } from './module/utils/logger.mjs'
```

---

## 🧪 Tests et Logger

### Tests Unitaires

```javascript
import { describe, test, expect, vi } from 'vitest'
import { logger } from '../../module/utils/logger.mjs'

describe('My Business Logic', () => {
  test('should log appropriately', () => {
    // Mock du logger pour les tests
    const logSpy = vi.spyOn(logger, 'debug')

    myBusinessFunction()

    expect(logSpy).toHaveBeenCalledWith('Expected debug message', expectedData)

    logSpy.mockRestore()
  })
})
```

### Tests d'Intégration

```javascript
describe('Logger Integration', () => {
  test('should respect debug mode', () => {
    logger.setDebug(false)
    const debugSpy = vi.spyOn(console, 'debug')

    logger.debug('This should not appear')

    expect(debugSpy).not.toHaveBeenCalled()

    debugSpy.mockRestore()
  })
})
```

---

## 🚨 Migration d'Ancien Code

### Script de Migration Automatique

Si vous trouvez encore des `console.xxx` dans le code :

```bash
# Vérification des appels console restants
grep -r "console\.\(log\|warn\|error\|info\|debug\)" module/ --exclude="*/logger.mjs"

# Migration automatique (exemple pour un fichier)
sed -i '' \
  -e 's/console\.debug(/logger.debug(/g' \
  -e 's/console\.log(/logger.info(/g' \
  -e 's/console\.info(/logger.info(/g' \
  -e 's/console\.warn(/logger.warn(/g' \
  -e 's/console\.error(/logger.error(/g' \
  monFichier.mjs

# N'oubliez pas d'ajouter l'import !
```

### Checklist de Migration

- [ ] Remplacer tous les `console.xxx` par `logger.xxx`
- [ ] Ajouter `import { logger } from '../utils/logger.mjs'`
- [ ] Ajuster le chemin d'import selon la profondeur du fichier
- [ ] Convertir les conditions `CONFIG.debug.xxx` en `logger.isDebugEnabled()`
- [ ] Tester que les messages apparaissent correctement
- [ ] Vérifier les niveaux de logging appropriés

---

## 📚 Références et Documentation

### Fichiers de Référence

- **Logger source** : `module/utils/logger.mjs`
- **Tests du logger** : `tests/utils/logger-integration.spec.js`
- **Coding style complet** : `documentation/swerpg/CODING_STYLES_AGENT.md`
- **Plan de migration** : `docs/ways-of-work/plan/core-refactor/logger-consolidation/implementation-plan.md`

### API Foundry et Logger

Le logger respecte les conventions Foundry tout en ajoutant une couche de contrôle :

```javascript
// Le logger utilise les mêmes méthodes que console
// mais avec un contrôle centralisé et des préfixes consistants

// Sortie typique :
// SWERPG || [ActorSheet] Context prepared: {...}
// SWERPG || Talent tree initialized: 45 nodes loaded
```

---

## 🏁 Résumé des Bonnes Pratiques

### ✅ À FAIRE

1. **Toujours importer le logger** : `import { logger } from '../utils/logger.mjs'`
2. **Utiliser les bons niveaux** :
   - `error` : Erreurs critiques
   - `warn` : Avertissements (toujours visibles)
   - `info` : Messages informatifs système
   - `debug` : Debug détaillé
3. **Préfixer les messages** avec le contexte : `[ClassName] Message`
4. **Inclure des données contextuelles** : `logger.debug('Message', { data })`
5. **Utiliser `logger.isDebugEnabled()`** pour les opérations coûteuses

### ❌ À ÉVITER

1. **Jamais de `console.xxx` direct** (hors logger.mjs)
2. **Pas de conditions `CONFIG.debug.xxx`** avec console
3. **Éviter les logs trop verbeux** qui polluent la sortie
4. **Ne pas logger de données sensibles** (mots de passe, tokens)
5. **Éviter les objets circulaires** dans les données loggées

---

**Dernière mise à jour** : 11 novembre 2025  
**Status** : Migration logger centralisé complétée ✅ (voir aussi MIGRATION_LOGGING_PROGRESSIVE.md pour stratégie incrémentale PR)
