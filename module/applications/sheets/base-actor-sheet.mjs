const { api, sheets } = foundry.applications
import JaugeFactory from '../../lib/jauges/jauge-factory.mjs'
import { logger } from '../../utils/logger.mjs'

/**
 * A base ActorSheet built on top of ApplicationV2 and the Handlebars rendering backend.
 */
export default class SwerpgBaseActorSheet extends api.HandlebarsApplicationMixin(sheets.ActorSheetV2) {
  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    classes: ['swerpg', 'actor', 'standard-form'],
    tag: 'form',
    position: {
      width: 900,
      height: 750,
    },
    actions: {
      actionFavorite: SwerpgBaseActorSheet.#onActionFavorite,
      actionEdit: SwerpgBaseActorSheet.#onActionEdit,
      actionUse: SwerpgBaseActorSheet.#onActionUse,
      itemCreate: SwerpgBaseActorSheet.#onItemCreate,
      itemEdit: SwerpgBaseActorSheet.#onItemEdit,
      itemEquip: SwerpgBaseActorSheet.#onItemEquip,
      itemDelete: SwerpgBaseActorSheet.#onItemDelete,
      effectCreate: SwerpgBaseActorSheet.#onEffectCreate,
      effectEdit: SwerpgBaseActorSheet.#onEffectEdit,
      effectDelete: SwerpgBaseActorSheet.#onEffectDelete,
      effectToggle: SwerpgBaseActorSheet.#onEffectToggle,
      editImage: SwerpgBaseActorSheet.#onEditImage, // TODO remove in v13
    },
    form: {
      submitOnChange: true,
    },
    actor: {
      type: undefined, // Defined by subclass
    },
  }

  /** @override */
  static PARTS = {
    sidebar: {
      id: 'sidebar',
      template: 'systems/swerpg/templates/sheets/actor/sidebar.hbs',
    },
    tabs: {
      id: 'tabs',
      template: 'systems/swerpg/templates/sheets/actor/tabs.hbs',
    },
    body: {
      id: 'body',
      template: 'systems/swerpg/templates/sheets/actor/body.hbs',
    },
    header: {
      id: 'header',
      template: undefined, // Defined during _initializeActorSheetClass
    },
    attributes: {
      id: 'attributes',
      template: undefined, // Defined during _initializeActorSheetClass
    },
    actions: {
      id: 'actions',
      template: 'systems/swerpg/templates/sheets/actor/actions.hbs',
    },
    inventory: {
      id: 'inventory',
      template: 'systems/swerpg/templates/sheets/actor/inventory.hbs',
    },
    skills: {
      id: 'skills',
      template: 'systems/swerpg/templates/sheets/actor/skills.hbs',
    },
    talents: {
      id: 'talents',
      template: 'systems/swerpg/templates/sheets/actor/talents.hbs',
    },
    spells: {
      id: 'spells',
      template: 'systems/swerpg/templates/sheets/actor/spells.hbs',
    },
    effects: {
      id: 'effects',
      template: 'systems/swerpg/templates/sheets/actor/effects.hbs',
    },
    biography: {
      id: 'biography',
      template: undefined, // Defined during _initializeActorSheetClass
    },
    commitments: {
      id: 'commitments',
      template: undefined, // Defined during _initializeActorSheetClass
    },
  }

  /**
   * Define the structure of tabs used by this Item Sheet.
   * @type {Record<string, Record<string, ApplicationTab>>}
   */
  static TABS = {
    sheet: [
      { id: 'attributes', group: 'sheet', label: 'ACTOR.TABS.ATTRIBUTES' },
      { id: 'actions', group: 'sheet', label: 'ACTOR.TABS.ACTIONS' },
      { id: 'inventory', group: 'sheet', label: 'ACTOR.TABS.INVENTORY' },
      { id: 'skills', group: 'sheet', label: 'ACTOR.TABS.SKILLS' },
      { id: 'talents', group: 'sheet', label: 'ACTOR.TABS.TALENTS' },
      { id: 'spells', group: 'sheet', label: 'ACTOR.TABS.SPELLS' },
      { id: 'effects', group: 'sheet', label: 'ACTOR.TABS.EFFECTS' },
      { id: 'biography', group: 'sheet', label: 'ACTOR.TABS.BIOGRAPHY' },
      { id: 'commitments', group: 'sheet', label: 'ACTOR.TABS.COMMITMENTS' },
    ],
  }

  /** @override */
  tabGroups = {
    sheet: 'attributes',
  }

  /* -------------------------------------------- */

  /**
   * A method which can be called by subclasses in a static initialization block to refine configuration options at the
   * class level.
   */
  static _initializeActorSheetClass() {
    const actor = this.DEFAULT_OPTIONS.actor
    this.PARTS = foundry.utils.deepClone(this.PARTS)
    // Debug d'initialisation de la classe d'acteur
    logger.debug('[base-actor-sheet] initializeActorSheetClass with type', actor.type)
    this.PARTS.header.template = `systems/swerpg/templates/sheets/actor/${actor.type}-header.hbs`
    this.PARTS.attributes.template = `systems/swerpg/templates/sheets/actor/${actor.type}-attributes.hbs`
    this.PARTS.biography.template = `systems/swerpg/templates/sheets/actor/${actor.type}-biography.hbs`
    this.PARTS.commitments.template = `systems/swerpg/templates/sheets/actor/${actor.type}-commitments.hbs`
    this.TABS = foundry.utils.deepClone(this.TABS)
    // Actor Type Configuration - Merge with base classes instead of replacing
    const baseClasses = this.DEFAULT_OPTIONS.classes || ['swerpg', 'actor', 'standard-form']
    const actorTypeClass = actor.type
    // Ensure we don't duplicate classes and always include the actor type
    this.DEFAULT_OPTIONS.classes = [...new Set([...baseClasses, 'sheet', 'actor', actorTypeClass])]
  }

  /* -------------------------------------------- */
  /*  Sheet Rendering                             */

  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const tabGroups = this.#getTabs()
    const { inventory, talents, iconicSpells } = this.#prepareItems()
    const { sections: actions, favorites: favoriteActions } = this.#prepareActions()
    return {
      // ✅ Standard minimum OBLIGATOIRE selon le plan Phase 2.2
      document: this.document,
      system: this.document.system,
      config: game.system.config,
      isOwner: this.document.isOwner,
      // Propriétés existantes conservées pour compatibilité
      characteristicScores: this.#prepareCharacteristics(),
      progression: this.#prepareProgression(),
      actions: actions ?? [],
      actor: this.document,
      biography: await this.#prepareBiography(),
      commitments: await this.#prepareCommitments(),
      canPurchaseTalents: true,
      canPurchaseSkills: true,
      defenses: this.#prepareDefenses(),
      effects: this.#prepareActiveEffects(),
      favoriteActions,
      featuredEquipment: this.#prepareFeaturedEquipment(),
      fieldDisabled: this.isEditable ? '' : 'disabled',
      fields: this.document.system.schema.fields,
      incomplete: {},
      inventory,
      isEditable: this.isEditable,
      resistances: this.#prepareResistances(),
      // Resources: this.#prepareResources(),
      skillCategories: this.#prepareSkills(),
      source: this.document.toObject(),
      spells: this.#prepareSpells(iconicSpells),
      tabGroups,
      tabs: tabGroups.sheet,
      talents,
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _attachFrameListeners() {
    super._attachFrameListeners()
    this.element.addEventListener('focusin', this.#onFocusIn.bind(this))
  }

  /* -------------------------------------------- */

  /**
   * Configure the tabs used by this sheet.
   * @returns {Record<string, Record<string, ApplicationTab>>}
   */
  #getTabs() {
    const tabs = {}
    for (const [groupId, config] of Object.entries(this.constructor.TABS)) {
      const group = {}
      for (const t of config) {
        const active = this.tabGroups[t.group] === t.id
        const icon = `systems/swerpg/ui/tabs/${t.id}.webp`
        group[t.id] = { active, cssClass: active ? 'active' : '', icon, ...t }
      }
      tabs[groupId] = group
    }
    return tabs
  }

  /* -------------------------------------------- */

  /**
   * Prepare formatted ability scores for display on the Actor sheet.
   * @returns {object[]}
   */
  #prepareCharacteristics() {
    const c = this.actor.system.characteristics
    const characteristics = Object.values(SYSTEM.CHARACTERISTICS).map((cfg) => {
      const characteristic = foundry.utils.deepClone(cfg)
      let currentCharac = c[characteristic.id]
      characteristic.rank = {}
      characteristic.rank.base = currentCharac.rank.base
      characteristic.rank.trained = currentCharac.rank.trained
      characteristic.rank.value = currentCharac.rank.base + currentCharac.rank.trained
      characteristic.canIncrease = this.actor.canPurchaseCharacteristic(characteristic.id, 1)
      characteristic.canDecrease = this.actor.canPurchaseCharacteristic(characteristic.id, -1)
      return characteristic
    })
    characteristics.sort((a, b) => a.sheetOrder - b.sheetOrder)
    // ✅ Debug conditionnel uniquement si nécessaire
    logger.debug('[base-actor-sheet] prepareCharacteristics', characteristics)
    return characteristics
  }

  /**
   * Prepare formatted experience scores for display on the Actor sheet.
   * @returns {object[]}
   */
  #prepareProgression() {
    const progression = {}
    progression.experience = this.#prepareExperience()
    progression.freeSkillRanks = this.#prepareFreeSkillRanks()
    return progression
  }

  /**
   * Prepare formatted experience scores for display on the Actor sheet.
   * @returns {object[]}
   */
  #prepareExperience() {
    return this.actor.system.progression.experience
  }

  /**
   * Prepare formatted experience scores for display on the Actor sheet.
   * @returns {object[]}
   */
  #prepareFreeSkillRanks() {
    const freeSkillRanks = {}

    let c = this.actor.system.progression.freeSkillRanks.career
    const freeSkillRanksCareer = foundry.utils.deepClone(c)
    freeSkillRanksCareer.available = freeSkillRanksCareer.gained - c.spent
    freeSkillRanks.career = freeSkillRanksCareer

    let s = this.actor.system.progression.freeSkillRanks.specialization
    const freeSkillRanksSpecialization = foundry.utils.deepClone(s)
    freeSkillRanksSpecialization.available = freeSkillRanksSpecialization.gained - s.spent
    freeSkillRanks.specialization = freeSkillRanksSpecialization

    return freeSkillRanks
  }

  /* -------------------------------------------- */

  /**
   * Prepare enriched biography HTML for the actor.
   * @returns {Promise<{private: string, public: string}>}
   */
  async #prepareBiography() {
    const biography = this.document.system.details.biography
    const context = { relativeTo: this.document, secrets: this.document.isOwner }
    return {
      appearance: await foundry.applications.ux.TextEditor.enrichHTML(biography.appearance, context),
      public: await foundry.applications.ux.TextEditor.enrichHTML(biography.public, context),
      private: await foundry.applications.ux.TextEditor.enrichHTML(biography.private, context),
    }
  }

  /* -------------------------------------------- */

  /**
   * Prepare enriched commitments HTML for the actor.
   * @returns {Promise<{private: string, public: string}>}
   */
  async #prepareCommitments() {
    const commitments = this.document.system.details.commitments
    const context = { relativeTo: this.document, secrets: this.document.isOwner }
    return {
      motivation: await foundry.applications.ux.TextEditor.enrichHTML(commitments.motivation, context),
    }
  }

  /* -------------------------------------------- */

  /**
   * Prepare and structure data used to render defenses.
   * @returns {Record<string, object>}
   */
  #prepareDefenses() {
    return {}
  }

  /* -------------------------------------------- */

  /**
   * Prepare the items of equipment which are showcased at the top of the sidebar.
   * @returns {{name: string, img: string, tags: string[]}[]}
   */
  #prepareFeaturedEquipment() {
    return {}
  }

  /* -------------------------------------------- */

  /**
   * Prepare rendering data for items owned by the Actor.
   */
  #prepareItems() {
    const sections = {
      talents: {
        signature: { label: 'Signature Talents', items: [] },
        active: { label: 'Active Abilities', items: [] },
        passive: { label: 'Passive Talents', items: [] },
        spell: { label: 'Spellcraft Talents', items: [] },
      },
      inventory: {
        equipment: { label: 'Equipment', items: [], empty: game.i18n.localize('ACTOR.LABELS.EQUIPMENT_HINT') },
        backpack: { label: 'Backpack', items: [], empty: game.i18n.localize('ACTOR.LABELS.BACKPACK_HINT') },
      },
      iconicSpells: { label: game.i18n.localize('SPELL.IconicPl'), items: [] },
    }

    // Iterate over items and organize them
    for (let i of this.document.items) {
      const d = { id: i.id, name: i.name, img: i.img, tags: i.getTags() }
      let section
      switch (i.type) {
        case 'armor':
        case 'weapon':
          Object.assign(d, {
            quantity: i.system.quantity,
            showStack: i.system?.quantity && i.system.quantity !== 1,
            cssClass: i.system.equipped ? 'equipped' : 'unequipped',
          })
          if (i.system.equipped) section = sections.inventory.equipment
          else section = sections.inventory.backpack
          break
        case 'talent':
          d.tier = i.system.node?.tier || 0
          const action = i.actions.at(0)
          const spellComp = i.system.rune || i.system.gesture || i.system.inflection
          if (i.system.isSignature) section = sections.talents.signature
          if (action) {
            const tags = action.getTags()
            d.tags = { ...tags.action, ...tags.activation }
            section ||= sections.talents.active
          } else if (spellComp) section ||= sections.talents.spell
          else section ||= sections.talents.passive
          break
        case 'spell':
          d.isItem = true
          section = sections.iconicSpells
          break
      }
      if (section) section.items.push(d)
    }

    // Sort inventory
    for (const heading of Object.values(sections.inventory)) {
      heading.items.sort((a, b) => a.name.localeCompare(b.name))
    }

    // Sort talents
    for (const [id, heading] of Object.entries(sections.talents)) {
      if (!heading.items.length) delete sections.talents[id]
      heading.items.sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name))
    }
    return sections
  }

  /* -------------------------------------------- */

  /**
   * Prepare data for the set of actions that are displayed on the Available Actions portion of the sheet.
   * @returns {{sections: Record<string, {label: string, actions: object[]}>, favorites: object[]}}
   */
  #prepareActions() {
    const sections = {
      attack: { label: 'Attack Actions', actions: [] },
      spell: { label: 'Spellcraft Actions', actions: [] },
      reaction: { label: 'Reactions', actions: [] },
      movement: { label: 'Movement Actions', actions: [] },
      general: { label: 'General Actions', actions: [] },
    }
    const combatant = game.combat?.getCombatantByActor(this.actor)
    const favorites = []

    // Iterate over all Actions
    for (const action of Object.values(this.actor?.actions ?? [])) {
      const a = {
        id: action.id,
        name: action.name,
        img: action.img,
        tags: action.getTags().activation,
        canEdit: !!action.parent,
        favorite: action.isFavorite ? { icon: 'fa-solid fa-star', tooltip: 'Remove Favorite' } : { icon: 'fa-regular fa-star', tooltip: 'Add Favorite' },
      }

      // Classify actions
      let section = 'general'
      const tagMapping = {
        reaction: 'reaction',
        spell: 'spell',
        iconicSpell: 'spell',
        movement: 'movement',
        melee: 'attack',
        ranged: 'attack',
      }
      for (const [tag, sectionId] of Object.entries(tagMapping)) {
        if (action.tags.has(tag)) {
          section = sectionId
          break
        }
      }
      sections[section].actions.push(a)

      // Favorite actions which are able to be currently used
      if (action.isFavorite && action._displayOnSheet(combatant)) favorites.push(a)
    }

    // Sort each section
    for (const [k, section] of Object.entries(sections)) {
      if (!section.actions.length) delete sections[k]
      else section.actions.sort((a, b) => a.name.localeCompare(b.name))
    }
    favorites.sort((a, b) => a.name.localeCompare(b.name))
    return { sections, favorites }
  }

  /* -------------------------------------------- */

  /**
   * Format ActiveEffect data required for rendering the sheet
   * @returns {Record<string, {label: string, effects: object[]}>}
   */
  #prepareActiveEffects() {
    const sections = {
      temporary: { label: 'Temporary Effects', effects: [] },
      persistent: { label: 'Persistent Effects', effects: [] },
      disabled: { label: 'Disabled Effects', effects: [] },
    }

    // Categorize and prepare effects
    for (const effect of this.actor.effects) {
      const { startRound, rounds, turns } = effect.duration
      const elapsed = game.combat ? game.combat.round - startRound : 0
      const tags = {}
      let section = 'persistent'
      let t

      // Turn-based duration
      if (Number.isFinite(turns)) {
        section = 'temporary'
        const remaining = turns - elapsed
        t = remaining
        tags.duration = `${remaining} ${remaining === 1 ? 'Turn' : 'Turns'}`
      }

      // Round-based duration
      else if (Number.isFinite(rounds)) {
        section = 'temporary'
        const remaining = rounds - elapsed + 1
        t = 1000000 * remaining
        tags.duration = `${remaining} ${remaining === 1 ? 'Round' : 'Rounds'}`
      }

      // Persistent
      else {
        t = Infinity
        tags.duration = '∞'
      }

      // Disabled Effects
      if (effect.disabled) section = 'disabled'

      // Add effect to section
      const e = {
        id: effect.id,
        icon: effect.icon,
        name: effect.name,
        tags: tags,
        disabled: effect.disabled ? { icon: 'fa-solid fa-toggle-off', tooltip: 'Enable Effect' } : { icon: 'fa-solid fa-toggle-on', tooltip: 'Disable Effect' },
        t,
      }
      sections[section].effects.push(e)
    }

    // Sort
    for (const [k, section] of Object.entries(sections)) {
      if (!section.effects.length) delete sections[k]
      else section.effects.sort((a, b) => a.t - b.t || a.name.localeCompare(b.name))
    }
    return sections
  }

  /* -------------------------------------------- */

  /**
   * Format categories of the spells tab.
   * @param {{label: string, items: SwerpgItem[]}} iconicSpells
   * @returns {{
   *  runes: {label: string, known: Set<SwerpgRune>},
   *  inflections: {label: string, known: Set<SwerpgInflection>},
   *  gestures: {label: string, known: Set<SwerpgGesture>}
   * }}
   */
  #prepareSpells(iconicSpells) {
    return {}
  }

  /* -------------------------------------------- */

  /**
   * Prepare and format resistance data for rendering.
   * @returns {{physical: object[], elemental: object[], spiritual: object[]}}
   */
  #prepareResistances() {
    return {}
  }

  /* -------------------------------------------- */

  /**
   * Prepare and format the display of resource attributes on the actor sheet.
   * @returns {Record<string, {id: string, current: number, max: number, pct: number, color: {bg: string, fill: string}}>}
   */
  #prepareResources() {
    const resources = this.document.system.resources
    const woundCurrent = resources.wounds.value
    const woundMax = resources.wounds.threshold

    const strainCurrent = resources.strain.value
    const strainMax = resources.strain.threshold

    const encCurrent = resources.encumbrance.value
    const encMax = resources.encumbrance.threshold

    const makeResource = (id, current, max, bg, fill) => ({
      id,
      current,
      max,
      pct: max > 0 ? current / max : 0,
      color: { bg, fill },
    })

    return {
      wounds: makeResource('wounds', woundCurrent, woundMax, '#440000', '#ff0000'),
      strain: makeResource('strain', strainCurrent, strainMax, '#004400', '#00ff00'),
      encumbrance: makeResource('encumbrance', encCurrent, encMax, '#444400', '#ffff00'),
    }
  }

  /* -------------------------------------------- */

  /**
   * Organize skills by category in alphabetical order.
   * @returns {Record<string, {
   *   label: string,
   *   defaultIcon: string,
   *   color: Color,
   *   abilityAbbrs: [string, string],
   *   pips: [string, string, string, string, string],
   *   css: string,
   *   canIncrease: boolean,
   *   canDecrease: boolean,
   *   rankName: string,
   *   pathName: string,
   *   tooltips: {value: string, passive: string},
   * }>}
   */
  #prepareSkills() {
    return {}
  }

  /* -------------------------------------------- */
  /*  Data Display Helper Methods                 */

  /* -------------------------------------------- */

  /**
   * Builds the data structure for the jauge display.
   * @param {Object} resources The actor's resources (wounds, strain, encumbrance)
   * @returns {Array} An array of jauge display data objects.
   */
  buildJaugeDisplayData(resources) {
    const types = ['wounds', 'strain', 'encumbrance']

    const jauges = types.map((type) => {
      const resource = resources[type]
      const { value, threshold } = resource
      return JaugeFactory.build(type, value, threshold).create()
    })

    // ✅ Debug conditionnel uniquement si nécessaire
    logger.debug(`[${this.constructor.name}] Jauges built:`, jauges)

    return jauges
  }

  /**
   * Builds the data structure for the defense display.
   * @returns {Array} An array of defense display data objects.
   */
  buildDefenseDisplayData() {
    const types = ['melee', 'ranged']

    return types.map((type) => {
      return {
        extraCss: type,
        type: type,
        label: type,
        value: 0,
      }
    })
  }

  /**
   * Builds a filtered list of items by type for display.
   * @param {string} itemType The type of items to filter (e.g., 'motivation', 'talent', 'skill')
   * @param {Function} [mapFunction] Optional mapping function to transform each item
   * @returns {Array} An array of items of the specified type
   */
  buildItemListByType(itemType, mapFunction = null) {
    const items = this.actor.items.filter((item) => item.type === itemType)

    if (mapFunction && typeof mapFunction === 'function') {
      return items.map(mapFunction)
    }

    return items.map((item) => ({
      id: item.id,
      name: item.name,
      img: item.img,
      cssClass: item.system?.isExtra ? 'extra' : '',
    }))
  }

  /* -------------------------------------------- */
  /*  Performance Optimization                    */

  /* -------------------------------------------- */

  /**
   * A Map to store debounce timers for input fields.
   * @type {Map<string, number>}
   */
  static #debounceTimers = new Map()

  /**
   * Debounces form changes for numeric inputs to improve performance.
   * @param {Event} event The input event
   * @param {number} delay Delay in milliseconds (default: 300ms)
   */
  #debounceFormChange(event, delay = 300) {
    const fieldName = event.target.name
    if (!fieldName) return

    // Clear existing timer for this field
    const existingTimer = SwerpgBaseActorSheet.#debounceTimers.get(fieldName)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // Set new timer
    const timer = setTimeout(() => {
      this._onChangeForm(this.options.form, event)
      SwerpgBaseActorSheet.#debounceTimers.delete(fieldName)
    }, delay)

    SwerpgBaseActorSheet.#debounceTimers.set(fieldName, timer)
  }

  /* -------------------------------------------- */
  /*  Action Event Handlers                       */

  /* -------------------------------------------- */

  /**
   * Select input text when the element is focused.
   * @param {FocusEvent} event
   */
  #onFocusIn(event) {
    if (event.target.tagName === 'INPUT' && event.target.type === 'number') {
      event.target.type = 'text'
      event.target.classList.add('number-input')
      event.target.select()
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onChangeForm(formConfig, event) {
    // Support relative input for number fields
    if (event.target.name && event.target.classList.contains('number-input')) {
      if (['+', '-'].includes(event.target.value[0])) {
        const v0 = foundry.utils.getProperty(this.document, event.target.name)
        const delta = Number(event.target.value)
        event.target.type = 'number'
        event.target.valueAsNumber = v0 + delta
      } else if (event.target.value[0] === '=') {
        const value = Number(event.target.value.slice(1))
        event.target.type = 'number'
        event.target.valueAsNumber = value
      }
    }

    // Apply debouncing for numeric inputs to improve performance
    if (event.target.type === 'number' && event.type === 'input') {
      this.#debounceFormChange(event)
      return
    }

    super._onChangeForm(formConfig, event)
  }

  /* -------------------------------------------- */

  /**
   * @this {SwerpgBaseActorSheet}
   * @param {PointerEvent} event
   * @returns {Promise<void>}
   */
  static async #onActionEdit(event) {
    const actionId = event.target.closest('.action').dataset.actionId
    const action = this.actor.actions[actionId]
    if (!action.parent) return
    await action.sheet.render({ force: true })
  }

  /* -------------------------------------------- */

  /**
   * @this {SwerpgBaseActorSheet}
   * @param {PointerEvent} event
   * @returns {Promise<void>}
   */
  static async #onActionFavorite(event) {
    const actionId = event.target.closest('.action').dataset.actionId
    const favorites = this.actor.system.favorites.filter((id) => id in this.actor.actions)
    if (favorites.has(actionId)) favorites.delete(actionId)
    else favorites.add(actionId)
    await this.actor.update({ 'system.favorites': favorites })
  }

  /* -------------------------------------------- */

  /**
   * @this {SwerpgBaseActorSheet}
   * @param {PointerEvent} event
   * @returns {Promise<void>}
   */
  static async #onActionUse(event) {
    const actionId = event.target.closest('.action').dataset.actionId
    await this.actor.useAction(actionId)
  }

  /* -------------------------------------------- */

  /**
   * @this {SwerpgBaseActorSheet}
   * @param {PointerEvent} event
   * @returns {Promise<void>}
   */
  static async #onItemCreate(event) {
    const cls = getDocumentClass('Item')
    await cls.createDialog({ type: 'weapon' }, { parent: this.document, pack: this.document.pack })
  }

  /* -------------------------------------------- */

  /**
   * Gère la suppression d'un item avec confirmation.
   * @param {PointerEvent} event
   */
  static async #onItemDelete(event) {
    const item = this.#getEventItem(event)
    const deleteAction = this.#getEventItemDeleteAction(event)

    await item.deleteDialog?.({
      yes: {
        callback: () => deleteAction(), // ✅ Appelle la bonne méthode
      },
    })
  }

  /* -------------------------------------------- */

  /**
   * @this {SwerpgBaseActorSheet}
   * @param {PointerEvent} event
   * @returns {Promise<void>}
   */
  static async #onItemEdit(event) {
    const item = this.#getEventItem(event)
    await item.sheet.render({ force: true })
  }

  /* -------------------------------------------- */

  /**
   * @this {SwerpgBaseActorSheet}
   * @param {PointerEvent} event
   * @returns {Promise<void>}
   */
  static async #onItemEquip(event) {
    const item = this.#getEventItem(event)
    switch (item.type) {
      case 'armor':
        try {
          await this.actor.equipArmor(item.id, { equipped: !item.system.equipped })
        } catch (err) {
          ui.notifications.warn(err.message)
        }
        break
      case 'weapon':
        try {
          await this.actor.equipWeapon(item.id, { equipped: !item.system.equipped })
        } catch (err) {
          ui.notifications.warn(err.message)
        }
        break
    }
  }

  /* -------------------------------------------- */

  /**
   * Get the Item document associated with an action event.
   * @param {PointerEvent} event
   * @returns {SwerpgItem}
   */
  #getEventItem(event) {
    const itemId = event.target.closest('.line-item')?.dataset.itemId
    return this.actor.items.get(itemId, { strict: true })
  }

  /* -------------------------------------------- */

  /**
   * Retourne la fonction de suppression à exécuter en fonction du dataset.
   * @param {PointerEvent} event
   * @returns {function(): Promise<void>}
   */
  #getEventItemDeleteAction(event) {
    const item = this.#getEventItem(event)
    const target = event.target.closest('.line-item')
    const actionName = target?.dataset.deleteAction
    const itemType = target?.dataset.itemType

    const isTalent = itemType === item.type
    const action = item[actionName]

    if (isTalent && actionName && typeof action === 'function') {
      return () => action.call(item)
    }

    // Fallback : appel par défaut
    return () => item.delete?.() // Ou toute méthode alternative si delete() n'existe pas
  }

  /* -------------------------------------------- */

  /**
   * @this {SwerpgBaseActorSheet}
   * @param {PointerEvent} event
   * @returns {Promise<void>}
   */
  static async #onEffectCreate(event) {
    const cls = getDocumentClass('ActiveEffect')
    await cls.createDialog({}, { parent: this.document, pack: this.document.pack })
  }

  /* -------------------------------------------- */

  /**
   * @this {SwerpgBaseActorSheet}
   * @param {PointerEvent} event
   * @returns {Promise<void>}
   */
  static async #onEffectDelete(event) {
    const effect = this.#getEventEffect(event)
    await effect.deleteDialog()
  }

  /* -------------------------------------------- */

  /**
   * @this {SwerpgBaseActorSheet}
   * @param {PointerEvent} event
   * @returns {Promise<void>}
   */
  static async #onEffectEdit(event) {
    const effect = this.#getEventEffect(event)
    await effect.sheet.render({ force: true })
  }

  /* -------------------------------------------- */

  /**
   * @this {SwerpgBaseActorSheet}
   * @param {PointerEvent} event
   * @returns {Promise<void>}
   */
  static async #onEffectToggle(event) {
    const effect = this.#getEventEffect(event)
    await effect.update({ disabled: !effect.disabled })
  }

  /* -------------------------------------------- */

  /**
   * Get the ActiveEffect document associated with an action event.
   * @param {PointerEvent} event
   * @returns {ActiveEffect}
   */
  #getEventEffect(event) {
    const effectId = event.target.closest('.effect')?.dataset.effectId
    return this.actor.effects.get(effectId, { strict: true })
  }

  /* -------------------------------------------- */

  /**
   * Edit the Actor profile image.
   * TODO: Remove this in V13
   * @this {SwerpgBaseItemSheet}
   * @param {PointerEvent} event
   * @returns {Promise<void>}
   */
  static async #onEditImage(event) {
    const attr = event.target.dataset.edit
    const current = foundry.utils.getProperty(this.document, attr)
    const fp = new FilePicker({
      current,
      type: 'image',
      callback: (path) => {
        event.target.src = path
        if (this.options.form.submitOnChange) {
          const submit = new Event('submit')
          this.element.dispatchEvent(submit)
        }
      },
      top: this.position.top + 40,
      left: this.position.left + 10,
    })
    await fp.browse()
  }

  /* -------------------------------------------- */
  /*  Drag and Drop                               */

  /*  TODO: Remove this entire section once V13
    /*  TODO: Keep the Action -> macro part of _onDragStart
    /* -------------------------------------------- */

  /** @override */
  _onRender(_context, _options) {
    new foundry.applications.ux.DragDrop({
      dragSelector: '.draggable',
      dropSelector: null,
      callbacks: {
        dragstart: this._onDragStart.bind(this),
        dragover: this._onDragOver.bind(this),
        drop: this._onDrop.bind(this),
      },
    }).bind(this.element)
  }

  /**
   * An event that occurs when a drag workflow begins for a draggable item on the sheet.
   * @param {DragEvent} event       The initiating drag start event
   * @returns {Promise<void>}
   * @protected
   */
  async _onDragStart(event) {
    const li = event.currentTarget
    if ('link' in event.target.dataset) return
    let dragData

    // Owned Items
    if (li.dataset.itemId) {
      const item = this.actor.items.get(li.dataset.itemId)
      dragData = item.toDragData()
    }

    // Active Effect
    if (li.dataset.effectId) {
      const effect = this.actor.effects.get(li.dataset.effectId)
      dragData = effect.toDragData()
    }

    // Action
    if (li.classList.contains('action-drag')) {
      const actionId = li.closest('.action').dataset.actionId
      const action = this.actor.actions[actionId]
      if (!action) return
      dragData = {
        type: 'swerpg.action',
        macroData: {
          type: 'script',
          scope: 'actor',
          name: action.name,
          img: action.img,
          command: `game.system.api.documents.SwerpgActor.macroAction(actor, "${actionId}");`,
        },
      }
    }

    // Set data transfer
    if (!dragData) return
    event.dataTransfer.setData('text/plain', JSON.stringify(dragData))
  }

  /* -------------------------------------------- */

  /**
   * An event that occurs when a drag workflow moves over a drop target.
   * @param {DragEvent} event
   * @protected
   */
  _onDragOver(event) {}

  /* -------------------------------------------- */

  /**
   * Handle a dropped document on the ActorSheet
   * @param {DragEvent} event         The initiating drop event
   * @param {Document} document       The resolved Document class
   * @returns {Promise<void>}
   * @protected
   */
  async _onDropDocument(event, document) {
    switch (document.documentName) {
      case 'ActiveEffect':
        return this._onDropActiveEffect(event, /** @type ActiveEffect */ document)
      case 'Actor':
        return this._onDropActor(event, /** @type Actor */ document)
      case 'Item':
        return this._onDropItem(event, /** @type Item */ document)
      case 'Folder':
        return this._onDropFolder(event, /** @type Folder */ document)
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle a dropped Active Effect on the Actor Sheet.
   * The default implementation creates an Active Effect embedded document on the Actor.
   * @param {DragEvent} event       The initiating drop event
   * @param {ActiveEffect} effect   The dropped ActiveEffect document
   * @returns {Promise<void>}
   * @protected
   */
  async _onDropActiveEffect(event, effect) {
    if (!this.actor.isOwner) return
    if (!effect || effect.target === this.actor) return
    const keepId = !this.actor.effects.has(item.id)
    await ActiveEffect.create(effect.toObject(), { parent: this.actor, keepId })
  }

  /* -------------------------------------------- */

  /**
   * Handle a dropped Actor on the Actor Sheet.
   * @param {DragEvent} event     The initiating drop event
   * @param {Actor} actor         The dropped Actor document
   * @returns {Promise<void>}
   * @protected
   */
  async _onDropActor(event, actor) {}

  /* -------------------------------------------- */

  /**
   * Handle a dropped Item on the Actor Sheet.
   * @param {DragEvent} event     The initiating drop event
   * @param {Item} item           The dropped Item document
   * @returns {Promise<void>}
   * @protected
   */
  async _onDropItem(event, item) {
    if (!this.actor.isOwner) return
    if (this.actor.uuid === item.parent?.uuid) return this._onSortItem(event, item)
    const keepId = !this.actor.items.has(item.id)
    await Item.create(item.toObject(), { parent: this.actor, keepId })
  }

  /* -------------------------------------------- */

  /**
   * Handle a dropped Folder on the Actor Sheet.
   * @param {DragEvent} event     The initiating drop event
   * @param {object} data         Extracted drag transfer data
   * @returns {Promise<void>}
   * @protected
   */
  async _onDropFolder(event, data) {}

  /* -------------------------------------------- */

  /**
   * Handle a drop event for an existing embedded Item to sort that Item relative to its siblings.
   * @param {DragEvent} event     The initiating drop event
   * @param {Item} item           The dropped Item document
   * @protected
   */
  _onSortItem(event, item) {
    const items = this.actor.items
    const source = items.get(item.id)

    // Confirm the drop target
    const dropTarget = event.target.closest('[data-item-id]')
    if (!dropTarget) return
    const target = items.get(dropTarget.dataset.itemId)
    if (source.id === target.id) return

    // Identify sibling items based on adjacent HTML elements
    const siblings = []
    for (let el of dropTarget.parentElement.children) {
      const siblingId = el.dataset.itemId
      if (siblingId && siblingId !== source.id) siblings.push(items.get(el.dataset.itemId))
    }

    // Perform the sort
    const sortUpdates = SortingHelpers.performIntegerSort(source, { target, siblings })
    const updateData = sortUpdates.map((u) => {
      const update = u.update
      update._id = u.target._id
      return update
    })

    // Perform the update
    return this.actor.updateEmbeddedDocuments('Item', updateData)
  }
}
