import { describe, it, expect, beforeEach } from 'vitest'
import { OggDudeDataImporter } from '../../module/settings/OggDudeDataImporter.mjs'

describe('OggDudeDataImporter - Specialization Domain Support', () => {
  let importer

  beforeEach(() => {
    importer = new OggDudeDataImporter()
  })

  it('should include specialization in _domainNames', () => {
    expect(importer._domainNames).toContain('specialization')
    expect(importer._domainNames).toHaveLength(8) // weapon, armor, gear, species, career, talent, obligation, specialization
  })

  it('should initialize domains with specialization', () => {
    const specializationDomain = importer.domains.find((d) => d.id === 'specialization')
    expect(specializationDomain).toBeDefined()
    expect(specializationDomain.label).toBe('SETTINGS.OggDudeDataImporter.loadWindow.domains.specialization')
    expect(specializationDomain.checked).toBe(false)
  })

  it('should build importDomainStatus including specialization', () => {
    const mockStats = {
      specialization: { total: 5, imported: 4, rejected: 1 },
    }

    const status = importer._buildImportDomainStatus(mockStats)

    expect(status.specialization).toBeDefined()
    expect(status.specialization.code).toBe('mixed') // imported>0 && rejected>0
    expect(status.specialization.labelI18n).toMatch(/status/)
    expect(status.specialization.class).toContain('domain-status')
  })

  it('should handle missing specialization stats gracefully', () => {
    const mockStats = {}

    const status = importer._buildImportDomainStatus(mockStats)

    expect(status.specialization).toBeDefined()
    expect(status.specialization.code).toBe('pending') // Aucune donnée (total=0)
  })

  it('should handle partial specialization stats (total but no imported)', () => {
    const mockStats = {
      specialization: { total: 10, imported: 0, rejected: 10 },
    }

    const status = importer._buildImportDomainStatus(mockStats)

    expect(status.specialization).toBeDefined()
    expect(status.specialization.code).toBe('error') // imported=0 && rejected=total
  })

  it('should handle successful specialization import', () => {
    const mockStats = {
      specialization: { total: 10, imported: 10, rejected: 0 },
    }

    const status = importer._buildImportDomainStatus(mockStats)

    expect(status.specialization).toBeDefined()
    expect(status.specialization.code).toBe('success') // imported=total && rejected=0
  })
})
