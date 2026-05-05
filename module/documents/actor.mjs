import { SYSTEM } from '../config/system.mjs'
import CharacteristicFactory from '../lib/characteristics/characteristic-factory.mjs'
import ErrorCharacteristic from '../lib/characteristics/error-characteristic.mjs'
import { logger } from '../utils/logger.mjs'
import { CombatMixin } from './actor-mixins/combat/index.mjs'
import { EquipmentMixin } from './actor-mixins/equipment.mjs'
import { ResourcesMixin } from './actor-mixins/resources.mjs'

const { DialogV2 } = foundry.applications.api

/**
 * @typedef {Object} ExperiencePoints
 * @property {number} gained
 * @property {number} spent
 * @property {number} startingExperience
 * @property {number} total
 * @property {number} available
 */

/**
 * @typedef {Object}   ActorRoundStatus
 * @property {boolean} hasMoved
 * @property {boolean} hasAttacked
 * @property {boolean} wasAttacked
 */

/**
 * The Actor document subclass in the Swerpg system which extends the behavior of the base Actor class.
 */
export default class SwerpgActor extends EquipmentMixin(ResourcesMixin(CombatMixin(Actor))) {
  constructor(data, context) {
    super(data, context)
    this._cachedResources = {}
    this.actorHooks = {}
  }

  /**
   * Talent hook functions which apply to this Actor based on their set of owned Talents.
   * @type {Object<string, {talent: SwerpgItem, fn: Function}[]>}
   */
  actorHooks = {}

  /*  Character Creation Methods                  */

  /* -------------------------------------------- */

