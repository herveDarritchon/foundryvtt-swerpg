import { describe, it, expect } from 'vitest'
import {
  convertMarkupToHtml,
  escapeHtmlSafe,
  buildDescription,
  resolveSource,
  normalizeFreeSkillRank,
} from '../../../module/importer/utils/description-markup-utils.mjs'

describe('Description Markup Utils', () => {
  describe('normalizeFreeSkillRank', () => {
    it('should normalize valid numbers', () => {
      expect(normalizeFreeSkillRank(3)).toBe(3)
      expect(normalizeFreeSkillRank('5')).toBe(5)
    })

    it('should clamp to 0-8 range', () => {
      expect(normalizeFreeSkillRank(-1)).toBe(0)
      expect(normalizeFreeSkillRank(10)).toBe(8)
    })

    it('should default to 4 for invalid inputs', () => {
      expect(normalizeFreeSkillRank('invalid')).toBe(4)
      expect(normalizeFreeSkillRank(null)).toBe(4)
      expect(normalizeFreeSkillRank(undefined)).toBe(4)
    })
  })

  describe('escapeHtmlSafe', () => {
    it('should escape HTML special characters', () => {
      expect(escapeHtmlSafe('<div>')).toBe('&lt;div&gt;')
      expect(escapeHtmlSafe('Tom & Jerry')).toBe('Tom &amp; Jerry')
      expect(escapeHtmlSafe('"quoted"')).toBe('&quot;quoted&quot;')
      expect(escapeHtmlSafe("it's")).toBe('it&#39;s')
    })

    it('should handle null/undefined', () => {
      expect(escapeHtmlSafe(null)).toBe('')
      expect(escapeHtmlSafe(undefined)).toBe('')
    })
  })

  describe('convertMarkupToHtml', () => {
    it('should convert heading tags', () => {
      expect(convertMarkupToHtml('[H1]Title[/H1]')).toContain('<h1>Title</h1>')
      expect(convertMarkupToHtml('[H2]Subtitle[/h2]')).toContain('<h2>Subtitle</h2>')
    })

    it('should convert bold tags', () => {
      expect(convertMarkupToHtml('[B]Bold[/B]')).toContain('<strong>Bold</strong>')
      expect(convertMarkupToHtml('[b]bold[/b]')).toContain('<strong>bold</strong>')
    })

    it('should convert italic tags', () => {
      expect(convertMarkupToHtml('[I]Italic[/I]')).toContain('<em>Italic</em>')
    })

    it('should convert underline tags', () => {
      expect(convertMarkupToHtml('[U]Underlined[/U]')).toContain('<u>Underlined</u>')
    })

    it('should convert line breaks', () => {
      expect(convertMarkupToHtml('[BR]')).toContain('<br />')
      expect(convertMarkupToHtml('[br]')).toContain('<br />')
    })

    it('should convert horizontal rules', () => {
      expect(convertMarkupToHtml('[HR]')).toContain('<hr />')
    })

    it('should convert lists', () => {
      const markup = '[UL][LI]Item 1[/LI][LI]Item 2[/LI][/UL]'
      const result = convertMarkupToHtml(markup)
      expect(result).toContain('<ul>')
      expect(result).toContain('<li>')
      expect(result).toContain('</ul>')
    })

    it('should remove unsupported tags', () => {
      const result = convertMarkupToHtml('[CENTER]Text[/CENTER]')
      expect(result).not.toContain('[CENTER]')
      expect(result).toContain('Text')
    })

    it('should handle empty input', () => {
      expect(convertMarkupToHtml('')).toBe('')
      expect(convertMarkupToHtml(null)).toBe('')
    })
  })

  describe('resolveSource', () => {
    it('should extract direct source with page', () => {
      const xmlElement = {
        Source: {
          _: 'Core Rulebook',
          $: { Page: '42' },
        },
      }
      const result = resolveSource(xmlElement)
      expect(result.name).toBe('Core Rulebook')
      expect(result.page).toBe(42)
    })

    it('should handle string source', () => {
      const xmlElement = {
        Source: 'Edge of Empire',
      }
      const result = resolveSource(xmlElement)
      expect(result.name).toBe('Edge of Empire')
      expect(result.page).toBeNull()
    })

    it('should handle multiple sources', () => {
      const xmlElement = {
        Sources: {
          Source: [
            { _: 'Book 1', $: { Page: '10' } },
            { _: 'Book 2', $: { Page: '20' } },
          ],
        },
      }
      const result = resolveSource(xmlElement)
      expect(result.name).toBe('Book 1')
      expect(result.page).toBe(10)
    })

    it('should return empty for missing source', () => {
      const result = resolveSource({})
      expect(result.name).toBe('')
      expect(result.page).toBeNull()
    })
  })

  describe('buildDescription', () => {
    it('should build description with markup conversion', () => {
      const markup = '[H2]Title[/H2]\n\n[B]Bold text[/B]'
      const sourceInfo = { name: 'Test Source', page: 10 }
      const result = buildDescription(markup, sourceInfo)
      expect(result).toContain('<h2>Title</h2>')
      expect(result).toContain('<strong>Bold text</strong>')
      expect(result).toContain('Test Source')
      expect(result).toContain('p.10')
    })

    it('should wrap non-tag sections in paragraphs', () => {
      const markup = 'Simple text without tags'
      const result = buildDescription(markup, { name: '', page: null })
      expect(result).toContain('<p>Simple text without tags</p>')
    })

    it('should append source section', () => {
      const result = buildDescription('Content', { name: 'My Book', page: 99 })
      expect(result).toContain('<strong>Source:</strong>')
      expect(result).toContain('My Book')
      expect(result).toContain('p.99')
    })

    it('should handle missing source gracefully', () => {
      const result = buildDescription('Content', { name: '', page: null })
      expect(result).not.toContain('<strong>Source:</strong>')
    })
  })
})
