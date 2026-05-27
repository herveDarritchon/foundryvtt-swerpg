/**
 * Centralised fast-xml-parser options for the SWERPG system.
 *
 * These options reproduce the behaviour previously obtained with xml2js and the
 * options `{ explicitArray: false, trim: true, mergeAttrs: true }`:
 *
 * - `trimValues: true`          → equivalent of `trim: true`
 * - `ignoreAttributes: false`   → attributes are parsed (not ignored)
 * - `attributeNamePrefix: ''`   → attribute keys have no prefix, so they merge
 *                                  naturally with child-element keys
 *                                  (equivalent of `mergeAttrs: true`)
 * - `parseTagValue: false`      → tag values are kept as strings (xml2js always
 *                                  returned strings; fast-xml-parser would otherwise
 *                                  coerce numeric text to JS numbers)
 * - `parseAttributeValue: false`→ attribute values are kept as strings for the
 *                                  same reason
 * - `textNodeName: '_'`         → text content of mixed-content elements (those
 *                                  that have both attributes and text) is stored
 *                                  under `_`, matching the xml2js convention used
 *                                  throughout the OggDude mapper layer
 *
 * By default fast-xml-parser does NOT wrap single elements in arrays
 * (`isArray` default is `() => false`), which mirrors `explicitArray: false`.
 *
 * @module module/utils/xml/xml-parser-options
 */

/** @type {import('fast-xml-parser').X2jOptions} */
export const XML_PARSER_OPTIONS = {
  trimValues: true,
  ignoreAttributes: false,
  attributeNamePrefix: '',
  parseTagValue: false,
  parseAttributeValue: false,
  textNodeName: '_',
}
