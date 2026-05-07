import SwerpgBaseItemSheet from './base-item.mjs'

/**
 * A SwerpgBaseItemSheet subclass used to configure Items of the "weapon" type.
 */
export default class WeaponSheet extends SwerpgBaseItemSheet {
  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    item: {
      type: 'weapon',
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
    const allowedSlots = this.document.system.getAllowedEquipmentSlots()
    Object.assign(context, {
      qualitiesWidget: this.#qualitiesWidget.bind(this),
      scaledPrice: new foundry.data.fields.StringField({ label: game.i18n.localize('WEAPON.SHEET.SCALED_PRICE') }),
      animations: SYSTEM.WEAPON.ANIMATION_TYPES.reduce((obj, v) => {
        obj[v] = v
        return obj
      }, {}),
    })
    return context
  }

  /* -------------------------------------------- */

  /**
   * Render the properties field as a multi-checkboxes element.
   * @param field
   * @param groupConfig
   * @param inputConfig
   * @returns {HTMLMultiCheckboxElement}
   */
  #qualitiesWidget(field, groupConfig, inputConfig) {
    const qualities = this.document.system.qualities || []
    const qualityOptions = Object.entries(SYSTEM.WEAPON.QUALITIES).map(([k, v]) => ({
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
        const qualityConfig = SYSTEM.WEAPON.QUALITIES[key]
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
}
