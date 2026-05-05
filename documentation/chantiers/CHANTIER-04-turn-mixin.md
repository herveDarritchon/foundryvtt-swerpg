# Chantier 04 : Extraction du Turn Lifecycle Mixin

## Objectif
Extraire les méthodes liées au cycle de vie des tours (début, fin, sortie de combat, délai) vers `turn.mixin.mjs`

## Méthodes à extraire (~80 lignes)

| Méthode | Lignes (actor.mjs) | Description |
|---------|-------------------|-------------|
| `onStartTurn()` | 1281-1308 | Actions au début du tour |
| `onEndTurn()` | 1317-1336 | Actions à la fin du tour |
| `onLeaveCombat()` | 1344-1351 | Actions en quittant le combat |
| `delay()` | 1005-1028 | Retarde l'initiative du personnage |

## Dépendances des méthodes

### `onStartTurn()`
- `this.reset()` - Méthode héritée d'Actor
- `this._sheet` - Référence à la fiche de l'acteur
- `this.flags.swerpg?.delay` - Flags de délai
- `this.isIncapacitated` - Getter
- `this.talentIds` - Set des talents
- `this.isWeakened` - Getter
- `this.isBroken` - Getter
- **Appels** : `this.expireEffects()`, `this.applyDamageOverTime()`, `this.alterResources()`
- **Externe** : `game.combat.round`, `game.combat.combatant`

### `onEndTurn()`
- `this.reset()`, `this._sheet`, `this.flags.swerpg`
- `this.talentIds`, `this.system.resources.action.value`
- **Appels** : `this.alterResources()`, `this.expireEffects()`
- **Externe** : `game.combat`

### `onLeaveCombat()`
- `this.flags.swerpg`
- `this.reset()`, `this._sheet`
- Pas d'autres dépendances

### `delay(initiative, actorUpdates)`
- `this.id` - ID de l'acteur
- `this.update()` - Méthode Foundry Actor
- `this.flags.swerpg`
- **Externe** : `game.combat`, `game.combat.getCombatantByActor()`, `foundry.utils.mergeObject`

## Implémentation de `turn.mixin.mjs`

```javascript
/**
 * Turn Lifecycle Mixin - Handles combat turn start/end/leave and delay
 * Extracted from actor.mjs lines ~1005-1351
 */

export const TurnMixin = (Base) =>
  class extends Base {
    /**
     * Called when this actor's turn starts in combat
     * Handles resource recovery, effect expiration, DOT application
     */
    async onStartTurn() {
      this.reset()
      this._sheet?.render(false)

      const { round, from, to } = this.flags.swerpg?.delay || {}
      if (from && round === game.combat.round && game.combat.combatant?.initiative === to) return

      await this.update({ 'system.status': null })
      await this.expireEffects(true)
      await this.applyDamageOverTime()

      const resources = {}
      const updates = {}

      if (!this.isIncapacitated) {
        resources.action = Infinity
        if (this.talentIds.has('lesserregenerati') && !this.isWeakened) resources.health = 1
        if (this.talentIds.has('irrepressiblespi') && !this.isBroken) resources.morale = 1
      }

      await this.alterResources(resources, updates)
    }

    /**
     * Called when this actor's turn ends in combat
     * Handles talent effects, effect expiration, delay cleanup
     */
    async onEndTurn() {
      this.reset()
      this._sheet?.render(false)

      const { round, from, to } = this.flags.swerpg?.delay || {}
      if (from && round === game.combat.round && game.combat.combatant?.initiative > to) return

      if (this.talentIds.has('conserveeffort00') && this.system.resources.action.value) {
        await this.alterResources({ focus: 1 }, {}, { statusText: 'Conserve Effort' })
      }

      await this.expireEffects(false)

      if (this.flags.swerpg?.delay) await this.update({ 'flags.swerpg.-=delay': null })
    }

    /**
     * Called when this actor leaves combat
     * Cleans up delay flags and resets
     */
    async onLeaveCombat() {
      if (this.flags.swerpg?.delay) await this.update({ 'flags.swerpg.-=delay': null })

      this.reset()
      this._sheet?.render(false)
    }

    /**
     * Delay this actor's turn to a later initiative value
     * @param {number} initiative - The new initiative value
     * @param {object} actorUpdates - Additional updates to apply to the actor
     */
    async delay(initiative, actorUpdates = {}) {
      const combatant = game.combat.getCombatantByActor(this)
      if (!combatant) {
        throw new Error(`Actor [${this.id}] has no Combatant in the currently active Combat.`)
      }

      const maximum = combatant.getDelayMaximum()
      if (!initiative || !Number.isInteger(initiative) || !initiative.between(1, maximum)) {
        throw new Error(`You may only delay to an initiative value between 1 and ${maximum}`)
      }

      await this.update(
        foundry.utils.mergeObject(actorUpdates, {
          'flags.swerpg.delay': {
            round: game.combat.round,
            from: combatant.initiative,
            to: initiative,
          },
        }),
      )

      await game.combat.update(
        {
          turn: game.combat.turn,
          combatants: [{ _id: combatant.id, initiative }],
        },
        { diff: false },
      )
    }
  }
```

