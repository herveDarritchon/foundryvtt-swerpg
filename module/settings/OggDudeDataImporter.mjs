/**
 * @typedef {object} FormApplication
 * @typedef {object} NewDataFile
 * @property {string} [src=""]          The OggDude Data file.
 */

import OggDudeImporter from '../importer/oggDude.mjs'
import {logger} from '../utils/logger.mjs'
import {aggregateImportMetrics, getAllImportStats, formatGlobalMetrics} from '../importer/utils/global-import-metrics.mjs'
// Similar syntax to importing, mais c'est du destructuring et peut être indisponible en environnement de test.

// Fournit des fallbacks légers si l'API Foundry n'est pas initialisée (exécution tests).
// Fallback minimal ApplicationV2 pour environnement de test (évite classe vide)
const ApplicationV2 = foundry?.applications?.api?.ApplicationV2 ?? class {
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
    _domainNames = ['weapon', 'armor', 'gear', 'species', 'career', 'talent']

    domains = this._initializeDomains(this._domainNames)
    zipFile = null
    previewData = {}
    previewFilters = {domain: 'all', text: ''}
    pagination = {page: 1, size: 50}

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
        },
        footer: {
            template: 'templates/generic/form-footer.hbs',
        },
    }

    /* -------------------------------------------- */

    _prepareContext(options) {
        logger.debug('[OggDudeDataImporter] Preparing context', {options, instance: this})
        let stats = {}
        let metrics = {}
        try {
            stats = getAllImportStats()
            metrics = aggregateImportMetrics()
        } catch (e) {
            logger.debug('[OggDudeDataImporter] Stats indisponibles', {e})
        }
        // Construire une version formatée des métriques pour l'affichage
        // Nous utilisons formatGlobalMetrics pour produire des champs lisibles
        // (ex: overallDuration, errorRate, itemsPerSecond, archiveSize, totalProcessed)
        const metricsFormatted = formatGlobalMetrics(metrics)
        return {
            domains: this.domains,
            domainSelectionDisabled: this.noZipFileSelected(),
            loadButtonDisabled: this.noZipFileSelected() || this._noDomainSelected(),
            zipFile: this.zipFile,
            progress: this._progress,
            progressPercent: (this?._progress?.total ? Math.floor((this._progress.processed / this._progress.total) * 100) : 0),
            importStats: stats,
            importMetrics: metrics,
            importMetricsFormatted: metricsFormatted,
            preview: this._buildPreviewContext(),
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

    static async loadAction(_event, target) {
        logger.info('[OggDudeDataImporter] Load OggDude Data', {instance: this})
        this._progress = {processed: 0, total: 0}
        await OggDudeImporter.processOggDudeData(this.zipFile, this.domains, {
            progressCallback: ({processed, total, domain}) => {
                this._progress = {processed, total, domain}
                logger.debug('[OggDudeDataImporter] Progress', this._progress)
                // Pas d'erreur si render indisponible (tests unitaires)
                if (typeof this.render === 'function') {
                    this.render().catch((e) => logger.warn('[OggDudeDataImporter] render progress error', {e}))
                }
            },
        })
        
        // Rafraîchir l'UI après l'import pour afficher les métriques globales finales
        if (typeof this.render === 'function') {
            try {
                await this.render()
                logger.debug('[OggDudeDataImporter] UI refreshed after import completion')
            } catch (e) {
                logger.warn('[OggDudeDataImporter] render after import error', {e})
            }
        }
    }

    /* -------------------------------------------- */
    /**
     * Précharge les données pour prévisualisation sans création d'items
     */
    static async preloadAction(_event, _target) {
        logger.info('[OggDudeDataImporter] Preload OggDude Data (preview mode)', {instance: this})
        if (this.noZipFileSelected() || this._noDomainSelected()) return
        try {
            this.previewData = await OggDudeImporter.preloadOggDudeData(this.zipFile, this.domains)
            // Réinitialiser pagination
            this.pagination = {page: 1, size: 50}
            if (typeof this.render === 'function') await this.render()
        } catch (e) {
            logger.error('[OggDudeDataImporter] Erreur lors du préchargement', {error: e})
        }
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
        logger.info(`[OggDudeDataImporter] Toggle Domain [${name}/${value}]`, {event: _event, target})
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
        logger.info('[OggDudeDataImporter] Saving settings', {settings, instance: this})
    }

    /* -------------------------------------------- */

    static async resetAction(_event, target) {
        logger.info('[OggDudeDataImporter] Resetting settings', {instance: this})
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
        logger.info('[OggDudeDataImporter] File changed', {event, zipFile: this.zipFile})
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

        this._progress = {processed: 0, total: 0}
        await OggDudeImporter.processOggDudeData(importedFile, this.domains, {
            progressCallback: ({processed, total, domain}) => {
                this._progress = {processed, total, domain}
                logger.debug('[OggDudeDataImporter] Progress (button)', this._progress)
                if (typeof this.render === 'function') {
                    this.render().catch(() => {
                    })
                }
            },
        })
        
        // Rafraîchir l'UI après l'import pour afficher les métriques globales finales
        if (typeof this.render === 'function') {
            try {
                await this.render()
                logger.debug('[OggDudeDataImporter] UI refreshed after import completion (button)')
            } catch (e) {
                logger.warn('[OggDudeDataImporter] render after import error (button)', {e})
            }
        }

        await this.close({})
    }
}
