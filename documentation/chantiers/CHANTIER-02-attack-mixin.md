# Chantier 02 : Extraction de l'Attack Mixin

## Objectif
Extraire les méthodes liées à l'exécution d'attaques vers `attack.mixin.mjs`

## Méthodes à extraire (~120 lignes)

| Méthode | Lignes (actor.mjs) | Description |
|---------|-------------------|-------------|
| `useAction()` | 878-882 | Utilise une action |
| `weaponAttack()` | 955-995 | Attaque avec une arme |
| `skillAttack()` | 907-944 | Attaque avec une compétence |
| `castSpell()` | **À créer** | Lance un sort (n'existe pas actuellement) |
| `applyTargetBoons()` | 716-740 | Applique les boons/banes selon la cible |

## Dépendances des méthodes

### `useAction()`
- `this.actions` - Actions disponibles
- `this.id` - ID de l'acteur

### `weaponAttack()`
- `this.applyTargetBoons()` - Sera dans ce mixin
- `this.callActorHooks()` - Méthode dans actor.mjs (temporairement, à extraire plus tard)
- `this.id` - ID de l'acteur
- **Externe** : `AttackRoll`, `SwerpgAction`, méthodes de `target`

### `skillAttack()`
- `this.applyTargetBoons()` - Sera dans ce mixin
- `this.callActorHooks()` - Méthode dans actor.mjs
- `this.id` - ID de l'acteur
- **Externe** : `game.system.api.dice.AttackRoll`, `SwerpgAction`, méthodes de `target`

### `applyTargetBoons()`
- **Externe** : `foundry.utils.deepClone`, `SYSTEM.EFFECTS`, `logger`

## Implémentation de `attack.mixin.mjs`

```javascript
/**
 * Attack Mixin - Handles all attack-related actions
 * Extracted from actor.mjs lines ~716-995
 */

import AttackRoll from '../../dice/attack-roll.mjs'
import SwerpgAction from '../action.mjs'
import SYSTEM from '../../config/system.mjs'
import logger from '../../utils/logger.mjs'

export const AttackMixin = (Base) =>
  class extends Base {
    /**
     * Use an action by its ID
     * @param {string} actionId - The action identifier
     * @param {object} options - Additional options
     */
    async useAction(actionId, options = {}) {
      const action = this.actions[actionId]
      if (!action) throw new Error(`Action ${actionId} does not exist in Actor ${this.id}`)
      return action.use({ dialog: true, ...options })
    }

    /**
     * Perform a weapon attack
     * @param {SwerpgAction} action - The action being used
     * @param {SwerpgActor} target - The target actor
     * @param {SwerpgItem} weapon - The weapon to use (optional)
     */
    async weaponAttack(action, target, weapon) {
      weapon ||= action.usage.weapon
      const { boons, banes } = this.applyTargetBoons(target, action, 'weapon', !!weapon.config.category.ranged)
      const defenseType = action.usage.defenseType || 'physical'
      
      if (weapon?.type !== 'weapon') {
        throw new Error(`Weapon attack Action "${action.name}" did not specify which weapon is used in the attack`)
      }

      const { ability, skill, enchantment } = weapon.system.actionBonuses
      const rollData = {
        actorId: this.id,
        itemId: weapon.id,
        target: target.uuid,
        ability, skill, enchantment,
        banes, boons, defenseType,
        dc: target.defenses[defenseType].total,
        criticalSuccessThreshold: weapon.system.properties.has('keen') ? 4 : 6,
        criticalFailureThreshold: weapon.system.properties.has('reliable') ? 4 : 6,
      }

      this.callActorHooks('prepareStandardCheck', rollData)
      this.callActorHooks('prepareWeaponAttack', action, target, rollData)
      target.callActorHooks('defendWeaponAttack', action, this, rollData)

      const roll = new AttackRoll(rollData)
      await roll.evaluate({ async: true })
      const r = (roll.data.result = target.testDefense(defenseType, roll))

      if (r < AttackRoll.RESULT_TYPES.GLANCE) return roll
      roll.data.damage = weapon.system.getDamage(this, action, target, roll)
      roll.data.damage.total = SwerpgAction.computeDamage(roll.data.damage)
      return roll
    }

    /**
     * Perform a skill attack
     * @param {SwerpgAction} action - The action being used
     * @param {SwerpgActor} target - The target actor
     */
    async skillAttack(action, target) {
      let { bonuses, damageType, defenseType, restoration, resource, skillId } = action.usage
      const { boons, banes } = this.applyTargetBoons(target, action, 'skill')
      let dc
      
      if (defenseType in target.defenses) dc = target.defenses[defenseType].total
      else {
        defenseType = skillId
        dc = target.skills[skillId].passive
      }
      
      const rollData = { 
        ...bonuses, 
        actorId: this.id, 
        type: skillId, 
        target: target.uuid, 
        boons, banes, defenseType, dc 
      }

      this.callActorHooks('prepareStandardCheck', rollData)
      this.callActorHooks('prepareSkillAttack', action, target, rollData)
      target.callActorHooks('defendSkillAttack', action, this, rollData)

      const roll = new game.system.api.dice.AttackRoll(rollData)
      await roll.evaluate()
      roll.data.result = target.testDefense(defenseType, roll)

      if (roll.data.result === AttackRoll.RESULT_TYPES.HIT) {
        roll.data.damage = {
          overflow: roll.overflow,
          multiplier: bonuses.multiplier,
          base: bonuses.skill + (bonuses.base ?? 0),
          bonus: bonuses.damageBonus,
          resistance: target.getResistance(resource, damageType, restoration),
          type: damageType,
          resource: resource,
          restoration,
        }
        roll.data.damage.total = SwerpgAction.computeDamage(roll.data.damage)
      }
      return roll
    }

    /**
     * Cast a spell (to be implemented)
     * @param {SwerpgAction} action - The spell action
     * @param {SwerpgActor} target - The target actor
     */
    async castSpell(action, target) {
      // TODO: Implement spell casting logic
      throw new Error('castSpell() is not yet implemented')
    }

    /**
     * Apply target-specific boons and banes
     * @param {SwerpgActor} target - The target actor
     * @param {SwerpgAction} action - The action being used
     * @param {string} actionType - Type of action ('weapon', 'skill', etc.)
     * @param {boolean} ranged - Whether the attack is ranged
     */
    applyTargetBoons(target, action, actionType, ranged) {
      const boons = foundry.utils.deepClone(action.usage.boons)
      const banes = foundry.utils.deepClone(action.usage.banes)
      ranged ??= action.range?.maximum > 3
      const isAttack = actionType !== 'skill' && !action.damage?.restoration

      if (target.statuses.has('guarded') && isAttack) {
        banes.guarded = { label: 'Guarded', number: 1 }
      }

      if (target.statuses.has('prone') && isAttack) {
        if (ranged) {
          if ('prone' in banes) banes.prone.number += 1
          else banes.prone = { label: 'Prone', number: 1 }
        } else {
          boons.prone = { label: 'Prone', number: 1 }
        }
      }

      if (target.statuses.has('flanked') && isAttack && !ranged) {
        const ae = target.effects.get(SYSTEM.EFFECTS.getEffectId('flanked'))
        if (ae) {
          boons.flanked = { label: 'Flanked', number: ae.getFlag('swerpg', 'flanked') ?? 1 }
        } else {
          logger.warn(`Missing expected Flanked effect on Actor ${target.id} with flanked status`)
        }
      }

      return { boons, banes }
    }
  }
```

## Étapes d'implémentation

1. Créer le fichier `module/documents/actor-mixins/combat/attack.mixin.mjs`
2. Copier les méthodes listées depuis `actor.mjs`
3. Ajuster les imports (AttackRoll, SwerpgAction, SYSTEM, logger)
4. Vérifier que `this.callActorHooks()` est accessible (méthode sur Base)
5. Vérifier que `target.testDefense()` et `target.getResistance()` seront accessibles (Via DefenseMixin)

## Points d'attention

⚠️ **`castSpell()` n'existe pas** dans actor.mjs actuellement
- Le fichier `action.mjs` (ligne 481) référence `this.actor.castSpell(this, target)`
- Il faut soit l'implémenter, soit corriger action.mjs

⚠️ **Dépendances sur d'autres mixins**
- `target.testDefense()` → Sera dans DefenseMixin (chantier 03)
- `target.getResistance()` → Sera dans DefenseMixin (chantier 03)
- `this.callActorHooks()` → Méthode dans actor.mjs (pas encore extraite)

## Tests à créer

```javascript
// tests/documents/actor-combat-attack.test.mjs
describe('AttackMixin', () => {
  test('useAction() should use the specified action', () => { ... })
  test('weaponAttack() should perform a weapon attack', () => { ... })
  test('skillAttack() should perform a skill attack', () => { ... })
  test('applyTargetBoons() should apply correct boons based on target status', () => { ... })
})
```

## Vérification

```bash
# Vérifier la syntaxe
node --check module/documents/actor-mixins/combat/attack.mixin.mjs
```
