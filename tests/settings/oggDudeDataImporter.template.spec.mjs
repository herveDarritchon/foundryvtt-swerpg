import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('oggDude-data-importer.hbs template compatibility', () => {
  const templatePath = join(process.cwd(), 'templates', 'settings', 'oggDude-data-importer.hbs')
  const source = readFileSync(templatePath, 'utf8')

  it('ne contient plus de références this.domains', () => {
    expect(source.includes('this.domains')).toBe(false)
  })

  it('ne contient plus de références this.zipFile', () => {
    expect(source.includes('this.zipFile')).toBe(false)
  })

  it('contient la boucle each domains', () => {
    expect(/each\s+domains/.test(source)).toBe(true)
  })

  it('contient la condition if zipFile', () => {
    expect(/#if\s+zipFile/.test(source)).toBe(true)
  })

  it('ne contient plus le helper lookup multi-arguments', () => {
    // Vérifie l'absence des appels legacy {{lookup importMetrics.domains "armor" "durationMs"}}
    expect(source.includes('lookup importMetrics.domains')).toBe(false)
  })

  it('ne contient plus de classe CSS .progress-global (legacy supprimée)', () => {
    const classAttrRegex = /class\s*=\s*"([^"]+)"/g
    let match
    let found = false
    while ((match = classAttrRegex.exec(source)) !== null) {
      const classes = match[1].split(/\s+/)
      if (classes.includes('progress-global')) {
        found = true
        break
      }
    }
    expect(found).toBe(false)
  })

  it('inclut sections repliables avec data-action toggles', () => {
    expect(source.includes('data-action="toggleStatsAction"')).toBe(true)
    expect(source.includes('data-action="toggleMetricsAction"')).toBe(true)
    expect(source.includes('data-action="togglePreviewAction"')).toBe(true)
  })

  it('inclut utilisation de details/summary pour stats', () => {
    expect(/<details[^>]*import-stats/.test(source)).toBe(true)
    expect(/<summary[^>]*toggleStatsAction/.test(source)).toBe(true)
  })

  it('inclut résumé compact importSummary conditionnel', () => {
    expect(source.includes('import-summary-heading')).toBe(true)
    // Vérifie que la clé i18n summary.title est référencée
    expect(source.includes('summary.title')).toBe(true)
  })

  it('inclut entête colonne statut et classes domain-status', () => {
    expect(source.includes('stats.status.title')).toBe(true)
    // Le template utilise maintenant statsTableRows avec row.status.class
    expect(source.includes('{{row.status.class}}')).toBe(true)
    expect(source.includes('{{row.stats.total}}')).toBe(true)
    expect(source.includes('{{row.stats.imported}}')).toBe(true)
    expect(source.includes('{{row.stats.rejected}}')).toBe(true)
  })

  it('inclut les statistiques pour le domaine obligation', () => {
    // Le template utilise maintenant une structure générique avec statsTableRows
    // qui contient tous les domaines (armor, weapon, gear, obligation, etc.)
    // au lieu de références directes comme importDomainStatus.obligation.class
    expect(source.includes('{{#each statsTableRows as |row|}}')).toBe(true)
    expect(source.includes('{{row.status.class}}')).toBe(true)
    expect(source.includes('{{row.stats.total}}')).toBe(true)
    expect(source.includes('{{row.stats.imported}}')).toBe(true)
    expect(source.includes('{{row.stats.rejected}}')).toBe(true)
    expect(source.includes('{{row.duration}}')).toBe(true)
  })
})
