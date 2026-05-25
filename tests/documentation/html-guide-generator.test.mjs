import { describe, expect, it } from 'vitest'
import { generateHtmlFromMetadata, generateIndexHtml, escapeHtml, resolveScreenshotUrl } from '../../e2e/documentation/utils/html-guide-generator.mjs'

/**
 * Tests for the HTML user guide generator.
 *
 * The generators are pure functions: given a GuideMetadata object, they return
 * a deterministic HTML string. No file I/O, no Foundry, no browser.
 */

/** @type {import('../../e2e/documentation/utils/html-guide-generator.mjs').GuideMetadata} */
const MINIMAL_METADATA = {
  guide: 'character-sheet',
  title: 'Character Sheet',
  description: 'Documentation journey for the Swerpg character sheet.',
  generatedAt: '2026-05-25T06:21:21.826Z',
  world: 'documentation-world',
  screenshotsDir: 'documentation-output/screenshots/character-sheet',
  steps: [
    {
      index: 1,
      title: 'General view of the documentation world',
      userAction: 'Opening the session in the documentation world',
      expectedState: 'The /game page is loaded with the sidebar visible and no application open',
      screenshotPath: 'documentation-output/screenshots/character-sheet/01-general-view.png',
      recordedAt: '2026-05-25T06:20:42.090Z',
    },
    {
      index: 2,
      title: 'Actors sidebar open',
      userAction: 'Click on the Actors tab in the sidebar navigation bar',
      expectedState: 'The list of actors is visible in the sidebar',
      screenshotPath: 'documentation-output/screenshots/character-sheet/02-actors-sidebar.png',
      recordedAt: '2026-05-25T06:20:54.310Z',
    },
  ],
}

