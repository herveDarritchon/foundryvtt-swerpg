---
description: "Mémoire — Patterns UI FoundryVTT & bonnes pratiques de rafraîchissement"
applyTo: "module/applications/**/*.mjs, module/settings/**/*.mjs, tests/**/*ui*.mjs"
---
# FoundryVTT UI Patterns Memory
Patterns éprouvés pour les composants UI FoundryVTT : rafraîchissement, gestion d'état, tests de validation.

Tagline: UI responsive, état synchronisé, patterns de rendu fiables.

## Pattern: Rafraîchissement automatique après opérations async

### Problème courant
L'UI FoundryVTT ne se rafraîchit **pas automatiquement** après les opérations asynchrones qui modifient l'état affiché. Les utilisateurs doivent interagir avec l'interface pour voir les changements.

### Solution éprouvée : render() explicite post-async
```javascript
// Pattern standard après toute opération async modifiant l'état UI
await someAsyncOperation()

// Rafraîchissement sécurisé de l'UI
if (typeof this.render === 'function') {
  try {
    await this.render()
    logger.debug('[ComponentName] UI refreshed after async operation')
  } catch (e) {
    logger.warn('[ComponentName] render after operation error', {e})
  }
}
```

### Caractéristiques du pattern sécurisé
- ✅ **Vérification de disponibilité** : `typeof this.render === 'function'`
- ✅ **Gestion d'erreur non bloquante** : `try/catch` pour isolation
- ✅ **Async/await complet** : Assurer completion avant suite
- ✅ **Logs contextualisé** : Debug et warn avec composant identifié
- ✅ **Ne jamais bloquer la logique métier** : render() failure ≠ operation failure

## Pattern: Tests de validation de code UI

### Problème
Valider que les patterns de rafraîchissement sont bien présents dans le code sans exécuter l'UI complète.

### Solution : Analyse de contenu fichier
```javascript
import { readFileSync } from 'fs'
import { join } from 'path'

it('should have render() calls after async operations', () => {
  const filePath = join(process.cwd(), 'module/path/Component.mjs')
  const content = readFileSync(filePath, 'utf-8')
  
  // Vérifier pattern post-async render
  const renderAfterAsyncMatch = content.match(
    /await\s+[\w.]+\([\s\S]*?\)[\s\S]*?render\(\)/
  )
  expect(renderAfterAsyncMatch).toBeTruthy()
  
  // Vérifier gestion d'erreur
  expect(content).toContain('try {')
  expect(content).toContain('} catch (e) {')
  expect(content).toContain('render after')
})
```

### Avantages de l'approche
- ✅ **Tests rapides** : Pas de setup UI complet
- ✅ **Détection précoce** : Repère absence de pattern avant runtime
- ✅ **Maintenance facile** : Fail si pattern retiré par erreur
- ✅ **Documentation vivante** : Test = spec du pattern attendu

## Pattern: ApplicationV2 render lifecycle

### Timing critique des render()
Dans FoundryVTT ApplicationV2, plusieurs moments nécessitent render() explicite :

1. **Après modification de data model** : `this.object.update()` + `this.render()`
2. **Après opérations async externes** : Import, fetch, calculation + `this.render()`
3. **Après changement d'état interne** : Flags, settings, mode + `this.render()`

### Anti-pattern : Assumer auto-refresh
```javascript
// ❌ MAUVAIS : Assumer que l'UI se met à jour seule
await this.importData()
// L'utilisateur ne voit pas les changements

// ✅ BON : Rafraîchir explicitement
await this.importData()
await this.render()
```

## Pattern: État partagé et observabilité

### Logs de debug UI systématiques
Toujours logger les étapes critiques du cycle de vie UI :

```javascript
logger.debug(`[${this.constructor.name}] Rendering after ${operationName}`)
logger.debug(`[${this.constructor.name}] State: ${JSON.stringify(this.getCurrentState())}`)
```

### Pattern de state validation
```javascript
// Avant render, valider cohérence état
const state = this.getCurrentState()
if (!this.validateState(state)) {
  logger.warn(`[${this.constructor.name}] Invalid state before render`, {state})
  return // ou fallback state
}
await this.render()
```

## Checklist intégration nouveau composant UI

- [ ] **Render post-async** : Tous les `await` qui modifient l'état suivis de `render()`
- [ ] **Error handling** : `try/catch` autour de `render()` avec logs appropriés
- [ ] **Tests de pattern** : Validation statique que le code contient les patterns
- [ ] **Debug logs** : Traçabilité des cycles render et changements d'état
- [ ] **State validation** : Vérification cohérence avant render si applicable
- [ ] **Documentation** : Commentaires sur les moments critiques de render

## Debugging UI qui ne se met pas à jour

### Checklist diagnostic
1. **Vérifier logs** : Y a-t-il des appels `render()` après l'opération ?
2. **Inspecter state** : L'état interne a-t-il bien changé ?
3. **Tracer async flow** : Tous les `await` sont-ils suivis de `render()` ?
4. **Vérifier erreurs** : Le `render()` échoue-t-il silencieusement ?
5. **Observer timing** : Y a-t-il des race conditions dans les render multiples ?

### Solutions communes
- Ajouter `render()` après operations async qui modifient state
- Wrapper `render()` dans try/catch pour isoler erreurs
- Débouncer les renders multiples si nécessaire
- Valider que `this.render` existe avant appel