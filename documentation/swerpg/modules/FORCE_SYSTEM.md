# Système de la Force - Star Wars Edge RPG

## Introduction

Le système de la Force est la mécanique la plus emblématique de Force and Destiny, mais peut également être utilisée dans les autres gammes. Il simule la connexion mystique à la Force, ses pouvoirs, et les conséquences morales de son utilisation.

## Vue d'Ensemble

### Concepts Clés

- **Évaluation de Force** : Mesure la puissance de connexion à la Force
- **Points de Force** : Générés par les dés de Force pour alimenter les pouvoirs
- **Côté Lumineux/Obscur** : Dualité morale de la Force
- **Moralité** : Échelle de 1-100 représentant l'alignement moral
- **Conflit** : Points accumulés par des actions du côté obscur
- **Destinée** : Pool partagé de points de Force lumineux/obscur

## Architecture du Système

### Structure des Classes

```javascript
class SwerpgForceSystem {
    static pools = {
        destiny: new DestinyPool(),
        personal: new Map() // Par utilisateur de Force
    };
    
    static async initialize() {
        await this.loadForcePowers();
        this.setupDestinyPool();
        this.registerForceHooks();
    }
}

class ForceUser {
    constructor(actor) {
        this.actor = actor;
        this.rating = actor.system.force.rating;
        this.morality = actor.system.force.morality;
        this.conflict = actor.system.force.conflict;
        this.committed = actor.system.force.committed;
    }
    
    get availableForce() {
        return this.rating - this.committed;
    }
    
    get alignment() {
        if (this.morality >= 70) return "lightside";
        if (this.morality <= 30) return "darkside"; 
        return "neutral";
    }
}
```

### Configuration des Pouvoirs

```javascript
export const FORCE_POWERS = {
    // Pouvoirs Universels
    influence: {
        name: "SWERPG.ForcePower.Influence",
        description: "SWERPG.ForcePower.InfluenceDesc",
        baseDifficulty: 1,
        range: "engaged",
        duration: "instant",
        upgrades: {
            magnitude: { cost: 10, max: 4 },
            range: { cost: 5, max: 3 },
            duration: { cost: 15, max: 2 },
            strength: { cost: 10, max: 2 }
        }
    },
    
    move: {
        name: "SWERPG.ForcePower.Move",
        description: "SWERPG.ForcePower.MoveDesc", 
        baseDifficulty: 1,
        range: "short",
        duration: "instant",
        baseSize: "silhouette0",
        upgrades: {
            magnitude: { cost: 10, max: 3 },
            range: { cost: 5, max: 4 },
            strength: { cost: 5, max: 5 },
            hurl: { cost: 25, max: 1 }
        }
    },
    
    sense: {
        name: "SWERPG.ForcePower.Sense",
        description: "SWERPG.ForcePower.SenseDesc",
        baseDifficulty: 0,
        range: "short", 
        duration: "instant",
        upgrades: {
            magnitude: { cost: 10, max: 2 },
            range: { cost: 5, max: 3 },
            duration: { cost: 20, max: 2 },
            combat_sense: { cost: 15, max: 1 },
            defensive: { cost: 10, max: 4 }
        }
    },
    
    // Pouvoirs Spécialisés
    enhance: {
        name: "SWERPG.ForcePower.Enhance",
        description: "SWERPG.ForcePower.EnhanceDesc",
        baseDifficulty: 0,
        range: "self",
        duration: "instant",
        upgrades: {
            athletics: { cost: 5, max: 1 },
            coordination: { cost: 5, max: 1 },
            resilience: { cost: 5, max: 1 },
            leap: { cost: 10, max: 1 },
            duration: { cost: 10, max: 3 }
        }
    },
    
    heal: {
        name: "SWERPG.ForcePower.Heal",
        description: "SWERPG.ForcePower.HealDesc",
        baseDifficulty: 2,
        range: "engaged",
        duration: "instant",
        upgrades: {
            magnitude: { cost: 10, max: 4 },
            range: { cost: 5, max: 2 },
            strength: { cost: 10, max: 5 }
        }
    }
};
```

## Mécaniques de Force

### Génération de Points de Force

