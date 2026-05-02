import { describe, it, expect } from 'vitest'

// Stub Foundry minimal API surface used in the class for tests
if (!globalThis.foundry) {
  globalThis.foundry = {
    applications: { api: {} },
    utils: { expandObject: (o) => o },
  }
}

// Safe import (module uses optional chaining for foundry access)
import { OggDudeDataImporter } from '../../module/settings/OggDudeDataImporter.mjs'

function buildInstance() {
  return new OggDudeDataImporter()
}

describe('OggDudeDataImporter _prepareContext()', () => {
  it('retourne les domaines avec propriétés attendues', () => {
    const app = buildInstance()
    const ctx = app._prepareContext({})
    expect(Array.isArray(ctx.domains)).toBe(true)
    expect(ctx.domains.length).toBeGreaterThan(0)
    for (const d of ctx.domains) {
      expect(d).toHaveProperty('id')
      expect(d).toHaveProperty('label')
      expect(d).toHaveProperty('checked')
    }
  })

  it('désactive sélection domaines et boutons quand aucun zipFile', () => {
    const app = buildInstance()
    const ctx = app._prepareContext({})
    expect(ctx.domainSelectionDisabled).toBe(true)
    expect(ctx.loadButtonDisabled).toBe(true)
  })

  it('active loadButton quand zip et domaine coché', () => {
    const app = buildInstance()
    app.zipFile = { name: 'test.zip', path: '/tmp/test.zip' }
    app.domains[0].checked = true
    const ctx = app._prepareContext({})
    expect(ctx.domainSelectionDisabled).toBe(false)
    expect(ctx.loadButtonDisabled).toBe(false)
  })

  it('expose flags de sections repliables et résumé vide si absence de métriques', () => {
    const app = buildInstance()
    const ctx = app._prepareContext({})
    expect(ctx.showStats).toBe(false)
    expect(ctx.showMetrics).toBe(false)
    expect(ctx.showPreview).toBe(false)
    expect(ctx.hasStats).toBe(false)
    expect(ctx.hasMetrics).toBe(false)
    expect(ctx.hasPreview).toBe(false)
    expect(ctx.importSummary).toBeNull()
  })

  it('expose statsTableRows comme tableau ordonné selon _domainNames', () => {
    const app = buildInstance()
    const ctx = app._prepareContext({})
    expect(Array.isArray(ctx.statsTableRows)).toBe(true)
    expect(ctx.statsTableRows.length).toBe(app._domainNames.length)
    // Vérifier l'ordre canonique
    ctx.statsTableRows.forEach((row, index) => {
      expect(row.id).toBe(app._domainNames[index])
    })
  })

  it('chaque ligne de statsTableRows contient les propriétés requises', () => {
    const app = buildInstance()
    const ctx = app._prepareContext({})
    for (const row of ctx.statsTableRows) {
      expect(row).toHaveProperty('id')
      expect(row).toHaveProperty('labelI18n')
      expect(row).toHaveProperty('status')
      expect(row.status).toHaveProperty('code')
      expect(row.status).toHaveProperty('labelI18n')
      expect(row.status).toHaveProperty('class')
      expect(row).toHaveProperty('stats')
      expect(row.stats).toHaveProperty('total')
      expect(row.stats).toHaveProperty('imported')
      expect(row.stats).toHaveProperty('rejected')
      expect(row).toHaveProperty('duration')
    }
  })

  it('statsTableRows avec stats vides retourne pending et zéros', () => {
    const app = buildInstance()
    const ctx = app._prepareContext({})
    for (const row of ctx.statsTableRows) {
      expect(row.status.code).toBe('pending')
      expect(row.stats.total).toBe(0)
      expect(row.stats.imported).toBe(0)
      expect(row.stats.rejected).toBe(0)
    }
  })
})

describe('OggDudeDataImporter toggleDomainAction', () => {
  it('inverse l’état checked du domaine ciblé', async () => {
    const app = buildInstance()
    app.zipFile = { name: 'test.zip' } // pour autoriser toggle
    const target = { dataset: { domainName: app.domains[0].id, domainChecked: 'false' } }
    await OggDudeDataImporter.toggleDomainAction.call(app, {}, target)
    expect(app.domains[0].checked).toBe(true)
    // second toggle
    target.dataset.domainChecked = 'true'
    await OggDudeDataImporter.toggleDomainAction.call(app, {}, target)
    expect(app.domains[0].checked).toBe(false)
  })

  it('ne modifie rien si pas de zipFile sélectionné', async () => {
    const app = buildInstance()
    const initial = app.domains.map((d) => d.checked)
    const target = { dataset: { domainName: app.domains[0].id, domainChecked: 'false' } }
    await OggDudeDataImporter.toggleDomainAction.call(app, {}, target)
    expect(app.domains.map((d) => d.checked)).toEqual(initial)
  })
})

describe('OggDudeDataImporter toggle collapsible actions', () => {
  it('toggleStatsAction bascule showStats', async () => {
    const app = buildInstance()
    await OggDudeDataImporter.toggleStatsAction.call(app, {}, {})
    expect(app.showStats).toBe(true)
    await OggDudeDataImporter.toggleStatsAction.call(app, {}, {})
    expect(app.showStats).toBe(false)
  })

  it('toggleMetricsAction bascule showMetrics', async () => {
    const app = buildInstance()
    await OggDudeDataImporter.toggleMetricsAction.call(app, {}, {})
    expect(app.showMetrics).toBe(true)
    await OggDudeDataImporter.toggleMetricsAction.call(app, {}, {})
    expect(app.showMetrics).toBe(false)
  })

  it('togglePreviewAction bascule showPreview', async () => {
    const app = buildInstance()
    await OggDudeDataImporter.togglePreviewAction.call(app, {}, {})
    expect(app.showPreview).toBe(true)
    await OggDudeDataImporter.togglePreviewAction.call(app, {}, {})
    expect(app.showPreview).toBe(false)
  })
})

describe('OggDudeDataImporter statsTableRows régression', () => {
  it('nouveau domaine dans _domainNames apparaît automatiquement dans statsTableRows', () => {
    const app = buildInstance()
    const initialLength = app._domainNames.length
    // Simuler ajout d'un nouveau domaine
    app._domainNames = [...app._domainNames, 'new-test-domain']
    app.domains = app._initializeDomains(app._domainNames)
    const ctx = app._prepareContext({})
    expect(ctx.statsTableRows.length).toBe(initialLength + 1)
    const lastRow = ctx.statsTableRows[ctx.statsTableRows.length - 1]
    expect(lastRow.id).toBe('new-test-domain')
    expect(lastRow.labelI18n).toBe('SETTINGS.OggDudeDataImporter.loadWindow.domains.new-test-domain')
  })
})
