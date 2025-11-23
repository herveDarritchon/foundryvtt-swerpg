import OggDudeDataElement from '../settings/models/OggDudeDataElement.mjs'
import {buildGearContext} from './items/gear-ogg-dude.mjs'
import {buildArmorContext} from './items/armor-ogg-dude.mjs'
import {buildWeaponContext} from './items/weapon-ogg-dude.mjs'
import {buildSpeciesContext} from './items/species-ogg-dude.mjs'
import {buildCareerContext} from './items/career-ogg-dude.mjs'
import {buildTalentContext} from './items/talent-ogg-dude.mjs'
import {buildObligationContext} from './items/obligation-ogg-dude.mjs'
import {buildSpecializationContext} from './items/specialization-ogg-dude.mjs'
import {logger} from '../utils/logger.mjs'
import {withRetry} from './utils/retry.mjs'
import {
    markArchiveSize,
    markGlobalEnd,
    markGlobalStart,
    recordDomainEnd,
    recordDomainStart
} from './utils/global-import-metrics.mjs'
import {getSpecializationImportStats} from './utils/specialization-import-utils.mjs'

export default class OggDudeImporter {
    /**
     * Map a String value, if it is not present, return an empty string.
     * @param label {string} The label of the element.
     * @param value {string} The value of the element.
     * @returns {string} The mapped value of the element.
     * @public
     * @function
     * @name mapMandatoryString
     */
    static mapMandatoryString(label, value) {
        if (value == null || typeof value !== 'string') {
            logger.warn(`Value ${label} is mandatory !`)
            return ''
        }
        return value
    }

    /**
     * Map an optional String value, if it is not present, return an empty string.
     * @param value {string} The value of the element.
     * @returns {string} The mapped value of the element.
     * @public
     * @function
     * @name mapOptionalString
     */
    static mapOptionalString(value) {
        return typeof value === 'string' ? value : ''
    }

    /**
     * Map a String value to a Number, if it is not present, return 0.
     * @param label {string} The label of the element.
     * @param value {string} The value of the element.
     * @returns {number} The mapped value of the element.
     * @public
     * @function
     * @name mapMandatoryNumber
     */
    static mapMandatoryNumber(label, value) {
        if (value == null || typeof value !== 'string') {
            logger.warn(`Value ${label} is mandatory !`)
            return 0
        }
        return Number.parseInt(value) || 0
    }

    /**
     * Map an optional Number value, if it is not present, return 0.
     * @param value {string} The value of the element.
     * @returns {number|number} The mapped value of the element.
     * @public
     * @function
     * @name mapOptionalNumber
     */
    static mapOptionalNumber(value) {
        return Number.parseInt(value) || 0
    }

    /**
     * Map a Boolean value, if it is not present, return false.
     * @param label {string} The label of the element.
     * @param value {string} The value of the element.
     * @returns {boolean} The mapped value of the element.
     * @public
     * @function
     * @name mapMandatoryBoolean
     */
    static mapMandatoryBoolean(label, value) {
        if (value == null || typeof value !== 'string') {
            logger.warn(`Value ${label} is mandatory !`)
            return false
        }
        return value === 'true'
    }

    /**
     *  Map a Boolean value, if it is not present, return false.
     * @param value {string} The value of the element.
     * @returns {boolean} The mapped value of the element.
     * @public
     * @function
     * @name mapOptionalBoolean
     */
    static mapOptionalBoolean(value) {
        return value === 'true'
    }

