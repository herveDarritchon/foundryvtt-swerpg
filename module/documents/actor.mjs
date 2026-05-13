import { SYSTEM } from '../config/system.mjs'
import CharacteristicFactory from '../lib/characteristics/characteristic-factory.mjs'
import ErrorCharacteristic from '../lib/characteristics/error-characteristic.mjs'
import SkillFactory from '../lib/skills/skill-factory.mjs'
import { logger } from '../utils/logger.mjs'
import { CombatMixin } from './actor-mixins/combat/index.mjs'
import { EquipmentMixin } from './actor-mixins/equipment.mjs'
import { ResourcesMixin } from './actor-mixins/resources.mjs'
import { TalentsMixin } from './actor-mixins/talents.mjs'
import { getCharacterCreationCompendiumPack } from '../utils/foundry/compendium-utils.mjs'

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
export default class SwerpgActor extends TalentsMixin(EquipmentMixin(ResourcesMixin(CombatMixin(Actor)))) {
  constructor(data, context) {
    super(data, context)
    this._cachedResources = {}
  }

  /* -------------------------------------------- */
  /*  Getters                                     */
  /* -------------------------------------------- */

  /**
   * Convenient access to the Actor's species.
   * @type {object}  The species data
   */
  get species() {
    return this.system.details.species
  }

  /**
   * Convenient access to the Actor's experience points.
   * @type {ExperiencePoints}  The experience points data
   */
  get experiencePoints() {
    if (this.type !== SYSTEM.ACTOR_TYPE.character.type) return { gained: 0, spent: 0, startingExperience: 0 }
    return this.system.progression.experience
  }

  /**
   * Update actor's experience points
   * @param {Object} params
   * @param {number} [params.spent] - Experience points spent
   * @param {number} [params.gained] - Experience points gained
   * @param {number} [params.total] - Total experience points
   * @returns {Promise} Foundry update promise
   */
  async updateExperiencePoints({ spent, gained, total } = {}) {
    const updates = {}
    if (spent !== undefined) updates['system.progression.experience.spent'] = spent
    if (gained !== undefined) updates['system.progression.experience.gained'] = gained
    if (total !== undefined) updates['system.progression.experience.total'] = total
    return this.update(updates)
  }

  /**
   * Convenient access to the Actor's abilities.
   * @type {object}  The ability data
   */
  get abilities() {
    return this.system.abilities
  }

  /**
   * Convenient access to the Actor's defenses.
   * @type {object}  The defenses data
   */
  get defenses() {
    return this.system.defenses
  }

  /**
   * Convenient access to the Actor's level.
   * @type {number}  The actor level
   */
  get level() {
    return this.system.advancement?.level ?? 0
  }

  /**
   * Convenient access to the Actor's points (ability, skill, talent).
   * @type {object}  The points data
   */
  get points() {
    return this.system.points
  }

  /**
   * Convenient access to the Actor's resistances.
   * @type {object}  The resistances data
   */
  get resistances() {
    return this.system.resistances
  }

  /**
   * Convenient access to the Actor's skills.
   * @type {object}  The skills data
   */
  get skills() {
    return this.system.skills
  }

  /**
   * Convenient access to the Actor's size.
   * @type {number}  The actor size
   */
  get size() {
    return this.system.details.size || 1
  }

  /**
   * Convenient access to the Actor's status.
   * @type {object}  The status data
   */
  get status() {
    return this.system.status
  }

  /**
   * Check if the actor is level 0.
   * @type {boolean}
   */
  get isL0() {
    return this.level === 0
  }

  /**
   * Check if the actor is knocked out.
   * @type {boolean}
   */
  get isKnockedOut() {
    return this.system?.status?.conditions?.knockedOut || false
  }

  /**
   * Check if the actor is broken.
   * @type {boolean}
   */
  get isBroken() {
    return this.system?.status?.conditions?.broken || false
  }

  /**
   * Check if the actor is dead.
   * @type {boolean}
   */
  get isDead() {
    return this.system?.status?.conditions?.dead
  }

  /**
   * Check if the actor is insane.
   * @type {boolean}
   */
  get isInsane() {
    return this.system?.status?.conditions?.insane
  }

  /**
   * Check if the actor is incapacitated.
   * @type {boolean}
   */
  get isIncapacitated() {
    return this.isKnockedOut || this.isBroken || this.isDead || this.isInsane
  }

  /**
   * Convenient access to the combatant.
   * @type {object|null}  The combatant or null
   */
  get combatant() {
    return this._combatant
  }

  /*  Character Creation Methods                  */

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
    const characteristicEvaluated = await characteristicClass.process()

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

