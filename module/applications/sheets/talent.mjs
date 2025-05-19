import SwerpgBaseItemSheet from "./base-item.mjs";
import {getItemsOf} from "../../utils/items.mjs";

/**
 * A SwerpgBaseItemSheet subclass used to configure Items of the "talent" type.
 */
export default class TalentSheet extends SwerpgBaseItemSheet {

  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    item: {
      type: "talent",
      includesActions: true,
      includesHooks: true
    },
    dragDrop: [{ dragSelector: "[draggable]", dropSelector: null }],
  };

  // Initialize subclass options
  static {
    this._initializeItemSheetClass()
  }

  /* -------------------------------------------- */
  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    return {
      ...context,
      availableSpecializations: getItemsOf(game.items, "specialization"),
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    new DragDrop.implementation({
      dragSelector: ".draggable",
      permissions: {
        dragstart: this._canDragStart.bind(this),
        drop: this._canDragDrop.bind(this)
      },
      callbacks: {
        dragstart: this._onDragStart.bind(this),
        dragover: this._onDragOver.bind(this),
        drop: this._onDrop.bind(this)
      }
    }).bind(this.element);
  }

  _canDragStart(selector) {
    return this.isEditable;
  }

  _canDragDrop(selector) {
    return this.isEditable;
  }

  async _onDragStart(event) {
    const target = event.currentTarget;
    if ( "link" in event.target.dataset ) return;
    let dragData;

    // Owned Items
    if ( target.dataset.itemId ) {
      const item = this.item.system.some.path.to.item.reference;
      dragData = item.toDragData();
    }

    // Active Effect
    if ( target.dataset.effectId ) {
      const effect = this.item.effects.get(target.dataset.effectId);
      dragData = effect.toDragData();
    }

    // Set data transfer
    if ( !dragData ) return;
    event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
  }

  _onDragOver(event) {}

  /**
   * Callback actions which occur when a dragged element is dropped on a target.
   * Seul un item de type Specialization peut être déposé sur une voie.
   * @param {DragEvent} event       The originating DragEvent
   * @protected
   */
  async _onDrop(event) {
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event)

    switch (data.type) {
      case "Item":
        if (this.isPlayMode) return
        const item = await fromUuid(data.uuid)
        if (item.type !== "specialization") {
          ui.notifications.warn(game.i18n.localize("TALENT.WARNINGS.InvalidItemType"))
          return
        }

        console.debug("dropped item", item)
        const talents = this.item.toObject().system.talents
        talents.push(item.uuid)
        this.item.update({ "system.talents": talents })
    }
  }

}
