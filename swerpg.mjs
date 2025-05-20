/**
 * Swerpg Game System
 * Author: Atropos of Foundry Virtual Tabletop
 * Software License: MIT
 * Repository: https://github.com/foundryvtt/swerpg
 */

// Configuration
import {SYSTEM} from "./module/config/system.mjs";
import SwerpgTalentNode from "./module/config/talent-tree.mjs";
import {statusEffects} from "./module/config/statuses.mjs";

// Import Modules
import * as applications from "./module/applications/_module.mjs";
import * as dice from "./module/dice/_module.mjs";
import * as documents from "./module/documents/_module.mjs";
import * as models from "./module/models/_module.mjs";

// Canvas
import SwerpgRuler from "./module/canvas/ruler.mjs";
import SwerpgTalentTree from "./module/canvas/talent-tree.mjs";
import SwerpgTokenObject from "./module/canvas/token.mjs";
import * as grid from "./module/canvas/grid.mjs";

// Helpers
import {handleSocketEvent} from "./module/socket.mjs";
import * as chat from "./module/chat.mjs";
import Enum from "./module/config/enum.mjs";
import {registerSystemSettings} from "./module/applications/settings/settings.js";

globalThis.SYSTEM = SYSTEM;

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

const DEVELOPMENT_MODE = true;

