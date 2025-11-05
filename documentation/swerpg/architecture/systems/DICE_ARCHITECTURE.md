# Dice System Architecture - Système de Dés Narratifs

## 🎯 Vue d'ensemble

L'architecture du système de dés narratifs de swerpg traduit la mécanique complexe des dés Edge of the Empire en intégrations natives Foundry VTT, préservant l'esprit narratif tout en optimisant les performances.

## 🎲 Types de Dés et Symboles

### Structure des Dés

```javascript
export const DICE_TYPES = {
    // Dés positifs
    ABILITY: {
        id: "ability",
        faces: 8,
        symbol: "dA",
        color: "#2E8B57", // Vert
        results: {
            1: [],
            2: ["success"],
            3: ["success"],
            4: ["success", "success"],
            5: ["advantage"],
            6: ["advantage"],
            7: ["success", "advantage"],
            8: ["advantage", "advantage"]
        }
    },
    
    PROFICIENCY: {
        id: "proficiency",
        faces: 12,
        symbol: "dP",
        color: "#FFD700", // Or
        results: {
            1: [],
            2: ["success"],
            3: ["success"],
            4: ["success", "success"],
            5: ["success", "success"],
            6: ["advantage"],
            7: ["success", "advantage"],
            8: ["success", "advantage"],
            9: ["success", "advantage"],
            10: ["advantage", "advantage"],
            11: ["advantage", "advantage"],
            12: ["triumph"]
        }
    },
    
    BOOST: {
        id: "boost",
        faces: 6,
        symbol: "dB",
        color: "#87CEEB", // Bleu clair
        results: {
            1: [],
            2: [],
            3: ["success"],
            4: ["success", "advantage"],
            5: ["advantage", "advantage"],
            6: ["advantage"]
        }
    },
    
    // Dés négatifs
    DIFFICULTY: {
        id: "difficulty",
        faces: 8,
        symbol: "dD",
        color: "#8B008B", // Violet
        results: {
            1: [],
            2: ["failure"],
            3: ["failure", "failure"],
            4: ["threat"],
            5: ["threat"],
            6: ["threat"],
            7: ["threat", "threat"],
            8: ["failure", "threat"]
        }
    },
    
    CHALLENGE: {
        id: "challenge",
        faces: 12,
        symbol: "dC",
        color: "#DC143C", // Rouge
        results: {
            1: [],
            2: ["failure"],
            3: ["failure"],
            4: ["failure", "failure"],
            5: ["failure", "failure"],
            6: ["threat"],
            7: ["failure", "threat"],
            8: ["failure", "threat"],
            9: ["threat", "threat"],
            10: ["threat", "threat"],
            11: ["threat", "threat"],
            12: ["despair"]
        }
    },
    
    SETBACK: {
        id: "setback",
        faces: 6,
        symbol: "dS",
        color: "#2F2F2F", // Noir
        results: {
            1: [],
            2: [],
            3: ["failure"],
            4: ["failure"],
            5: ["threat"],
            6: ["threat"]
        }
    }
};
```

## 🎯 SwerpgDicePool - Gestion des Pools

### Construction et Validation

