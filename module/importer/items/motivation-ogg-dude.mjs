import {buildItemImgSystemPath} from '../../settings/directories.mjs'
import OggDudeImporter from '../oggDude.mjs'
import OggDudeDataElement from '../../settings/models/OggDudeDataElement.mjs'
import {logger} from '../../utils/logger.mjs'
import {sanitizeDescription} from "../utils/text.mjs";

/**
 * Map OggDude Motivation XML data to Foundry Item creation objects.
 * Motivations in the system have fields: description, category.
 * OggDude XML provides: Key, Name, Description, Source/Sources, Motivation (Category Name).
 *
 * @param {Array} motivations - Raw XML motivation entries from OggDude data
 * @returns {Array} Array of item source objects { name, type, system, flags }
 * @public
 * @function
 * @name motivationMapper
 */
export function motivationMapper(motivations) {
    if (!Array.isArray(motivations)) {
        logger.warn('[MotivationImporter] Invalid input: expected array', {motivations})
        return []
    }
    const mapped = []
    for (const xmlMotivation of motivations) {
        if (!xmlMotivation || typeof xmlMotivation !== 'object') {
            continue
        }

        try {
            // Extract mandatory fields with validation
            const name = OggDudeImporter.mapMandatoryString('motivation.Name', xmlMotivation.Name)
            const key = OggDudeImporter.mapMandatoryString('motivation.Key', xmlMotivation.Key)

            // Skip if mandatory fields are missing
            if (!name || !key) {
                logger.warn('[MotivationImporter] Skipping motivation with missing mandatory fields', {
                    name,
                    key,
                })
                continue
            }

            logger.debug('[MotivationImporter] Mapping motivation', {
                key,
                name,
                hasDescription: !!xmlMotivation.Description,
                hasSource: !!xmlMotivation.Source,
                hasSources: !!xmlMotivation.Sources,
                category: xmlMotivation.categoryKey
            })

            // Extract optional description
            const description = sanitizeDescription(OggDudeImporter.mapOptionalString(xmlMotivation.Description))
            const category = OggDudeImporter.mapOptionalString(xmlMotivation.categoryKey)

            // Build system object
            const system = {
                description,
                category
            }

            // Build flags for traceability
            const swerpgFlags = {
                oggdudeKey: key,
            }

            // Store source information if available
            if (xmlMotivation.Source) {
                swerpgFlags.oggdudeSource = OggDudeImporter.mapOptionalString(xmlMotivation.Source)
            } else if (xmlMotivation.Sources?.Source) {
                // Handle multiple sources - store as array
                const sources = Array.isArray(xmlMotivation.Sources.Source)
                    ? xmlMotivation.Sources.Source
                    : [xmlMotivation.Sources.Source]
                swerpgFlags.oggdudeSources = sources.map((s) => OggDudeImporter.mapOptionalString(s))
            }

            const item = {
                name,
                type: 'motivation',
                system,
                flags: {
                    swerpg: swerpgFlags,
                },
            }

            mapped.push(item)

            logger.debug('[MotivationImporter] Successfully mapped motivation', {
                key,
                name,
            })
        } catch (error) {
            logger.error('[MotivationImporter] Error mapping motivation', {
                name: xmlMotivation?.Name || 'unknown',
                key: xmlMotivation?.Key || 'unknown',
                error: error.message,
            })
        }
    }

    return mapped
}

/**
 * Build the Motivation context for the importer process.
 * Defines how to load, parse, and map Motivations.xml and SpecificMotivations.xml from OggDude data.
 *
 * @param {JSZip} zip - The OggDude ZIP archive
 * @param {Array} groupByDirectory - Elements grouped by directory path
 * @param {Object} groupByType - Elements grouped by file type
 * @returns {Promise<Object>} Context object with jsonData, zip, image, folder, and element configuration
 * @public
 * @function
 * @name buildMotivationContext
 */
export async function buildMotivationContext(zip, groupByDirectory, groupByType) {
    logger.debug('[MotivationImporter] Building Motivation context', {
        groupByDirectoryCount: groupByDirectory.length,
        hasZip: !!zip,
    })

    // 1. Load Categories (Motivations.xml)
    const categoriesData = await OggDudeDataElement.buildJsonDataFromFile(zip, groupByDirectory, 'Motivations.xml', 'Motivations.Motivation')
    const categoryMap = new Map()

    if (Array.isArray(categoriesData)) {
        categoriesData.forEach(cat => {
            if (cat.Name && cat.Key) {
                categoryMap.set(cat.Name, cat.Key)
            }
        })
    } else if (categoriesData?.Name && categoriesData?.Key) {
         categoryMap.set(categoriesData.Name, categoriesData.Key)
    }

    logger.debug('[MotivationImporter] Loaded categories', { count: categoryMap.size })

    // 2. Load Specific Motivations (SpecificMotivations.xml)
    let specificMotivationsData = await OggDudeDataElement.buildJsonDataFromFile(zip, groupByDirectory, 'SpecificMotivations.xml', 'SpecificMotivations.SpecificMotivation')

    // Ensure array
    if (!Array.isArray(specificMotivationsData) && specificMotivationsData) {
        specificMotivationsData = [specificMotivationsData]
    } else if (!specificMotivationsData) {
        specificMotivationsData = []
    }

    // 3. Merge Category Key into Specific Motivations
    const mergedData = specificMotivationsData.map(motivation => {
        const categoryName = motivation.Motivation
        const categoryKey = categoryMap.get(categoryName)
        
        if (!categoryKey) {
            logger.warn('[MotivationImporter] Category not found for motivation', { motivationName: motivation.Name, categoryName })
        }

        return {
            ...motivation,
            categoryKey: categoryKey || ''
        }
    })

    logger.info('[MotivationImporter] Merged specific motivations with categories', { 
        total: mergedData.length,
        sample: mergedData[0]
    })

    return {
        // Use the merged data
        jsonData: mergedData,

        // ZIP metadata (using SpecificMotivations.xml as the primary file for context, though we used both)
        zip: {
            elementFileName: 'SpecificMotivations.xml',
            content: zip,
            directories: groupByDirectory,
        },

        // Image configuration
        image: {
            criteria: 'Data/MotivationImages', // Unlikely to exist but kept for consistency
            worldPath: 'modules/swerpg/assets/images/motivations/',
            systemPath: buildItemImgSystemPath('motivation.svg'), // Fallback icon
            images: groupByType.image || [],
            prefix: 'Motivation',
        },

        // Foundry folder destination
        folder: {
            name: 'Swerpg - Motivations',
            type: 'Item',
        },

        // Mapping configuration
        element: {
            jsonCriteria: 'SpecificMotivations.SpecificMotivation', // Not strictly used since we passed jsonData directly
            mapper: motivationMapper,
            type: 'motivation',
        },
    }
}
