/**
 * Swerpg Game System
 * Author:Hervé Darritchon of Behaska
 * Software License: MIT
 * Repository: https://github.com/foundryvtt/swerpg
 */

// Configuration
import { detectDevelopmentMode, SYSTEM } from './module/config/system.mjs'
import SwerpgTalentNode from './module/config/talent-tree.mjs'
import { statusEffects } from './module/config/statuses.mjs'

// Import Modules
import * as applications from './module/applications/_module.mjs'
import * as dice from './module/dice/_module.mjs'
import * as documents from './module/documents/_module.mjs'
import * as models from './module/models/_module.mjs'
import * as hooks from './module/hooks/_module.mjs'
import MotivationCategorySheet from './module/applications/sheets/motivation-category.mjs'
import MotivationSheet from './module/applications/sheets/motivation.mjs'
import DutySheet from './module/applications/sheets/duty.mjs'

// Canvas
import SwerpgRuler from './module/canvas/ruler.mjs'
import SwerpgTalentTree from './module/canvas/talent-tree.mjs'
import SwerpgTokenObject from './module/canvas/token.mjs'
import * as grid from './module/canvas/grid.mjs'

// Helpers
import { handleSocketEvent } from './module/socket.mjs'
import * as chat from './module/chat.mjs'
import Enum from './module/config/enum.mjs'
import { registerSystemSettings } from './module/applications/settings/settings.js'
import { logger } from './module/utils/logger.mjs'

globalThis.SYSTEM = SYSTEM

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

