import { describe, it, expect } from 'vitest'
import { clampNumber, sanitizeText, sanitizeDescription } from '../../../module/importer/utils/text.mjs'

describe('Text Utils', () => {
  describe('clampNumber', () => {
    it('should clamp value between min and max', () => {
      expect(clampNumber(5, 0, 10)).toBe(5)
      expect(clampNumber(-5, 0, 10)).toBe(0)
      expect(clampNumber(15, 0, 10)).toBe(10)
    })

    it('should handle string inputs', () => {
      expect(clampNumber('5', 0, 10)).toBe(5)
      expect(clampNumber('15', 0, 10)).toBe(10)
    })

    it('should return default value for invalid inputs', () => {
      expect(clampNumber('invalid', 0, 10, 5)).toBe(5)
      expect(clampNumber(null, 0, 10, 0)).toBe(0)
      expect(clampNumber(undefined, 0, 10, 3)).toBe(3)
    })
  })

  describe('sanitizeText', () => {
    it('should remove script tags', () => {
      const input = 'Hello <script>alert("xss")</script> World'
      const result = sanitizeText(input)
      expect(result).not.toContain('<script>')
      expect(result).toContain('&lt;script')
    })

    it('should remove style tags', () => {
      const input = 'Hello <style>body{color:red}</style> World'
      const result = sanitizeText(input)
      expect(result).not.toContain('<style>')
      expect(result).toContain('&lt;style')
    })

    it('should trim whitespace', () => {
      expect(sanitizeText('  hello  ')).toBe('hello')
    })

    it('should handle empty or invalid inputs', () => {
      expect(sanitizeText('')).toBe('')
      expect(sanitizeText(null)).toBe('')
      expect(sanitizeText(undefined)).toBe('')
    })
  })

  describe('sanitizeDescription', () => {
    it('should remove script tags from rich text', () => {
      const input = '<p>Test</p><script>alert("xss")</script><p>Content</p>'
      const result = sanitizeDescription(input)
      expect(result).not.toContain('<script>')
      expect(result).toContain('<p>Test</p>')
    })

    it('should normalize line breaks', () => {
      const input = 'Line1\r\nLine2\r\nLine3'
      const result = sanitizeDescription(input)
      expect(result).not.toContain('\r\n')
      expect(result).toContain('\n')
    })

    it('should preserve line breaks when option is true', () => {
      const input = 'Line1\n\nLine2\n\n\n\nLine3'
      const result = sanitizeDescription(input, 2000, { preserveLineBreaks: true })
      expect(result).toContain('\n\n')
      expect(result).not.toContain('\n\n\n')
    })

    it('should collapse all whitespace when preserveLineBreaks is false', () => {
      const input = 'Word1   \n\n  Word2'
      const result = sanitizeDescription(input, 2000, { preserveLineBreaks: false })
      expect(result).toBe('Word1 Word2')
    })

    it('should truncate long descriptions', () => {
      const longText = 'a'.repeat(100)
      const result = sanitizeDescription(longText, 50)
      expect(result.length).toBe(50)
      expect(result).toMatch(/\.\.\.$/)
    })

    it('should handle empty input', () => {
      expect(sanitizeDescription('')).toBe('')
      expect(sanitizeDescription(null)).toBe('')
    })

    it('should handle errors gracefully', () => {
      // This should not throw
      const result = sanitizeDescription({
        toString: () => {
          throw new Error('test')
        },
      })
      expect(result).toBe('')
    })
  })
})