Hooks.once("init", async function () {
    console.log(`Initializing Swerpg Game System`);

    // Register System Settings
    registerSystemSettings();

    globalThis.swerpg = game.system;
    game.system.CONST = SYSTEM;

    SYSTEM.DEV_MODE = game.settings.get("swerpg", "devMode");

    if (SYSTEM.DEV_MODE) {
        console.info(SYSTEM.ASCII_DEV_MODE);
    } else {
        console.info(SYSTEM.ASCII)
    }

    //TODO Fix these comments to restore the features.
    SwerpgTalentNode.defineTree();

    // Expose the system API
    game.system.api = {
        applications,
        canvas: {
            SwerpgTalentTree
        },
        dice,
        grid,
        models,
        documents,
        methods: {
            generateId,
            packageCompendium,
            resetAllActorTalents,
            standardizeItemIds,
            syncTalents
        },
        talents: {
            SwerpgTalentNode,
            nodes: SwerpgTalentNode.nodes
        }
    }

    // Actor document configuration
    CONFIG.Actor.documentClass = documents.SwerpgActor;
    CONFIG.Actor.dataModels = {
        adversary: models.SwerpgAdversary,
        hero: models.SwerpgHero,
        character: models.SwerpgCharacter
    };
    foundry.documents.collections.Actors.unregisterSheet("core", foundry.appv1.sheets.ActorSheet);
    foundry.documents.collections.Actors.registerSheet(SYSTEM.id, applications.HeroSheet, {
        types: ["character"],
        makeDefault: true
    });
    foundry.documents.collections.Actors.registerSheet(SYSTEM.id, applications.CharacterSheet, {
        types: ["character"],
        makeDefault: true
    });
    foundry.documents.collections.Actors.registerSheet(SYSTEM.id, applications.AdversarySheet, {
        types: ["adversary"],
        makeDefault: true
    });

    // Item document configuration
    CONFIG.Item.documentClass = documents.SwerpgItem;
    CONFIG.Item.dataModels = {
        ancestry: models.SwerpgAncestry,
        archetype: models.SwerpgArchetype,
        armor: models.SwerpgArmor,
        origin: models.SwerpgOrigin,
        background: models.SwerpgBackground,
        species: models.SwerpgSpecies,
        career: models.SwerpgCareer,
        specialization: models.SwerpgSpecialization,
        spell: models.SwerpgSpell,
        talent: models.SwerpgTalent,
        taxonomy: models.SwerpgTaxonomy,
        weapon: models.SwerpgWeapon
    };
    foundry.documents.collections.Items.unregisterSheet("core", foundry.appv1.sheets.ItemSheet);

    // V2 Registrations
    foundry.applications.apps.DocumentSheetConfig.registerSheet(Item, "swerpg", applications.ArmorSheet, {
        types: ["armor"],
        makeDefault: true,
        label: "SWERPG.SHEETS.Armor"
    });

    // V1 Registrations
    foundry.documents.collections.Items.registerSheet(SYSTEM.id, applications.AncestrySheet, {
        types: ["ancestry"],
        makeDefault: true
    });
    foundry.documents.collections.Items.registerSheet(SYSTEM.id, applications.ArchetypeSheet, {
        types: ["archetype"],
        makeDefault: true
    });
    foundry.documents.collections.Items.registerSheet(SYSTEM.id, applications.BackgroundSheet, {
        types: ["background"],
        makeDefault: true
    });
    foundry.documents.collections.Items.registerSheet(SYSTEM.id, applications.OriginSheet, {
        types: ["origin"],
        makeDefault: true
    });
    foundry.documents.collections.Items.registerSheet(SYSTEM.id, applications.SpeciesSheet, {
        types: ["species"],
        makeDefault: true
    });
    foundry.documents.collections.Items.registerSheet(SYSTEM.id, applications.CareerSheet, {
        types: ["career"],
        makeDefault: true
    });
    foundry.documents.collections.Items.registerSheet(SYSTEM.id, applications.SpecializationSheet, {
        types: ["specialization"],
        makeDefault: true
    });
    foundry.documents.collections.Items.registerSheet(SYSTEM.id, applications.SpellSheet, {
        types: ["spell"],
        makeDefault: true
    });
    foundry.documents.collections.Items.registerSheet(SYSTEM.id, applications.TalentSheet, {
        types: ["talent"],
        makeDefault: true
    });
    foundry.documents.collections.Items.registerSheet(SYSTEM.id, applications.TaxonomySheet, {
        types: ["taxonomy"],
        makeDefault: true
    });
    foundry.documents.collections.Items.registerSheet(SYSTEM.id, applications.WeaponSheet, {
        types: ["weapon"],
        makeDefault: true
    });

    // Other Document Configuration
    CONFIG.ChatMessage.documentClass = documents.SwerpgChatMessage;
    CONFIG.Combat.documentClass = documents.SwerpgCombat;
    CONFIG.Combatant.documentClass = documents.SwerpgCombatant;
    CONFIG.Scene.documentClass = documents.SwerpgScene;
    CONFIG.Token.documentClass = documents.SwerpgToken;
    CONFIG.Token.objectClass = SwerpgTokenObject;

    // Journal Document Configuration
    Object.assign(CONFIG.JournalEntryPage.dataModels, {
        "skill": models.SwerpgSkill
    });
    foundry.applications.apps.DocumentSheetConfig.registerSheet(JournalEntry, SYSTEM.id, applications.SwerpgJournalSheet, {
        label: "SWERPG.SHEETS.Journal"
    })
    foundry.applications.apps.DocumentSheetConfig.registerSheet(JournalEntryPage, SYSTEM.id, applications.SkillPageSheet, {
        types: ["skill"],
        makeDefault: true,
        label: "SKILL.PageSheet"
    });

    // Core Application Overrides
    CONFIG.ui.combat = applications.SwerpgCombatTracker;

    // Dice system configuration
    CONFIG.Dice.rolls.push(dice.StandardCheck, dice.AttackRoll);

    // Status Effects
    CONFIG.statusEffects = statusEffects;
    CONFIG.specialStatusEffects.BLIND = "blinded";

    // Canvas Configuration
    CONFIG.Canvas.rulerClass = SwerpgRuler;
    CONFIG.Token.hudClass = applications.SwerpgTokenHUD;

    /**
     * Is animation enabled for the system?
     * @type {boolean}
     */
    Object.defineProperty(game.system, "animationEnabled", {
        value: game.settings.get("swerpg", "actionAnimations")
            && game.modules.get("sequencer")?.active
            && ["JB2A_DnD5e", "jb2a_patreon"].some(id => game.modules.get(id)?.active),
        writable: false,
        configurable: true
    });

    // Activate socket handler
    game.socket.on(`system.${SYSTEM.id}`, handleSocketEvent);

    // System Debugging Flags
    CONFIG.debug.talentTree = false;
    CONFIG.debug.flanking = false;

    // preload handlebars templates
    await preloadHandlebarsTemplates();

    if (DEVELOPMENT_MODE) registerDevelopmentHooks();
});

