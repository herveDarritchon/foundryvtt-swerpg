import { buildArmorImgWorldPath, buildItemImgSystemPath } from "../../settings/directories.mjs";
import OggDudeImporter from "../oggDude.mjs";
import OggDudeDataElement from "../../settings/models/OggDudeDataElement.mjs";
import { logger } from '../../utils/logger.mjs'
import { SYSTEM } from '../../config/system.mjs'

/**
 * Species Array Mapper : Map the Species XML data to the SwerpgArmor object array.
 * @param species {Array} The Species data from the XML file.
 * @returns {Array} The SwerpgSpecies object array.
 * @public
 * @function
 * @name speciesMapper
 */
export function speciesMapper(species) {
  return species.map((xmlSpecies) => {
    // Base characteristics
    const characteristics = {
      brawn: OggDudeImporter.mapMandatoryNumber("species.StartingChars.Brawn", xmlSpecies?.StartingChars?.Brawn),
      agility: OggDudeImporter.mapMandatoryNumber("species.StartingChars.Agility", xmlSpecies?.StartingChars?.Agility),
      intellect: OggDudeImporter.mapMandatoryNumber("species.StartingChars.Intellect", xmlSpecies?.StartingChars?.Intellect),
      cunning: OggDudeImporter.mapMandatoryNumber("species.StartingChars.Cunning", xmlSpecies?.StartingChars?.Cunning),
      willpower: OggDudeImporter.mapMandatoryNumber("species.StartingChars.Willpower", xmlSpecies?.StartingChars?.Willpower),
      presence: OggDudeImporter.mapMandatoryNumber("species.StartingChars.Presence", xmlSpecies?.StartingChars?.Presence)
    }

    // Thresholds & experience
    const woundThreshold = {
      modifier: OggDudeImporter.mapMandatoryNumber("species.StartingAttrs.WoundThreshold", xmlSpecies?.StartingAttrs?.WoundThreshold),
      abilityKey: 'brawn'
    }
    const strainThreshold = {
      modifier: OggDudeImporter.mapMandatoryNumber("species.StartingAttrs.StrainThreshold", xmlSpecies?.StartingAttrs?.StrainThreshold),
      abilityKey: 'willpower'
    }
    const startingExperience = OggDudeImporter.mapMandatoryNumber("species.StartingAttrs.Experience", xmlSpecies?.StartingAttrs?.Experience)

    // Free skills: choose modifiers where rankStart>0 OR rankAdd>0 OR isCareer true
    const skillModifiers = OggDudeImporter.mapOptionalArray(
      xmlSpecies?.SkillModifiers?.SkillModifier,
      (skill) => ({
        key: OggDudeImporter.mapOptionalString(skill?.Key),
        rankStart: OggDudeImporter.mapOptionalNumber(skill?.RankStart),
        rankAdd: OggDudeImporter.mapOptionalNumber(skill?.RankAdd),
        isCareer: OggDudeImporter.mapOptionalBoolean(skill?.IsCareer)
      })
    )
    const freeSkills = [...new Set(skillModifiers
      .filter((s) => (s.rankStart > 0 || s.rankAdd > 0 || s.isCareer))
      .map((s) => s.key)
      .filter((k) => !!k))]

    // Free talents: map keys to UUIDs if available
    const talentModifiers = OggDudeImporter.mapOptionalArray(
      xmlSpecies?.TalentModifiers?.TalentModifier,
      (tal) => ({
        key: OggDudeImporter.mapMandatoryString("species.TalentModifiers.TalentModifier.Key", tal?.Key)
      })
    )
    const freeTalents = resolveTalentUUIDs(talentModifiers.map((t) => t.key))

    return {
      key: OggDudeImporter.mapMandatoryString("species.Key", xmlSpecies.Key),
      name: OggDudeImporter.mapMandatoryString("species.Name", xmlSpecies?.Name),
      description: OggDudeImporter.mapOptionalString(xmlSpecies?.Description),
      // Backward compatibility with previous importer structure
      startingChars: { ...characteristics },
      startingAttrs: {
        woundThreshold: woundThreshold.modifier,
        strainThreshold: strainThreshold.modifier,
        experience: startingExperience
      },
      characteristics,
      woundThreshold,
      strainThreshold,
      startingExperience,
      freeSkills,
      freeTalents
    }
  })
}

/**
 * Try to resolve talent keys into Foundry UUIDs.
 * Falls back to empty array if game context not ready.
 * @param {string[]} keys
 * @returns {string[]}
 */
function resolveTalentUUIDs(keys) {
  if (typeof game === 'undefined') return []
  const uuids = []
  for (const key of keys) {
    if (!key) continue
    // Search in loaded items first
    const found = game.items?.find((i) => i.type === 'talent' && (i.getFlag?.('swerpg', 'oggdudeKey') === key || i.system?.key === key || i.name === key))
    if (found) {
      uuids.push(found.uuid)
      continue
    }
    // Search packs
    for (const pack of game.packs?.values?.() || []) {
      if (pack.documentName !== 'Item') continue
      // Only search talent packs
      if (!/talent/i.test(pack.title)) continue
      const index = pack.index?.find((e) => e.type === 'talent' && (e.flags?.swerpg?.oggdudeKey === key || e.name === key))
      if (index) {
        uuids.push(`Compendium.${pack.collection}.${index._id}`)
        break
      }
    }
  }
  return uuids
}


/**
 * Create the Species Context for the OggDude Data Import
 * @param zip
 * @param groupByDirectory
 * @param groupByType
 * @returns {{zip: {elementFileName: string, directories, content}, image: {images: (string|((buffer: Buffer, options?: ansiEscapes.ImageOptions) => string)|number|[OggDudeDataElement]|[OggDudeDataElement,OggDudeDataElement]|[OggDudeDataElement,OggDudeDataElement]|OggDudeContextImage|*), criteria: string, systemPath: string, worldPath: string}, folder: {name: string, type: string}, element: {jsonCriteria: string, mapper: *, type: string}}}
 * @public
 * @function
 */
export async function buildSpeciesContext(zip, groupByDirectory, groupByType) {

    logger.debug('[SpeciesImporter] Building Species context', { groupByDirectoryCount: groupByDirectory.length, groupByType, hasZip: !!zip });

    return {
        jsonData: await OggDudeDataElement.buildJsonDataFromDirectory(zip, groupByType.xml, "Species", "Species"),
        zip: {
            folderName: "Species",
            elementFileName: "*.xml",
            content: zip,
            directories: groupByDirectory
        },
        image: {
            criteria: "Data/SpeciesImages",
            worldPath: buildArmorImgWorldPath("species"),
            systemPath: buildItemImgSystemPath("species.svg"),
            images: groupByType.image,
            prefix: ''
        },
        folder: {
            name: 'Swerpg - Species',
            type: 'Item'
        },
        element: {
            jsonCriteria: 'Species.Species',
            mapper: speciesMapper,
            type: 'species'
        }
    };
}
