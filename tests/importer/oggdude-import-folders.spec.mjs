import {beforeEach, describe, expect, it, vi} from 'vitest'
// MAINTENANT importer le module
import {
    getFolderConfiguration,
    getOrCreateWorldFolder,
    resetFolderCache,
} from '../../module/importer/utils/oggdude-import-folders.mjs'

// Mock du logger AVANT tout import
vi.mock('../../module/utils/logger.mjs', () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        error: vi.fn(),
    },
}))

// Configuration du mock Folder avant l'import du module
const mockFolders = []

function attachGameFolders() {
    globalThis.game = globalThis.game || {}
    globalThis.game.folders = mockFolders
}

class MockFolder {
    constructor(data) {
        this.id = `folder-${Math.random().toString(36).substring(7)}`
        this.name = data.name
        this.type = data.type
        this.folder = data.folder || null
        this.color = data.color || null
    }

    static async create(data) {
        const folder = new MockFolder(data)
        mockFolders.push(folder)
        return folder
    }

    async update(updateData) {
        if (updateData.color !== undefined) {
            this.color = updateData.color
        }
        return this
    }
}

// Configurer globalThis avant import
globalThis.Folder = MockFolder
attachGameFolders()

describe('oggdude-import-folders - Folder Colors', () => {
    beforeEach(() => {
        // Réinitialiser les mocks avant chaque test
        mockFolders.length = 0
        resetFolderCache()
        vi.clearAllMocks()
        attachGameFolders()
    })

    describe('getFolderConfiguration', () => {
        it('should include color mapping in configuration', () => {
            const config = getFolderConfiguration()

            expect(config).toHaveProperty('colorMap')
            expect(config).toHaveProperty('fallbackColor')
            expect(config.colorMap).toHaveProperty('weapon')
            expect(config.colorMap).toHaveProperty('armor')
            expect(config.colorMap).toHaveProperty('gear')
            expect(config.fallbackColor).toBe('#1b5f8c')
        })

        it('should have colors for all mapped domains', () => {
            const config = getFolderConfiguration()
            const domainKeys = Object.keys(config.domainMap)
            const colorKeys = Object.keys(config.colorMap)

            // Tous les domaines doivent avoir une couleur définie
            domainKeys.forEach((domain) => {
                expect(colorKeys).toContain(domain)
            })
        })
    })

    describe('getOrCreateWorldFolder - color application', () => {
        it('should create folders with correct color for weapon domain', async () => {
            const folder = await getOrCreateWorldFolder('weapon', 'Item')

            expect(folder).toBeDefined()
            expect(folder.name).toBe('Weapons')
            expect(folder.color).toBe('#00a8ff') // Bleu hyperespace
            expect(mockFolders).toHaveLength(2) // Root + Weapons
        })

        it('should create folders with correct color for armor domain', async () => {
            const folder = await getOrCreateWorldFolder('armor', 'Item')

            expect(folder).toBeDefined()
            expect(folder.name).toBe('Armor')
            expect(folder.color).toBe('#4cd137') // Vert sabre laser
        })

        it('should create folders with correct color for gear domain', async () => {
            const folder = await getOrCreateWorldFolder('gear', 'Item')

            expect(folder).toBeDefined()
            expect(folder.name).toBe('Gear')
            expect(folder.color).toBe('#ffc312') // Orange rebelle
        })

        it('should create folders with correct color for career domain', async () => {
            const folder = await getOrCreateWorldFolder('career', 'Item')

            expect(folder).toBeDefined()
            expect(folder.name).toBe('Careers')
            expect(folder.color).toBe('#c23616') // Rouge Sith
        })

        it('should use fallback color for unknown domain', async () => {
            const folder = await getOrCreateWorldFolder('unknown-domain', 'Item')

            expect(folder).toBeDefined()
            expect(folder.name).toBe('Misc')
            expect(folder.color).toBe('#1b5f8c') // Fallback color
        })

        it('should not create duplicate folders on second call', async () => {
            const folder1 = await getOrCreateWorldFolder('weapon', 'Item')
            const folder2 = await getOrCreateWorldFolder('weapon', 'Item')

            expect(folder1.id).toBe(folder2.id)
            expect(mockFolders).toHaveLength(2) // Root + Weapons, pas de doublon
        })

        it('should update existing folder color if different', async () => {
            // Créer un dossier avec une couleur incorrecte
            const existingFolder = await Folder.create({
                name: 'Weapons',
                type: 'Item',
                folder: null,
                color: '#ffffff', // Mauvaise couleur
            })

            const rootFolder = await Folder.create({
                name: 'OggDude',
                type: 'Item',
                folder: null,
            })

            existingFolder.folder = {id: rootFolder.id}

            const updateSpy = vi.spyOn(existingFolder, 'update')

            // Appeler getOrCreateWorldFolder qui devrait corriger la couleur
            const folder = await getOrCreateWorldFolder('weapon', 'Item')

            expect(updateSpy).toHaveBeenCalledWith({color: '#00a8ff'})
            expect(folder.color).toBe('#00a8ff')
        })

        it('should not update folder if color is already correct', async () => {
            // Première création avec la bonne couleur
            const folder1 = await getOrCreateWorldFolder('weapon', 'Item')

            const updateSpy = vi.spyOn(folder1, 'update')

            // Deuxième appel
            const folder2 = await getOrCreateWorldFolder('weapon', 'Item')

            // update ne doit pas être appelé car la couleur est déjà correcte
            expect(updateSpy).not.toHaveBeenCalled()
            expect(folder1.id).toBe(folder2.id)
        })

        it('should not set color on root OggDude folder', async () => {
            await getOrCreateWorldFolder('weapon', 'Item')

            const rootFolder = mockFolders.find((f) => f.name === 'OggDude')

            expect(rootFolder).toBeDefined()
            expect(rootFolder.color).toBeNull() // Pas de couleur sur le dossier racine
        })

        it('should handle multiple domains with different colors', async () => {
            const weaponFolder = await getOrCreateWorldFolder('weapon', 'Item')
            const armorFolder = await getOrCreateWorldFolder('armor', 'Item')
            const gearFolder = await getOrCreateWorldFolder('gear', 'Item')

            expect(weaponFolder.color).toBe('#00a8ff')
            expect(armorFolder.color).toBe('#4cd137')
            expect(gearFolder.color).toBe('#ffc312')

            // Tous partagent le même dossier racine
            expect(weaponFolder.folder).toBe(armorFolder.folder)
            expect(armorFolder.folder).toBe(gearFolder.folder)
        })
    })

    describe('resetFolderCache', () => {
        it('should clear cache and allow color updates on next call', async () => {
            // Première création
            const folder1 = await getOrCreateWorldFolder('weapon', 'Item')

            // Modifier manuellement la couleur du dossier en cache
            folder1.color = '#ffffff'

            // Réinitialiser le cache
            resetFolderCache()

            // Deuxième appel après reset
            const folder2 = await getOrCreateWorldFolder('weapon', 'Item')

            // La couleur devrait être recorrigée
            expect(folder2.color).toBe('#00a8ff')
        })
    })
})