/* -------------------------------------------- */
/*  Localization                                */
/* -------------------------------------------- */

Hooks.once("i18nInit", function () {

    // Apply localizations
    const toLocalize = [
        "CHARACTERISTICS", "ARMOR.CATEGORIES", "ARMOR.PROPERTIES", "DAMAGE_CATEGORIES", "DEFENSES",
        "RESOURCES", "THREAT_LEVELS",
        "SKILLS", "SECONDARY_ATTRIBUTES",
        "QUALITY_TIERS", "ENCHANTMENT_TIERS",
        "ADVERSARY.TAXONOMY_CATEGORIES",
        "SKILL.CATEGORIES", "SKILL.RANKS",
        "WEAPON.CATEGORIES", "WEAPON.PROPERTIES", "WEAPON.SLOTS",
    ];
    for (let c of toLocalize) {
        const conf = foundry.utils.getProperty(SYSTEM, c);

        // Special handling for enums
        if (conf instanceof Enum) {
            for (const [k, l] of Object.entries(conf.labels)) conf.labels[k] = game.i18n.localize(l);
            Object.freeze(conf.labels);
            continue;
        }

        // Other objects
        for (let [k, v] of Object.entries(conf)) {
            if (v.label) v.label = game.i18n.localize(v.label);
            if (v.abbreviation) v.abbreviation = game.i18n.localize(v.abbreviation);
            if (typeof v === "string") conf[k] = game.i18n.localize(v);
        }
    }

    // Localize models
    foundry.helpers.Localization.localizeDataModel(models.SwerpgAction)

    // Pre-localize configuration objects
    preLocalizeConfig();

    // Initialize Spellcraft Components
    // TODO Fix these comments
    //models.SwerpgGesture.initialize();
    //models.SwerpgInflection.initialize();
    //models.SwerpgRune.initialize();

});

/* -------------------------------------------- */

/**
 * Perform one-time configuration of system configuration objects.
 */
function preLocalizeConfig() {
    const localizeConfigObject = (obj, keys) => {
        for (let o of Object.values(obj)) {
            for (let k of keys) {
                o[k] = game.i18n.localize(o[k]);
            }
        }
    }

    // Statuses
    localizeConfigObject(CONFIG.statusEffects, ["label"]);

    // Action Tags
    localizeConfigObject(SYSTEM.DAMAGE_TYPES, ["label", "abbreviation"]);
    localizeConfigObject(SYSTEM.ACTION.TAGS, ["label", "tooltip"]);
    localizeConfigObject(SYSTEM.ACTION.TAG_CATEGORIES, ["label"]);
}

/* -------------------------------------------- */
/*  Ready Hooks                                 */
/* -------------------------------------------- */

/**
 * On game setup, configure document data.
 */
Hooks.once("setup", function () {

    // Initialize Skill Data
    models.SwerpgSkill.initialize();

    // Initialize Talent tree data
    SwerpgTalentNode.initialize();

    // Create Talent Tree canvas
    game.system.tree = new SwerpgTalentTree();

    // Activate window listeners
    $("#chat-log").on("mouseenter mouseleave", ".swerpg.action .target-link", chat.onChatTargetLinkHover);
});

/* -------------------------------------------- */

