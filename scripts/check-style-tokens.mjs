#!/usr/bin/env node
/**
 * check-style-tokens.mjs — Contrôle de conformité au design system (ADR-0022).
 *
 * Vérifie deux règles sur les feuilles de style LESS du système swerpg :
 *
 *  1. RAW COLOR (règle principale — bloquant sous `--strict`, sinon
 *     avertissement) : tout littéral couleur en dur (hex, rgb/rgba, hsl/hsla)
 *     dans un fichier scanné, en dehors des fichiers de définition de tokens
 *     (`variables.less`, `theme.less`). Les couleurs doivent passer par un
 *     token `var(--color-*)`.
 *
 *  2. TOKEN NON RECONNU (advisory) : toute référence `var(--x)` dont `--x`
 *     n'est ni déclaré (`--x:`) dans nos LESS ni reconnu comme token Foundry
 *     Core (`FOUNDRY_CORE_VAR_PATTERNS`). Peut révéler un vrai bug (token cassé,
 *     ex. `--color-error` au lieu de `--color-danger`) OU un token Foundry non
 *     encore listé dans l'allowlist — à curer manuellement.
 *
 * Échappatoire ponctuelle justifiée : suffixer la ligne d'un commentaire
 *   `// tokens-allow-raw` (ou `/* tokens-allow-raw *​/`) pour tolérer un
 * littéral couleur exceptionnel (dégradé d'illustration, etc.).
 *
 * Usage :
 *   node scripts/check-style-tokens.mjs            # avertissements (raw + tokens non reconnus)
 *   node scripts/check-style-tokens.mjs --strict   # couleurs en dur = erreur (exit 1)
 *
 * Aucune dépendance externe (pas de stylelint requis).
 * Voir documentation/architecture/adr/adr-0022-design-tokens-mandatory-styling.md
 */

