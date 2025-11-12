/**
 * Index des mappings pour l'import des armures OggDude
 * Centralise l'exportation des tables de correspondance
 */

export {
  ARMOR_CATEGORY_MAP,
  resolveArmorCategory,
  getSupportedOggDudeCategories
} from './oggdude-armor-category-map.mjs'

export {
  ARMOR_PROPERTY_MAP,
  resolveArmorProperty,
  resolveArmorProperties,
  getSupportedOggDudeProperties
} from './oggdude-armor-property-map.mjs'