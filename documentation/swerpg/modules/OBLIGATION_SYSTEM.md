# Système d'Obligations - Star Wars Edge RPG

## Introduction

Le système d'obligations est une mécanique narrative centrale de Star Wars Edge RPG qui ajoute de la profondeur et des complications aux histoires des personnages. Chaque système de jeu (Edge of the Empire, Age of Rebellion, Force and Destiny) possède sa propre variante de cette mécanique.

## Vue d'Ensemble

### Les Trois Systèmes

- **Obligations** (Edge of the Empire) : Dettes, engagements criminels, responsabilités pesantes
- **Devoirs** (Age of Rebellion) : Missions pour la Rébellion, responsabilités militaires
- **Conflits** (Force and Destiny) : Lutte intérieure entre côté lumineux et obscur

## Architecture du Système

### Structure des Classes

```javascript
class SwerpgObligationSystem {
    static types = {
        obligation: "obligation",
        duty: "duty", 
        conflict: "conflict"
    };
    
    static async initialize() {
        this.loadObligationData();
        this.registerHooks();
        this.setupPeriodicChecks();
    }
}

class SwerpgObligation {
    constructor(type, data) {
        this.type = type;          // obligation, duty, conflict
        this.name = data.name;
        this.description = data.description;
        this.value = data.value;   // Valeur numérique
        this.triggers = data.triggers || [];
        this.effects = data.effects || [];
    }
}
```

### Configuration des Types

```javascript
export const OBLIGATION_TYPES = {
    // Edge of the Empire - Obligations
    addiction: {
        name: "SWERPG.Obligation.Addiction",
        description: "SWERPG.Obligation.AddictionDesc",
        system: "edge",
        severity: "personal"
    },
    betrayal: {
        name: "SWERPG.Obligation.Betrayal", 
        description: "SWERPG.Obligation.BetrayalDesc",
        system: "edge",
        severity: "serious"
    },
    blackmail: {
        name: "SWERPG.Obligation.Blackmail",
        description: "SWERPG.Obligation.BlackmailDesc", 
        system: "edge",
        severity: "serious"
    },
    bounty: {
        name: "SWERPG.Obligation.Bounty",
        description: "SWERPG.Obligation.BountyDesc",
        system: "edge", 
        severity: "dangerous"
    },
    criminal: {
        name: "SWERPG.Obligation.Criminal",
        description: "SWERPG.Obligation.CriminalDesc",
        system: "edge",
        severity: "moderate"
    },
    debt: {
        name: "SWERPG.Obligation.Debt",
        description: "SWERPG.Obligation.DebtDesc",
        system: "edge",
        severity: "moderate"
    },
    dutybound: {
        name: "SWERPG.Obligation.Dutybound", 
        description: "SWERPG.Obligation.DutyboundDesc",
        system: "edge",
        severity: "personal"
    },
    family: {
        name: "SWERPG.Obligation.Family",
        description: "SWERPG.Obligation.FamilyDesc",
        system: "edge",
        severity: "personal"
    },
    favor: {
        name: "SWERPG.Obligation.Favor",
        description: "SWERPG.Obligation.FavorDesc",
        system: "edge",
        severity: "moderate"
    },
    oath: {
        name: "SWERPG.Obligation.Oath",
        description: "SWERPG.Obligation.OathDesc",
        system: "edge",
        severity: "serious"
    }
};

export const DUTY_TYPES = {
    // Age of Rebellion - Devoirs
    combat_victory: {
        name: "SWERPG.Duty.CombatVictory",
        description: "SWERPG.Duty.CombatVictoryDesc",
        system: "rebellion"
    },
    intelligence: {
        name: "SWERPG.Duty.Intelligence", 
        description: "SWERPG.Duty.IntelligenceDesc",
        system: "rebellion"
    },
    internal_security: {
        name: "SWERPG.Duty.InternalSecurity",
        description: "SWERPG.Duty.InternalSecurityDesc", 
        system: "rebellion"
    },
    personnel: {
        name: "SWERPG.Duty.Personnel",
        description: "SWERPG.Duty.PersonnelDesc",
        system: "rebellion"
    },
    political_support: {
        name: "SWERPG.Duty.PoliticalSupport",
        description: "SWERPG.Duty.PoliticalSupportDesc",
        system: "rebellion"
    },
    resource_acquisition: {
        name: "SWERPG.Duty.ResourceAcquisition", 
        description: "SWERPG.Duty.ResourceAcquisitionDesc",
        system: "rebellion"
    },
    sabotage: {
        name: "SWERPG.Duty.Sabotage",
        description: "SWERPG.Duty.SabotageDesc",
        system: "rebellion"
    },
    space_superiority: {
        name: "SWERPG.Duty.SpaceSuperiority",
        description: "SWERPG.Duty.SpaceSuperiorityDesc",
        system: "rebellion"
    },
    support: {
        name: "SWERPG.Duty.Support",
        description: "SWERPG.Duty.SupportDesc", 
        system: "rebellion"
    },
    tech_procurement: {
        name: "SWERPG.Duty.TechProcurement",
        description: "SWERPG.Duty.TechProcurementDesc",
        system: "rebellion"
    }
};
```

