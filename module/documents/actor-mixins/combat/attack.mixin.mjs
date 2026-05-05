/**
 * Attack Mixin - Handles all attack-related actions
 * Extracted from actor.mjs lines ~716-995
 */

import AttackRoll from '../../dice/attack-roll.mjs'
import SwerpgAction from '../../models/action.mjs'
import SYSTEM from '../../config/system.mjs'
import { logger } from '../../utils/logger.mjs'

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
        ability,
        skill,
        enchantment,
        banes,
        boons,
        defenseType,
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
        boons, 
        banes, 
        defenseType, 
        dc 
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
      // This method is referenced in action.mjs line 481
      throw new Error('castSpell() is not yet implemented')
    }

    /**
     * Apply target-specific boons and banes based on target status
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

      // Guarded
      if (target.statuses.has('guarded') && isAttack) {
        banes.guarded = { label: 'Guarded', number: 1 }
      }

      // Prone
      if (target.statuses.has('prone') && isAttack) {
        if (ranged) {
          if ('prone' in banes) banes.prone.number += 1
          else banes.prone = { label: 'Prone', number: 1 }
        } else {
          boons.prone = { label: 'Prone', number: 1 }
        }
      }

      // Flanked
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
