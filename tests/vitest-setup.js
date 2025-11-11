import { beforeEach, afterEach, vi } from 'vitest'
import { setupFoundryMock, teardownFoundryMock } from './helpers/mock-foundry.mjs'

// Polyfill Math.clamp for test environment (production may rely on Foundry or browser implementation)
if (!Math.clamp) {
  Math.clamp = function (value, min, max) {
    if (Number.isNaN(value)) return min
    return Math.min(Math.max(value, min), max)
  }
}

beforeEach(() => {
  setupFoundryMock()
  vi.clearAllMocks()
})

afterEach(() => {
  vi.clearAllMocks()
  teardownFoundryMock()
})
