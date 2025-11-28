import { logger } from '../../utils/logger.mjs'

/**
 * Configuration du mapping entre domaine d'import OggDude et sous-dossier cible
 */
const OGGDUDE_FOLDER_MAP = {
  weapon: 'Weapons',
  armor: 'Armor',
  gear: 'Gear',
  career: 'Careers',
  talent: 'Talents',
  species: 'Species',
  specialization: 'Specializations',
  obligation: 'Obligations',
  duty: 'Duties',
  motivation: 'Motivations',
  'motivation-category': 'Motivation Categories',
}

const OGGDUDE_ROOT_FOLDER = 'OggDude'
const OGGDUDE_FALLBACK_FOLDER = 'Misc'

/**
 * Cache des dossiers résolus pendant une session d'import
 * @type {Map<string, Folder>}
 */
const folderCache = new Map()

/**
 * Réinitialise le cache des dossiers (à appeler entre différents imports)
 */
export function resetFolderCache() {
  folderCache.clear()
  logger.debug('[OggDudeImportFolders] Cache réinitialisé')
}

/**
 * Récupère ou crée un dossier dans le monde Foundry avec gestion du cache
 * @param {string} folderName Nom du dossier à créer/récupérer
 * @param {string} folderType Type de document Foundry (ex: 'Item')
 * @param {string|null} parentId ID du dossier parent (null pour racine)
 * @returns {Promise<Folder>} Le dossier Foundry
 */
async function getOrCreateFolderInternal(folderName, folderType, parentId = null) {
  const cacheKey = `${folderType}::${parentId || 'root'}::${folderName}`

  if (folderCache.has(cacheKey)) {
    logger.debug('[OggDudeImportFolders] Dossier trouvé dans le cache', { cacheKey })
    return folderCache.get(cacheKey)
  }

  // Recherche du dossier existant
  const existingFolder = game.folders.find(
    (f) => f.type === folderType && f.name === folderName && (f.folder?.id ?? null) === parentId,
  )

  if (existingFolder) {
    logger.debug('[OggDudeImportFolders] Dossier existant trouvé', { folderName, folderId: existingFolder.id })
    folderCache.set(cacheKey, existingFolder)
    return existingFolder
  }

  // Création du dossier
  const folderData = {
    name: folderName,
    type: folderType,
    folder: parentId,
  }

  const newFolder = await Folder.create(folderData)
  logger.info('[OggDudeImportFolders] Nouveau dossier créé', { folderName, folderId: newFolder.id, parentId })
  folderCache.set(cacheKey, newFolder)
  return newFolder
}

/**
 * Récupère ou crée la hiérarchie de dossiers OggDude pour un domaine d'import
 * @param {string} importDomain Domaine d'import (weapon, armor, gear, etc.)
 * @param {string} itemType Type d'Item Foundry (ex: 'Item')
 * @returns {Promise<Folder>} Le dossier cible pour ce domaine
 */
export async function getOrCreateWorldFolder(importDomain, itemType = 'Item') {
  if (!importDomain || typeof importDomain !== 'string') {
    logger.error('[OggDudeImportFolders] Domaine d\'import invalide', { importDomain })
    throw new Error(`Invalid import domain: ${importDomain}`)
  }

  // Résolution du nom de sous-dossier
  const subfolderName = OGGDUDE_FOLDER_MAP[importDomain]
  if (!subfolderName) {
    logger.warn('[OggDudeImportFolders] Domaine inconnu, utilisation du fallback', {
      importDomain,
      fallback: OGGDUDE_FALLBACK_FOLDER,
    })
  }

  const targetSubfolderName = subfolderName || OGGDUDE_FALLBACK_FOLDER

  // Création/récupération du dossier racine OggDude
  const rootFolder = await getOrCreateFolderInternal(OGGDUDE_ROOT_FOLDER, itemType, null)

  // Création/récupération du sous-dossier pour ce domaine
  const targetFolder = await getOrCreateFolderInternal(targetSubfolderName, itemType, rootFolder.id)

  logger.debug('[OggDudeImportFolders] Hiérarchie de dossiers résolue', {
    importDomain,
    rootFolder: rootFolder.name,
    targetFolder: targetFolder.name,
    targetFolderId: targetFolder.id,
  })

  return targetFolder
}

/**
 * (Optionnel) Récupère ou crée un dossier dans un compendium avec hiérarchie OggDude
 * Note: Foundry v13 supporte les dossiers de compendium, mais l'API peut varier
 * @param {string} importDomain Domaine d'import
 * @param {string} packName Nom complet du pack (ex: 'world.oggdude-weapons')
 * @returns {Promise<Folder|null>} Le dossier de compendium ou null si non supporté
 */
export async function getOrCreateCompendiumFolder(importDomain, packName) {
  logger.debug('[OggDudeImportFolders] getOrCreateCompendiumFolder appelé', { importDomain, packName })

  // Pour l'instant, retourne null car la gestion des dossiers de compendium
  // nécessite une API spécifique et n'est pas dans le scope initial
  // Cette fonction est un placeholder pour une implémentation future
  logger.info('[OggDudeImportFolders] Gestion des dossiers de compendium non implémentée', { packName })
  return null
}

/**
 * Récupère la configuration complète du mapping de dossiers
 * @returns {Object} Configuration des dossiers OggDude
 */
export function getFolderConfiguration() {
  return {
    rootFolder: OGGDUDE_ROOT_FOLDER,
    fallbackFolder: OGGDUDE_FALLBACK_FOLDER,
    domainMap: { ...OGGDUDE_FOLDER_MAP },
  }
}

