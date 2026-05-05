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
      // Re-prepare data and re-render the actor sheet
      this.reset()
      this._sheet?.render(false)

      // Skip cases where the actor delayed, and it is now their turn again
      const { round, from, to } = this.flags.swerpg?.delay || {}
      if (from && round === game.combat.round && game.combat.combatant?.initiative === to) return

      // Clear system statuses
      await this.update({ 'system.status': null })

      // Remove Active Effects which expire at the start of a turn (round)
      await this.expireEffects(true)

      // Apply damage-over-time before recovery
      await this.applyDamageOverTime()

      // Recover resources
      const resources = {}
      const updates = {}
      if (!this.isIncapacitated) {
        resources.action = Infinity // Try to recover as much action as possible
        if (this.talentIds.has('lesserregenerati') && !this.isWeakened) resources.health = 1
        if (this.talentIds.has('irrepressiblespi') && !this.isBroken) resources.morale = 1
      }
      await this.alterResources(resources, updates)
    }

    /**
     * Actions that occur at the end of an Actor's turn in Combat.
     * This method is only called for one User who has ownership permission over the Actor.
     */
    async onEndTurn() {
      // Re-prepare data and re-render the actor sheet
      this.reset()
      this._sheet?.render(false)

      // Skip cases where the turn is over because the actor delayed
      const { round, from, to } = this.flags.swerpg?.delay || {}
      if (from && round === game.combat.round && game.combat.combatant?.initiative > to) return

      // Conserve Effort talent
      if (this.talentIds.has('conserveeffort00') && this.system.resources.action.value) {
        await this.alterResources({ focus: 1 }, {}, { statusText: 'Conserve Effort' })
      }

      // Remove active effects which expire at the end of a turn
      await this.expireEffects(false)

      // Clear delay flags
      if (this.flags.swerpg?.delay) await this.update({ 'flags.swerpg.-=delay': null })
    }

    /**
     * Called when this actor leaves combat
     * Cleans up delay flags and resets
     */
    async onLeaveCombat() {
      // Clear turn delay flags
      if (this.flags.swerpg?.delay) await this.update({ 'flags.swerpg.-=delay': null })

      // Re-prepare data and re-render the actor sheet
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
