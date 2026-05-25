/**
 * Markdown User Guide Generator
 *
 * Transforms a structured guide JSON (produced by `guide-metadata-writer.ts`) into a
 * readable English Markdown user guide, with stable screenshot references.
 *
 * Rules:
 * - Consumes only fields present in the JSON source — no hallucination, no invented content.
 * - Produces a deterministic Markdown file for a given input (same JSON → same output).
 * - Screenshot paths are referenced as-is from the JSON step data.
 * - Does NOT re-run Playwright or any browser — purely file-to-file transformation.
 * - Fails explicitly if the JSON source is absent or unreadable.
 * - Fails explicitly if the screenshots directory is absent.
 *
 * Output: `documentation-output/markdown/<guideId>.md`
 *
 * Usage (from project root):
 *   node e2e/documentation/utils/markdown-guide-generator.mjs
 *   node e2e/documentation/utils/markdown-guide-generator.mjs --guide character-sheet
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Root of the project, resolved relative to this file's location.
 * This file lives at: e2e/documentation/utils/markdown-guide-generator.mjs
 * Project root is 3 levels up.
 */
const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..')

const GUIDES_INPUT_DIR = path.join(PROJECT_ROOT, 'documentation-output', 'guides')
const MARKDOWN_OUTPUT_DIR = path.join(PROJECT_ROOT, 'documentation-output', 'markdown')

// ---------------------------------------------------------------------------
// Types (JSDoc)
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} GuideStep
 * @property {number} index
 * @property {string} title
 * @property {string} userAction
 * @property {string} expectedState
 * @property {string} screenshotPath
 * @property {string} recordedAt
 */

/**
 * @typedef {Object} GuideMetadata
 * @property {string} guide
 * @property {string} title
 * @property {string} description
 * @property {string} generatedAt
 * @property {string} world
 * @property {string} screenshotsDir
 * @property {GuideStep[]} steps
 */

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

/**
 * Resolves the path to the screenshot relative to the Markdown output file.
 *
 * The Markdown file is at: documentation-output/markdown/<guide>.md
 * Screenshots are at:      documentation-output/screenshots/<guide>/01-*.png
 *
 * Relative path from Markdown file to screenshot:
 *   ../screenshots/<guide>/<filename>
 *
 * @param {string} screenshotPath - Relative path from project root as stored in JSON
 * @returns {string} Relative path suitable for embedding in the Markdown file
 */
function resolveScreenshotRef(screenshotPath) {
  // screenshotPath example: "documentation-output/screenshots/character-sheet/01-vue-generale.png"
  // Markdown output:         "documentation-output/markdown/character-sheet.md"
  // Relative ref:            "../screenshots/character-sheet/01-vue-generale.png"
  const markdownOutputDir = path.join('documentation-output', 'markdown')
  const relative = path.relative(markdownOutputDir, screenshotPath)
  // Normalize to forward slashes for Markdown compatibility
  return relative.split(path.sep).join('/')
}

/**
 * Formats a step index as a zero-padded two-digit string.
 *
 * @param {number} index
 * @returns {string}
 */
function formatStepIndex(index) {
  return String(index).padStart(2, '0')
}

/**
 * Generates the Markdown content from a guide metadata object.
 *
 * Rules enforced:
 * - Only data from the JSON source is used — no invented content.
 * - Each step includes: title, user action, expected result, screenshot reference.
 * - The guide is written in English.
 * - Screenshot paths are stable relative references.
 *
 * @param {GuideMetadata} metadata
 * @returns {string} Markdown content
 */
export function generateMarkdownFromMetadata(metadata) {
  const lines = []

  // Header
  lines.push(`# ${metadata.title}`)
  lines.push('')
  lines.push(metadata.description)
  lines.push('')

  // Prerequisites block
  lines.push('## Prerequisites')
  lines.push('')
  lines.push(`- A running Foundry VTT instance with the **swerpg** system installed.`)
  lines.push(`- Access to the \`${metadata.world}\` world as Gamemaster.`)
  lines.push('')

  // Steps
  lines.push('## Steps')
  lines.push('')

  for (const step of metadata.steps) {
    const stepNum = formatStepIndex(step.index)
    lines.push(`### Step ${stepNum} — ${step.title}`)
    lines.push('')
    lines.push(`**Action:** ${step.userAction}`)
    lines.push('')
    lines.push(`**Expected result:** ${step.expectedState}`)
    lines.push('')

    const screenshotRef = resolveScreenshotRef(step.screenshotPath)
    lines.push(`![${step.title}](${screenshotRef})`)
    lines.push('')
  }

  // Footer
  lines.push('---')
  lines.push('')
  lines.push(`*This guide was generated from documentation artefacts captured on ${metadata.generatedAt.slice(0, 10)}.*`)
  lines.push(`*Do not edit manually — regenerate using \`pnpm run docs:generate-user-guides\`.*`)
  lines.push('')

  return lines.join('\n')
}

/**
 * Reads the guide JSON from disk and validates it is parseable.
 *
 * @param {string} guideId - Guide identifier (e.g. "character-sheet")
 * @returns {GuideMetadata}
 * @throws {Error} If the file is missing or unreadable
 */
