import { buildArmorImgWorldPath, buildItemImgSystemPath } from '../../settings/directories.mjs'
import OggDudeImporter from '../oggDude.mjs'
import OggDudeDataElement from '../../settings/models/OggDudeDataElement.mjs'
import { logger } from '../../utils/logger.mjs'
import { SYSTEM } from '../../config/system.mjs'
import { mapOggDudeSkillCodes } from '../mappings/oggdude-skill-map.mjs'
import {
  resetSpeciesImportStats,
  incrementSpeciesImportStat,
  getSpeciesImportStats,
  addSpeciesUnknownTalent,
  FLAG_STRICT_SPECIES_VALIDATION,
} from '../utils/species-import-utils.mjs'
import { resolveTalentKeysFromSession } from '../utils/import-session.mjs'

/**
 * Species Array Mapper : Map the Species XML data to the SwerpgSpecies object array.
 * @param species {Array} The Species data from the XML file.
 * @param {import('../utils/import-session.mjs').ImportSession|null} [importSession] - Optional shared import session for cross-pipeline resolution.
 * @returns {Array} The SwerpgSpecies object array.
 * @public
 * @function
 * @name speciesMapper
 */
export function speciesMapper(species, importSession = null) {
  // Réinitialiser les statistiques à chaque session de mapping (comportement identique à weaponMapper)
  resetSpeciesImportStats()

  const mapped = species.map((xmlSpecies) => {
    // Incrémenter le compteur total dès le début du traitement de l'espèce
    incrementSpeciesImportStat('total')

    // Base characteristics
    const characteristics = {
      brawn: OggDudeImporter.mapMandatoryNumber('species.StartingChars.Brawn', xmlSpecies?.StartingChars?.Brawn),
      agility: OggDudeImporter.mapMandatoryNumber('species.StartingChars.Agility', xmlSpecies?.StartingChars?.Agility),
      intellect: OggDudeImporter.mapMandatoryNumber('species.StartingChars.Intellect', xmlSpecies?.StartingChars?.Intellect),
      cunning: OggDudeImporter.mapMandatoryNumber('species.StartingChars.Cunning', xmlSpecies?.StartingChars?.Cunning),
      willpower: OggDudeImporter.mapMandatoryNumber('species.StartingChars.Willpower', xmlSpecies?.StartingChars?.Willpower),
      presence: OggDudeImporter.mapMandatoryNumber('species.StartingChars.Presence', xmlSpecies?.StartingChars?.Presence),
    }

    // Thresholds & experience
    const woundThreshold = {
      modifier: OggDudeImporter.mapMandatoryNumber('species.StartingAttrs.WoundThreshold', xmlSpecies?.StartingAttrs?.WoundThreshold),
      abilityKey: 'brawn',
    }
    const strainThreshold = {
      modifier: OggDudeImporter.mapMandatoryNumber('species.StartingAttrs.StrainThreshold', xmlSpecies?.StartingAttrs?.StrainThreshold),
      abilityKey: 'willpower',
    }
    const startingExperience = OggDudeImporter.mapMandatoryNumber('species.StartingAttrs.Experience', xmlSpecies?.StartingAttrs?.Experience)

    // Free skills: top-level SkillModifiers + SkillModifiers imbriqués dans OptionChoices.Options.Option
    const topLevelSkillModifiers = OggDudeImporter.mapOptionalArray(xmlSpecies?.SkillModifiers?.SkillModifier, (skill) => ({
      rawKey: OggDudeImporter.mapOptionalString(skill?.Key),
      rankStart: OggDudeImporter.mapOptionalNumber(skill?.RankStart),
      rankAdd: OggDudeImporter.mapOptionalNumber(skill?.RankAdd),
      isCareer: OggDudeImporter.mapOptionalBoolean(skill?.IsCareer),
    }))

    // Parcours des OptionChoices pour extraire d'éventuels SkillModifiers
    const nestedSkillModifiers = collectNestedOptionSkillModifiers(xmlSpecies)

    const skillModifiersRaw = [...topLevelSkillModifiers, ...nestedSkillModifiers]
    // Détermination des codes à transformer (conditions de gratuité)
    const oggCodes = skillModifiersRaw
      .filter((s) => s.rankStart > 0 || s.rankAdd > 0 || s.isCareer)
      .map((s) => s.rawKey)
      .filter((k) => !!k)
    const freeSkills = mapOggDudeSkillCodes(oggCodes)
    // Validation finale par rapport au set de choix du modèle (SYSTEM.SKILLS). On garde seulement les ids connus.
    const validFreeSkills = freeSkills.filter((id) => SYSTEM.SKILLS[id])

    // Free talents: extract OggDude keys first, then attempt UUID resolution
    const talentModifiers = OggDudeImporter.mapOptionalArray(xmlSpecies?.TalentModifiers?.TalentModifier, (tal) => ({
      key: OggDudeImporter.mapMandatoryString('species.TalentModifiers.TalentModifier.Key', tal?.Key),
    }))
    const freeTalentKeys = talentModifiers.map((t) => t.key).filter((k) => !!k)

    let resolvedUUIDs, unresolvedKeys
    if (importSession) {
      // Session-based resolution: uses batch-created talents from the current import
      ;({ resolvedUUIDs, unresolvedKeys } = resolveTalentKeysFromSession(importSession, freeTalentKeys, xmlSpecies?.Key ?? ''))
    } else {
      // Fallback: legacy resolution via game.items and game.packs only
      ;({ resolvedUUIDs, unresolvedKeys } = resolveTalentUUIDs(freeTalentKeys))
    }

    // Track unresolved talent keys in diagnostics
    for (const key of unresolvedKeys) {
      addSpeciesUnknownTalent(key)
      logger.warn('[SpeciesImporter] Talent key could not be resolved to UUID — stored in flags for reconciliation', {
        key,
        speciesKey: xmlSpecies?.Key,
      })
    }

    const speciesKey = OggDudeImporter.mapMandatoryString('species.Key', xmlSpecies.Key)
    const speciesName = OggDudeImporter.mapMandatoryString('species.Name', xmlSpecies?.Name)

    const speciesObject = {
      key: speciesKey,
      name: speciesName,
      // system holds all TypeDataModel-validated fields
      system: {
        description: OggDudeImporter.mapOptionalString(xmlSpecies?.Description),
        // Backward compatibility with previous importer structure
        startingChars: { ...characteristics },
        startingAttrs: {
          woundThreshold: woundThreshold.modifier,
          strainThreshold: strainThreshold.modifier,
          experience: startingExperience,
        },
        characteristics,
        woundThreshold,
        strainThreshold,
        startingExperience,
        freeSkills: validFreeSkills,
        freeTalents: resolvedUUIDs,
      },
      flags: {
        swerpg: {
          oggdudeKey: speciesKey,
          oggdude: {
            // Preserve source OggDude talent keys for post-import reconciliation
            freeTalentKeys,
          },
        },
      },
    }

    // (Extension future) Validation stricte éventuelle -> rejet (non implémenté pour le moment)
    if (FLAG_STRICT_SPECIES_VALIDATION === true) {
      // Place-holder pour logique de rejet configurable; si ajoutée on incrémentera 'rejected'
    }

    return speciesObject
  })

  logger.debug('[SpeciesImporter] Statistiques après mapping', { stats: getSpeciesImportStats() })
  return mapped
}

