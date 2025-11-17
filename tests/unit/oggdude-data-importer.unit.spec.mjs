import { describe, it, expect } from 'vitest'
import { OggDudeDataImporter } from '../../module/settings/OggDudeDataImporter.mjs'

describe('OggDudeDataImporter domain initialization', () => {
  it('initializes domains unchecked', () => {
    const instance = new OggDudeDataImporter()
    expect(instance.domains.length).toBeGreaterThan(0)
    expect(instance.domains.every((d) => d.checked === false)).toBe(true)
  })
})

describe('OggDudeDataImporter.toBoolean', () => {
  it('converts string values to boolean', () => {
    const oggDudeDataImporter = new OggDudeDataImporter()
    expect(oggDudeDataImporter.toBoolean('true')).toBe(true)
    expect(oggDudeDataImporter.toBoolean('false')).toBe(false)
  })
})

describe('OggDudeDataImporter.resetAction', () => {
  it('resets zipFile and domains', async () => {
    const instance = new OggDudeDataImporter()
    instance.zipFile = { name: 'fake.zip' }
    instance.domains[0].checked = true
    // Stub render for test environment
    instance.render = async () => {}
    await OggDudeDataImporter.resetAction.call(instance, null, null)
    expect(instance.zipFile).toBeNull()
    expect(instance.domains.every((d) => d.checked === false)).toBe(true)
  })
})
