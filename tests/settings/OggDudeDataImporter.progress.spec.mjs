import { describe, it, expect } from 'vitest'

// Minimal Foundry stubs
if (!globalThis.foundry) {
  globalThis.foundry = {
    applications: { api: {} },
    utils: { expandObject: (o) => o },
  }
}

import { OggDudeDataImporter } from '../../module/settings/OggDudeDataImporter.mjs'

function build(progress) {
  const app = new OggDudeDataImporter()
  app._progress = progress
  return app
}

describe('OggDudeDataImporter progressPercentDomains', () => {
  it('calcul 0% quand total=0 et jauge absente', () => {
    const app = build({ processed: 0, total: 0 })
    const ctx = app._prepareContext({})
    expect(ctx.progressPercentDomains).toBe(0)
    expect(ctx.progressPercent).toBe(0)
    // Vérifie conditions d'absence de rendu (template logic) via flag progress.total
    expect(ctx.progress.total ?? 0).toBe(0)
  })

  it('calcul 50% pour 1/2 domaines', () => {
    const app = build({ processed: 1, total: 2 })
    const ctx = app._prepareContext({})
    expect(ctx.progressPercentDomains).toBe(50)
  })

  it('calcul 100% quand processed===total (bar width = 100%)', () => {
    const app = build({ processed: 3, total: 3 })
    const ctx = app._prepareContext({})
    expect(ctx.progressPercentDomains).toBe(100)
    // Largeur prévue par template = 100%
    expect(`${ctx.progressPercentDomains}%`).toBe('100%')
  })
})
