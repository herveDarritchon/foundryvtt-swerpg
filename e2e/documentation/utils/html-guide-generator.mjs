/**
 * HTML User Guide Generator
 *
 * Transforms a structured guide JSON (produced by `guide-metadata-writer.ts`) into a
 * self-contained English HTML user guide, deployable to any static file server.
 *
 * Rules:
 * - Consumes only fields present in the JSON source — no hallucination, no invented content.
 * - Produces a deterministic HTML file for a given input (same JSON → same output).
 * - Screenshot paths are referenced as stable relative URLs (../screenshots/<guide>/<file>).
 * - Embeds all CSS inline — no external dependencies, works offline and on any server.
 * - Does NOT re-run Playwright or any browser — purely file-to-file transformation.
 * - Fails explicitly if the JSON source is absent or unreadable.
 * - Fails explicitly if the screenshots directory is absent.
 * - Also generates an index.html listing all available guides.
 *
 * Output:
 *   documentation-output/html/<guideId>.html
 *   documentation-output/html/index.html
 *
 * Deployment: serve the entire `documentation-output/html/` folder alongside
 *   `documentation-output/screenshots/` at the same level on your server.
 *
 * Usage (from project root):
 *   node e2e/documentation/utils/html-guide-generator.mjs
 *   node e2e/documentation/utils/html-guide-generator.mjs --guide character-sheet
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
 * This file lives at: e2e/documentation/utils/html-guide-generator.mjs
 * Project root is 3 levels up.
 */
const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..')

const GUIDES_INPUT_DIR = path.join(PROJECT_ROOT, 'documentation-output', 'guides')
const HTML_OUTPUT_DIR = path.join(PROJECT_ROOT, 'documentation-output', 'html')

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
// CSS (embedded — no external dependencies)
// ---------------------------------------------------------------------------