    const isCreation = this.isL0
    const config = SYSTEM.SKILLS[skillId]
    const isCareer = config?.career === true
    const isSpecialization = config?.specialization === true
    const action = delta > 0 ? 'train' : 'forget'

    const skillObj = SkillFactory.build(
      this,
      skillId,
      {
        action,
        isCreation,
        isCareer,
        isSpecialization,
      },
      {},
    )

    const evaluated = await skillObj.process()
    if (evaluated?.options?.message) {
      ui.notifications.warn(evaluated.options.message)
      return
    }

    return evaluated.updateState()
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
   * @param {string} detailsId    The id in the details structure to view, if the type is a collection
   * @param {boolean} [options.editable]    Is the detail item editable?
   * @returns {Promise<void>}
   * @internal
   */
  async _viewDetailItem(type, detailsId, { editable = false } = {}) {
    if (!(detailsId in this.system.details)) {
      throw new Error(`Incorrect detail item type ${detailsId} for Actor type ${this.type}`)
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

    // Browse imported world compendium pack
    if (this.isL0 || !data?.name) {
      const { pack, packConfig, reason, actualDocumentName } = getCharacterCreationCompendiumPack(type)

      if (!pack) {
        if (reason === 'missing') {
          ui.notifications.warn(`Aucun compendium importé trouvé pour "${type}". Lancez l’import OggDude ou vérifiez le pack ${packConfig.fullName}.`)
          return
        }

        if (reason === 'invalid-document-type') {
          ui.notifications.error(`Compendium invalide pour "${type}" : ${packConfig.fullName}. Type attendu : Item, type trouvé : ${actualDocumentName}.`)
          return
        }

        ui.notifications.error(`Impossible d’ouvrir le compendium pour "${type}".`)
        return
      }

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
    // prepareTalents is now in TalentsMixin, called as instance method
    this.prepareTalents(items.talent)
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
    const talentChange = foundry.utils.hasProperty(data, 'system.advancement.level') || 'items' in data
    if (talentChange) {
      const dedicatedTreeApp = game.system.specializationTreeApp
      if (dedicatedTreeApp?.actor === this && typeof dedicatedTreeApp.refresh === 'function') {
        dedicatedTreeApp.refresh()
      } else {
        const legacyTree = game.system.tree
        if (legacyTree?.actor === this) legacyTree.refresh()
      }
    }
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _onCreateDescendantDocuments(...args) {
    super._onCreateDescendantDocuments(...args)
    const dedicatedTreeApp = game.system.specializationTreeApp
    if (dedicatedTreeApp?.actor === this && typeof dedicatedTreeApp.refresh === 'function') {
      dedicatedTreeApp.refresh()
      return
    }

    const legacyTree = game.system.tree
    if (legacyTree?.actor === this) legacyTree.refresh()
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _onDeleteDescendantDocuments(...args) {
    super._onDeleteDescendantDocuments(...args)
    const dedicatedTreeApp = game.system.specializationTreeApp
    if (dedicatedTreeApp?.actor === this && typeof dedicatedTreeApp.refresh === 'function') {
      dedicatedTreeApp.refresh()
      return
    }

    const legacyTree = game.system.tree
    if (legacyTree?.actor === this) legacyTree.refresh()
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
   * Get the free skill ranks for the actor.
   * @returns {FreeSkillRanks} The free skill ranks for the actor.
   */
  get freeSkillRanks() {
    return this.system.progression.freeSkillRanks
  }

  /**
   * Update free skill ranks
   * @param {'career'|'specialization'} type - Type of free skill rank
   * @param {Object} params
   * @param {number} [params.spent] - Ranks spent
   * @param {number} [params.gained] - Ranks gained
   * @returns {Promise} Foundry update promise
   */
  async updateFreeSkillRanks(type, { spent, gained } = {}) {
    const updates = {}
    if (spent !== undefined) updates[`system.progression.freeSkillRanks.${type}.spent`] = spent
    if (gained !== undefined) updates[`system.progression.freeSkillRanks.${type}.gained`] = gained
    return this.update(updates)
  }

  /* -------------------------------------------- */

  /**
   * Check if actor has any career free skill ranks available.
   * @returns {boolean}   True if actor has free skill ranks
   */
  hasCareerFreeSkillsAvailable() {
    const career = this.freeSkillRanks.career
    return career.gained - career.spent !== 0
  }

  /* -------------------------------------------- */

  /**
   * Check if actor has any specialization free skill ranks available.
   * @returns {boolean}   True if actor has free skill ranks
   */
  hasSpecializationFreeSkillsAvailable() {
    const specialization = this.freeSkillRanks.specialization
    return specialization.gained - specialization.spent !== 0
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
}
