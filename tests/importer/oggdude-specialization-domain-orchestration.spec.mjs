import { beforeEach, describe, expect, it, vi } from 'vitest'

const processElements = vi.fn(async () => [])
const buildJsonDataFromFile = vi.fn()
const buildJsonDataFromDirectory = vi.fn()
const groupByDirectory = vi.fn(() => [])
const groupByType = vi.fn(() => ({ xml: [], image: [] }))
const fromZip = vi.fn(() => [])
const buildItemElements = vi.fn((jsonData, mapper) => mapper(jsonData))

vi.mock('../../module/settings/models/OggDudeDataElement.mjs', () => ({
  default: {
    from: fromZip,
    groupByDirectory,
    groupByType,
    processElements,
    buildJsonDataFromFile,
    buildJsonDataFromDirectory,
    _buildItemElements: buildItemElements,
  },
}))

vi.mock('../../module/importer/items/weapon-ogg-dude.mjs', () => ({ buildWeaponContext: vi.fn() }))
vi.mock('../../module/importer/items/armor-ogg-dude.mjs', () => ({ buildArmorContext: vi.fn() }))
vi.mock('../../module/importer/items/gear-ogg-dude.mjs', () => ({ buildGearContext: vi.fn() }))
vi.mock('../../module/importer/items/species-ogg-dude.mjs', () => ({ buildSpeciesContext: vi.fn() }))
vi.mock('../../module/importer/items/career-ogg-dude.mjs', () => ({ buildCareerContext: vi.fn() }))
vi.mock('../../module/importer/items/talent-ogg-dude.mjs', () => ({ buildTalentContext: vi.fn() }))
vi.mock('../../module/importer/items/obligation-ogg-dude.mjs', () => ({ buildObligationContext: vi.fn() }))
vi.mock('../../module/importer/items/motivation-category-ogg-dude.mjs', () => ({ buildMotivationCategoryContext: vi.fn() }))
vi.mock('../../module/importer/items/motivation-ogg-dude.mjs', () => ({ buildMotivationContext: vi.fn() }))
vi.mock('../../module/importer/items/duty-ogg-dude.mjs', () => ({ buildDutyContext: vi.fn() }))

vi.mock('../../module/importer/items/specialization-ogg-dude.mjs', () => ({
  buildSpecializationContext: vi.fn(async () => ({
    jsonData: [{ Key: 'BODYGUARD', Name: 'Bodyguard' }],
    image: { worldPath: '', systemPath: '', prefix: '', images: [] },
    zip: { content: {} },
    folder: { type: 'Item' },
    element: {
      type: 'specialization',
      mapper: () => [{ name: 'Bodyguard', type: 'specialization', system: {} }],
    },
  })),
}))

vi.mock('../../module/importer/items/specialization-tree-ogg-dude.mjs', () => ({
  buildSpecializationTreeContext: vi.fn(async () => ({
    jsonData: [{ Key: 'BODYGUARD', Name: 'Bodyguard' }],
    image: { worldPath: '', systemPath: '', prefix: '', images: [] },
    zip: { content: {} },
    folder: { type: 'Item' },
    element: {
      type: 'specialization-tree',
      mapper: () => [{ name: 'Bodyguard', type: 'specialization-tree', system: {} }],
    },
  })),
  getSpecializationTreeImportStats: vi.fn(() => ({ total: 1, imported: 1, rejected: 0 })),
}))

vi.mock('../../module/importer/utils/specialization-import-utils.mjs', () => ({
  getSpecializationImportStats: vi.fn(() => ({ total: 1, imported: 1, rejected: 0 })),
}))

vi.mock('../../module/importer/utils/specialization-tree-import-utils.mjs', async () => {
  const actual = await vi.importActual('../../module/importer/utils/specialization-tree-import-utils.mjs')
  return {
    ...actual,
    getCombinedSpecializationImportStats: vi.fn(() => ({ total: 2, imported: 2, rejected: 0 })),
  }
})

vi.mock('../../module/importer/utils/global-import-metrics.mjs', () => ({
  markArchiveSize: vi.fn(),
  markGlobalEnd: vi.fn(),
  markGlobalStart: vi.fn(),
  recordDomainEnd: vi.fn(),
  recordDomainStart: vi.fn(),
}))

vi.mock('../../module/importer/utils/retry.mjs', () => ({
  withRetry: vi.fn(async (fn) => fn()),
}))

vi.mock('../../module/importer/utils/motivation-import-utils.mjs', () => ({
  getMotivationImportStats: vi.fn(() => ({ total: 0, imported: 0, rejected: 0 })),
  getMotivationCategoryImportStats: vi.fn(() => ({ total: 0, imported: 0, rejected: 0 })),
}))

vi.mock('../../module/importer/utils/duty-import-utils.mjs', () => ({
  getDutyImportStats: vi.fn(() => ({ total: 0, imported: 0, rejected: 0 })),
}))

vi.mock('../../module/importer/utils/oggdude-import-folders.mjs', () => ({
  resetFolderCache: vi.fn(),
}))

describe('OggDudeImporter specialization orchestration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('runs specialization and specialization-tree pipelines under the same selected domain', async () => {
    const { default: OggDudeImporter } = await import('../../module/importer/oggDude.mjs')
    vi.spyOn(OggDudeImporter.prototype, 'load').mockResolvedValue({ files: {} })

    const progressEvents = []
    await OggDudeImporter.processOggDudeData(
      { size: 1 },
      [{ id: 'specialization', checked: true }],
      { progressCallback: (payload) => progressEvents.push(payload) },
    )

    expect(processElements).toHaveBeenCalledTimes(2)
    expect(processElements.mock.calls.map((call) => call[0].element.type), 'the specialization domain should execute both internal item types').toEqual([
      'specialization',
      'specialization-tree',
    ])
    expect(progressEvents.at(-1).processed).toBe(1)
    expect(progressEvents.at(-1).domain).toBe('specialization')
  })

  it('combines previews from specialization and specialization-tree under one domain key', async () => {
    const { default: OggDudeImporter } = await import('../../module/importer/oggDude.mjs')
    vi.spyOn(OggDudeImporter.prototype, 'load').mockResolvedValue({ files: {} })
    globalThis.game = { items: { contents: [] } }

    const preview = await OggDudeImporter.preloadOggDudeData({ size: 1 }, [{ id: 'specialization', checked: true }])

    expect(preview.specialization.map((item) => item.type)).toEqual(['specialization', 'specialization-tree'])
  })
})
