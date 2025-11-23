/**
 * @typedef {object} FormApplication
 * @typedef {object} NewDataFile
 * @property {string} [src=""]          The OggDude Data file.
 */

import OggDudeImporter from '../importer/oggDude.mjs'
import { logger } from '../utils/logger.mjs'
import { aggregateImportMetrics, formatGlobalMetrics, getAllImportStats } from '../importer/utils/global-import-metrics.mjs'
// Similar syntax to importing, mais c'est du destructuring et peut être indisponible en environnement de test.

// Fournit des fallbacks légers si l'API Foundry n'est pas initialisée (exécution tests).
// Fallback minimal ApplicationV2 pour environnement de test (évite classe vide)
const ApplicationV2 =
  foundry?.applications?.api?.ApplicationV2 ??
  class {
    // Méthode de rendu factice pour tests (évite erreur de classe vide)
    render() {
      return null
    }
  }
const HandlebarsApplicationMixin = foundry?.applications?.api?.HandlebarsApplicationMixin ?? ((Base) => Base)

/**
 * An application for processing OggDude data file. This application is used to import data from OggDude's generator.
 * @extends {FormApplication}
 */
export class OggDudeDataImporter extends HandlebarsApplicationMixin(ApplicationV2) {
  _domainNames = ['weapon', 'armor', 'gear', 'species', 'career', 'talent', 'obligation', 'specialization']