Hooks.once('init', async function () {
  logger.info(`[Init] Initializing Swerpg Game System`)

  // Register System Settings
  registerSystemSettings()

  const swerpg = (globalThis.swerpg = game.system)
  swerpg.CONST = SYSTEM
  // TODO Fix these comments to restore the features.
  // SwerpgTalentNode.defineTree();
  // swerpg.developmentMode = game.data.options.debug;
  swerpg.developmentMode = detectDevelopmentMode()
  // Swerpg.vfxEnabled = !!game.modules.get("foundryvtt-vfx")?.active;

  // Configure logger with development mode
  logger.setDebug(swerpg.developmentMode)

  if (swerpg.developmentMode) {
    logger.info(SYSTEM.ASCII_DEV_MODE)
  } else {
    logger.info(SYSTEM.ASCII)
  }

  // Expose the system API
  swerpg.api = {
    applications,
    canvas: {
      SwerpgTalentTree,
    },
    dice,
    grid,
    models,
    documents,
    logger,
    methods: {
      generateId,
      packageCompendium,
      resetAllActorTalents,
      standardizeItemIds,
      syncTalents,
    },
    talents: {
      SwerpgTalentNode,
      nodes: SwerpgTalentNode.nodes,
    },
    hooks,
  }

  //     /**
  //  * Configurable properties of the system which affect its behavior.
  //  */
  // crucible.CONFIG = {
  //     /**
  //      * Configured setting-specific currency denominations.
  //      * @type {Record{string, CrucibleCurrencyDenomination}
  //      * @see @link{SYSTEM.ACTOR.CURRENCY_DENOMINATIONS}
  //      */
  //     currency: foundry.utils.deepClone(SYSTEM.ACTOR.CURRENCY_DENOMINATIONS),
  //
  //     /**
  //      * Configuration of compendium packs which are used as sources for system workflows.
  //      * @type {Record<string, Set<string>>}
  //      */
  //     packs: {
  //         ancestry: new Set([SYSTEM.COMPENDIUM_PACKS.ancestry]),
  //         background: new Set([SYSTEM.COMPENDIUM_PACKS.background]),
  //         spell: new Set([SYSTEM.COMPENDIUM_PACKS.spell]),
  //         talent: new Set([SYSTEM.COMPENDIUM_PACKS.talent]),
  //     },
  //     /**
  //      * The character creation sheet class which should be registered
  //      * @type {typeof applications.CrucibleHeroCreationSheet}
  //      */
  //     heroCreationSheet: applications.CrucibleHeroCreationSheet,
  //
  //     /**
  //      * The knowledge topics configured for the system.
  //      * @type {Record<string, CrucibleKnowledgeConfig>}
  //      */
  //     knowledge: foundry.utils.deepClone(SYSTEM.SKILL.DEFAULT_KNOWLEDGE),
  //
  //     /**
  //      * The categories a language can belong to.
  //      * @type {Record<string, {label: string}}
  //      */
  //     languageCategories: foundry.utils.deepClone(SYSTEM.ACTOR.LANGUAGE_CATEGORIES),
  //
  //     /**
  //      * The languages a creature can know.
  //      * @type {Record<string, {label: string, category?: string}>}
  //      */
  //     languages: foundry.utils.deepClone(SYSTEM.ACTOR.LANGUAGES)
  // };
  // /** @deprecated */
  // crucible.CONFIG.ancestryPacks = crucible.CONFIG.packs.ancestry;
  //
  // /**
  //  * The primary party of player characters.
  //  * @type {CrucibleActor|null}
  //  */
  // Object.defineProperty(crucible, "party", {
  //     get() {
  //         return party;
  //     }
  // });

  // Actor document configuration
  CONFIG.Actor.documentClass = documents.SwerpgActor
  CONFIG.Actor.dataModels = {
    adversary: models.SwerpgAdversary,
    hero: models.SwerpgHero,
    character: models.SwerpgCharacter,
  }
  foundry.documents.collections.Actors.unregisterSheet('core', foundry.appv1.sheets.ActorSheet)
  foundry.documents.collections.Actors.registerSheet(SYSTEM.id, applications.HeroSheet, {
    types: ['character'],
    label: 'SWERPG.SHEETS.Character',
    makeDefault: true,
  })
  foundry.documents.collections.Actors.registerSheet(SYSTEM.id, applications.CharacterSheet, {
    types: ['character'],
    label: 'SWERPG.SHEETS.Character',
    makeDefault: true,
  })
  foundry.documents.collections.Actors.registerSheet(SYSTEM.id, applications.AdversarySheet, {
    types: ['adversary'],
    label: 'SWERPG.SHEETS.Adversary',
    makeDefault: true,
  })

  // Item document configuration
  CONFIG.Item.documentClass = documents.SwerpgItem
  CONFIG.Item.dataModels = {
    ancestry: models.SwerpgAncestry,
    archetype: models.SwerpgArchetype,
    armor: models.SwerpgArmor,
    gear: models.SwerpgGear,
    origin: models.SwerpgOrigin,
    background: models.SwerpgBackground,
    species: models.SwerpgSpecies,
    career: models.SwerpgCareer,
    obligation: models.SwerpgObligation,
    specialization: models.SwerpgSpecialization,
    spell: models.SwerpgSpell,
    talent: models.SwerpgTalent,
    taxonomy: models.SwerpgTaxonomy,
    weapon: models.SwerpgWeapon,
    'motivation-category': models.SwerpgMotivationCategory,
    motivation: models.SwerpgMotivation,
    duty: models.SwerpgDuty,
  }

  foundry.documents.collections.Items.unregisterSheet('core', foundry.appv1.sheets.ItemSheet)
  // V2 Registrations
  foundry.applications.apps.DocumentSheetConfig.registerSheet(Item, 'swerpg', applications.ArmorSheet, {
    types: ['armor'],
    label: 'SWERPG.SHEETS.Armor',
    makeDefault: true,
  })

  // V1 Registrations
  foundry.documents.collections.Items.registerSheet(SYSTEM.id, applications.AncestrySheet, {
    types: ['ancestry'],
    label: 'SWERPG.SHEETS.Ancestry',
    makeDefault: true,
  })
  foundry.documents.collections.Items.registerSheet(SYSTEM.id, applications.ArchetypeSheet, {
    types: ['archetype'],
    label: 'SWERPG.SHEETS.Archetype',
    makeDefault: true,
  })
  foundry.documents.collections.Items.registerSheet(SYSTEM.id, applications.BackgroundSheet, {
    types: ['background'],
    label: 'SWERPG.SHEETS.Background',
    makeDefault: true,
  })
  foundry.documents.collections.Items.registerSheet(SYSTEM.id, applications.GearSheet, {
    types: ['gear'],
    label: 'SWERPG.SHEETS.Gear',
    makeDefault: true,
  })
  foundry.documents.collections.Items.registerSheet(SYSTEM.id, applications.OriginSheet, {
    types: ['origin'],
    label: 'SWERPG.SHEETS.Origin',
    makeDefault: true,
  })
  foundry.documents.collections.Items.registerSheet(SYSTEM.id, applications.SpeciesSheet, {
    types: ['species'],
    label: 'SWERPG.SHEETS.Species',
    makeDefault: true,
  })
  foundry.documents.collections.Items.registerSheet(SYSTEM.id, applications.CareerSheet, {
    types: ['career'],
    label: 'SWERPG.SHEETS.Career',
    makeDefault: true,
  })
  foundry.documents.collections.Items.registerSheet(SYSTEM.id, applications.ObligationSheet, {
    types: ['obligation'],
    label: 'SWERPG.SHEETS.Obligation',
    makeDefault: true,
  })
  foundry.documents.collections.Items.registerSheet(SYSTEM.id, applications.SpecializationSheet, {
    types: ['specialization'],
    label: 'SWERPG.SHEETS.Specialization',
    makeDefault: true,
  })
  foundry.documents.collections.Items.registerSheet(SYSTEM.id, applications.SpellSheet, {
    types: ['spell'],
    label: 'SWERPG.SHEETS.Spell',
    makeDefault: true,
  })
  foundry.documents.collections.Items.registerSheet(SYSTEM.id, applications.TalentSheet, {
    types: ['talent'],
    label: 'SWERPG.SHEETS.Talent',
    makeDefault: true,
  })
  foundry.documents.collections.Items.registerSheet(SYSTEM.id, applications.TaxonomySheet, {
    types: ['taxonomy'],
    label: 'SWERPG.SHEETS.Taxonomy',
    makeDefault: true,
  })
  foundry.documents.collections.Items.registerSheet(SYSTEM.id, applications.WeaponSheet, {
    types: ['weapon'],
    label: 'SWERPG.SHEETS.Weapon',
    makeDefault: true,
  })
  foundry.documents.collections.Items.registerSheet(SYSTEM.id, MotivationCategorySheet, {
    types: ['motivation-category'],
    label: 'SWERPG.SHEETS.MotivationCategory',
    makeDefault: true,
  })
  foundry.documents.collections.Items.registerSheet(SYSTEM.id, DutySheet, {
    types: ['duty'],
    label: 'SWERPG.SHEETS.Duty',
    makeDefault: true,
  })
  foundry.documents.collections.Items.registerSheet(SYSTEM.id, MotivationSheet, {
    types: ['motivation'],
    label: 'SWERPG.SHEETS.Motivation',
    makeDefault: true,
  })

  // Other Document Configuration
  CONFIG.ChatMessage.documentClass = documents.SwerpgChatMessage
  CONFIG.Combat.documentClass = documents.SwerpgCombat
  CONFIG.Combatant.documentClass = documents.SwerpgCombatant
  CONFIG.Token.documentClass = documents.SwerpgToken
  CONFIG.Token.objectClass = SwerpgTokenObject

  // Journal Document Configuration
  Object.assign(CONFIG.JournalEntryPage.dataModels, {
    skill: models.SwerpgSkill,
  })
  foundry.applications.apps.DocumentSheetConfig.registerSheet(JournalEntry, SYSTEM.id, applications.SwerpgJournalSheet, {
    label: 'SWERPG.SHEETS.Journal',
  })
  foundry.applications.apps.DocumentSheetConfig.registerSheet(JournalEntryPage, SYSTEM.id, applications.SkillPageSheet, {
    types: ['skill'],
    makeDefault: true,
    label: 'SKILL.PageSheet',
  })

  // Core Application Overrides
  CONFIG.ui.combat = applications.SwerpgCombatTracker

  // Dice system configuration
  CONFIG.Dice.rolls.push(dice.StandardCheck, dice.AttackRoll)

  // Status Effects
  CONFIG.statusEffects = statusEffects
  CONFIG.specialStatusEffects.BLIND = 'blinded'

  // Canvas Configuration
  CONFIG.Canvas.rulerClass = SwerpgRuler
  CONFIG.Token.hudClass = applications.SwerpgTokenHUD

  /*    // Canvas Configuration
        canvas.configure();*/

  /**
   * Is animation enabled for the system?
   * @type {boolean}
   */
  Object.defineProperty(game.system, 'animationEnabled', {
    value:
      game.settings.get('swerpg', 'actionAnimations') &&
      game.modules.get('sequencer')?.active &&
      ['JB2A_DnD5e', 'jb2a_patreon'].some((id) => game.modules.get(id)?.active),
    writable: false,
    configurable: true,
  })

  // Activate socket handler
  game.socket.on(`system.${SYSTEM.id}`, handleSocketEvent)

  // System Debugging Flags
  CONFIG.debug.talentTree = false
  CONFIG.debug.flanking = false

  // Preload handlebars templates
  await preloadHandlebarsTemplates()

  if (swerpg.developmentMode) registerDevelopmentHooks()
})

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