```javascript
export class SwerpgDicePool {
    constructor(options = {}) {
        this.dice = {
            ability: 0,
            proficiency: 0,
            boost: 0,
            difficulty: 0,
            challenge: 0,
            setback: 0
        };
        
        this.modifiers = [];
        this.metadata = {
            characteristic: null,
            skill: null,
            difficulty: "average",
            situation: null
        };
        
        if (options.characteristic && options.skill) {
            this.buildFromCharacteristicSkill(options);
        }
    }
    
    buildFromCharacteristicSkill({ characteristic, skill, difficulty = "average" }) {
        const charValue = characteristic || 0;
        const skillValue = skill || 0;
        
        // Règle de construction : le plus grand détermine le type, le plus petit le nombre
        if (charValue >= skillValue) {
            this.dice.ability = charValue - skillValue;
            this.dice.proficiency = skillValue;
        } else {
            this.dice.ability = 0;
            this.dice.proficiency = charValue;
        }
        
        // Ajout des dés de difficulté
        this.addDifficulty(difficulty);
        
        this.metadata.characteristic = charValue;
        this.metadata.skill = skillValue;
        this.metadata.difficulty = difficulty;
    }
    
    addDifficulty(difficulty) {
        const difficultyMapping = {
            simple: { difficulty: 0, challenge: 0 },
            easy: { difficulty: 1, challenge: 0 },
            average: { difficulty: 2, challenge: 0 },
            hard: { difficulty: 3, challenge: 0 },
            daunting: { difficulty: 4, challenge: 0 },
            formidable: { difficulty: 2, challenge: 3 }
        };
        
        const mapping = difficultyMapping[difficulty];
        if (mapping) {
            this.dice.difficulty = mapping.difficulty;
            this.dice.challenge = mapping.challenge;
        }
    }
    
    // Ajout de modificateurs situationnels
    addBoost(count = 1) {
        this.dice.boost += count;
        return this;
    }
    
    addSetback(count = 1) {
        this.dice.setback += count;
        return this;
    }
    
    // Upgrade : conversion ability → proficiency ou difficulty → challenge
    upgradeAbility(count = 1) {
        const upgrade = Math.min(count, this.dice.ability);
        this.dice.ability -= upgrade;
        this.dice.proficiency += upgrade;
        return this;
    }
    
    upgradeDifficulty(count = 1) {
        const upgrade = Math.min(count, this.dice.difficulty);
        this.dice.difficulty -= upgrade;
        this.dice.challenge += upgrade;
        return this;
    }
    
    // Génération de la formule Foundry
    toFoundryFormula() {
        const parts = [];
        
        Object.entries(this.dice).forEach(([type, count]) => {
            if (count > 0) {
                const diceType = DICE_TYPES[type.toUpperCase()];
                parts.push(`${count}d${diceType.faces}[${type}]`);
            }
        });
        
        return parts.join(" + ") || "1d1"; // Fallback si aucun dé
    }
    
    // Validation du pool
    validate() {
        const errors = [];
        
        // Vérification que le pool n'est pas vide
        const totalDice = Object.values(this.dice).reduce((sum, count) => sum + count, 0);
        if (totalDice === 0) {
            errors.push("SWERPG.DicePool.Error.Empty");
        }
        
        // Limites raisonnables
        Object.entries(this.dice).forEach(([type, count]) => {
            if (count > 10) {
                errors.push(`SWERPG.DicePool.Error.TooMany.${type}`);
            }
        });
        
        return errors;
    }
    
    // Sérialisation pour stockage
    serialize() {
        return {
            dice: foundry.utils.deepClone(this.dice),
            modifiers: foundry.utils.deepClone(this.modifiers),
            metadata: foundry.utils.deepClone(this.metadata)
        };
    }
    
    static deserialize(data) {
        const pool = new SwerpgDicePool();
        pool.dice = data.dice || {};
        pool.modifiers = data.modifiers || [];
        pool.metadata = data.metadata || {};
        return pool;
    }
}
```

## 🎲 SwerpgDiceRoll - Exécution et Résultats

### Extension de Roll pour Dés Narratifs

