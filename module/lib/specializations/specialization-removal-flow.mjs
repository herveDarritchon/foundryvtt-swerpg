/**
 * @module module/lib/specializations/specialization-removal-flow
 * @description Service pur de validation, preview et résultat de suppression
 *              d'une spécialisation possédée.
 *
 * Ce module centralise la décision `allowed` / `blocked` avec un `reasonCode`
 * stable, sans dépendre de l'état UI courant.
 */

/**
 * @typedef {'allowed'|'blocked-not-found'} RemovalDecision
 */

/**
 * @typedef {Object} SpecializationRemovalResult
 * @property {boolean} allowed - True si la suppression est autorisée.
 * @property {RemovalDecision} decision - Décision de suppression.
 * @property {string} specializationName - Nom de la spécialisation ciblée.
 * @property {string|null} reasonCode - Clé i18n de la raison si bloquée (sinon null).
 * @property {string|null} fallbackTreeKey - Clé de l'arbre à sélectionner après suppression.
 * @property {boolean} hasRemainingSpecializations - True s'il reste des spé après suppression.
 * @property {boolean} targetFound - True si la spécialisation a été trouvée dans la liste.
 */

/**
 * Calcule la clé canonique d'une spécialisation.
 *
 * @param {object} spec - Entrée de spécialisation normalisée
 * @returns {string|null} Clé canonique ou null si aucune information disponible
 */
function specKey(spec) {
  return spec?.specializationId || spec?.treeUuid || spec?.name || null
}

/**
 * Évalue la faisabilité de suppression d'une spécialisation.
 *
 * Service métier pur — ne modifie rien.
 * La règle métier est : toute spécialisation possédée peut être supprimée.
 * Le seul cas bloqué est l'absence de la spécialisation dans la liste.
 *
 * @param {object} params
 * @param {Array<object>} params.items - Les spécialisations possédées (ownedSpecializations snapshot items)
 * @param {string|null} params.specializationKey - La clé de la spécialisation à supprimer
 * @param {string|null} params.selectedTreeKey - La clé de l'arbre courant sélectionné (ou null)
 * @returns {SpecializationRemovalResult}
 */
export function evaluateSpecializationRemoval({ items, specializationKey, selectedTreeKey }) {
  if (!Array.isArray(items)) {
    return {
      allowed: false,
      decision: 'blocked-not-found',
      specializationName: specializationKey ?? '',
      reasonCode: 'SPECIALIZATION.REMOVAL.NOT_FOUND',
      fallbackTreeKey: selectedTreeKey ?? null,
      hasRemainingSpecializations: false,
      targetFound: false,
    }
  }

  const targetIndex = items.findIndex((spec) => {
    const key = specKey(spec)
    return key !== null && key === specializationKey
  })

  if (targetIndex === -1) {
    return {
      allowed: false,
      decision: 'blocked-not-found',
      specializationName: specializationKey ?? '',
      reasonCode: 'SPECIALIZATION.REMOVAL.NOT_FOUND',
      fallbackTreeKey: selectedTreeKey ?? null,
      hasRemainingSpecializations: items.length > 0,
      targetFound: false,
    }
  }

  const target = items[targetIndex]
  const remaining = items.filter((_, i) => i !== targetIndex)
  const targetName = target?.name || specializationKey || ''

  // Calcul du fallback de l'arbre courant
  const wasSelectedTree = selectedTreeKey === specializationKey
  let fallbackTreeKey = null
  let hasRemainingSpecializations = remaining.length > 0

  if (wasSelectedTree) {
    // La spécialisation supprimée était l'arbre courant → fallback
    if (remaining.length > 0) {
      // Prendre la dernière spécialisation encore possédée
      const last = remaining[remaining.length - 1]
      fallbackTreeKey = specKey(last)
    }
    // Si aucune restante, fallbackTreeKey reste null → état vide
  } else {
    // Conserver la sélection actuelle si elle est encore valide
    const currentStillValid = selectedTreeKey
      && remaining.some((spec) => specKey(spec) === selectedTreeKey)

    if (currentStillValid) {
      fallbackTreeKey = selectedTreeKey
    } else if (remaining.length > 0) {
      // La sélection courante n'est plus valide (cas rare) → fallback
      const last = remaining[remaining.length - 1]
      fallbackTreeKey = specKey(last)
    }
    // Si aucune restante, fallbackTreeKey reste null
  }

  return {
    allowed: true,
    decision: 'allowed',
    specializationName: targetName,
    reasonCode: null,
    fallbackTreeKey,
    hasRemainingSpecializations,
    targetFound: true,
  }
}
