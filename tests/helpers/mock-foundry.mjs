/**
 * Central helper to mock the minimal Foundry VTT globals required by unit tests.
 * Fail-fast philosophy: production code assumes presence of Foundry; tests must provide it.
 */
import { vi } from 'vitest'

// Provide early global stubs so modules importing before setup have bases
if (!globalThis.Color) {
  globalThis.Color = { from: (hex) => ({ hex }) }
}
if (!globalThis.Roll) {
  globalThis.Roll = class MockRollEarly {
    constructor(formula, data) {
      this.formula = formula
      this.data = data || {}
      this.terms = []
      this.dice = []
    }
    roll() {
      return this
    }
    static parse(formula, data) {
      return [{ term: formula, data }]
    }
    toJSON() {
      return { formula: this.formula }
    }
    async toMessage(md) {
      return md
    }
  }
}
if (!globalThis.Item) {
  globalThis.Item = class MockItemEarly {
    constructor(data = {}) {
      this.system = data.system || {}
      this.name = data.name || 'Mock Item'
      this.type = data.type || 'item'
    }
  }
}
if (!globalThis.DialogV2) {
  globalThis.DialogV2 = class MockDialogEarly {
    constructor(options = {}) {
      this.options = options
    }
    render() {
      return this
    }
  }
}

// Foundry API minimal stub for modules that import foundry.applications.api at load time
if (!globalThis.foundry) {
  globalThis.foundry = {
    applications: {
      api: {
        DialogV2: class MockDialogV2Early {
          constructor(options = {}) {
            this.options = options
          }
          static prompt() {
            return null
          }
        },
        // DocumentSheetV2 minimal early stub (full stub added later in setupFoundryMock)
        DocumentSheetV2: class DocumentSheetV2Early {
          constructor({ document, ...options } = {}) {
            this.document = document || { system: {} }
            this.options = options
          }
          render() {
            return this
          }
        },
        HandlebarsApplicationMixin: (base) => base,
      },
      // Instances registry consumed by ActionUseDialog.debounceChangeTarget
      instances: new Map(),
    },
    abstract: {
      DataModel: class DataModelEarly {
        static defineSchema() {
          return {}
        }
        static get schema() {
          return { fields: {} }
        }
        constructor(data = {}) {
          this._source = data
          Object.assign(this, data)
        }
        toObject() {
          return this._source
        }
      },
      TypeDataModel: class TypeDataModelEarly {
        static defineSchema() {
          return {}
        }
        static get schema() {
          return { fields: {} }
        }
        constructor(data = {}) {
          this._source = data
          Object.assign(this, data)
        }
        toObject() {
          return this._source
        }
      },
    },
    data: {
      fields: {
        StringField: class {
          constructor(cfg = {}) {
            this.config = cfg
          }
        },
        NumberField: class {
          constructor(cfg = {}) {
            this.config = cfg
          }
        },
        BooleanField: class {
          constructor(cfg = {}) {
            this.config = cfg
          }
        },
        ObjectField: class {
          constructor(cfg = {}) {
            this.config = cfg
          }
        },
        ArrayField: class {
          constructor(field, cfg = {}) {
            this.field = field
            this.config = cfg
          }
        },
        SetField: class {
          constructor(field, cfg = {}) {
            this.field = field
            this.config = cfg
          }
        },
        SchemaField: class {
          constructor(schema = {}) {
            this.schema = schema
          }
        },
      },
    },
    utils: {
      deepClone: (o) => structuredClone(o),
      mergeObject: (original, other) => Object.assign(original, other),
      // Provide early noop debounce so modules imported before vitest setup do not explode
      debounce: (fn) => fn,
      isEmpty: (obj) => !obj || Object.keys(obj).length === 0,
    },
  }
}

// Polyfills Foundry globaux
if (!globalThis.Number.isNumeric) {
  globalThis.Number.isNumeric = function (n) {
    return !Number.isNaN(Number.parseFloat(n)) && Number.isFinite(n)
  }
}
if (!globalThis.Math.clamp) {
  globalThis.Math.clamp = function (value, min, max) {
    if (Number.isNaN(value)) return min
    return Math.min(Math.max(value, min), max)
  }
}

const defaultTranslations = {
  'SWERPG.ERRORS.InvalidEvent': 'Invalid event: Unable to process the UI interaction.',
  'SWERPG.ERRORS.InvalidActor': 'Invalid actor: Unable to access character data.',
  'SWERPG.ERRORS.NoItemId': 'No item selected: Please click on a valid item.',
  'SWERPG.ERRORS.NoItemsCollection': 'Character data error: Items collection is missing.',
  'SWERPG.ERRORS.ItemNotFound': 'Item not found: The selected item may have been deleted.',
  'SWERPG.ERRORS.UnexpectedError': 'An unexpected error occurred. Please check the console for details.',
}

