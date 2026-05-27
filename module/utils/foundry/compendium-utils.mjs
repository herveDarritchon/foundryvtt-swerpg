import { getOggDudePackConfig } from '../oggdude-mapping-config.mjs'

/**
 * Retrieve the compendium pack for the given OggDude element type, returning a result object with pack, config, and reason fields.
 * @param type
 */
export function getCharacterCreationCompendiumPack(type) {
  const packConfig = getOggDudePackConfig(type)
  const pack = game.packs.get(packConfig.fullName)

  if (!pack) {
    return {
      pack: null,
      packConfig,
      reason: 'missing',
    }
  }

  if (pack.documentName !== 'Item') {
    return {
      pack: null,
      packConfig,
      reason: 'invalid-document-type',
      actualDocumentName: pack.documentName,
    }
  }

  return {
    pack,
    packConfig,
    reason: null,
  }
}
