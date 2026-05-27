import { parseStringPromise } from 'xml2js'

import { logger } from '../logger.mjs'

/**
 * Parse a XML data string to JSON string.
 * @module module/utils/xml/parser
 * @requires xml2js
 * @param {string} data The data to parse from XML to JSON.
 * @returns {Promise<object>} The data parsed from XML to JSON.
 * @public
 * @function
 * @name parseXmlToJson
 */
export async function parseXmlToJson(data) {
  const jsonData = await parseStringPromise(data, {
    explicitArray: false,
    trim: true,
    mergeAttrs: true,
  })
  logger.debug('[XMLParser] Data XML parsed', jsonData)
  return jsonData
}