## Mécaniques de Jeu

### Système d'Obligations (Edge of the Empire)

#### Déclenchement des Obligations

```javascript
class ObligationTrigger {
    static async checkObligations(party) {
        // Calculer l'obligation totale du groupe
        const totalObligation = this.calculatePartyObligation(party);
        
        // Lancer 1d100
        const roll = await new Roll("1d100").evaluate();
        
        // Vérifier si l'obligation se déclenche
        if (roll.total <= totalObligation) {
            const triggeredObligation = this.determineTriggeredObligation(party, roll.total);
            await this.triggerObligation(triggeredObligation);
            return triggeredObligation;
        }
        
        return null;
    }
    
    static calculatePartyObligation(party) {
        return party.members.reduce((total, actor) => {
            return total + actor.system.obligations.reduce((sum, obl) => sum + obl.value, 0);
        }, 0);
    }
    
    static determineTriggeredObligation(party, rollValue) {
        let currentThreshold = 0;
        
        for (const member of party.members) {
            for (const obligation of member.system.obligations) {
                currentThreshold += obligation.value;
                if (rollValue <= currentThreshold) {
                    return {
                        actor: member,
                        obligation: obligation,
                        rollValue: rollValue
                    };
                }
            }
        }
        
        return null;
    }
}
```

#### Effets des Obligations

```javascript
class ObligationEffects {
    static async applyObligationEffects(triggeredObligation) {
        const { actor, obligation, rollValue } = triggeredObligation;
        
        // Déterminer la magnitude de l'effet
        const magnitude = this.calculateMagnitude(obligation.value, rollValue);
        
        // Appliquer les effets selon le type
        switch (magnitude) {
            case "minor":
                await this.applyMinorEffects(actor, obligation);
                break;
            case "major":
                await this.applyMajorEffects(actor, obligation);
                break;
            case "severe":
                await this.applySevereEffects(actor, obligation);
                break;
        }
        
        // Notifier le MJ et les joueurs
        await this.notifyObligationTriggered(triggeredObligation, magnitude);
    }
    
    static calculateMagnitude(obligationValue, rollValue) {
        const difference = rollValue - obligationValue;
        
        if (difference <= -50) return "severe";
        if (difference <= -20) return "major";
        return "minor";
    }
    
    static async applyMinorEffects(actor, obligation) {
        // Effets mineurs : strain, setback dice
        await actor.update({
            "system.stress.strain.value": Math.min(
                actor.system.stress.strain.max,
                actor.system.stress.strain.value + 2
            )
        });
        
        // Ajouter un dé de revers pour la prochaine action
        await this.addTemporaryEffect(actor, "setback", 1);
    }
    
    static async applyMajorEffects(actor, obligation) {
        // Effets majeurs : plus de strain, complications narratives
        await actor.update({
            "system.stress.strain.value": Math.min(
                actor.system.stress.strain.max,
                actor.system.stress.strain.value + 4
            )
        });
        
        // Déclencher une complication narrative spécifique
        await this.triggerNarrativeComplication(actor, obligation);
    }
}
```

