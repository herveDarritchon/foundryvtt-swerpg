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
 * Configuration du mapping entre domaine d'import et couleur de dossier
 * Couleurs alignées sur la charte graphique SWERPG (bleu hyperespace, orange rebelle, etc.)
 */
const OGGDUDE_FOLDER_COLORS = {
  weapon: '#00b8d4', // Cyan éclatant (armes)
  armor: '#00838f', // Teal profond (protection)
  gear: '#4dd0e1', // Cyan clair (équipement)
  career: '#6a1b9a', // Violet intense (carrières)
  talent: '#ce93d8', // Violet clair (talents)
  species: '#2e7d32', // Vert forêt (espèces)
  specialization: '#8e24aa', // Violet médian (spécialisations)
  obligation: '#ffb300', // Ambre soutenu (obligations)
  duty: '#ff8f00', // Ambre foncé (devoirs)
  motivation: '#ffd54f', // Jaune chaud (motivations)
  'motivation-category': '#ffca28', // Jaune doré (catégories de motivations)
}

const OGGDUDE_FALLBACK_COLOR = '#546e7a' // Gris acier par défaut

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
 * Résout la couleur de dossier pour un domaine d'import donné
 * @param {string} importDomain Domaine d'import (weapon, armor, gear, etc.)
 * @returns {string} Couleur hex pour le dossier
 */
function resolveFolderColor(importDomain) {
  const color = OGGDUDE_FOLDER_COLORS[importDomain]
  if (!color) {
    logger.debug('[OggDudeImportFolders] Aucune couleur définie pour le domaine, utilisation du fallback', {
      importDomain,
      fallbackColor: OGGDUDE_FALLBACK_COLOR,
    })
    return OGGDUDE_FALLBACK_COLOR
  }
  return color
}

/**
 * Applique une couleur à un dossier existant si nécessaire
 * Met à jour uniquement si la couleur actuelle diffère de la couleur attendue
 * @param {Folder} folder Dossier Foundry à mettre à jour
 * @param {string} targetColor Couleur hex cible
 * @returns {Promise<Folder|null>} Le dossier mis à jour ou null si aucune mise à jour nécessaire
 */
async function applyFolderColor(folder, targetColor) {
  if (!folder || !targetColor) {
    return null
  }

  // Vérifier si la couleur actuelle diffère
  const currentColor = folder.color || null

  if (currentColor === targetColor) {
    // Couleur déjà correcte, pas de mise à jour nécessaire
    return null
  }

  try {
    logger.debug('[OggDudeImportFolders] Application de la couleur au dossier', {
      folderId: folder.id,
      folderName: folder.name,
      currentColor,
      targetColor,
    })

    await folder.update({ color: targetColor })
    return folder
  } catch (error) {
    logger.warn('[OggDudeImportFolders] Erreur lors de la mise à jour de la couleur du dossier', {
      folderId: folder.id,
      folderName: folder.name,
      error: error.message,
    })
    return null
  }
}

/**
 * Récupère ou crée un dossier dans le monde Foundry avec gestion du cache
 * @param {string} folderName Nom du dossier à créer/récupérer
 * @param {string} folderType Type de document Foundry (ex: 'Item')
 * @param {string|null} parentId ID du dossier parent (null pour racine)
 * @param {string|null} color Couleur hex optionnelle pour le dossier
 * @returns {Promise<Folder>} Le dossier Foundry
 */
async function getOrCreateFolderInternal(folderName, folderType, parentId = null, color = null) {
  const cacheKey = `${folderType}::${parentId || 'root'}::${folderName}`

  if (folderCache.has(cacheKey)) {
    logger.debug('[OggDudeImportFolders] Dossier trouvé dans le cache', { cacheKey })
    const cachedFolder = folderCache.get(cacheKey)

    // Appliquer la couleur si nécessaire
    if (color) {
      await applyFolderColor(cachedFolder, color)
    }

    return cachedFolder
  }

  // Recherche du dossier existant
  const existingFolder = game.folders.find((f) => f.type === folderType && f.name === folderName && (f.folder?.id ?? null) === parentId)

  if (existingFolder) {
    logger.debug('[OggDudeImportFolders] Dossier existant trouvé', { folderName, folderId: existingFolder.id })

    // Appliquer la couleur si nécessaire
    if (color) {
      await applyFolderColor(existingFolder, color)
    }

    folderCache.set(cacheKey, existingFolder)
    return existingFolder
  }

  // Création du dossier
  const folderData = {
    name: folderName,
    type: folderType,
    folder: parentId,
  }

  // Ajouter la couleur si fournie
  if (color) {
    folderData.color = color
  }

  const newFolder = await Folder.create(folderData)
  logger.info('[OggDudeImportFolders] Nouveau dossier créé', { folderName, folderId: newFolder.id, parentId, color })
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
    logger.error("[OggDudeImportFolders] Domaine d'import invalide", { importDomain })
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

  // Résolution de la couleur pour ce domaine
  const folderColor = resolveFolderColor(importDomain)

  // Création/récupération du dossier racine OggDude (sans couleur spécifique)
  const rootFolder = await getOrCreateFolderInternal(OGGDUDE_ROOT_FOLDER, itemType, null, null)

  // Création/récupération du sous-dossier pour ce domaine (avec couleur)
  const targetFolder = await getOrCreateFolderInternal(targetSubfolderName, itemType, rootFolder.id, folderColor)

  logger.debug('[OggDudeImportFolders] Hiérarchie de dossiers résolue', {
    importDomain,
    rootFolder: rootFolder.name,
    targetFolder: targetFolder.name,
    targetFolderId: targetFolder.id,
    folderColor,
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
    fallbackColor: OGGDUDE_FALLBACK_COLOR,
    domainMap: { ...OGGDUDE_FOLDER_MAP },
    colorMap: { ...OGGDUDE_FOLDER_COLORS },
  }
}
