import { describe, it, expect, vi } from 'vitest'
import OggDudeDataElement from '../../module/settings/models/OggDudeDataElement.mjs'

// Stub checkFileExists via dynamic import override — simplest: monkey patch global since helper imports executed earlier.
import * as fileHelpers from '../../module/helpers/server/directory/file.mjs'

// Utilise vi.spyOn plutôt que ré-affectation directe (module namespace protégé)

describe('OggDudeDataElement image cache', () => {
  it('caches specific item image path resolution', async () => {
    const spy = vi.spyOn(fileHelpers, 'checkFileExists').mockResolvedValue(true)
    // First call populates cache
    const img1 = await OggDudeDataElement._getItemImage('KEY1', 'world/path', 'weapon-', 'systems/swerpg/assets/default.png')
    const img2 = await OggDudeDataElement._getItemImage('KEY1', 'world/path', 'weapon-', 'systems/swerpg/assets/default.png')
    expect(img1).toBe(img2)
    expect(spy).toHaveBeenCalledTimes(1)
    spy.mockRestore()
  })

  it('falls back to default when specific not found and caches result', async () => {
    const spy = vi.spyOn(fileHelpers, 'checkFileExists').mockResolvedValue(false)
    const img1 = await OggDudeDataElement._getItemImage('KEY2', 'world/path', 'weapon-', 'systems/swerpg/assets/default.png')
    const img2 = await OggDudeDataElement._getItemImage('KEY2', 'world/path', 'weapon-', 'systems/swerpg/assets/default.png')
    expect(img1).toBe('systems/swerpg/assets/default.png')
    expect(img2).toBe(img1)
    expect(spy).toHaveBeenCalledTimes(1)
    spy.mockRestore()
  })
})