Handlebars.registerHelper('range', function (start, end) {
  let result = []
  for (let i = start; i <= end; i++) result.push(i)
  return result
})

/* -------------------------------------------- */
/*  Localization                                */
/* -------------------------------------------- */

Hooks.once('i18nInit', function () {
  // Apply localizations
  const toLocalize = [
    'CHARACTERISTICS',
    'ARMOR.CATEGORIES',
    'DAMAGE_CATEGORIES',
    'DEFENSES',
    'RESOURCES',
    'THREAT_LEVELS',
    'SKILLS',
    'SECONDARY_ATTRIBUTES',
    'QUALITY_TIERS',
    'ENCHANTMENT_TIERS',
    'ADVERSARY.TAXONOMY_CATEGORIES',
    'SKILL.CATEGORIES',
    'SKILL.RANKS',
    'WEAPON.SKILLS',
    'WEAPON.QUALITIES',
    'WEAPON.RANGE_CATEGORY',
    'WEAPON.ACTIVATION_TYPE',
  ]
  for (let c of toLocalize) {
    const conf = foundry.utils.getProperty(SYSTEM, c)

    // Special handling for enums
    if (conf instanceof Enum) {
      for (const [k, l] of Object.entries(conf.labels)) conf.labels[k] = game.i18n.localize(l)
      Object.freeze(conf.labels)
      continue
    }

    // Other objects
    for (let [k, v] of Object.entries(conf)) {
      if (v.label) v.label = game.i18n.localize(v.label)
      if (v.abbreviation) v.abbreviation = game.i18n.localize(v.abbreviation)
      if (typeof v === 'string') conf[k] = game.i18n.localize(v)
    }
  }

  // Localize models
  foundry.helpers.Localization.localizeDataModel(models.SwerpgAction)

  // Pre-localize configuration objects
  preLocalizeConfig()

  // Initialize Spellcraft Components
  // TODO Fix these comments
  // models.SwerpgGesture.initialize();
  // models.SwerpgInflection.initialize();
  // models.SwerpgRune.initialize();
})