### Système de Devoirs (Age of Rebellion)

#### Progression des Devoirs

```javascript
class DutyProgression {
    static async awardDuty(actor, amount, reason) {
        const currentDuty = actor.system.duty.value;
        const newDuty = Math.min(100, currentDuty + amount);
        
        await actor.update({
            "system.duty.value": newDuty
        });
        
        // Vérifier les seuils de promotion
        await this.checkPromotionThresholds(actor, currentDuty, newDuty);
        
        // Enregistrer dans l'historique
        await this.logDutyChange(actor, amount, reason);
        
        ui.notifications.info(game.i18n.format("SWERPG.Duty.Awarded", {
            amount: amount,
            total: newDuty,
            actor: actor.name
        }));
    }
    
    static async checkPromotionThresholds(actor, oldValue, newValue) {
        const thresholds = [20, 40, 60, 80, 100];
        
        for (const threshold of thresholds) {
            if (oldValue < threshold && newValue >= threshold) {
                await this.triggerPromotion(actor, threshold);
            }
        }
    }
    
    static async triggerPromotion(actor, threshold) {
        const promotionData = this.getPromotionData(threshold);
        
        // Appliquer les bénéfices de la promotion
        await actor.update(promotionData.updates);
        
        // Notification et chat message
        const message = await renderTemplate("systems/swerpg/templates/chat/duty-promotion.hbs", {
            actor: actor,
            promotion: promotionData
        });
        
        await ChatMessage.create({
            content: message,
            speaker: ChatMessage.getSpeaker({ actor: actor })
        });
    }
}
```

### Système de Conflits (Force and Destiny)

#### Génération de Conflits

```javascript
class ConflictGeneration {
    static async generateConflict(actor, source, amount = 1) {
        // Ajouter des points de Conflit
        const currentConflict = actor.system.force.conflict;
        const newConflict = currentConflict + amount;
        
        await actor.update({
            "system.force.conflict": newConflict
        });
        
        // Enregistrer la source du conflit
        await this.logConflictSource(actor, source, amount);
        
        // Notification
        ui.notifications.warn(game.i18n.format("SWERPG.Conflict.Generated", {
            amount: amount,
            source: source,
            total: newConflict
        }));
        
        return newConflict;
    }
    
    static async resolveMoralityRoll(actor) {
        const conflict = actor.system.force.conflict;
        if (conflict === 0) return;
        
        // Lancer 1d10 par point de Conflit
        const rollFormula = `${conflict}d10`;
        const roll = await new Roll(rollFormula).evaluate();
        
        // Compter les résultats de 1-2 (rédemption)
        const redemptionPoints = roll.dice[0].results.filter(r => r.result <= 2).length;
        
        // Appliquer les changements de Moralité
        const morality = actor.system.force.morality;
        const newMorality = Math.max(1, Math.min(100, morality - conflict + redemptionPoints));
        
        await actor.update({
            "system.force.morality": newMorality,
            "system.force.conflict": 0  // Réinitialiser le conflit
        });
        
        // Vérifier les changements d'alignement
        await this.checkAlignmentChange(actor, morality, newMorality);
        
        return {
            conflictPoints: conflict,
            redemptionPoints: redemptionPoints,
            oldMorality: morality,
            newMorality: newMorality
        };
    }
}
```

## Interface Utilisateur

### Panel d'Obligations