/**
 * Extrait tous les SkillModifiers imbriqués dans OptionChoices.Options.Option
 * en retournant un tableau uniforme d'objets {rawKey, rankStart, rankAdd, isCareer}
 * @param {object} xmlSpecies
 * @returns {Array<{rawKey:string,rankStart:number,rankAdd:number,isCareer:boolean}>}
 */
function collectNestedOptionSkillModifiers(xmlSpecies) {
  const rawChoices = xmlSpecies?.OptionChoices?.OptionChoice
  if (!rawChoices) return []
  const choiceArray = Array.isArray(rawChoices) ? rawChoices : [rawChoices]
  return choiceArray.flatMap(extractOptionsSkillModifiers)
}

function extractOptionsSkillModifiers(choice) {
  const rawOptions = choice?.Options?.Option
  if (!rawOptions) return []
  const optArray = Array.isArray(rawOptions) ? rawOptions : [rawOptions]
  return optArray.flatMap(extractSkillModifiersFromOption)
}

function extractSkillModifiersFromOption(opt) {
  const rawSkillMods = opt?.SkillModifiers?.SkillModifier
  if (!rawSkillMods) return []
  const modsArray = Array.isArray(rawSkillMods) ? rawSkillMods : [rawSkillMods]
  return modsArray.map((mod) => ({
    rawKey: OggDudeImporter.mapOptionalString(mod?.Key),
    rankStart: OggDudeImporter.mapOptionalNumber(mod?.RankStart),
    rankAdd: OggDudeImporter.mapOptionalNumber(mod?.RankAdd),
    isCareer: OggDudeImporter.mapOptionalBoolean(mod?.IsCareer),
  }))
}

