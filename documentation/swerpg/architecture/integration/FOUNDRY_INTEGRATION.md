# Foundry Integration Patterns - Standards et Bonnes Pratiques

## 🎯 Vue d'ensemble

Ce document définit les patterns d'intégration spécifiques à Foundry VTT v13+ utilisés dans swerpg, garantissant une compatibilité optimale et des performances élevées.

## 🏗️ ApplicationV2 + Handlebars Pattern

### Structure de Base

```javascript
export class SwerpgBaseActorSheet extends api.HandlebarsApplicationMixin(sheets.ActorSheetV2) {
    
    /** @override */
    static DEFAULT_OPTIONS = {
        classes: ["swerpg", "actor", "sheet"],
        position: { 
            width: 720, 
            height: 800,
            top: 100,
            left: 200
        },
        window: {
            title: "SWERPG.ActorSheet.Title",
            icon: "fas fa-user",
            minimizable: true,
            resizable: true
        },
        actions: {
            rollSkill: SwerpgBaseActorSheet._onRollSkill,
            editItem: SwerpgBaseActorSheet._onEditItem,
            deleteItem: SwerpgBaseActorSheet._onDeleteItem
        }
    };
    
    /** @override */
    static PARTS = {
        header: {
            template: "systems/swerpg/templates/sheets/actor/header.hbs"
        },
        tabs: {
            template: "systems/swerpg/templates/sheets/actor/tabs.hbs"
        },
        characteristics: {
            template: "systems/swerpg/templates/sheets/actor/characteristics.hbs"
        },
        skills: {
            template: "systems/swerpg/templates/sheets/actor/skills.hbs"
        },
        talents: {
            template: "systems/swerpg/templates/sheets/actor/talents.hbs"
        },
        equipment: {
            template: "systems/swerpg/templates/sheets/actor/equipment.hbs"
        }
    };
    
    /** @override */
    _configureRenderOptions(options) {
        super._configureRenderOptions(options);
        
        // Configuration dynamique basée sur le type d'acteur
        if (this.document.type === "hero") {
            options.parts = ["header", "tabs", "characteristics", "skills", "talents", "equipment"];
        } else if (this.document.type === "adversary") {
            options.parts = ["header", "characteristics", "skills"];
        }
    }
    
    /** @override */
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        
        // Données de base
        context.actor = this.document;
        context.system = this.document.system;
        context.config = CONFIG.SWERPG;
        
        // Préparation des items organisés
        context.items = this._prepareItems();
        
        // Calculs dérivés
        context.derived = this._prepareDerivedData();
        
        // Enrichissement des descriptions
        context.enrichedDescription = await TextEditor.enrichHTML(
            this.document.system.details?.description || "",
            { async: true }
        );
        
        return context;
    }
    
    _prepareItems() {
        const items = {
            talents: [],
            weapons: [],
            armor: [],
            gear: []
        };
        
        for (const item of this.document.items) {
            items[item.type]?.push({
                ...item,
                enrichedDescription: item.system.description || ""
            });
        }
        
        // Tri par nom
        for (const category of Object.values(items)) {
            category.sort((a, b) => a.name.localeCompare(b.name));
        }
        
        return items;
    }
    
    // Actions handlers
    static async _onRollSkill(event, target) {
        const skillId = target.dataset.skill;
        const actor = this.document;
        
        await actor.rollSkill(skillId, {
            event,
            dialogOptions: { classes: ["swerpg", "skill-dialog"] }
        });
    }
    
    static async _onEditItem(event, target) {
        const itemId = target.dataset.itemId;
        const item = this.document.items.get(itemId);
        
        if (item) {
            await item.sheet.render(true);
        }
    }
    
    static async _onDeleteItem(event, target) {
        const itemId = target.dataset.itemId;
        const item = this.document.items.get(itemId);
        
        if (item) {
            const confirmed = await Dialog.confirm({
                title: game.i18n.localize("SWERPG.Dialog.DeleteItem.Title"),
                content: game.i18n.format("SWERPG.Dialog.DeleteItem.Content", {
                    name: item.name
                })
            });
            
            if (confirmed) {
                await item.delete();
            }
        }
    }
}
```

## 🎲 Dice Integration Pattern

### SwerpgDiceRoll Extension