```javascript
class ObligationPanel extends Application {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: "obligation-panel",
            title: "SWERPG.ObligationPanel.Title",
            template: "systems/swerpg/templates/apps/obligation-panel.hbs",
            width: 600,
            height: 400,
            resizable: true
        });
    }
    
    getData() {
        const party = this.getPartyMembers();
        const totalObligation = this.calculateTotalObligation(party);
        
        return {
            party: party,
            totalObligation: totalObligation,
            threshold: this.calculateThreshold(totalObligation),
            canTrigger: game.user.isGM
        };
    }
    
    activateListeners(html) {
        super.activateListeners(html);
        
        html.find('[data-action="roll-obligation"]').click(this._onRollObligation.bind(this));
        html.find('[data-action="add-obligation"]').click(this._onAddObligation.bind(this));
        html.find('[data-action="edit-obligation"]').click(this._onEditObligation.bind(this));
        html.find('[data-action="remove-obligation"]').click(this._onRemoveObligation.bind(this));
    }
    
    async _onRollObligation(event) {
        event.preventDefault();
        
        const party = this.getPartyMembers();
        const result = await ObligationTrigger.checkObligations(party);
        
        if (result) {
            await ObligationEffects.applyObligationEffects(result);
        } else {
            ui.notifications.info("Aucune obligation déclenchée ce tour.");
        }
        
        this.render();
    }
}
```

### Dialog de Création d'Obligation

```javascript
class ObligationDialog extends Dialog {
    constructor(actor, options = {}) {
        const data = {
            title: "Créer une Obligation",
            content: "systems/swerpg/templates/dialogs/obligation-create.hbs",
            buttons: {
                create: {
                    label: "Créer",
                    callback: html => this._onCreate(html)
                },
                cancel: {
                    label: "Annuler"
                }
            },
            default: "create"
        };
        
        super(data, options);
        this.actor = actor;
    }
    
    async getData() {
        return {
            actor: this.actor,
            obligationTypes: OBLIGATION_TYPES,
            dutyTypes: DUTY_TYPES,
            gameSystem: this.determineGameSystem()
        };
    }
    
    async _onCreate(html) {
        const formData = new FormDataExtended(html[0].querySelector("form"));
        const obligationData = formData.object;
        
        // Valider les données
        if (!this.validateObligationData(obligationData)) {
            return;
        }
        
        // Créer l'obligation
        const obligations = foundry.utils.duplicate(this.actor.system.obligations || []);
        obligations.push({
            id: foundry.utils.randomID(),
            name: obligationData.name,
            type: obligationData.type,
            value: obligationData.value,
            description: obligationData.description
        });
        
        await this.actor.update({ "system.obligations": obligations });
        
        ui.notifications.info(game.i18n.format("SWERPG.Obligation.Created", {
            name: obligationData.name
        }));
    }
}
```

## Intégration avec les Sessions

### Tracking Automatique

```javascript
class SessionObligationTracker {
    static async onSessionStart() {
        if (!game.user.isGM) return;
        
        // Rouler les obligations au début de session
        const party = this.getPartyMembers();
        
        if (party.length === 0) return;
        
        const result = await ObligationTrigger.checkObligations(party);
        
        if (result) {
            await this.recordObligationEvent(result);
            await ObligationEffects.applyObligationEffects(result);
        }
    }
    
    static async recordObligationEvent(obligationResult) {
        const journalEntry = game.journal.getName("Session Log") || 
                            await JournalEntry.create({ name: "Session Log" });
        
        const eventData = {
            timestamp: new Date().toISOString(),
            type: "obligation",
            actor: obligationResult.actor.name,
            obligation: obligationResult.obligation.name,
            value: obligationResult.rollValue,
            session: game.session?.id || "unknown"
        };
        
        const currentContent = journalEntry.pages.contents[0]?.text.content || "";
        const newContent = currentContent + this.formatObligationEvent(eventData);
        
        await journalEntry.pages.contents[0]?.update({
            "text.content": newContent
        });
    }
}
```

### Statistiques et Historique

```javascript
class ObligationStatistics {
    static generateReport(party, timeframe = "all") {
        const events = this.getObligationEvents(party, timeframe);
        
        const stats = {
            totalEvents: events.length,
            byType: {},
            byActor: {},
            frequency: this.calculateFrequency(events),
            trends: this.analyzeTrends(events)
        };
        
        // Analyser par type d'obligation
        for (const event of events) {
            const type = event.obligation.type;
            stats.byType[type] = (stats.byType[type] || 0) + 1;
        }
        
        // Analyser par acteur
        for (const event of events) {
            const actor = event.actor.name;
            stats.byActor[actor] = (stats.byActor[actor] || 0) + 1;
        }
        
        return stats;
    }
    
    static async generateReportDocument(stats) {
        const content = await renderTemplate("systems/swerpg/templates/reports/obligation-stats.hbs", {
            stats: stats,
            generatedAt: new Date().toLocaleString()
        });
        
        const journal = await JournalEntry.create({
            name: "Rapport d'Obligations",
            pages: [{
                name: "Statistiques",
                type: "text",
                text: { content: content }
            }]
        });
        
        journal.sheet.render(true);
        return journal;
    }
}
```