/**
 * Try to resolve talent OggDude keys into Foundry UUIDs.
 * Returns both resolved UUIDs and any keys that could not be resolved.
 * Falls back gracefully if the game context is not ready.
 * @param {string[]} keys - OggDude talent keys (e.g. 'CONV')
 * @returns {{ resolvedUUIDs: string[], unresolvedKeys: string[] }}
 */
function resolveTalentUUIDs(keys) {
  if (typeof game === 'undefined' || !Array.isArray(keys)) {
    return { resolvedUUIDs: [], unresolvedKeys: keys ?? [] }
  }
  const resolvedUUIDs = []
  const unresolvedKeys = []

  for (const key of keys) {
    if (!key) continue

    const direct = game.items?.find((i) => i.type === 'talent' && (i.getFlag?.('swerpg', 'oggdudeKey') === key || i.system?.key === key || i.name === key))
    if (direct) {
      resolvedUUIDs.push(direct.uuid)
      continue
    }

    const packMatch = [...(game.packs?.values?.() || [])]
      .filter((p) => p.documentName === 'Item' && /talent/i.test(p.title))
      .find((p) => p.index?.find((e) => e.type === 'talent' && (e.flags?.swerpg?.oggdudeKey === key || e.name === key)))

    if (packMatch) {
      const idx = packMatch.index.find((e) => e.type === 'talent' && (e.flags?.swerpg?.oggdudeKey === key || e.name === key))
      if (idx) {
        resolvedUUIDs.push(`Compendium.${packMatch.collection}.${idx._id}`)
        continue
      }
    }

    unresolvedKeys.push(key)
  }

  return { resolvedUUIDs, unresolvedKeys }
}

/**
 * Create the Species Context for the OggDude Data Import
 * @param zip
 * @param groupByDirectory
 * @param groupByType
 * @param {import('../utils/import-session.mjs').ImportSession|null} [importSession] - Optional shared import session for cross-pipeline resolution.
 * @returns {{zip: {elementFileName: string, directories, content}, image: {images: (string|((buffer: Buffer, options?: ansiEscapes.ImageOptions) => string)|number|[OggDudeDataElement]|[OggDudeDataElement,OggDudeDataElement]|[OggDudeDataElement,OggDudeDataElement]|OggDudeContextImage|*), criteria: string, systemPath: string, worldPath: string}, folder: {name: string, type: string}, element: {jsonCriteria: string, mapper: *, type: string}}}
 * @public
 * @function
 */
export async function buildSpeciesContext(zip, groupByDirectory, groupByType, importSession = null) {
  logger.debug('[SpeciesImporter] Building Species context', { groupByDirectoryCount: groupByDirectory.length, groupByType, hasZip: !!zip })

  return {
    jsonData: await OggDudeDataElement.buildJsonDataFromDirectory(zip, groupByType.xml, 'Species', 'Species'),
    zip: {
      folderName: 'Species',
      elementFileName: '*.xml',
      content: zip,
      directories: groupByDirectory,
    },
    image: {
      criteria: 'Data/SpeciesImages',
      worldPath: buildArmorImgWorldPath('species'),
      systemPath: buildItemImgSystemPath('species.svg'),
      images: groupByType.image,
      prefix: '',
    },
    folder: {
      name: 'Swerpg - Species',
      type: 'Item',
    },
    element: {
      jsonCriteria: 'Species.Species',
      mapper: (species) => speciesMapper(species, importSession),
      type: 'species',
    },
  }
}

// Export utilitaires stats pour tests & agrégation (alignement avec armor/weapon)
export { getSpeciesImportStats, resetSpeciesImportStats } from '../utils/species-import-utils.mjs'
