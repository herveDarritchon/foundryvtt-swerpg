/**
 * Shared utilities for OggDude markup conversion and description processing.
 * Extracted from career-ogg-dude.mjs for reuse across career and specialization importers.
 */

import { sanitizeDescription } from './text.mjs'

/**
 * Normalise la valeur FreeRanks en entier borné 0-8, défaut 4.
 * @param {any} raw
 * @returns {number}
 */
export function normalizeFreeSkillRank(raw) {
  let n = Number.parseInt(raw, 10)
  if (Number.isNaN(n)) n = 4
  if (n < 0) n = 0
  if (n > 8) n = 8
  return n
}

/**
 * Résout les informations de source depuis un objet XML career/specialization.
 * @param {object} xmlElement - Élément XML (career ou specialization)
 * @returns {{name: string, page: number|null}}
 */
export function resolveSource(xmlElement) {
  if (!xmlElement) return { name: '', page: null }

  const directSource = xmlElement.Source ?? xmlElement.source
  if (directSource) {
    return extractSourceEntry(directSource)
  }

  const multipleSources = xmlElement.Sources?.Source ?? xmlElement.sources?.Source ?? xmlElement.Sources?.source
  if (Array.isArray(multipleSources)) {
    for (const entry of multipleSources) {
      const resolved = extractSourceEntry(entry)
      if (resolved.name) return resolved
    }
  } else if (multipleSources) {
    const resolved = extractSourceEntry(multipleSources)
    if (resolved.name) return resolved
  }

  return { name: '', page: null }
}

/**
 * Extrait name et page depuis une entrée source.
 * @param {string|object} entry
 * @returns {{name: string, page: number|null}}
 */
function extractSourceEntry(entry) {
  if (!entry) return { name: '', page: null }

  if (typeof entry === 'string') {
    const name = sanitizeDescription(entry, 256, { preserveLineBreaks: false })
    return { name, page: null }
  }

  if (typeof entry === 'object') {
    const rawName = entry._ ?? entry.name ?? entry.Name ?? entry.label ?? ''
    const sanitizedName = sanitizeDescription(rawName, 256, { preserveLineBreaks: false })
    const pageCandidate = entry?.$?.Page ?? entry?.$?.page ?? entry?.page ?? entry?.Page ?? null
    const parsedPage = Number.parseInt(pageCandidate, 10)
    const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : null
    return { name: sanitizedName, page }
  }

  return { name: '', page: null }
}

/**
 * Construit la description HTML à partir du markup OggDude et des infos source.
 * @param {string} rawDescription
 * @param {{name: string, page: number|null}} sourceInfo
 * @returns {string}
 */
export function buildDescription(rawDescription, sourceInfo) {
  const markupHtml = convertMarkupToHtml(rawDescription)
  const sections = markupHtml
    .split(/\n{2,}/)
    .map((section) => section.trim())
    .filter(Boolean)

  const htmlSections = sections.map((section) => {
    const lower = section.toLowerCase()
    if (lower.startsWith('<h1') || lower.startsWith('<h2') || lower.startsWith('<h3') || lower.startsWith('<h4') || lower.startsWith('<h5') || lower.startsWith('<h6')) {
      return section
    }
    if (lower.startsWith('<ul') || lower.startsWith('<ol') || lower.startsWith('<li') || lower.startsWith('<p') || lower.startsWith('<hr')) {
      return section
    }
    const withLineBreaks = section.replace(/\n/g, '<br />')
    return `<p>${withLineBreaks}</p>`
  })

  const withSource = appendSourceSection(htmlSections, sourceInfo)
  const html = withSource.join('\n').trim()
  if (!html) return ''
  return sanitizeDescription(html, 2000, { preserveLineBreaks: true })
}

/**
 * Ajoute une section source à la fin des sections HTML.
 * @param {string[]} sections
 * @param {{name: string, page: number|null}} sourceInfo
 * @returns {string[]}
 */
