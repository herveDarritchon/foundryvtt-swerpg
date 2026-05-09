export class WorldItemStorageTarget {
  constructor({ folder, elementType }) {
    this.mode = 'world'
    this.folder = folder
    this.elementType = elementType
    this.label = folder.name
  }

  prepareItemData(itemData) {
    return {
      ...itemData,
      folder: this.folder.id,
    }
  }

  async createDocuments(items) {
    return Item.createDocuments(items)
  }
}
