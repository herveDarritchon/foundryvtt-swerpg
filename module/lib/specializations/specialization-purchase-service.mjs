/**
 * @module module/lib/specializations/specialization-purchase-service
 * @description Pure service pur pour l'éligibilité, la preview de coût et les blocages
 *              lors de l'achat d'une nouvelle spécialisation.
 *
 * Dépend du service de coût existant (specialization-cost-service) et du snapshot
 * canonique des spécialisations possédées (owned-specializations).
 */

import { calculateSpecializationCost } from './specialization-cost-service.mjs'

/**
 * Codes de raison de blocage pour l'achat de spécialisation.
 * @type {Readonly<Record<string, string>>}
 */
export const BLOCKED_REASON = Object.freeze({
  ALREADY_OWNED: 'specialization.alreadyOwned',
  INSUFFICIENT_XP: 'specialization.insufficientXp',
  INVALID_CANDIDATE: 'specialization.invalidCandidate',
})

/**
 * Résultat de l'évaluation d'achat d'une spécialisation.
 * @typedef {Object} SpecializationPurchaseEvaluation
 * @property {boolean} canPurchase - True si l'achat est autorisé
 * @property {string|null} blockedReasonCode - Code de blocage si canPurchase est false
 * @property {object|null} costPreview - Résultat détaillé du calcul de coût (SpecializationCostResult) ou null
 * @property {boolean} isCareerOrUniversal - True si la candidate est traitée comme carrière/universelle
 */

/**
 * Évalue si une spécialisation candidate peut être achetée.
 *
 * Fonction pure — toutes les données doivent être injectées en paramètres.
 * Les dépendances Foundry (game, actor document) ne doivent pas être utilisées ici.
 *
 * @param {object} params - Paramètres d'évaluation
 * @param {Array<object>|{count: number, items: Array<object>}} params.ownedSpecializations -
 *        Snapshot des spécialisations possédées (getOwnedSpecializations() ou tableau brut)
 * @param {object|null|undefined} params.candidateSpecialization - La spécialisation candidate
 * @param {object|null|undefined} params.career - La carrière du personnage
 * @param {number|null|undefined} params.availableXp - XP disponible du personnage
 * @returns {SpecializationPurchaseEvaluation} Résultat de l'évaluation
 */
export function evaluateSpecializationPurchase(params) {
  const { ownedSpecializations, candidateSpecialization, career, availableXp } = params

  if (!candidateSpecialization) {
    return buildResult(false, BLOCKED_REASON.INVALID_CANDIDATE, null)
  }

  const ownedItems = Array.isArray(ownedSpecializations)
    ? ownedSpecializations
    : (ownedSpecializations?.items ?? [])

  const isOwned = ownedItems.some((s) => {
    const candidateId = candidateSpecialization.specializationId
    if (candidateId && s.specializationId === candidateId) return true
    if (!candidateId && s.name === candidateSpecialization.name) return true
    return false
  })
  if (isOwned) {
    return buildResult(false, BLOCKED_REASON.ALREADY_OWNED, null)
  }

  const costResult = calculateSpecializationCost({
    ownedSpecializations,
    candidateSpecialization,
    career,
  })

  if (costResult.finalCost > 0 && (availableXp == null || availableXp < costResult.finalCost)) {
    return buildResult(false, BLOCKED_REASON.INSUFFICIENT_XP, costResult)
  }

  return buildResult(true, null, costResult)
}

/**
 * Construit un résultat d'évaluation normalisé.
 * @param {boolean} canPurchase
 * @param {string|null} blockedReasonCode
 * @param {object|null} costPreview
 * @returns {SpecializationPurchaseEvaluation}
 */
function buildResult(canPurchase, blockedReasonCode, costPreview) {
  return {
    canPurchase,
    blockedReasonCode,
    costPreview,
    isCareerOrUniversal: costPreview?.isCareerOrUniversal ?? false,
  }
}

/**
 * Mappe un code de raison de blocage vers la clé i18n correspondante.
 * @param {string} code - Le code de raison (une valeur de BLOCKED_REASON)
 * @returns {string} La clé i18n
 */
export function getBlockedReasonLabelKey(code) {
  const map = {
    [BLOCKED_REASON.ALREADY_OWNED]: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.REASON.ALREADY_PURCHASED',
    [BLOCKED_REASON.INSUFFICIENT_XP]: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.REASON.NOT_ENOUGH_XP',
    [BLOCKED_REASON.INVALID_CANDIDATE]: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.PURCHASE.INVALID_CANDIDATE',
  }
  return map[code] ?? 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.REASON.UNKNOWN'
}
