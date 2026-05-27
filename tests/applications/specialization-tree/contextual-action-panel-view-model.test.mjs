import { describe, expect, it } from 'vitest'
import { buildContextualActionPanelViewModel } from '../../../module/applications/specialization-tree/contextual-action-panel-view-model.mjs'

const localize = (k) => k

/**
 *
 * @param overrides
 */
function makeNode(overrides = {}) {
  return {
    talentName: 'Tough',
    xpCost: 5,
    isRanked: true,
    talentDescription: '<p>A tough talent description.</p>',
    nodeStateLabel: 'Available',
    reasonLabel: null,
    actionable: {
      primaryAction: 'purchase',
      canPurchase: true,
      canForget: false,
      actionLabel: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.ACTION.PURCHASE',
      blockedReasonCode: null,
      blockedReasonLabel: null,
    },
    ...overrides,
  }
}

describe('buildContextualActionPanelViewModel', () => {
  it('builds view-model for available node with purchase action', () => {
    const vm = buildContextualActionPanelViewModel(makeNode(), localize)

    expect(vm.talentName).toBe('Tough')
    expect(vm.xpCost).toBe(5)
    expect(vm.typeLabel).toBe('SWERPG.TALENT.SPECIALIZATION_TREE_APP.TOOLTIP.RANKED')
    expect(vm.nodeStateLabel).toBe('Available')
    expect(vm.reasonLabel).toBeNull()
    expect(vm.description).toBe('<p>A tough talent description.</p>')
    expect(vm.primaryAction).toBe('purchase')
    expect(vm.actionLabel).toBe('SWERPG.TALENT.SPECIALIZATION_TREE_APP.ACTION.PURCHASE')
    expect(vm.canAction).toBe(true)
  })

  it('marks canAction false when purchase action but cannot afford', () => {
    const node = makeNode({
      actionable: {
        primaryAction: 'purchase',
        canPurchase: false,
        canForget: false,
        actionLabel: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.ACTION.PURCHASE',
        blockedReasonCode: 'NOT_ENOUGH_XP',
        blockedReasonLabel: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.REASON.NOT_ENOUGH_XP',
      },
    })
    const vm = buildContextualActionPanelViewModel(node, localize)

    expect(vm.primaryAction).toBe('purchase')
    expect(vm.canAction).toBe(false)
    expect(vm.reasonLabel).toBe('SWERPG.TALENT.SPECIALIZATION_TREE_APP.REASON.NOT_ENOUGH_XP')
  })

  it('builds view-model for purchased forgettable node', () => {
    const node = makeNode({
      nodeStateLabel: 'Purchased',
      actionable: {
        primaryAction: 'forget',
        canPurchase: false,
        canForget: true,
        actionLabel: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.ACTION.FORGET',
        blockedReasonCode: null,
        blockedReasonLabel: null,
      },
    })
    const vm = buildContextualActionPanelViewModel(node, localize)

    expect(vm.primaryAction).toBe('forget')
    expect(vm.canAction).toBe(true)
    expect(vm.actionLabel).toBe('SWERPG.TALENT.SPECIALIZATION_TREE_APP.ACTION.FORGET')
  })

  it('builds view-model for purchased non-forgettable node', () => {
    const node = makeNode({
      nodeStateLabel: 'Purchased',
      reasonLabel: null,
      actionable: {
        primaryAction: null,
        canPurchase: false,
        canForget: false,
        actionLabel: null,
        blockedReasonCode: 'NODE_HAS_DEPENDENTS',
        blockedReasonLabel: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.REASON.NODE_HAS_DEPENDENTS',
      },
    })
    const vm = buildContextualActionPanelViewModel(node, localize)

    expect(vm.primaryAction).toBeNull()
    expect(vm.canAction).toBe(false)
    expect(vm.actionLabel).toBeNull()
    expect(vm.reasonLabel).toBe('SWERPG.TALENT.SPECIALIZATION_TREE_APP.REASON.NODE_HAS_DEPENDENTS')
  })

  it('builds view-model for locked node without action', () => {
    const node = makeNode({
      nodeStateLabel: 'Locked',
      reasonLabel: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.REASON.NODE_LOCKED',
      actionable: {
        primaryAction: null,
        canPurchase: false,
        canForget: false,
        actionLabel: null,
        blockedReasonCode: 'NODE_LOCKED',
        blockedReasonLabel: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.REASON.NODE_LOCKED',
      },
    })
    const vm = buildContextualActionPanelViewModel(node, localize)

    expect(vm.primaryAction).toBeNull()
    expect(vm.canAction).toBe(false)
    expect(vm.reasonLabel).toBe('SWERPG.TALENT.SPECIALIZATION_TREE_APP.REASON.NODE_LOCKED')
  })

  it('builds view-model for node without description', () => {
    const node = makeNode({ talentDescription: null })
    const vm = buildContextualActionPanelViewModel(node, localize)

    expect(vm.description).toBeNull()
  })

  it('sets typeLabel to non-ranked when isRanked is false', () => {
    const node = makeNode({ isRanked: false })
    const vm = buildContextualActionPanelViewModel(node, localize)

    expect(vm.typeLabel).toBe('SWERPG.TALENT.SPECIALIZATION_TREE_APP.TOOLTIP.NON_RANKED')
  })

  it('falls back to null when actionable is missing', () => {
    const node = makeNode({ actionable: undefined })
    const vm = buildContextualActionPanelViewModel(node, localize)

    expect(vm.primaryAction).toBeNull()
    expect(vm.canAction).toBe(false)
    expect(vm.actionLabel).toBeNull()
    expect(vm.reasonLabel).toBeNull()
  })

  it('uses node reasonLabel when actionable blockedReasonLabel is absent', () => {
    const node = makeNode({
      reasonLabel: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.REASON.NODE_LOCKED',
      actionable: { primaryAction: null, canPurchase: false, canForget: false, actionLabel: null, blockedReasonLabel: null },
    })
    const vm = buildContextualActionPanelViewModel(node, localize)

    expect(vm.reasonLabel).toBe('SWERPG.TALENT.SPECIALIZATION_TREE_APP.REASON.NODE_LOCKED')
  })
})
