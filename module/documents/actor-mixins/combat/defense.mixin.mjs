/**
 * Defense Mixin - Handles defense calculations and resistances
 * Extracted from actor.mjs lines ~750-868
 */
import { AttackRoll } from '../../../dice/_module.mjs'


export const DefenseMixin = (Base) =>
  class extends Base {
    /**
     * Test a defense against an attack roll
     * @param {string} defenseType - Type of defense ('physical', skill ID, etc.)
     * @param {AttackRoll} roll - The attack roll to test against
     * @returns {number} Result type from AttackRoll.RESULT_TYPES
     */
    testDefense(defenseType, roll) {
      const d = this.system.defenses
      const s = this.system.skills
      
      if (defenseType !== 'physical' && !(defenseType in d) && !(defenseType in s)) {
        throw new Error(`Invalid defense type "${defenseType}" passed to Actor#testDefense`)
      }
      
      if (!(roll instanceof AttackRoll)) {
        throw new Error('You must pass an AttackRoll instance to Actor#testDefense')
      }
      
      const results = AttackRoll.RESULT_TYPES
      let dc

      // Physical Defense: dodge, parry, block, armor
      if (defenseType === 'physical') {
        dc = d.physical.total
        
        // Hit - roll exceeds total defense
        if (roll.total > dc) return results.HIT

        // Random roll for defense type determination
        const r = twist.random() * d.physical.total
        const dodge = d.dodge.total
        
        // Dodge check
        if (r <= dodge) return results.DODGE
        
        // Parry check
        const parry = dodge + d.parry.total
        if (r <= parry) return results.PARRY
        
        // Block check
        const block = dodge + d.block.total
        if (r <= block) return results.BLOCK
        
        // Armor or Glance
        return roll.isCriticalFailure ? results.ARMOR : results.GLANCE
      }

      // Non-physical defense (skill-based or other)
      if (defenseType in s) {
        dc = s[defenseType].passive
      } else {
        dc = d[defenseType].total
      }
      
      if (roll.total > dc) return AttackRoll.RESULT_TYPES.HIT
      else return AttackRoll.RESULT_TYPES.RESIST
    }

    /**
     * Get resistance value for a specific damage type and resource
     * @param {string} resource - Resource type ('health', 'morale', etc.)
     * @param {string} damageType - Type of damage
     * @param {boolean} restoration - Whether this is a restoration (healing)
     * @returns {number} Resistance value (can be Infinity)
     */
    getResistance(resource, damageType, restoration) {
      if (restoration) return 0
      
      let r = this.resistances[damageType]?.total ?? 0
      
      switch (resource) {
        case 'health':
          if (this.isBroken) r -= 2
          if (this.statuses.has('invulnerable')) r = Infinity
          break
        case 'morale':
          if (this.isWeakened) r -= 2
          if (this.statuses.has('resolute')) r = Infinity
          break
      }
      
      return r
    }
  }
