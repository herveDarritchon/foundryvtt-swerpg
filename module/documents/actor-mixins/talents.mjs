/**
 * Talents Mixin - Handles talent management, preparation, and related methods
 * Extracted from actor.mjs
 */

import { SYSTEM } from '../../config/system.mjs'
import { logger } from '../../utils/logger.mjs'

const DEPR_DIRECT_PURCHASE = () => SYSTEM.DEPRECATION.crucible.directPurchase

export const TalentsMixin = (Base) =>
  class extends Base {
    /**
     * Talent hook functions which apply to this Actor based on their set of owned Talents.
     * @type {Object<string, {talent: SwerpgItem, fn: Function}[]>}
     */
    actorHooks = {}

    /**
     * Get DialogV2 from Foundry or test environment
     * @private
     */
    #getDialogV2() {
      // In test environment, DialogV2 may be on globalThis
      if (globalThis.DialogV2) return globalThis.DialogV2
      // In Foundry environment
      if (typeof foundry !== 'undefined' && foundry.applications?.api?.DialogV2) {
        return foundry.applications.api.DialogV2
      }
      return null
    }

    /**
     * Resolve the active specialization-tree UI controller.
     * Prefer the dedicated application bridge for the V1 flow, while preserving a
     * legacy canvas fallback until the old tree is fully retired.
     * @returns {{ isOpenForActor: (actor: object) => boolean, open: (actor: object, options?: object) => Promise<unknown>|unknown, close: () => Promise<unknown>|unknown }|null}
     */
    #getSpecializationTreeController() {
      const dedicatedApp = game.system?.specializationTreeApp
      if (dedicatedApp && typeof dedicatedApp.open === 'function' && typeof dedicatedApp.close === 'function') {
        return {
          isOpenForActor: (actor) => dedicatedApp.actor === actor,
          open: (actor, options) => dedicatedApp.open(actor, options),
          close: () => dedicatedApp.close(),
        }
      }

      const legacyTree = game.system?.tree
      if (legacyTree && typeof legacyTree.open === 'function' && typeof legacyTree.close === 'function') {
        return {
          isOpenForActor: (actor) => legacyTree.actor === actor,
          open: (actor, options) => legacyTree.open(actor, options),
          close: () => legacyTree.close(),
        }
      }

      return null
    }

    /**
     * Open the specialization tree UI for this actor.
     * @param {object} [options] - UI options forwarded to the underlying controller.
     * @returns {Promise<unknown>|unknown}
     */
    async openSpecializationTreeApp(options = {}) {
      if (this.type !== SYSTEM.ACTOR_TYPE.character.type) return

      const controller = this.#getSpecializationTreeController()
      if (!controller) {
        logger.warn('[TalentsMixin] No specialization tree controller is available', {
          actorId: this.id,
          actorType: this.type,
        })
        return
      }

      return controller.open(this, options)
    }

    /**
     * Close the specialization tree UI when it is open for this actor.
     * @returns {Promise<unknown>|unknown}
     */
    async closeSpecializationTreeApp() {
      if (this.type !== SYSTEM.ACTOR_TYPE.character.type) return

      const controller = this.#getSpecializationTreeController()
      if (!controller?.isOpenForActor(this)) return

      return controller.close()
    }

    /**
     * Toggle display of the Talent Tree.
     * @param {boolean} active - Whether to open or close the tree
     */
    async toggleTalentTree(active) {
      if (active === false) return this.closeSpecializationTreeApp()
      return this.openSpecializationTreeApp()
    }

    /* -------------------------------------------- */

    /**
     * Reset all Talents for the Actor.
     * @param {object} [options]        Options which modify how talents are reset
     * @param {boolean} [options.dialog]    Present the user with a confirmation dialog?
     * @returns {Promise<void>}         A Promise which resolves once talents are reset or the dialog is declined
     */
    async resetTalents({ dialog = true } = {}) {
      // Prompt for confirmation
      if (dialog) {
        const DialogV2 = this.#getDialogV2()
        if (!DialogV2) return
        const confirm = await DialogV2.confirm({
          window: {
            title: `Reset Talents: ${this.name}`,
            icon: 'fa-solid fa-undo',
          },
          content: `<p>Are you sure you wish to reset all Talents?</p>`,
          yes: {
            default: true,
          },
        })
        if (!confirm) return
      }

      // Remove all non-permanent talents
      const deleteIds = this.items.reduce((arr, i) => {
        if (i.type === 'talent' && !this.permanentTalentIds.has(i.id)) arr.push(i.id)
        return arr
      }, [])
      await this.deleteEmbeddedDocuments('Item', deleteIds)
    }

    /* -------------------------------------------- */

    /**
     * Re-sync all Talent data on this actor with updated source data.
     * @returns {Promise<void>}
     */
    async syncTalents() {
      const updates = []
      const packIds = [SYSTEM.COMPENDIUM_PACKS.talent, SYSTEM.COMPENDIUM_PACKS.talentExtensions]
      for (const packId of packIds) {
        const pack = game.packs.get(packId)
        if (!pack) continue
        for (const item of this.itemTypes.talent) {
          if (pack.index.has(item.id)) {
            const talent = await pack.getDocument(item.id)
            if (talent) updates.push(talent.toObject())
          }
        }
      }
      await this.updateEmbeddedDocuments('Item', updates, { diff: false, recursive: false, noHook: true })
      await this.update({ '_stats.systemVersion': game.system.version })
    }

    /* -------------------------------------------- */

    /**
     * Handle requests to add a new Talent to the Actor.
     * @deprecated Crucible legacy — uses assertPrerequisites() with talent points.
     *   V1 Edge uses purchaseTalentNode() from talent-node-purchase.mjs.
     *   Will be removed in a future version.
     * @param {SwerpgItem} talent     The Talent item to add to the Actor
     * @param {object} [options]        Options which configure how the Talent is added
     * @param {boolean} [options.dialog]    Prompt the user with a confirmation dialog?
     * @returns {Promise<SwerpgItem|null>} The created talent Item or null if no talent was added
     */
    async addTalent(talent, { dialog = false } = {}) {
      if (DEPR_DIRECT_PURCHASE().warn) {
        logger.deprecated('talents-mixin', 'addTalent() — direct generic talent purchase', 'V1 Edge uses purchaseTalentNode() from talent-node-purchase.mjs.')
      }
      if (!DEPR_DIRECT_PURCHASE().enabled) {
        ui.notifications.warn('Direct talent purchase is disabled (Crucible legacy). Use specialization-tree instead.')
        return null
      }
      // Confirm that the Actor meets the requirements to add the Talent
      try {
        talent.system.assertPrerequisites(this)
      } catch (err) {
        ui.notifications.warn(err.message)
        return null
      }

      // Confirmation dialog
      if (dialog) {
        const DialogV2 = this.#getDialogV2()
        if (!DialogV2) return null
        const confirm = await DialogV2.confirm({
          title: `Purchase Talent: ${talent.name}`,
          content: `<p>Spend 1 Talent Point to purchase <strong>${talent.name}</strong>?</p>`,
          defaultYes: false,
        })
        if (!confirm) return null

        // Re-confirm after the dialog has been submitted to prevent queuing
        try {
          talent.system.assertPrerequisites(this)
        } catch (err) {
          ui.notifications.warn(err.message)
          return null
        }
      }

      // Create the talent
      return talent.constructor.create(talent.toObject(), { parent: this, keepId: true })
    }

    /* -------------------------------------------- */

    /**
     * Prepare Talent data for the Actor.
     * @param {SwerpgItem[]} talents
     * @internal
     */
    prepareTalents(talents) {
      this.talentIds = new Set()
      this.actorHooks = {}
      this.permanentTalentIds = new Set()

      // Iterate over talents
      for (const t of talents) {
        this.talentIds.add(t.id)

        // Register hooks
        for (const hook of t.system.actorHooks) this.registerActorHook(t, hook)
      }
    }

    /* -------------------------------------------- */

    /**
     * Register an Actor hook function.
     * @param {SwerpgItem} talent     The talent registering the hook
     * @param {object} hookData       Registered hook data
     * @param {string} hookData.hook  The hook name
     * @param {string} hookData.fn    The hook function
     * @internal
     */
    registerActorHook(talent, { hook, fn } = {}) {
      const hookConfig = SYSTEM.ACTOR_HOOKS[hook]
      if (!hookConfig) throw new Error(`Invalid Actor hook name "${hook}" defined by Talent "${talent.id}"`)
      this.actorHooks[hook] ||= []
      this.actorHooks[hook].push({ talent, fn: new Function('actor', ...hookConfig.argNames, fn) })
    }

    /* -------------------------------------------- */

    /**
     * Call all actor hooks registered for a certain event name.
     * Each registered function is called in sequence.
     * @param {string} hook     The hook name to call.
     * @param {...*} args       Arguments passed to the hooked function
     */
    callActorHooks(hook, ...args) {
      const hookConfig = SYSTEM.ACTOR_HOOKS[hook]
      if (!hookConfig) throw new Error(`Invalid Actor hook function "${hook}"`)
      const hooks = (this.actorHooks[hook] ||= [])
      for (const { talent, fn } of hooks) {
        logger.debug(`Calling ${hook} hook for Talent ${talent.name}`)
        try {
          fn(this, ...args)
        } catch (err) {
          const msg = `The "${hook}" hook defined for Talent "${talent.name}" failed evaluation in Actor [${this.id}]`
          logger.error(msg, err)
        }
      }
    }
  }
