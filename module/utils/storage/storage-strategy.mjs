import { createFoundryFolder } from '../../importer/utils/oggdude-import-folders.mjs'
import { logger } from '../logger.mjs'
import { getOggDudePackConfig } from '../oggdude-mapping-config.mjs'
import { WorldItemStorageTarget } from './world-item-storage-target.mjs'
import { CompendiumItemStorageTarget } from './compendium-item-storage-target.mjs'
import { organizeCompendiumPack } from '../../helpers/foundry/compendium-folders.mjs'

/**
 *
 */
export async function createOggDudeStorageTarget({ mode, elementType, folderType }) {
  if (mode === 'world') {
    const folder = await createFoundryFolder(elementType, folderType)

    if (!folder?.id) {
      throw new Error(`[SWERPG] Could not resolve Item folder for element type "${elementType}".`)
    }

    return new WorldItemStorageTarget({
      folder,
      elementType,
    })
  }

  if (mode === 'compendium') {
    const packConfig = getOggDudePackConfig(elementType)

    let pack = game.packs.get(packConfig.fullName)

    if (!pack) {
      logger.info('[OggDudeDataElement] Creating Compendium', {
        packName: packConfig.name,
        packLabel: packConfig.label,
        packFullName: packConfig.fullName,
      })

      pack = await foundry.documents.collections.CompendiumCollection.createCompendium({
        type: 'Item',
        label: packConfig.label,
        name: packConfig.name,
        package: 'world',
      })
    }

    await organizeCompendiumPack(pack, elementType)

    if (pack.documentName !== 'Item') {
      throw new Error(`[SWERPG] Invalid compendium document type for "${packConfig.fullName}". Expected "Item", got "${pack.documentName}".`)
    }

    if (pack.locked) {
      throw new Error(`[SWERPG] Compendium is locked and cannot receive imported items: ${packConfig.fullName}`)
    }

    return new CompendiumItemStorageTarget({
      pack,
      packConfig,
      elementType,
    })
  }

  throw new Error(`[SWERPG] Unsupported OggDude storage mode: ${mode}`)
}
