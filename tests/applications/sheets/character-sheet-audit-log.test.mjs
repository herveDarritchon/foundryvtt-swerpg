import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setupFoundryMock, teardownFoundryMock } from '../../helpers/mock-foundry.mjs'

const constructorSpy = vi.fn()
const renderSpy = vi.fn().mockResolvedValue(undefined)
const canViewAuditLogSpy = vi.fn((actor) => actor.allowAuditLog !== false)

vi.mock('../../../module/applications/character-audit-log.mjs', () => {
  return {
    __esModule: true,
    default: class MockCharacterAuditLogApp {
      constructor(options = {}) {
        constructorSpy(options)
      }

      async render(options) {
        return renderSpy(options)
      }
    },
    canViewAuditLog: canViewAuditLogSpy,
  }
})

vi.mock('../../../module/utils/logger.mjs', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('../../../module/lib/skills/skill-factory.mjs', () => ({ default: {} }))
vi.mock('../../../module/lib/talents/talent-factory.mjs', () => ({ default: {} }))
vi.mock('../../../module/lib/jauges/jauge-factory.mjs', () => ({
  default: { build: vi.fn(() => ({ create: vi.fn(() => ({})) })) },
}))
vi.mock('../../../module/lib/featured-equipment.mjs', () => ({
  computeFeaturedEquipment: vi.fn(() => []),
}))

describe('CharacterSheet audit log action', () => {
  let CharacterSheet

  beforeEach(async () => {
    setupFoundryMock({
      translations: {
        'SWERPG.AUDIT_LOG.NO_PERMISSION': 'No permission',
      },
    })
    CharacterSheet = (await import('../../../module/applications/sheets/character-sheet.mjs')).default
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    teardownFoundryMock()
  })

  it('opens the audit log app for authorized users', async () => {
    const actor = { allowAuditLog: true, name: 'Vara Kesh' }
    const sheet = { actor }
    const event = { preventDefault: vi.fn() }

    await CharacterSheet.DEFAULT_OPTIONS.actions.openAuditLog.call(sheet, event)

    expect(event.preventDefault).toHaveBeenCalled()
    expect(constructorSpy).toHaveBeenCalledWith({ document: actor })
    expect(renderSpy).toHaveBeenCalledWith({ force: true })
  })

  it('warns and does not open the app for unauthorized users', async () => {
    const actor = { allowAuditLog: false, name: 'Vara Kesh' }
    const sheet = { actor }
    const event = { preventDefault: vi.fn() }

    await CharacterSheet.DEFAULT_OPTIONS.actions.openAuditLog.call(sheet, event)

    expect(globalThis.ui.notifications.warn).toHaveBeenCalledWith('No permission')
    expect(constructorSpy).not.toHaveBeenCalled()
    expect(renderSpy).not.toHaveBeenCalled()
  })
})
