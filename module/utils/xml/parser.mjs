import { logger } from '../logger.mjs'

/**
 * Parse a XML data string to JSON string.
 * @module module/utils/xml/parser
 * @requires xml2js
 * @param data {string} The data to parse from XML to JSON.
 * @returns {Promise<string>} The data parsed from XML to JSON.
 * @public
 * @function
 * @name _parseXmlToJson
 */
export async function parseXmlToJson(data) {
  // data {string} The data to parse in a XML format.
  // Assure le chargement du vendor xml2js en environnement de test Node (Vitest)
  if (globalThis.xml2js === undefined) {
    try {
      await import('../../../vendors/xml2js.min.js')
    } catch (e) {
      logger.error('[XMLParser] Impossible de charger xml2js.min.js', { error: e })
      throw e
    }
  }
  const parser = globalThis.xml2js?.js
  if (!parser || typeof parser.parseStringPromise !== 'function') {
    throw new Error('xml2js vendor non chargé ou interface invalide')
  }
  const jsonData = await parser.parseStringPromise(data, {
    explicitArray: false,
    trim: true,
    mergeAttrs: true,
  })
  logger.debug('[XMLParser] Data XML parsed', jsonData)
  return jsonData
}