```javascript
class ForcePointGeneration {
    static async rollForcePool(forceRating, difficulty = 0) {
        // Construire le pool de dés
        const rollFormula = `${forceRating}df${difficulty > 0 ? ` + ${difficulty}dd` : ''}`;
        const roll = await new Roll(rollFormula).evaluate();
        
        // Compter les points de Force
        const forceDice = roll.dice.filter(d => d.faces === 12 && d.options.flavor === "force");
        let lightPoints = 0;
        let darkPoints = 0;
        
        for (const die of forceDice) {
            for (const result of die.results) {
                const face = result.result;
                if (face <= 2) lightPoints += 1;          // 1-2: 1 point lumineux
                else if (face <= 4) lightPoints += 2;     // 3-4: 2 points lumineux  
                else if (face <= 6) darkPoints += 1;      // 5-6: 1 point obscur
                else if (face <= 8) darkPoints += 2;      // 7-8: 2 points obscurs
                // 9-12: faces vides
            }
        }
        
        return {
            roll: roll,
            lightPoints: lightPoints,
            darkPoints: darkPoints,
            totalPoints: lightPoints + darkPoints,
            difficulty: difficulty
        };
    }
    
    static async spendForcePoints(actor, cost, preference = "light") {
        const rollResult = await this.rollForcePool(actor.system.force.rating);
        
        if (rollResult.totalPoints < cost) {
            ui.notifications.warn("Points de Force insuffisants");
            return null;
        }
        
        const spending = this.optimizeForceSpending(rollResult, cost, preference);
        
        // Générer du Conflit si on utilise le côté obscur
        if (spending.dark > 0) {
            await ConflictGeneration.generateConflict(actor, "dark_side_usage", spending.dark);
        }
        
        return {
            ...rollResult,
            spent: spending,
            remaining: {
                light: rollResult.lightPoints - spending.light,
                dark: rollResult.darkPoints - spending.dark
            }
        };
    }
}
```

### Utilisation des Pouvoirs de Force

```javascript
class ForcePowerActivation {
    constructor(actor, power, upgrades = {}) {
        this.actor = actor;
        this.power = power;
        this.upgrades = upgrades;
        this.baseCost = this.calculateBaseCost();
        this.totalCost = this.calculateTotalCost();
    }
    
    calculateBaseCost() {
        // Coût de base selon la difficulté
        return Math.max(1, this.power.baseDifficulty);
    }
    
    calculateTotalCost() {
        let cost = this.baseCost;
        
        // Ajouter les coûts des améliorations
        for (const [upgrade, level] of Object.entries(this.upgrades)) {
            if (this.power.upgrades[upgrade]) {
                cost += level; // Chaque niveau d'amélioration coûte 1 point
            }
        }
        
        return cost;
    }
    
    async activate(targets = []) {
        // 1. Vérifier les prérequis
        if (!this.canActivate()) {
            return { success: false, reason: "prerequisitesNotMet" };
        }
        
        // 2. Générer les points de Force
        const forceResult = await ForcePointGeneration.spendForcePoints(
            this.actor, 
            this.totalCost,
            this.actor.system.force.alignment
        );
        
        if (!forceResult) {
            return { success: false, reason: "insufficientForce" };
        }
        
        // 3. Résoudre l'effet du pouvoir
        const effect = await this.resolvePowerEffect(targets, forceResult);
        
        // 4. Créer le message de chat
        await this.createChatMessage(forceResult, effect);
        
        return { 
            success: true, 
            forceResult: forceResult,
            effect: effect 
        };
    }
    
    async resolvePowerEffect(targets, forceResult) {
        switch (this.power.id) {
            case "move":
                return await this.resolveMoveEffect(targets, forceResult);
            case "influence":
                return await this.resolveInfluenceEffect(targets, forceResult);
            case "heal":
                return await this.resolveHealEffect(targets, forceResult);
            case "sense":
                return await this.resolveSenseEffect(targets, forceResult);
            default:
                return await this.resolveGenericEffect(targets, forceResult);
        }
    }
}
```

### Pouvoirs Spécifiques

#### Move (Télékinésie)