```javascript
export class SwerpgDiceRoll extends Roll {
    constructor(formula, data = {}, options = {}) {
        // Conversion des dés narratifs vers standard Foundry
        const convertedFormula = SwerpgDiceRoll._convertNarrativeDice(formula);
        
        super(convertedFormula, data, options);
        
        // Stockage des données narratives
        this.narrativeData = {
            success: 0,
            advantage: 0,
            triumph: 0,
            failure: 0,
            threat: 0,
            despair: 0
        };
    }
    
    static _convertNarrativeDice(formula) {
        // Conversion des dés swerpg vers dés Foundry
        return formula
            .replace(/(\d+)dA/g, '$1d8') // Ability dice
            .replace(/(\d+)dP/g, '$1d12') // Proficiency dice
            .replace(/(\d+)dB/g, '$1d6') // Boost dice
            .replace(/(\d+)dS/g, '$1d6') // Setback dice
            .replace(/(\d+)dD/g, '$1d8') // Difficulty dice
            .replace(/(\d+)dC/g, '$1d12'); // Challenge dice
    }
    
    /** @override */
    async evaluate(options = {}) {
        await super.evaluate(options);
        
        // Calcul des résultats narratifs
        this._calculateNarrativeResults();
        
        return this;
    }
    
    _calculateNarrativeResults() {
        for (const term of this.terms) {
            if (term instanceof Die) {
                this._processDieTerm(term);
            }
        }
        
        // Calcul du résultat final
        this.narrativeData.netSuccess = this.narrativeData.success - this.narrativeData.failure;
        this.narrativeData.netAdvantage = this.narrativeData.advantage - this.narrativeData.threat;
    }
    
    _processDieTerm(term) {
        // Mapping des résultats selon le type de dé
        const diceMapping = CONFIG.SWERPG.DICE.RESULTS_MAPPING;
        
        for (const result of term.results) {
            const symbols = diceMapping[term.faces]?.[result.result];
            if (symbols) {
                this._addSymbols(symbols);
            }
        }
    }
    
    /** @override */
    async toMessage(messageData = {}, options = {}) {
        // Préparation du message avec résultats narratifs
        messageData.flags = foundry.utils.mergeObject(messageData.flags || {}, {
            "swerpg.narrative": this.narrativeData
        });
        
        // Template personnalisé pour l'affichage
        messageData.template = "systems/swerpg/templates/dice/roll-message.hbs";
        
        return super.toMessage(messageData, options);
    }
}
```

## 🎨 Canvas Integration Pattern

### SwerpgTalentTree Canvas Layer

```javascript
export class SwerpgTalentTreeLayer extends CanvasLayer {
    constructor() {
        super();
        
        this.nodes = new Map();
        this.connections = [];
    }
    
    /** @override */
    static get layerOptions() {
        return foundry.utils.mergeObject(super.layerOptions, {
            name: "swerpgTalentTree",
            zIndex: 220
        });
    }
    
    /** @override */
    async _draw(options) {
        await super._draw(options);
        
        // Création du container principal
        this.talentContainer = this.addChild(new PIXI.Container());
        
        // Chargement des données d'arbre de talents
        await this._loadTalentTreeData();
        
        // Rendu des nœuds et connexions
        this._renderNodes();
        this._renderConnections();
    }
    
    async _loadTalentTreeData() {
        const actor = canvas.tokens.controlled[0]?.actor;
        if (!actor) return;
        
        this.treeData = await actor.getTalentTreeData();
    }
    
    _renderNodes() {
        for (const [nodeId, nodeData] of Object.entries(this.treeData.nodes)) {
            const node = new SwerpgTalentNode(nodeData);
            
            // Position sur le canvas
            node.x = nodeData.position.x * 100;
            node.y = nodeData.position.y * 100;
            
            this.talentContainer.addChild(node);
            this.nodes.set(nodeId, node);
        }
    }
    
    _renderConnections() {
        const graphics = new PIXI.Graphics();
        
        for (const connection of this.treeData.connections) {
            const fromNode = this.nodes.get(connection.from);
            const toNode = this.nodes.get(connection.to);
            
            if (fromNode && toNode) {
                graphics.lineStyle(2, 0x666666, 0.8);
                graphics.moveTo(fromNode.x, fromNode.y);
                graphics.lineTo(toNode.x, toNode.y);
            }
        }
        
        this.talentContainer.addChild(graphics);
    }
    
    /** @override */
    _onClickLeft(event) {
        const position = event.data.getLocalPosition(this.talentContainer);
        const node = this._getNodeAtPosition(position);
        
        if (node) {
            this._onNodeClick(node);
        }
    }
    
    async _onNodeClick(node) {
        const actor = canvas.tokens.controlled[0]?.actor;
        if (!actor) return;
        
        if (node.isAvailable && !node.isPurchased) {
            await this._showPurchaseDialog(node, actor);
        } else if (node.isPurchased) {
            await this._showTalentDetails(node);
        }
    }
}
```

## 🔧 Hooks Integration Pattern

### System Hooks

