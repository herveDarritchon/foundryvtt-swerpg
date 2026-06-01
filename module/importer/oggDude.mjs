import OggDudeDataElement from '../settings/models/OggDudeDataElement.mjs'
import { buildGearContext } from './items/gear-ogg-dude.mjs'
import { buildWeaponContext } from './items/weapon-ogg-dude.mjs'
import { buildArmorContext } from './items/armor-ogg-dude.mjs'
import { buildSpeciesContext } from './items/species-ogg-dude.mjs'
import { buildCareerContext } from './items/career-ogg-dude.mjs'
import { buildTalentContext } from './items/talent-ogg-dude.mjs'
import { buildObligationContext } from './items/obligation-ogg-dude.mjs'
import { buildSpecializationContext } from './items/specialization-ogg-dude.mjs'
import { buildSpecializationTreeContext, getSpecializationTreeImportStats } from './items/specialization-tree-ogg-dude.mjs'
import { buildMotivationCategoryContext } from './items/motivation-category-ogg-dude.mjs'
import { buildMotivationContext } from './items/motivation-ogg-dude.mjs'
import { logger } from '../utils/logger.mjs'
import { withRetry } from './utils/retry.mjs'
import { markArchiveSize, markGlobalEnd, markGlobalStart, recordDomainEnd, recordDomainStart } from './utils/global-import-metrics.mjs'
import { getSpecializationImportStats } from './utils/specialization-import-utils.mjs'
import { getCombinedSpecializationImportStats } from './utils/specialization-tree-import-utils.mjs'
import { getMotivationImportStats, getMotivationCategoryImportStats } from './utils/motivation-import-utils.mjs'
import { buildDutyContext } from './items/duty-ogg-dude.mjs'
import { getDutyImportStats } from './utils/duty-import-utils.mjs'
import { resetFolderCache } from './utils/oggdude-import-folders.mjs'
import { createImportSession, buildExecutionPlan, publishTalentReferences } from './utils/import-session.mjs'

/**
 * Build the enriched pipeline registry with explicit dependency declarations.
 * Each entry declares:
 *  - id: unique pipeline identifier
 *  - domain: user-facing domain key
 *  - type: Foundry item type produced
 *  - contextBuilder: async builder function
 *  - dependsOn: mandatory dependencies (hard ordering)
 *  - softDependsOn: preferred ordering (not blocking)
 *  - producesReferences: reference types published to the session index
 *
 * @returns {Map<string, import('./utils/import-session.mjs').PipelineDescriptor[]>}
 */
