import { XMLParser, XMLValidator } from 'fast-xml-parser'

import { logger } from '../logger.mjs'
import { XML_PARSER_OPTIONS } from './xml-parser-options.mjs'

/**
 * Parse an XML data string and return the equivalent JSON object.
 *
 * The function wraps the synchronous fast-xml-parser API in a Promise so that
 * callers that already `await` the result continue to work without modification.
 *
 * @module module/utils/xml/parser
 * @requires fast-xml-parser
 * @param {string} data The XML string to parse.
 * @returns {Promise<object>} Resolves with the parsed JSON representation.
 * @throws {Error} Rejects when the XML is structurally invalid.
 * @public
 * @function
 * @name parseXmlToJson
 */
export async function parseXmlToJson(data) {
  if (logger.isDebugEnabled?.()) {
    const validation = XMLValidator.validate(data)
    if (validation !== true) {
      logger.warn('[XMLParser] Invalid XML detected', validation)
    }
  }

  const parser = new XMLParser(XML_PARSER_OPTIONS)
  const jsonData = parser.parse(data)
  logger.debug('[XMLParser] Data XML parsed', jsonData)
  return jsonData
}
