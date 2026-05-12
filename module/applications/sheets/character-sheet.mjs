import SwerpgBaseActorSheet from './base-actor-sheet.mjs'
import CharacterAuditLogApp, { canViewAuditLog } from '../character-audit-log.mjs'
import SkillConfig from '../config/skill.mjs'
import SkillFactory from '../../lib/skills/skill-factory.mjs'
import ErrorSkill from '../../lib/skills/error-skill.mjs'
import TalentFactory from '../../lib/talents/talent-factory.mjs'
import ErrorTalent from '../../lib/talents/error-talent.mjs'
import { logger } from '../../utils/logger.mjs'
import { getPositiveDicePoolPreview } from '../../utils/skill-costs.mjs'
import SkillCostCalculator from '../../lib/skills/skill-cost-calculator.mjs'

/**
 * @typedef {Object} DefenseDisplayData
 * Represents the data structure used to render defense on the character sheet.
 *
 * @property {string} extraCss - The type of defense (e.g., "melee", "ranged").
 * @property {string} type - The type of defense, which is typically the same as `extraCss`.
 * @property {string} label - The label for the defense, typically the same as the type.
 * @property {number} value - The current value of the jauge.
 */

/**
 * @typedef {Object} TalentTag
 * Represents a visual tag or label associated with a talent.
 *
 * @property {string} label - The visible label of the tag (e.g., "Active", "Ranked", "Combat").
 * @property {string} [cssClass] - Optional CSS class for styling the tag (e.g., "tag-active", "tag-passive").
 * @property {string} [tooltip] - Optional tooltip text for the tag.
 */

/**
 * @typedef {Object} TalentDisplayData
 * Represents the data structure used to render a talent on the character sheet.
 *
 * @property {string} id - Unique ID of the Talent Item.
 * @property {string} name - Name of the talent.
 * @property {string} img - Image path used for the talent icon.
 * @property {string} [cssClass] - Optional CSS class applied to the container (e.g., "highlighted", "disabled").
 * @property {boolean} isFree - Indicates if the talent is free by any mean.
 * @property {TalentTag[]} tags - List of tags to display under the talent.
 */

/**
 * @typedef {Object} ObligationDisplayData
 * Represents the data structure used to render an Obligation on the character sheet.
 *
 * @property {string} id - Unique ID of the Obligation Item.
 * @property {string} name - Name of the Obligation.
 * @property {string} img - Image path used for the Obligation icon.
 * @property {number} value - A value representing the Obligation.
 * @property {string} [cssClass] - Optional CSS class applied to the container (e.g., "highlighted", "disabled").
 * @property {boolean} isExtra - Indicates if the Obligation is an extra obligation by any mean.
 * @property {number} extraXp - Optional extra experience points associated with the Obligation.
 * @property {number} extraCredits - Optional extra credits associated with the Obligation.
 */

/**
 * @typedef {Object} MotivationDisplayData
 * Represents the data structure used to render a Motivation on the character sheet.
 *
 * @property {string} id - Unique ID of the Motivation Item.
 * @property {string} name - Name of the Motivation.
 * @property {string} img - Image path used for the Motivation icon.
 * @property {string} [cssClass] - Optional CSS class applied to the container (e.g., "highlighted", "disabled").
 */

/**
 * A SwerpgBaseActorSheet subclass used to configure Actors of the "character" type.
 */
