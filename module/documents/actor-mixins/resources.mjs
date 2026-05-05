/**
 * Resources Mixin - Handles resource management, health, morale, and related statuses
 * Extracted from actor.mjs
 */

export const ResourcesMixin = (Base) =>
  class extends Base {
    constructor(data, context) {
      super(data, context)
      this.updateCachedResources()
    }

    /**
     * Modify a jauge value increase or decrease for the Actor
     * @param {string} jaugeType      The jauge type to increase or decrease
     * @param {string} action        A string in ['increase', 'decrease'] for the action to perform on the jauge value.
     * @returns {Promise}
     */
    async modifyResource(jaugeType, action) {
      const resource = this.system.resources[jaugeType]

      const value = this.computeResourceValue(resource, action)

      resource.value = value

      const updateData = { [`system.resources.${jaugeType}`]: resource }

      return await this.update(updateData)
    }

    /**
     * Compute the new value for a resource based on the action
     * @param {object} resource - The resource object with value, threshold, etc.
     * @param {string} action - The action to perform ('increase' or 'decrease')
     * @returns {number} The new value
     */
    computeResourceValue(resource, action) {
      if (action === 'increase') {
        return Math.min(resource.value + 1, resource.threshold)
      } else if (action === 'decrease') {
        return Math.max(resource.value - 1, 0)
      }
      throw new Error(`Invalid action "${action}" for jauge type "${resource.type}"`)
    }

    /**
     * Alter multiple resources at once
     * @param {object} resources - Object with resource keys and delta values
     * @param {object} actorUpdates - Additional actor data to update
     * @param {object} options - Options including { reverse: boolean, statusText: string }
     */
    async alterResources(resources, actorUpdates = {}, { reverse = false, statusText } = {}) {
      const updates = {}
      const r = this.system.resources

      for (const [key, delta] of Object.entries(resources)) {
        if (delta === 0) continue
        const resource = r[key]
        if (!resource) continue

        const change = reverse ? -delta : delta
        const newValue = Math.clamp(resource.value + change, 0, resource.max)
        updates[`system.resources.${key}.value`] = newValue
      }

      if (Object.keys(actorUpdates).length) {
        Object.assign(updates, actorUpdates)
      }

      if (Object.keys(updates).length) {
        await this.update(updates)
      }
    }

    /**
     * Apply status effect changes when attribute pools change
     * @param {object} data     The data which changed
     * @returns {Promise<void>}
     * @private
     */
    async #applyResourceStatuses(data) {
      const r = data?.system?.resources || {}
      if ('health' in r || 'wounds' in r) {
        await this.toggleStatusEffect('weakened', { active: this.isWeakened && !this.isDead })
        await this.toggleStatusEffect('dead', { active: this.isDead })
      }
      if ('morale' in r || 'madness' in r) {
        await this.toggleStatusEffect('broken', { active: this.isBroken && !this.isInsane })
        await this.toggleStatusEffect('insane', { active: this.isInsane })
      }
    }

    /**
     * Replenish resources when leveling up or advancing
     * @param {object} data - The update data
     * @private
     */
    #replenishResources(data) {
      const levelChange = foundry.utils.hasProperty(data, 'system.advancement.level')
      const attributeChange = Object.keys(SYSTEM.CHARACTERISTICS).some((k) => {
        return foundry.utils.hasProperty(data, `system.abilities.${k}`)
      })
      if (this.isOwner && (levelChange || attributeChange)) this.rest()
    }

    /**
     * Update cached resource values
     */
    updateCachedResources() {
      this._cachedResources = Object.entries(this.system.resources).reduce(
        (obj, [id, { value }]) => {
          obj[id] = value
          return obj
        },
        {
          wasIncapacitated: this.isIncapacitated,
          wasBroken: this.isBroken,
        },
      )
    }

    /**
     * Rest the actor, recovering resources
     * @returns {Promise<void>}
     */
    async rest() {
      const restData = this._getRestData()
      if (restData) {
        await this.update(restData)
      }
    }

    /**
     * Get the data for resting
     * @returns {object|null} The rest data or null
     * @private
     */
    _getRestData() {
      // Default implementation - can be overridden by specific actor types
      const data = {}
      const resources = this.system.resources
      let hasChanges = false

      // Recover health and morale
      for (const [key, resource] of Object.entries(resources)) {
        if (resource.type === 'active' || resource.type === 'passive') {
          if (resource.value < resource.max) {
            data[`system.resources.${key}.value`] = resource.max
            hasChanges = true
          }
        }
      }

      return hasChanges ? data : null
    }

    /**
     * Toggle a status effect on the actor
     * @param {string} effectId - The ID of the status effect
     * @param {object} options - Options including { active: boolean }
     * @returns {Promise<void>}
     */
    async toggleStatusEffect(effectId, { active }) {
      const effect = this.effects.get(effectId)
      if (active && !effect) {
        const effectData = CONFIG.statusEffects.find((e) => e.id === effectId)
        if (effectData) {
          await this.createEmbeddedDocuments('ActiveEffect', [effectData])
        }
      } else if (!active && effect) {
        await this.deleteEmbeddedDocuments('ActiveEffect', [effect.id])
      }
    }

    /**
     * Prepare effects for the actor
     * @private
     */
    _prepareEffects() {
      // Apply resource statuses based on current resource values
      this.#applyResourceStatuses({ system: { resources: this.system.resources } })
    }

    /* -------------------------------------------- */
    /*  Getters for Actor States                     */
    /* -------------------------------------------- */

    /**
     * Is the actor weakened (health-related)?
     * @returns {boolean}
     */
    get isWeakened() {
      const health = this.system.resources.health
      return health ? health.value <= health.threshold : false
    }

    /**
     * Is the actor broken (morale-related)?
     * @returns {boolean}
     */
    get isBroken() {
      const morale = this.system.resources.morale
      return morale ? morale.value <= morale.threshold : false
    }

    /**
     * Is the actor dead?
     * @returns {boolean}
     */
    get isDead() {
      const health = this.system.resources.health
      const wounds = this.system.resources.wounds
      return health ? health.value <= 0 : false
    }

    /**
     * Is the actor insane?
     * @returns {boolean}
     */
    get isInsane() {
      const madness = this.system.resources.madness
      return madness ? madness.value >= madness.max : false
    }

    /**
     * Is the actor incapacitated?
     * @returns {boolean}
     */
    get isIncapacitated() {
      return this.isDead || this.isInsane
    }

    /**
     * Get the actor's resistances
     * @returns {object}
     */
    get resistances() {
      // Default implementation - can be extended
      return this.system.resistances || {}
    }
  }
