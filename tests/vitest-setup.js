import { beforeEach, afterEach, vi } from 'vitest'
import { setupFoundryMock, teardownFoundryMock } from './helpers/mock-foundry.mjs'

// Mise en place d'un environnement Foundry propre pour chaque test.
beforeEach(() => {
  setupFoundryMock()
  vi.clearAllMocks()
})

afterEach(() => {
  vi.clearAllMocks()
  teardownFoundryMock()
})
