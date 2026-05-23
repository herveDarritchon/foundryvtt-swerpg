/**
 * @module module/lib/specializations/specialization-cost-service
 * @description Service pur de calcul de coût pour l'achat de spécialisations.
 *
 * Règles V1 :
 * - 1ère spécialisation : 0 XP
 * - N-ième spécialisation (n≥2) : 10 × n XP
 * - +10 XP si ce n'est pas une spécialisation de carrière ou universelle
 * - Spécialisation universelle = spécialisation de carrière pour le coût
 */

import { isTreatedAsCareerForCost } from './owned-specializations.mjs'

/**
 * @typedef {Object} SpecializationCostResult
 * @property {number} baseCost - Coût de base selon le nombre de spécialisations
 * @property {number} nonCareerPenalty - Pénalité si ce n'est pas une spécialisation de carrière/universelle (0 ou 10)
 * @property {number} finalCost - Coût total final
 * @property {boolean} isCareerOrUniversal - True si traité comme carrière pour le coût
 * @property {number} ownedCountBefore - Nombre de spécialisations possédées avant achat
 * @property {number} ownedCountAfter - Nombre de spécialisations après achat
 */

/**
 * Calcule le coût d'obtention d'une nouvelle spécialisation.
 *
 * @param {object} params - Paramètres d'entrée
 * @param {Array<object>|{count: number, items: Array<object>}} params.ownedSpecializations -
 *        Soit un snapshot de getOwnedSpecializations(), soit un tableau brut de spécialisations
 * @param {object|null|undefined} params.candidateSpecialization - La spécialisation candidate à acheter
 * @param {object|null|undefined} params.career - La carrière du personnage (actor.system.details.career)
 * @returns {SpecializationCostResult} Résultat détaillé du calcul de coût
 */
export function calculateSpecializationCost(params) {
  const { ownedSpecializations, candidateSpecialization, career } = params

  // Calculer le nombre de spécialisations possédées
  let ownedCountBefore
  if (Array.isArray(ownedSpecializations)) {
    ownedCountBefore = ownedSpecializations.length
  } else if (ownedSpecializations && typeof ownedSpecializations === 'object' && 'count' in ownedSpecializations) {
    ownedCountBefore = ownedSpecializations.count
  } else {
    ownedCountBefore = 0
  }

  const ownedCountAfter = ownedCountBefore + 1

  // Coût de base
  let baseCost
  if (ownedCountBefore === 0) {
    baseCost = 0
  } else {
    baseCost = 10 * ownedCountAfter
  }

  // Pénalité hors carrière
  const isCareerOrUniversal = isTreatedAsCareerForCost(candidateSpecialization, career)
  const nonCareerPenalty = isCareerOrUniversal ? 0 : 10

  // Coût final
  const finalCost = baseCost + nonCareerPenalty

  return {
    baseCost,
    nonCareerPenalty,
    finalCost,
    isCareerOrUniversal,
    ownedCountBefore,
    ownedCountAfter,
  }
}
