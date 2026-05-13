import { describe, expect, it } from 'vitest'

import { getOggDudePackConfig } from '../../../module/utils/oggdude-mapping-config.mjs'

describe('getOggDudePackConfig', () => {
  it('returns pack config for specialization-tree', () => {
    const config = getOggDudePackConfig('specialization-tree')

    expect(config).toEqual({
      name: 'swerpg-specialization-trees',
      label: 'Specialization Trees',
      folderGroup: 'actor-options',
      fullName: 'world.swerpg-specialization-trees',
    })
  })

  it('throws for unsupported type', () => {
    expect(() => getOggDudePackConfig('nonexistent')).toThrow('Unsupported OggDude element type')
  })

  it('normalises case for type lookup', () => {
    const config = getOggDudePackConfig('Specialization-Tree')
    expect(config.name).toBe('swerpg-specialization-trees')
  })
})