const EMBEDDED_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #ffffff;
    --text: #1a1a2e;
    --heading: #0f172a;
    --accent: #2563eb;
    --muted: #64748b;
    --border: #e2e8f0;
    --step-bg: #f8fafc;
    --prereq-bg: #fffbeb;
    --prereq-border: #f59e0b;
    --code-bg: #f1f5f9;
    --max-width: 860px;
    --radius: 8px;
    --shadow: 0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04);
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #0f172a;
      --text: #e2e8f0;
      --heading: #f1f5f9;
      --accent: #60a5fa;
      --muted: #94a3b8;
      --border: #1e293b;
      --step-bg: #1e293b;
      --prereq-bg: #1c1a10;
      --prereq-border: #d97706;
      --code-bg: #1e293b;
    }
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.6;
    font-size: 16px;
    padding: 2rem 1rem 4rem;
  }

  .container { max-width: var(--max-width); margin: 0 auto; }

  /* Header */
  .guide-header { margin-bottom: 2.5rem; padding-bottom: 1.5rem; border-bottom: 2px solid var(--border); }
  .guide-header h1 { font-size: 2rem; color: var(--heading); margin-bottom: .5rem; }
  .guide-header .description { color: var(--muted); font-size: 1.05rem; }
  .guide-meta { margin-top: .75rem; font-size: .85rem; color: var(--muted); }
  .guide-meta code { background: var(--code-bg); padding: .1em .35em; border-radius: 4px; font-size: .9em; }

  /* Nav breadcrumb */
  .breadcrumb { margin-bottom: 1.5rem; font-size: .9rem; }
  .breadcrumb a { color: var(--accent); text-decoration: none; }
  .breadcrumb a:hover { text-decoration: underline; }
  .breadcrumb span { color: var(--muted); margin: 0 .4rem; }

  /* Prerequisites */
  .prerequisites {
    background: var(--prereq-bg);
    border-left: 4px solid var(--prereq-border);
    border-radius: 0 var(--radius) var(--radius) 0;
    padding: 1rem 1.25rem;
    margin-bottom: 2.5rem;
  }
  .prerequisites h2 { font-size: 1rem; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); margin-bottom: .6rem; }
  .prerequisites ul { padding-left: 1.25rem; }
  .prerequisites li { margin-bottom: .25rem; }
  .prerequisites code { background: var(--code-bg); padding: .1em .35em; border-radius: 4px; font-size: .9em; }

  /* Steps */
  .steps-header { font-size: 1.35rem; font-weight: 700; color: var(--heading); margin-bottom: 1.5rem; }

  .step {
    background: var(--step-bg);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1.5rem;
    margin-bottom: 1.75rem;
    box-shadow: var(--shadow);
  }

  .step-header { display: flex; align-items: center; gap: .9rem; margin-bottom: 1rem; }

  .step-number {
    flex-shrink: 0;
    width: 2.25rem; height: 2.25rem;
    background: var(--accent);
    color: #fff;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: .9rem;
  }

  .step-title { font-size: 1.1rem; font-weight: 600; color: var(--heading); }

  .step-meta { display: grid; gap: .5rem; margin-bottom: 1rem; }
  .step-meta dt { font-size: .8rem; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); margin-bottom: .1rem; }
  .step-meta dd { font-size: .95rem; }

  .step-screenshot { margin-top: 1.25rem; }
  .step-screenshot img {
    max-width: 100%;
    border-radius: calc(var(--radius) - 2px);
    border: 1px solid var(--border);
    box-shadow: var(--shadow);
    display: block;
    cursor: zoom-in;
    transition: box-shadow .15s;
  }
  .step-screenshot img:hover { box-shadow: 0 4px 12px rgba(0,0,0,.15); }
  .step-screenshot figcaption { font-size: .8rem; color: var(--muted); margin-top: .4rem; text-align: center; }

  /* Footer */
  .guide-footer {
    margin-top: 3rem;
    padding-top: 1.25rem;
    border-top: 1px solid var(--border);
    font-size: .85rem;
    color: var(--muted);
  }
  .guide-footer code { background: var(--code-bg); padding: .1em .35em; border-radius: 4px; font-size: .9em; }

  /* Index page */
  .guide-list { list-style: none; display: grid; gap: 1rem; margin-top: 1.5rem; }
  .guide-list-item {
    background: var(--step-bg);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1.25rem 1.5rem;
    box-shadow: var(--shadow);
  }
  .guide-list-item a { color: var(--accent); text-decoration: none; font-weight: 600; font-size: 1.05rem; }
  .guide-list-item a:hover { text-decoration: underline; }
  .guide-list-item .guide-desc { font-size: .9rem; color: var(--muted); margin-top: .25rem; }
  .guide-list-item .guide-steps { font-size: .8rem; color: var(--muted); margin-top: .35rem; }

  /* Lightbox (pure CSS — click image to toggle via :target) */
  .lightbox-overlay {
    display: none;
    position: fixed; inset: 0;
    background: rgba(0,0,0,.85);
    z-index: 100;
    align-items: center;
    justify-content: center;
    cursor: zoom-out;
  }
  .lightbox-overlay:target { display: flex; }
  .lightbox-overlay img { max-width: 95vw; max-height: 95vh; border-radius: var(--radius); }

  @media print {
    body { padding: 0; font-size: 12pt; }
    .step { break-inside: avoid; }
    .step-screenshot img { max-height: 400px; }
    .breadcrumb, .lightbox-overlay { display: none; }
  }
