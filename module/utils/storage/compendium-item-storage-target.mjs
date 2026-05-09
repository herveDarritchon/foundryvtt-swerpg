export class CompendiumItemStorageTarget {
  constructor({ pack, packConfig, elementType }) {
    this.mode = 'compendium'
    this.pack = pack
    this.packConfig = packConfig
    this.elementType = elementType
    this.label = packConfig.fullName
  }

  prepareItemData(itemData) {
    return itemData
  }

  async createDocuments(items) {
    return Item.createDocuments(items, {
      pack: this.packConfig.fullName,
    })
  }
}