describe('generateHtmlFromMetadata', () => {
  it('produces a valid HTML5 document', () => {
    const result = generateHtmlFromMetadata(MINIMAL_METADATA)
    expect(result).toContain('<!DOCTYPE html>')
    expect(result).toContain('<html lang="en">')
    expect(result).toContain('</html>')
  })

  it('sets the page title with the guide title', () => {
    const result = generateHtmlFromMetadata(MINIMAL_METADATA)
    expect(result).toContain('<title>Character Sheet — Swerpg User Guide</title>')
  })

  it('includes the guide title as H1', () => {
    const result = generateHtmlFromMetadata(MINIMAL_METADATA)
    expect(result).toContain('<h1>Character Sheet</h1>')
  })

  it('includes the guide description', () => {
    const result = generateHtmlFromMetadata(MINIMAL_METADATA)
    expect(result).toContain('Documentation journey for the Swerpg character sheet.')
  })

  it('includes world name in prerequisites', () => {
    const result = generateHtmlFromMetadata(MINIMAL_METADATA)
    expect(result).toContain('<code>documentation-world</code>')
  })

  it('renders each step with zero-padded number', () => {
    const result = generateHtmlFromMetadata(MINIMAL_METADATA)
    expect(result).toContain('<div class="step-number">01</div>')
    expect(result).toContain('<div class="step-number">02</div>')
  })

  it('renders step titles', () => {
    const result = generateHtmlFromMetadata(MINIMAL_METADATA)
    expect(result).toContain('General view of the documentation world')
    expect(result).toContain('Actors sidebar open')
  })

  it('renders userAction and expectedState for each step', () => {
    const result = generateHtmlFromMetadata(MINIMAL_METADATA)
    expect(result).toContain('Opening the session in the documentation world')
    expect(result).toContain('The /game page is loaded with the sidebar visible and no application open')
  })

  it('embeds screenshot references with stable relative URLs', () => {
    const result = generateHtmlFromMetadata(MINIMAL_METADATA)
    // HTML is at documentation-output/html/<guide>.html
    // Screenshot is at documentation-output/screenshots/<guide>/01-*.png
    // Relative URL: ../screenshots/<guide>/01-*.png
    expect(result).toContain('src="../screenshots/character-sheet/01-general-view.png"')
    expect(result).toContain('src="../screenshots/character-sheet/02-actors-sidebar.png"')
  })

  it('uses forward slashes in screenshot URLs regardless of OS path separator', () => {
    const result = generateHtmlFromMetadata(MINIMAL_METADATA)
    const srcMatches = [...result.matchAll(/src="([^"]+\.png)"/g)]
    for (const [, url] of srcMatches) {
      expect(url).not.toContain('\\')
    }
  })

  it('includes a breadcrumb link to index.html', () => {
    const result = generateHtmlFromMetadata(MINIMAL_METADATA)
    expect(result).toContain('href="index.html"')
  })

  it('includes the generation date in the footer', () => {
    const result = generateHtmlFromMetadata(MINIMAL_METADATA)
    expect(result).toContain('2026-05-25')
    expect(result).toContain('pnpm run docs:generate-user-guides:html')
  })

  it('embeds CSS with no external dependencies', () => {
    const result = generateHtmlFromMetadata(MINIMAL_METADATA)
    expect(result).toContain('<style>')
    expect(result).not.toMatch(/rel="stylesheet"/)
    expect(result).not.toMatch(/src="https?:/)
  })

  it('is deterministic — same metadata produces identical output', () => {
    const first = generateHtmlFromMetadata(MINIMAL_METADATA)
    const second = generateHtmlFromMetadata(MINIMAL_METADATA)
    expect(first).toBe(second)
  })

  it('handles a guide with no steps gracefully', () => {
    const emptyMetadata = { ...MINIMAL_METADATA, steps: [] }
    const result = generateHtmlFromMetadata(emptyMetadata)
    expect(result).toContain('<!DOCTYPE html>')
    expect(result).not.toContain('<div class="step-number">')
  })

  it('escapes HTML special characters in user-provided strings', () => {
    const xssMetadata = {
      ...MINIMAL_METADATA,
      title: 'Guide <script>alert(1)</script>',
      steps: [
        {
          ...MINIMAL_METADATA.steps[0],
          title: 'Step with "quotes" & <tags>',
          userAction: "Action with 'apostrophes'",
          expectedState: 'Result with <b>bold</b>',
        },
      ],
    }
    const result = generateHtmlFromMetadata(xssMetadata)
    expect(result).not.toContain('<script>alert(1)</script>')
    expect(result).toContain('&lt;script&gt;')
    expect(result).toContain('&lt;tags&gt;')
    expect(result).toContain('&lt;b&gt;')
  })
})

describe('generateIndexHtml', () => {
  const GUIDES = [
    { guideId: 'character-sheet', title: 'Character Sheet', description: 'Journey for the character sheet.', stepCount: 4, filename: 'character-sheet.html' },
    { guideId: 'actor-creation', title: 'Actor Creation', description: 'How to create a new actor.', stepCount: 2, filename: 'actor-creation.html' },
  ]

  it('produces a valid HTML5 document', () => {
    const result = generateIndexHtml(GUIDES)
    expect(result).toContain('<!DOCTYPE html>')
    expect(result).toContain('<html lang="en">')
  })

  it('lists all guide titles as links', () => {
    const result = generateIndexHtml(GUIDES)
    expect(result).toContain('href="character-sheet.html"')
    expect(result).toContain('href="actor-creation.html"')
    expect(result).toContain('Character Sheet')
    expect(result).toContain('Actor Creation')
  })

  it('shows step count for each guide', () => {
    const result = generateIndexHtml(GUIDES)
    expect(result).toContain('4 steps')
    expect(result).toContain('2 steps')
  })

  it('singularizes "step" when count is 1', () => {
    const singleStep = [{ ...GUIDES[0], stepCount: 1 }]
    const result = generateIndexHtml(singleStep)
    expect(result).toContain('1 step')
    expect(result).not.toContain('1 steps')
  })
})

describe('escapeHtml', () => {
  it('escapes &', () => expect(escapeHtml('a & b')).toBe('a &amp; b'))
  it('escapes <', () => expect(escapeHtml('<tag>')).toBe('&lt;tag&gt;'))
  it('escapes "', () => expect(escapeHtml('"value"')).toBe('&quot;value&quot;'))
  it("escapes '", () => expect(escapeHtml("it's")).toBe('it&#39;s'))
  it('leaves safe strings unchanged', () => expect(escapeHtml('Hello world')).toBe('Hello world'))
})

describe('resolveScreenshotUrl', () => {
  it('resolves screenshot path relative to html output dir', () => {
    const url = resolveScreenshotUrl('documentation-output/screenshots/character-sheet/01-foo.png')
    expect(url).toBe('../screenshots/character-sheet/01-foo.png')
  })

  it('uses forward slashes regardless of OS', () => {
    const url = resolveScreenshotUrl('documentation-output/screenshots/character-sheet/01-foo.png')
    expect(url).not.toContain('\\')
  })
})
