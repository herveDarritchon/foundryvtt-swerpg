import { vi } from 'vitest'
import { createActor, updateActor } from './actor.mjs'

export function createActorWithUpdate(options = {}) {
  const actor = createActor(options)

  actor.update = vi.fn().mockImplementation(async (updates) => {
    updateActor(actor, updates)
    return actor
  })

  return actor
}