function readGuideJson(guideId) {
  const jsonPath = path.join(GUIDES_INPUT_DIR, `${guideId}.json`)

  if (!fs.existsSync(jsonPath)) {
    throw new Error(
      `[generate-user-guides] JSON source not found: ${jsonPath}\n` +
        `  → Run 'pnpm e2e:documentation' first to capture screenshots and produce the JSON.`,
    )
  }

  const content = fs.readFileSync(jsonPath, 'utf-8')

  try {
    return JSON.parse(content)
  } catch (parseError) {
    throw new Error(`[generate-user-guides] Failed to parse JSON at ${jsonPath}: ${parseError.message}`)
  }
}

/**
 * Validates that the screenshots directory expected by the guide exists.
 *
 * @param {GuideMetadata} metadata
 * @throws {Error} If the screenshots directory is absent
 */
function validateScreenshotsDir(metadata) {
  const screenshotsDirAbsolute = path.join(PROJECT_ROOT, metadata.screenshotsDir)

  if (!fs.existsSync(screenshotsDirAbsolute)) {
    throw new Error(
      `[generate-user-guides] Screenshots directory not found: ${screenshotsDirAbsolute}\n` +
        `  → Run 'pnpm e2e:documentation' first to capture screenshots.`,
    )
  }
}

/**
 * Writes the Markdown guide to disk.
 *
 * @param {string} guideId
 * @param {string} content
 * @returns {{ absolutePath: string, relativePath: string }}
 */
function writeMarkdownGuide(guideId, content) {
  fs.mkdirSync(MARKDOWN_OUTPUT_DIR, { recursive: true })

  const filename = `${guideId}.md`
  const absolutePath = path.join(MARKDOWN_OUTPUT_DIR, filename)
  const relativePath = path.relative(PROJECT_ROOT, absolutePath)

  fs.writeFileSync(absolutePath, content, 'utf-8')

  return { absolutePath, relativePath }
}

/**
 * Generates the Markdown user guide for a single guide identifier.
 *
 * @param {string} guideId
 * @returns {{ guideId: string, relativePath: string, stepCount: number }}
 */
export function generateUserGuide(guideId) {
  const metadata = readGuideJson(guideId)
  validateScreenshotsDir(metadata)

  const markdownContent = generateMarkdownFromMetadata(metadata)
  const { relativePath } = writeMarkdownGuide(guideId, markdownContent)

  return {
    guideId,
    relativePath,
    stepCount: metadata.steps.length,
  }
}

/**
 * Discovers all available guide identifiers from the guides input directory.
 *
 * @returns {string[]} List of guide identifiers (without `.json` extension)
 */
export function discoverGuideIds() {
  if (!fs.existsSync(GUIDES_INPUT_DIR)) {
    throw new Error(
      `[generate-user-guides] Guides directory not found: ${GUIDES_INPUT_DIR}\n` +
        `  → Run 'pnpm e2e:documentation' first to produce guide JSON files.`,
    )
  }

  const files = fs.readdirSync(GUIDES_INPUT_DIR)
  const guideIds = files.filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''))

  if (guideIds.length === 0) {
    throw new Error(
      `[generate-user-guides] No guide JSON files found in ${GUIDES_INPUT_DIR}.\n` +
        `  → Run 'pnpm e2e:documentation' first to produce guide JSON files.`,
    )
  }

  return guideIds
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

/**
 * Parses the optional `--guide <id>` argument from process.argv.
 *
 * @returns {string | null} The guide ID if provided, or null for "all guides" mode.
 */
function parseGuideArg() {
  const args = process.argv.slice(2)
  const idx = args.indexOf('--guide')
  if (idx !== -1 && args[idx + 1]) {
    return args[idx + 1]
  }
  return null
}

/**
 * Main CLI entry point.
 * Runs when this file is executed directly with Node.
 */
async function main() {
  const targetGuide = parseGuideArg()

  let guideIds
  if (targetGuide) {
    guideIds = [targetGuide]
    console.log(`[generate-user-guides] Generating guide: ${targetGuide}`)
  } else {
    guideIds = discoverGuideIds()
    console.log(`[generate-user-guides] Generating ${guideIds.length} guide(s): ${guideIds.join(', ')}`)
  }

  const results = []
  const errors = []

  for (const guideId of guideIds) {
    try {
      const result = generateUserGuide(guideId)
      results.push(result)
      console.log(`[generate-user-guides] ✓ ${result.relativePath} (${result.stepCount} steps)`)
    } catch (err) {
      errors.push({ guideId, error: err.message })
      console.error(`[generate-user-guides] ✗ ${guideId}: ${err.message}`)
    }
  }

  if (errors.length > 0) {
    console.error(`\n[generate-user-guides] ${errors.length} guide(s) failed. See errors above.`)
    process.exit(1)
  }

  console.log(`\n[generate-user-guides] Done. ${results.length} guide(s) generated in documentation-output/markdown/`)
}

// Run if this file is the entry point
const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)
if (isMain) {
  main().catch((err) => {
    console.error(`[generate-user-guides] Fatal error: ${err.message}`)
    process.exit(1)
  })
}
