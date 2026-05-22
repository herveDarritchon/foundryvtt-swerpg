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
  let buildLegendItems
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
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.CONFIRM.CANCEL': 'Cancel',
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
    buildLegendItems = mod.buildLegendItems
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

  /* ── Legend items ───────────────────────────────────────────── */

  it('buildLegendItems returns 4 entries with correct structure', () => {
    const localize = (key) => key
    const items = buildLegendItems(localize)

    expect(items).toHaveLength(4)
    for (const item of items) {
      expect(item).toHaveProperty('state')
      expect(item).toHaveProperty('label')
      expect(item).toHaveProperty('affordance')
      expect(item).toHaveProperty('cursor')
    }
  })

  it('buildLegendItems maps affordance correctly per state', () => {
    const localize = (key) => key
    const items = buildLegendItems(localize)

    const lookup = Object.fromEntries(items.map((i) => [i.state, i.affordance]))
    expect(lookup).toEqual({
      purchased: 'informational',
      available: 'actionable',
      locked: 'blocked',
      invalid: 'informational',
    })
  })

  it('buildLegendItems maps cursor correctly per state', () => {
    const localize = (key) => key
    const items = buildLegendItems(localize)

    const lookup = Object.fromEntries(items.map((i) => [i.state, i.cursor]))
    expect(lookup).toEqual({
      purchased: 'default',
      available: 'pointer',
      locked: 'not-allowed',
      invalid: 'help',
    })
  })

  it('buildLegendItems localizes labels through the provided function', () => {
    const localize = vi.fn((key) => `[[${key}]]`)
    const items = buildLegendItems(localize)

    expect(items[0].label).toBe('[[SWERPG.TALENT.SPECIALIZATION_TREE_APP.NODE_STATE.PURCHASED]]')
    expect(localize).toHaveBeenCalledWith('SWERPG.TALENT.SPECIALIZATION_TREE_APP.NODE_STATE.PURCHASED')
    expect(localize).toHaveBeenCalledWith('SWERPG.TALENT.SPECIALIZATION_TREE_APP.NODE_STATE.AVAILABLE')
    expect(localize).toHaveBeenCalledWith('SWERPG.TALENT.SPECIALIZATION_TREE_APP.NODE_STATE.LOCKED')
    expect(localize).toHaveBeenCalledWith('SWERPG.TALENT.SPECIALIZATION_TREE_APP.NODE_STATE.INVALID')
  })

  it('buildSpecializationTreeContext(null) includes legendItems with 4 entries', () => {
    const context = buildSpecializationTreeContext(null)

    expect(context.legendItems).toBeDefined()
    expect(context.legendItems).toHaveLength(4)
  })

  it('buildSpecializationTreeContext(actor) includes legendItems with 4 entries', () => {
    globalThis.fromUuidSync = vi.fn(() => null)

    const actor = createActor()
    const context = buildSpecializationTreeContext(actor)

    expect(context.legendItems).toBeDefined()
    expect(context.legendItems).toHaveLength(4)
  })

  it('confirm dialog uses custom action label and cancel button', async () => {
    const app = new SpecializationTreeApp()
    app.actor = createActor()
    app.rendered = true
    const viewportHost = { dataset: {}, firstElementChild: null, replaceChildren: vi.fn() }
    const panel = { hidden: true, querySelector: vi.fn(() => null) }
    app.element = createRoot({ viewportHost, panel })
    const refreshSpy = vi.spyOn(app, 'refresh').mockResolvedValue(app)

    await app._onRender({ currentTreeId: 'spec-a', renderNodes: [], renderConnections: [] }, {})

    const confirmSpy = vi.spyOn(foundry.applications.api.DialogV2, 'confirm')
    confirmSpy.mockResolvedValue(true)

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

    expect(confirmSpy).toHaveBeenCalled()
    const callArgs = confirmSpy.mock.calls[0][0]

    expect(callArgs.buttons).toBeDefined()
    expect(callArgs.buttons).toHaveLength(2)
    expect(callArgs.buttons[0].label).toBe('Purchase')
    expect(callArgs.buttons[1].label).toBe('Cancel')
  })

  /* ═════════════════════════════════════════════════════════════ */
  /*  GUX6 — UX observable validation matrix                    */
  /* ═════════════════════════════════════════════════════════════ */

  describe('GUX6 — UX observable validation matrix', () => {
    /**
     * Helper: create a detail panel mock that records DOM updates.
     * Returns `{ panel, els }` where `els` holds textContent/hidden references.
     */
    function createPanelMock() {
      const els = {
        nameEl: { textContent: '' },
        costEl: { textContent: '' },
        typeEl: { textContent: '' },
        stateEl: { textContent: '' },
        reasonEl: { hidden: false },
        descriptionEl: { hidden: false, innerHTML: '' },
        ctaEl: { hidden: false },
        ctaLabelEl: { textContent: '' },
      }

      const panel = {
        hidden: true,
        querySelector: vi.fn((selector) => {
          if (selector === '[data-detail-talent-name]') return els.nameEl
          if (selector === '[data-detail-cost]') return els.costEl
          if (selector === '[data-detail-type]') return els.typeEl
          if (selector === '[data-detail-state]') return els.stateEl
          if (selector === '[data-detail-reason]') return els.reasonEl
          if (selector === '[data-detail-description]') return els.descriptionEl
          if (selector === '[data-detail-cta]') return els.ctaEl
          if (selector === '[data-detail-cta-label]') return els.ctaLabelEl
          return null
        }),
      }

      return { panel, els }
    }

    /* ── Per-state detail panel behaviour ─────────────────────── */

    describe('locked node affordance', () => {
      it('shows detail panel with state label and reason, no CTA', async () => {
        const { panel, els } = createPanelMock()
        const viewportHost = { dataset: {}, firstElementChild: null, replaceChildren: vi.fn() }
        const app = new SpecializationTreeApp()
        app.actor = createActor()
        app.element = createRoot({ viewportHost, panel })
        await app._onRender({ currentTreeId: 'spec-a', renderNodes: [], renderConnections: [] }, {})

        const node = {
          talentName: 'Durable',
          xpCost: 15,
          isRanked: false,
          talentDescription: null,
          nodeStateLabel: 'Locked',
          reasonLabel: 'Prerequisites not met',
          actionable: { primaryAction: null },
        }

        await app.renderer.onNodePointerDown(node)

        expect(panel.hidden).toBe(false)
        expect(els.nameEl.textContent).toBe('Durable')
        expect(els.costEl.textContent).toContain('15 XP')
        expect(els.stateEl.textContent).toBe('Locked')
        expect(els.reasonEl.hidden).toBe(false)
        expect(els.reasonEl.textContent).toBe('Prerequisites not met')
        expect(els.ctaEl.hidden).toBe(true)
      })
    })

    describe('invalid node affordance', () => {
      it('shows detail panel with state label and reason, no CTA', async () => {
        const { panel, els } = createPanelMock()
        const viewportHost = { dataset: {}, firstElementChild: null, replaceChildren: vi.fn() }
        const app = new SpecializationTreeApp()
        app.actor = createActor()
        app.element = createRoot({ viewportHost, panel })
        await app._onRender({ currentTreeId: 'spec-a', renderNodes: [], renderConnections: [] }, {})

        const node = {
          talentName: 'Unknown talent',
          xpCost: 0,
          isRanked: false,
          talentDescription: null,
          nodeStateLabel: 'Invalid',
          reasonLabel: 'Node not found',
          actionable: { primaryAction: null },
        }

        await app.renderer.onNodePointerDown(node)

        expect(panel.hidden).toBe(false)
        expect(els.nameEl.textContent).toBe('Unknown talent')
        expect(els.stateEl.textContent).toBe('Invalid')
        expect(els.reasonEl.hidden).toBe(false)
        expect(els.reasonEl.textContent).toBe('Node not found')
        expect(els.ctaEl.hidden).toBe(true)
      })
    })

    describe('purchased node blocked by dependents', () => {
      it('shows detail panel with blocked reason and no CTA', async () => {
        const { panel, els } = createPanelMock()
        const viewportHost = { dataset: {}, firstElementChild: null, replaceChildren: vi.fn() }
        const app = new SpecializationTreeApp()
        app.actor = createActor()
        app.element = createRoot({ viewportHost, panel })
        await app._onRender({ currentTreeId: 'spec-a', renderNodes: [], renderConnections: [] }, {})

        const node = {
          talentName: 'Tough',
          xpCost: 5,
          isRanked: true,
          talentDescription: '<p>Already owned</p>',
          nodeStateLabel: 'Purchased',
          reasonLabel: null,
          actionable: {
            primaryAction: null,
            blockedReasonCode: 'node-has-dependents',
            blockedReasonLabel: 'Node has purchased dependents',
          },
        }

        await app.renderer.onNodePointerDown(node)

        expect(panel.hidden).toBe(false)
        expect(els.nameEl.textContent).toBe('Tough')
        expect(els.stateEl.textContent).toBe('Purchased')
        expect(els.reasonEl.hidden).toBe(false)
        expect(els.reasonEl.textContent).toBe('Node has purchased dependents')
        expect(els.ctaEl.hidden).toBe(true)
        expect(els.descriptionEl.innerHTML).toBe('<p>Already owned</p>')
      })
    })

    /* ── Action / microcopy continuity ────────────────────────── */

    describe('action/microcopy continuity', () => {
      it('confirm dialog purchase action label matches the actionable actionLabel', async () => {
        const app = new SpecializationTreeApp()
        app.actor = createActor()
        app.rendered = true
        const viewportHost = { dataset: {}, firstElementChild: null, replaceChildren: vi.fn() }
        const panel = { hidden: true, querySelector: vi.fn(() => null) }
        app.element = createRoot({ viewportHost, panel })
        vi.spyOn(app, 'refresh').mockResolvedValue(app)

        await app._onRender({ currentTreeId: 'spec-a', renderNodes: [], renderConnections: [] }, {})

        const confirmSpy = vi.spyOn(foundry.applications.api.DialogV2, 'confirm')
        confirmSpy.mockResolvedValue(true)

        const node = {
          nodeId: 'n1',
          talentName: 'Tough',
          xpCost: 5,
          actionable: {
            primaryAction: 'purchase',
            canPurchase: true,
            actionLabel: '[SWERPG.TALENT.SPECIALIZATION_TREE_APP.ACTION.PURCHASE]',
            actionRef: { specializationId: 'spec-a', nodeId: 'n1' },
          },
        }

        await app.renderer.onNodePointerDown(node)

        expect(confirmSpy).toHaveBeenCalled()
        const callArgs = confirmSpy.mock.calls[0][0]

        // Button label uses the same actionLabel as the panel CTA would show
        expect(callArgs.buttons[0].label).toBe('[SWERPG.TALENT.SPECIALIZATION_TREE_APP.ACTION.PURCHASE]')
        // Title includes the actionLabel via {action} interpolation
        expect(callArgs.title).toBe('[SWERPG.TALENT.SPECIALIZATION_TREE_APP.ACTION.PURCHASE]: Tough')
      })

      it('confirm dialog forget action label matches the actionable actionLabel', async () => {
        const app = new SpecializationTreeApp()
        app.actor = createActor()
        app.rendered = true
        const viewportHost = { dataset: {}, firstElementChild: null, replaceChildren: vi.fn() }
        const panel = { hidden: true, querySelector: vi.fn(() => null) }
        app.element = createRoot({ viewportHost, panel })
        vi.spyOn(app, 'refresh').mockResolvedValue(app)

        await app._onRender({ currentTreeId: 'spec-a', renderNodes: [], renderConnections: [] }, {})

        const confirmSpy = vi.spyOn(foundry.applications.api.DialogV2, 'confirm')
        confirmSpy.mockResolvedValue(true)

        const node = {
          nodeId: 'n1',
          talentName: 'Tough',
          xpCost: 5,
          actionable: {
            primaryAction: 'forget',
            canForget: true,
            actionLabel: '[SWERPG.TALENT.SPECIALIZATION_TREE_APP.ACTION.FORGET]',
            actionRef: { specializationId: 'spec-a', nodeId: 'n1' },
          },
        }

        await app.renderer.onNodePointerDown(node)

        expect(confirmSpy).toHaveBeenCalled()
        const callArgs = confirmSpy.mock.calls[0][0]

        // Button label uses the same actionLabel as the panel CTA would show
        expect(callArgs.buttons[0].label).toBe('[SWERPG.TALENT.SPECIALIZATION_TREE_APP.ACTION.FORGET]')
        // Title includes the actionLabel via {action} interpolation
        expect(callArgs.title).toBe('[SWERPG.TALENT.SPECIALIZATION_TREE_APP.ACTION.FORGET]: Tough')
      })
    })

    /* ── Non-regression compact flow ──────────────────────────── */

    describe('non-regression flow (GUX1→GUX5)', () => {
      it('legend items, detail panel, and purchase action coexist coherently', async () => {
        const localize = (key) => key
        const legendItems = buildLegendItems(localize)

        // 1 — Legend exposes all four states with coherent affordance
        expect(legendItems).toHaveLength(4)
        const affordanceMap = Object.fromEntries(legendItems.map((i) => [i.state, i.affordance]))
        expect(affordanceMap).toEqual({
          purchased: 'informational',
          available: 'actionable',
          locked: 'blocked',
          invalid: 'informational',
        })

        // 2 — Legend cursor assignment matches affordance intent
        const cursorMap = Object.fromEntries(legendItems.map((i) => [i.state, i.cursor]))
        expect(cursorMap).toEqual({
          purchased: 'default',
          available: 'pointer',
          locked: 'not-allowed',
          invalid: 'help',
        })

        // 3 — Locked node triggers detail panel (no action) with correct state
        const { panel: lockedPanel, els: lockedEls } = createPanelMock()
        const viewportHostLocked = { dataset: {}, firstElementChild: null, replaceChildren: vi.fn() }
        const appLocked = new SpecializationTreeApp()
        appLocked.actor = createActor()
        appLocked.element = createRoot({ viewportHost: viewportHostLocked, panel: lockedPanel })
        await appLocked._onRender({ currentTreeId: 'spec-a', renderNodes: [], renderConnections: [] }, {})

        await appLocked.renderer.onNodePointerDown({
          talentName: 'Grit',
          xpCost: 10,
          isRanked: true,
          talentDescription: null,
          nodeStateLabel: 'Locked',
          reasonLabel: 'Not enough XP',
          actionable: { primaryAction: null },
        })

        expect(lockedPanel.hidden).toBe(false)
        expect(lockedEls.stateEl.textContent).toBe('Locked')
        expect(lockedEls.reasonEl.textContent).toBe('Not enough XP')
        expect(lockedEls.ctaEl.hidden).toBe(true)

        // 4 — Deselected background callback hides panel
        appLocked.renderer.onBackgroundPointerDown()
        expect(lockedPanel.hidden).toBe(true)

        // 5 — Available node triggers purchase flow directly (panel stays hidden)
        const fastPanel = { hidden: true, querySelector: vi.fn(() => null) }
        const viewportHostAvail = { dataset: {}, firstElementChild: null, replaceChildren: vi.fn() }
        const appAvail = new SpecializationTreeApp()
        appAvail.actor = createActor()
        appAvail.rendered = true
        appAvail.element = createRoot({ viewportHost: viewportHostAvail, panel: fastPanel })
        const refreshSpy = vi.spyOn(appAvail, 'refresh').mockResolvedValue(appAvail)
        await appAvail._onRender({ currentTreeId: 'spec-a', renderNodes: [], renderConnections: [] }, {})

        purchaseTalentNodeMock.mockResolvedValue({ ok: true })
        const confirmSpy = vi.spyOn(foundry.applications.api.DialogV2, 'confirm')
        confirmSpy.mockResolvedValue(true)
        const infoSpy = vi.spyOn(ui.notifications, 'info')

        await appAvail.renderer.onNodePointerDown({
          nodeId: 'n1',
          talentName: 'Tough',
          xpCost: 5,
          actionable: {
            primaryAction: 'purchase',
            canPurchase: true,
            actionRef: { specializationId: 'spec-a', nodeId: 'n1' },
          },
        })

        expect(purchaseTalentNodeMock).toHaveBeenCalledWith(appAvail.actor, 'spec-a', 'n1')
        expect(infoSpy).toHaveBeenCalled()
        expect(refreshSpy).toHaveBeenCalled()
      })
    })
  })
})
