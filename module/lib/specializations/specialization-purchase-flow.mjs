import { calculateSpecializationCost } from './specialization-cost-service.mjs'
import { getOwnedSpecializations } from './owned-specializations.mjs'

/**
 * @typedef {'free-add'|'confirm-required'|'blocked-duplicate'|'blocked-insufficient-xp'} PurchaseDecision
 */

/**
 * @typedef {Object} SpecializationPurchaseResult
 * @property {PurchaseDecision} decision - The purchase decision
 * @property {string} specializationName - Name of the specialization
 * @property {Object} [cost] - Cost breakdown (absent on blocked decisions)
 * @property {number} [xpAvailable] - XP available before purchase
 * @property {number} [xpRemaining] - XP remaining after purchase
 * @property {string} [messageKey] - i18n key for blocked reasons
 */

/**
 * Évalue la faisabilité d'achat d'une spécialisation post-création.
 *
 * Retourne un résultat stable avec la décision, le coût et l'état XP.
 * Ne modifie rien — service métier pur sans effet de bord.
 *
 * @param {object} params
 * @param {object} params.actor L'acteur Foundry (pour ownedSpecializations via getOwnedSpecializations)
 * @param {object} params.candidateItem L'item spécialisation candidate (Foundry Item document)
 * @param {object|null|undefined} params.career La carrière du personnage (actor.system.details.career)
 * @param {number} params.xpAvailable XP disponible (actor.system.progression.experience.available)
 * @returns {SpecializationPurchaseResult}
 */
export function evaluateSpecializationPurchase({ actor, candidateItem, career, xpAvailable }) {
  const owned = getOwnedSpecializations(actor)

  const candidateId = candidateItem?.system?.specializationId ?? null
  const candidateName = candidateItem?.name ?? ''
  const isUniversal = candidateItem?.system?.isUniversal === true

  // 1. Détection de doublon
  const isDuplicate = owned.items.some((spec) => {
    if (candidateId && spec.specializationId && spec.specializationId === candidateId) return true
    if (candidateName && spec.name && spec.name === candidateName) return true
    return false
  })

  if (isDuplicate) {
    return {
      decision: 'blocked-duplicate',
      specializationName: candidateName,
      messageKey: 'SPECIALIZATION.PURCHASE.DUPLICATE',
    }
  }

  // 2. Calcul du coût
  const candidateForCost = { specializationId: candidateId, name: candidateName, system: { isUniversal } }
  const cost = calculateSpecializationCost({
    ownedSpecializations: owned,
    candidateSpecialization: candidateForCost,
    career,
  })

  // 3. Première spécialisation gratuite
  if (owned.count === 0 || cost.finalCost === 0) {
    return {
      decision: 'free-add',
      specializationName: candidateName,
      cost: {
        baseCost: cost.baseCost,
        nonCareerPenalty: cost.nonCareerPenalty,
        finalCost: 0,
        isCareerOrUniversal: cost.isCareerOrUniversal,
        ownedCountBefore: cost.ownedCountBefore,
        ownedCountAfter: cost.ownedCountAfter,
      },
    }
  }

  // 4. XP insuffisante
  if (xpAvailable < cost.finalCost) {
    return {
      decision: 'blocked-insufficient-xp',
      specializationName: candidateName,
      cost: {
        baseCost: cost.baseCost,
        nonCareerPenalty: cost.nonCareerPenalty,
        finalCost: cost.finalCost,
        isCareerOrUniversal: cost.isCareerOrUniversal,
        ownedCountBefore: cost.ownedCountBefore,
        ownedCountAfter: cost.ownedCountAfter,
      },
      xpAvailable,
      xpRemaining: xpAvailable,
      messageKey: 'SPECIALIZATION.PURCHASE.INSUFFICIENT_XP',
    }
  }

  // 5. Achat payant avec confirmation
  return {
    decision: 'confirm-required',
    specializationName: candidateName,
    cost: {
      baseCost: cost.baseCost,
      nonCareerPenalty: cost.nonCareerPenalty,
      finalCost: cost.finalCost,
      isCareerOrUniversal: cost.isCareerOrUniversal,
      ownedCountBefore: cost.ownedCountBefore,
      ownedCountAfter: cost.ownedCountAfter,
    },
    xpAvailable,
    xpRemaining: xpAvailable - cost.finalCost,
  }
}