/* -------------------------------------------- */

/**
 * Perform one-time configuration of system configuration objects.
 */
function preLocalizeConfig() {
  const localizeConfigObject = (obj, keys) => {
    for (let o of Object.values(obj)) {
      for (let k of keys) {
        o[k] = game.i18n.localize(o[k])
      }
    }
  }

  // Statuses
  localizeConfigObject(CONFIG.statusEffects, ['label'])

  // Action Tags
  localizeConfigObject(SYSTEM.DAMAGE_TYPES, ['label', 'abbreviation'])
  localizeConfigObject(SYSTEM.ACTION.TAGS, ['label', 'tooltip'])
  localizeConfigObject(SYSTEM.ACTION.TAG_CATEGORIES, ['label'])
}

/* -------------------------------------------- */
/*  Ready Hooks                                 */
/* -------------------------------------------- */

/**
 * On game setup, configure document data.
 */
Hooks.once('setup', function () {
  // Initialize Skill Data
  models.SwerpgSkill.initialize()

  // Initialize Talent tree data
  SwerpgTalentNode.initialize()

  // Create Talent Tree canvas
  game.system.tree = new SwerpgTalentTree()

  // Activate window listeners
  $('#chat-log').on('mouseenter mouseleave', '.swerpg.action .target-link', chat.onChatTargetLinkHover)
})

/* -------------------------------------------- */

/**
 * On game ready, display the welcome journal if the user has not yet seen it.
 */
Hooks.once('ready', async function () {
  const welcome = game.settings.get('swerpg', 'welcome')
  if (!welcome) {
    const entry = await fromUuid('Compendium.swerpg.rules.JournalEntry.5SgXrAKS2EnqVggJ')
    //entry.sheet.render(true)
    game.settings.set('swerpg', 'welcome', true)
  }
  // FIXME bring this back with a migration version
  // if ( game.user === game.users.activeGM ) await syncTalents();
})

