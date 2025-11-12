/**
 * Table de correspondance des catégories d'armure OggDude vers système SwerpgArmor
 * Cette table mappe les codes/noms utilisés dans les données OggDude vers les catégories
 * définies dans SYSTEM.ARMOR.CATEGORIES
 */

/**
 * @typedef {Object} ArmorCategoryMapping
 * @property {string} swerpgCategory - La catégorie correspondante dans le système SwerpgArmor
 * @property {string} description - Description de la correspondance
 */

/**
 * Table de correspondance des catégories d'armure OggDude
 * @type {Record<string, ArmorCategoryMapping>}
 */
export const ARMOR_CATEGORY_MAP = {
  // Catégories de base OggDude
  'Light': {
    swerpgCategory: 'light',
    description: 'Armure légère - faible protection, grande mobilité'
  },
  'Medium': {
    swerpgCategory: 'medium',
    description: 'Armure moyenne - protection équilibrée'
  },
  'Heavy': {
    swerpgCategory: 'heavy',
    description: 'Armure lourde - protection maximale, mobilité réduite'
  },
  
  // Variantes possibles dans les données OggDude
  'light': {
    swerpgCategory: 'light',
    description: 'Armure légère (minuscule)'
  },
  'medium': {
    swerpgCategory: 'medium',
    description: 'Armure moyenne (minuscule)'
  },
  'heavy': {
    swerpgCategory: 'heavy',
    description: 'Armure lourde (minuscule)'
  },
  
  // Catégories spéciales
  'Natural': {
    swerpgCategory: 'natural',
    description: 'Protection naturelle (écailles, carapace, etc.)'
  },
  'Unarmored': {
    swerpgCategory: 'unarmored',
    description: 'Sans armure'
  },
  
  // Codes numériques possibles (si utilisés par OggDude)
  '0': {
    swerpgCategory: 'unarmored',
    description: 'Code 0 = Sans armure'
  },
  '1': {
    swerpgCategory: 'light',
    description: 'Code 1 = Armure légère'
  },
  '2': {
    swerpgCategory: 'medium',
    description: 'Code 2 = Armure moyenne'
  },
  '3': {
    swerpgCategory: 'heavy',
    description: 'Code 3 = Armure lourde'
  },
  '4': {
    swerpgCategory: 'natural',
    description: 'Code 4 = Protection naturelle'
  }
}

/**
 * Résout une catégorie OggDude vers une catégorie SwerpgArmor
 * @param {string} oggDudeCategory - La catégorie depuis les données OggDude
 * @returns {string|null} La catégorie SwerpgArmor correspondante ou null si non trouvée
 */
export function resolveArmorCategory(oggDudeCategory) {
  if (!oggDudeCategory || typeof oggDudeCategory !== 'string') {
    return null
  }
  
  const mapping = ARMOR_CATEGORY_MAP[oggDudeCategory.trim()]
  return mapping ? mapping.swerpgCategory : null
}

/**
 * Obtient toutes les catégories OggDude supportées
 * @returns {string[]} Liste des clés de catégories supportées
 */
export function getSupportedOggDudeCategories() {
  return Object.keys(ARMOR_CATEGORY_MAP)
}