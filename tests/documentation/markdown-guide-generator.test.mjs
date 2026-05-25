import { describe, expect, it } from 'vitest'
import { generateMarkdownFromMetadata } from '../../e2e/documentation/utils/markdown-guide-generator.mjs'

/**
 * Tests for the Markdown user guide generator.
 *
 * The generator is a pure function: given a GuideMetadata object, it returns
 * a deterministic Markdown string. No file I/O, no Foundry, no browser.
 */

/** @type {import('../../../e2e/documentation/utils/markdown-guide-generator.mjs').GuideMetadata} */
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

describe('generateMarkdownFromMetadata', () => {
  it('starts with the guide title as H1', () => {
    const result = generateMarkdownFromMetadata(MINIMAL_METADATA)
    expect(result).toMatch(/^# Character Sheet/)
  })

  it('includes the guide description', () => {
    const result = generateMarkdownFromMetadata(MINIMAL_METADATA)
    expect(result).toContain('Documentation journey for the Swerpg character sheet.')
  })

  it('includes a Prerequisites section with world name', () => {
    const result = generateMarkdownFromMetadata(MINIMAL_METADATA)
    expect(result).toContain('## Prerequisites')
    expect(result).toContain('`documentation-world`')
  })

  it('includes a Steps section', () => {
    const result = generateMarkdownFromMetadata(MINIMAL_METADATA)
    expect(result).toContain('## Steps')
  })

  it('renders each step as an H3 with zero-padded index', () => {
    const result = generateMarkdownFromMetadata(MINIMAL_METADATA)
    expect(result).toContain('### Step 01 — General view of the documentation world')
    expect(result).toContain('### Step 02 — Actors sidebar open')
  })

  it('includes userAction and expectedState for each step', () => {
    const result = generateMarkdownFromMetadata(MINIMAL_METADATA)
    expect(result).toContain('**Action:** Opening the session in the documentation world')
    expect(result).toContain('**Expected result:** The /game page is loaded with the sidebar visible and no application open')
  })

  it('embeds screenshot references with stable relative paths', () => {
    const result = generateMarkdownFromMetadata(MINIMAL_METADATA)
    // Screenshots are at documentation-output/screenshots/character-sheet/01-*.png
    // Markdown is at  documentation-output/markdown/character-sheet.md
    // Relative ref:   ../screenshots/character-sheet/01-*.png
    expect(result).toContain('![General view of the documentation world](../screenshots/character-sheet/01-general-view.png)')
    expect(result).toContain('![Actors sidebar open](../screenshots/character-sheet/02-actors-sidebar.png)')
  })

  it('includes a footer with the generation date', () => {
    const result = generateMarkdownFromMetadata(MINIMAL_METADATA)
    expect(result).toContain('2026-05-25')
    expect(result).toContain('pnpm run docs:generate-user-guides')
  })

  it('is deterministic — same metadata produces identical output', () => {
    const first = generateMarkdownFromMetadata(MINIMAL_METADATA)
    const second = generateMarkdownFromMetadata(MINIMAL_METADATA)
    expect(first).toBe(second)
  })

  it('handles a guide with no steps gracefully', () => {
    const emptyMetadata = { ...MINIMAL_METADATA, steps: [] }
    const result = generateMarkdownFromMetadata(emptyMetadata)
    expect(result).toContain('## Steps')
    expect(result).not.toContain('### Step')
  })

  it('uses forward slashes in screenshot paths regardless of OS path separator', () => {
    const result = generateMarkdownFromMetadata(MINIMAL_METADATA)
    // The image reference must not contain backslashes (Windows path separator)
    const imageLines = result.split('\n').filter((l) => l.startsWith('!['))
    for (const line of imageLines) {
      expect(line).not.toContain('\\')
    }
  })
})
