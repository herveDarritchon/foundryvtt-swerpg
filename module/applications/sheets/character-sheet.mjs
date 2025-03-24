import SwerpgBaseActorSheet from "./base-actor-sheet.mjs";
import SkillConfig from "../config/skill.mjs";

/**
 * A SwerpgBaseActorSheet subclass used to configure Actors of the "character" type.
 */
export default class CharacterSheet extends SwerpgBaseActorSheet {

    /** @inheritDoc */
    static DEFAULT_OPTIONS = {
        actor: {
            type: "character"
        },
        position: {
            width: 900,
            height: "auto",
        },
        window: {
            minimizable: true,
            resizable: true,
        },
        actions: {
            editSpecies: CharacterSheet.#onEditSpecies,
            editCareer: CharacterSheet.#onEditCareer,
            editBackground: CharacterSheet.#onEditBackground,
            toggleTrainedSkill: CharacterSheet.#onToggleTrainedSkill,
        }
    };

    static {
        this._initializeActorSheetClass();
    }

    /* -------------------------------------------- */

    /** @override */
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        const {actor: a, source: s, incomplete: i} = context;

        // Expand Context
        Object.assign(context, {
            speciesName: a.system.details.species?.name || game.i18n.localize("SPECIES.SHEET.CHOOSE"),
            careerName: a.system.details.career?.name || game.i18n.localize("CAREER.SHEET.CHOOSE"),
            backgroundName: a.system.details.background?.name || game.i18n.localize("BACKGROUND.SHEET.CHOOSE"),
            talentTreeButtonText: game.system.tree.actor === a ? "Close Talent Tree" : "Open Talent Tree",
            experience: a.system.experience,
        });

        context.skills = CharacterSheet.#prepareSkills(a);
        context.experience.freeSkillRank.available = a.system.experience.freeSkillRank.gained - a.system.experience.freeSkillRank.spent;
        // Incomplete Tasks
        context.points = a.system.points;
        Object.assign(i, {
            species: !s.system.details.species?.name,
            career: !s.system.details.career?.name,
            freeSkill: a.system.experience.freeSkillRank.available !== 0,
            background: !s.system.details.background?.name,
            /*      characteristics: context.points.ability.requireInput,
                  skills: context.points.skill.available,
                  talents: context.points.talent.available,*/
            characteristics: true,
            skills: true,
            talents: true,
        });
        i.creation = i.species || i.career || i.freeSkill || i.background || i.characteristics || i.skills || i.talents;
        if (i.creation) {
            i.creationTooltip = "<p>Character Creation Incomplete!</p><ol>";
            if (i.species) i.creationTooltip += "<li>Select Species</li>";
            if (i.career) i.creationTooltip += "<li>Select Career</li>";
            if (i.freeSkill) i.creationTooltip += "<li>Use Free Skill</li>";
            if (i.background) i.creationTooltip += "<li>Select Background</li>";
            if (i.characteristics) i.creationTooltip += "<li>Spend Ability Points</li>";
            if (i.skills) i.creationTooltip += "<li>Spend Skill Points</li>";
            if (i.talents) i.creationTooltip += "<li>Spend Talent Points</li>";
            i.creationTooltip += "</ol>";
        }


