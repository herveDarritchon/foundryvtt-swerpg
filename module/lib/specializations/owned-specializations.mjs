/**
 * @module module/lib/specializations/owned-specializations
 * @description Contrat canonique pour les spécialisations possédées par un personnage.
 *
 * Ce module définit :
 * - Le type des spécialisations possédées
 * - Des helpers pour normaliser et lire les spécialisations depuis un acteur
 * - Des helpers de typage : isCareerSpecialization, isUniversalSpecialization
 */

/**
 * @typedef {Object} OwnedSpecialization
 * @property {string|null} specializationId - Identifiant stable de la spécialisation
 * @property {string|null} treeUuid - UUID de l'arbre de talents associé (Item)
 * @property {string} name - Nom de la spécialisation
 * @property {string|null} img - Image de la spécialisation
 * @property {Object} [system] - Données système de la spécialisation (skills, freeSkillRank, etc.)
 */

/**
 * @typedef {Object} OwnedSpecializationsSnapshot
 * @property {Array<OwnedSpecialization>} items - Liste des spécialisations possédées
 * @property {number} count - Nombre de spécialisations possédées
 */

/**
 * Extrait et normalise les spécialisations possédées depuis un acteur.
 *
 * @param {object|null|undefined} actor L'acteur (document Foundry ou objet plain)
 * @returns {OwnedSpecializationsSnapshot} Snapshot normalisé des spécialisations
 */
export function getOwnedSpecializations(actor) {
  const raw = Array.from(actor?.system?.details?.specializations || [])
  const items = raw.map((spec) => normalizeSpecialization(spec)).filter(Boolean)
  return {
    items,
    count: items.length,
  }
}

/**
 * Normalise une entrée de spécialisation brute en un OwnedSpecialization stable.
 *
 * @param {object|null|undefined} raw Entrée brute depuis actor.system.details.specializations
 * @returns {OwnedSpecialization|null} Spécialisation normalisée, ou null si invalide
 */
export function normalizeSpecialization(raw) {
  if (!raw) return null

  return {
    specializationId: raw.specializationId ?? null,
    treeUuid: raw.treeUuid ?? null,
    name: raw.name ?? '',
    img: raw.img ?? null,
    system: raw.system ?? undefined,
  }
}

/**
 * Calcule la clé canonique d'une spécialisation.
 *
 * L'ordre de précédence est : specializationId > treeUuid > name.
 * Utilisée par l'audit log, la suppression et toute identification métier.
 *
 * @param {object|null|undefined} spec Entrée de spécialisation normalisée
 * @returns {string|null} Clé canonique ou null si aucune information disponible
 */
export function getCanonicalSpecializationKey(spec) {
  if (!spec) return null
  return spec.specializationId || spec.treeUuid || spec.name || null
}

/**
 * Détermine si une spécialisation est une spécialisation de carrière.
 *
 * V1 : vérifie si la spécialisation est explicitement associée à la carrière du personnage.
 *
 * @param {OwnedSpecialization|object|null} specialization La spécialisation à évaluer
 * @param {object|null|undefined} career La carrière du personnage (actor.system.details.career)
 * @returns {boolean} True si c'est une spécialisation de carrière
 */
export function isCareerSpecialization(specialization, career) {
  if (!specialization || !career) return false

  // V1 : vérification par association explicite si la carrière a une liste de spécialisations
  const careerSpecializations = Array.from(career.specializations || [])
  const specId = specialization.specializationId
  const specName = specialization.name

  if (specId) {
    const hasMatchingId = careerSpecializations.some((cs) => cs.specializationId === specId || cs.id === specId)
    if (hasMatchingId) return true
  }

  if (specName) {
    const hasMatchingName = careerSpecializations.some((cs) => cs.name === specName)
    if (hasMatchingName) return true
  }

  // Fallback V1 : si pas d'association explicite, on retourne false
  // TODO: à affiner quand le modèle de carrière inclura explicitement ses spécialisations
  return false
}

/**
 * Détermine si une spécialisation est une spécialisation universelle.
 *
 * V1 : les spécialisations universelles sont traitées comme des spécialisations de carrière pour le coût.
 *
 * @param {OwnedSpecialization|object|null} specialization La spécialisation à évaluer
 * @returns {boolean} True si c'est une spécialisation universelle
 */
export function isUniversalSpecialization(specialization) {
  if (!specialization) return false

  // V1 : vérification par champ explicite ou par convention de nommage/ID
  const system = specialization.system ?? {}

  // Cas 1 : champ isUniversal explicite
  if (system.isUniversal === true || specialization.isUniversal === true) {
    return true
  }

  // Cas 2 : convention d'ID "universal-" ou nom contenant "universal"
  const specId = specialization.specializationId ?? ''
  const specName = specialization.name ?? ''

  if (specId.toLowerCase().startsWith('universal-')) {
    return true
  }

  if (specName.toLowerCase().includes('universal')) {
    return true
  }

  return false
}

/**
 * Détermine si une spécialisation doit être traitée comme une spécialisation de carrière pour le coût.
 *
 * Combine : isCareerSpecialization OU isUniversalSpecialization
 *
 * @param {OwnedSpecialization|object|null} specialization La spécialisation à évaluer
 * @param {object|null|undefined} career La carrière du personnage
 * @returns {boolean} True si traité comme carrière pour le coût
 */
export function isTreatedAsCareerForCost(specialization, career) {
  return isCareerSpecialization(specialization, career) || isUniversalSpecialization(specialization)
}