```javascript
export class SwerpgDiceRoll extends Roll {
    constructor(dicePool, data = {}, options = {}) {
        // Construction de la formule Foundry à partir du pool
        const formula = dicePool.toFoundryFormula();
        
        super(formula, data, options);
        
        // Données spécifiques aux dés narratifs
        this.pool = dicePool;
        this.narrativeResult = {
            success: 0,
            advantage: 0,
            triumph: 0,
            failure: 0,
            threat: 0,
            despair: 0,
            // Résultats nets
            netSuccess: 0,
            netAdvantage: 0
        };
    }
    
    /** @override */
    async evaluate(options = {}) {
        await super.evaluate(options);
        
        // Calcul des symboles narratifs
        this._calculateNarrativeSymbols();
        
        // Application des modificateurs
        this._applyModifiers();
        
        // Calcul des résultats nets
        this._calculateNetResults();
        
        return this;
    }
    
    _calculateNarrativeSymbols() {
        for (const term of this.terms) {
            if (term instanceof Die) {
                this._processDieTerm(term);
            }
        }
    }
    
    _processDieTerm(term) {
        // Identification du type de dé par les faces et le flavor
        const diceType = this._identifyDiceType(term);
        if (!diceType) return;
        
        const diceConfig = DICE_TYPES[diceType];
        
        for (const result of term.results) {
            const symbols = diceConfig.results[result.result];
            if (symbols) {
                this._addSymbols(symbols);
            }
        }
    }
    
    _identifyDiceType(term) {
        // Identification par le flavor du dé
        if (term.options.flavor) {
            return term.options.flavor.toUpperCase();
        }
        
        // Fallback par nombre de faces
        const faceMapping = {
            6: ["BOOST", "SETBACK"],
            8: ["ABILITY", "DIFFICULTY"], 
            12: ["PROFICIENCY", "CHALLENGE"]
        };
        
        return faceMapping[term.faces]?.[0];
    }
    
    _addSymbols(symbols) {
        for (const symbol of symbols) {
            if (this.narrativeResult.hasOwnProperty(symbol)) {
                this.narrativeResult[symbol]++;
            }
        }
    }
    
    _applyModifiers() {
        for (const modifier of this.pool.modifiers) {
            switch (modifier.type) {
                case "success_bonus":
                    this.narrativeResult.success += modifier.value;
                    break;
                case "advantage_bonus":
                    this.narrativeResult.advantage += modifier.value;
                    break;
                // ... autres modificateurs
            }
        }
    }
    
    _calculateNetResults() {
        this.narrativeResult.netSuccess = 
            this.narrativeResult.success - this.narrativeResult.failure;
        this.narrativeResult.netAdvantage = 
            this.narrativeResult.advantage - this.narrativeResult.threat;
    }
    
    // Méthodes d'évaluation du résultat
    get isSuccess() {
        return this.narrativeResult.netSuccess > 0;
    }
    
    get isFailure() {
        return this.narrativeResult.netSuccess < 0;
    }
    
    get hasTriumph() {
        return this.narrativeResult.triumph > 0;
    }
    
    get hasDespair() {
        return this.narrativeResult.despair > 0;
    }
    
    get successLevel() {
        const net = this.narrativeResult.netSuccess;
        if (net >= 4) return "exceptional";
        if (net >= 2) return "good";
        if (net >= 1) return "basic";
        return "failure";
    }
    
    // Interface avec le système de chat
    async toMessage(messageData = {}, options = {}) {
        // Enrichissement des données pour le template
        messageData.flags = foundry.utils.mergeObject(messageData.flags || {}, {
            "swerpg.diceRoll": {
                pool: this.pool.serialize(),
                result: this.narrativeResult,
                isSuccess: this.isSuccess,
                successLevel: this.successLevel
            }
        });
        
        // Template spécialisé
        options.template = "systems/swerpg/templates/dice/roll-message.hbs";
        
        return super.toMessage(messageData, options);
    }
}
```

## 🎭 Dialog de Configuration de Dés

### SwerpgDiceDialog - Interface Utilisateur

