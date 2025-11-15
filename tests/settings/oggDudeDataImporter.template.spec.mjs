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
})
