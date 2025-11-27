import { ImportStats, clampNumber, sanitizeText } from './import-stats.mjs'

// Re-export helpers for backward compatibility if needed, or consumers should import from import-stats.mjs
// For now, we keep them exported here to avoid breaking changes in other files that might import them.
export { clampNumber, sanitizeText }

/**
 * Mode de validation strict pour l'import des armures
 * En mode strict, les armures avec des données invalides sont rejetées
 */
export const FLAG_STRICT_ARMOR_VALIDATION = false

/**
 * Statistics d'import des armures
 * @private
 */
const armorStats = new ImportStats({
  unknownCategories: 0,
  unknownProperties: 0,
})

/**
 * Obtient les statistiques d'import des armures
 * @returns {object} Les statistiques d'import
 */
export function getArmorImportStats() {
  return armorStats.getStats()
}

/**
 * Remet à zéro les statistiques d'import des armures
 */
export function resetArmorImportStats() {
  armorStats.reset({
    unknownCategories: 0,
    unknownProperties: 0,
  })
}

/**
 * Incrémente les statistiques d'import
 * @param {string} stat - Le nom de la statistique à incrémenter
 * @param {number} amount - Le montant à ajouter (défaut: 1)
 */
export function incrementArmorImportStat(stat, amount = 1) {
  armorStats.increment(stat, amount)
}

/**
 * Ajoute une raison de rejet aux statistiques
 * @param {string} reason - La raison du rejet
 */
export function addRejectionReason(reason) {
  armorStats.addRejectionReason(reason)
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