  domains = this._initializeDomains(this._domainNames)
  zipFile = null
  previewData = {}
  previewFilters = { domain: 'all', text: '' }
  pagination = { page: 1, size: 50 }
  // États de visibilité des sections repliables (collapsibles). Masqués par défaut.
  showStats = false
  showMetrics = false
  showPreview = false

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
    scrollable: ['.sheet-body'],
    position: {
      width: 640,
      height: 'auto',
    },
    actions: {
      resetAction: OggDudeDataImporter.resetAction,
      loadAction: OggDudeDataImporter.loadAction,
      preloadAction: OggDudeDataImporter.preloadAction,
      toggleDomainAction: OggDudeDataImporter.toggleDomainAction,
      toggleStatsAction: OggDudeDataImporter.toggleStatsAction,
      toggleMetricsAction: OggDudeDataImporter.toggleMetricsAction,
      togglePreviewAction: OggDudeDataImporter.togglePreviewAction,
    },
    footer: {
      template: 'templates/generic/form-footer.hbs',
    },
  }

  /* -------------------------------------------- */

  _prepareContext(options) {
    logger.debug('[OggDudeDataImporter] Preparing context', { options, instance: this })
    let stats = {}
    let metrics = {}
    try {
      stats = getAllImportStats()
      metrics = aggregateImportMetrics()
    } catch (e) {
      logger.debug('[OggDudeDataImporter] Stats indisponibles', { e })
    }
    // S'assurer qu'une structure de progression domaines existe même avant le premier callback
    // (affichage immédiat de la barre à 0% une fois l'action lancée).
    const selectedDomainsCount = this.domains.filter((d) => d.checked).length
    let progress = this._progress
    if (!progress) {
      if (selectedDomainsCount > 0) {
        progress = { processed: 0, total: selectedDomainsCount }
      } else {
        progress = { processed: 0, total: 0 }
      }
    }
    // Construire une version formatée des métriques pour l'affichage
    // Nous utilisons formatGlobalMetrics pour produire des champs lisibles
    // (ex: overallDuration, errorRate, itemsPerSecond, archiveSize, totalProcessed)
    const metricsFormatted = formatGlobalMetrics(metrics)
    // Pourcentage global domaines (distinct de potentiels futurs pourcentages items)
    const progressPercentDomains = progress.total ? Math.floor((progress.processed / progress.total) * 100) : 0
    // Détermination présence de données pour sections conditionnelles
    // Considère qu'il y a des stats seulement si au moins un domaine possède un total/import/reject > 0
    const hasStats = Boolean(stats && Object.values(stats).some((d) => (d?.total ?? 0) > 0 || (d?.imported ?? 0) > 0 || (d?.rejected ?? 0) > 0))
    const hasMetrics = Boolean(metricsFormatted && metricsFormatted.totalProcessed > 0)
    const hasPreview = Boolean(this.previewData && Object.keys(this.previewData).length > 0)
    // Résumé compact post-import (affiché même si sections repliables fermées)
    const importSummary = hasMetrics
      ? {
          overallDuration: metricsFormatted.overallDuration,
          totalProcessed: metricsFormatted.totalProcessed,
          errorRate: metricsFormatted.errorRate,
          itemsPerSecond: metricsFormatted.itemsPerSecond,
        }
      : null
    // Calcul des statuts domaine (fonction pur sans effet côté template) – logique testable séparément.
    const importDomainStatus = this._buildImportDomainStatus(stats)

    // Logs de diagnostic pour vérifier la présence de specialization
    logger.debug('[OggDudeDataImporter] Context prepared', {
      domainsCount: this._domainNames.length,
      domainsList: this._domainNames,
      statsKeys: Object.keys(stats),
      importDomainStatusKeys: Object.keys(importDomainStatus),
      hasSpecializationInStats: !!stats.specialization,
      specializationStats: stats.specialization,
      hasSpecializationInStatus: !!importDomainStatus.specialization
    })

    return {
      domains: this.domains,
      domainSelectionDisabled: this.noZipFileSelected(),
      loadButtonDisabled: this.noZipFileSelected() || this._noDomainSelected(),
      zipFile: this.zipFile,
      progress,
      // Valeur existante conservée pour compatibilité (ancienne barre éventuelle)
      progressPercent: progressPercentDomains,
      // Nouveau champ explicite pour jauge domaines
      progressPercentDomains,
      importStats: stats,
      importMetrics: metrics,
      importMetricsFormatted: metricsFormatted,
      preview: this._buildPreviewContext(),
      // Flags & états UI immersifs
      showStats: this.showStats,
      showMetrics: this.showMetrics,
      showPreview: this.showPreview,
      hasStats,
      hasMetrics,
      hasPreview,
      importSummary,
      importDomainStatus,
    }
  }

  /**
   * Checks if no ZIP file has been selected.
   * @return {boolean} Returns true if the zipFile property is null, indicating no ZIP file has been selected; otherwise, false.
   */
  noZipFileSelected() {
    return this.zipFile == null
  }

  /* -------------------------------------------- */

  /**
   * Checks if no domain is selected.
   * @return {boolean} Returns true if no domain is selected; otherwise, false.
   */
  _noDomainSelected() {
    return this.domains.filter((domain) => domain.checked).length === 0
  }

  /* -------------------------------------------- */

  _onRender(context, options) {
    if (this.element.querySelector('#oggdude-zip-file') != null) {
      this.element.querySelector('#oggdude-zip-file').addEventListener('change', this._onOggdudeZipFileChange.bind(this))
    }
    // We will deal with reset later
    // Prévisualisation: liaisons filtres
    const domainSelect = this.element.querySelector('select[name="preview-domain"]')
    if (domainSelect) {
      domainSelect.value = this.previewFilters.domain
      domainSelect.addEventListener('change', async (e) => {
        this.previewFilters.domain = e.target.value
        await this.render()
      })
    }
    const textInput = this.element.querySelector('input[name="preview-text"]')
    if (textInput) {
      textInput.value = this.previewFilters.text
      textInput.addEventListener('input', async (e) => {
        this.previewFilters.text = e.target.value
        // reset page to 1 on filter change
        this.pagination.page = 1
        await this.render()
      })
    }
  }

  /* -------------------------------------------- */

  /**
   * LoadAction handler for the form submission.
   * @this {OggDudeDataImporter} this is capture by the action handler
   * @param _event
   * @param target
   * @returns {Promise<void>}
   */
  static async loadAction(_event, target) {
    logger.info('[OggDudeDataImporter] Load OggDude Data', { instance: this })
    // Initialiser immédiatement total avec le nombre de domaines sélectionnés
    const totalDomains = this.domains.filter((d) => d.checked).length
    this._progress = { processed: 0, total: totalDomains }
    if (typeof this.render === 'function') {
      try {
        await this.render()
      } catch (e) {
        logger.warn('[OggDudeDataImporter] render initial progress error', { e })
      }
    }
    await OggDudeImporter.processOggDudeData(this.zipFile, this.domains, {
      progressCallback: ({ processed, total, domain }) => {
        // Mise à jour atomique de la progression domaines (total constant)
        this._progress = { processed: Number(processed) || 0, total: totalDomains, domain }
        logger.debug('[OggDudeDataImporter] Progress', this._progress)
        // Pas d'erreur si render indisponible (tests unitaires)
        if (typeof this.render === 'function') {
          this.render().catch((e) => logger.warn('[OggDudeDataImporter] render progress error', { e }))
        }
      },
    })

    // Rafraîchir l'UI après l'import pour afficher les métriques globales finales
    if (typeof this.render === 'function') {
      try {
        await this.render()
        logger.debug('[OggDudeDataImporter] UI refreshed after import completion')
      } catch (e) {
        logger.warn('[OggDudeDataImporter] render after import error', { e })
      }
    }
  }

  /* -------------------------------------------- */
  /**
   * Précharge les données pour prévisualisation sans création d'items
   * @this {OggDudeDataImporter} this is capture by the action handler
   * @param _event {Event} Event object triggering the action
   * @param _target {HTMLElement} Target element of the action
   */
  static async preloadAction(_event, _target) {
    logger.info('[OggDudeDataImporter] Preload OggDude Data (preview mode)', { instance: this })
    if (this.noZipFileSelected() || this._noDomainSelected()) return
    try {
      this.previewData = await OggDudeImporter.preloadOggDudeData(this.zipFile, this.domains)
      // Réinitialiser pagination
      this.pagination = { page: 1, size: 50 }
      // Ne pas ouvrir automatiquement la section (doit rester immersive/optionnelle)
      if (typeof this.render === 'function') await this.render()
    } catch (e) {
      logger.error('[OggDudeDataImporter] Erreur lors du préchargement', { error: e })
    }
  }

  /* -------------------------------------------- */
  /**
   * Convert a string to a boolean value.
   * @param value {string} The value to convert.
   * @returns {boolean|boolean} The converted value.
   */
  toBoolean(value) {
    return this ? value.toLowerCase() === 'true' : false
  }

  /* -------------------------------------------- */

  /**
   * Toggle the checked state of a domain.
   * @this {OggDudeDataImporter} this is capture by the action handler
   * @param _event {Event} The triggering event.
   * @param target {HTMLElement} The target element of the action.
   */
  static async toggleDomainAction(_event, target) {
    if (this.noZipFileSelected()) {
      return
    }
    const name = target.dataset.domainName
    const value = this.toBoolean(target.dataset.domainChecked)
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
  /**
   * Bascule visibilité section Statistiques.
   * @this {OggDudeDataImporter} this is capture by the action handler
   * @param _event {Event}
   * @param _target {HTMLElement}
   */
  static async toggleStatsAction(_event, _target) {
    this.showStats = !this.showStats
    await this.render()
  }

  /**
   * Bascule visibilité section Métriques globales.
   * @this {OggDudeDataImporter} this is capture by the action handler
   * @param _event {Event}
   * @param _target {HTMLElement}
   */
  static async toggleMetricsAction(_event, _target) {
    this.showMetrics = !this.showMetrics
    await this.render()
  }

  /**
   * Bascule visibilité section Prévisualisation.
   * @this {OggDudeDataImporter} this is capture by the action handler
   * @param _event {Event}
   * @param _target {HTMLElement}
   */
  static async togglePreviewAction(_event, _target) {
    this.showPreview = !this.showPreview
    await this.render()
  }

  /* -------------------------------------------- */

  /**
   * Handle form submission.
   * @this {OggDudeDataImporter} this is capture by the action handler
   * @param event Event object for the form submission.
   * @param form The form element that was submitted.
   * @param formData The form data object containing the form fields and their values.
   * @returns {Promise<void>} A promise that resolves when the form submission is handled.
   * @private
   */
  static async _onSubmit(event, form, formData) {
    const settings = foundry.utils.expandObject(formData.object)
    logger.info('[OggDudeDataImporter] Saving settings', { settings, instance: this })
  }

  /* -------------------------------------------- */

  /**
   * Reset all settings to their default values.
   * @this {OggDudeDataImporter} this is capture by the action handler
   * @param _event {Event} The triggering event.
   * @param target {HTMLElement} The target element of the action.
   */
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
  _buildPreviewContext() {
    const domains = Object.keys(this.previewData || {})
    const selectedDomain = this.previewFilters.domain === 'all' ? null : this.previewFilters.domain
    const text = (this.previewFilters.text || '').toLowerCase()
    let items = []
    for (const d of domains) {
      if (selectedDomain && d !== selectedDomain) continue
      const arr = this.previewData[d] || []
      items.push(...arr)
    }
    if (text) {
      items = items.filter((it) => `${it.name}`.toLowerCase().includes(text))
    }
    const total = items.length
    const size = this.pagination.size
    const page = Math.max(1, Math.min(this.pagination.page, Math.ceil(total / size) || 1))
    const start = (page - 1) * size
    const pageItems = items.slice(start, start + size)
    return {
      hasData: total > 0,
      total,
      page,
      pageSize: size,
      totalPages: Math.max(1, Math.ceil(total / size)),
      items: pageItems,
      filters: this.previewFilters,
    }
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

    // Rafraîchir l'UI après l'import pour afficher les métriques globales finales
    if (typeof this.render === 'function') {
      try {
        await this.render()
        logger.debug('[OggDudeDataImporter] UI refreshed after import completion (button)')
      } catch (e) {
        logger.warn('[OggDudeDataImporter] render after import error (button)', { e })
      }
    }

    await this.close({})
  }

  /* -------------------------------------------- */
  /**
   * Calcule le statut d'import d'un domaine à partir du triplet {total, imported, rejected}.
   * Invariants (spécification): imported + rejected <= total. Si violé, on clamp et log un warning.
   * Règles:
   *  - success: total>0 && imported===total && rejected===0
   *  - error: total>0 && imported===0 && rejected===total
   *  - mixed: imported>0 && rejected>0 && imported + rejected === total
   *  - pending: tous les autres cas (inclut import partiel, total=0, ou mismatch des sommes)
   * @param {Object} values
   * @param {number} [values.total=0]
   * @param {number} [values.imported=0]
   * @param {number} [values.rejected=0]
   * @returns {"pending"|"success"|"mixed"|"error"}
   */
  static computeDomainStatus({ total = 0, imported = 0, rejected = 0 } = {}) {
    total = Number(total) || 0
    imported = Number(imported) || 0
    rejected = Number(rejected) || 0
    if (imported < 0) imported = 0
    if (rejected < 0) rejected = 0
    if (total < 0) total = 0
    if (imported + rejected > total) {
      // Clamp et log warning (sécurité logique, évite classification incorrecte silencieuse)
      logger.warn('[OggDudeDataImporter] Invariant violé (imported + rejected > total) – clamp', {
        original: { total, imported, rejected },
      })
      total = imported + rejected
    }
    if (total > 0 && imported === total && rejected === 0) return 'success'
    if (total > 0 && imported === 0 && rejected === total) return 'error'
    if (imported > 0 && rejected > 0 && imported + rejected === total) return 'mixed'
    return 'pending'
  }

  /**
   * Construit l'objet de statuts par domaine pour le contexte template.
   * @param {Object} stats
   * @returns {Object<string,{code:string,labelI18n:string,class:string}>}
   *   Ex: { armor: { code:'success', labelI18n:'SETTINGS.OggDudeDataImporter.loadWindow.stats.status.success', class:'domain-status domain-status--success' } }
   * Les labels i18n sont résolus côté template via {{localize}}.
   */
  _buildImportDomainStatus(stats = {}) {
    const result = {}
    for (const name of this._domainNames) {
      const domainStats = stats?.[name] || {}
      const code = OggDudeDataImporter.computeDomainStatus(domainStats)
      result[name] = {
        code,
        labelI18n: `SETTINGS.OggDudeDataImporter.loadWindow.stats.status.${code}`,
        class: `domain-status domain-status--${code}`,
      }
    }
    return result
  }
}
