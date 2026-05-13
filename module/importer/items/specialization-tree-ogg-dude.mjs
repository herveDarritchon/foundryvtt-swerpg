import { buildArmorImgWorldPath, buildItemImgSystemPath } from '../../settings/directories.mjs'
import OggDudeDataElement from '../../settings/models/OggDudeDataElement.mjs'
import { logger } from '../../utils/logger.mjs'
import { getSpecializationTreeImportStats, resetSpecializationTreeImportStats } from '../utils/specialization-tree-import-utils.mjs'
import { specializationTreeMapper } from '../mappers/oggdude-specialization-tree-mapper.mjs'

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
      mapper: specializationTreeMapper,
      type: 'specialization-tree',
    },
  }
}

export { getSpecializationTreeImportStats, resetSpecializationTreeImportStats }
