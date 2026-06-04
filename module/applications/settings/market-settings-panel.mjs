import {
  readMarketConfig,
  writeMarketConfig,
  readMarketExcludedItems,
  writeMarketExcludedItems,
  readMarketTypeModifiers,
  writeMarketTypeModifiers,
  readMarketGlobalPriceModifier,
  writeMarketGlobalPriceModifier,
  readMarketLocationConfigs,
  writeMarketLocationConfigs,
  readMarketAllowBrokenItemSale,
  writeMarketAllowBrokenItemSale,
  readMarketBrokenItemSaleMultiplier,
  writeMarketBrokenItemSaleMultiplier,
} from '../../lib/market/market-settings.mjs'
import { createLocationConfig, upsertLocationConfig, removeLocationConfig } from '../../lib/market/location-config.mjs'
import { loadMarketCatalog } from '../../lib/market/catalog-loader.mjs'
import { loadCompendiumItems } from '../market/compendium-source-adapter.mjs'
import {
  PURCHASABLE_ITEM_TYPES,
  SOURCE_TYPES,
  MARKET_TYPES,
  DEFAULT_MARKET_CONFIG,
  DEFAULT_ALLOW_BROKEN_ITEM_SALE,
  DEFAULT_BROKEN_ITEM_SALE_MULTIPLIER,
  BROKEN_ITEM_SALE_MULTIPLIER_MIN,
  BROKEN_ITEM_SALE_MULTIPLIER_MAX,
} from '../../config/market.mjs'
import { logger } from '../../utils/logger.mjs'

const { api } = foundry.applications

/* -------------------------------------------- */

/**
 * Market Settings Panel — ApplicationV2 providing the GM with a tabbed interface
 * for configuring all Market settings without touching the Foundry console or JSON.
 *
 * Tabs:
 *   - sources      : enabled sources, allowed item types, dedup strategy
 *   - prices       : per-type price modifiers + global price modifier
 *   - exclusions   : manually excluded item UUIDs
 *   - locations    : location configs with rarity modifiers
 *   - diagnostic   : catalog scan + export config + reset to defaults
 */