let previous = null

/**
 * Setup Foundry mock environment.
 * @param {object} [options]
 * @param {Record<string,string>} [options.translations] Additional/override translations.
 * @param {object} [options.foundryPatch] Extra properties merged into globalThis.foundry.
 * @returns {void}
 */
export function setupFoundryMock(options = {}) {
  // Handle null/undefined options gracefully
  const safeOptions = options || {}
  const { translations = {}, foundryPatch = {}, game: gamePatch = {}, ui: uiPatch = {} } = safeOptions
  // Preserve any existing globals (unlikely in test but defensive for nested usage).
  previous = {
    foundry: globalThis.foundry,
    game: globalThis.game,
    ui: globalThis.ui,
  }

  const mergedTranslations = { ...defaultTranslations, ...translations }

  globalThis.foundry = {
    applications: {
      api: {
        HandlebarsApplicationMixin: (base) => base,
        // Minimal DocumentSheetV2 stub to satisfy sheets extending it in tests
        DocumentSheetV2: class DocumentSheetV2Mock {
          constructor({ document, ...options } = {}) {
            this.document = document || { system: { actions: [] } }
            this.options = options
            this.element = {}
            this.isEditable = true
          }
          async render() {
            return this
          }
          async _onRender(_context, _options) {
            /* noop */
          }
          _onChangeForm(_formConfig, _event) {
            /* noop */
          }
          _processFormData(_event, _form, _formData) {
            return {}
          }
        },
        DialogV2: class DialogV2Mock {
          constructor(options = {}) {
            this.options = options
          }
          static TEMPLATE = ''
          render() {
            return this
          }
          _initializeApplicationOptions(o) {
            return o
          }
          async _preFirstRender() {
            /* noop */
          }
          async _prepareContext() {
            return {}
          }
          async _renderHTML() {
            return ''
          }
          _replaceHTML() {
            /* noop */
          }
        },
      },
      sheets: {
        ActorSheetV2: class MockActorSheetV2 {
          constructor(options = {}) {
            this.options = options
          }
          render() {
            /* noop stub */
          }
        },
      },
    },
    abstract: {
      DataModel: class MockDataModel {
        static defineSchema() {
          return {}
        }
        static get schema() {
          return { fields: {} }
        }
        constructor(data = {}) {
          this._source = data
        }
        clone() {
          return this
        }
        updateSource(_data) {
          /* noop */
        }
        toObject() {
          return this._source || {}
        }
      },
    },
    data: {
      fields: {
        StringField: class {
          constructor(cfg = {}) {
            this.config = cfg
          }
        },
        FilePathField: class {
          constructor(cfg = {}) {
            this.config = cfg
          }
        },
        HTMLField: class {
          constructor(cfg = {}) {
            this.config = cfg
          }
        },
        NumberField: class {
          constructor(cfg = {}) {
            this.config = cfg
          }
        },
        BooleanField: class {
          constructor(cfg = {}) {
            this.config = cfg
          }
        },
        ObjectField: class {
          constructor(cfg = {}) {
            this.config = cfg
          }
        },
        ArrayField: class {
          constructor(field, cfg = {}) {
            this.field = field
            this.config = cfg
          }
        },
        SetField: class {
          constructor(field, cfg = {}) {
            this.field = field
            this.config = cfg
          }
        },
        SchemaField: class {
          constructor(schema = {}) {
            this.schema = schema
          }
        },
      },
    },
    utils: {
      // Custom deepClone that tolerates functions, symbols and circular refs (copies by reference)
      deepClone: vi.fn(function deepClone(value, seen = new Map()) {
        if (value === undefined || value === null) return value
        const type = typeof value
        if (type === 'function' || type === 'symbol') return value
        if (type !== 'object') return value
        if (seen.has(value)) return seen.get(value)

        if (value instanceof Date) return new Date(value.getTime())
        if (value instanceof RegExp) return new RegExp(value.source, value.flags)
        if (value instanceof Map) {
          const m = new Map()
          ;[...value.entries()].forEach(([k, v]) => m.set(k, deepClone(v, seen)))
          return m
        }
        if (value instanceof Set) {
          const s = new Set()
          ;[...value.values()].forEach((v) => s.add(deepClone(v, seen)))
          return s
        }

        // Preserve prototype for non-array objects so instanceof checks survive cloning
        const clone = Array.isArray(value) ? [] : Object.create(Object.getPrototypeOf(value))
        seen.set(value, clone)
        for (const key of Object.keys(value)) {
          try {
            clone[key] = deepClone(value[key], seen)
          } catch {
            clone[key] = value[key] // Fallback: shallow reference
          }
        }
        return clone
      }),
      getProperty: vi.fn((object, key) => {
        const keys = key.split('.')
        return keys.reduce((obj, k) => obj?.[k], object)
      }),
      expandObject: vi.fn((flat) => {
        if (!flat || typeof flat !== 'object') return {}
        const expanded = {}
        for (const [k, v] of Object.entries(flat)) {
          if (!k.includes('.')) {
            expanded[k] = v
            continue
          }
          ;(function assign(path, value, target) {
            const [head, ...rest] = path
            if (!rest.length) {
              target[head] = value
              return
            }
            if (!(head in target) || typeof target[head] !== 'object') target[head] = {}
            assign(rest, value, target[head])
          })(k.split('.'), v, expanded)
        }
        return expanded
      }),
      mergeObject: vi.fn((original, update, options = {}) => {
        const { insertKeys = true, overwrite = true, inplace = false } = options

        const isPlain = (v) => typeof v === 'object' && v !== null && !Array.isArray(v)
        const target = inplace ? original : { ...original }

        for (const [key, newVal] of Object.entries(update || {})) {
          const exists = Object.prototype.hasOwnProperty.call(target, key)
          if (!exists && !insertKeys) continue

          const oldVal = target[key]
          if (isPlain(oldVal) && isPlain(newVal)) {
            // Deep merge nested objects without overwriting missing keys
            target[key] = globalThis.foundry.utils.mergeObject(oldVal, newVal, { insertKeys, overwrite, inplace: false })
            continue
          }
          if (!exists || overwrite) {
            target[key] = newVal
          }
        }
        return target
      }),
      debounce: vi.fn((fn, _wait) => fn),
      randomID: vi.fn(() => Math.random().toString(36).slice(2, 10)),
      isEmpty: vi.fn((obj) => !obj || Object.keys(obj).length === 0),
    },
    ...foundryPatch,
  }

  const baseGame = {
    i18n: {
      localize: vi.fn((key) => mergedTranslations[key] || key),
    },
    system: {
      config: {},
    },
    user: {
      isGM: true,
    },
    // Release info accessed by StandardCheckDialog for backward compatibility logic
    release: {
      generation: 13,
    },
    messages: {
      get: vi.fn(),
      contents: [],
    },
    settings: {
      register: vi.fn(),
    },
    keybindings: {
      register: vi.fn(),
    },
    combat: null,
    combats: new Map(),
    packs: new Map(),
  }
  // Apply overrides (shallow merge; tests supply nested objects with register spies)
  globalThis.game = { ...baseGame, ...gamePatch }
  if (gamePatch.settings) globalThis.game.settings = { ...baseGame.settings, ...gamePatch.settings }
  if (gamePatch.keybindings) globalThis.game.keybindings = { ...baseGame.keybindings, ...gamePatch.keybindings }

  globalThis.ui = {
    notifications: {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
    },
  }
  if (uiPatch.notifications) {
    globalThis.ui.notifications = { ...globalThis.ui.notifications, ...uiPatch.notifications }
  }

  // Mock FoundryVTT base classes
  globalThis.Color = {
    from: vi.fn((hex) => ({ hex })),
  }

  globalThis.Roll = class MockRoll {
    constructor(formula, data) {
      this.formula = formula
      this.data = data || {}
    }

    roll() {
      return this
    }
  }

  globalThis.Item = class MockItem {
    constructor(data, options = {}) {
      this.system = data?.system || {}
      this.name = data?.name || 'Mock Item'
      this.type = data?.type || 'item'
    }

    prepareBaseData() {
      // Mock implementation
    }
  }

  globalThis.DialogV2 = class MockDialogV2 {
    constructor(options = {}) {
      this.options = options
    }
    static TEMPLATE = ''
    render() {
      return this
    }
    _initializeApplicationOptions(o) {
      return o
    }
    async _preFirstRender() {
      /* noop */
    }
    async _prepareContext() {
      return {}
    }
    async _renderHTML() {
      return ''
    }
    _replaceHTML() {
      /* noop */
    }
  }

  // FilePicker stub used by ActionConfig
  globalThis.FilePicker = class FilePickerMock {
    constructor({ current, type, callback }) {
      this.current = current
      this.type = type
      this.callback = callback || (() => {})
    }
    async browse() {
      /* simulate immediate browse */ return { files: [], current: this.current }
    }
  }

  // CONFIG global partials consumed by ActionConfig (statusEffects)
  if (!globalThis.CONFIG) {
    globalThis.CONFIG = {
      statusEffects: [
        { id: 'status1', label: 'Status 1' },
        { id: 'status2', label: 'Status 2' },
      ],
    }
  }

  // Minimal SYSTEM constants required by action data model defineSchema
  if (!globalThis.SYSTEM) {
    globalThis.SYSTEM = {
      ACTION: {
        TARGET_TYPES: { single: 'single' },
        TARGET_SCOPES: { ALL: 0, choices: { 0: 'All' } },
        TAGS: {},
        TAG_CATEGORIES: {},
      },
      ACTION_HOOKS: {},
    }
  }

  // Mock Hooks global (Foundry VTT global for hook registration)
  if (!globalThis.Hooks) {
    globalThis.Hooks = {
      on: vi.fn(),
      once: vi.fn(),
      off: vi.fn(),
      call: vi.fn(),
      callAll: vi.fn(),
    }
  }

  // Mock jQuery-like selector functions for DOM manipulation
  // Minimal jQuery-like wrapper supporting chained find(selector).remove()/append()/prepend()
  globalThis.$ = vi.fn((selector) => {
    const api = {
      _selector: selector,
      find: vi.fn((sel) => {
        // Return same api shape for simplicity (independent of selector)
        return {
          remove: vi.fn(),
          append: vi.fn(),
          prepend: vi.fn(),
          addClass: vi.fn(),
        }
      }),
      append: vi.fn(),
      prepend: vi.fn(),
      remove: vi.fn(),
      addClass: vi.fn(),
    }
    return api
  })
}

