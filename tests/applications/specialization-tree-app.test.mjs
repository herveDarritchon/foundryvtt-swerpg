import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setupFoundryMock, teardownFoundryMock } from '../helpers/mock-foundry.mjs'

function createActor(overrides = {}) {
  return {
    id: 'actor-1',
    name: 'Vara Kesh',
    type: 'character',
    isOwner: true,
    update: vi.fn().mockResolvedValue(undefined),
    system: {
      details: { specializations: [] },
      progression: { talentPurchases: [], experience: { available: 100 } },
      ...overrides.system,
    },
    ...overrides,
  }
}

function createRoot({ viewportHost, panel }) {
  return {
    querySelector: vi.fn((selector) => {
      if (selector === '[data-specialization-tree-viewport]') return viewportHost
      if (selector === '[data-detail-panel]') return panel
      return null
    }),
  }
}

describe('specialization-tree app orchestration', () => {
  let SpecializationTreeApp
  let buildSpecializationTreeContext
  let mockRendererInstances
  let purchaseTalentNodeMock
  let forgetTalentNodeMock

  beforeEach(async () => {
    setupFoundryMock({
      translations: {
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.TITLE': 'Specialization trees: {actor}',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.SUBTITLE': 'subtitle',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.UNKNOWN_ACTOR': 'Unknown actor',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.UNKNOWN_SPECIALIZATION': 'Unknown specialization',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.VIEWPORT_ARIA_LABEL': 'viewport',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.STATUS.AVAILABLE': 'Available tree',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.STATUS.UNRESOLVED': 'Tree not resolved',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.STATUS.INCOMPLETE': 'Incomplete tree',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.SUMMARY.ACTIONABLE': 'Actionable',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.SUMMARY.LOCKED': 'Locked',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.SUMMARY.AVAILABLE_XP': 'Available XP',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.EMPTY.NO_ACTOR_TITLE': 'No actor selected',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.EMPTY.NO_ACTOR_DESCRIPTION': 'desc',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.EMPTY.NO_SPECIALIZATIONS_TITLE': 'No owned specialization',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.EMPTY.NO_SPECIALIZATIONS_DESCRIPTION': 'desc',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.EMPTY.NO_AVAILABLE_TREE_TITLE': 'No available tree',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.EMPTY.NO_AVAILABLE_TREE_DESCRIPTION': 'desc',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.NODE_STATE.PURCHASED': 'Purchased',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.NODE_STATE.AVAILABLE': 'Available',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.NODE_STATE.LOCKED': 'Locked',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.NODE_STATE.INVALID': 'Invalid',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.REASON.ALREADY_PURCHASED': 'Already purchased',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.REASON.NODE_LOCKED': 'Prerequisites not met',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.REASON.NOT_ENOUGH_XP': 'Not enough XP',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.REASON.NODE_HAS_DEPENDENTS': 'Node has purchased dependents',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.TOOLTIP.XP_COST': 'Cost',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.TOOLTIP.TYPE': 'Type',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.TOOLTIP.RANKED': 'Ranked Talent',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.TOOLTIP.NON_RANKED': 'Non-ranked Talent',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.TOOLTIP.STATE': 'State',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.TOOLTIP.REASON': 'Reason',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.PURCHASE.SUCCESS': 'Purchase successful: {talent}',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.PURCHASE.FAILURE': 'Purchase failed: {reason}',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.FORGET.SUCCESS': 'Talent forgotten: {talent}',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.FORGET.FAILURE': 'Forget failed: {reason}',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.CONFIRM.PURCHASE.TITLE': '{action}: {talent}',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.CONFIRM.PURCHASE.CONTENT': 'Spend {xp} XP to purchase {talent}?',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.CONFIRM.FORGET.TITLE': '{action}: {talent}',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.CONFIRM.FORGET.CONTENT': 'Forget {talent} and refund {xp} XP?',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.PERMISSION_DENIED': 'Denied',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.ACTION.PURCHASE': 'Purchase',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.ACTION.FORGET': 'Forget',
        'SWERPG.TALENT.UNKNOWN': 'Unknown talent',
      },
    })

    mockRendererInstances = []
    purchaseTalentNodeMock = vi.fn().mockResolvedValue({ ok: true })
    forgetTalentNodeMock = vi.fn().mockResolvedValue({ ok: true })

    class MockPixiTreeRenderer {
      constructor(options = {}) {
        this.options = options
        this.mount = vi.fn()
        this.update = vi.fn().mockResolvedValue(undefined)
        this.destroy = vi.fn()
        this.resetView = vi.fn()
        this.zoomIn = vi.fn()
        this.zoomOut = vi.fn()
        this.onNodePointerDown = null
        mockRendererInstances.push(this)
      }
    }

    vi.doMock('../../module/applications/specialization-tree/pixi-tree-renderer.mjs', () => ({
      PixiTreeRenderer: MockPixiTreeRenderer,
    }))

    vi.doMock('../../module/lib/talent-node/talent-node-purchase.mjs', () => ({
      purchaseTalentNode: purchaseTalentNodeMock,
    }))

    vi.doMock('../../module/lib/talent-node/talent-node-forget.mjs', () => ({
      forgetTalentNode: forgetTalentNodeMock,
    }))

    foundry.applications.api.DialogV2.confirm = vi.fn().mockResolvedValue(false)

    const mod = await import('../../module/applications/specialization-tree-app.mjs')
    SpecializationTreeApp = mod.default
    buildSpecializationTreeContext = mod.buildSpecializationTreeContext
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.doUnmock('../../module/applications/specialization-tree/pixi-tree-renderer.mjs')
    vi.doUnmock('../../module/lib/talent-node/talent-node-purchase.mjs')
    vi.doUnmock('../../module/lib/talent-node/talent-node-forget.mjs')
    teardownFoundryMock()
  })

  it('buildSpecializationTreeContext returns empty context when no actor', () => {
    const context = buildSpecializationTreeContext(null)

    expect(context.hasActor).toBe(false)
    expect(context.actor).toBeNull()
    expect(context.document).toBeNull()
    expect(context.system).toBeNull()
    expect(context.isOwner).toBe(false)
  })

  it('buildSpecializationTreeContext adds Foundry fields around the pure builder', () => {
    globalThis.fromUuidSync = vi.fn((uuid) => {
      if (uuid === 'Item.tree-spec') {
        return {
          type: 'specialization-tree',
          name: 'Bodyguard Tree',
          system: {
            nodes: [{ nodeId: 'n1', talentId: 'Item.t1', talentUuid: 'Item.t1', row: 1, column: 1, cost: 5 }],
            connections: [{ from: 'n1', to: 'n2' }],
          },
        }
      }
      if (uuid === 'Item.t1') return { name: 'Tough', system: { isRanked: false } }
      return null
    })

    const actor = createActor({
      system: {
        details: { specializations: [{ specializationId: 'spec', name: 'Bodyguard', treeUuid: 'Item.tree-spec' }] },
      },
    })

    const context = buildSpecializationTreeContext(actor)

    expect(context.hasActor).toBe(true)
    expect(context.actor).toBe(actor)
    expect(context.document).toBe(actor)
    expect(context.system).toBe(actor.system)
    expect(context.config).toBe(game.system.config)
    expect(context.isOwner).toBe(true)
  })

  it('open sets actor and renders', async () => {
    const actor = createActor()
    const app = new SpecializationTreeApp()
    const renderSpy = vi.spyOn(app, 'render').mockResolvedValue(app)

    const result = await app.open(actor)

    expect(result).toBe(app)
    expect(app.actor).toBe(actor)
    expect(app.document).toBe(actor)
    expect(renderSpy).toHaveBeenCalledWith({ force: true })
  })

  it('refresh coalesces concurrent calls and merges options', async () => {
    const app = new SpecializationTreeApp()
    app.actor = createActor()
    app.rendered = true
    const renderSpy = vi.spyOn(app, 'render').mockResolvedValue(app)

    await Promise.all([app.refresh({ resetView: true }), app.refresh({ resetView: true })])

    expect(renderSpy).toHaveBeenCalledTimes(1)
    expect(renderSpy).toHaveBeenCalledWith({ force: true, resetView: true })
  })

  it('creates, mounts and updates the renderer on render', async () => {
    const app = new SpecializationTreeApp()
    const viewportHost = { dataset: {}, firstElementChild: null, replaceChildren: vi.fn() }
    const panel = { hidden: true, querySelector: vi.fn(() => null) }
    app.element = createRoot({ viewportHost, panel })

    const context = {
      currentTreeId: 'spec-a',
      renderNodes: [{ nodeId: 'n1' }],
      renderConnections: [{ fromNodeId: 'n1', toNodeId: 'n2' }],
    }

    await app._onRender(context, {})

    const renderer = mockRendererInstances[0]
    expect(renderer).toBeDefined()
    expect(app.renderer).toBe(renderer)
    expect(renderer.mount).toHaveBeenCalledWith(viewportHost)
    expect(renderer.update).toHaveBeenCalledWith(
      {
        renderNodes: context.renderNodes,
        renderConnections: context.renderConnections,
        currentTreeId: 'spec-a',
      },
      { resetView: true }
    )
  })

  it('does not reset view on rerender when tree selection is unchanged', async () => {
    const app = new SpecializationTreeApp()
    const viewportHost = { dataset: {}, firstElementChild: null, replaceChildren: vi.fn() }
    const panel = { hidden: true, querySelector: vi.fn(() => null) }
    app.element = createRoot({ viewportHost, panel })

    const context = { currentTreeId: 'spec-a', renderNodes: [], renderConnections: [] }

    await app._onRender(context, {})
    await app._onRender(context, {})

    const renderer = mockRendererInstances[0]
    expect(renderer.update.mock.calls[0][1]).toEqual({ resetView: true })
    expect(renderer.update.mock.calls[1][1]).toEqual({ resetView: false })
  })

  it('requests reset view when tree selection changes', async () => {
    const app = new SpecializationTreeApp()
    const viewportHost = { dataset: {}, firstElementChild: null, replaceChildren: vi.fn() }
    const panel = { hidden: true, querySelector: vi.fn(() => null) }
    app.element = createRoot({ viewportHost, panel })

    await app._onRender({ currentTreeId: 'spec-a', renderNodes: [], renderConnections: [] }, {})
    await app._onRender({ currentTreeId: 'spec-b', renderNodes: [], renderConnections: [] }, {})

    const renderer = mockRendererInstances[0]
    expect(renderer.update.mock.calls[0][1]).toEqual({ resetView: true })
    expect(renderer.update.mock.calls[1][1]).toEqual({ resetView: true })
  })

  it('close destroys the renderer and clears actor bindings', async () => {
    const app = new SpecializationTreeApp()
    app.actor = createActor()
    app.document = app.actor
    app.renderer = { destroy: vi.fn() }

    await app.close({})

    expect(app.renderer).toBeNull()
    expect(app.actor).toBeNull()
    expect(app.document).toBeNull()
  })

  it('toolbar actions delegate to renderer methods', async () => {
    const app = new SpecializationTreeApp()
    app.renderer = {
      resetView: vi.fn(),
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
    }

    const resetEvent = { preventDefault: vi.fn() }
    const zoomInEvent = { preventDefault: vi.fn() }
    const zoomOutEvent = { preventDefault: vi.fn() }

    await SpecializationTreeApp.DEFAULT_OPTIONS.actions.resetView.call(app, resetEvent)
    await SpecializationTreeApp.DEFAULT_OPTIONS.actions.zoomIn.call(app, zoomInEvent)
    await SpecializationTreeApp.DEFAULT_OPTIONS.actions.zoomOut.call(app, zoomOutEvent)

    expect(app.renderer.resetView).toHaveBeenCalled()
    expect(app.renderer.zoomIn).toHaveBeenCalled()
    expect(app.renderer.zoomOut).toHaveBeenCalled()
  })

  it('renderer node callback shows detail panel when no primary action exists', async () => {
    const viewportHost = { dataset: {}, firstElementChild: null, replaceChildren: vi.fn() }
    const nameEl = { textContent: '' }
    const costEl = { textContent: '' }
    const typeEl = { textContent: '' }
    const stateEl = { textContent: '' }
    const reasonEl = { hidden: false }
    const descriptionEl = { hidden: false, innerHTML: '' }
    const ctaEl = { hidden: false }
    const ctaLabelEl = { textContent: '' }
    const panel = {
      hidden: true,
      querySelector: vi.fn((selector) => {
        if (selector === '[data-detail-talent-name]') return nameEl
        if (selector === '[data-detail-cost]') return costEl
        if (selector === '[data-detail-type]') return typeEl
        if (selector === '[data-detail-state]') return stateEl
        if (selector === '[data-detail-reason]') return reasonEl
        if (selector === '[data-detail-description]') return descriptionEl
        if (selector === '[data-detail-cta]') return ctaEl
        if (selector === '[data-detail-cta-label]') return ctaLabelEl
        return null
      }),
    }

    const app = new SpecializationTreeApp()
    app.actor = createActor()
    app.element = createRoot({ viewportHost, panel })
    await app._onRender({ currentTreeId: 'spec-a', renderNodes: [], renderConnections: [] }, {})

    const node = {
      talentName: 'Tough',
      xpCost: 5,
      isRanked: true,
      talentDescription: '<p>Desc</p>',
      nodeStateLabel: 'Available',
      reasonLabel: null,
      actionable: { primaryAction: null },
    }

    await app.renderer.onNodePointerDown(node)

    expect(panel.hidden).toBe(false)
    expect(nameEl.textContent).toBe('Tough')
    expect(costEl.textContent).toContain('5 XP')
    expect(stateEl.textContent).toBe('Available')
    expect(ctaEl.hidden).toBe(true)
  })

  it('background callback hides visible detail panel', async () => {
    const viewportHost = { dataset: {}, firstElementChild: null, replaceChildren: vi.fn() }
    const panel = {
      hidden: false,
      querySelector: vi.fn(() => null),
    }

    const app = new SpecializationTreeApp()
    app.actor = createActor()
    app.element = createRoot({ viewportHost, panel })
    await app._onRender({ currentTreeId: 'spec-a', renderNodes: [], renderConnections: [] }, {})

    app.renderer.onBackgroundPointerDown()

    expect(panel.hidden).toBe(true)
  })

  it('renderer node callback executes purchase flow and refreshes on success', async () => {
    const app = new SpecializationTreeApp()
    app.actor = createActor()
    app.rendered = true
    const viewportHost = { dataset: {}, firstElementChild: null, replaceChildren: vi.fn() }
    const panel = { hidden: true, querySelector: vi.fn(() => null) }
    app.element = createRoot({ viewportHost, panel })
    const refreshSpy = vi.spyOn(app, 'refresh').mockResolvedValue(app)
    const infoSpy = vi.spyOn(ui.notifications, 'info')
    foundry.applications.api.DialogV2.confirm.mockResolvedValue(true)

    await app._onRender({ currentTreeId: 'spec-a', renderNodes: [], renderConnections: [] }, {})

    const node = {
      nodeId: 'n1',
      talentName: 'Tough',
      xpCost: 5,
      actionable: {
        primaryAction: 'purchase',
        canPurchase: true,
        actionRef: { specializationId: 'spec-a', nodeId: 'n1' },
      },
    }

    await app.renderer.onNodePointerDown(node)

    expect(purchaseTalentNodeMock).toHaveBeenCalledWith(app.actor, 'spec-a', 'n1')
    expect(infoSpy).toHaveBeenCalled()
    expect(refreshSpy).toHaveBeenCalled()
  })

  it('renderer node callback executes forget flow and warns on failure', async () => {
    forgetTalentNodeMock.mockResolvedValue({ ok: false, reasonCode: 'node-has-dependents' })
    const app = new SpecializationTreeApp()
    app.actor = createActor()
    app.rendered = true
    const viewportHost = { dataset: {}, firstElementChild: null, replaceChildren: vi.fn() }
    const panel = { hidden: true, querySelector: vi.fn(() => null) }
    app.element = createRoot({ viewportHost, panel })
    const refreshSpy = vi.spyOn(app, 'refresh').mockResolvedValue(app)
    const warnSpy = vi.spyOn(ui.notifications, 'warn')
    foundry.applications.api.DialogV2.confirm.mockResolvedValue(true)

    await app._onRender({ currentTreeId: 'spec-a', renderNodes: [], renderConnections: [] }, {})

    const node = {
      nodeId: 'n1',
      talentName: 'Tough',
      xpCost: 5,
      actionable: {
        primaryAction: 'forget',
        canForget: true,
        actionRef: { specializationId: 'spec-a', nodeId: 'n1' },
      },
    }

    await app.renderer.onNodePointerDown(node)

    expect(forgetTalentNodeMock).toHaveBeenCalledWith(app.actor, 'spec-a', 'n1')
    expect(warnSpy).toHaveBeenCalled()
    expect(refreshSpy).toHaveBeenCalled()
  })

  it('_prepareContext returns a context object', async () => {
    const app = new SpecializationTreeApp()
    app.actor = createActor()

    const context = await app._prepareContext({})

    expect(context).toBeDefined()
    expect(typeof context.hasActor).toBe('boolean')
  })
})