  /**
   * Toggle display of the Talent Tree.
   * @param active
   */
  async toggleTalentTree(active) {
    if (this.type !== SYSTEM.ACTOR_TYPE.character.type) return
    const tree = game.system.tree
    if (tree.actor === this && active !== true) return game.system.tree.close()
    else if (active !== false) return game.system.tree.open(this)
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
   * Confirm that the Actor meets the requirements to add the Talent, and if so create it on the Actor
   * @param {SwerpgItem} talent     The Talent item to add to the Actor
   * @param {object} [options]        Options which configure how the Talent is added
   * @param {boolean} [options.dialog]    Prompt the user with a confirmation dialog?
   * @returns {Promise<SwerpgItem|null>} The created talent Item or null if no talent was added
   */
  async addTalent(talent, { dialog = false } = {}) {
    // Confirm that the Actor meets the requirements to add the Talent
    try {
      talent.system.assertPrerequisites(this)
    } catch (err) {
      ui.notifications.warn(err.message)
      return null
    }

    // Confirmation dialog
    if (dialog) {
      const confirm = await Dialog.confirm({
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
   * Advance the Actor a certain number of levels (or decrease level with a negative delta).
   * When advancing in level, resources are restored and advancement progress is reset.
   * @param {number} delta                The number of levels to advance or decrease
   * @returns {Promise<SwerpgActor>}    The modified Actor
   */
  async levelUp(delta = 1) {
    if (delta === 0) return

    // Confirm that character creation is complete
    if (this.isL0) {
      const steps = [!this.points.ability.requireInput, !this.points.skill.available, !this.points.talent.available]
      if (!steps.every((k) => k)) return ui.notifications.warn('WALKTHROUGH.LevelZeroIncomplete', { localize: true })
    }

    // Commit the update
    const level = Math.clamp(this.level + delta, 0, 24)
    const update = { 'system.advancement.level': level }
    return this.update(update)
  }

  /* -------------------------------------------- */

  /**
   * Purchase an characteristic score increase or decrease for the Actor
   * @param {string} characteristicId      The characteristic id to increase or decrease
   * @param {string} action        A string in ['forget', 'train'] for the direction of the purchase
   * @returns {Promise}
   */
  async purchaseCharacteristic(characteristicId, action) {
    logger.debug(`purchaseCharacteristic(${characteristicId}, ${action})`)
    const c = this.system.characteristics[characteristicId]

    // Build the characteristic class depending on the context
    const characteristicClass = CharacteristicFactory.build(
      this,
      characteristicId,
      {
        action,
        isCreation: true,
      },
      {},
    )

    if (characteristicClass instanceof ErrorCharacteristic) {
      ui.notifications.warn(characteristicClass.options.message)
      return
    }

    logger.debug(`[Before] purchaseCharacteristic characteristic with id '${characteristicId}' and values:`, characteristicClass, this.actor)

    // Evaluate the characteristic following the action processed
    const characteristicEvaluated = characteristicClass.process()

    // Display a warning if the characteristic action is not valid
    if (characteristicEvaluated instanceof ErrorCharacteristic) {
      ui.notifications.warn(characteristicEvaluated.options.message)
      return
    }

    // Update the characteristic state in the Database
    const characteristicUpdated = await characteristicEvaluated.updateState()

    logger.debug(
      `[After] purchaseCharacteristic characteristic with id '${characteristicId}' and values:`,
      characteristicUpdated.actor,
      characteristicUpdated.data.rank,
    )
  }

  /* -------------------------------------------- */

  /**
   * Test whether this Actor can modify an ability score in a certain direction.
   * @param {string} ability      A value in ABILITIES
   * @param {number} delta        A number in [-1, 1] for the direction of the purchase
   * @returns {boolean}           Can the ability score be changed?
   */
  canPurchaseCharacteristic(ability, delta = 1) {
    if (!this.system.points) return true
    delta = Math.sign(delta)
    const points = this.points.ability
    const a = this.system.abilities[ability]
    if (!a || !delta) return false

    // Case 1 - Point Buy
    if (this.isL0) {
      if (delta > 0 && (a.base === 3 || points.pool < 1)) return false
      else if (delta < 0 && a.base === 0) return false
      return true
    }

    // Case 2 - Regular Increase
    else {
      if (delta > 0 && (a.value === 12 || points.available < 1)) return false
      else if (delta < 0 && a.trained === 0) return false
      return true
    }
  }

  /* -------------------------------------------- */

  /**
   * Purchase a skill rank increase or decrease for the Actor
   * @param {string} skillId      The skill id to increase
   * @param {number} delta        A number in [-1, 1] for the direction of the purchase
   * @returns {Promise}
   */
  async purchaseSkill(skillId, delta = 1) {
    delta = Math.sign(delta)
    const skill = this.system.skills[skillId]
    if (!skill) return

    // Assert that the skill can be purchased
    try {
      this.canPurchaseSkill(skillId, delta, true)
    } catch (err) {
      return ui.notifications.warn(err)
    }

    // Adjust rank
    const rank = skill.rank + delta
    const update = { [`system.skills.${skillId}.rank`]: rank }
    if (rank === 3) update[`system.skills.${skillId}.path`] = null
    return this.update(update)
  }

  /* -------------------------------------------- */

  /**
   * Test whether this Actor can modify a Skill rank in a certain direction.
   * @param {string} skillId      A skill in SKILLS
   * @param {number} delta        A number in [-1, 1] for the direction of the purchase
   * @param {boolean} strict      In strict mode an error message is thrown if the skill cannot be changed
   * @returns {boolean}           In non-strict mode, a boolean for whether the rank can be purchased
   * @throws                      In strict mode, an error if the skill cannot be purchased
   */
  canPurchaseSkill(skillId, delta = 1, strict = false) {
    delta = Math.sign(delta)
    const skill = this.system.skills[skillId]
    if (!skill || delta === 0) return false
    if (this.type !== SYSTEM.ACTOR_TYPE.character.type) return false // TODO only heroes can purchase skills currently

    // Decreasing Skill
    if (delta < 0) {
      if (skill.rank === 0) {
        if (strict) throw new Error('Cannot decrease skill rank')
        return false
      }
      return true
    }

    // Maximum Rank
    if (skill.rank === 5) {
      if (strict) throw new Error('Skill already at maximum')
      return false
    }

    // Require Specialization
    if (skill.rank === 3 && !skill.path) {
      if (strict) throw new Error(game.i18n.localize(`SKILL.ChoosePath`))
      return false
    }

    // Cannot Afford
    const p = this.points.skill
    if (p.available < skill.cost) {
      if (strict) throw new Error(game.i18n.format(`SKILL.CantAfford`, { cost: skill.cost, points: p.available }))
      return false
    }

    // Can purchase
    return true
  }

  /* -------------------------------------------- */

  /**
   * Apply actor detail data.
   * This is an internal helper method not intended for external use.
   * @param {SwerpgItem} item               An Item document, object of Item data, or null to clear data
   * @param {object} [options]                Options which affect how details are applied
   * @param {boolean} [options.canApply]        Allow new detail data to be applied?
   * @param {boolean} [options.canClear]        Allow the prior data to be cleared if null is passed?
   * @param options.isCollection
   * @param options.collectionKey
   * @returns {Promise<void>}
   * @internal
   */
  async _applyDetailItem(item, { canApply = true, canClear = false, isCollection = false, collectionKey = '' } = {}) {
    // If the item is a collection, use the collection key instead of the item type
    const type = isCollection ? collectionKey : item.type

    if (!canApply) {
      throw new Error(`You are not allowed to apply this ${type} item to Actor type ${this.type}`)
    }
    if (!(type in this.system.details)) {
      throw new Error(`Incorrect detail item type ${type} for Actor type ${this.type}`)
    }
    if (!item && !canClear) {
      throw new Error(`You are not allowed to clear ${type} data from Actor ${this.name}`)
    }
    if (item && !canApply) {
      throw new Error(`You are not allowed to apply ${type} data to Actor ${this.name}`)
    }

    // Prepare data
    const key = `system.details.${type}`
    const updateData = {}
    let message

    // Remove existing talents
    const existing = this.system.details[type]
    if (existing?.talents?.size) {
      const deleteIds = Array.from(existing.talents).filter((id) => this.items.has(id))
      await this.deleteEmbeddedDocuments('Item', deleteIds)
    }

    // Clear the detail data
    if (!item) updateData[key] = null
    // Add new detail data
    else {
      const itemData = item.toObject()
      const data = Object.assign(itemData.system, { name: itemData.name, img: itemData.img })
      if (isCollection) {
        this.system.details.specializations.add(data)
        updateData[key] = this.system.details.specializations
      } else {
        const detail = (updateData[key] = data)
        if (detail.freeTalents?.length) {
          updateData.items = []
          for (const uuid of detail.freeTalents) {
            const doc = await fromUuid(uuid)
            if (doc) {
              const object = doc.toObject()
              object.system.isFree = true
              updateData.items.push(object)
            }
          }
        }
      }
      message = game.i18n.format('ACTOR.AppliedDetailItem', { name: data.name, type, actor: this.name })
    }

    // Perform the update
    await this.update(updateData, { keepEmbeddedIds: true })
    if (message) ui.notifications.info(message)
  }

  /* -------------------------------------------- */

  /**
   * View actor detail data as an editable item.
   * This is an internal helper method not intended for external use.
   * @param {string} type         The data type stored in `system.details`
   * @param {object} [options]    Options that configure how the data is viewed
   * @param {boolean} [options.editable]    Is the detail item editable?
   * @returns {Promise<void>}
   * @internal
   */
  async _viewDetailItem(type, { editable = false } = {}) {
    if (!(type in this.system.details)) {
      throw new Error(`Incorrect detail item type ${type} for Actor type ${this.type}`)
    }
    const data = this.toObject().system.details[type]

    // View current data
    if (data?.name) {
      const cls = getDocumentClass('Item')
      const item = new cls(
        {
          name: data.name,
          img: data.img,
          type: type,
          system: foundry.utils.deepClone(data),
        },
        { parent: this },
      )
      item.sheet.render(true, { editable })
      return
    }

    // Browse compendium pack
    if (this.isL0 || !data?.name) {
      const pack = game.packs.get(SYSTEM.COMPENDIUM_PACKS[type])
      pack.render(true)
    }
  }

  /* -------------------------------------------- */
  /*  Equipment Management Methods                */
  /*  Now handled by EquipmentMixin               */
  /* -------------------------------------------- */

  /**
   * Update the Flanking state of this Actor given a set of engaged Tokens.
   * @param {SwerpgTokenEngagement} engagement      The enemies and allies which this Actor currently has engaged.
   */
  async commitFlanking(engagement) {
    const flankedId = SYSTEM.EFFECTS.getEffectId('flanked')
    const flankedStage = engagement.flanked
    const current = this.effects.get(flankedId)
    if (flankedStage === current?.flags.swerpg.flanked) return

    // Add flanked effect
    if (flankedStage > 0) {
      const flankedData = {
        _id: flankedId,
        name: `${game.i18n.localize('EFFECT.STATUSES.Flanked')} ${flankedStage}`,
        description: game.i18n.localize('EFFECT.STATUSES.FlankedDescription'),
        icon: 'systems/swerpg/icons/statuses/flanked.svg',
        statuses: ['flanked'],
        flags: {
          swerpg: {
            engagedEnemies: engagement.enemies.size,
            engagedAllies: engagement.allies.size,
            flanked: flankedStage,
          },
        },
      }
      if (current) {
        if (flankedData.name !== current.name) {
          await current.update(flankedData)
          current._displayScrollingStatus(true)
        }
      } else await this.createEmbeddedDocuments('ActiveEffect', [flankedData], { keepId: true })
    }

    // Remove flanked effect
    else if (current) await current.delete()
  }

  /* -------------------------------------------- */
  /*  Actor Preparation                            */

  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareEmbeddedDocuments() {
    super.prepareEmbeddedDocuments()
    const items = this.itemTypes
    SwerpgActor.#prepareTalents.call(this, items.talent)
  }

  /* -------------------------------------------- */

  /**
   * Prepare Talent data for the Actor.
   * @this {SwerpgActor}
   * @param {SwerpgItem[]} talents
   */
  static #prepareTalents(talents) {
    this.talentIds = new Set()
    this.actorHooks = {}
    this.permanentTalentIds = new Set()

    // Iterate over talents
    for (const t of talents) {
      this.talentIds.add(t.id)

      // Register hooks
      for (const hook of t.system.actorHooks) SwerpgActor.#registerActorHook(this, t, hook)
    }
  }

  /* -------------------------------------------- */

  /* -------------------------------------------- */
  /*  Database Workflows                          */

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preCreate(data, options, user) {
    await super._preCreate(data, options, user)

    // Automatic Prototype Token configuration
    const prototypeToken = { bar1: { attribute: 'resources.wounds' }, bar2: { attribute: 'resources.strain' } }
    switch (data.type) {
      case SYSTEM.ACTOR_TYPE.character.type:
        Object.assign(prototypeToken, { vision: true, actorLink: true, disposition: 1 })
        break
      case SYSTEM.ACTOR_TYPE.adversary.type:
        Object.assign(prototypeToken, { vision: false, actorLink: false, disposition: -1 })
        break
    }
    this.updateSource({ prototypeToken })
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preUpdate(data, options, user) {
    await super._preUpdate(data, options, user)

    // Restore resources when level changes
    const a1 = data.system?.advancement
    if (!a1) return
    const a0 = this._source.system.advancement
    const resetResourceKeys = this.type === SYSTEM.ACTOR_TYPE.character.type ? ['level'] : ['level', 'threat']
    const resetResources = resetResourceKeys.some((k) => k in a1 && a1[k] !== a0[k])
    if (resetResources) {
      const clone = this.clone()
      clone.updateSource(data)
      Object.assign(data, clone._getRestData())
      if (this.type === SYSTEM.ACTOR_TYPE.character.type) a1.progress = clone.level > this.level ? 0 : clone.system.advancement.next
    }
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _onUpdate(data, options, userId) {
    super._onUpdate(data, options, userId)

    // Locally display scrolling status updates
    this.#displayScrollingStatus(data, options)

    // Apply follow-up database changes only as the initiating user
    if (game.userId === userId) {
      this.#updateSize()
    }

    // Update flanking
    const { wasIncapacitated, wasBroken } = this._cachedResources
    if (this.isIncapacitated !== wasIncapacitated || this.isBroken !== wasBroken) {
      const tokens = this.getActiveTokens(true)
      const activeGM = game.users.activeGM
      const commit = activeGM === game.user && activeGM?.viewedScene === canvas.id
      for (const token of tokens) token.refreshFlanking(commit)
    }

    // Update cached resource values
    this.updateCachedResources()

    // Refresh display of the active talent tree
    const tree = game.system.tree
    if (tree.actor === this) {
      const talentChange = foundry.utils.hasProperty(data, 'system.advancement.level') || 'items' in data
      if (talentChange) tree.refresh()
    }
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _onCreateDescendantDocuments(...args) {
    super._onCreateDescendantDocuments(...args)
    const tree = game.system.tree
    if (tree.actor === this) tree.refresh()
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _onDeleteDescendantDocuments(...args) {
    super._onDeleteDescendantDocuments(...args)
    const tree = game.system.tree
    if (tree.actor === this) tree.refresh()
  }

  /* -------------------------------------------- */

  /**
   * Display changes to the Actor as scrolling combat text.
   * @param changed
   * @param root0
   * @param root0.statusText
   */
  #displayScrollingStatus(changed, { statusText } = {}) {
    const resources = changed.system?.resources || {}
    const tokens = this.getActiveTokens(true)
    if (!tokens.length) return
    for (let [resourceName, prior] of Object.entries(this._cachedResources)) {
      if (resources[resourceName]?.value === undefined) continue

      // Get change data
      const resource = SYSTEM.RESOURCES[resourceName]
      const attr = this.system.resources[resourceName]
      const delta = attr.value - prior
      if (delta === 0) continue
      const text = `${delta.signedString()} ${statusText ?? resource.label}`
      const pct = Math.clamp(Math.abs(delta) / attr.max, 0, 1)
      const fontSize = 36 + 36 * pct // Range between [36, 64]
      const healSign = resource.type === 'active' ? 1 : -1
      const fillColor = resource.color[Math.sign(delta) === healSign ? 'heal' : 'high']

      // Display for all tokens
      for (let token of tokens) {
        canvas.interface.createScrollingText(token.center, text, {
          anchor: CONST.TEXT_ANCHOR_POINTS.TOP,
          fontSize: fontSize,
          fill: fillColor,
          stroke: 0x000000,
          strokeThickness: 4,
          jitter: 0.5,
        })
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * Check if actor has any career free skill ranks available.
   * @returns {boolean}   True if actor has free skill ranks
   */
  hasCareerFreeSkillsAvailable() {
    return this.freeSkillRanks.career.available !== 0
  }

  /* -------------------------------------------- */

  /**
   * Check if actor has any specialization free skill ranks available.
   * @returns {boolean}   True if actor has free skill ranks
   */
  hasSpecializationFreeSkillsAvailable() {
    return this.freeSkillRanks.specialization.available !== 0
  }

  /* -------------------------------------------- */

  /**
   * Check if actor has any free skill ranks available.
   * @returns {boolean}   True if actor has free skill ranks
   */
  hasFreeSkillsAvailable() {
    return this.hasCareerFreeSkillsAvailable() || this.hasSpecializationFreeSkillsAvailable()
  }

  /**
   * Check if actor has this item already
   * @param {string} itemId the Item id.
   * @returns {boolean}   True if actor has already the item
   */
  hasItem(itemId) {
    return this.items.some((i) => i.id === itemId)
  }

  /**
   * Add a Talent item to the actor with XP check and duplicate prevention.
   * @param {Item} item The Talent item to add.
   * @returns {Promise<boolean>} - Whether the talent was added successfully.
   */
  async addTalentWithXpCheck(item) {
    const alreadyOwned = this.items.find((i) => i.name === item.name)
    if (alreadyOwned) {
      ui.notifications.warn(`${this.name} already has "${item.name}"`)
      return false
    }

    const experiencePoints = this.experiencePoints
    const currentXP = experiencePoints.available
    const cost = 5

    if (currentXP - cost < 0) {
      ui.notifications.warn(`${this.name} doesn't have enough XP (${cost} required)`)
      return false
    }

    await this.createEmbeddedDocuments('Item', [item.toObject()])
    await this.spendExperiencePoints(cost)

    return true
  }

  /* -------------------------------------------- */

  /**
   * Update the size of Tokens for this Actor.
   * @returns {Promise<void>}
   */
  async #updateSize() {
    // Prototype token size
    if (this.size !== this.prototypeToken.width) {
      await this.update({ prototypeToken: { width: this.size, height: this.size } })
    }

    // Active token sizes
    if (canvas.scene) {
      const tokens = this.getActiveTokens()
      const updates = []
      for (const token of tokens) {
        if (token.width !== this.size) updates.push({ _id: token.id, width: this.size, height: this.size })
      }
      await canvas.scene.updateEmbeddedDocuments('Token', updates)
    }
  }

  /* -------------------------------------------- */
  /*  Talent Hooks                                */
  /* -------------------------------------------- */

  /**
   * Register a hooked function declared by a Talent item.
   * @param actor
   * @param {SwerpgItem} talent   The Talent registering the hook
   * @param {object} data           Registered hook data
   * @param {string} data.hook        The hook name
   * @param {string} data.fn          The hook function
   * @private
   */
  static #registerActorHook(actor, talent, { hook, fn } = {}) {
    const hookConfig = SYSTEM.ACTOR_HOOKS[hook]
    if (!hookConfig) throw new Error(`Invalid Actor hook name "${hook}" defined by Talent "${talent.id}"`)
    actor.actorHooks[hook] ||= []
    actor.actorHooks[hook].push({ talent, fn: new Function('actor', ...hookConfig.argNames, fn) })
  }

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