/**
 * Teardown Foundry mock environment, restoring previous globals if they existed.
 * @returns {void}
 */
export function teardownFoundryMock() {
  if (previous) {
    if (previous.foundry === undefined) delete globalThis.foundry
    else globalThis.foundry = previous.foundry
    if (previous.game === undefined) delete globalThis.game
    else globalThis.game = previous.game
    if (previous.ui === undefined) delete globalThis.ui
    else globalThis.ui = previous.ui
  }
  previous = null
}

/**
 * Utility to extend the existing mock (e.g., add combat object mid-test).
 * @param {object} patch
 */
export function extendFoundryMock(patch) {
  if (!globalThis.foundry) throw new Error('Foundry mock not initialized')

  // Deep merge for better extension support
  const mergeDeep = (target, source) => {
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key]) target[key] = {}
        mergeDeep(target[key], source[key])
      } else {
        target[key] = source[key]
      }
    }
  }

  mergeDeep(globalThis.foundry, patch)
}

/**
 * Configure (or reconfigure) a simple combat mock.
 * @param {object} [options]
 * @param {number} [options.round=1] Current combat round
 * @param {Array<{id:string,actor:any}>} [options.combatants=[]] Combatant like objects
 * @returns {void}
 */
export function setCombatMock({ round = 1, combatants = [] } = {}) {
  if (!globalThis.game) throw new Error('Game mock not initialized')
  globalThis.game.combats = new Map()
  globalThis.game.combat = {
    round,
    combatant: null,
    combatants: {
      contents: combatants,
    },
    getCombatantByActor: (actor) => combatants.find((c) => c.actor === actor) ?? null,
  }
}

/**
 * Add mock compendium packs to game.packs.
 * Each pack definition: { id, documents: Array<{id,name}> }
 * @param {Array<{id:string, documents?:Array<object>}>} packs
 */
export function addPacksMock(packs = {}) {
  if (!globalThis.game) {
    globalThis.game = { packs: new Map() }
  }
  if (!globalThis.game.packs) globalThis.game.packs = new Map()
  if (!packs || typeof packs !== 'object') return

  // Support object map form: { 'id': { name, type, documents? } }
  for (const [id, def] of Object.entries(packs)) {
    if (!id || !def) continue
    const { name = id, type = 'Item', documents = [] } = def
    const packObj = {
      metadata: { id, name, type },
      index: documents.map((d) => ({ _id: d.id, name: d.name })),
      contents: documents,
      getDocument: vi.fn(async (docId) => documents.find((d) => d.id === docId) ?? undefined),
    }
    globalThis.game.packs.set(id, packObj)
  }
}

// Expose a convenience aggregate for tests wanting programmatic access
export const foundryTestUtils = {
  setupFoundryMock,
  teardownFoundryMock,
  extendFoundryMock,
  setCombatMock,
  addPacksMock,
}
