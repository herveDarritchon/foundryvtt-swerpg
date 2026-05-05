/**
 * Equipment Mixin - Handles all equipment-related methods
 * Extracted from actor.mjs (originally ~200 lines)
 */

/**
 * @typedef {Object} ActorEquippedWeapons
 * @property {SwerpgItem} mainhand
 * @property {SwerpgItem} offhand
 * @property {boolean} freehand
 * @property {boolean} unarmed
 * @property {boolean} shield
 * @property {boolean} twoHanded
 * @property {boolean} melee
 * @property {boolean} ranged
 * @property {boolean} dualWield
 * @property {boolean} dualMelee
 * @property {boolean} dualRanged
 * @property {boolean} slow
 */

/**
 * @typedef {Object} ActorEquipment
 * @property {SwerpgItem} armor
 * @property {ActorEquippedWeapons} weapons
 * @property {SwerpgItem[]} accessories
 */

import { logger } from '../../utils/logger.mjs'

/**
 * Determine whether the Actor is able to use a free move once per round.
 * @param {SwerpgActor} actor   The Actor being evaluated
 * @param {SwerpgItem} armor    The equipped Armor item.
 * @returns {boolean}             Can the Actor use a free move?
 */
function canFreeMove(actor, armor) {
  if (actor.isWeakened) return false
  if (actor.statuses.has('prone')) return false
  if (armor.system.category === 'heavy' && !actor.talentIds.has('armoredefficiency')) return false
  return true
}

