# Chantier 05 : Extraction de l'Effects Manager Mixin

## Objectif
Extraire les méthodes liées à la gestion des effets de combat vers `effects.mixin.mjs`

## Méthodes à extraire (~130 lignes)

| Méthode | Lignes (actor.mjs) | Visibilité | Description |
|---------|-------------------|------------|-------------|
| `applyActionOutcome()` | 1181-1201 | Public | Applique le résultat d'une action |
| `_applyOutcomeEffects()` | 1211-1235 | Private* | Crée/met à jour/supprime les effets |
| `_trackHeroismDamage()` | 1244-1252 | Private* | Suit les dégâts pour l'héroïsme |
| `onDealDamage()` | 1261-1269 | Public | Gère les dégâts critiques |
| `applyDamageOverTime()` | 1361-1377 | Public | Applique les dégâts dans le temps |
| `expireEffects()` | 1386-1392 | Public | Fait expirer les effets |
| `_isEffectExpired()` | 1402-1417 | Private* | Vérifie si un effet est expiré |

*Les méthodes privées `#method()` dans actor.mjs deviennent `_method()` (convention protected) dans le mixin.

## Dépendances des méthodes

### `applyActionOutcome(action, outcome, { reverse })`
- `this.isWeakened`, `this.isBroken`, `this.isIncapacitated` - Getters
- `this.callActorHooks()` - Méthode actor.mjs
- `this.alterResources()` - Méthode actor.mjs
- `this._applyOutcomeEffects()` - Sera dans ce mixin
- `this._trackHeroismDamage()` - Sera dans ce mixin

### `_applyOutcomeEffects(outcome, reverse)`
- `this.effects` - ActiveEffectCollection de Foundry
- `this.deleteEmbeddedDocuments()` - Méthode Foundry
- `this.updateEmbeddedDocuments()` - Méthode Foundry
- `this.createEmbeddedDocuments()` - Méthode Foundry

### `_trackHeroismDamage(resources, reverse)`
- **Externe** : `game.combat?.active`, `game.settings.get/set('swerpg', 'heroism')`

### `onDealDamage(action, outcomes)`
- `this.callActorHooks()` - Méthode actor.mjs

### `applyDamageOverTime()`
- `this.effects` - ActiveEffectCollection
- `this.resistances` - Getter
- `this.alterResources()` - Méthode actor.mjs
- **Externe** : `SYSTEM.RESOURCES`

### `expireEffects(start)`
- `this.effects` - ActiveEffectCollection
- `this._isEffectExpired()` - Sera dans ce mixin
- `this.deleteEmbeddedDocuments()` - Méthode Foundry

### `_isEffectExpired(effect, start)`
- **Externe** : `game.combat.round`

## Implémentation de `effects.mixin.mjs`

```javascript
/**
 * Effects Manager Mixin - Handles combat action outcomes and effect management
 * Extracted from actor.mjs lines ~1181-1417
 */

import SYSTEM from '../../config/system.mjs'

export const EffectsMixin = (Base) =>
  class extends Base {
    /**
     * Apply the outcome of an action (damage, resources, effects)
     * @param {SwerpgAction} action - The action that was performed
     * @param {object} outcome - The action outcome
     * @param {object} options - Options including { reverse: boolean }
     */
    async applyActionOutcome(action, outcome, { reverse = false } = {}) {
      const wasWeakened = this.isWeakened
      const wasBroken = this.isBroken
      const wasIncapacitated = this.isIncapacitated

      if (!reverse && outcome.rolls.length && !outcome.rolls.some((r) => r.isSuccess)) {
        outcome.effects.length = 0
      }

      this.callActorHooks('applyActionOutcome', action, outcome, { reverse })

      await this.alterResources(outcome.resources, outcome.actorUpdates, { reverse })
      await this._applyOutcomeEffects(outcome, reverse)
      await this._trackHeroismDamage(outcome.resources, reverse)

      if (this.isWeakened && !wasWeakened) outcome.weakened = true
      if (this.isBroken && !wasBroken) outcome.broken = true
      if (this.isIncapacitated && !wasIncapacitated) outcome.incapacitated = true
    }

    /**
     * Apply effects from an action outcome (create/update/delete ActiveEffects)
     * @param {object} outcome - Action outcome containing effects
     * @param {boolean} reverse - Whether to reverse the effects
     */
    async _applyOutcomeEffects(outcome, reverse = false) {
      if (reverse) {
        const deleteEffectIds = outcome.effects.reduce((arr, e) => {
          if (this.effects.has(e._id)) arr.push(e._id)
          return arr
        }, [])
        await this.deleteEmbeddedDocuments('ActiveEffect', deleteEffectIds)
        return
      }

      const toCreate = []
      const toUpdate = []
      const toDelete = []

      for (const effectData of outcome.effects) {
        const existing = this.effects.get(effectData._id)
        if (existing && effectData._delete) {
          toDelete.push(effectData._id)
        } else if (existing) {
          toUpdate.push(effectData)
        } else {
          toCreate.push(effectData)
        }
      }

      await this.deleteEmbeddedDocuments('ActiveEffect', toDelete)
      await this.updateEmbeddedDocuments('ActiveEffect', toUpdate)
      await this.createEmbeddedDocuments('ActiveEffect', toCreate, { keepId: true })
    }

    /**
     * Track heroism damage for combat metrics
     * @param {object} resources - Resource changes
     * @param {boolean} reverse - Whether to reverse the tracking
     */
    async _trackHeroismDamage(resources, reverse) {
      if (!game.combat?.active) return

      let delta = 0
      for (const r of ['health', 'wounds', 'morale', 'madness']) {
        delta += resources[r] || 0
      }

      if (delta === 0) return

      if (reverse) delta *= -1

      const heroism = Math.max((game.settings.get('swerpg', 'heroism') || 0) + delta, 0)
      await game.settings.set('swerpg', 'heroism', heroism)
    }

    /**
     * Called when this actor deals damage to others
     * Applies critical effects if applicable
     * @param {SwerpgAction} action - The action used
     * @param {Map} outcomes - Map of outcomes by actor
     */
    onDealDamage(action, outcomes) {
      const self = outcomes.get(this)
      for (const outcome of outcomes.values()) {
        if (outcome === self) continue
        if (outcome.criticalSuccess) {
          this.callActorHooks('applyCriticalEffects', action, outcome, self)
        }
      }
    }

    /**
     * Apply damage over time effects (from ActiveEffects with dot flag)
     */
    async applyDamageOverTime() {
      for (const effect of this.effects) {
        const dot = effect.flags.swerpg?.dot
        if (!dot) continue

        const damage = {}
        for (const r of Object.keys(SYSTEM.RESOURCES)) {
          let v = dot[r]
          if (!v) continue
          if (v > 0) v = Math.clamp(v - this.resistances[dot.damageType].total, 0, 2 * v)
          damage[r] ||= 0
          damage[r] -= v
        }
        await this.alterResources(damage, {}, { statusText: effect.label })
      }
    }

    /**
     * Expire effects based on timing (start or end of turn)
     * @param {boolean} start - Whether this is start-of-turn expiration
     */
    async expireEffects(start = true) {
      const toDelete = []
      for (const effect of this.effects) {
        if (this._isEffectExpired(effect, start)) toDelete.push(effect.id)
      }
      await this.deleteEmbeddedDocuments('ActiveEffect', toDelete)
    }

    /**
     * Check if an effect is expired based on its duration
     * @param {ActiveEffect} effect - The effect to check
     * @param {boolean} start - Whether checking at start of turn
     * @returns {boolean} True if the effect is expired
     */
    _isEffectExpired(effect, start = true) {
      const { startRound, rounds, turns } = effect.duration
      const elapsed = game.combat.round - startRound + 1

      if (turns > 0) {
        if (start) return false
        return elapsed >= turns
      } else if (rounds > 0) {
        if (!start) return false
        return elapsed > rounds
      }

      return false
    }
  }
```