function appendSourceSection(sections, sourceInfo) {
  if (!sourceInfo?.name) {
    return sections
  }

  const escapedName = escapeHtmlSafe(sourceInfo.name)
  const escapedPage = typeof sourceInfo.page === 'number' ? escapeHtmlSafe(String(sourceInfo.page)) : null
  const pageSuffix = escapedPage ? `, p.${escapedPage}` : ''
  return [...sections, `<p><strong>Source:</strong> ${escapedName}${pageSuffix}</p>`]
}

/**
 * Convertit le markup OggDude en HTML.
 * @param {string} description
 * @returns {string}
 */
export function convertMarkupToHtml(description) {
  if (!description) {
    return ''
  }

  let result = String(description).replace(/\r\n/g, '\n')

  for (let level = 1; level <= 6; level += 1) {
    const open = new RegExp(`\\[H${level}\\]`, 'g')
    const closeLower = new RegExp(`\\[h${level}\\]`, 'g')
    const closeUpper = new RegExp(`\\[/H${level}\\]`, 'g')
    const closeExplicit = new RegExp(`\\[/h${level}\\]`, 'g')
    result = result.replace(open, `<h${level}>`)
    result = result.replace(closeLower, `</h${level}>`)
    result = result.replace(closeUpper, `</h${level}>`)
    result = result.replace(closeExplicit, `</h${level}>`)
  }

  const replacements = [
    { regex: /\[B\]/g, replacement: '<strong>' },
    { regex: /\[b\]/g, replacement: '<strong>' },
    { regex: /\[\/B\]/g, replacement: '</strong>' },
    { regex: /\[\/b\]/g, replacement: '</strong>' },
    { regex: /\[I\]/g, replacement: '<em>' },
    { regex: /\[i\]/g, replacement: '<em>' },
    { regex: /\[\/I\]/g, replacement: '</em>' },
    { regex: /\[\/i\]/g, replacement: '</em>' },
    { regex: /\[U\]/g, replacement: '<u>' },
    { regex: /\[u\]/g, replacement: '<u>' },
    { regex: /\[\/U\]/g, replacement: '</u>' },
    { regex: /\[\/u\]/g, replacement: '</u>' },
    { regex: /\[(?:BR|br)\]/g, replacement: '<br />' },
    { regex: /\[(?:HR|hr)\]/g, replacement: '<hr />' },
    { regex: /\[P\]/g, replacement: '<p>' },
    { regex: /\[p\]/g, replacement: '<p>' },
    { regex: /\[\/P\]/g, replacement: '</p>' },
    { regex: /\[\/p\]/g, replacement: '</p>' },
    { regex: /\[UL\]/gi, replacement: '<ul>' },
    { regex: /\[\/UL\]/gi, replacement: '</ul>' },
    { regex: /\[OL\]/gi, replacement: '<ol>' },
    { regex: /\[\/OL\]/gi, replacement: '</ol>' },
    { regex: /\[LI\]/gi, replacement: '<li>' },
    { regex: /\[\/LI\]/gi, replacement: '</li>' },
  ]

  for (const { regex, replacement } of replacements) {
    result = result.replace(regex, replacement)
  }

  result = result.replace(/\[(?:CENTER|LEFT|RIGHT)\]/gi, '')
  result = result.replace(/\[\/(?:CENTER|LEFT|RIGHT)\]/gi, '')
  result = result.replace(/\[COLOR=.*?\]/gi, '')
  result = result.replace(/\[\/COLOR\]/gi, '')

  result = result.replace(/<\/h([1-6])>/g, '</h$1>\n\n')
  result = result.replace(/<h([1-6])>([^<]*?)\s+<\/h([1-6])>/g, (match, level, content, closingLevel) => {
    if (level !== closingLevel) return match
    return `<h${level}>${content.trimEnd()}</h${level}>`
  })

  result = result.replace(/\[[^\[\]]+\]/g, '')

  return result
}

/**
 * Échappe les caractères HTML pour prévenir l'injection.
 * @param {any} value
 * @returns {string}
 */
export function escapeHtmlSafe(value) {
  const text = String(value ?? '')
  if (typeof foundry !== 'undefined' && foundry?.utils?.escapeHTML) {
    return foundry.utils.escapeHTML(text)
  }
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }
  return text.replace(/[&<>"']/g, (char) => map[char] || char)
}