/* -------------------------------------------- */
/*  Rendering Hooks                             */
/* -------------------------------------------- */

Hooks.on('getChatLogEntryContext', chat.addChatMessageContextOptions)
Hooks.on('createChatMessage', chat.onCreateChatMessage)
Hooks.on('renderChatMessage', chat.renderChatMessage)
Hooks.on('targetToken', dice.ActionUseDialog.debounceChangeTarget)
Hooks.on('preDeleteChatMessage', models.SwerpgAction.onDeleteChatMessage)

/**
 * Actions to take when the main game canvas is re-rendered.
 * Re-open the talent tree if it was previously open for a certain Actor.
 */
Hooks.on('canvasReady', () => {
  if (game.system.tree.actor) game.system.tree.open(game.system.tree.actor, { resetView: false })
  for (const token of canvas.tokens.placeables) token.renderFlags.set({ refreshFlanking: true }) // No commit
})

Hooks.on('hotbarDrop', async (bar, data, slot) => {
  if (data.type === 'swerpg.action') {
    const macro = await Macro.create(data.macroData)
    await game.user.assignHotbarMacro(macro, slot)
  }
})

Hooks.on('getSceneControlButtons', (controls) => {
  const flankingTool = {
    name: 'debugFlanking',
    title: 'Visualize Flanking',
    icon: 'fa-solid fa-circles-overlap',
    toggle: true,
    active: false,
  }
  if (game.release.generation >= 13) {
    flankingTool.onChange = (_event, active) => {
      CONFIG.debug.flanking = active
      for (const token of canvas.tokens.controlled) {
        if (active) token._visualizeEngagement(token.engagement)
        else token._clearEngagementVisualization()
      }
    }
    controls.tokens.tools.debugFlanking = flankingTool
  }

  // TODO remove when V12 is no longer supported
  else {
    flankingTool.onClick = (active) => {
      CONFIG.debug.flanking = active
      for (const token of canvas.tokens.controlled) {
        if (active) token._visualizeEngagement(token.engagement)
        else token._clearEngagementVisualization()
      }
    }
    const tokens = controls.find((c) => c.name === 'token')
    tokens.tools.push(flankingTool)
  }
})

/* -------------------------------------------- */
/*  Convenience Functions                       */

/* -------------------------------------------- */
/**
 *
 */
async function preloadHandlebarsTemplates() {
  const templatePaths = [
    // Dice Templates
    `systems/${SYSTEM.id}/templates/dice/partials/action-use-header.hbs`,
    `systems/${SYSTEM.id}/templates/dice/partials/standard-check-roll.hbs`,
    `systems/${SYSTEM.id}/templates/dice/partials/standard-check-details.hbs`,

    // Sheet Templates
    `systems/${SYSTEM.id}/templates/sheets/partials/talent-summary.hbs`,
    `systems/${SYSTEM.id}/templates/sheets/partials/skill-modifier-tag.hbs`,
    `systems/${SYSTEM.id}/templates/sheets/partials/character-skill.hbs`,
  ]
  return foundry.applications.handlebars.loadTemplates(templatePaths)
}

/**
 * Package all documents of a certain type into their appropriate Compendium pack
 * @param {string} documentName
 * @param {string} packName
 * @param {Folder|string} folder
 * @returns {Promise<void>}
 */
async function packageCompendium(documentName, packName, folder) {
  const pack = game.packs.get(`swerpg.${packName}`)
  if (typeof folder === 'string') {
    folder = game.folders.find((f) => f.type === documentName && f.name === folder)
  }
  if (!(folder instanceof Folder) || folder.type !== documentName) {
    throw new Error('Invalid folder provided to the packageCompendium method')
  }

  // Unlock the pack for editing
  await pack.configure({ locked: false })

  // Delete all existing documents in the pack
  const cls = getDocumentClass(documentName)
  await pack.getDocuments()
  await cls.deleteDocuments([], { pack: pack.collection, deleteAll: true })
  await Folder.deleteDocuments(Array.from(pack.folders.keys()), { pack: pack.collection })

  // Export all children of the target folder
  await folder.exportToCompendium(pack, { keepId: true, keepFolders: true })

  // Re-lock the pack
  await pack.configure({ locked: true })
}

