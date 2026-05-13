import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getOrCreateWorldFolder, resetFolderCache, getFolderConfiguration } from '../../../module/importer/utils/oggdude-import-folders.mjs'

describe('OggDude Import Folders Service', () => {
  beforeEach(() => {
    // Reset folder cache before each test
    resetFolderCache()

    // Mock Foundry game object
    globalThis.game = {
      folders: {
        find: vi.fn(() => undefined),
      },
    }

    // Mock Foundry Folder class
    globalThis.Folder = {
      create: vi.fn(async (data) => ({
        id: `folder-${Date.now()}-${Math.random()}`,
        name: data.name,
        type: data.type,
        folder: data.folder || null,
      })),
    }
  })

  describe('getFolderConfiguration', () => {
    it('should return the folder configuration', () => {
      const config = getFolderConfiguration()

      expect(config).toHaveProperty('rootFolder')
      expect(config).toHaveProperty('fallbackFolder')
      expect(config).toHaveProperty('domainMap')
      expect(config.rootFolder).toBe('OggDude')
      expect(config.fallbackFolder).toBe('Misc')
      expect(config.domainMap).toHaveProperty('weapon')
      expect(config.domainMap).toHaveProperty('armor')
    })
  })

  describe('getOrCreateWorldFolder', () => {
    it('should create root folder and subfolder for known domain', async () => {
      const folder = await getOrCreateWorldFolder('weapon', 'Item')

      expect(globalThis.Folder.create).toHaveBeenCalledTimes(2) // Root + subfolder
      expect(folder).toBeDefined()
      expect(folder.name).toBe('Weapons')
    })

    it('should use fallback folder for unknown domain', async () => {
      const folder = await getOrCreateWorldFolder('unknown-domain', 'Item')

      expect(folder).toBeDefined()
      expect(folder.name).toBe('Misc')
    })

    it('should cache folders and avoid duplicate creation', async () => {
      const folder1 = await getOrCreateWorldFolder('weapon', 'Item')
      const folder2 = await getOrCreateWorldFolder('weapon', 'Item')

      // Should only create folders once (root + subfolder)
      expect(globalThis.Folder.create).toHaveBeenCalledTimes(2)
      expect(folder1.id).toBe(folder2.id)
    })

    it('should reuse existing folders', async () => {
      const existingRootFolder = {
        id: 'existing-root',
        name: 'OggDude',
        type: 'Item',
        folder: null,
      }
      const existingSubfolder = {
        id: 'existing-weapons',
        name: 'Weapons',
        type: 'Item',
        folder: { id: 'existing-root' },
      }

      globalThis.game.folders.find = vi.fn((predicate) => {
        const mockFolders = [existingRootFolder, existingSubfolder]
        return mockFolders.find(predicate)
      })

      const folder = await getOrCreateWorldFolder('weapon', 'Item')

      expect(globalThis.Folder.create).not.toHaveBeenCalled()
      expect(folder.id).toBe('existing-weapons')
    })

    it('should resolve specialization-tree to Specialization Trees folder', async () => {
      const config = getFolderConfiguration()

      expect(config.domainMap).toHaveProperty('specialization-tree')
      expect(config.domainMap['specialization-tree']).toBe('Specialization Trees')
    })

    it('should have a color defined for specialization-tree', () => {
      const config = getFolderConfiguration()

      expect(config.colorMap).toHaveProperty('specialization-tree')
      expect(config.colorMap['specialization-tree']).toBe('#7b1fa2')
    })

    it('should handle all known domains', async () => {
      const config = getFolderConfiguration()
      const domains = Object.keys(config.domainMap)

      for (const domain of domains) {
        resetFolderCache()
        globalThis.game.folders.find = vi.fn(() => undefined)
        globalThis.Folder.create = vi.fn(async (data) => ({
          id: `folder-${domain}`,
          name: data.name,
          type: data.type,
          folder: data.folder || null,
        }))

        const folder = await getOrCreateWorldFolder(domain, 'Item')

        expect(folder).toBeDefined()
        expect(folder.name).toBe(config.domainMap[domain])
      }
    })

    it('should throw error for invalid domain parameter', async () => {
      await expect(getOrCreateWorldFolder(null, 'Item')).rejects.toThrow('Invalid import domain')
      await expect(getOrCreateWorldFolder('', 'Item')).rejects.toThrow('Invalid import domain')
      await expect(getOrCreateWorldFolder(123, 'Item')).rejects.toThrow('Invalid import domain')
    })

    it('should prevent nested OggDude folders', async () => {
      // First call creates OggDude/Weapons
      const folder1 = await getOrCreateWorldFolder('weapon', 'Item')

      // Second call for different domain should reuse root OggDude
      resetFolderCache()
      const createSpy = vi.spyOn(globalThis.Folder, 'create')

      // Mock existing root folder
      globalThis.game.folders.find = vi.fn((predicate) => {
        const mockFolders = [{ id: 'root-1', name: 'OggDude', type: 'Item', folder: null }]
        return mockFolders.find(predicate)
      })

      const folder2 = await getOrCreateWorldFolder('armor', 'Item')

      // Should only create Armor subfolder, reuse existing OggDude root
      expect(createSpy).toHaveBeenCalledTimes(1)
      expect(folder2.name).toBe('Armor')
    })
  })

  describe('resetFolderCache', () => {
    it('should clear the folder cache', async () => {
      // Create a folder to populate cache
      await getOrCreateWorldFolder('weapon', 'Item')
      expect(globalThis.Folder.create).toHaveBeenCalledTimes(2)

      // Reset cache
      resetFolderCache()

      // Reset mocks
      globalThis.Folder.create = vi.fn(async (data) => ({
        id: `folder-new`,
        name: data.name,
        type: data.type,
        folder: data.folder || null,
      }))

      // Same call should create folders again (cache was cleared)
      await getOrCreateWorldFolder('weapon', 'Item')
      expect(globalThis.Folder.create).toHaveBeenCalledTimes(2)
    })
  })
})