export default class CharacterSheet extends SwerpgBaseActorSheet {
  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    position: {
      width: 950,
      height: 'auto',
    },
    window: {
      minimizable: true,
      resizable: true,
    },
    actor: {
      type: 'character',
    },
    actions: {
      editSpecies: CharacterSheet.#onEditSpecies,
      editCareer: CharacterSheet.#onEditCareer,
      editSpecializations: CharacterSheet.#onEditSpecializations,
      openAuditLog: CharacterSheet.#onOpenAuditLog,
      skillBuy: CharacterSheet.#onSkillBuy,
      skillRefund: CharacterSheet.#onSkillRefund,
      skillSelect: CharacterSheet.#onSkillSelect,
      toggleObligationExtraState: CharacterSheet.#onToggleObligationExtraState,
    },
    form: {
      submitOnChange: true,
    },
  }

  static {
    this._initializeActorSheetClass()
  }

  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options)
    const { actor: a, source: s, incomplete: i } = context

    // Expand Context
    Object.assign(context, {
      speciesName: a.system.details.species?.name || game.i18n.localize('SPECIES.SHEET.CHOOSE'),
      careerName: a.system.details.career?.name || game.i18n.localize('CAREER.SHEET.CHOOSE'),
      specializationName: Array.from(a.system.details.specializations)[0]?.name || game.i18n.localize('SPECIALIZATION.SHEET.CHOOSE'),
      talentTreeButtonText: game.system.tree.actor === a ? 'Close Talent Tree' : 'Open Talent Tree',
      experience: a.system.progression?.experience,
      canViewAuditLog: canViewAuditLog(a),
    })

    context.skills = CharacterSheet.#prepareSkills(a)
    // Incomplete Tasks
    context.points = a.system.points

    Object.assign(i, {
      species: !s.system.details.species?.name,
      career: !s.system.details.career?.name,
      specialization: s.system.details.specializations?.length === 0,
      freeSkill: a.hasFreeSkillsAvailable(),
      characteristics: true,
      skills: true,
      talents: true,
    })
    i.creation = i.species || i.career || i.freeSkill || i.specialization || i.characteristics || i.skills || i.talents
    if (i.creation) {
      i.creationTooltip = '<p>Character Creation Incomplete!</p><ol>'
      if (i.species) i.creationTooltip += '<li>Select Species</li>'
      if (i.career) i.creationTooltip += '<li>Select Career</li>'
      if (i.specialization) i.creationTooltip += '<li>Select Specialization</li>'
      if (i.freeSkill) i.creationTooltip += '<li>Use Free Skill</li>'
      if (i.characteristics) i.creationTooltip += '<li>Spend Ability Points</li>'
      if (i.skills) i.creationTooltip += '<li>Spend Skill Points</li>'
      if (i.talents) i.creationTooltip += '<li>Spend Talent Points</li>'
      i.creationTooltip += '</ol>'
    }

    context.talents = this.#buildTalentList()

    context.obligations = this.#buildObligationList()
    context.obligationPoints = this.#computeObligationPoints(context.obligations)

    context.jauges = this.buildJaugeDisplayData(a.system.resources)
    context.soak = this.#buildSoakDisplayData(a.system.characteristics.brawn)
    context.defenses = this.buildDefenseDisplayData()
    context.sidebarHeader = { name: s.name, img: s.img }

    // Debug de préparation du contexte
    logger.debug(`[${this.constructor.name}] Context prepared:`, context)

    return context
  }

  /**
   * Builds the data structure for the jauge display.
   * @param brawn
   * @returns {DefenseDisplayData} Soak display data objects.
   */
  #buildSoakDisplayData(brawn) {
    const type = 'soak'

    return {
      extraCss: type,
      type: type,
      label: type,
      value: brawn.rank.value,
    }
  }

  /* -------------------------------------------- */

  /** @override */
  async close(options) {
    await super.close(options)
    await this.actor.toggleTalentTree(false)
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */

  /* -------------------------------------------- */

  /** @override */
  async _onClickAction(event, target) {
    event.preventDefault()
    event.stopPropagation()
    switch (target.dataset.action) {
      case 'characteristicDecrease':
        return this.actor.purchaseCharacteristic(target.closest('.characteristic-wrapper').dataset.characteristic, 'forget')
      case 'characteristicIncrease':
        return this.actor.purchaseCharacteristic(target.closest('.characteristic-wrapper').dataset.characteristic, 'train')
      case 'resourceDecrease':
        return this.actor.modifyResource(target.closest('.jauge-wrapper').dataset.jaugeType, 'decrease')
      case 'resourceIncrease':
        return this.actor.modifyResource(target.closest('.jauge-wrapper').dataset.jaugeType, 'increase')
      case 'skillConfig':
        const skillConfig = new SkillConfig({
          document: this.actor,
          skillId: target.closest('.skill').dataset.skill,
        })
        await skillConfig.render({ force: true })
        break
      case 'skillRoll':
        return this.actor.rollSkill(target.closest('.skill').dataset.skill, { dialog: true })
      case 'talentTree':
        return this.actor.toggleTalentTree()
      // Case "talentReset":
      //   return this.actor.resetTalents();
    }
  }

  /* -------------------------------------------- */
  /*  Skill Preview Handlers (US3)                */
  /* -------------------------------------------- */

  /** @type {string|null} */
  #_selectedSkillId = null

  /**
   * Mapping purchaseReason → statut console (simplifié)
   * Utilisé par _buildSkillPreview() pour construire la preview
   */
  static #PURCHASE_REASON_MAPPING = {
    FREE_RANK_AVAILABLE: {
      statusKey: 'SKILL.XP_CONSOLE.STATUS.FREE_RANK',
      consoleCssClass: 'is-free',
      getCost: () => '0 XP',
    },
    AFFORDABLE: {
      statusKey: 'SKILL.XP_CONSOLE.STATUS.AFFORDABLE',
      consoleCssClass: 'is-affordable',
      getCost: (nextCost) => `${nextCost} XP`,
    },
    INSUFFICIENT_XP: {
      statusKey: 'SKILL.XP_CONSOLE.STATUS.INSUFFICIENT_XP',
      consoleCssClass: 'is-locked',
      getCost: (nextCost) => `${nextCost} XP`,
    },
    MAX_RANK: {
      statusKey: 'SKILL.XP_CONSOLE.STATUS.MAX_RANK',
      consoleCssClass: 'is-error',
      getCost: () => '—',
    },
  }

  /**
   * Apply a preview object to the XP console DOM.
   * @param {{ statusKey: string, consoleCssClass: string, selectedCost: string, summaryText: string|null }} preview
   */
  #applyConsolePreview(preview) {
    const consoleEl = this.element.querySelector('[data-skill-purchase-console]')
    if (!consoleEl) return

    const statusEl = consoleEl.querySelector('[data-xp-console-status]')
    if (statusEl) statusEl.textContent = game.i18n.localize(preview.statusKey)

    const costEl = consoleEl.querySelector('[data-selected-skill-cost]')
    if (costEl) costEl.textContent = preview.selectedCost

    const summaryEl = consoleEl.querySelector('[data-selected-skill-summary]')
    if (summaryEl) {
      summaryEl.textContent = preview.summaryText ?? game.i18n.localize('SKILL.XP_CONSOLE.PLACEHOLDER')
    }

    const classes = consoleEl.className
      .split(' ')
      .filter((c) => !c.startsWith('is-'))
      .concat(preview.consoleCssClass)
      .filter(Boolean)
      .join(' ')
    consoleEl.className = classes
  }

  /**
   * Update the console to show the preview for a given skill.
   * Reads the enriched skill directly from the data model.
   * @param {string} skillId
   */
  #updateConsolePreview(skillId) {
    const skill = this.actor?.system?.skills?.[skillId]
    if (!skill) return

    const preview = CharacterSheet._buildSkillPreview(skill)
    this.#applyConsolePreview(preview)
  }

  /**
   * Reset the console to its neutral idle state.
   */
  #resetConsolePreview() {
    this.#_selectedSkillId = null
    const preview = CharacterSheet._buildIdlePreview()
    this.#applyConsolePreview(preview)
  }

  /**
   * Handle click to select/deselect a skill row for console preview.
   * ApplicationV2 action triggered via data-action="skillSelect".
   * @this {CharacterSheet}
   * @param {PointerEvent} event
   */
  static async #onSkillSelect(event) {
    const skillEl = event.target.closest('[data-skill-id]')
    if (!skillEl) return
    const skillId = skillEl.dataset.skillId

    if (skillId === this.#_selectedSkillId) {
      this.#resetConsolePreview()
    } else {
      this.#_selectedSkillId = skillId
      this.#updateConsolePreview(skillId)
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle click action to level up.
   * @this {CharacterSheet}
   * @param {PointerEvent} event
   * @returns {Promise<void>}
   */
  static async #onLevelUp(event) {
    game.tooltip.deactivate()
    await this.actor.levelUp(1)
  }

  /* -------------------------------------------- */

  /**
   * Handle click action to toggle the Obligation extra state.
   * @this {CharacterSheet}
   * @param {PointerEvent} event
   * @returns {Promise<void>}
   */
  static async #onToggleObligationExtraState(event) {
    const element = event.target.closest('.obligation')
    const itemId = element.dataset.itemId
    const item = this.actor.items.get(itemId)

    // Debug de toggle obligation
    logger.debug(`[CharacterSheet] Toggling obligation extra state for ${item.name}`)

    await item.update({ 'system.isExtra': !item.system.isExtra })
  }

  /* -------------------------------------------- */

  /* -------------------------------------------- */

  /**
   * Execute a skill transaction (buy or refund a rank).
   * @param {CharacterSheet} app - The sheet instance
   * @param {string} skillId - The skill ID
   * @param {'train'|'forget'} action - Transaction direction
   * @returns {Promise<void>}
   */
  static async #executeSkillTransaction(app, skillId, action) {
    const actor = app.actor
    const skill = actor.system.skills?.[skillId]

    if (!skill) return

    const oldRank = skill.rank.value
    const { isCareer = false, isSpecialization = false } = skill.freeRank ?? {}

    logger.info('[SkillTransaction] creation state', {
      actorName: actor.name,
      actorLevel: actor.level,
      isL0: actor.isL0,
      detailsLevel: actor.system.details?.level,
      advancementLevel: actor.system.advancement?.level,
    })

    const skillTransaction = SkillFactory.build(actor, skillId, {
      action,
      isCreation: actor.isL0,
      isCareer,
      isSpecialization,
    })

    if (!skillTransaction) {
      ui.notifications.warn('Unable to build skill transaction.')
      return
    }

    if (skillTransaction instanceof ErrorSkill) {
      ui.notifications.warn(skillTransaction.options.message)
      return
    }

    const evaluated = await skillTransaction.process()

    if (evaluated instanceof ErrorSkill) {
      ui.notifications.warn(evaluated.options.message)
      return
    }

    const cost = evaluated.getCost(oldRank)

    const updated = await evaluated.updateState()

    if (updated instanceof ErrorSkill) {
      ui.notifications.warn(updated.options.message)
      return
    }

    await CharacterSheet.#refreshConsoleAfterPurchase(app, skillId, action, oldRank, cost)
  }

  static #calculateSkillTransactionCost(skillTransaction, action, oldRank) {
    const calculator = new SkillCostCalculator(skillTransaction)

    if (action === 'train') {
      return calculator.calculateCost(action, oldRank + 1)
    }

    if (action === 'forget') {
      return calculator.calculateCost(action, oldRank - 1)
    }

    return 0
  }

  /**
   * Handle Buy button click — purchase the next skill rank.
   * @this {CharacterSheet}
   * @param {PointerEvent} event
   * @returns {Promise<void>}
   */
  static async #onSkillBuy(event) {
    const skillId = event.target.closest('[data-skill-id]')?.dataset.skillId
    if (!skillId) return
    await CharacterSheet.#executeSkillTransaction(this, skillId, 'train')
  }

  /**
   * Handle Sell button click — refund the last skill rank.
   * @this {CharacterSheet}
   * @param {PointerEvent} event
   * @returns {Promise<void>}
   */
  static async #onSkillRefund(event) {
    const skillId = event.target.closest('[data-skill-id]')?.dataset.skillId
    if (!skillId) return
    await CharacterSheet.#executeSkillTransaction(this, skillId, 'forget')
  }

  /**
   * Refresh the XP console stats and send a feedback chat message after a transaction.
   * @param {CharacterSheet} app - The sheet instance
   * @param {string} skillId - The skill ID
   * @param {'train'|'forget'} action - The action performed
   * @param {number} oldRank - The rank before the transaction
   * @param {number} cost - The XP cost (train) or refund (forget) amount
   */
  static async #refreshConsoleAfterPurchase(app, skillId, action, oldRank, cost) {
    CharacterSheet.#refreshConsoleStats(app)
    app.#resetConsolePreview()

    const skill = app.actor.system.skills?.[skillId]
    if (!skill) return

    const key = action === 'train' ? 'SKILL.XP_CONSOLE.PURCHASE_SUCCESS' : 'SKILL.XP_CONSOLE.REFUND_SUCCESS'

    ui.notifications.info(
      game.i18n.format(key, {
        label: skill.label,
        rank: skill.rank.value,
      }),
    )

    await CharacterSheet.#sendSkillTransactionChat(app, skillId, action, oldRank, cost)
  }

  static #refreshConsoleStats(app) {
    const consoleEl = app.element.querySelector('[data-skill-purchase-console]')
    if (!consoleEl) return

    const progression = app.actor.system.progression
    const exp = progression.experience
    const free = progression.freeSkillRanks

    const availableEl = consoleEl.querySelector('[data-xp-available]')
    if (availableEl) availableEl.textContent = exp.available ?? 0

    const spentEl = consoleEl.querySelector('[data-xp-spent]')
    if (spentEl) spentEl.textContent = exp.spent ?? 0

    const careerEl = consoleEl.querySelector('[data-free-career-skills]')
    if (careerEl) careerEl.textContent = free.career.available ?? 0

    const specEl = consoleEl.querySelector('[data-free-specialization-skills]')
    if (specEl) specEl.textContent = free.specialization.available ?? 0
  }

  /**
   * Send an immersive chat message after a successful skill transaction (US7).
   * Renders the skill-transaction.hbs template with actor portrait, rank change, and cost.
   * @param {CharacterSheet} app - The sheet instance
   * @param {string} skillId - The skill ID
   * @param {'train'|'forget'} action - The action performed
   * @param {number} oldRank - The rank before the transaction
   * @param {number} cost - The XP cost (train) or refund (forget) amount
   */
  static async #sendSkillTransactionChat(app, skillId, action, oldRank, cost) {
    const actor = app.actor
    const skill = actor.system.skills?.[skillId]
    if (!skill) return

    const newRank = skill.rank.value
    const remainingXp = actor.system.progression.experience.available
    const isFree = action === 'train' && cost === 0
    const isRefund = action === 'forget'

    let costLabel
    if (isFree) {
      costLabel = game.i18n.localize('SKILL.CHAT.FREE_COST')
    } else if (isRefund) {
      costLabel = game.i18n.format('SKILL.CHAT.REFUND', { cost })
    } else {
      costLabel = game.i18n.format('SKILL.CHAT.COST', { cost })
    }

    const content = await foundry.applications.handlebars.renderTemplate('systems/swerpg/templates/chat/skill-transaction.hbs', {
      actorImg: actor.img,
      actorName: actor.name,
      skillLabel: skill.label,
      oldRank,
      newRank,
      costLabel,
      remainingLabel: game.i18n.format('SKILL.CHAT.REMAINING', { xp: remainingXp }),
      cssClass: isFree ? 'is-free' : isRefund ? 'is-forget' : 'is-train',
      costCssClass: isFree ? 'is-free' : isRefund ? 'is-refund' : '',
    })

    await ChatMessage.create({
      content,
      speaker: ChatMessage.getSpeaker({ actor }),
      flags: { swerpg: { skillTransaction: true, action, skillId } },
    })
  }

  /* -------------------------------------------- */

  /**
   * Handle click action to choose or edit your Career.
   * @this {CharacterSheet}
   * @param {PointerEvent} event
   * @returns {Promise<void>}
   */
  static async #onEditSpecies(event) {
    await this.actor._viewDetailItem('species', 'species', { editable: false })
  }

  /* -------------------------------------------- */

  /**
   * Handle click action to choose or edit your Career.
   * @this {CharacterSheet}
   * @param {PointerEvent} event
   * @returns {Promise<void>}
   */
  static async #onEditSpecializations(event) {
    await this.actor._viewDetailItem('specialization', 'specializations', { editable: false })
  }

  /* -------------------------------------------- */

  /**
   * Handle click action to choose or edit your Career.
   * @this {CharacterSheet}
   * @param {PointerEvent} event
   * @returns {Promise<void>}
   */
  static async #onEditCareer(event) {
    await this.actor._viewDetailItem('career', 'career', { editable: false })
  }

  /* -------------------------------------------- */

  /**
   * Open the read-only audit log window for the current character.
   * @this {CharacterSheet}
   * @param {PointerEvent} event
   * @returns {Promise<void>}
   */
  static async #onOpenAuditLog(event) {
    event.preventDefault()

    if (!canViewAuditLog(this.actor)) {
      ui.notifications.warn(game.i18n.localize('SWERPG.AUDIT_LOG.NO_PERMISSION'))
      return
    }

    const app = new CharacterAuditLogApp({ document: this.actor })
    await app.render({ force: true })
  }

  /* -------------------------------------------- */

  /*  Drag and Drop                               */

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onDropItem(event, item) {
    if (!this.actor.isOwner) return
    switch (item.type) {
      case 'species':
        await this.actor.system.applySpecies(item)
        return
      case 'career':
        await this.actor.system.applyCareer(item)
        return
      case 'specialization':
        await this.actor.system.applySpecialization(item)
        return
      case 'talent':
        // Build the skill class depending on the context
        const talentClass = TalentFactory.build(
          this.actor,
          item,
          {
            action: 'train',
            isCreation: true,
          },
          {},
        )

        if (talentClass instanceof ErrorTalent) {
          ui.notifications.warn(talentClass.options.message)
          return
        }

        // Debug de toggle talent
        logger.debug(`[${this.constructor.name}] onToggleTrainedTalent - talent '${item.name}' with id '${item.id}'`, {
          isRanked: item.system.isRanked,
          currentRank: item.system.rank,
          actor: this.actor,
        })

        // Evaluate the talent following the action processed
        const talentEvaluated = talentClass.process()

        // Display a warning if the talent action is not valid
        if (talentEvaluated instanceof ErrorTalent) {
          ui.notifications.warn(talentEvaluated.options.message)
          return
        }

        // Update the talent state in the Database
        const talentUpdated = await talentEvaluated.updateState()

        // Display a warning if the talent action is not valid
        if (talentUpdated instanceof ErrorTalent) {
          ui.notifications.warn(talentUpdated.options.message)
          return
        }

        logger.debug(
          `[After] onToggleTrainedTalent talent with id '${talentUpdated.data.id}', is ranked ${talentUpdated.data.system.isRanked} and values:`,
          talentUpdated.actor,
          talentUpdated.data.system.rank,
        )

        return
    }
    return super._onDropItem(event, item)
  }

  /* -------------------------------------------- */

  /**
   * Prepare the skills for the context.
   * Skills are already enriched by the data model — this method adds UI-layer fields only.
   * @param actor
   * @returns {undefined}
   */
  static #prepareSkills(actor) {
    const skills = Object.entries(actor.system.skills)
      .map(([k, v]) => ({
        id: k,
        ...v,
      }))
      .map((skill) => {
        const dicePreviewAfter = getPositiveDicePoolPreview({
          characteristicValue: skill.characteristicValue,
          skillRank: skill.nextRank,
        })
        const markerState =
          skill.freeRank.isCareer && skill.freeRank.isSpecialization
            ? 'both'
            : skill.freeRank.isCareer
              ? 'career'
              : skill.freeRank.isSpecialization
                ? 'specialization'
                : 'none'

        const forgettable = skill.rank.trained > 0 || skill.rank.careerFree > 0 || skill.rank.specializationFree > 0
        const nonRefundable = skill.rank.base > 0

        return {
          pips: this._prepareSkillRanks(skill),
          dicePreviewAfter,
          ...skill,
          ui: {
            markerState,
            increaseState: skill.purchaseReason,
            increaseIcon:
              skill.purchaseReason === 'FREE_RANK_AVAILABLE'
                ? 'free'
                : skill.purchaseReason === 'AFFORDABLE'
                  ? 'buy'
                  : skill.purchaseReason === 'INSUFFICIENT_XP'
                    ? 'buy-blocked'
                    : null,
            decreaseState: forgettable ? 'forgettable' : nonRefundable ? 'non-refundable' : 'pending',
            decreaseIcon: 'sell',
            lineCssClass: [
              skill.freeRank.isCareer ? 'is-career' : '',
              skill.freeRank.isSpecialization ? 'is-specialization' : '',
              skill.purchaseReason === 'FREE_RANK_AVAILABLE' ? 'is-free' : '',
              skill.purchaseReason === 'AFFORDABLE' ? 'is-affordable' : '',
              skill.purchaseReason === 'INSUFFICIENT_XP' ? 'is-blocked' : '',
              skill.purchaseReason === 'MAX_RANK' ? 'is-max' : '',
            ]
              .filter(Boolean)
              .join(' '),
          },
        }
      })

    const skillsByType = skills.reduce((acc, skill) => {
      const type = skill.type.id
      ;(acc[type] ||= []).push(skill)
      return acc
    }, {})

    // Sort and return the skills
    for (const skillGroup of Object.values(skillsByType)) {
      skillGroup.sort((a, b) => a.label.localeCompare(b.label))
    }
    return skillsByType
  }

  /**
   * Prepare the skill Ranks for the context
   * Uses dicePreview to display ability dice (untrained/losange) and proficiency dice (trained/hexagone)
   * @param skill
   * @returns {Array} Array of pip objects with appropriate cssClass
   */
  static _prepareSkillRanks(skill) {
    const abilityDice = skill.dicePreview?.ability ?? 0
    const proficiencyDice = skill.dicePreview?.proficiency ?? 0
    const totalDice = abilityDice + proficiencyDice

    const pips = []

    // Add proficiency dice (trained dice) first - hexagone D12
    for (let i = 0; i < proficiencyDice; i++) {
      pips.push({ cssClass: 'trained' })
    }

    // Add ability dice (normal dice) after - losange vert
    for (let i = 0; i < abilityDice; i++) {
      pips.push({ cssClass: 'untrained' })
    }

    return pips
  }

  async _onRender(context, options) {
    await super._onRender(context, options)

    this.element.addEventListener('mouseover', this.#onHoverAction)
    this.element.addEventListener('mouseout', this.#onHoverOutAction)
    this.element.addEventListener('focusin', this.#onHoverAction)
    this.element.addEventListener('focusout', this.#onHoverOutAction)
  }

  #onHoverAction = async (event) => {
    const target = event.target.closest('[data-hover-action]')
    if (!target || !this.element.contains(target)) return

    const action = target.dataset.hoverAction

    switch (action) {
      case 'skillPreview':
        return this.#handleSkillPreviewEnter(target)

      case 'showTooltip':
        return this.#showTooltip(event, target)

      case 'previewItem':
        return this.#previewItem(event, target)

      default:
        return
    }
  }

  #onHoverOutAction = async (event) => {
    const target = event.target.closest('[data-hover-action]')
    if (!target || !this.element.contains(target)) return

    const action = target.dataset.hoverAction

    switch (action) {
      case 'skillPreview':
        return this.#handleSkillPreviewLeave(target, event)

      case 'showTooltip':
        return this.#hideTooltip(event, target)

      default:
        return
    }
  }

  /**
   * Handle entering a skill row (mouseenter or focusin) to show preview.
   * @param {HTMLElement} target - The skill row element.
   */
  #handleSkillPreviewEnter(target) {
    const skillId = target.dataset.skillId
    if (!skillId) return
    this.#updateConsolePreview(skillId)
  }

  /**
   * Handle leaving a skill row (mouseleave or focusout) to reset preview.
   * Uses relatedTarget to avoid flickering when moving between adjacent skill rows.
   * @param {HTMLElement} target - The skill row element being left.
   * @param {Event} event - The original mouseout/focusout event.
   */
  #handleSkillPreviewLeave(target, event) {
    const related = event.relatedTarget
    if (related) {
      const enteringSkill = related.closest('[data-hover-action="skillPreview"]')
      if (enteringSkill) return
    }
    this.#resetConsolePreview()
  }

  async #previewItem(event, target) {
    console.log('Preview ...', target.dataset)
  }

  async #showTooltip(event, target) {
    console.log('Hover in', target.dataset)
  }

  async #hideTooltip(event, target) {
    console.log('Hover out', target.dataset)
  }

  static async #onRollSomething(event, target) {
    console.log('Click action classique')
  }

  /* -------------------------------------------- */
  /*  Skill Preview Builder (US3)                 */
  /* -------------------------------------------- */

  /**
   * Build the console preview data for a skill being hovered.
   * Reads purchase state directly from the enriched skill.
   * @param {object} skill - Enriched skill data from model
   * @returns {object} Preview data { statusKey, consoleCssClass, selectedCost, summaryText }
   */
  static _buildSkillPreview(skill) {
    const { nextCost, purchaseReason } = skill
    const mapping = this.#PURCHASE_REASON_MAPPING[purchaseReason]

    if (!mapping) {
      return this._buildIdlePreview()
    }

    return {
      statusKey: mapping.statusKey,
      consoleCssClass: mapping.consoleCssClass,
      selectedCost: mapping.getCost(nextCost),
      summaryText: null,
    }
  }

  /**
   * Build the neutral / idle preview state for the console.
   * @returns {object} Preview data with placeholder text and no state class.
   */
  static _buildIdlePreview() {
    return {
      statusKey: 'SKILL.XP_CONSOLE.STATUS.IDLE',
      consoleCssClass: '',
      selectedCost: '—',
      summaryText: null,
    }
  }

  /**
   * Builds the display-ready data for a talent item.
   * @param {Item} item A Foundry VTT Item of type "talent".
   * @returns {TalentDisplayData}
   */
  #buildTalentDisplayData(item) {
    const tags = this.#buildTags(item)

    return {
      id: item.id,
      name: item.name,
      img: item.img,
      isFree: item.system.isFree,
      cssClass: item.system.disabled ? 'disabled' : '',
      tags,
      rank: '-',
    }
  }

  /**
   * Builds the tags for a talent item.
   * @param item {Item} - A Foundry VTT Item of type "talent".
   * @returns {*[]} A list of tags to display under the talent.
   */
  #buildTags(item) {
    const tags = []

    if (item.system.activation === 'active') {
      tags.push({ label: 'Active', cssClass: 'tag-active' })
    } else {
      tags.push({ label: 'Passive', cssClass: 'tag-passive' })
    }

    if (item.system.isRanked) {
      tags.push({ label: 'Ranked' })
    }

    if (item.system.category) {
      tags.push({ label: item.system.category })
    }

    if (item.system.isFree) {
      tags.push({ label: 'Species', cssClass: 'tag-free', tooltip: 'Talent is free thanks to the Species' })
    }
    return tags
  }

  /**
   * Builds a list of talents for the character sheet.
   * @returns {TalentDisplayData[]}
   */
  #buildTalentList() {
    const simpleTalents = this.actor.items.filter((item) => (item.type === 'talent') & !item.system.isRanked)
    const rankedTalents = this.actor.items.filter((item) => item.type === 'talent' && item.system.isRanked)
    const rankedTalentsData = this.#buildAggregateTalentDisplayData(rankedTalents)
    const simpleTalentsData = simpleTalents.map((talent) => this.#buildTalentDisplayData(talent))

    return simpleTalentsData.concat(rankedTalentsData)
  }

  #buildAggregateTalentDisplayData(talents) {
    const groupedByName = talents.reduce((acc, talent) => {
      const key = talent.name
      if (!acc[key]) acc[key] = []
      acc[key].push(talent)
      return acc
    }, {})
    return Object.entries(groupedByName).map(([name, group], index) => {
      // Trouver le talent avec le rank maximal
      const maxRankTalent = group.reduce((a, b) => (a.idx > b.idx ? a : b))

      // Exemple de génération de tags — à adapter à ton système
      const tags = this.#buildTags(maxRankTalent) // ← Ajoute ici une logique si nécessaire

      return {
        id: maxRankTalent.id,
        name: maxRankTalent.name,
        img: maxRankTalent.img,
        isFree: maxRankTalent.system.isFree,
        cssClass: maxRankTalent.system.disabled ? 'disabled' : '',
        tags,
        rank: maxRankTalent.system.rank.idx,
      }
    })
  }

  /**
   * Builds a list of obligations for the character sheet.
   * @returns {ObligationDisplayData[]}
   */
  #buildObligationList() {
    return this.actor.items.filter((item) => item.type === 'obligation').map((obligation) => this.#buildObligationDisplayData(obligation))
  }

  #buildObligationDisplayData(obligation) {
    return {
      id: obligation.id,
      name: obligation.name,
      img: obligation.img,
      cssClass: obligation.system.isExtra ? 'extra' : '',
      value: obligation.system.value,
      isExtra: obligation.system.isExtra,
      extraXp: obligation.system.extraXp || 0,
      extraCredits: obligation.system.extraCredits || 0,
    }
  }

  /**
   * Compute obligation points for the character sheet.
   * @param obligations {MotivationDisplayData[]}
   * @returns {number} The total obligation points.
   */
  #computeObligationPoints(obligations) {
    return obligations.reduce((total, obligation) => total + obligation.value, 0)
  }
}