export const EquipmentMixin = (Base) =>
  class extends Base {
    /** @inheritdoc */
    prepareEmbeddedDocuments() {
      super.prepareEmbeddedDocuments()
      const items = this.itemTypes
      this.equipment = this._prepareEquipment(items)
    }

    /**
     * Prepare the equipment object for the Actor.
     * @param {Object} options  The equipment items categorized by type
     * @param {SwerpgItem[]} options.armor  The armor items
     * @param {SwerpgItem[]} options.weapon  The weapon items
     * @param {SwerpgItem[]} options.accessory  The accessory items
     * @returns {ActorEquipment}
     */
    _prepareEquipment({ armor, weapon, accessory } = {}) {
      const equipment = {
        armor: this._prepareArmor(armor),
        weapons: this._prepareWeapons(weapon),
        accessories: {}, // TODO: Equipped Accessories
      }

      // Flag some equipment-related statuses
      equipment.canFreeMove = canFreeMove(this, equipment.armor)
      equipment.unarmored = equipment.armor.system.category === 'unarmored'
      return equipment
    }

    /**
     * Prepare the Armor item that this Actor has equipped.
     * @param {SwerpgItem[]} armorItems       The armor type Items in the Actor's inventory
     * @returns {SwerpgItem}                  The armor Item which is equipped
     * @private
     */
    _prepareArmor(armorItems) {
      let armors = armorItems.filter((i) => i.system.equipped)
      if (armors.length > 1) {
        ui.notifications.warn(`Actor ${this.name} has more than one equipped armor.`)
        armors = [armors[0]]
      }
      return armors[0] || this._getUnarmoredArmor()
    }

    /**
     * Get the default unarmored Armor item used by this Actor if they do not have other equipped armor.
     * @returns {SwerpgItem}
     * @private
     */
    _getUnarmoredArmor() {
      const itemCls = getDocumentClass('Item')
      const armor = new itemCls(SYSTEM.ARMOR.UNARMORED_DATA, { parent: this })
      armor.prepareData()
      return armor
    }

    /**
     * Prepare the Weapons that this Actor has equipped.
     * @param {SwerpgItem[]} weaponItems      The Weapon type Items in the Actor's inventory
     * @returns {ActorEquippedWeapons}        The currently equipped weaponry for the Actor
     * @private
     */
    _prepareWeapons(weaponItems) {
      const slotInUse = (item, type) => {
        item.updateSource({ 'system.equipped': false })
        const w = game.i18n.format('WARNING.CannotEquipSlotInUse', { actor: this.name, item: item.name, type })
        logger.warn(w)
      }

      const equippedWeapons = { mh: [], oh: [], either: [] }
      const slots = SYSTEM.WEAPON.SLOTS
      for (let w of weaponItems) {
        const { equipped, slot } = w.system
        if (!equipped) continue
        if ([slots.MAINHAND, slots.TWOHAND].includes(slot)) equippedWeapons.mh.unshift(w)
        else if (slot === slots.OFFHAND) equippedWeapons.oh.unshift(w)
        else if (slot === slots.EITHER) equippedWeapons.either.unshift(w)
      }
      equippedWeapons.either.sort((a, b) => b.system.damage.base - a.system.damage.base)

      const weapons = {}
      let mhOpen = true
      let ohOpen = true

      for (const w of equippedWeapons.mh) {
        if (!mhOpen) slotInUse(w, 'mainhand')
        else {
          weapons.mainhand = w
          mhOpen = false
          if (w.system.slot === slots.TWOHAND) ohOpen = false
        }
      }

      for (const w of equippedWeapons.oh) {
        if (!ohOpen) slotInUse(w, 'offhand')
        else {
          weapons.offhand = w
          ohOpen = false
        }
      }

      for (const w of equippedWeapons.either) {
        if (mhOpen) {
          weapons.mainhand = w
          w.system.slot = slots.MAINHAND
          mhOpen = false
        } else if (ohOpen) {
          weapons.offhand = w
          w.system.slot = slots.OFFHAND
          ohOpen = false
        } else slotInUse(w, 'mainhand')
      }

      if (!weapons.mainhand) weapons.mainhand = this._getUnarmedWeapon()
      return weapons
    }

    /**
     * Get the default unarmed weapon used by this Actor if they do not have other weapons equipped.
     * @returns {SwerpgItem}
     * @private
     */
    _getUnarmedWeapon() {
      return {}
    }

    /**
     * Equip an owned armor Item.
     * @param {string} itemId       The owned Item id of the Armor to equip
     * @param {object} [options]    Options which configure how armor is equipped
     * @param {boolean} [options.equipped]  Is the armor being equipped (true), or unequipped (false)
     * @returns {Promise}            A Promise which resolves once the armor has been equipped or un-equipped
     */
    async equipArmor(itemId, { equipped = true } = {}) {
      const current = this.equipment.armor
      const item = this.items.get(itemId)

      if (current === item) {
        if (equipped) return current
        else return current.update({ 'system.equipped': false })
      }

      if (current.id) {
        return ui.notifications.warn(
          game.i18n.format('WARNING.CannotEquipSlotInUse', {
            actor: this.name,
            item: item.name,
            type: game.i18n.localize('TYPES.Item.armor'),
          }),
        )
      }

      return item.update({ 'system.equipped': true })
    }

    /**
     * Equip an owned weapon Item.
     * @param {string} itemId       The owned Item id of the Weapon to equip. The slot is automatically determined.
     * @param {object} [options]    Options which configure how the weapon is equipped.
     * @param {number} [options.slot]       A specific equipment slot in SYSTEM.WEAPON.SLOTS
     * @param {boolean} [options.equipped]  Whether the weapon should be equipped (true) or unequipped (false)
     * @returns {Promise}            A Promise which resolves once the weapon has been equipped or un-equipped
     */
    async equipWeapon(itemId, { slot, equipped = true } = {}) {
      const weapon = this.items.get(itemId, { strict: true })
      const { actionCost, actorUpdates, itemUpdates } = equipped ? this.#equipWeapon(weapon, slot) : this.#unequipWeapon(weapon)

      if (this.combatant) {
        if (this.system.resources.action.value < actionCost) {
          throw new Error(game.i18n.localize('WARNING.CannotEquipActionCost'))
        }
        await this.alterResources({ action: -actionCost }, actorUpdates)
      }

      await this.updateEmbeddedDocuments('Item', itemUpdates)
    }

    /**
     * Identify updates which should be made when un-equipping a weapon.
     * @param {SwerpgItem} [weapon]     A weapon being unequipped
     * @returns {{itemUpdates: object[], actionCost: number, actorUpdates: {}}}
     */
    #unequipWeapon(weapon) {
      const itemUpdates = []
      const actorUpdates = {}
      const actionCost = 0
      if (weapon.system.equipped) itemUpdates.push({ _id: weapon.id, 'system.equipped': false })
      if (itemUpdates.length) foundry.utils.setProperty(actorUpdates, 'system.status.unequippedWeapon', true)
      return { itemUpdates, actionCost, actorUpdates }
    }

    /**
     * Identify updates which should be made when equipping a weapon.
     * @param {SwerpgItem} weapon     A weapon being equipped
     * @param {number} slot             A requested equipment slot in SYSTEM.WEAPON.SLOTS
     * @returns {{itemUpdates: object[], actionCost: number, actorUpdates: {}}}
     */
    #equipWeapon(weapon, slot) {
      const category = weapon.config.category
      const slots = SYSTEM.WEAPON.SLOTS
      const { mainhand, offhand } = this.equipment.weapons

      if (slot === undefined) {
        if (category.hands === 2) slot = slots.TWOHAND
        else if (category.main) slot = mainhand.id && category.off ? slots.OFFHAND : slots.MAINHAND
        else if (category.off) slot = slots.OFFHAND
      }

      let occupied
      switch (slot) {
        case slots.TWOHAND:
          if (mainhand.id) occupied = mainhand
          else if (offhand.id) occupied = offhand
          break
        case slots.MAINHAND:
          if (mainhand.id) occupied = mainhand
          break
        case slots.OFFHAND:
          if (offhand?.id) occupied = offhand
          else if (mainhand.config.category.hands === 2) occupied = mainhand
          break
      }
      if (occupied)
        throw new Error(
          game.i18n.format('WARNING.CannotEquipSlotInUse', {
            actor: this.name,
            item: weapon.name,
            type: game.i18n.localize(slots.label(slot)),
          }),
        )

      const itemUpdates = [{ _id: weapon.id, 'system.equipped': true, 'system.slot': slot }]
      const actorUpdates = {}

      let actionCost = weapon.system.properties.has('ambush') ? 0 : 1
      if (actionCost && this.talentIds.has('preparedness0000') && !this.system.status.hasMoved) {
        actionCost = 0
        foundry.utils.setProperty(actorUpdates, 'system.status.hasMoved', true)
      }
      return { itemUpdates, actorUpdates, actionCost }
    }
  }