/* -------------------------------------------- */

/**
 * Generate a Swerpg-standardized document ID given a provided string title.
 * @param {string} title      An input string title
 * @param {number} [length]   A maximum ID length
 * @returns {string}          A standardized camel-case ID
 */
function generateId(title, length) {
  const id = title
    .split(' ')
    .map((w, i) => {
      const p = w.slugify({ replacement: '', strict: true })
      return i ? p.titleCase() : p
    })
    .join('')
  return Number.isNumeric(length) ? id.slice(0, length).padEnd(length, '0') : id
}

/* -------------------------------------------- */

/**
 * Standardize all World item IDs
 * @returns {Promise<void>}
 */
async function standardizeItemIds() {
  const creations = []
  const deletions = []
  for (const item of game.items) {
    const standardId = generateId(item.name, 16)
    if (item.id === standardId) continue
    if (game.items.has(standardId)) throw new Error(`Standardized system ID ${standardId} is already in use`)
    deletions.push(item.id)
    creations.push(Object.assign(item.toObject(), { _id: standardId }))
  }
  await Item.deleteDocuments(deletions)
  await Item.createDocuments(creations, { keepId: true })
}

/**
 *
 */
function registerDevelopmentHooks() {
  Hooks.on('preCreateItem', (item, data, options, user) => {
    if (!item.parent && !item.id) {
      item.updateSource({ _id: generateId(item.name, 16) })
      options.keepId = true
    }
  })

  Hooks.on('updateItem', async (item, change, options, user) => {
    const talentPacks = [SYSTEM.COMPENDIUM_PACKS.talent, SYSTEM.COMPENDIUM_PACKS.talentExtensions]
    if (!talentPacks.includes(item.pack)) return
    await SwerpgTalentNode.initialize()
    game.system.tree.refresh()
  })
}

/* -------------------------------------------- */

/**
 * Sync talent data across all actors in the world if their synchronized version is stale.
 * @param {boolean} [force]   Force syncing even if the actor stats are current
 * @returns {Promise<void>}
 */
async function syncTalents(force = false) {
  logger.groupCollapsed('Swerpg | Talent Data Synchronization')
  const total = game.actors.size
  let n = 0
  let synced = 0
  for (const actor of game.actors) {
    n++
    if (force || foundry.utils.isNewerVersion(game.system.version, actor._stats.systemVersion)) {
      try {
        await actor.syncTalents()
        logger.info(`Swerpg | Synchronized talents for Actor "${actor.name}"`)
        synced++
      } catch (err) {
        logger.warn(`Swerpg | Talent synchronization failed for Actor "${actor.name}": ${err.message}`)
      }
      SceneNavigation.displayProgressBar({ label: 'Synchronizing Talent Data', pct: Math.round((n * 100) / total) })
    }
  }
  if (synced) SceneNavigation.displayProgressBar({ label: 'Synchronizing Talent Data', pct: 100 })
  logger.info(`Swerpg | Complete talent synchronization for ${synced} Actors`)
  logger.groupEnd()
}

/* -------------------------------------------- */

/**
 *
 */
async function resetAllActorTalents() {
  for (const actor of game.actors) {
    const deleteIds = []
    for (const item of actor.items) {
      if (item.type !== 'talent') continue
      if (actor.system.details.ancestry?.talents?.has(item.id)) continue
      if (actor.system.details.origin?.talents?.has(item.id)) continue
      if (actor.system.details.background?.talents?.has(item.id)) continue
      if (actor.system.details.archetype?.talents?.has(item.id)) continue
      if (actor.system.details.species?.talents?.has(item.id)) continue
      if (actor.system.details.taxonomy?.talents?.has(item.id)) continue
      deleteIds.add(item.id)
    }
    await actor.deleteEmbeddedDocuments('Item', deleteIds)
  }
}

/* -------------------------------------------- */
/*  ESModules API                               */
/* -------------------------------------------- */

export { SYSTEM } from './module/config/system.mjs'
export * as applications from './module/applications/_module.mjs'
export * as dice from './module/dice/_module.mjs'
export * as documents from './module/documents/_module.mjs'
export * as models from './module/models/_module.mjs'
export * as chat from './module/chat.mjs'
