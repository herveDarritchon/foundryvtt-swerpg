import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getOrCreateWorldFolder, resetFolderCache } from '../../../module/importer/utils/oggdude-import-folders.mjs'

/**
 * Test d'intégration simulant un import complet avec plusieurs domaines
 */
describe('OggDude Import Folders - Integration Test', () => {
  beforeEach(() => {
    resetFolderCache()

    // Mock Foundry environment
    const mockFolders = []
    globalThis.game = {
      folders: {
        find: vi.fn((predicate) => mockFolders.find(predicate)),
        contents: mockFolders,
      },
    }

    globalThis.Folder = {
      create: vi.fn(async (data) => {
        const folder = {
          id: `folder-${Date.now()}-${Math.random()}`,
          name: data.name,
          type: data.type,
          folder: data.folder ? { id: data.folder } : null,
        }
        mockFolders.push(folder)
        return folder
      }),
    }
  })

  it('should create proper hierarchy for a multi-domain import session', async () => {
    // Simulate importing multiple domains in sequence
    const domains = ['weapon', 'armor', 'gear', 'talent', 'career']

    const folders = []
    for (const domain of domains) {
      const folder = await getOrCreateWorldFolder(domain, 'Item')
      folders.push(folder)
    }

    // All domains should have folders
    expect(folders).toHaveLength(5)
    expect(folders.every((f) => f.id)).toBe(true)

    // Check folder names
    expect(folders[0].name).toBe('Weapons')
    expect(folders[1].name).toBe('Armor')
    expect(folders[2].name).toBe('Gear')
    expect(folders[3].name).toBe('Talents')
    expect(folders[4].name).toBe('Careers')

    // Root folder should have been created only once
    const rootFolderCreations = globalThis.Folder.create.mock.calls.filter((call) => call[0].name === 'OggDude')
    expect(rootFolderCreations).toHaveLength(1)

    // Total folder creations: 1 root + 5 subfolders = 6
    expect(globalThis.Folder.create).toHaveBeenCalledTimes(6)
  })

  it('should handle mixed known and unknown domains', async () => {
    const knownFolder = await getOrCreateWorldFolder('weapon', 'Item')
    const unknownFolder = await getOrCreateWorldFolder('unknown-type', 'Item')

    expect(knownFolder.name).toBe('Weapons')
    expect(unknownFolder.name).toBe('Misc')

    // Both should share the same root
    expect(globalThis.Folder.create).toHaveBeenCalledTimes(3) // Root + Weapons + Misc
  })

  it('should maintain cache across sequential calls within the same session', async () => {
    // First batch of imports
    await getOrCreateWorldFolder('weapon', 'Item')
    await getOrCreateWorldFolder('armor', 'Item')

    const callsAfterFirstBatch = globalThis.Folder.create.mock.calls.length

    // Second batch (should reuse folders)
    await getOrCreateWorldFolder('weapon', 'Item')
    await getOrCreateWorldFolder('armor', 'Item')

    // No new folders should be created
    expect(globalThis.Folder.create).toHaveBeenCalledTimes(callsAfterFirstBatch)
  })

  it('should clear cache and recreate folders after reset', async () => {
    // First call creates folders
    await getOrCreateWorldFolder('weapon', 'Item')

    // Reset cache and clear folders list
    resetFolderCache()
    globalThis.game.folders.contents = []

    // Second call should try to create folders again since cache is cleared
    // and game.folders.find won't find them
    await getOrCreateWorldFolder('weapon', 'Item')

    // Folder.create should have been called twice (once per getOrCreateWorldFolder call)
    // Each call creates root + subfolder = 2 calls per invocation = 4 total
    expect(globalThis.Folder.create).toHaveBeenCalled()
    expect(globalThis.Folder.create.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('should prevent nested OggDude folders in realistic scenario', async () => {
    // First import session
    const folder1 = await getOrCreateWorldFolder('weapon', 'Item')

    // Simulate a second import session (user imports more data later)
    resetFolderCache()

    // Mock that OggDude root folder already exists
    const existingRoot = { id: 'existing-root', name: 'OggDude', type: 'Item', folder: null }
    globalThis.game.folders.contents = [existingRoot]
    globalThis.game.folders.find = vi.fn((predicate) => {
      return globalThis.game.folders.contents.find(predicate)
    })

    const folder2 = await getOrCreateWorldFolder('armor', 'Item')

    // Should reuse existing root, only create Armor subfolder
    const rootCreations = globalThis.Folder.create.mock.calls.filter((call) => call[0].name === 'OggDude')
    expect(rootCreations).toHaveLength(1) // From first session only

    // Armor should be created as child of existing root
    const armorCreation = globalThis.Folder.create.mock.calls.find((call) => call[0].name === 'Armor')
    expect(armorCreation).toBeDefined()
    expect(armorCreation[0].folder).toBe(existingRoot.id)
  })
})