```javascript
class MovePowerEffect {
    static async resolve(actor, targets, upgrades, forceResult) {
        const target = targets[0];
        if (!target) return { success: false, reason: "noTarget" };
        
        // Calculer la taille maximale déplaçable
        const baseSize = 0; // Silhouette 0
        const strengthUpgrades = upgrades.strength || 0;
        const maxSilhouette = baseSize + strengthUpgrades;
        
        // Vérifier la taille de la cible
        const targetSilhouette = target.actor?.system.silhouette || 0;
        if (targetSilhouette > maxSilhouette) {
            return { success: false, reason: "targetTooLarge" };
        }
        
        // Calculer la distance de déplacement
        const baseRange = this.getRangeInMeters("short");
        const rangeUpgrades = upgrades.range || 0;
        const maxDistance = baseRange * Math.pow(2, rangeUpgrades);
        
        // Demander la destination
        const destination = await this.selectDestination(target, maxDistance);
        if (!destination) return { success: false, reason: "cancelled" };
        
        // Appliquer le mouvement
        await target.update({
            x: destination.x,
            y: destination.y
        });
        
        // Vérifier si c'est une attaque (amélioration Hurl)
        if (upgrades.hurl) {
            return await this.resolveHurlAttack(actor, target, destination, forceResult);
        }
        
        return {
            success: true,
            type: "move",
            target: target,
            destination: destination,
            distance: this.calculateDistance(target, destination)
        };
    }
    
    static async resolveHurlAttack(actor, projectile, destination, forceResult) {
        // Chercher les cibles à la destination
        const potentialTargets = this.getTargetsAtLocation(destination);
        
        if (potentialTargets.length === 0) {
            return { success: true, type: "hurl", damage: 0 };
        }
        
        // Jet d'attaque
        const attackPool = DicePoolBuilder.buildPool(
            actor.system.characteristics.willpower,
            0, // Pas de compétence pour les attaques de Force
            2  // Difficulté de base
        );
        
        const attackRoll = await attackPool.roll();
        const attackResult = DiceResultResolver.resolve(attackRoll);
        
        if (!attackResult.success) {
            return { success: true, type: "hurl", hit: false };
        }
        
        // Calculer les dégâts
        const damage = this.calculateHurlDamage(projectile, forceResult.spent.total);
        
        return {
            success: true,
            type: "hurl",
            hit: true,
            damage: damage,
            targets: potentialTargets
        };
    }
}
```

#### Influence (Manipulation Mentale)

```javascript
class InfluencePowerEffect {
    static async resolve(actor, targets, upgrades, forceResult) {
        const target = targets[0];
        if (!target?.actor) return { success: false, reason: "noValidTarget" };
        
        // Déterminer le type d'influence
        const influenceType = await this.selectInfluenceType();
        
        switch (influenceType) {
            case "emotion":
                return await this.influenceEmotion(actor, target, upgrades);
            case "thought":
                return await this.influenceThought(actor, target, upgrades);
            case "action":
                return await this.influenceAction(actor, target, upgrades);
            default:
                return { success: false, reason: "invalidType" };
        }
    }
    
    static async influenceEmotion(actor, target, upgrades) {
        // Jet opposé : Volonté vs Volonté
        const actorPool = DicePoolBuilder.buildPool(
            actor.system.characteristics.willpower,
            actor.system.skills.deception?.rank || 0,
            0
        );
        
        const targetPool = DicePoolBuilder.buildPool(
            0, 0,
            target.actor.system.characteristics.willpower
        );
        
        // Appliquer les améliorations
        if (upgrades.strength) {
            DicePoolBuilder.addBoost(actorPool, upgrades.strength);
        }
        
        const contest = await this.resolveOpposedRoll(actorPool, targetPool);
        
        if (contest.success) {
            // Appliquer l'effet émotionnel
            const emotion = await this.selectEmotion();
            await this.applyEmotionalEffect(target, emotion, upgrades.duration || 0);
            
            return {
                success: true,
                type: "emotion",
                emotion: emotion,
                duration: this.calculateDuration(upgrades.duration || 0)
            };
        }
        
        return { success: false, reason: "resistedInfluence" };
    }
}
```

