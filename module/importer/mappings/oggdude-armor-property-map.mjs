/**
 * Table de correspondance des propriétés d'armure OggDude vers système SwerpgArmor
 * Cette table mappe les propriétés/tags utilisés dans les données OggDude vers les propriétés
 * définies dans SYSTEM.ARMOR.PROPERTIES
 */

/**
 * @typedef {Object} ArmorPropertyMapping
 * @property {string} swerpgProperty - La propriété correspondante dans le système SwerpgArmor
 * @property {string} description - Description de la correspondance
 */

/**
 * Table de correspondance des propriétés d'armure OggDude
 * @type {Record<string, ArmorPropertyMapping>}
 */
export const ARMOR_PROPERTY_MAP = {
  // Propriétés de base supportées par SwerpgArmor
  Bulky: {
    swerpgProperty: 'bulky',
    description: 'Armure encombrante qui réduit la mobilité',
  },
  bulky: {
    swerpgProperty: 'bulky',
    description: 'Armure encombrante (minuscule)',
  },
  Organic: {
    swerpgProperty: 'organic',
    description: 'Matériau organique (cuir, écailles, etc.)',
  },
  organic: {
    swerpgProperty: 'organic',
    description: 'Matériau organique (minuscule)',
  },

  // Variantes possibles dans OggDude (à mapper vers propriétés existantes)
  Heavy: {
    swerpgProperty: 'bulky',
    description: 'Propriété lourde mappée vers bulky',
  },
  Unwieldy: {
    swerpgProperty: 'bulky',
    description: 'Propriété difficile à manier mappée vers bulky',
  },
  Natural: {
    swerpgProperty: 'organic',
    description: 'Protection naturelle mappée vers organic',
  },
  Leather: {
    swerpgProperty: 'organic',
    description: 'Armure en cuir mappée vers organic',
  },
  Hide: {
    swerpgProperty: 'organic',
    description: 'Armure en peau mappée vers organic',
  },

  // Codes numériques possibles (si utilisés par OggDude)
  1: {
    swerpgProperty: 'bulky',
    description: 'Code 1 = Propriété bulky',
  },
  2: {
    swerpgProperty: 'organic',
    description: 'Code 2 = Propriété organic',
  },
}

/**
 * Résout une propriété OggDude vers une propriété SwerpgArmor
 * @param {string} oggDudeProperty - La propriété depuis les données OggDude
 * @returns {string|null} La propriété SwerpgArmor correspondante ou null si non trouvée
 */
export function resolveArmorProperty(oggDudeProperty) {
  if (!oggDudeProperty || typeof oggDudeProperty !== 'string') {
    return null
  }

  const mapping = ARMOR_PROPERTY_MAP[oggDudeProperty.trim()]
  return mapping ? mapping.swerpgProperty : null
}

/**
 * Résout un tableau de propriétés OggDude vers un Set de propriétés SwerpgArmor
 * @param {string[]} oggDudeProperties - Les propriétés depuis les données OggDude
 * @returns {{resolvedProperties: Set<string>, unknownProperties: string[]}}
 *   Propriétés résolues et propriétés inconnues
 */
export function resolveArmorProperties(oggDudeProperties) {
  const resolvedProperties = new Set()
  const unknownProperties = []

  if (!Array.isArray(oggDudeProperties)) {
    return { resolvedProperties, unknownProperties }
  }

  for (const property of oggDudeProperties) {
    const resolved = resolveArmorProperty(property)
    if (resolved) {
      resolvedProperties.add(resolved)
    } else {
      unknownProperties.push(property)
    }
  }

  return { resolvedProperties, unknownProperties }
}

/**
 * Obtient toutes les propriétés OggDude supportées
 * @returns {string[]} Liste des clés de propriétés supportées
 */
export function getSupportedOggDudeProperties() {
  return Object.keys(ARMOR_PROPERTY_MAP)
}