`

// ---------------------------------------------------------------------------
// HTML helpers
// ---------------------------------------------------------------------------

/**
 * Escapes special HTML characters to prevent injection.
 *
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Resolves the screenshot path relative to the HTML output file.
 *
 * HTML file is at:   documentation-output/html/<guide>.html
 * Screenshot is at:  documentation-output/screenshots/<guide>/01-*.png
 * Relative URL:      ../screenshots/<guide>/<filename>
 *
 * @param {string} screenshotPath - Relative path from project root as stored in JSON
 * @returns {string} Relative URL for use in <img src>
 */
export function resolveScreenshotUrl(screenshotPath) {
  const htmlOutputDir = path.join('documentation-output', 'html')
  const relative = path.relative(htmlOutputDir, screenshotPath)
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

// ---------------------------------------------------------------------------
// Pure generator
// ---------------------------------------------------------------------------

/**
 * Generates the HTML content from a guide metadata object.
 *
 * Rules enforced:
 * - Only data from the JSON source is used — no invented content.
 * - Each step includes: title, user action, expected result, screenshot.
 * - All CSS is embedded — no external dependencies.
 * - Screenshot URLs are stable relative references.
 * - Output is deterministic for a given input.
 *
 * @param {GuideMetadata} metadata
 * @returns {string} Complete HTML document
 */
export function generateHtmlFromMetadata(metadata) {
  const title = escapeHtml(metadata.title)
  const description = escapeHtml(metadata.description)
  const world = escapeHtml(metadata.world)
  const date = metadata.generatedAt.slice(0, 10)

  // Build step HTML blocks
  const stepsHtml = metadata.steps
    .map((step) => {
      const stepNum = formatStepIndex(step.index)
      const stepTitle = escapeHtml(step.title)
      const action = escapeHtml(step.userAction)
      const expected = escapeHtml(step.expectedState)
      const imgUrl = resolveScreenshotUrl(step.screenshotPath)
      const lightboxId = `lightbox-step-${step.index}`

      return `
    <div class="step" id="step-${stepNum}">
      <div class="step-header">
        <div class="step-number">${stepNum}</div>
        <div class="step-title">${stepTitle}</div>
      </div>
      <dl class="step-meta">
        <dt>Action</dt>
        <dd>${action}</dd>
        <dt>Expected result</dt>
        <dd>${expected}</dd>
      </dl>
      <figure class="step-screenshot">
        <a href="#${lightboxId}">
          <img src="${imgUrl}" alt="${stepTitle}" loading="lazy" />
        </a>
        <figcaption>Step ${stepNum} — ${stepTitle}</figcaption>
      </figure>
      <div class="lightbox-overlay" id="${lightboxId}">
        <a href="#">
          <img src="${imgUrl}" alt="${stepTitle}" />
        </a>
      </div>
    </div>`
    })
    .join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — Swerpg User Guide</title>
  <style>${EMBEDDED_CSS}
  </style>
</head>
<body>
  <div class="container">

    <nav class="breadcrumb">
      <a href="index.html">Swerpg User Guides</a>
      <span>›</span>
      <strong>${title}</strong>
    </nav>

    <header class="guide-header">
      <h1>${title}</h1>
      <p class="description">${description}</p>
      <p class="guide-meta">World: <code>${world}</code> &nbsp;·&nbsp; Generated: ${date}</p>
    </header>

    <section class="prerequisites">
      <h2>Prerequisites</h2>
      <ul>
        <li>A running Foundry VTT instance with the <strong>swerpg</strong> system installed.</li>
        <li>Access to the <code>${world}</code> world as Gamemaster.</li>
      </ul>
    </section>

    <section class="steps-section">
      <h2 class="steps-header">Steps</h2>
${stepsHtml}
    </section>

    <footer class="guide-footer">
      <p>This guide was generated from documentation artefacts captured on ${date}.</p>
      <p>Do not edit manually — regenerate using <code>pnpm run docs:generate-user-guides:html</code>.</p>
    </footer>

  </div>
</body>
</html>
`
}

/**
 * Generates the HTML index page listing all available guides.
 *
 * @param {{ guideId: string, title: string, description: string, stepCount: number, filename: string }[]} guides
 * @returns {string} Complete HTML document for the index
 */