## Système de Moralité

### Calcul de la Moralité

```javascript
class MoralitySystem {
    static async performMoralityCheck(actor) {
        const conflict = actor.system.force.conflict;
        if (conflict === 0) return null;
        
        // Jet de Moralité : 1d10 par point de Conflit
        const roll = await new Roll(`${conflict}d10`).evaluate();
        
        // Compter les 1 et 2 (rédemption)
        const redemption = roll.dice[0].results.filter(r => r.result <= 2).length;
        
        // Calculer le changement de Moralité
        const currentMorality = actor.system.force.morality;
        const change = redemption - conflict;
        const newMorality = Math.max(1, Math.min(100, currentMorality + change));
        
        // Appliquer les changements
        await actor.update({
            "system.force.morality": newMorality,
            "system.force.conflict": 0
        });
        
        // Vérifier les effets d'alignement
        await this.checkAlignmentEffects(actor, currentMorality, newMorality);
        
        return {
            conflictRoll: roll,
            conflictPoints: conflict,
            redemptionPoints: redemption,
            change: change,
            oldMorality: currentMorality,
            newMorality: newMorality
        };
    }
    
    static async checkAlignmentEffects(actor, oldMorality, newMorality) {
        const oldAlignment = this.getMoralityAlignment(oldMorality);
        const newAlignment = this.getMoralityAlignment(newMorality);
        
        if (oldAlignment !== newAlignment) {
            await this.triggerAlignmentChange(actor, oldAlignment, newAlignment);
        }
        
        // Vérifier les seuils critiques
        if (newMorality <= 30 && oldMorality > 30) {
            await this.triggerDarkSideTransition(actor);
        } else if (newMorality >= 70 && oldMorality < 70) {
            await this.triggerLightSideTransition(actor);
        }
    }
    
    static getMoralityAlignment(morality) {
        if (morality >= 70) return "lightside";
        if (morality <= 30) return "darkside";
        return "neutral";
    }
    
    static async triggerDarkSideTransition(actor) {
        // Effets de la chute vers le côté obscur
        ui.notifications.warn(game.i18n.format("SWERPG.Force.DarkSideTransition", {
            actor: actor.name
        }));
        
        // Appliquer des malus permanents
        await this.applyDarkSideEffects(actor);
        
        // Créer un message de chat dramatique
        await this.createAlignmentChatMessage(actor, "darkside");
    }
}
```

### Génération de Conflit

```javascript
class ConflictGeneration {
    static conflictSources = {
        // Actions du côté obscur
        darkSideForceUse: 1,
        violence: 1,
        intimidation: 1,
        deception: 2,
        stealing: 1,
        
        // Actions graves
        torture: 5,
        murder: 10,
        betrayal: 5,
        
        // Actions contre nature de la Force
        forceLightning: 3,
        forceChoke: 2,
        mindControl: 3
    };
    
    static async generateConflict(actor, source, customAmount = null) {
        const amount = customAmount || this.conflictSources[source] || 1;
        
        const currentConflict = actor.system.force.conflict;
        const newConflict = currentConflict + amount;
        
        await actor.update({
            "system.force.conflict": newConflict
        });
        
        // Enregistrer dans l'historique
        await this.logConflictEvent(actor, source, amount);
        
        // Notification
        ui.notifications.warn(game.i18n.format("SWERPG.Force.ConflictGenerated", {
            amount: amount,
            source: game.i18n.localize(`SWERPG.ConflictSource.${source}`),
            total: newConflict
        }));
        
        // Hook pour modules
        Hooks.callAll("swerpg.conflictGenerated", actor, source, amount, newConflict);
        
        return newConflict;
    }
    
    static async logConflictEvent(actor, source, amount) {
        const log = actor.getFlag("swerpg", "conflictLog") || [];
        log.push({
            timestamp: Date.now(),
            source: source,
            amount: amount,
            session: game.session?.id
        });
        
        // Garder seulement les 50 derniers événements
        if (log.length > 50) {
            log.splice(0, log.length - 50);
        }
        
        await actor.setFlag("swerpg", "conflictLog", log);
    }
}
```

## Pool de Destinée