## Étapes d'implémentation

1. Créer le fichier `module/documents/actor-mixins/combat/turn.mixin.mjs`
2. Copier les méthodes `onStartTurn()`, `onEndTurn()`, `onLeaveCombat()`, `delay()` depuis `actor.mjs`
3. Vérifier l'accès à `game.combat` (variable globale Foundry)
4. Vérifier que `this.expireEffects()` et `this.applyDamageOverTime()` seront accessibles (EffectsMixin)
5. Vérifier que `this.alterResources()` est accessible (méthode dans actor.mjs)

## Points d'attention

⚠️ **Dépendances sur EffectsMixin**
- `onStartTurn()` appelle `this.expireEffects(true)` et `this.applyDamageOverTime()`
- `onEndTurn()` appelle `this.expireEffects(false)`
- Ces méthodes seront dans `EffectsMixin` (chantier 05)
- L'ordre de composition dans `index.mjs` doit être : `EffectsMixin` → `TurnMixin`

⚠️ **Dépendances sur actor.mjs**
- `this.alterResources()` - Méthode définie dans actor.mjs (pas encore extraite)
- `this.reset()` - Méthode héritée de Foundry Actor
- `this._sheet` - Propriété de Foundry Actor

⚠️ **Accès à `game.combat`**
- C'est une variable globale de Foundry
- Accessible partout dans le contexte Foundry
- Pas besoin d'import spécifique

⚠️ **`foundry.utils.mergeObject`**
- Utilisé dans `delay()`
- Disponible globalement dans Foundry

## Tests à créer

```javascript
// tests/documents/actor-combat-turn.test.mjs
describe('TurnMixin', () => {
  describe('onStartTurn()', () => {
    test('should reset actor and re-render sheet', () => { ... })
    test('should handle delay flags correctly', () => { ... })
    test('should expire start-of-turn effects', () => { ... })
    test('should apply damage over time', () => { ... })
    test('should recover resources based on talents', () => { ... })
  })

  describe('onEndTurn()', () => {
    test('should reset actor and re-render sheet', () => { ... })
    test('should apply Conserve Effort talent', () => { ... })
    test('should expire end-of-turn effects', () => { ... })
    test('should clear delay flags', () => { ... })
  })

  describe('onLeaveCombat()', () => {
    test('should clear delay flags', () => { ... })
    test('should reset actor', () => { ... })
  })

  describe('delay()', () => {
    test('should throw error if no combatant found', () => { ... })
    test('should throw error if initiative out of range', () => { ... })
    test('should update actor flags and combat initiative', () => { ... })
  })
})
```

## Vérification

```bash
# Vérifier la syntaxe
node --check module/documents/actor-mixins/combat/turn.mixin.mjs
```

## Notes sur le flux de combat

Le flux typique est :
1. `SwerpgCombat._onStartTurn(combatant)` → `combatant.actor.onStartTurn()`
2. (Le joueur effectue ses actions)
3. `SwerpgCombat._onEndTurn(combatant)` → `combatant.actor.onEndTurn()`
4. Si l'acteur quitte le combat → `combatant.actor.onLeaveCombat()`

Voir `module/documents/combat.mjs` lignes 83-86 et 148-153 pour les triggers.
