import SwerpgBaseItemSheet from './base-item.mjs'

/**
 * A SwerpgBaseItemSheet subclass used to configure Items of the "armor" type.
 */
export default class ArmorSheet extends SwerpgBaseItemSheet {
  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    item: {
      type: 'armor',
      includesActions: true,
      advancedDescription: true,
    },
  }

  // Initialize subclass options
  static {
    this._initializeItemSheetClass()
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options)
    Object.assign(context, {
      defenseWidget: this.#defenseWidget.bind(this),
      soakWidget: this.#soakWidget.bind(this),
      qualitiesWidget: this.#qualitiesWidget.bind(this),
      scaledPrice: new foundry.data.fields.StringField({ label: game.i18n.localize('ARMOR.SHEET.SCALED_PRICE') }),
    })
    return context
  }

  /* -------------------------------------------- */

  /**
   * A custom form field widget for rendering armor defense.
   * @param field
   * @param groupConfig
   * @param inputConfig
   */
  #defenseWidget(field, groupConfig, inputConfig) {
    const config = this.document.system.config.category.defense
    const { widget, fields } = ArmorSheet.#createWidget(field, groupConfig, inputConfig, config)
    fields.appendChild(ArmorSheet._createElement('label', { innerText: game.i18n.localize('ARMOR.SHEET.ARMOR_BONUS') }))
    const defenseBonus = this.document.system.defense.bonus
    fields.appendChild(foundry.applications.fields.createNumberInput({ value: defenseBonus, disabled: true }))
    return widget
  }

  /* -------------------------------------------- */

  /**
   * A custom form field widget for rendering dodge defense.
   * @param field
   * @param groupConfig
   * @param inputConfig
   */
  #soakWidget(field, groupConfig, inputConfig) {
    const config = this.document.system.config.category.soak
    const { widget, fields } = ArmorSheet.#createWidget(field, groupConfig, inputConfig, config)
    fields.appendChild(ArmorSheet._createElement('label', { innerText: game.i18n.localize('ARMOR.SHEET.DODGE_SCALING') }))
    const soakStart = `${this.document.system.soak.start} ${swerpg.CONST.CHARACTERISTICS.agility.abbreviation}`
    fields.appendChild(foundry.applications.fields.createTextInput({ value: soakStart, disabled: true }))
    return widget
  }

  /* -------------------------------------------- */

  /**
   * Render the qualities field as a multi-checkboxes element with rank support.
   * @param field
   * @param groupConfig
   * @param inputConfig
   * @returns {HTMLElement}
   */
  #qualitiesWidget(field, groupConfig, inputConfig) {
    const qualities = this.document.system.qualities || []
    const qualityOptions = Object.entries(SYSTEM.ARMOR.PROPERTIES).map(([k, v]) => ({
      value: k,
      label: v.label,
      hasRank: v.hasRank || false,
    }))

    const container = document.createElement('div')
    container.className = 'qualities-widget'

    qualityOptions.forEach((opt) => {
      const qualityData = qualities.find((q) => q.key === opt.value)
      const isChecked = qualityData !== undefined
      const currentRank = qualityData?.rank ?? 1

      const row = document.createElement('div')
      row.className = 'quality-row'

      const checkbox = document.createElement('input')
      checkbox.type = 'checkbox'
      checkbox.name = `${field.fieldPath}.${opt.value}.active`
      checkbox.checked = isChecked
      checkbox.dataset.key = opt.value
      checkbox.addEventListener('change', (ev) => this._onQualityChange(ev))

      const label = document.createElement('label')
      label.textContent = opt.label

      row.appendChild(checkbox)
      row.appendChild(label)

      if (opt.hasRank) {
        const rankInput = document.createElement('input')
        rankInput.type = 'number'
        rankInput.name = `${field.fieldPath}.${opt.value}.rank`
        rankInput.value = currentRank
        rankInput.min = 0
        rankInput.className = 'quality-rank'
        rankInput.disabled = !isChecked
        rankInput.addEventListener('change', (ev) => this._onQualityChange(ev))
        row.appendChild(rankInput)
      }

      container.appendChild(row)
    })

    return container
  }

  async _onQualityChange(event) {
    const target = event.target
    const key = target.dataset.key
    const isCheckbox = target.type === 'checkbox'
    const isChecked = isCheckbox ? target.checked : true

    const qualities = foundry.utils.deepClone(this.document.system.qualities || [])

    if (isCheckbox) {
      if (isChecked) {
        const qualityConfig = SYSTEM.ARMOR.PROPERTIES[key]
        qualities.push({
          key: key,
          rank: qualityConfig?.hasRank ? 1 : null,
          hasRank: qualityConfig?.hasRank || false,
          active: true,
          source: 'base',
        })
      } else {
        const idx = qualities.findIndex((q) => q.key === key)
        if (idx !== -1) qualities.splice(idx, 1)
      }
    } else {
      const quality = qualities.find((q) => q.key === key)
      if (quality) {
        quality.rank = parseInt(target.value) || 0
      }
    }

    await this.document.update({ 'system.qualities': qualities })
  }

  /* -------------------------------------------- */

  /**
   * Logic common to both the armor and dodge widgets.
   * @param field
   * @param groupConfig
   * @param inputConfig
   * @param config
   * @returns {widget: HTMLDivElement, fields: HTMLDivElement}
   */
  static #createWidget(field, groupConfig, inputConfig, config) {
    const widget = ArmorSheet._createElement('div', { className: 'form-group slim defense' })
    widget.appendChild(ArmorSheet._createElement('label', { innerText: field.label }))
    const fields = widget.appendChild(ArmorSheet._createElement('div', { className: 'form-fields' }))
    fields.appendChild(ArmorSheet._createElement('label', { innerText: field.fields.base.label }))
    fields.appendChild(field.fields.base.toInput({ value: inputConfig.value.base }))
    return { widget, fields }
  }
}