import { readFileSync, readdirSync } from 'node:fs'
import { join, basename, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const STYLES_DIR = join(ROOT, 'styles')

/** Fichiers de définition des tokens — exemptés de la règle RAW COLOR. */
const TOKEN_SOURCE_FILES = new Set(['variables.less', 'theme.less'])

/**
 * Familles de custom properties fournies par Foundry Core (préfixes), donc
 * référençables sans être déclarées dans nos LESS. Foundry expose notamment
 * une échelle `--font-size-*`, des `--z-index-*`, une palette neutre
 * `--color-cool-*` / `--color-warm-*`, et des `--color-text-light-*` /
 * `--color-text-dark-*`. Étendre au besoin.
 * @type {RegExp[]}
 */
const FOUNDRY_CORE_VAR_PATTERNS = [
  /^--font-size-\d+$/,
  /^--font-(serif|sans|awesome|primary|mono|h\d)$/,
  /^--z-index-/,
  /^--color-cool-/,
  /^--color-warm-/,
  /^--color-text-(light|dark)-/,
  /^--color-border-/,
  /^--color-shadow-/,
  /^--color-underline$/,
  /^--header-height$/,
  /^--sidebar-width$/,
]

/**
 *
 * @param name
 */
function isFoundryCoreVar(name) {
  return FOUNDRY_CORE_VAR_PATTERNS.some((re) => re.test(name))
}

const ALLOW_RAW_MARKER = 'tokens-allow-raw'

/** Hex (#abc, #aabbcc, #aabbccdd) et fonctions couleur rgb/rgba/hsl/hsla. */
const HEX_RE = /#[0-9a-fA-F]{3,8}\b/
const FUNC_COLOR_RE = /\b(?:rgba?|hsla?)\s*\(/

/* -------------------------------------------- */

/**
 *
 */
function listLessFiles() {
  return readdirSync(STYLES_DIR)
    .filter((f) => f.endsWith('.less'))
    .map((f) => join(STYLES_DIR, f))
}

/**
 * Collecte toutes les custom properties déclarées (`--x:`) dans les LESS.
 * @param files
 */
function collectDefinedVars(files) {
  const defined = new Set()
  const declRe = /(--[a-zA-Z0-9-]+)\s*:/g
  for (const file of files) {
    const content = readFileSync(file, 'utf8')
    let m
    while ((m = declRe.exec(content)) !== null) defined.add(m[1])
  }
  return defined
}

/**
 * Retire le contenu des commentaires de fin de ligne pour l'analyse couleur.
 * @param line
 */
function stripLineComment(line) {
  const idxLine = line.indexOf('//')
  const idxBlock = line.indexOf('/*')
  let cut = line.length
  if (idxLine !== -1) cut = Math.min(cut, idxLine)
  if (idxBlock !== -1) cut = Math.min(cut, idxBlock)
  return line.slice(0, cut)
}

/* -------------------------------------------- */

/**
 *
 */
function main() {
  const strict = process.argv.includes('--strict')
  const files = listLessFiles()
  const definedVars = collectDefinedVars(files)

  const phantom = [] // { file, line, name }
  const rawColors = [] // { file, line, snippet }

  const varRefRe = /var\(\s*(--[a-zA-Z0-9-]+)/g

  for (const file of files) {
    const name = basename(file)
    const lines = readFileSync(file, 'utf8').split('\n')

    lines.forEach((rawLine, i) => {
      const lineNo = i + 1

      // 1. Phantom var refs (toutes feuilles, y compris token sources)
      let m
      varRefRe.lastIndex = 0
      while ((m = varRefRe.exec(rawLine)) !== null) {
        const ref = m[1]
        if (!definedVars.has(ref) && !isFoundryCoreVar(ref)) {
          phantom.push({ file: name, line: lineNo, varName: ref })
        }
      }

      // 2. Raw colors (hors fichiers de tokens, hors lignes échappées)
      if (TOKEN_SOURCE_FILES.has(name)) return
      if (rawLine.includes(ALLOW_RAW_MARKER)) return
      const code = stripLineComment(rawLine)
      if (HEX_RE.test(code) || FUNC_COLOR_RE.test(code)) {
        rawColors.push({ file: name, line: lineNo, snippet: code.trim().slice(0, 80) })
      }
    })
  }

  /* ---- Rapport ---- */
  let hasError = false

  // Règle BLOQUANTE (sous --strict) : couleurs en dur.
  if (rawColors.length > 0) {
    if (strict) hasError = true
    console.error(
      `\n${strict ? '✖' : '⚠'} ${rawColors.length} couleur(s) EN DUR hors design system (ADR-0022)${strict ? ' — bloquant' : ' — avertissement'} :`,
    )
    const byFile = new Map()
    for (const r of rawColors) byFile.set(r.file, (byFile.get(r.file) ?? 0) + 1)
    for (const [f, n] of [...byFile.entries()].sort((a, b) => b[1] - a[1])) {
      console.error(`  ${f}: ${n}`)
    }
    console.error('  → Remplacer par un token var(--color-*) de styles/variables.less.')
    console.error('  → Exception justifiée : suffixer la ligne de `// tokens-allow-raw`.')
  }

  // Règle ADVISORY : var(--…) ni déclaré localement ni reconnu comme token Foundry core.
  // Peut contenir de vrais bugs (token cassé) ET des tokens Foundry non encore listés
  // dans FOUNDRY_CORE_VAR_PATTERNS — à curer manuellement.
  if (phantom.length > 0) {
    console.error(`\n⚠ ${phantom.length} référence(s) à des tokens NON RECONNUS (à vérifier — bug de token ou token Foundry core à ajouter à l'allowlist) :`)
    for (const p of phantom) console.error(`  ${p.file}:${p.line}  var(${p.varName})`)
    console.error('  → Si projet : déclarer dans styles/variables.less. Si Foundry core : ajouter le motif à FOUNDRY_CORE_VAR_PATTERNS.')
  }

  if (rawColors.length === 0 && phantom.length === 0) {
    console.log('✓ Styles conformes au design system (tokens uniquement, aucune couleur en dur).')
  } else if (!hasError) {
    console.log('\n(avertissements seulement — lancer avec --strict pour bloquer sur les couleurs en dur)')
  }

  process.exit(hasError ? 1 : 0)
}

main()