    /**
     * Map an optional array value, if it is not present, return an empty array.
     * @param value {Array} The value of the element.
     * @param mapper {function} The function to map the value.
     * @returns {*[]} The mapped value of the element as an array.
     * @public
     * @function
     * @name mapOptionalArray
     */
    static mapOptionalArray(value, mapper) {
        if (value != null && Array.isArray(value)) {
            return value.map((v) => {
                return mapper(v)
            })
        }
        // Single object case (non-null, non-array)
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            return [mapper(value)]
        }
        return []
    }

    /**
     * Map an optional array value, if it is not present, return an empty array.
     * @param value {Object} The value of the element.
     * @param mapper {function} The function to map the value.
     * @returns {Object} The mapped value of the element as an object.
     * @public
     * @function
     * @name mapOptionalObject
     */
    static mapOptionalObject(value, mapper) {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            return [mapper(value)]
        }
        return {}
    }

    /**
     * Process the Armor data from the imported file. The process is as follows:
     * 1. Load the zip file
     * 2. Load the data elements from the zip
     * 3.1 Group the data elements by type
     * 3.2 Group the data elements by directory
     * 4.1 Get the Armor file from the Data directory
     * 4.2 Get the Weapon file from the Data directory
     * 4.3 Get the Gear file from the Data directory
     * @param importedFile {File} The imported file.
     * @param domains {Object[]}The list of domains to import from the OggDude File.
     * @param {Object} [options] Options supplémentaires
     * @param {function(Object):void} [options.progressCallback] Callback appelé à chaque étape (payload: {total, processed, domain?, phase, reason?, error?, domainStats?})
     * @returns {Promise<void>} A Promise that resolves when the Armor data has been processed.
     * @async
     * @public
     * @function
     * @name _processOggDudeData
     */
    static async processOggDudeData(importedFile, domains, {progressCallback, importToCompendium = false} = {}) {
        /* --------------------------------------------- GÉNÉRIQUE ------------------------------------------------------------------- */

        // Step 1: Load the zip file
        markGlobalStart()
        const zip = await new OggDudeImporter().load(importedFile)
        logger.debug('[ProcessOggDudeData] - Step 1: Zip >', zip)
        if (importedFile?.size) {
            markArchiveSize(importedFile.size)
        }

        // Step 2: Load the data elements from the zip
        let allDataElements = OggDudeDataElement.from(zip)
        logger.debug('[ProcessOggDudeData] - Step 2: All Data Elements >', allDataElements)

        // Step 3.1: Group the data elements by directory
        let groupByDirectory = OggDudeDataElement.groupByDirectory(allDataElements)
        logger.debug('[ProcessOggDudeData] - Step 3.1: Group By Directory >', groupByDirectory)

        // Step 3.2: Group the data elements by type
        let groupByType = OggDudeDataElement.groupByType(allDataElements)
        logger.debug('[ProcessOggDudeData] - Step 3.2: Group By Type >', groupByType)

        /* --------------------------------------------- SPÉCIFIQUE ------------------------------------------------------------------- */
        const buildContextMap = new Map()
        buildContextMap.set('armor', {type: 'armor', contextBuilder: buildArmorContext})
        buildContextMap.set('weapon', {type: 'weapon', contextBuilder: buildWeaponContext})
        buildContextMap.set('gear', {type: 'gear', contextBuilder: buildGearContext})
        buildContextMap.set('species', {type: 'species', contextBuilder: buildSpeciesContext})
        buildContextMap.set('career', {type: 'career', contextBuilder: buildCareerContext})
        buildContextMap.set('talent', {type: 'talent', contextBuilder: buildTalentContext})
        buildContextMap.set('obligation', {type: 'obligation', contextBuilder: buildObligationContext})
        buildContextMap.set('specialization', {type: 'specialization', contextBuilder: buildSpecializationContext})

        const domainsToImport = domains.filter((domain) => domain.checked).map((domain) => domain.id)
        const unsupportedDomains = domainsToImport.filter((id) => !buildContextMap.has(id))
        if (unsupportedDomains.length > 0) {
            logger.warn('[ProcessOggDudeData] Domaines demandés non supportés', {unsupportedDomains})
            const unsupportedDomains = unsupportedDomains.map(domain => domain.id).join(",");
            ui.notifications.warn(game.i18n.format('SETTINGS.OggDudeDataImporter.loadWindow.user-message.domain-unsupported:', unsupportedDomains))
        }
        logger.debug('[ProcessOggDudeData] -Step 3.3: Domains to Import >', domainsToImport)

        const contextEntries = domainsToImport.map((id) => buildContextMap.get(id)).filter(Boolean)
        const total = contextEntries.length
        let processed = 0
        const completedDomains = []

        // Logs de diagnostic pour vérifier la configuration du pipeline
        logger.info('[ProcessOggDudeData] DIAGNOSTIC - Pipeline initialization', {
            contextEntriesCount: contextEntries.length,
            contextEntriesTypes: contextEntries.map(e => e.type),
            domainsToImport,
            buildContextMapKeys: Array.from(buildContextMap.keys()),
            hasSpecialization: buildContextMap.has('specialization'),
            specializationInEntries: contextEntries.some(e => e.type === 'specialization')
        })

        const emitProgress = (payload) => {
            if (typeof progressCallback !== 'function') return
            try {
                progressCallback({total, ...payload})
            } catch (e) {
                logger.warn('[ProcessOggDudeData] progressCallback error ignoré', {error: e})
            }
        }
        emitProgress({processed, phase: 'init'})
        for (const entry of contextEntries) {
            recordDomainStart(entry.type)
            emitProgress({processed, domain: entry.type, phase: 'start'})
            try {
                const context = await withRetry(() => entry.contextBuilder(zip, groupByDirectory, groupByType), {
                    shouldRetry: (err) => /parse|XML|network/i.test(err?.message || ''),
                })
                const datasetSize = Array.isArray(context?.jsonData) ? context.jsonData.filter((el) => el != null).length : 0

                logger.info('[ProcessOggDudeData] Context créé', {
                    domain: entry.type,
                    datasetSize,
                    hasMapper: typeof context?.element?.mapper === 'function',
                    jsonDataSample: context?.jsonData?.slice(0, 2)
                })

                logger.debug('[ProcessOggDudeData] - Step 3.4: Context >', {domain: entry.type, datasetSize})
                if (datasetSize === 0 && entry.type === 'specialization') {
                    // Ne pas incrémenter rejected artificiellement: dataset réellement vide
                    logger.warn('[ProcessOggDudeData] Domaine specialization sans données, import ignoré')
                    emitProgress({
                        processed,
                        domain: entry.type,
                        phase: 'skipped',
                        reason: 'empty-data',
                        domainStats: getSpecializationImportStats()
                    })
                    continue
                }
                if (datasetSize === 0) {
                    logger.warn('[ProcessOggDudeData] Domaine sans données, import ignoré', {domain: entry.type})
                    emitProgress({processed, domain: entry.type, phase: 'skipped', reason: 'empty-data'})
                    continue
                }

                logger.info('[ProcessOggDudeData] AVANT processElements', {
                    domain: entry.type,
                    contextKeys: Object.keys(context || {}),
                    elementKeys: Object.keys(context?.element || {})
                })

                await withRetry(() => OggDudeDataElement.processElements(context, { importToCompendium }), {
                    shouldRetry: (err) => /database|upload|parse/i.test(err?.message || ''),
                })

                logger.info('[ProcessOggDudeData] APRÈS processElements', {
                    domain: entry.type
                })
                processed += 1
                completedDomains.push(entry.type)
                let domainStatsPayload
                if (entry.type === 'specialization') {
                    const specStats = getSpecializationImportStats()
                    domainStatsPayload = specStats
                    logger.info('[SpecializationImporter] Statistiques après import', {stats: specStats})
                }
                emitProgress({processed, domain: entry.type, phase: 'completed', domainStats: domainStatsPayload})
            } catch (error) {
                logger.error('[ProcessOggDudeData] Échec import domaine', {domain: entry.type, error})
                emitProgress({processed, domain: entry.type, phase: 'error', error: error?.message})
            } finally {
                recordDomainEnd(entry.type)
            }
        }
        Hooks.callAll('oggdudeImport.completed', {processed, total, domains: completedDomains})
        markGlobalEnd()

        /* ------------------------------------------------------------------------------------------------------------------------------------ */
    }

    /**
     * Précharge les données OggDude sans créer d'Items Foundry.
     * Retourne un aperçu des éléments mappés par domaine, avec indicateur d'existence.
     * @param {File|ArrayBuffer|Buffer} importedFile Le fichier ZIP OggDude
     * @param {Object[]} domains La sélection de domaines { id, checked }
     * @returns {Promise<Record<string, Array<object>>>} Aperçu des éléments par domaine
     */
    static async preloadOggDudeData(importedFile, domains) {
        // Chargement archive
        const zip = await new OggDudeImporter().load(importedFile)
        const allDataElements = OggDudeDataElement.from(zip)
        const groupByDirectory = OggDudeDataElement.groupByDirectory(allDataElements)
        const groupByType = OggDudeDataElement.groupByType(allDataElements)

        // Build context map
        const buildContextMap = new Map()
        buildContextMap.set('armor', {type: 'armor', contextBuilder: buildArmorContext})
        buildContextMap.set('weapon', {type: 'weapon', contextBuilder: buildWeaponContext})
        buildContextMap.set('gear', {type: 'gear', contextBuilder: buildGearContext})
        buildContextMap.set('species', {type: 'species', contextBuilder: buildSpeciesContext})
        buildContextMap.set('career', {type: 'career', contextBuilder: buildCareerContext})
        buildContextMap.set('talent', {type: 'talent', contextBuilder: buildTalentContext})
        buildContextMap.set('obligation', {type: 'obligation', contextBuilder: buildObligationContext})
        buildContextMap.set('specialization', {type: 'specialization', contextBuilder: buildSpecializationContext})

        const domainsToImport = new Set(domains.filter((d) => d.checked).map((d) => d.id))
        const contextEntries = Array.from(buildContextMap.values()).filter((e) => domainsToImport.has(e.type))

        const previews = {}
        for (const entry of contextEntries) {
            const context = await entry.contextBuilder(zip, groupByDirectory, groupByType)
            // Mapper uniquement, ne pas stocker
            const items = OggDudeDataElement._buildItemElements(context.jsonData, context.element.mapper)
            // Annoter existence (si environnement Foundry présent)
            const existingSet = new Set()
            try {
                const existing = globalThis.game?.items?.contents ?? []
                for (const it of existing) {
                    if (it?.type && it?.name) existingSet.add(`${it.type}::${it.name}`)
                }
            } catch (e) {
                logger.debug('[OggDudeImporter] preload existence check skipped (no Foundry runtime)', {error: e})
            }
            previews[entry.type] = items.map((it) => ({
                ...it,
                preview: true,
                exists: existingSet.has(`${it.type}::${it.name}`),
            }))
        }

        return previews
    }

    /**
     * @param file : File (Zip file path) from OGGDude https://www.swrpgcommunity.com/gm-resources/apps-dice-utilities/oggdudes-generator
     * @returns {Promise<{[p: string]: JSZip.JSZipObject}>}
     */
    async load(file) {
        // Support global stub JSZip in tests
        if (globalThis.JSZip && typeof globalThis.JSZip.loadAsync === 'function') {
            return globalThis.JSZip.loadAsync(file)
        }
        // Dynamic import pour éviter échec de résolution statique dans certains environnements
        const lib = await import('jszip').then((m) => m.default || m)
        return lib.loadAsync(file)
    }

    /* -------------------------------------------- */
}