## Effets Temporaires et Persistants

### Système d'Effets

```javascript
class ObligationEffectManager {
    static async createTemporaryEffect(actor, effectData) {
        const effect = new ActiveEffect({
            name: effectData.name,
            img: effectData.icon,
            origin: "obligation",
            duration: {
                rounds: effectData.duration?.rounds,
                seconds: effectData.duration?.seconds,
                turns: effectData.duration?.turns
            },
            changes: effectData.changes || [],
            flags: {
                swerpg: {
                    obligation: true,
                    type: effectData.type
                }
            }
        });
        
        return await actor.createEmbeddedDocuments("ActiveEffect", [effect]);
    }
    
    static async removeObligationEffects(actor, type = null) {
        const effects = actor.effects.filter(e => {
            const isObligation = e.flags.swerpg?.obligation;
            return type ? (isObligation && e.flags.swerpg?.type === type) : isObligation;
        });
        
        const ids = effects.map(e => e.id);
        return await actor.deleteEmbeddedDocuments("ActiveEffect", ids);
    }
}
```

## Hooks et Extensions

### Événements Système

```javascript
// Hooks disponibles pour les modules
Hooks.on("swerpg.obligationTriggered", (actor, obligation, magnitude) => {
    console.log(`Obligation déclenchée : ${obligation.name} (${magnitude})`);
});

Hooks.on("swerpg.dutyAwarded", (actor, amount, total) => {
    console.log(`Devoir récompensé : +${amount} (total: ${total})`);
});

Hooks.on("swerpg.conflictGenerated", (actor, source, amount) => {
    console.log(`Conflit généré : ${amount} points (${source})`);
});

Hooks.on("swerpg.moralityChanged", (actor, oldValue, newValue) => {
    console.log(`Moralité changée : ${oldValue} → ${newValue}`);
});
```

### API d'Extension

```javascript
class SwerpgObligationAPI {
    static registerObligationType(id, config) {
        OBLIGATION_TYPES[id] = config;
    }
    
    static addObligationEffect(type, effectFunction) {
        ObligationEffectManager.customEffects.set(type, effectFunction);
    }
    
    static registerTriggerCondition(id, conditionFunction) {
        ObligationTrigger.customConditions.set(id, conditionFunction);
    }
}
```

## Configuration Avancée

### Paramètres Système

```javascript
export const OBLIGATION_SETTINGS = {
    autoTrigger: {
        name: "SWERPG.Settings.ObligationAutoTrigger",
        hint: "SWERPG.Settings.ObligationAutoTriggerHint",
        scope: "world",
        config: true,
        type: Boolean,
        default: true
    },
    
    narrativeMode: {
        name: "SWERPG.Settings.ObligationNarrativeMode",
        hint: "SWERPG.Settings.ObligationNarrativeModeHint", 
        scope: "world",
        config: true,
        type: Boolean,
        default: false
    },
    
    groupObligation: {
        name: "SWERPG.Settings.GroupObligation",
        hint: "SWERPG.Settings.GroupObligationHint",
        scope: "world",
        config: true,
        type: Boolean,
        default: true
    }
};
```

## Conclusion

Le système d'obligations de Star Wars Edge RPG ajoute une dimension narrative riche et imprévisible aux parties. L'implémentation dans Foundry VTT automatise les mécaniques complexes tout en préservant l'aspect narratif essentiel.

Les trois variantes (Obligations, Devoirs, Conflits) offrent des expériences de jeu distinctes qui reflètent les thèmes des différentes gammes de Star Wars, de la criminalité des Bordures Extérieures aux luttes morales des utilisateurs de la Force.