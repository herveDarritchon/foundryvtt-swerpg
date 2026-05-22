import { it, describe, expect } from 'vitest'
import { buildNodeTooltipViewModel } from '../../../module/applications/specialization-tree/node-tooltip-view-model.mjs'

describe('node-tooltip-view-model', () => {
  it('builds header and lines for ranked talent with reason', () => {
    const node = {
      talentName: 'Tough',
      xpCost: 5,
      isRanked: true,
      nodeStateLabel: 'Available',
      reasonLabel: 'Some reason',
    }

    const localize = (k) => k

    const vm = buildNodeTooltipViewModel(node, localize)

    expect(vm.header).toBe('Tough')
    expect(vm.lines.length).toBeGreaterThanOrEqual(3)
    expect(vm.lines.some((l) => l.includes('Some reason'))).toBe(true)
  })

  it('builds non-ranked tooltip without reason line', () => {
    const node = {
      talentName: 'Grit',
      xpCost: 10,
      isRanked: false,
      nodeStateLabel: 'Purchased',
      reasonLabel: null,
    }

    const vm = buildNodeTooltipViewModel(node, (k) => k)

    expect(vm.header).toBe('Grit')
    expect(vm.lines).toHaveLength(3)
    expect(vm.lines[1]).toContain('SWERPG.TALENT.SPECIALIZATION_TREE_APP.TOOLTIP.NON_RANKED')
    expect(vm.lines.some((line) => line.includes('REASON'))).toBe(false)
  })

  it('includes the locked reason when present', () => {
    const node = {
      talentName: 'Durable',
      xpCost: 15,
      isRanked: false,
      nodeStateLabel: 'Locked',
      reasonLabel: 'Not enough XP',
    }

    const vm = buildNodeTooltipViewModel(node, (k) => k)

    expect(vm.lines[0]).toContain('15 XP')
    expect(vm.lines[2]).toContain('Locked')
    expect(vm.lines[3]).toContain('Not enough XP')
  })
})