        return context;
    }

    /* -------------------------------------------- */

    /** @override */
    async close(options) {
        await super.close(options);
        await this.actor.toggleTalentTree(false);
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */

    /* -------------------------------------------- */

    /** @override */
    async _onClickAction(event, target) {
        event.preventDefault();
        event.stopPropagation();
        switch (target.dataset.action) {
            case "abilityDecrease":
                return this.actor.purchaseAbility(target.closest(".ability").dataset.ability, -1);
            case "abilityIncrease":
                return this.actor.purchaseAbility(target.closest(".ability").dataset.ability, 1);
            case "skillConfig":
                const skillConfig = new SkillConfig({
                    document: this.actor,
                    skillId: target.closest(".skill").dataset.skill
                })
                await skillConfig.render({force: true});
                break;
            case "skillDecrease":
                return this.actor.purchaseSkill(target.closest(".skill").dataset.skill, -1);
            case "skillIncrease":
                return this.actor.purchaseSkill(target.closest(".skill").dataset.skill, 1);
            case "skillRoll":
                return this.actor.rollSkill(target.closest(".skill").dataset.skill, {dialog: true});
            case "talentTree":
                return this.actor.toggleTalentTree();
            // case "talentReset":
            //   return this.actor.resetTalents();
        }
    }

    /* -------------------------------------------- */

    /**
     * Handle click action to level up.
     * @this {CharacterSheet}
     * @param {PointerEvent} event
     * @returns {Promise<void>}
     */
    static async #onLevelUp(event) {
        game.tooltip.deactivate();
        await this.actor.levelUp(1);
    }

    /* -------------------------------------------- */

    /**
     * Handle click action to choose or edit your Career.
     * @this {CharacterSheet}
     * @param {PointerEvent} event
     * @returns {Promise<void>}
     */
    static async #onToggleTrainedSkill(event) {
        const element = event.target.closest(".skill");
        const skillId = element.dataset.skillId;
        const isCareer = element.dataset.isCareer === "true";
        const skill = foundry.utils.getProperty(this.actor.system.skills, skillId);
        if (!isCareer) {
            ui.notifications.warn("you have to spend a free career skill points first !");
            return;
        }
        console.log(`[Before] onToggleTrainedSkill skill with id '${skillId}', is Career ${isCareer} and values:`, skill, this.actor);
        const rank = foundry.utils.deepClone(skill.rank);
        const freeSkillRank = foundry.utils.deepClone(this.actor.system.experience.freeSkillRank);

        if (event.ctrlKey) {
            rank.free--;
            freeSkillRank.spent--;
// TODO à ajouter pour gérer les trained et non les free from career            rank.trained--;
        } else {
            rank.free++;
            freeSkillRank.spent++;
// TODO à ajouter pour gérer les trained et non les free from career            rank.trained++;
        }

        const value = rank.base + rank.free + rank.trained;
        const freeSkillRankAvailable = freeSkillRank.gained - freeSkillRank.spent;

        if (rank.free < 0) {
            ui.notifications.warn("you can't forget this rank because it comes from species!");
            return;
        }

        if (value < 0) {
            ui.notifications.warn("you can't have less than 0 ranks!");
            return;
        }

        if (value > 2) {
            ui.notifications.warn("you can't have more than 2 ranks during character creation!");
            return;
        }

        if (freeSkillRankAvailable < 0) {
            ui.notifications.warn("you can't have use free skill rank anymore. You have used all!");
            return;
        }

        if (freeSkillRankAvailable > 4) {
            ui.notifications.warn("you can't get more than 4 free skill ranks!");
            return;
        }

        const updateActorResult = await this.actor.update({[`system.skills.${skillId}.rank`]: rank});
        const updateActorResult2 = await this.actor.update({'system.experience.freeSkillRank': freeSkillRank});

        console.log(`[After] onToggleTrainedSkill skill with id '${skillId}', is Career ${isCareer} and values:`, updateActorResult, updateActorResult2, this.actor, rank);

    }

    /* -------------------------------------------- */

    /**
     * Handle click action to choose or edit your Career.
     * @this {CharacterSheet}
     * @param {PointerEvent} event
     * @returns {Promise<void>}
     */
    static async #onEditSpecies(event) {
        await this.actor._viewDetailItem("species", {editable: false});
    }

    /* -------------------------------------------- */

    /**
     * Handle click action to choose or edit your Career.
     * @this {CharacterSheet}
     * @param {PointerEvent} event
     * @returns {Promise<void>}
     */
    static async #onEditCareer(event) {
        await this.actor._viewDetailItem("career", {editable: false});
    }

    /* -------------------------------------------- */

    /**
     * Handle click action to choose or edit your Background.
     * @this {CharacterSheet}
     * @param {PointerEvent} event
     * @returns {Promise<void>}
     */
    static async #onEditBackground(event) {
        await this.actor._viewDetailItem("background", {editable: false});
    }

    /* -------------------------------------------- */
    /*  Drag and Drop                               */

    /* -------------------------------------------- */

    /** @inheritDoc */
    async _onDropItem(event, item) {
        if (!this.actor.isOwner) return;
        switch (item.type) {
            case "species":
                await this.actor.system.applySpecies(item);
                return;
            case "career":
                await this.actor.system.applyCareer(item);
                return;
            case "background":
                await this.actor.system.applyBackground(item);
                return;
            case "spell":
                try {
                    this.actor.canLearnIconicSpell(item);
                } catch (err) {
                    ui.notifications.warn(err.message);
                    return;
                }
                break;
            case "talent":
                ui.notifications.error("Talents can only be added to a protagonist Actor via the Talent Tree.");
                return;
        }
        return super._onDropItem(event, item);
    }

    /* -------------------------------------------- */

    /**
     * Prepare the skills for the context
     * @returns {undefined}
     */
    static #prepareSkills(actor) {
        const skills = Object.entries(actor.system.skills).map(([k, v]) => (
            {
                id: k,
                ...v,
                ...SYSTEM.SKILLS[k]
            })
        )
            .map(skill => {
                const total = skill.rank.base + skill.rank.free + skill.rank.trained;
                const skillEnriched = foundry.utils.mergeObject(skill, {rank: {value: total}});
                return {
                    pips: this._prepareSkillRanks(skillEnriched),
                    career: this._prepareCareerFreeSkill(actor, skill.id),
                    ...skillEnriched
                }
            });

        const skillsByType = Object.groupBy(skills, (skill) => skill.type.id);

        // Sort and return the skills
        return Object.fromEntries(
            Object.entries(skillsByType).map(([type, skillGroup]) => {
                skillGroup.sort((a, b) => a.label.localeCompare(b.label));
                return [type, skillGroup];
            })
        );
    }

    /**
     * Prepare the skill Ranks for the context
     * If skill rank is equal or greater of the current pip value then it is filled otherwise it is empty
     * @returns {undefined}
     */
    static _prepareSkillRanks(skill) {
        return Array.from({length: 5}, (_, i) => ({
            cssClass: i < skill.rank.value ? "trained" : "untrained"
        }));
    }

    /**
     * Prepare the skill Ranks for the context
     * @returns {undefined}
     */
    static _prepareCareerFreeSkill(actor, skillKey) {
        const mayBeASkill = actor.system.details.career?.careerSkills.find(skill => skill.id === skillKey);
        return {
            label: mayBeASkill ? "X" : "",
            name: mayBeASkill ? actor.system.details.career.name : "-",
            isCareer: !!mayBeASkill,
        };
    }
}
