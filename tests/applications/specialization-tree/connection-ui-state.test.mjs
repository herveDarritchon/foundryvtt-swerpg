import { describe, expect, it } from 'vitest'

import {
  CONNECTION_VISUAL_STYLES,
  getConnectionStyle,
} from '../../../module/applications/specialization-tree/connection-ui-state.mjs'

describe('connection-ui-state', () => {
  it('exposes the expected predefined styles', () => {
    expect(CONNECTION_VISUAL_STYLES.default).toMatchObject({
      color: 0x78a9c2,
      alpha: 0.6,
      thickness: 2,
    })
    expect(CONNECTION_VISUAL_STYLES.active).toMatchObject({ thickness: 2 })
    expect(CONNECTION_VISUAL_STYLES.inactive).toMatchObject({ thickness: 1 })
    expect(CONNECTION_VISUAL_STYLES.highlighted).toMatchObject({ thickness: 3 })
  })

  it('returns the default style for a render connection', () => {
    const style = getConnectionStyle({
      fromNodeId: 'n1',
      toNodeId: 'n2',
      type: 'straight',
    })

    expect(style).toBe(CONNECTION_VISUAL_STYLES.default)
  })

  it('ignores optional node state maps for now', () => {
    const style = getConnectionStyle(
      { fromNodeId: 'n1', toNodeId: 'n2' },
      new Map([
        ['n1', { nodeState: 'purchased' }],
        ['n2', { nodeState: 'available' }],
      ])
    )

    expect(style).toBe(CONNECTION_VISUAL_STYLES.default)
  })
})