export default class MarketSettingsPanel extends api.HandlebarsApplicationMixin(api.ApplicationV2) {
  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    id: 'market-settings-panel',
    classes: ['swerpg', 'application', 'market-settings-panel'],
    window: {
      title: 'MARKET.Settings.Title',
      minimizable: true,
      resizable: true,
    },
    position: {
      width: 720,
      height: 620,
    },
    actions: {
      addExcludedItem: MarketSettingsPanel.#onAddExcludedItem,
      removeExcludedItem: MarketSettingsPanel.#onRemoveExcludedItem,
      addLocation: MarketSettingsPanel.#onAddLocation,
      removeLocation: MarketSettingsPanel.#onRemoveLocation,
      scanCatalog: MarketSettingsPanel.#onScanCatalog,
      exportConfig: MarketSettingsPanel.#onExportConfig,
      resetDefaults: MarketSettingsPanel.#onResetDefaults,
      saveSettings: MarketSettingsPanel.#onSaveSettings,
    },
  }

  /** @override */
  static PARTS = {
    header: { template: 'systems/swerpg/templates/settings/market-header.hbs' },
    tabs: { template: 'systems/swerpg/templates/settings/market-tabs.hbs' },
    sources: { template: 'systems/swerpg/templates/settings/market-sources.hbs' },
    exclusions: { template: 'systems/swerpg/templates/settings/market-exclusions.hbs' },
    prices: { template: 'systems/swerpg/templates/settings/market-prices.hbs' },
    locations: { template: 'systems/swerpg/templates/settings/market-locations.hbs' },
    diagnostic: { template: 'systems/swerpg/templates/settings/market-diagnostic.hbs' },
  }

  /* -------------------------------------------- */

  /**
   * Currently active tab.
   * @type {string}
   */
  _activeTab = 'sources'

  /**
   * Last catalog scan result (count of visible items).
   * null means no scan has been run yet.
   * @type {number|null}
   */
  _lastScanCount = null

  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options)
    const systemId = game.system.id

    context.activeTab = this._activeTab
    context.tabs = [
      { id: 'sources', label: 'MARKET.Settings.Tabs.Sources', icon: 'fa-solid fa-database' },
      { id: 'prices', label: 'MARKET.Settings.Tabs.Prices', icon: 'fa-solid fa-coins' },
      { id: 'exclusions', label: 'MARKET.Settings.Tabs.Exclusions', icon: 'fa-solid fa-ban' },
      { id: 'locations', label: 'MARKET.Settings.Tabs.Locations', icon: 'fa-solid fa-map-location-dot' },
      { id: 'diagnostic', label: 'MARKET.Settings.Tabs.Diagnostic', icon: 'fa-solid fa-stethoscope' },
    ]

    context.config = readMarketConfig(systemId)
    context.excludedItems = readMarketExcludedItems(systemId)
    context.typeModifiers = readMarketTypeModifiers(systemId)
    context.globalPriceModifier = readMarketGlobalPriceModifier(systemId)
    context.locationConfigs = readMarketLocationConfigs(systemId)
    context.allowBrokenItemSale = readMarketAllowBrokenItemSale(systemId)
    context.brokenItemSaleMultiplier = readMarketBrokenItemSaleMultiplier(systemId)
    context.brokenItemSaleMultiplierMin = BROKEN_ITEM_SALE_MULTIPLIER_MIN
    context.brokenItemSaleMultiplierMax = BROKEN_ITEM_SALE_MULTIPLIER_MAX
    context.locationList = Object.values(context.locationConfigs)
    context.lastScanCount = this._lastScanCount

    context.purchasableTypes = Object.values(PURCHASABLE_ITEM_TYPES)
    context.sourceTypes = Object.values(SOURCE_TYPES)
    context.marketTypes = Object.values(MARKET_TYPES)

    context.dedupOptions = [
      { value: 'prefer-compendium', label: 'MARKET.Settings.Sources.DedupPreferCompendium' },
      { value: 'prefer-newest', label: 'MARKET.Settings.Sources.DedupPreferNewest' },
      { value: 'keep-all', label: 'MARKET.Settings.Sources.DedupKeepAll' },
    ]

    return context
  }

  /** @override */
  async _preparePartContext(partId, context, options) {
    context.partId = partId
    context.isActive = partId === this._activeTab || partId === 'header' || partId === 'tabs'
    return context
  }

  /* -------------------------------------------- */
  /*  Event Listeners                             */
  /* -------------------------------------------- */

  /** @override */
  _onRender(context, options) {
    super._onRender?.(context, options)
    const html = this.element
    if (!html) return

    // Tab click handler
    html.querySelectorAll('.market-settings-panel__tab-link').forEach((el) => {
      el.addEventListener('click', (event) => {
        event.preventDefault()
        const tab = event.currentTarget.dataset?.tab
        if (tab) {
          this._activeTab = tab
          this.render()
        }
      })
    })
  }

  /* -------------------------------------------- */
  /*  Actions                                     */
  /* -------------------------------------------- */

  /**
   * Collect and save all settings from the current form state.
   * @this {MarketSettingsPanel}
   * @param {PointerEvent} _event
   * @param {HTMLElement}  _target
   * @returns {Promise<void>}
   */
  static async #onSaveSettings(_event, _target) {
    const systemId = game.system.id
    const html = this.element
    if (!html) return

    try {
      // --- Sources & Types ---
      const enabledSources = Array.from(html.querySelectorAll('[name="enabledSource"]:checked')).map((el) => el.value)
      const allowedItemTypes = Array.from(html.querySelectorAll('[name="allowedItemType"]:checked')).map((el) => el.value)
      const dedupStrategyEl = html.querySelector('[name="dedupStrategy"]')
      const dedupStrategy = dedupStrategyEl?.value ?? 'prefer-compendium'

      await writeMarketConfig(systemId, { enabledSources, allowedItemTypes, dedupStrategy })

      // --- Global price modifier ---
      const globalPriceEl = html.querySelector('[name="globalPriceModifier"]')
      const globalPriceModifier = globalPriceEl ? Number(globalPriceEl.value) || 0 : 0
      await writeMarketGlobalPriceModifier(systemId, globalPriceModifier)

      // --- Per-type price modifiers ---
      const typeModifiers = {}
      html.querySelectorAll('[data-type-modifier]').forEach((el) => {
        const itemType = el.dataset.typeModifier
        const value = Number(el.value)
        if (itemType && Number.isFinite(value)) {
          typeModifiers[itemType] = { priceModifier: value / 100 }
        }
      })
      await writeMarketTypeModifiers(systemId, typeModifiers)

      // --- Broken item sale policy ---
      const allowBrokenEl = html.querySelector('[name="allowBrokenItemSale"]')
      const allowBrokenItemSale = allowBrokenEl ? allowBrokenEl.checked : false
      await writeMarketAllowBrokenItemSale(systemId, allowBrokenItemSale)

      const brokenMultiplierEl = html.querySelector('[name="brokenItemSaleMultiplier"]')
      const brokenItemSaleMultiplier = brokenMultiplierEl ? Number(brokenMultiplierEl.value) || 0 : 0
      await writeMarketBrokenItemSaleMultiplier(systemId, brokenItemSaleMultiplier)

      ui.notifications.info(game.i18n.localize('MARKET.Settings.SavedSuccess'))
      logger.info('[MarketSettingsPanel] Settings saved successfully')

      // Trigger Market refresh if open
      const market = Object.values(ui.windows ?? {}).find((w) => w.constructor.name === 'MarketApplicationV2')
      if (market) {
        logger.debug('[MarketSettingsPanel] Refreshing open Market after settings change')
        await market.render()
      }

      await this.render()
    } catch (err) {
      logger.error('[MarketSettingsPanel] Failed to save settings', err)
      ui.notifications.error(game.i18n.localize('MARKET.Settings.SaveError'))
    }
  }

  /**
   * Open an item-picker dialog and add the selected item's UUID to the exclusions list.
   * Falls back to a simple prompt input when no item picker is available.
   *
   * @this {MarketSettingsPanel}
   * @param {PointerEvent} _event
   * @param {HTMLElement}  _target
   * @returns {Promise<void>}
   */
  static async #onAddExcludedItem(_event, _target) {
    const systemId = game.system.id

    // Simple prompt fallback — the GM types the UUID manually
    const uuid = await new Promise((resolve) => {
      const dialog = new foundry.applications.api.DialogV2({
        window: { title: game.i18n.localize('MARKET.Settings.Exclusions.AddItemTitle') },
        content: `<p>${game.i18n.localize('MARKET.Settings.Exclusions.AddItemHint')}</p>
          <div class="form-group">
            <label>${game.i18n.localize('MARKET.Settings.Exclusions.UuidLabel')}</label>
            <input type="text" name="uuid" placeholder="Item.xxxx" />
          </div>`,
        buttons: [
          {
            action: 'confirm',
            label: game.i18n.localize('MARKET.Settings.Exclusions.AddItem'),
            icon: 'fa-solid fa-plus',
            callback: (event, button, htmlEl) => htmlEl.querySelector('[name="uuid"]')?.value?.trim() ?? '',
          },
          { action: 'cancel', label: game.i18n.localize('MARKET.Settings.Cancel'), icon: 'fa-solid fa-xmark' },
        ],
        default: 'confirm',
      })
      dialog.render(true)
      dialog.addEventListener('close', () => resolve(null))
      dialog.addEventListener('button', (data) => {
        if (data.action === 'confirm') resolve(data.result)
        else resolve(null)
      })
    })

    if (!uuid) return

    const existing = readMarketExcludedItems(systemId)
    if (existing.includes(uuid)) {
      ui.notifications.info(game.i18n.localize('MARKET.Settings.Exclusions.AlreadyExcluded'))
      return
    }

    await writeMarketExcludedItems(systemId, [...existing, uuid])
    logger.info('[MarketSettingsPanel] Item excluded from Market', { uuid })
    await this.render()
  }

  /**
   * Remove an item UUID from the exclusions list.
   *
   * @this {MarketSettingsPanel}
   * @param {PointerEvent} _event
   * @param {HTMLElement}  target   Element bearing data-uuid
   * @returns {Promise<void>}
   */
  static async #onRemoveExcludedItem(_event, target) {
    const systemId = game.system.id
    const uuid = target.dataset?.uuid
    if (!uuid) return

    const existing = readMarketExcludedItems(systemId)
    const updated = existing.filter((id) => id !== uuid)
    await writeMarketExcludedItems(systemId, updated)
    logger.info('[MarketSettingsPanel] Item removed from exclusion list', { uuid })
    await this.render()
  }

  /**
   * Open a dialog to create a new location configuration.
   *
   * @this {MarketSettingsPanel}
   * @param {PointerEvent} _event
   * @param {HTMLElement}  _target
   * @returns {Promise<void>}
   */
  static async #onAddLocation(_event, _target) {
    const systemId = game.system.id

    const name = await foundry.applications.api.DialogV2.prompt({
      window: { title: game.i18n.localize('MARKET.Settings.Locations.AddLocationTitle') },
      content: `<div class="form-group">
        <label>${game.i18n.localize('MARKET.Settings.Locations.NameLabel')}</label>
        <input type="text" name="locationName" placeholder="${game.i18n.localize('MARKET.Settings.Locations.NamePlaceholder')}" />
      </div>`,
      label: game.i18n.localize('MARKET.Settings.Locations.AddLocation'),
      callback: (event, button, htmlEl) => htmlEl.querySelector('[name="locationName"]')?.value?.trim() ?? '',
    })

    if (!name) return

    const existing = readMarketLocationConfigs(systemId)
    if (existing[name]) {
      ui.notifications.warn(game.i18n.format('MARKET.Settings.Locations.AlreadyExists', { name }))
      return
    }

    const newConfig = createLocationConfig(name)
    const updated = upsertLocationConfig(existing, newConfig)
    await writeMarketLocationConfigs(systemId, updated)
    logger.info('[MarketSettingsPanel] Location added', { name })
    await this.render()
  }

  /**
   * Remove a location configuration by name.
   *
   * @this {MarketSettingsPanel}
   * @param {PointerEvent} _event
   * @param {HTMLElement}  target  Element bearing data-location-name
   * @returns {Promise<void>}
   */
  static async #onRemoveLocation(_event, target) {
    const systemId = game.system.id
    const name = target.dataset?.locationName
    if (!name) return

    const existing = readMarketLocationConfigs(systemId)
    const updated = removeLocationConfig(existing, name)
    await writeMarketLocationConfigs(systemId, updated)
    logger.info('[MarketSettingsPanel] Location removed', { name })
    await this.render()
  }

  /**
   * Run a quick catalog scan and display the visible items count.
   *
   * @this {MarketSettingsPanel}
   * @param {PointerEvent} _event
   * @param {HTMLElement}  _target
   * @returns {Promise<void>}
   */
  static async #onScanCatalog(_event, _target) {
    try {
      const systemId = game.system.id
      const marketConfig = readMarketConfig(systemId)
      const excludedIds = readMarketExcludedItems(systemId)

      const worldItems = Array.from(game.items).map((item) => ({
        uuid: item.uuid ?? '',
        name: item.name ?? '',
        type: item.type ?? '',
        basePrice: item.system?._source?.price ?? item.system?.price ?? 0,
        rarity: item.system?.rarity ?? 0,
        restrictionLevel: item.system?.restrictionLevel ?? '',
        nonPurchasable: item.system?.nonPurchasable === true,
        broken: item.system?.broken === true,
      }))

      let compendiumItems = []
      try {
        compendiumItems = await loadCompendiumItems()
      } catch (err) {
        logger.warn('[MarketSettingsPanel] Could not load compendium items for scan', err)
      }

      const entries = loadMarketCatalog({
        worldItems,
        compendiumItems,
        config: marketConfig,
        marketContext: { availability: 'available', marketType: 'standard', manualModifier: 0 },
        excludedIds,
      })

      this._lastScanCount = entries.length
      logger.info('[MarketSettingsPanel] Catalog scan completed', { count: entries.length })
      ui.notifications.info(game.i18n.format('MARKET.Settings.Diagnostic.ScanResult', { count: entries.length }))
      await this.render()
    } catch (err) {
      logger.error('[MarketSettingsPanel] Catalog scan failed', err)
      ui.notifications.error(game.i18n.localize('MARKET.Settings.Diagnostic.ScanError'))
    }
  }

  /**
   * Export the current Market configuration as a JSON string copied to clipboard.
   *
   * @this {MarketSettingsPanel}
   * @param {PointerEvent} _event
   * @param {HTMLElement}  _target
   * @returns {Promise<void>}
   */
  static async #onExportConfig(_event, _target) {
    const systemId = game.system.id
    const exportData = {
      config: readMarketConfig(systemId),
      excludedItems: readMarketExcludedItems(systemId),
      typeModifiers: readMarketTypeModifiers(systemId),
      globalPriceModifier: readMarketGlobalPriceModifier(systemId),
      locationConfigs: readMarketLocationConfigs(systemId),
      exportedAt: new Date().toISOString(),
    }

    const json = JSON.stringify(exportData, null, 2)

    try {
      await navigator.clipboard.writeText(json)
      ui.notifications.info(game.i18n.localize('MARKET.Settings.Diagnostic.ExportCopied'))
    } catch {
      // Fallback: show in a dialog
      await foundry.applications.api.DialogV2.prompt({
        window: { title: game.i18n.localize('MARKET.Settings.Diagnostic.Export') },
        content: `<textarea rows="16" style="width:100%;font-family:monospace;font-size:0.75em;" readonly>${json}</textarea>`,
        label: game.i18n.localize('MARKET.Settings.Close'),
      })
    }

    logger.info('[MarketSettingsPanel] Configuration exported')
  }

  /**
   * Reset all Market settings to their system defaults.
   *
   * @this {MarketSettingsPanel}
   * @param {PointerEvent} _event
   * @param {HTMLElement}  _target
   * @returns {Promise<void>}
   */
  static async #onResetDefaults(_event, _target) {
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize('MARKET.Settings.Diagnostic.ResetTitle') },
      content: `<p>${game.i18n.localize('MARKET.Settings.Diagnostic.ResetContent')}</p>`,
      yes: { label: game.i18n.localize('MARKET.Settings.Diagnostic.ResetConfirm'), icon: 'fa-solid fa-rotate-left' },
      no: { label: game.i18n.localize('MARKET.Settings.Cancel'), icon: 'fa-solid fa-xmark' },
    })

    if (!confirmed) return

    const systemId = game.system.id

    await writeMarketConfig(systemId, DEFAULT_MARKET_CONFIG)
    await writeMarketExcludedItems(systemId, [])
    await writeMarketTypeModifiers(systemId, {})
    await writeMarketGlobalPriceModifier(systemId, 0)
    await writeMarketLocationConfigs(systemId, {})
    await writeMarketAllowBrokenItemSale(systemId, DEFAULT_ALLOW_BROKEN_ITEM_SALE)
    await writeMarketBrokenItemSaleMultiplier(systemId, DEFAULT_BROKEN_ITEM_SALE_MULTIPLIER)

    this._lastScanCount = null
    logger.info('[MarketSettingsPanel] All Market settings reset to defaults')
    ui.notifications.info(game.i18n.localize('MARKET.Settings.Diagnostic.ResetSuccess'))
    await this.render()
  }
}