```javascript
// Hook registration dans swerpg.mjs
export function registerHooks() {
    
    // Init hook - Configuration système
    Hooks.once('init', async () => {
        console.log("SWERPG | Initializing Star Wars Edge RPG System");
        
        // Configuration globale
        globalThis.SYSTEM = SYSTEM;
        game.system.swerpg = {
            CONST: SYSTEM.CONST,
            CONFIG: foundry.utils.deepClone(SYSTEM.CONST),
            api: swerpg.api
        };
        
        // Registration des modèles
        CONFIG.Actor.dataModels.hero = SwerpgHeroData;
        CONFIG.Actor.dataModels.adversary = SwerpgAdversaryData;
        
        CONFIG.Item.dataModels.talent = SwerpgTalentData;
        CONFIG.Item.dataModels.weapon = SwerpgWeaponData;
        
        // Registration des sheets
        Actors.registerSheet("swerpg", SwerpgHeroSheet, {
            types: ["hero"],
            makeDefault: true
        });
        
        // Settings registration
        registerSystemSettings();
    });
    
    // Ready hook - Finalisation
    Hooks.once('ready', async () => {
        console.log("SWERPG | System Ready");
        
        // Migration si nécessaire
        await performMigrations();
        
        // Initialisation des systèmes
        await SwerpgTalentNode.initializeRegistry();
        await loadCompendiumMappings();
    });
    
    // Document hooks
    Hooks.on('createActor', (actor, data, options, userId) => {
        if (game.user.id !== userId) return;
        
        // Configuration par défaut pour nouveaux acteurs
        if (actor.type === "hero") {
            SwerpgActor._setupNewHero(actor);
        }
    });
    
    Hooks.on('updateActor', (actor, changes, options, userId) => {
        // Invalidation du cache de talents
        if (changes.system?.characteristics) {
            actor.talentCache?.clear();
        }
    });
    
    // Combat hooks
    Hooks.on('combatStart', (combat) => {
        SwerpgCombat._onCombatStart(combat);
    });
    
    Hooks.on('combatTurn', (combat, updateData, options) => {
        SwerpgCombat._onCombatTurn(combat, updateData);
    });
    
    // Chat hooks
    Hooks.on('renderChatMessage', (message, html, data) => {
        SwerpgChatMessage._onRenderChatMessage(message, html, data);
    });
}

// Settings registration
function registerSystemSettings() {
    // Dice display mode
    game.settings.register('swerpg', 'diceDisplayMode', {
        name: "SWERPG.Settings.DiceDisplayMode.Name",
        hint: "SWERPG.Settings.DiceDisplayMode.Hint",
        scope: "client",
        config: true,
        type: String,
        choices: {
            "symbols": "SWERPG.DiceDisplay.Symbols",
            "text": "SWERPG.DiceDisplay.Text",
            "icons": "SWERPG.DiceDisplay.Icons"
        },
        default: "symbols",
        onChange: (value) => {
            swerpg.CONFIG.DICE.DISPLAY_MODE = value;
        }
    });
    
    // Auto-roll damage
    game.settings.register('swerpg', 'autoRollDamage', {
        name: "SWERPG.Settings.AutoRollDamage.Name",
        hint: "SWERPG.Settings.AutoRollDamage.Hint",
        scope: "world",
        config: true,
        type: Boolean,
        default: false
    });
}
```

## 🔌 Socket Integration Pattern

### Real-time Communication

```javascript
export class SwerpgSocket {
    static initialize() {
        game.socket.on("system.swerpg", SwerpgSocket._onSocketMessage);
    }
    
    static async _onSocketMessage(data) {
        const { type, payload, sender } = data;
        
        switch (type) {
            case "updateDestinyPool":
                return SwerpgSocket._handleDestinyPoolUpdate(payload);
                
            case "talentActivation":
                return SwerpgSocket._handleTalentActivation(payload, sender);
                
            case "forcePointSpent":
                return SwerpgSocket._handleForcePointSpent(payload, sender);
                
            default:
                console.warn(`SWERPG | Unknown socket message type: ${type}`);
        }
    }
    
    static async emit(type, payload) {
        const data = {
            type,
            payload,
            sender: game.user.id,
            timestamp: Date.now()
        };
        
        return game.socket.emit("system.swerpg", data);
    }
    
    static async _handleDestinyPoolUpdate(payload) {
        const { lightSide, darkSide } = payload;
        
        // Mise à jour locale du pool de destinée
        game.settings.set("swerpg", "destinyPool", {
            lightSide,
            darkSide
        });
        
        // Notification visuelle
        ui.notifications.info(
            game.i18n.localize("SWERPG.DestinyPool.Updated")
        );
        
        // Mise à jour de l'UI
        Hooks.call("swerpg.destinyPoolChanged", { lightSide, darkSide });
    }
    
    static async _handleTalentActivation(payload, senderId) {
        const { actorId, talentId, context } = payload;
        
        const actor = game.actors.get(actorId);
        const talent = actor?.items.get(talentId);
        
        if (!talent) return;
        
        // Traitement de l'activation pour les autres clients
        await talent.processActivationEffects(context, { remote: true });
        
        // Message de chat pour l'activation
        await SwerpgChatMessage.createTalentActivationMessage({
            actor,
            talent,
            user: game.users.get(senderId)
        });
    }
}
```