### Gestion du Pool Global

```javascript
class DestinyPool {
    constructor() {
        this.light = 0;
        this.dark = 0;
        this.players = [];
        this.gamemaster = null;
    }
    
    static async initialize(players) {
        const pool = new DestinyPool();
        pool.players = players;
        
        // Rouler la Destinée initiale
        await pool.rollInitialDestiny();
        
        // Enregistrer dans les settings
        await game.settings.set("swerpg", "destinyPool", pool.toObject());
        
        return pool;
    }
    
    async rollInitialDestiny() {
        const rollFormula = `${this.players.length}df`;
        const roll = await new Roll(rollFormula).evaluate();
        
        let lightPoints = 0;
        let darkPoints = 0;
        
        for (const result of roll.dice[0].results) {
            const face = result.result;
            if (face <= 4) {
                lightPoints += (face <= 2) ? 1 : 2;
            } else if (face <= 8) {
                darkPoints += (face <= 6) ? 1 : 2;
            }
        }
        
        this.light = lightPoints;
        this.dark = darkPoints;
        
        // Créer le message de chat
        await this.createDestinyRollMessage(roll, lightPoints, darkPoints);
        
        return { light: lightPoints, dark: darkPoints };
    }
    
    async spendDestinyPoint(user, type) {
        if (type === "light" && this.light > 0) {
            this.light--;
            this.dark++;
        } else if (type === "dark" && this.dark > 0) {
            this.dark--;
            this.light++;
        } else {
            ui.notifications.warn("Points de Destinée insuffisants");
            return false;
        }
        
        // Sauvegarder
        await this.save();
        
        // Notifier
        await this.notifyDestinySpent(user, type);
        
        return true;
    }
    
    static async getCurrentPool() {
        const poolData = game.settings.get("swerpg", "destinyPool");
        const pool = new DestinyPool();
        Object.assign(pool, poolData);
        return pool;
    }
}
```

### Interface de Destinée

```javascript
class DestinyPoolUI extends Application {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: "destiny-pool",
            title: "Pool de Destinée",
            template: "systems/swerpg/templates/apps/destiny-pool.hbs",
            width: 300,
            height: 150,
            resizable: false,
            minimizable: true
        });
    }
    
    async getData() {
        const pool = await DestinyPool.getCurrentPool();
        return {
            pool: pool,
            canSpendLight: pool.light > 0 && !game.user.isGM,
            canSpendDark: pool.dark > 0 && game.user.isGM,
            showControls: game.user.isGM
        };
    }
    
    activateListeners(html) {
        super.activateListeners(html);
        
        html.find('[data-action="spend-light"]').click(this._onSpendLight.bind(this));
        html.find('[data-action="spend-dark"]').click(this._onSpendDark.bind(this));
        html.find('[data-action="reroll-destiny"]').click(this._onRerollDestiny.bind(this));
    }
    
    async _onSpendLight(event) {
        event.preventDefault();
        
        const pool = await DestinyPool.getCurrentPool();
        const success = await pool.spendDestinyPoint(game.user, "light");
        
        if (success) {
            this.render();
        }
    }
}
```

## Intégration avec les Sabres Laser

### Combat de Force

