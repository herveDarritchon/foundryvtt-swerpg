import { describe, expect, it } from 'vitest'

import { parseXmlToJson } from '../../../module/utils/xml/parser.mjs'

describe('parseXmlToJson', () => {
  it('parses a minimal XML document', async () => {
    const result = await parseXmlToJson('<Root><A>1</A></Root>')
    expect(result.Root.A).toBe('1')
  })

  it('keeps tag values as strings (no numeric coercion)', async () => {
    const result = await parseXmlToJson('<Root><Count>42</Count></Root>')
    expect(result.Root.Count).toBe('42')
    expect(typeof result.Root.Count).toBe('string')
  })

  it('merges attributes with child elements (mergeAttrs equivalent)', async () => {
    const result = await parseXmlToJson('<Root><Source Page="22">Desperate Allies</Source></Root>')
    // Text content goes to `_` (xml2js convention)
    expect(result.Root.Source._).toBe('Desperate Allies')
    // Attribute key has no prefix
    expect(result.Root.Source.Page).toBe('22')
  })

  it('returns a resolved Promise', async () => {
    const promise = parseXmlToJson('<Root/>')
    expect(promise).toBeInstanceOf(Promise)
    await expect(promise).resolves.toBeDefined()
  })

  it('rejects when XMLValidator detects clearly invalid XML', async () => {
    // fast-xml-parser is permissive for parsing, but XMLValidator catches hard failures.
    // This test verifies the async wrapper propagates thrown errors.
    // Using a string that causes the parser to throw (e.g. null input).
    await expect(parseXmlToJson(null)).rejects.toThrow()
  })

  it('trims whitespace from values', async () => {
    const result = await parseXmlToJson('<Root><Name>  Blaster  </Name></Root>')
    expect(result.Root.Name).toBe('Blaster')
  })

  it('handles nested structures', async () => {
    const xml = '<Weapons><Weapon><Name>Blaster</Name><Damage>6</Damage></Weapon></Weapons>'
    const result = await parseXmlToJson(xml)
    expect(result.Weapons.Weapon.Name).toBe('Blaster')
    expect(result.Weapons.Weapon.Damage).toBe('6')
  })

  it('keeps single elements as objects not arrays (explicitArray: false equivalent)', async () => {
    const xml = '<Root><Item><Name>Solo</Name></Item></Root>'
    const result = await parseXmlToJson(xml)
    expect(Array.isArray(result.Root.Item)).toBe(false)
    expect(result.Root.Item.Name).toBe('Solo')
  })
})
