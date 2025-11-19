import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('oggDudeDataImporter.hbs template compatibility', () => {
  const templatePath = join(process.cwd(), 'templates', 'settings', 'oggDudeDataImporter.hbs')
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
    // Les classes finales (domain-status--*) sont injectées dynamiquement via contexte; on vérifie présence du placeholder Handlebars
    expect(source.includes('{{importDomainStatus.armor.class}}')).toBe(true)
  })

  it('inclut les statistiques pour le domaine obligation', () => {
    expect(source.includes('{{importDomainStatus.obligation.class}}')).toBe(true)
    expect(source.includes('{{importStats.obligation.total}}')).toBe(true)
    expect(source.includes('{{importStats.obligation.imported}}')).toBe(true)
    expect(source.includes('{{importStats.obligation.rejected}}')).toBe(true)
    expect(source.includes('{{importMetricsFormatted.domains.obligation.duration}}')).toBe(true)
  })
})
