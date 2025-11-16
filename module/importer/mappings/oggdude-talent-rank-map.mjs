/**
 * Mapping des informations de rang et tier des talents OggDude
 */

import { logger } from '../../utils/logger.mjs'

/**
 * Transforme les données de rang OggDude vers la structure rank système
 * @param {object} oggDudeRankData - Données de rang depuis OggDude XML
 * @param {object} options - Options de transformation
 * @returns {object} Structure rank compatible système {idx, cost}
 */
export function transformTalentRank(oggDudeRankData, options = {}) {
  // Par défaut attendu par les TUs: idx=1, cost=5
  const fallback = { idx: 1, cost: 5 }
  if (!oggDudeRankData || typeof oggDudeRankData !== 'object') return fallback
  try {
    // Les TUs attendent idx = Tier - 1 avec clamp minimum à 1 (Tier=2 -> idx=1)
    let idx = 1
    if (oggDudeRankData.Tier) {
      const tier = Number.parseInt(oggDudeRankData.Tier) || 1
      idx = Math.max(1, tier - 1)
    }
    // Cost direct sinon fallback 5
    let cost = 5
    if (oggDudeRankData.Cost) cost = Number.parseInt(oggDudeRankData.Cost) || 5
    return { idx, cost }
  } catch (e) {
    logger.warn('[TalentRankMap] Error transforming rank data:', e)
    return fallback
  }
}

/**
 * Extrait et valide le tier (niveau) d'un talent OggDude
 * @param {object} oggDudeTalentData - Données complètes du talent OggDude
 * @returns {number} Tier validé (0-5)
 */
export function extractTalentTier(oggDudeTalentData) {
  if (!oggDudeTalentData || typeof oggDudeTalentData !== 'object') return 1
  const raw = Number.parseInt(oggDudeTalentData.Tier) || Number.parseInt(oggDudeTalentData.TalentTier) || 1
  return Math.max(1, Math.min(5, raw))
}

/**
 * Détermine si un talent est classé (ranked) basé sur les données OggDude
 * @param {object} oggDudeTalentData - Données du talent OggDude
 * @returns {boolean} True si le talent est classé
 */
export function extractIsRanked(oggDudeTalentData) {
  if (!oggDudeTalentData || typeof oggDudeTalentData !== 'object') return false
  const raw = oggDudeTalentData.IsRanked ?? oggDudeTalentData.Ranked
  if (raw !== undefined) {
    if (typeof raw === 'string') {
      const v = raw.toLowerCase().trim()
      if (['true', 'yes', '1'].includes(v)) return true
      if (['false', 'no', '0'].includes(v)) return false
      return Boolean(v)
    }
    return Boolean(raw)
  }
  return false
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
    cost: calculateDefaultTalentCost(0, tier),
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
