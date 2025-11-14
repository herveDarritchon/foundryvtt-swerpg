/**
 * Mapping des informations de rang et tier des talents OggDude
 */

import { incrementTalentImportStat, clampTalentTier } from '../utils/talent-import-utils.mjs'
import { logger } from '../../utils/logger.mjs'

/**
 * Transforme les données de rang OggDude vers la structure rank système
 * @param {object} oggDudeRankData - Données de rang depuis OggDude XML
 * @param {object} options - Options de transformation
 * @returns {object} Structure rank compatible système {idx, cost}
 */
export function transformTalentRank(oggDudeRankData, options = {}) {
  const defaultRank = { idx: 0, cost: 0 }
  
  if (!oggDudeRankData || typeof oggDudeRankData !== 'object') {
    return defaultRank
  }
  
  try {
    // Extraction idx du rang (généralement 0-based)
    let idx = 0
    if ('Rank' in oggDudeRankData) {
      idx = parseInt(oggDudeRankData.Rank) || 0
    } else if ('Index' in oggDudeRankData) {
      idx = parseInt(oggDudeRankData.Index) || 0
    } else if ('Level' in oggDudeRankData) {
      idx = parseInt(oggDudeRankData.Level) || 0
    }
    
    // Validation et bornage de l'index
    if (!Number.isFinite(idx) || idx < 0) {
      logger.warn('[TalentRankMap] Invalid rank index, using 0:', idx)
      idx = 0
    }
    
    // Extraction du coût
    let cost = 0
    if ('Cost' in oggDudeRankData) {
      cost = parseInt(oggDudeRankData.Cost) || 0
    } else if ('XPCost' in oggDudeRankData) {
      cost = parseInt(oggDudeRankData.XPCost) || 0
    } else if ('TalentCost' in oggDudeRankData) {
      cost = parseInt(oggDudeRankData.TalentCost) || 0
    } else {
      // Calcul du coût par défaut basé sur l'index (pattern Star Wars FFG)
      cost = calculateDefaultTalentCost(idx, options.tier)
    }
    
    // Validation du coût
    if (!Number.isFinite(cost) || cost < 0) {
      logger.warn('[TalentRankMap] Invalid talent cost, using calculated default:', cost)
      cost = calculateDefaultTalentCost(idx, options.tier)
    }
    
    return { idx, cost }
    
  } catch (error) {
    logger.warn('[TalentRankMap] Error transforming rank data:', error)
    return defaultRank
  }
}

/**
 * Extrait et valide le tier (niveau) d'un talent OggDude
 * @param {object} oggDudeTalentData - Données complètes du talent OggDude
 * @returns {number} Tier validé (0-5)
 */
export function extractTalentTier(oggDudeTalentData) {
  if (!oggDudeTalentData || typeof oggDudeTalentData !== 'object') {
    return 0
  }
  
  let tier = 0
  
  try {
    // Tentatives d'extraction du tier
    if ('Tier' in oggDudeTalentData) {
      tier = parseInt(oggDudeTalentData.Tier)
    } else if ('TalentTier' in oggDudeTalentData) {
      tier = parseInt(oggDudeTalentData.TalentTier)
    } else if ('Level' in oggDudeTalentData) {
      tier = parseInt(oggDudeTalentData.Level)
    } else if ('Row' in oggDudeTalentData) {
      // Dans certains cas, Row peut correspondre au tier
      tier = parseInt(oggDudeTalentData.Row) - 1 // Row est généralement 1-based
    }
    
    // Validation et bornage
    tier = clampTalentTier(tier, 0, 5, 0)
    
    if (tier < 0 || tier > 5) {
      incrementTalentImportStat('invalidTiers')
      logger.warn(`[TalentRankMap] Tier out of bounds (0-5): ${tier}, clamped to 0`)
      tier = 0
    }
    
  } catch (error) {
    logger.warn('[TalentRankMap] Error extracting tier:', error)
    tier = 0
  }
  
  return tier
}

/**
 * Détermine si un talent est classé (ranked) basé sur les données OggDude
 * @param {object} oggDudeTalentData - Données du talent OggDude
 * @returns {boolean} True si le talent est classé
 */
export function extractIsRanked(oggDudeTalentData) {
  if (!oggDudeTalentData || typeof oggDudeTalentData !== 'object') {
    return false
  }
  
  try {
    // Vérifications directes
    if ('Ranked' in oggDudeTalentData) {
      return Boolean(oggDudeTalentData.Ranked)
    }
    
    if ('IsRanked' in oggDudeTalentData) {
      return Boolean(oggDudeTalentData.IsRanked)
    }
    
    // Inférence basée sur la présence de plusieurs rangs
    if ('Ranks' in oggDudeTalentData && Array.isArray(oggDudeTalentData.Ranks)) {
      return oggDudeTalentData.Ranks.length > 1
    }
    
    // Inférence basée sur MaxRank
    if ('MaxRank' in oggDudeTalentData) {
      const maxRank = parseInt(oggDudeTalentData.MaxRank)
      return Number.isFinite(maxRank) && maxRank > 1
    }
    
    return false
    
  } catch (error) {
    logger.warn('[TalentRankMap] Error determining ranked status:', error)
    return false
  }
}

/**
 * Calcule le coût par défaut d'un talent basé sur son index et tier
 * @param {number} rankIndex - Index du rang (0-based)
 * @param {number} tier - Tier du talent (0-5)
 * @returns {number} Coût calculé
 * @private
 */
function calculateDefaultTalentCost(rankIndex, tier = 0) {
  // Formule basique Star Wars FFG: coût croissant par rang
  const baseCost = Math.max(1, tier || 1)
  const rankMultiplier = Math.max(1, rankIndex + 1)
  
  return baseCost * rankMultiplier
}

/**
 * Valide une structure de rang complète
 * @param {object} rankData - Structure rank à valider
 * @returns {boolean} True si valide
 */
export function validateTalentRank(rankData) {
  if (!rankData || typeof rankData !== 'object') {
    return false
  }
  
  const { idx, cost } = rankData
  
  // Vérifier idx
  if (!Number.isFinite(idx) || idx < 0) {
    logger.warn('[TalentRankMap] Invalid rank idx:', idx)
    return false
  }
  
  // Vérifier cost
  if (!Number.isFinite(cost) || cost < 0) {
    logger.warn('[TalentRankMap] Invalid rank cost:', cost)
    return false
  }
  
  return true
}

/**
 * Génère une structure de rang par défaut pour un tier donné
 * @param {number} tier - Tier du talent
 * @returns {object} Structure rank par défaut
 */
export function generateDefaultTalentRank(tier = 0) {
  return {
    idx: 0,
    cost: calculateDefaultTalentCost(0, tier)
  }
}

/**
 * Calcule le coût total pour atteindre un rang donné
 * @param {number} targetRank - Rang cible (0-based)
 * @param {number} tier - Tier du talent
 * @returns {number} Coût total cumulé
 */
export function calculateCumulativeTalentCost(targetRank, tier = 0) {
  let totalCost = 0
  
  for (let rank = 0; rank <= targetRank; rank++) {
    totalCost += calculateDefaultTalentCost(rank, tier)
  }
  
  return totalCost
}