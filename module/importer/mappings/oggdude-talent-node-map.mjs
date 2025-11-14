/**
 * Mapping et résolution des nœuds de talents OggDude vers SwerpgTalentNode
 */

import SwerpgTalentNode from '../../config/talent-tree.mjs'
import { addTalentUnknownNode } from '../utils/talent-import-utils.mjs'
import { logger } from '../../utils/logger.mjs'

/**
 * Résout un identifiant de nœud OggDude vers un SwerpgTalentNode existant
 * @param {string} oggDudeNodeId - Identifiant de nœud depuis OggDude XML
 * @returns {SwerpgTalentNode|null} Nœud de talent correspondant ou null si non trouvé
 */
export function resolveTalentNode(oggDudeNodeId, options = {}) {
  if (!oggDudeNodeId || typeof oggDudeNodeId !== 'string') {
    // Log plus informatif uniquement si le talent a un nom
    if (options.name) {
      logger.debug(`[TalentNodeMap] No node ID provided for talent: ${options.name}, using fallback`)
    }
    return null
  }
  
  const cleanNodeId = oggDudeNodeId.trim()
  
  // Recherche directe par ID
  const node = SwerpgTalentNode.nodes.get(cleanNodeId)
  if (node) {
    return node
  }
  
  // Recherche insensible à la casse
  for (const [nodeId, nodeInstance] of SwerpgTalentNode.nodes.entries()) {
    if (nodeId.toLowerCase() === cleanNodeId.toLowerCase()) {
      return nodeInstance
    }
  }
  
  // Recherche par nom de groupe (signature talents)
  const choices = SwerpgTalentNode.getChoices()
  if (cleanNodeId in choices) {
    return SwerpgTalentNode.nodes.get(choices[cleanNodeId])
  }
  
  // Tentative de résolution par correspondance partielle (patterns courants OggDude)
  const nodeResolution = tryResolveByPattern(cleanNodeId)
  if (nodeResolution) {
    return nodeResolution
  }
  
  // Nœud inconnu - enregistrer pour statistiques
  addTalentUnknownNode(cleanNodeId)
  logger.warn(`[TalentNodeMap] Unknown talent node: "${cleanNodeId}". Available nodes:`, 
    Array.from(SwerpgTalentNode.nodes.keys()).slice(0, 10))
  
  return null
}

/**
 * Tente de résoudre un nœud par correspondance de pattern OggDude courants
 * @param {string} nodeId - ID à résoudre
 * @returns {SwerpgTalentNode|null} Nœud résolu ou null
 * @private
 */
function tryResolveByPattern(nodeId) {
  const lowerNodeId = nodeId.toLowerCase()
  
  // Patterns de correspondance courants OggDude → Système
  const patterns = {
    // Exemples basés sur les patterns courants Star Wars FFG
    'dedication': 'dedication',
    'toughened': 'toughened',
    'gutted': 'gutted',
    'adversary': 'adversary',
    'lethalblows': 'lethalblows',
    'precisestrike': 'precisestrike',
    'defensivestance': 'defensivestance',
    'outdoorsman': 'outdoorsman',
    'forager': 'forager',
    
    // Signature patterns (si différents)
    'sig': 'signature',
    'signature': 'signature'
  }
  
  // Recherche exacte dans les patterns
  if (lowerNodeId in patterns) {
    const targetId = patterns[lowerNodeId]
    return SwerpgTalentNode.nodes.get(targetId)
  }
  
  // Recherche par inclusion de motif
  for (const [pattern, target] of Object.entries(patterns)) {
    if (lowerNodeId.includes(pattern)) {
      const node = SwerpgTalentNode.nodes.get(target)
      if (node) {
        logger.debug(`[TalentNodeMap] Resolved "${nodeId}" → "${target}" via pattern "${pattern}"`)
        return node
      }
    }
  }
  
  return null
}

/**
 * Crée un nœud de talent de fallback pour les cas où le nœud OggDude n'existe pas
 * ATTENTION: Cette fonction est expérimentale et peut créer des incohérences
 * @param {string} nodeId - ID du nœud à créer
 * @param {object} options - Options de création
 * @returns {SwerpgTalentNode|null} Nœud créé ou null si création échoue
 */
export function createFallbackTalentNode(nodeId, options = {}) {
  // Pour l'instant, cette fonctionnalité est désactivée par sécurité
  // Retourner null force le traitement en tant que talent rejeté
  logger.warn(`[TalentNodeMap] Fallback node creation disabled for security. Node: "${nodeId}"`)
  return null
  
  // Code de création commenté pour éviter les risques
  /*
  const fallbackNode = new SwerpgTalentNode({
    id: nodeId,
    tier: options.tier || 0,
    type: options.type || 'choice',
    abilities: options.abilities || [],
    ...options
  });
  
  logger.warn(`[TalentNodeMap] Created fallback node: "${nodeId}"`);
  return fallbackNode;
  */
}

/**
 * Obtient la liste de tous les nœuds de talents disponibles
 * @returns {string[]} Liste des IDs de nœuds
 */
export function getAvailableTalentNodes() {
  return Array.from(SwerpgTalentNode.nodes.keys())
}

/**
 * Vérifie si un nœud de talent existe
 * @param {string} nodeId - ID du nœud à vérifier
 * @returns {boolean} True si le nœud existe
 */
export function isTalentNodeAvailable(nodeId) {
  return resolveTalentNode(nodeId) !== null
}

/**
 * Obtient les statistiques des nœuds de talents
 * @returns {object} Statistiques des nœuds
 */
export function getTalentNodeStats() {
  const nodes = SwerpgTalentNode.nodes
  const signature = SwerpgTalentNode.signature
  
  return {
    totalNodes: nodes.size,
    signatureNodes: signature.size,
    regularNodes: nodes.size - signature.size,
    availableChoices: Object.keys(SwerpgTalentNode.getChoices()).length
  }
}