function buildContextRegistry() {
  return new Map([
    [
      'weapon',
      [
        {
          id: 'weapon',
          domain: 'weapon',
          type: 'weapon',
          contextBuilder: buildWeaponContext,
          dependsOn: [],
          softDependsOn: [],
          producesReferences: [],
        },
      ],
    ],
    [
      'armor',
      [
        {
          id: 'armor',
          domain: 'armor',
          type: 'armor',
          contextBuilder: buildArmorContext,
          dependsOn: [],
          softDependsOn: [],
          producesReferences: [],
        },
      ],
    ],
    [
      'gear',
      [
        {
          id: 'gear',
          domain: 'gear',
          type: 'gear',
          contextBuilder: buildGearContext,
          dependsOn: [],
          softDependsOn: [],
          producesReferences: [],
        },
      ],
    ],
    [
      'talent',
      [
        {
          id: 'talent',
          domain: 'talent',
          type: 'talent',
          contextBuilder: buildTalentContext,
          dependsOn: [],
          softDependsOn: [],
          producesReferences: ['talent.oggdudeKey', 'talent.system.id', 'talent.uuid'],
        },
      ],
    ],
    [
      'species',
      [
        {
          id: 'species',
          domain: 'species',
          type: 'species',
          contextBuilder: buildSpeciesContext,
          dependsOn: ['talent'],
          softDependsOn: [],
          producesReferences: ['species.oggdudeKey', 'species.uuid'],
        },
      ],
    ],
    [
      'career',
      [
        {
          id: 'career',
          domain: 'career',
          type: 'career',
          contextBuilder: buildCareerContext,
          dependsOn: [],
          softDependsOn: [],
          producesReferences: [],
        },
      ],
    ],
    [
      'obligation',
      [
        {
          id: 'obligation',
          domain: 'obligation',
          type: 'obligation',
          contextBuilder: buildObligationContext,
          dependsOn: [],
          softDependsOn: [],
          producesReferences: [],
        },
      ],
    ],
    [
      'specialization',
      [
        {
          id: 'specialization',
          domain: 'specialization',
          type: 'specialization',
          contextBuilder: buildSpecializationContext,
          dependsOn: [],
          softDependsOn: [],
          producesReferences: [],
        },
        {
          id: 'specialization-tree',
          domain: 'specialization',
          type: 'specialization-tree',
          contextBuilder: buildSpecializationTreeContext,
          dependsOn: ['talent'],
          softDependsOn: ['career', 'specialization'],
          producesReferences: ['specialization-tree.specializationId', 'specialization-tree.uuid'],
        },
      ],
    ],
    [
      'motivation-category',
      [
        {
          id: 'motivation-category',
          domain: 'motivation-category',
          type: 'motivation-category',
          contextBuilder: buildMotivationCategoryContext,
          dependsOn: [],
          softDependsOn: [],
          producesReferences: [],
        },
      ],
    ],
    [
      'motivation',
      [
        {
          id: 'motivation',
          domain: 'motivation',
          type: 'motivation',
          contextBuilder: buildMotivationContext,
          dependsOn: [],
          softDependsOn: ['motivation-category'],
          producesReferences: [],
        },
      ],
    ],
    [
      'duty',
      [
        {
          id: 'duty',
          domain: 'duty',
          type: 'duty',
          contextBuilder: buildDutyContext,
          dependsOn: [],
          softDependsOn: [],
          producesReferences: [],
        },
      ],
    ],
  ])
}

/**
 * Return the import statistics payload for the given domain identifier.
 * @param {string} domain
 */
function getDomainStatsPayload(domain) {
  if (domain === 'specialization') {
    return getCombinedSpecializationImportStats(getSpecializationImportStats(), getSpecializationTreeImportStats())
  }
  if (domain === 'motivation') return getMotivationImportStats()
  if (domain === 'motivation-category') return getMotivationCategoryImportStats()
  if (domain === 'duty') return getDutyImportStats()
  return undefined
}

