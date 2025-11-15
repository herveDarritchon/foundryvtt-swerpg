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
