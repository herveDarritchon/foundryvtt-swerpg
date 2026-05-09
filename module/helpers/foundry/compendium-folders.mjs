// module/helpers/foundry/compendium-folders.mjs

import { getOggDudePackConfig } from '../../utils/oggdude-mapping-config.mjs'

const OGGDUDE_COMPENDIUM_FOLDERS = {
  root: {
    name: 'SWERPG OggDude Import',
    color: '#031d59',
  },

  groups: {
    'actor-options': {
      name: 'Actor Options',
      color: '#032f96',
    },
    equipments: {
      name: 'Equipments',
      color: '#360c55',
    },
  },
}

function findFolderByNameTypeAndParent(name, type, parentId = null) {
  return game.folders.find((folder) => {
    const folderParentId = folder.folder?.id ?? folder.folder ?? null

    return folder.name === name && folder.type === type && folderParentId === parentId
  })
}

async function getOrCreateFolder({ name, type, color, parentId = null }) {
  const existing = findFolderByNameTypeAndParent(name, type, parentId)

  if (existing) return existing

  return Folder.create({
    name,
    type,
    color,
    sorting: 'a',
    folder: parentId,
  })
}

export async function organizeCompendiumPack(pack, elementType) {
  const packConfig = getOggDudePackConfig(elementType)

  const rootFolder = await getOrCreateFolder({
    name: OGGDUDE_COMPENDIUM_FOLDERS.root.name,
    type: 'Compendium',
    color: OGGDUDE_COMPENDIUM_FOLDERS.root.color,
  })

  const group = OGGDUDE_COMPENDIUM_FOLDERS.groups[packConfig.folderGroup]

  if (!group) {
    throw new Error(`[SWERPG] No compendium folder group configured for element type "${elementType}".`)
  }

  const targetFolder = await getOrCreateFolder({
    name: group.name,
    type: 'Compendium',
    color: group.color,
    parentId: rootFolder.id,
  })

  if (pack.folder?.id === targetFolder.id) return

  await pack.setFolder(targetFolder)
}