```javascript
class ForceCombat {
    static async enhanceCombat(actor, power, upgrades) {
        switch (power) {
            case "enhance":
                return await this.resolveEnhanceInCombat(actor, upgrades);
            case "sense":
                return await this.resolveSenseInCombat(actor, upgrades);
            case "move":
                return await this.resolveMoveInCombat(actor, upgrades);
        }
    }
    
    static async resolveSenseInCombat(actor, upgrades) {
        const effects = [];
        
        // Defense upgrade: +1 Ranged/Melee Defense per rank
        if (upgrades.defensive) {
            effects.push({
                name: "Sense (Défense)",
                changes: [
                    { key: "system.defense.ranged", mode: 2, value: upgrades.defensive },
                    { key: "system.defense.melee", mode: 2, value: upgrades.defensive }
                ],
                duration: { rounds: upgrades.duration || 1 }
            });
        }
        
        // Combat Sense: Initiative et perception
        if (upgrades.combat_sense) {
            effects.push({
                name: "Sense (Combat)",
                changes: [
                    { key: "system.skills.vigilance.boost", mode: 2, value: 2 },
                    { key: "system.skills.cool.boost", mode: 2, value: 2 }
                ],
                duration: { rounds: upgrades.duration || 1 }
            });
        }
        
        return effects;
    }
    
    static async resolveLightsaberDeflection(actor, attackRoll) {
        // Vérifier si l'acteur peut utiliser Sense pour la déflection
        const sensePower = actor.items.find(i => 
            i.type === "forcepower" && 
            i.system.identifier === "sense"
        );
        
        if (!sensePower) return false;
        
        // Demander si le joueur veut utiliser la déflection
        const useDeflection = await Dialog.confirm({
            title: "Déflection de Sabre Laser",
            content: "Voulez-vous utiliser la Force pour dévier cette attaque ?"
        });
        
        if (!useDeflection) return false;
        
        // Résoudre la déflection
        const forceResult = await ForcePointGeneration.spendForcePoints(actor, 1);
        if (!forceResult) return false;
        
        // Jet de Sabre Laser contre la difficulté de l'attaque
        const deflectionPool = DicePoolBuilder.buildPool(
            actor.system.characteristics.brawn,
            actor.system.skills.lightsaber?.rank || 0,
            attackRoll.difficulty
        );
        
        const deflectionRoll = await deflectionPool.roll();
        const deflectionResult = DiceResultResolver.resolve(deflectionRoll);
        
        return deflectionResult.success;
    }
}
```

## Hooks et Extensions

### Événements Force

```javascript
// Hooks spécifiques à la Force
Hooks.on("swerpg.forcePowerActivated", (actor, power, result) => {
    console.log(`${actor.name} a utilisé ${power.name}`);
});

Hooks.on("swerpg.conflictGenerated", (actor, source, amount) => {
    console.log(`Conflit généré pour ${actor.name}: ${amount} points`);
});

Hooks.on("swerpg.moralityChanged", (actor, oldValue, newValue) => {
    console.log(`Moralité de ${actor.name}: ${oldValue} → ${newValue}`);
});

Hooks.on("swerpg.destinySpent", (user, type, remaining) => {
    console.log(`Point de destinée ${type} dépensé par ${user.name}`);
});
```

### API d'Extension

```javascript
class SwerpgForceAPI {
    static registerForcePower(id, config) {
        FORCE_POWERS[id] = config;
    }
    
    static addConflictSource(id, amount) {
        ConflictGeneration.conflictSources[id] = amount;
    }
    
    static registerForceEffect(powerId, effectFunction) {
        ForcePowerActivation.customEffects.set(powerId, effectFunction);
    }
}
```

## Configuration et Paramètres

### Settings Système

```javascript
export const FORCE_SETTINGS = {
    destinyAutoRoll: {
        name: "SWERPG.Settings.DestinyAutoRoll",
        hint: "SWERPG.Settings.DestinyAutoRollHint",
        scope: "world",
        config: true,
        type: Boolean,
        default: true
    },
    
    conflictTracking: {
        name: "SWERPG.Settings.ConflictTracking",
        hint: "SWERPG.Settings.ConflictTrackingHint",
        scope: "world",
        config: true,
        type: String,
        choices: {
            automatic: "Automatique",
            manual: "Manuel",
            off: "Désactivé"
        },
        default: "automatic"
    },
    
    moralityVisible: {
        name: "SWERPG.Settings.MoralityVisible",
        hint: "SWERPG.Settings.MoralityVisibleHint",
        scope: "world",
        config: true,
        type: Boolean,
        default: false
    }
};
```

## Conclusion

Le système de la Force de Star Wars Edge RPG capture l'essence mystique et les dilemmes moraux de l'utilisation de la Force. L'implémentation dans Foundry VTT automatise les mécaniques complexes tout en préservant les aspects narratifs cruciaux.

La dualité entre côté lumineux et obscur, les conséquences morales des actions, et la gestion du pool de Destinée créent une expérience de jeu riche qui reflète fidèlement l'univers de Star Wars et les thèmes de Force and Destiny.