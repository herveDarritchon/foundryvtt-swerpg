import OggDudeDataElement from '../settings/models/OggDudeDataElement.mjs'
import { buildGearContext } from './items/gear-ogg-dude.mjs'
import { buildArmorContext } from './items/armor-ogg-dude.mjs'
import { buildWeaponContext } from './items/weapon-ogg-dude.mjs'
import { buildSpeciesContext } from './items/species-ogg-dude.mjs'
import { buildCareerContext } from './items/career-ogg-dude.mjs'
import { buildTalentContext } from './items/talent-ogg-dude.mjs'
import { buildObligationContext } from './items/obligation-ogg-dude.mjs'
import { logger } from '../utils/logger.mjs'
import { withRetry } from './utils/retry.mjs'
import { markGlobalStart, markGlobalEnd, markArchiveSize, recordDomainStart, recordDomainEnd } from './utils/global-import-metrics.mjs'

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
   * @returns {Promise<void>} A Promise that resolves when the Armor data has been processed.
   * @async
   * @public
   * @function
   * @name _processOggDudeData
   */
  static async processOggDudeData(importedFile, domains, { progressCallback } = {}) {
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
    buildContextMap.set('armor', { type: 'armor', contextBuilder: buildArmorContext })
    buildContextMap.set('weapon', { type: 'weapon', contextBuilder: buildWeaponContext })
    buildContextMap.set('gear', { type: 'gear', contextBuilder: buildGearContext })
    buildContextMap.set('species', { type: 'species', contextBuilder: buildSpeciesContext })
    buildContextMap.set('career', { type: 'career', contextBuilder: buildCareerContext })
    buildContextMap.set('talent', { type: 'talent', contextBuilder: buildTalentContext })
    buildContextMap.set('obligation', { type: 'obligation', contextBuilder: buildObligationContext })

    const domainsToImport = domains.filter((domain) => domain.checked).map((domain) => domain.id)
    logger.debug('[ProcessOggDudeData] -Step 3.3: Domains to Import >', domainsToImport)

    const contextEntries = Array.from(buildContextMap.values()).filter((e) => domainsToImport.includes(e.type))
    const total = contextEntries.length
    let processed = 0
    for (const entry of contextEntries) {
      recordDomainStart(entry.type)
      const context = await withRetry(() => entry.contextBuilder(zip, groupByDirectory, groupByType), {
        shouldRetry: (err) => /parse|XML|network/i.test(err?.message || ''),
      })
      logger.debug('[ProcessOggDudeData] - Step 3.4: Context >', context)
      await withRetry(() => OggDudeDataElement.processElements(context), {
        shouldRetry: (err) => /database|upload|parse/i.test(err?.message || ''),
      })
      processed += 1
      recordDomainEnd(entry.type)
      if (typeof progressCallback === 'function') {
        try {
          progressCallback({ processed, total, domain: entry.type })
        } catch (e) {
          logger.warn('[ProcessOggDudeData] progressCallback error ignoré', { error: e })
        }
      }
    }
    Hooks.callAll('oggdudeImport.completed', { processed, total, domains: domainsToImport })
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
    buildContextMap.set('armor', { type: 'armor', contextBuilder: buildArmorContext })
    buildContextMap.set('weapon', { type: 'weapon', contextBuilder: buildWeaponContext })
    buildContextMap.set('gear', { type: 'gear', contextBuilder: buildGearContext })
    buildContextMap.set('species', { type: 'species', contextBuilder: buildSpeciesContext })
    buildContextMap.set('career', { type: 'career', contextBuilder: buildCareerContext })
    buildContextMap.set('talent', { type: 'talent', contextBuilder: buildTalentContext })
    buildContextMap.set('obligation', { type: 'obligation', contextBuilder: buildObligationContext })

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
        logger.debug('[OggDudeImporter] preload existence check skipped (no Foundry runtime)', { error: e })
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