export function generateIndexHtml(guides) {
  const guidesHtml = guides
    .map(
      (g) => `
    <li class="guide-list-item">
      <a href="${escapeHtml(g.filename)}">${escapeHtml(g.title)}</a>
      <p class="guide-desc">${escapeHtml(g.description)}</p>
      <p class="guide-steps">${g.stepCount} step${g.stepCount !== 1 ? 's' : ''}</p>
    </li>`,
    )
    .join('\n')

  const date = new Date().toISOString().slice(0, 10)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Swerpg User Guides</title>
  <style>${EMBEDDED_CSS}
  </style>
</head>
<body>
  <div class="container">

    <header class="guide-header">
      <h1>Swerpg User Guides</h1>
      <p class="description">Documentation guides for the Swerpg Foundry VTT system.</p>
      <p class="guide-meta">Generated: ${date}</p>
    </header>

    <ul class="guide-list">
${guidesHtml}
    </ul>

    <footer class="guide-footer">
      <p>Generated on ${date} via <code>pnpm run docs:generate-user-guides:html</code>.</p>
    </footer>

  </div>
</body>
</html>
`
}

// ---------------------------------------------------------------------------
// File I/O
// ---------------------------------------------------------------------------

/**
 * Reads the guide JSON from disk and validates it is parseable.
 *
 * @param {string} guideId
 * @returns {GuideMetadata}
 * @throws {Error} If the file is missing or unreadable
 */
function readGuideJson(guideId) {
  const jsonPath = path.join(GUIDES_INPUT_DIR, `${guideId}.json`)

  if (!fs.existsSync(jsonPath)) {
    throw new Error(
      `[generate-user-guides:html] JSON source not found: ${jsonPath}\n` +
        `  → Run 'pnpm e2e:documentation' first to capture screenshots and produce the JSON.`,
    )
  }

  const content = fs.readFileSync(jsonPath, 'utf-8')

  try {
    return JSON.parse(content)
  } catch (parseError) {
    throw new Error(`[generate-user-guides:html] Failed to parse JSON at ${jsonPath}: ${parseError.message}`)
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
      `[generate-user-guides:html] Screenshots directory not found: ${screenshotsDirAbsolute}\n` +
        `  → Run 'pnpm e2e:documentation' first to capture screenshots.`,
    )
  }
}

/**
 * Writes an HTML file to disk.
 *
 * @param {string} filename - Filename within the HTML output directory (e.g. "character-sheet.html")
 * @param {string} content
 * @returns {{ absolutePath: string, relativePath: string }}
 */
function writeHtmlFile(filename, content) {
  fs.mkdirSync(HTML_OUTPUT_DIR, { recursive: true })

  const absolutePath = path.join(HTML_OUTPUT_DIR, filename)
  const relativePath = path.relative(PROJECT_ROOT, absolutePath)

  fs.writeFileSync(absolutePath, content, 'utf-8')

  return { absolutePath, relativePath }
}

/**
 * Generates the HTML user guide for a single guide identifier.
 *
 * @param {string} guideId
 * @returns {{ guideId: string, relativePath: string, stepCount: number, title: string, description: string, filename: string }}
 */
export function generateUserGuideHtml(guideId) {
  const metadata = readGuideJson(guideId)
  validateScreenshotsDir(metadata)

  const htmlContent = generateHtmlFromMetadata(metadata)
  const filename = `${guideId}.html`
  const { relativePath } = writeHtmlFile(filename, htmlContent)

  return {
    guideId,
    relativePath,
    stepCount: metadata.steps.length,
    title: metadata.title,
    description: metadata.description,
    filename,
  }
}

/**
 * Discovers all available guide identifiers from the guides input directory.
 *
 * @returns {string[]}
 * @throws {Error} If the directory is absent or empty
 */
export function discoverGuideIds() {
  if (!fs.existsSync(GUIDES_INPUT_DIR)) {
    throw new Error(
      `[generate-user-guides:html] Guides directory not found: ${GUIDES_INPUT_DIR}\n` +
        `  → Run 'pnpm e2e:documentation' first to produce guide JSON files.`,
    )
  }

  const files = fs.readdirSync(GUIDES_INPUT_DIR)
  const guideIds = files.filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''))

  if (guideIds.length === 0) {
    throw new Error(
      `[generate-user-guides:html] No guide JSON files found in ${GUIDES_INPUT_DIR}.\n` +
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
 * @returns {string | null}
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
 */
async function main() {
  const targetGuide = parseGuideArg()

  let guideIds
  if (targetGuide) {
    guideIds = [targetGuide]
    console.log(`[generate-user-guides:html] Generating guide: ${targetGuide}`)
  } else {
    guideIds = discoverGuideIds()
    console.log(`[generate-user-guides:html] Generating ${guideIds.length} guide(s): ${guideIds.join(', ')}`)
  }

  const results = []
  const errors = []

  for (const guideId of guideIds) {
    try {
      const result = generateUserGuideHtml(guideId)
      results.push(result)
      console.log(`[generate-user-guides:html] ✓ ${result.relativePath} (${result.stepCount} steps)`)
    } catch (err) {
      errors.push({ guideId, error: err.message })
      console.error(`[generate-user-guides:html] ✗ ${guideId}: ${err.message}`)
    }
  }

  if (errors.length > 0) {
    console.error(`\n[generate-user-guides:html] ${errors.length} guide(s) failed. See errors above.`)
    process.exit(1)
  }

  // Generate index.html
  try {
    const indexContent = generateIndexHtml(results)
    const { relativePath } = writeHtmlFile('index.html', indexContent)
    console.log(`[generate-user-guides:html] ✓ ${relativePath} (index)`)
  } catch (err) {
    console.error(`[generate-user-guides:html] ✗ index.html: ${err.message}`)
    process.exit(1)
  }

  console.log(`\n[generate-user-guides:html] Done. ${results.length} guide(s) + index in documentation-output/html/`)
}

// Run if this file is the entry point
const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)
if (isMain) {
  main().catch((err) => {
    console.error(`[generate-user-guides:html] Fatal error: ${err.message}`)
    process.exit(1)
  })
}