## 🎯 Document Workflow Integration

### Document Creation Flow

```javascript
export class SwerpgActor extends Actor {
    
    /** @override */
    async _preCreate(data, options, user) {
        await super._preCreate(data, options, user);
        
        // Configuration par défaut selon le type
        const updateData = {};
        
        if (this.type === "hero") {
            updateData.prototypeToken = {
                vision: true,
                dimSight: 30,
                brightSight: 0,
                actorLink: true,
                disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY
            };
        } else if (this.type === "adversary") {
            updateData.prototypeToken = {
                vision: false,
                actorLink: false,
                disposition: CONST.TOKEN_DISPOSITIONS.HOSTILE
            };
        }
        
        this.updateSource(updateData);
    }
    
    /** @override */
    async _onCreate(data, options, userId) {
        await super._onCreate(data, options, userId);
        
        if (game.user.id === userId && this.type === "hero") {
            // Création des compétences par défaut
            await this._createDefaultSkills();
            
            // Ajout d'obligations par défaut
            await this._createDefaultObligations();
        }
    }
    
    async _createDefaultSkills() {
        const skillItems = [];
        
        for (const [skillId, skillData] of Object.entries(CONFIG.SWERPG.SKILLS)) {
            const itemData = {
                name: game.i18n.localize(skillData.label),
                type: "skill",
                system: {
                    skillId: skillId,
                    characteristic: skillData.characteristic,
                    rank: 0,
                    career: false
                }
            };
            
            skillItems.push(itemData);
        }
        
        await this.createEmbeddedDocuments("Item", skillItems);
    }
    
    /** @override */
    async _preUpdate(changed, options, user) {
        await super._preUpdate(changed, options, user);
        
        // Validation des changements de caractéristiques
        if (changed.system?.characteristics) {
            this._validateCharacteristics(changed.system.characteristics);
        }
        
        // Recalcul automatique des dérivées
        if (changed.system?.characteristics || changed.system?.derived) {
            this._flagForRecalculation();
        }
    }
    
    _validateCharacteristics(characteristics) {
        for (const [key, value] of Object.entries(characteristics)) {
            if (typeof value !== "number" || value < 1 || value > 6) {
                throw new Error(`Invalid characteristic value for ${key}: ${value}`);
            }
        }
    }
}
```

## 🎭 Performance Optimization Patterns

### Lazy Loading

```javascript
export class SwerpgCompendiumManager {
    static cache = new Map();
    
    static async getCompendiumData(packId, options = {}) {
        const cacheKey = `${packId}_${JSON.stringify(options)}`;
        
        if (this.cache.has(cacheKey) && !options.force) {
            return this.cache.get(cacheKey);
        }
        
        const pack = game.packs.get(SYSTEM.COMPENDIUM_PACKS[packId]);
        if (!pack) {
            console.warn(`SWERPG | Compendium pack '${packId}' not found`);
            return [];
        }
        
        const documents = await pack.getDocuments();
        
        // Filtrage si nécessaire
        let filteredData = documents;
        if (options.filter) {
            filteredData = documents.filter(options.filter);
        }
        
        // Mise en cache
        this.cache.set(cacheKey, filteredData);
        
        return filteredData;
    }
    
    static clearCache(packId) {
        if (packId) {
            // Suppression ciblée
            for (const key of this.cache.keys()) {
                if (key.startsWith(packId)) {
                    this.cache.delete(key);
                }
            }
        } else {
            // Suppression complète
            this.cache.clear();
        }
    }
}
```

### Debounced Updates

```javascript
export class SwerpgActor extends Actor {
    constructor(...args) {
        super(...args);
        
        // Debounce des recalculs coûteux
        this._debouncedRecalculate = foundry.utils.debounce(
            this._recalculateDerived.bind(this),
            100
        );
    }
    
    _flagForRecalculation() {
        this._needsRecalculation = true;
        this._debouncedRecalculate();
    }
    
    async _recalculateDerived() {
        if (!this._needsRecalculation) return;
        
        const updateData = {};
        
        // Calculs des attributs dérivés
        updateData["system.derived.wounds.max"] = 
            this.system.characteristics.brawn + 10;
        updateData["system.derived.strain.max"] = 
            this.system.characteristics.willpower + 10;
        
        await this.update(updateData);
        this._needsRecalculation = false;
    }
}
```

---

> 📖 **Voir aussi** : [Performance Optimization](./PERFORMANCE.md) | [Security Guidelines](./SECURITY.md)