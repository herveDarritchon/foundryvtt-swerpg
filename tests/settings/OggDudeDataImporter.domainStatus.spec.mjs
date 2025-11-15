import { describe, it, expect } from 'vitest'

// Stub minimal Foundry surface
if (!globalThis.foundry) {
  globalThis.foundry = { applications: { api: {} }, utils: { expandObject: (o) => o } }
}

import { OggDudeDataImporter } from '../../module/settings/OggDudeDataImporter.mjs'

describe('OggDudeDataImporter.computeDomainStatus()', () => {
  it('pending quand total=0 imported=0 rejected=0', () => {
    expect(OggDudeDataImporter.computeDomainStatus({ total: 0, imported: 0, rejected: 0 })).toBe('pending')
  })
  it('success quand imported=total et rejected=0', () => {
    expect(OggDudeDataImporter.computeDomainStatus({ total: 10, imported: 10, rejected: 0 })).toBe('success')
  })
  it('error quand rejected=total et imported=0', () => {
    expect(OggDudeDataImporter.computeDomainStatus({ total: 10, imported: 0, rejected: 10 })).toBe('error')
  })
  it('mixed quand imported+rejected===total avec les deux >0', () => {
    expect(OggDudeDataImporter.computeDomainStatus({ total: 10, imported: 7, rejected: 3 })).toBe('mixed')
  })
  it('pending quand import partiel (imported+rejected < total)', () => {
    expect(OggDudeDataImporter.computeDomainStatus({ total: 10, imported: 2, rejected: 0 })).toBe('pending')
  })
  it('clamp invariant imported+rejected>total et retourne code cohérent', () => {
    // imported+rejected>total => clamp total = 8, code mixed (après clamp total=8 imported=5 rejected=3)
    expect(OggDudeDataImporter.computeDomainStatus({ total: 5, imported: 5, rejected: 3 })).toBe('mixed')
  })
})

describe('OggDudeDataImporter._buildImportDomainStatus()', () => {
  it('construit objet avec clés domaine et classes attendues', () => {
    const app = new OggDudeDataImporter()
    const stats = {
      armor: { total: 10, imported: 10, rejected: 0 },
      weapon: { total: 10, imported: 0, rejected: 10 },
      gear: { total: 10, imported: 7, rejected: 3 },
      species: { total: 0, imported: 0, rejected: 0 },
      career: { total: 10, imported: 2, rejected: 0 },
      talent: { total: 0, imported: 0, rejected: 0 },
    }
    const result = app._buildImportDomainStatus(stats)
    expect(result.armor.code).toBe('success')
    expect(result.weapon.code).toBe('error')
    expect(result.gear.code).toBe('mixed')
    expect(result.species.code).toBe('pending')
    expect(result.career.code).toBe('pending')
    expect(result.talent.class).toBe('domain-status domain-status--pending')
    for (const [key, val] of Object.entries(result)) {
      expect(val.labelI18n).toMatch(/status\.(pending|success|mixed|error)$/)
      expect(val.class).toMatch(/domain-status--(pending|success|mixed|error)/)
    }
  })
})
