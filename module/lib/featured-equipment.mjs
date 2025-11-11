/**
 * Pure métier: calcule la liste d'équipement à afficher dans la sidebar.
 * Ne dépend pas de Foundry (sauf structure de données minimale déjà préparée côté adaptateur).
 *
 * Contrat entrée:
 * - armor: objet ou null { id, name, img, system: { equipped, broken, soak }, getTags(type) }
 * - weapons: tableau d'objets { id, name, img, system: { equipped, broken, slot, damage, range }, getTags(type) }
 *   Attendu que seules les armes équipées sont fournies.
 *
 * Sortie: Array<{ id, name, img, type, slot, tags: string[], cssClass, isEquipped, system }>
 * - slot: 'armor' | 'mainhand' | 'offhand' | 'twohand'
 * - tags: max 4 tags courts (fallback si vide)
 * - cssClass: 'equipped' (+ 'broken' si cassé)
 * - isEquipped: boolean (toujours true car filtré en amont)
 *
 * Règles:
 * - Si une arme twohand est présente, ignorer toute offhand.
 * - Fallback tags: Armor: ['Armor','Soak'] ; Weapon: ['Dmg','Range'].
 * - Ne pas muter les objets source.
 *
 * @param {{ armor?: any, weapons?: any[] }} params
 * @returns {Array<object>}
 */
export function computeFeaturedEquipment({ armor = null, weapons = [] } = {}) {
  const featured = []

  // Helper non mutateur pour construire l'output
  const build = (src, { type, slot }) => {
    const system = src.system || {}
    const broken = Boolean(system.broken)
    // Récupération tags courts
    let tagsObj = {}
    try {
      if (typeof src.getTags === 'function') tagsObj = src.getTags('short') || {}
    } catch (_) {
      // Défensif: ne jamais casser l'affichage
      tagsObj = {}
    }
    let tags = Object.values(tagsObj).filter((t) => typeof t === 'string' && t.trim())
    // Fallbacks si absence
    if (!tags.length) {
      tags = type === 'armor' ? ['Armor', 'Soak'] : ['Dmg', 'Range']
    }
    // Limiter à 4 pour lisibilité
    tags = tags.slice(0, 4)
    return {
      id: src.id,
      name: src.name,
      img: src.img,
      type,
      slot,
      tags,
      cssClass: broken ? 'equipped broken' : 'equipped',
      isEquipped: true,
      system: { ...system }, // copie défensive superficielle
    }
  }

  // Armor
  if (armor && armor.system?.equipped) {
    featured.push(build(armor, { type: 'armor', slot: 'armor' }))
  }

  // Weapons équipées seulement
  const equippedWeapons = weapons.filter((w) => w?.system?.equipped)
  if (equippedWeapons.length) {
    // Détection twohand
    const twoHand = equippedWeapons.find((w) => w.system?.slot === 'twohand')
    if (twoHand) {
      featured.push(build(twoHand, { type: 'weapon', slot: 'twohand' }))
    } else {
      // Main / Offhand
      const main = equippedWeapons.find((w) => w.system?.slot === 'mainhand')
      const off = equippedWeapons.find((w) => w.system?.slot === 'offhand')
      if (main) featured.push(build(main, { type: 'weapon', slot: 'mainhand' }))
      if (off) featured.push(build(off, { type: 'weapon', slot: 'offhand' }))
    }
  }

  return featured
}
