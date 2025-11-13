// Agrégateur global des statistiques d'import OggDude
// Fournit une vue consolidée pour observabilité / logging / UI.

import { getArmorImportStats } from './armor-import-utils.mjs'
import { getWeaponImportStats } from './weapon-import-utils.mjs'
import { getGearImportStats } from './gear-import-utils.mjs'
import { getSpeciesImportStats } from './species-import-utils.mjs'
import { getCareerImportStats } from './career-import-utils.mjs'

/**
 * Récupère toutes les statistiques d'import par type.
 * @returns {{armor:Object,weapon:Object,gear:Object,species:Object,career:Object,totalImported:number,totalRejected:number,totalProcessed:number}}
 */
export function getAllImportStats() {
  const armor = safeCall(getArmorImportStats)
  const weapon = safeCall(getWeaponImportStats)
  const gear = safeCall(getGearImportStats)
  const species = safeCall(getSpeciesImportStats)
  const career = safeCall(getCareerImportStats)

  const totalProcessed = armor.total + weapon.total + gear.total + species.total + career.total
  const totalRejected = armor.rejected + weapon.rejected + gear.rejected + species.rejected + career.rejected
  const totalImported = totalProcessed - totalRejected

  return {
    armor,
    weapon,
    gear,
    species,
    career,
    totalProcessed,
    totalRejected,
    totalImported,
  }
}

function safeCall(fn) {
  try {
    return fn()
  } catch {
    return { total: 0, rejected: 0, imported: 0 }
  }
}