## Étapes d'implémentation

1. Créer le fichier `module/documents/actor-mixins/combat/effects.mixin.mjs`
2. Copier les méthodes (attention aux méthodes privées `#` → `_`)
3. Importer `SYSTEM` depuis `../../config/system.mjs`
4. Vérifier l'accès à `game.combat`, `game.settings`
5. Vérifier que `this.callActorHooks()`, `this.alterResources()` sont accessibles

## Points d'attention

⚠️ **Méthodes privées `#` → `_`**
- Dans actor.mjs : `#applyOutcomeEffects()`, `#trackHeroismDamage()`, `#isEffectExpired()`
- Dans le mixin : `_applyOutcomeEffects()`, `_trackHeroismDamage()`, `_isEffectExpired()`
- La syntaxe `#` est strictement privée en JavaScript et ne peut pas être utilisée dans un mixin classique
- Utiliser le préfixe `_` (convention "protected") pour indiquer que ces méthodes ne sont pas destinées à être appelées de l'extérieur

⚠️ **Dépendances sur actor.mjs**
- `this.callActorHooks()` - Méthode dans actor.mjs (pas encore extraite)
- `this.alterResources()` - Méthode dans actor.mjs (pas encore extraite)
- Ces méthodes restent dans actor.mjs pour l'instant

⚠️ **`SYSTEM.RESOURCES`**
- Utilisé dans `applyDamageOverTime()` pour itérer sur les ressources
- Vérifier que l'import fonctionne

⚠️ **`game.settings`**
- Utilisé dans `_trackHeroismDamage()`
- C'est une API Foundry globale, pas besoin d'import

## Tests à créer

```javascript
// tests/documents/actor-combat-effects.test.mjs
describe('EffectsMixin', () => {
  describe('applyActionOutcome()', () => {
    test('should apply resources and effects', () => { ... })
    test('should reverse effects when reverse=true', () => { ... })
    test('should clear effects if no successful rolls', () => { ... })
  })

  describe('_applyOutcomeEffects()', () => {
    test('should create new effects', () => { ... })
    test('should update existing effects', () => { ... })
    test('should delete effects marked for deletion', () => { ... })
  })

  describe('applyDamageOverTime()', () => {
    test('should apply DOT from effects', () => { ... })
    test('should apply resistance to DOT', () => { ... })
  })

  describe('expireEffects()', () => {
    test('should delete expired start-of-turn effects', () => { ... })
    test('should delete expired end-of-turn effects', () => { ... })
  })

  describe('_isEffectExpired()', () => {
    test('should return true for expired turn-based effects', () => { ... })
    test('should return true for expired round-based effects', () => { ... })
  })
})
```

## Vérification

```bash
# Vérifier la syntaxe
node --check module/documents/actor-mixins/combat/effects.mixin.mjs
```

## Ordre de composition

Ce mixin doit être le **premier** (le plus profond) dans la chaîne de composition car :
- `TurnMixin` dépend de `expireEffects()` et `applyDamageOverTime()`
- C'est une dépendance de bas niveau

Dans `index.mjs` :
```javascript
export const CombatMixin = (Base) =>
  AttackMixin(DefenseMixin(TurnMixin(EffectsMixin(Base))))
//                                           ^^^^^^^^^^^^ En premier
```