```javascript
export class SwerpgDiceDialog extends Dialog {
    constructor(pool, options = {}) {
        const dialogData = {
            title: options.title || "SWERPG.DiceDialog.Title",
            content: "",
            buttons: {
                roll: {
                    icon: '<i class="fas fa-dice"></i>',
                    label: "SWERPG.DiceDialog.Roll",
                    callback: html => this._onRoll(html)
                },
                cancel: {
                    icon: '<i class="fas fa-times"></i>',
                    label: "SWERPG.DiceDialog.Cancel"
                }
            },
            default: "roll",
            render: html => this._onRender(html),
            close: () => this._onClose()
        };
        
        const dialogOptions = {
            classes: ["swerpg", "dice-dialog"],
            width: 500,
            height: "auto",
            ...options
        };
        
        super(dialogData, dialogOptions);
        
        this.pool = pool;
        this.originalPool = foundry.utils.deepClone(pool);
    }
    
    /** @override */
    async _renderInner() {
        // Génération du contenu HTML
        const context = {
            pool: this.pool,
            config: CONFIG.SWERPG,
            difficulties: this._getDifficultyOptions()
        };
        
        const content = await renderTemplate(
            "systems/swerpg/templates/dice/dice-dialog.hbs",
            context
        );
        
        this.data.content = content;
        return super._renderInner();
    }
    
    _onRender(html) {
        // Gestionnaires d'événements
        html.find('.dice-modifier').on('click', this._onDiceModifier.bind(this));
        html.find('.difficulty-select').on('change', this._onDifficultyChange.bind(this));
        html.find('.modifier-input').on('change', this._onModifierChange.bind(this));
        
        // Mise à jour initiale de l'affichage
        this._updateDisplay(html);
    }
    
    _onDiceModifier(event) {
        const button = event.currentTarget;
        const diceType = button.dataset.diceType;
        const operation = button.dataset.operation;
        const amount = parseInt(button.dataset.amount) || 1;
        
        if (operation === "add") {
            this.pool.dice[diceType] += amount;
        } else if (operation === "subtract") {
            this.pool.dice[diceType] = Math.max(0, this.pool.dice[diceType] - amount);
        } else if (operation === "upgrade") {
            this._upgradeDice(diceType, amount);
        }
        
        this._updateDisplay($(event.target).closest('.dialog'));
    }
    
    _upgradeDice(diceType, amount) {
        if (diceType === "ability") {
            this.pool.upgradeAbility(amount);
        } else if (diceType === "difficulty") {
            this.pool.upgradeDifficulty(amount);
        }
    }
    
    _updateDisplay(html) {
        // Mise à jour des compteurs de dés
        Object.entries(this.pool.dice).forEach(([type, count]) => {
            html.find(`.dice-count[data-dice-type="${type}"]`).text(count);
        });
        
        // Mise à jour de la prévisualisation
        this._updatePreview(html);
        
        // Validation
        const errors = this.pool.validate();
        this._displayErrors(html, errors);
    }
    
    _updatePreview(html) {
        const preview = html.find('.dice-preview');
        preview.empty();
        
        Object.entries(this.pool.dice).forEach(([type, count]) => {
            if (count > 0) {
                const diceConfig = DICE_TYPES[type.toUpperCase()];
                for (let i = 0; i < count; i++) {
                    const dieElement = $(`
                        <div class="die-preview" data-type="${type}">
                            <i class="die-icon" style="color: ${diceConfig.color}"></i>
                            <span class="die-symbol">${diceConfig.symbol}</span>
                        </div>
                    `);
                    preview.append(dieElement);
                }
            }
        });
    }
    
    async _onRoll(html) {
        // Validation finale
        const errors = this.pool.validate();
        if (errors.length > 0) {
            ui.notifications.error(game.i18n.localize(errors[0]));
            return;
        }
        
        // Création et évaluation du roll
        const roll = new SwerpgDiceRoll(this.pool);
        await roll.evaluate();
        
        // Message de chat
        await roll.toMessage({
            speaker: ChatMessage.getSpeaker(),
            flags: {
                "swerpg.context": this.pool.metadata
            }
        });
        
        return roll;
    }
    
    static async show(pool, options = {}) {
        return new Promise(resolve => {
            const dialog = new SwerpgDiceDialog(pool, {
                ...options,
                close: () => resolve(null)
            });
            
            dialog.data.buttons.roll.callback = html => {
                resolve(dialog._onRoll(html));
            };
            
            dialog.render(true);
        });
    }
}
```

## 🎯 Intégration avec les Actions

### Utilisation dans SwerpgAction