/**
 * On game ready, display the welcome journal if the user has not yet seen it.
 */
Hooks.once("ready", async function () {
    const welcome = game.settings.get("swerpg", "welcome");
    if (!welcome) {
        const entry = await fromUuid("Compendium.swerpg.rules.JournalEntry.5SgXrAKS2EnqVggJ");
        entry.sheet.render(true);
        game.settings.set("swerpg", "welcome", true);
    }
    // FIXME bring this back with a migration version
    // if ( game.user === game.users.activeGM ) await syncTalents();
});


/* -------------------------------------------- */
/*  Rendering Hooks                             */
/* -------------------------------------------- */

Hooks.on("getChatLogEntryContext", chat.addChatMessageContextOptions);
Hooks.on("createChatMessage", chat.onCreateChatMessage);
Hooks.on("renderChatMessage", chat.renderChatMessage);
Hooks.on("targetToken", dice.ActionUseDialog.debounceChangeTarget);
Hooks.on("preDeleteChatMessage", models.SwerpgAction.onDeleteChatMessage);

/**
 * Actions to take when the main game canvas is re-rendered.
 * Re-open the talent tree if it was previously open for a certain Actor.
 */
Hooks.on("canvasReady", () => {
    if (game.system.tree.actor) game.system.tree.open(game.system.tree.actor, {resetView: false});
    for (const token of canvas.tokens.placeables) token.renderFlags.set({refreshFlanking: true}); // No commit
});

Hooks.on("hotbarDrop", async (bar, data, slot) => {
    if (data.type === "swerpg.action") {
        const macro = await Macro.create(data.macroData);
        await game.user.assignHotbarMacro(macro, slot);
    }
});

Hooks.on("getSceneControlButtons", controls => {
    const flankingTool = {
        name: "debugFlanking",
        title: "Visualize Flanking",
        icon: "fa-solid fa-circles-overlap",
        toggle: true,
        active: false
    };
    if (game.release.generation >= 13) {
        flankingTool.onChange = (_event, active) => {
            CONFIG.debug.flanking = active
            for (const token of canvas.tokens.controlled) {
                if (active) token._visualizeEngagement(token.engagement);
                else token._clearEngagementVisualization();
            }
        }
        controls.tokens.tools.debugFlanking = flankingTool;
    }

    // TODO remove when V12 is no longer supported
    else {
        flankingTool.onClick = active => {
            CONFIG.debug.flanking = active
            for (const token of canvas.tokens.controlled) {
                if (active) token._visualizeEngagement(token.engagement);
                else token._clearEngagementVisualization();
            }
        }
        const tokens = controls.find(c => c.name === "token");
        tokens.tools.push(flankingTool);
    }
});

/* -------------------------------------------- */
/*  Convenience Functions                       */

/* -------------------------------------------- */
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
    ];
    return foundry.applications.handlebars.loadTemplates(templatePaths);
}

/**
 * Package all documents of a certain type into their appropriate Compendium pack
 * @param {string} documentName
 * @param {string} packName
 * @param {Folder|string} folder
 * @returns {Promise<void>}
 */
async function packageCompendium(documentName, packName, folder) {
    const pack = game.packs.get(`swerpg.${packName}`);
    if (typeof folder === "string") {
        folder = game.folders.find(f => (f.type === documentName) && (f.name === folder));
    }
    if (!(folder instanceof Folder) || (folder.type !== documentName)) {
        throw new Error("Invalid folder provided to the packageCompendium method");
    }

    // Unlock the pack for editing
    await pack.configure({locked: false});

    // Delete all existing documents in the pack
    const cls = getDocumentClass(documentName);
    await pack.getDocuments();
    await cls.deleteDocuments([], {pack: pack.collection, deleteAll: true});
    await Folder.deleteDocuments(Array.from(pack.folders.keys()), {pack: pack.collection});

    // Export all children of the target folder
    await folder.exportToCompendium(pack, {keepId: true, keepFolders: true});

    // Re-lock the pack
    await pack.configure({locked: true});
}

