import { buildArmorImgWorldPath, buildItemImgSystemPath } from '../../settings/directories.mjs'
import OggDudeDataElement from '../../settings/models/OggDudeDataElement.mjs'
import { logger } from '../../utils/logger.mjs'
import { getSpecializationTreeImportStats, resetSpecializationTreeImportStats } from '../utils/specialization-tree-import-utils.mjs'
import { specializationTreeMapper } from '../mappers/oggdude-specialization-tree-mapper.mjs'

function buildTalentByIdFromWorld() {
  if (typeof game === 'undefined' || !game.items) return new Map()

  const index = new Map()
  for (const item of game.items) {
    if (item.type !== 'talent') continue
    const id = item.system?.id
    if (!id || typeof id !== 'string') {
      const oggKey = item.getFlag?.('swerpg', 'oggdudeKey')
      if (oggKey) {
        index.set(oggKey.toLowerCase().trim(), { uuid: item.uuid, id: oggKey })
      }
      continue
    }
    const key = id.toLowerCase().trim()
    if (!index.has(key)) {
      index.set(key, { uuid: item.uuid, id })
    }
  }
  return index
}

function buildTalentByIdFromCompendium() {
  if (typeof game === 'undefined' || !game.packs) return new Map()

  const index = new Map()

  for (const pack of game.packs.values()) {
    if (pack.documentName !== 'Item') continue
    if (!pack.index?.size) continue
    for (const entry of pack.index.values()) {
      if (entry.type !== 'talent') continue
      const flags = entry.flags?.swerpg
      const systemId = entry.system?.id
      if (systemId && typeof systemId === 'string') {
        const key = systemId.toLowerCase().trim()
        if (!index.has(key)) {
          index.set(key, { uuid: `Compendium.${pack.collection}.${entry._id}`, id: systemId })
        }
      } else if (flags?.oggdudeKey) {
        const key = flags.oggdudeKey.toLowerCase().trim()
        if (!index.has(key)) {
          index.set(key, { uuid: `Compendium.${pack.collection}.${entry._id}`, id: flags.oggdudeKey })
        }
      }
    }
  }
  return index
}

function buildTalentIndex() {
  const worldIndex = buildTalentByIdFromWorld()
  const compendiumIndex = buildTalentByIdFromCompendium()

  const result = new Map()
  for (const [key, value] of worldIndex) {
    result.set(key, value)
  }
  for (const [key, value] of compendiumIndex) {
    if (!result.has(key)) {
      result.set(key, value)
    }
  }
  return result
}

export async function buildSpecializationTreeContext(zip, groupByDirectory, groupByType) {
  logger.debug('[SpecializationTreeImporter] Building Specialization Tree context', {
    groupByDirectoryCount: groupByDirectory.length,
    hasZip: !!zip,
  })

  const rawNested = await OggDudeDataElement.buildJsonDataFromDirectory(zip, groupByType.xml, 'Specializations', 'Specializations.Specialization')
  const flattened = Array.isArray(rawNested)
    ? rawNested
        .flatMap((entry) => {
          if (!entry) return []
          if (Array.isArray(entry)) return entry.filter(Boolean)
          if (typeof entry === 'object') return [entry]
          return []
        })
        .filter((entry) => entry && typeof entry === 'object')
    : []

  const talentById = buildTalentIndex()

  return {
    jsonData: flattened,
    zip: {
      folderName: 'Specializations',
      elementFileName: '*.xml',
      content: zip,
      directories: groupByDirectory,
    },
    image: {
      worldPath: buildArmorImgWorldPath('specializations'),
      systemPath: buildItemImgSystemPath('specialization.svg'),
      images: groupByType.image,
      prefix: '',
    },
    folder: {
      name: 'Swerpg - Specialization Trees',
      type: 'Item',
    },
    element: {
      jsonCriteria: 'Specializations.Specialization',
      mapper: (specializations) => specializationTreeMapper(specializations, { talentById }),
      type: 'specialization-tree',
    },
  }
}

export { getSpecializationTreeImportStats, resetSpecializationTreeImportStats, buildTalentIndex, buildTalentByIdFromWorld, buildTalentByIdFromCompendium }