```javascript
export class SwerpgAction {
    async roll(options = {}) {
        // Construction du pool de base
        const pool = new SwerpgDicePool({
            characteristic: this.getCharacteristicValue(),
            skill: this.getSkillValue(),
            difficulty: this.getDifficulty()
        });
        
        // Application des modificateurs d'équipement
        this._applyEquipmentModifiers(pool);
        
        // Application des modificateurs de talents
        this._applyTalentModifiers(pool);
        
        // Application des modificateurs situationnels
        this._applySituationalModifiers(pool, options);
        
        // Dialog de configuration si nécessaire
        if (!options.skipDialog) {
            const configuredPool = await SwerpgDiceDialog.show(pool, {
                title: this.name,
                context: this.getDialogContext()
            });
            
            if (!configuredPool) return; // Annulé
        }
        
        // Exécution du roll
        const roll = new SwerpgDiceRoll(pool);
        await roll.evaluate();
        
        // Traitement des résultats
        await this._processResults(roll);
        
        return roll;
    }
    
    _applyTalentModifiers(pool) {
        const actor = this.item.parent;
        const relevantTalents = actor.items.filter(i => 
            i.type === "talent" && 
            i.system.effects.some(e => e.target === this.skill)
        );
        
        for (const talent of relevantTalents) {
            for (const effect of talent.system.effects) {
                if (effect.target === this.skill) {
                    this._applyTalentEffect(pool, effect, talent);
                }
            }
        }
    }
    
    _applyTalentEffect(pool, effect, talent) {
        switch (effect.type) {
            case "upgrade_ability":
                pool.upgradeAbility(parseInt(effect.value) * talent.system.currentRank);
                break;
            case "add_boost":
                pool.addBoost(parseInt(effect.value) * talent.system.currentRank);
                break;
            case "reduce_difficulty":
                pool.dice.difficulty = Math.max(0, 
                    pool.dice.difficulty - (parseInt(effect.value) * talent.system.currentRank));
                break;
        }
    }
    
    async _processResults(roll) {
        const result = roll.narrativeResult;
        
        // Résultat de base (succès/échec)
        if (roll.isSuccess) {
            await this._onSuccess(roll);
        } else {
            await this._onFailure(roll);
        }
        
        // Gestion des avantages
        if (result.netAdvantage > 0) {
            await this._onAdvantage(roll, result.netAdvantage);
        } else if (result.netAdvantage < 0) {
            await this._onThreat(roll, Math.abs(result.netAdvantage));
        }
        
        // Gestion des triomphes et désespoirs
        if (result.triumph > 0) {
            await this._onTriumph(roll, result.triumph);
        }
        
        if (result.despair > 0) {
            await this._onDespair(roll, result.despair);
        }
    }
}
```

## 📊 Statistiques et Analytics

### Collecte de Données de Dés

```javascript
export class SwerpgDiceAnalytics {
    static collectRollData(roll) {
        const data = {
            timestamp: Date.now(),
            pool: roll.pool.serialize(),
            result: roll.narrativeResult,
            success: roll.isSuccess,
            context: roll.pool.metadata
        };
        
        // Stockage local pour analytics
        this._storeRollData(data);
    }
    
    static _storeRollData(data) {
        const existing = game.settings.get("swerpg", "rollAnalytics") || [];
        existing.push(data);
        
        // Limitation à 1000 derniers jets
        if (existing.length > 1000) {
            existing.splice(0, existing.length - 1000);
        }
        
        game.settings.set("swerpg", "rollAnalytics", existing);
    }
    
    static getSuccessRate(filters = {}) {
        const rolls = game.settings.get("swerpg", "rollAnalytics") || [];
        const filteredRolls = this._filterRolls(rolls, filters);
        
        const successes = filteredRolls.filter(roll => roll.success).length;
        return filteredRolls.length > 0 ? successes / filteredRolls.length : 0;
    }
    
    static getDifficultyBreakdown() {
        const rolls = game.settings.get("swerpg", "rollAnalytics") || [];
        const breakdown = {};
        
        for (const roll of rolls) {
            const difficulty = roll.context.difficulty || "unknown";
            if (!breakdown[difficulty]) {
                breakdown[difficulty] = { total: 0, successes: 0 };
            }
            breakdown[difficulty].total++;
            if (roll.success) {
                breakdown[difficulty].successes++;
            }
        }
        
        return breakdown;
    }
}
```

---

> 📖 **Voir aussi** : [Talent Tree Architecture](./TALENTS_ARCHITECTURE.md) | [Obligation System Architecture](./OBLIGATIONS_ARCHITECTURE.md)