/* -------------------------------------------- */

/**
 * Generate a Swerpg-standardized document ID given a provided string title.
 * @param {string} title      An input string title
 * @param {number} [length]   A maximum ID length
 * @returns {string}          A standardized camel-case ID
 */
function generateId(title, length) {
    const id = title.split(" ").map((w, i) => {
        const p = w.slugify({replacement: "", strict: true});
        return i ? p.titleCase() : p;
    }).join("");
    return Number.isNumeric(length) ? id.slice(0, length).padEnd(length, "0") : id;
}

/* -------------------------------------------- */

/**
 * Standardize all World item IDs
 * @returns {Promise<void>}
 */
async function standardizeItemIds() {
    const creations = [];
    const deletions = [];
    for (const item of game.items) {
        const standardId = generateId(item.name, 16);
        if (item.id === standardId) continue;
        if (game.items.has(standardId)) throw new Error(`Standardized system ID ${standardId} is already in use`);
        deletions.push(item.id);
        creations.push(Object.assign(item.toObject(), {_id: standardId}));
    }
    await Item.deleteDocuments(deletions);
    await Item.createDocuments(creations, {keepId: true});
}

function registerDevelopmentHooks() {
    Hooks.on("preCreateItem", (item, data, options, user) => {
        if (!item.parent && !item.id) {
            item.updateSource({_id: generateId(item.name, 16)});
            options.keepId = true;
        }
    });

    Hooks.on("updateItem", async (item, change, options, user) => {
        const talentPacks = [SYSTEM.COMPENDIUM_PACKS.talent, SYSTEM.COMPENDIUM_PACKS.talentExtensions];
        if (!talentPacks.includes(item.pack)) return;
        await SwerpgTalentNode.initialize();
        game.system.tree.refresh();
    })
}

/* -------------------------------------------- */

/**
 * Sync talent data across all actors in the world if their synchronized version is stale.
 * @param {boolean} [force]   Force syncing even if the actor stats are current
 * @returns {Promise<void>}
 */
async function syncTalents(force = false) {
    console.groupCollapsed("Swerpg | Talent Data Synchronization")
    const total = game.actors.size;
    let n = 0;
    let synced = 0;
    for (const actor of game.actors) {
        n++;
        if (force || foundry.utils.isNewerVersion(game.system.version, actor._stats.systemVersion)) {
            try {
                await actor.syncTalents();
                console.log(`Swerpg | Synchronized talents for Actor "${actor.name}"`);
                synced++;
            } catch (err) {
                console.warn(`Swerpg | Talent synchronization failed for Actor "${actor.name}": ${err.message}`);
            }
            SceneNavigation.displayProgressBar({label: "Synchronizing Talent Data", pct: Math.round(n * 100 / total)});
        }
    }
    if (synced) SceneNavigation.displayProgressBar({label: "Synchronizing Talent Data", pct: 100});
    console.log(`Swerpg | Complete talent synchronization for ${synced} Actors`);
    console.groupEnd();
}

/* -------------------------------------------- */

async function resetAllActorTalents() {
    for (const actor of game.actors) {
        const deleteIds = [];
        for (const item of actor.items) {
            if (item.type !== "talent") continue;
            if (actor.system.details.ancestry?.talents?.has(item.id)) continue;
            if (actor.system.details.origin?.talents?.has(item.id)) continue;
            if (actor.system.details.background?.talents?.has(item.id)) continue;
            if (actor.system.details.archetype?.talents?.has(item.id)) continue;
            if (actor.system.details.species?.talents?.has(item.id)) continue;
            if (actor.system.details.taxonomy?.talents?.has(item.id)) continue;
            deleteIds.add(item.id);
        }
        await actor.deleteEmbeddedDocuments("Item", deleteIds);
    }
}
