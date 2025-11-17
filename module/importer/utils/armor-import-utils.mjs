/**
 * Utilitaires pour l'import des armures OggDude
 */

/**
 * Borne une valeur numérique entre un minimum et un maximum
 * @param {*} value - La valeur à borner
 * @param {number} min - Valeur minimum
 * @param {number} max - Valeur maximum
 * @param {number} defaultValue - Valeur par défaut si value n'est pas numérique
 * @returns {number} La valeur bornée
 */
export function clampNumber(value, min, max, defaultValue = 0) {
  const num = parseInt(value)
  if (isNaN(num)) {
    return defaultValue
  }
  return Math.max(min, Math.min(max, num))
}

/**
 * Sanitise une chaîne de texte pour éviter les injections HTML
 * @param {string} str - La chaîne à sanitiser
 * @returns {string} La chaîne sanitisée
 */
export function sanitizeText(str) {
  if (!str || typeof str !== 'string') {
    return ''
  }

  return str
    .trim()
    .replace(/<script/gi, '&lt;script')
    .replace(/<\/script>/gi, '&lt;/script&gt;')
}

/**
 * Mode de validation strict pour l'import des armures
 * En mode strict, les armures avec des données invalides sont rejetées
 */
export const FLAG_STRICT_ARMOR_VALIDATION = false

/**
 * Statistics d'import des armures
 * @private
 */
let armorImportStats = {
  total: 0,
  rejected: 0,
  unknownCategories: 0,
  unknownProperties: 0,
  rejectionReasons: [],
}

/**
 * Obtient les statistiques d'import des armures
 * @returns {object} Les statistiques d'import
 */
export function getArmorImportStats() {
  return { ...armorImportStats, imported: armorImportStats.total - armorImportStats.rejected }
}

/**
 * Remet à zéro les statistiques d'import des armures
 */
export function resetArmorImportStats() {
  armorImportStats = {
    total: 0,
    rejected: 0,
    unknownCategories: 0,
    unknownProperties: 0,
    rejectionReasons: [],
  }
}

/**
 * Incrémente les statistiques d'import
 * @param {string} stat - Le nom de la statistique à incrémenter
 * @param {number} amount - Le montant à ajouter (défaut: 1)
 */
export function incrementArmorImportStat(stat, amount = 1) {
  if (stat in armorImportStats && typeof armorImportStats[stat] === 'number') {
    armorImportStats[stat] += amount
  }
}

/**
 * Ajoute une raison de rejet aux statistiques
 * @param {string} reason - La raison du rejet
 */
export function addRejectionReason(reason) {
  armorImportStats.rejectionReasons.push(reason)
}

/**
 * Normalise une catégorie OggDude en tag de propriété
 * @param {string} category - La catégorie à normaliser
 * @returns {string} La catégorie normalisée en kebab-case
 */
export function normalizeArmorCategoryTag(category) {
  if (!category || typeof category !== 'string') {
    return ''
  }

  return category
    .trim()
    .replace(/['"]/g, '') // Supprime les guillemets
    .replace(/\s+/g, '-') // Remplace les espaces par des tirets
    .toLowerCase()
}

/**
 * Construit la description complète d'une armure
 * @param {object} xmlArmor - Les données XML de l'armure
 * @returns {string} La description formatée
 */
export function buildArmorDescription(xmlArmor) {
  const parts = []

  // Titre nettoyé
  if (xmlArmor.Name) {
    parts.push(xmlArmor.Name)
  }

  // Description nettoyée
  if (xmlArmor.Description) {
    let description = xmlArmor.Description.replace(/\[H3\]/gi, '') // Supprime les balises H3 d'ouverture
      .replace(/\[\/h3\]/gi, '') // Supprime les balises H3 de fermeture
      .trim()

    if (description) {
      parts.push(description)
    }
  }

  // Source
  if (xmlArmor.Source) {
    const sourcePage = xmlArmor.Source.$ && xmlArmor.Source.$.Page ? xmlArmor.Source.$.Page : ''
    const sourceText = typeof xmlArmor.Source === 'string' ? xmlArmor.Source : xmlArmor.Source._

    if (sourceText) {
      const sourceInfo = sourcePage ? `Source: ${sourceText}, p.${sourcePage}` : `Source: ${sourceText}`
      parts.push(sourceInfo)
    }
  }

  // Base Mods
  if (xmlArmor.BaseMods?.Mod) {
    const mods = Array.isArray(xmlArmor.BaseMods.Mod) ? xmlArmor.BaseMods.Mod : [xmlArmor.BaseMods.Mod]

    const modDescriptions = mods.filter((mod) => mod.MiscDesc).map((mod) => `- ${mod.MiscDesc}`)

    if (modDescriptions.length > 0) {
      parts.push('Base Mods:')
      parts.push(...modDescriptions)
    }
  }

  return parts.join('\n\n')
}

/**
 * Extrait et structure les BaseMods pour les flags
 * @param {object} xmlArmor - Les données XML de l'armure
 * @returns {Array} Les BaseMods structurés
 */
export function extractBaseMods(xmlArmor) {
  if (!xmlArmor.BaseMods?.Mod) {
    return []
  }

  const mods = Array.isArray(xmlArmor.BaseMods.Mod) ? xmlArmor.BaseMods.Mod : [xmlArmor.BaseMods.Mod]

  return mods.map((mod) => {
    const baseMod = {
      text: mod.MiscDesc || '',
    }

    // Ajouter les informations de dés si présentes
    if (mod.DieModifiers?.DieModifier) {
      const dieModifier = Array.isArray(mod.DieModifiers.DieModifier) ? mod.DieModifiers.DieModifier[0] : mod.DieModifiers.DieModifier

      if (dieModifier.SkillKey) {
        baseMod.skillKey = dieModifier.SkillKey
      }
      if (dieModifier.BoostCount) {
        baseMod.boostCount = parseInt(dieModifier.BoostCount) || 0
      }
    }

    return baseMod
  })
}
