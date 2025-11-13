/**
 * @typedef {object} FormApplication
 * @typedef {object} NewDataFile
 * @property {string} [src=""]          The OggDude Data file.
 */

import OggDudeImporter from '../importer/oggDude.mjs'
import { logger } from '../utils/logger.mjs'
// Similar syntax to importing, mais c'est du destructuring et peut être indisponible en environnement de test.

// Fournit des fallbacks légers si l'API Foundry n'est pas initialisée (exécution tests).
const ApplicationV2 = foundry?.applications?.api?.ApplicationV2 ?? class {}
const HandlebarsApplicationMixin = foundry?.applications?.api?.HandlebarsApplicationMixin ?? ((Base) => Base)

/**
 * An application for processing OggDude data file. This application is used to import data from OggDude's generator.
 * @extends {FormApplication}
 */
export class OggDudeDataImporter extends HandlebarsApplicationMixin(ApplicationV2) {
  _domainNames = ['weapon', 'armor', 'gear', 'species', 'career']

  domains = this._initializeDomains(this._domainNames)
  zipFile = null

  /* -------------------------------------------- */

  /**
   * Initialize the domains for the OggDude data importer.
   * @param domainNames {string[]} The names of the domains to initialize.
   * @returns {object[]} The initialized domains.
   * @private
   */
  _initializeDomains(domainNames) {
    return domainNames.map((name) => {
      return {
        id: name,
        label: `SETTINGS.OggDudeDataImporter.loadWindow.domains.${name}`,
        checked: false,
      }
    })
  }

  /* -------------------------------------------- */

  static PARTS = {
    swerpgSettings: {
      template: 'systems/swerpg/templates/settings/oggDudeDataImporter.hbs',
    },
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    id: 'swerpgSettings-form',
    tag: 'form',
    form: {
      handler: OggDudeDataImporter._onSubmit,
      closeOnSubmit: false,
      submitOnChange: false,
    },
    window: {
      icon: 'fas fa-cogs',
      title: 'SETTINGS.OggDudeDataImporter.loadWindow.menuLabel',
      contentClasses: ['standard-form'],
    },
    //popOut: true,
    position: {
      width: 640,
      height: 'auto',
    },
    actions: {
      resetAction: OggDudeDataImporter.resetAction,
      loadAction: OggDudeDataImporter.loadAction,
      toggleDomainAction: OggDudeDataImporter.toggleDomainAction,
    },
    footer: {
      template: 'templates/generic/form-footer.hbs',
    },
  }

  /* -------------------------------------------- */

  _prepareContext(options) {
    //const setting = game.settings.get("swerpgSettings", "config");
    logger.debug('[OggDudeDataImporter] Preparing context', { options, instance: this })
    return {
      domains: this.domains,
      domainSelectionDisabled: this.noZipFileSelected(),
      loadButtonDisabled: this.noZipFileSelected() || this._noDomainSelected(),
      zipFile: this.zipFile,
    }
  }

  noZipFileSelected() {
    return this.zipFile == null
  }

  /* -------------------------------------------- */

  _noDomainSelected() {
    return this.domains.filter((domain) => domain.checked).length === 0
  }

  /* -------------------------------------------- */

  _onRender(context, options) {
    if (this.element.querySelector('#oggdude-zip-file') != null) {
      this.element.querySelector('#oggdude-zip-file').addEventListener('change', this._onOggdudeZipFileChange.bind(this))
    }
    // We will deal with reset later
  }

  /* -------------------------------------------- */

  static async loadAction(_event, target) {
    logger.info('[OggDudeDataImporter] Load OggDude Data', { instance: this })
    this._progress = { processed: 0, total: 0 }
    await OggDudeImporter.processOggDudeData(this.zipFile, this.domains, {
      progressCallback: ({ processed, total, domain }) => {
        this._progress = { processed, total, domain }
        logger.debug('[OggDudeDataImporter] Progress', this._progress)
        // Pas d'erreur si render indisponible (tests unitaires)
        if (typeof this.render === 'function') {
          this.render().catch((e) => logger.warn('[OggDudeDataImporter] render progress error', { e }))
        }
      },
    })
  }

  /* -------------------------------------------- */
  /**
   * Convert a string to a boolean value.
   * @param value {string} The value to convert.
   * @returns {boolean|boolean} The converted value.
   */
  static toBoolean(value) {
    return this ? value.toLowerCase() === 'true' : false
  }

  /* -------------------------------------------- */

  static async toggleDomainAction(_event, target) {
    if (this.noZipFileSelected()) {
      return
    }
    const name = target.dataset.domainName
    const value = OggDudeDataImporter.toBoolean(target.dataset.domainChecked)
    logger.info(`[OggDudeDataImporter] Toggle Domain [${name}/${value}]`, { event: _event, target })
    this.domains = this.domains.map((domain) => {
      if (domain.id === name) {
        domain.checked = !value
      }
      return domain
    })
    await this.render()
  }

  /* -------------------------------------------- */

  async _onSubmit(event, form, formData) {
    const settings = foundry.utils.expandObject(formData.object)
    logger.info('[OggDudeDataImporter] Saving settings', { settings, instance: this })
  }

  /* -------------------------------------------- */

  static async resetAction(_event, target) {
    logger.info('[OggDudeDataImporter] Resetting settings', { instance: this })
    this.zipFile = null
    this.domains = this._initializeDomains(this._domainNames)
    await this.render()
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async close(options = {}) {
    await super.close(options)
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _onOggdudeZipFileChange(event) {
    this.zipFile = event.target.files[0]
    logger.info('[OggDudeDataImporter] File changed', { event, zipFile: this.zipFile })
    await this.render()
  }

  /* -------------------------------------------- */

  /**
   *
   * @param {Event} event  The originating click event
   * @private
   */
  async _onloadButtonClick(event) {
    event.preventDefault()
    event.stopPropagation()
    const form = $('form.oggDude-data-importer')[0]
    const importedFile = form['zip-file'].files[0]

    this._progress = { processed: 0, total: 0 }
    await OggDudeImporter.processOggDudeData(importedFile, this.domains, {
      progressCallback: ({ processed, total, domain }) => {
        this._progress = { processed, total, domain }
        logger.debug('[OggDudeDataImporter] Progress (button)', this._progress)
        if (typeof this.render === 'function') {
          this.render().catch(() => {})
        }
      },
    })

    await this.close({})
  }
}