export default class OggDudeImporter {
  /**
   * Map a String value, if it is not present, return an empty string.
   * @param {string} label The label of the element.
   * @param {string} value The value of the element.
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
   * @param {string} value The value of the element.
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
   * @param {string} label The label of the element.
   * @param {string} value The value of the element.
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
   * @param {string} value The value of the element.
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
   * @param {string} label The label of the element.
   * @param {string} value The value of the element.
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
   * @param {string} value The value of the element.
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
   * @param {Array} value The value of the element.
   * @param {Function} mapper The function to map the value.
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
   * @param {Object} value The value of the element.
   * @param {Function} mapper The function to map the value.
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
   * @param {File} importedFile The imported file.
   * @param {Object[]} domains The list of domains to import from the OggDude File.
   * @param {Object} [options] Options supplémentaires
   * @param {function(Object):void} [options.progressCallback] Callback appelé à chaque étape (payload: {total, processed, domain?, phase, reason?, error?, domainStats?})
   * @param {boolean} options.importToCompendium
   * @returns {Promise<void>} A Promise that resolves when the Armor data has been processed.
   * @async
   * @public
   * @function
   * @name _processOggDudeData
   */
  static async processOggDudeData(importedFile, domains, { progressCallback, importToCompendium = false } = {}) {
    /* --------------------------------------------- GÉNÉRIQUE ------------------------------------------------------------------- */

    // Step 0: Reset folder cache for new import session
    resetFolderCache()
    logger.debug('[ProcessOggDudeData] - Step 0: Folder cache reset')

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
    const buildContextMap = buildContextRegistry()

    const domainsToImport = domains.filter((domain) => domain.checked).map((domain) => domain.id)
    const unsupportedDomains = domainsToImport.filter((id) => !buildContextMap.has(id))
    if (unsupportedDomains.length > 0) {
      logger.warn('[ProcessOggDudeData] Domaines demandés non supportés', { unsupportedDomains })
      const unsupportedDomainsStr = unsupportedDomains.map((domain) => domain).join(',')
      ui.notifications.warn(game.i18n.format('SETTINGS.OggDudeDataImporter.loadWindow.user-message.domain-unsupported:', unsupportedDomainsStr))
    }
    logger.debug('[ProcessOggDudeData] -Step 3.3: Domains to Import >', domainsToImport)

    // Build execution plan with topological sort on hard dependencies
    const sortedPipelines = buildExecutionPlan(domainsToImport, buildContextMap)
    logger.info('[ProcessOggDudeData] Execution plan after topological sort', {
      order: sortedPipelines.map((p) => p.id),
    })

    // Create a shared import session for cross-pipeline reference resolution
    const importSession = createImportSession()
    importSession.executionOrder = sortedPipelines.map((p) => p.id)

    // Group sorted pipelines back by domain for progress reporting
    const domainOrder = []
    const pipelinesByDomain = new Map()
    for (const pipeline of sortedPipelines) {
      if (!pipelinesByDomain.has(pipeline.domain)) {
        pipelinesByDomain.set(pipeline.domain, [])
        domainOrder.push(pipeline.domain)
      }
      pipelinesByDomain.get(pipeline.domain).push(pipeline)
    }

    const contextEntries = domainOrder.map((domain) => ({ domain, pipelines: pipelinesByDomain.get(domain) }))
    const total = contextEntries.length
    let processed = 0
    const completedDomains = []

    // Logs de diagnostic pour vérifier la configuration du pipeline
    logger.info('[ProcessOggDudeData] DIAGNOSTIC - Pipeline initialization', {
      contextEntriesCount: contextEntries.length,
      contextEntriesTypes: contextEntries.map((e) => e.domain),
      domainsToImport,
      buildContextMapKeys: Array.from(buildContextMap.keys()),
      hasSpecialization: buildContextMap.has('specialization'),
      specializationInEntries: contextEntries.some((e) => e.domain === 'specialization'),
    })

    const emitProgress = (payload) => {
      if (typeof progressCallback !== 'function') return
      try {
        progressCallback({ total, ...payload })
      } catch (e) {
        logger.warn('[ProcessOggDudeData] progressCallback error ignoré', { error: e })
      }
    }
    emitProgress({ processed, phase: 'init' })
    for (const entry of contextEntries) {
      recordDomainStart(entry.domain)
      emitProgress({ processed, domain: entry.domain, phase: 'start' })
      try {
        let ranAtLeastOnePipeline = false
        for (const pipeline of entry.pipelines) {
          const context = await withRetry(() => pipeline.contextBuilder(zip, groupByDirectory, groupByType, importSession), {
            shouldRetry: (err) => /parse|XML|network/i.test(err?.message || ''),
          })
          const datasetSize = Array.isArray(context?.jsonData) ? context.jsonData.filter((el) => el != null).length : 0

          logger.info('[ProcessOggDudeData] Context créé', {
            domain: entry.domain,
            pipelineType: pipeline.type,
            datasetSize,
            hasMapper: typeof context?.element?.mapper === 'function',
            jsonDataSample: context?.jsonData?.slice(0, 2),
          })

          logger.debug('[ProcessOggDudeData] - Step 3.4: Context >', { domain: entry.domain, pipelineType: pipeline.type, datasetSize })
          if (datasetSize === 0) {
            logger.warn('[ProcessOggDudeData] Domaine sans données, import ignoré', { domain: entry.domain, pipelineType: pipeline.type })
            continue
          }

          logger.info('[ProcessOggDudeData] AVANT processElements', {
            domain: entry.domain,
            pipelineType: pipeline.type,
            contextKeys: Object.keys(context || {}),
            elementKeys: Object.keys(context?.element || {}),
          })

          const created = await withRetry(() => OggDudeDataElement.processElements(context, { importToCompendium }), {
            shouldRetry: (err) => /database|upload|parse/i.test(err?.message || ''),
          })

          // Publish references after talent pipeline so dependent pipelines can resolve UUIDs
          if (pipeline.type === 'talent' && Array.isArray(created) && created.length > 0) {
            publishTalentReferences(importSession, created)
            logger.info('[ProcessOggDudeData] Talent references published to session index', {
              count: created.length,
              byOggdudeKeyCount: importSession.referenceIndex.talent.byOggdudeKey.size,
              bySystemIdCount: importSession.referenceIndex.talent.bySystemId.size,
            })
          }

          // Track created documents in session
          const pipelineCreated = importSession.createdByPipeline.get(pipeline.id) ?? []
          if (Array.isArray(created)) {
            pipelineCreated.push(...created)
          }
          importSession.createdByPipeline.set(pipeline.id, pipelineCreated)

          ranAtLeastOnePipeline = true

          logger.info('[ProcessOggDudeData] APRÈS processElements', {
            domain: entry.domain,
            pipelineType: pipeline.type,
          })
        }

        if (!ranAtLeastOnePipeline) {
          emitProgress({
            processed,
            domain: entry.domain,
            phase: 'skipped',
            reason: 'empty-data',
            domainStats: getDomainStatsPayload(entry.domain),
          })
          continue
        }

        processed += 1
        completedDomains.push(entry.domain)
        const domainStatsPayload = getDomainStatsPayload(entry.domain)
        if (entry.domain === 'specialization') {
          logger.info('[SpecializationImporter] Statistiques après import', { stats: domainStatsPayload })
        }
        emitProgress({ processed, domain: entry.domain, phase: 'completed', domainStats: domainStatsPayload })
      } catch (error) {
        logger.error('[ProcessOggDudeData] Échec import domaine', { domain: entry.domain, error })
        emitProgress({ processed, domain: entry.domain, phase: 'error', error: error?.message })
      } finally {
        recordDomainEnd(entry.domain)
      }
    }

    // Log session diagnostics: unresolved references summary
    if (importSession.unresolvedReferences.length > 0) {
      logger.warn('[ProcessOggDudeData] Unresolved cross-pipeline references after import', {
        count: importSession.unresolvedReferences.length,
        details: importSession.unresolvedReferences.slice(0, 20),
      })
    }

    Hooks.callAll('oggdudeImport.completed', { processed, total, domains: completedDomains })
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
    const buildContextMap = buildContextRegistry()

    const domainsToImport = new Set(domains.filter((d) => d.checked).map((d) => d.id))
    const contextEntries = Array.from(buildContextMap.entries())
      .filter(([domain]) => domainsToImport.has(domain))
      .map(([domain, pipelines]) => ({ domain, pipelines }))

    const previews = {}
    for (const entry of contextEntries) {
      const existingSet = new Set()
      try {
        const existing = globalThis.game?.items?.contents ?? []
        for (const it of existing) {
          if (it?.type && it?.name) existingSet.add(`${it.type}::${it.name}`)
        }
      } catch (e) {
        logger.debug('[OggDudeImporter] preload existence check skipped (no Foundry runtime)', { error: e })
      }

      const previewItems = []
      for (const pipeline of entry.pipelines) {
        const context = await pipeline.contextBuilder(zip, groupByDirectory, groupByType)
        const items = OggDudeDataElement._buildItemElements(context.jsonData, context.element.mapper)
        previewItems.push(
          ...items.map((it) => ({
            ...it,
            preview: true,
            exists: existingSet.has(`${it.type}::${it.name}`),
          })),
        )
      }

      previews[entry.domain] = previewItems
    }

    return previews
  }

  /**
   * Load an OggDude zip archive and return its entries keyed by path.
   * @param {File} file File (Zip file path) from OGGDude https://www.swrpgcommunity.com/gm-resources/apps-dice-utilities/oggdudes-generator
   * @returns {Promise<{[p: string]: JSZip.JSZipObject}>}
   */
  async load(file) {
    const lib = await import('jszip').then((m) => m.default || m)
    return lib.loadAsync(file)
  }

  /* -------------------------------------------- */
}
