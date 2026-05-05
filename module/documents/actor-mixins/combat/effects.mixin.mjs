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

      // Prune effects if the attack was unsuccessful
      if (!reverse && outcome.rolls.length && !outcome.rolls.some((r) => r.isSuccess)) {
        outcome.effects.length = 0
      }

      // Call applyActionOutcome actor hooks
      this.callActorHooks('applyActionOutcome', action, outcome, { reverse })

      // Apply changes to the Actor
      await this.alterResources(outcome.resources, outcome.actorUpdates, { reverse })
      await this._applyOutcomeEffects(outcome, reverse)
      await this._trackHeroismDamage(outcome.resources, reverse)

      // Record target state changes
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
      // Reverse effects - delete applied effects
      if (reverse) {
        const deleteEffectIds = outcome.effects.reduce((arr, e) => {
          if (this.effects.has(e._id)) arr.push(e._id)
          return arr
        }, [])
        await this.deleteEmbeddedDocuments('ActiveEffect', deleteEffectIds)
        return
      }

      // Apply effects - create new or update existing
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

        // Categorize damage
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
     * Expire active effects whose durations have concluded
     * @param {boolean} start - Is it the start of the turn (true) or the end of the turn (false)
     */
    async expireEffects(start = true) {
      const toDelete = []
      for (const effect of this.effects) {
        if (this._isEffectExpired(effect, start)) toDelete.push(effect.id)
      }
      await this.deleteEmbeddedDocuments('ActiveEffect', toDelete)
    }

    /**
     * Test whether an ActiveEffect is expired
     * @param {ActiveEffect} effect - The effect being tested
     * @param {boolean} start - Is it the start of the turn (true) or the end of the turn (false)
     * @returns {boolean}
     */
    _isEffectExpired(effect, start = true) {
      const { startRound, rounds, turns } = effect.duration
      const elapsed = game.combat.round - startRound + 1

      // Turn-based effects expire at the end of the turn
      if (turns > 0) {
        if (start) return false
        return elapsed >= turns
      }

      // Round-based effects expire at the start of the turn
      else if (rounds > 0) {
        if (!start) return false
        return elapsed > rounds
      }

      return false
    }
  }
