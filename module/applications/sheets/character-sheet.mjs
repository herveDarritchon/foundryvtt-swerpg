import SwerpgBaseActorSheet from "./base-actor-sheet.mjs";
import SkillConfig from "../config/skill.mjs";
import SkillFactory from "../../lib/skills/skill-factory.mjs";
import ErrorSkill from "../../lib/skills/error-skill.mjs";
import TalentFactory from "../../lib/talents/talent-factory.mjs";
import ErrorTalent from "../../lib/talents/error-talent.mjs";

/**
 * @typedef {Object} TalentTag
 * Represents a visual tag or label associated with a talent.
 *
 * @property {string} label - The visible label of the tag (e.g., "Active", "Ranked", "Combat").
 * @property {string} [cssClass] - Optional CSS class for styling the tag (e.g., "tag-active", "tag-passive").
 * @property {string} [tooltip] - Optional tooltip text for the tag.
 */

/**
 * @typedef {Object} TalentDisplayData
 * Represents the data structure used to render a talent on the character sheet.
 *
 * @property {string} id - Unique ID of the Talent Item.
 * @property {string} name - Name of the talent.
 * @property {string} img - Image path used for the talent icon.
 * @property {string} [cssClass] - Optional CSS class applied to the container (e.g., "highlighted", "disabled").
 * @property {boolean} isFree - Indicates if the talent is free by any mean.
 * @property {TalentTag[]} tags - List of tags to display under the talent.
 */

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
            editSpecializations: CharacterSheet.#onEditSpecializations,
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
            specializationName: Array.from(a.system.details.specializations)[0]?.name || game.i18n.localize("SPECIALIZATION.SHEET.CHOOSE"),
            backgroundName: a.system.details.background?.name || game.i18n.localize("BACKGROUND.SHEET.CHOOSE"),
            talentTreeButtonText: game.system.tree.actor === a ? "Close Talent Tree" : "Open Talent Tree",
            experience: a.system.experience,
        });

        context.skills = CharacterSheet.#prepareSkills(a);
        context.progression.freeSkillRanks.career.available = a.system.progression.freeSkillRanks.career.gained - a.system.progression.freeSkillRanks.career.spent;
        context.progression.freeSkillRanks.specialization.available = a.system.progression.freeSkillRanks.specialization.gained - a.system.progression.freeSkillRanks.specialization.spent;
        // Incomplete Tasks
        context.points = a.system.points;

        Object.assign(i, {
            species: !s.system.details.species?.name,
            career: !s.system.details.career?.name,
            specialization: s.system.details.specializations?.length === 0,
            freeSkill: a.hasFreeSkillsAvailable(),
            background: !s.system.details.background?.name,
            characteristics: true,
            skills: true,
            talents: true,
        });
        i.creation = i.species || i.career || i.freeSkill || i.specialization || i.background || i.characteristics || i.skills || i.talents;
        if (i.creation) {
            i.creationTooltip = "<p>Character Creation Incomplete!</p><ol>";
            if (i.species) i.creationTooltip += "<li>Select Species</li>";
            if (i.career) i.creationTooltip += "<li>Select Career</li>";
            if (i.specialization) i.creationTooltip += "<li>Select Specialization</li>";
            if (i.freeSkill) i.creationTooltip += "<li>Use Free Skill</li>";
            if (i.background) i.creationTooltip += "<li>Select Background</li>";
            if (i.characteristics) i.creationTooltip += "<li>Spend Ability Points</li>";
            if (i.skills) i.creationTooltip += "<li>Spend Skill Points</li>";
            if (i.talents) i.creationTooltip += "<li>Spend Talent Points</li>";
            i.creationTooltip += "</ol>";
        }

        context.talents = this.#buildTalentList();

        console.debug("[CharacterSheet] context", context);
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
            case "characteristicDecrease":
                return this.actor.purchaseCharacteristic(target.closest(".characteristic-wrapper").dataset.characteristic, 'forget');
            case "characteristicIncrease":
                return this.actor.purchaseCharacteristic(target.closest(".characteristic-wrapper").dataset.characteristic, 'train');
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
        // Iniitialize the context depending on the event
        const element = event.target.closest(".skill");
        const skillId = element.dataset.skillId;
        const isCareer = element.dataset.isCareer === "true";
        const isSpecialization = element.dataset.isSpecialization === "true";
        const action = event.ctrlKey ? "forget" : "train";

        // Build the skill class depending on the context
        const skillClass = SkillFactory.build(this.actor, skillId, {
            action,
            isCreation: true,
            isCareer,
            isSpecialization
        }, {});

        if (skillClass instanceof ErrorSkill) {
            ui.notifications.warn(skillClass.options.message);
            return;
        }

        console.debug(`[Before] onToggleTrainedSkill skill with id '${skillId}', is Career ${isCareer} and values:`, skillClass, this.actor);

        // Evaluate the skill following the action processed
        const skillEvaluated = skillClass.process();

        // Display a warning if the skill action is not valid
        if (skillEvaluated instanceof ErrorSkill) {
            ui.notifications.warn(skillEvaluated.options.message);
            return;
        }

        // Update the skill state in the Database
        const skillUpdated = await skillEvaluated.updateState();

        console.debug(`[After] onToggleTrainedSkill skill with id '${skillId}', is Career ${isCareer} and values:`, skillUpdated.actor, skillUpdated.data.rank);
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
    static async #onEditSpecializations(event) {
        await this.actor._viewDetailItem("specialization", {editable: false});
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
            case "specialization":
                await this.actor.system.applySpecialization(item);
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
                // Build the skill class depending on the context
                const talentClass = TalentFactory.build(this.actor, item, {
                    action: "train",
                    isCreation: true,
                }, {});

                if (talentClass instanceof ErrorTalent) {
                    ui.notifications.warn(talentClass.options.message);
                    return;
                }

                console.debug(`[Before] onToggleTrainedTalent talent ('${talentClass}') with id '${item.id}', is Career ${item.system.isRanked} and values:`, this.actor, item.system.rank);

                // Evaluate the talent following the action processed
                const talentEvaluated = talentClass.process();

                // Display a warning if the talent action is not valid
                if (talentEvaluated instanceof ErrorTalent) {
                    ui.notifications.warn(talentEvaluated.options.message);
                    return;
                }

                // Update the talent state in the Database
                const talentUpdated = await talentEvaluated.updateState();

                // Display a warning if the talent action is not valid
                if (talentUpdated instanceof ErrorTalent) {
                    ui.notifications.warn(talentUpdated.options.message);
                    return;
                }

                console.debug(`[After] onToggleTrainedTalent talent with id '${talentUpdated.data.id}', is ranked ${talentUpdated.data.system.isRanked} and values:`, talentUpdated.actor, talentUpdated.data.system.rank);

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
                const total = skill.rank.base + skill.rank.careerFree + skill.rank.specializationFree + skill.rank.trained;
                const skillEnriched = foundry.utils.mergeObject(skill, {rank: {value: total}});
                return {
                    pips: this._prepareSkillRanks(skillEnriched),
                    freeRank: this._prepareFreeSkill(actor, skill.id),
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
    static _prepareFreeSkill(actor, skillKey) {
        const specializationFreeSkills = Array.from(actor.system.details.specializations)
            .flatMap(specialization => Array.from(specialization.specializationSkills
                .map(skill => {
                    return {
                        id: skill.id,
                        parent: specialization.name,
                        type: "specialization"
                    }
                })));
        const careerFreeSkills = Array.from(actor.system.details.career?.careerSkills).map(skill => {
            return {
                id: skill.id,
                parent: actor.system.details.career.name,
                type: "career"
            }
        });

        const freeSkills = specializationFreeSkills.concat(careerFreeSkills);

        const mayBeAFreeSkill = freeSkills.filter(skill => skill.id === skillKey)

        return {
            extraClass: mayBeAFreeSkill.length ? "active" : "",
            name: mayBeAFreeSkill.length ? mayBeAFreeSkill.map(skill => skill.parent).join(", ") : "",
            isCareer: mayBeAFreeSkill.length !== 0 && mayBeAFreeSkill.filter(skill => skill.type === "career").length > 0,
            isSpecialization: mayBeAFreeSkill.length !== 0 && mayBeAFreeSkill.filter(skill => skill.type === "specialization").length > 0,
        };
    }

    /**
     * Builds the display-ready data for a talent item.
     * @param {Item} item - A Foundry VTT Item of type "talent".
     * @returns {TalentDisplayData}
     */
    #buildTalentDisplayData(item) {
        const tags = this.#buidTags(item);

        return {
            id: item.id,
            name: item.name,
            img: item.img,
            isFree: item.system.isFree,
            cssClass: item.system.disabled ? "disabled" : "",
            tags,
            rank: "-"
        };
    }


    /**
     * Builds the tags for a talent item.
     * @param item {Item} - A Foundry VTT Item of type "talent".
     * @returns {*[]} A list of tags to display under the talent.
     */
    #buidTags(item) {
        const tags = [];

        if (item.system.activation === "active") {
            tags.push({label: "Active", cssClass: "tag-active"});
        } else {
            tags.push({label: "Passive", cssClass: "tag-passive"});
        }

        if (item.system.isRanked) {
            tags.push({label: "Ranked"});
        }

        if (item.system.category) {
            tags.push({label: item.system.category});
        }

        if (item.system.isFree) {
            tags.push({label: "Species", cssClass: "tag-free", tooltip: "Talent is free thanks to the Species"});
        }
        return tags;
    }

    /**
     * Builds a list of talents for the character sheet.
     * @returns {TalentDisplayData[]}
     */
    #buildTalentList() {
        const simpleTalents = this.actor.items.filter(item => item.type === 'talent' & !item.system.isRanked);
        const rankedTalents = this.actor.items.filter(item => item.type === 'talent' && item.system.isRanked);
        const rankedTalentsData = this.#buildAggregateTalentDisplayData(rankedTalents);
        const simpleTalentsData = simpleTalents.map(talent => this.#buildTalentDisplayData(talent));

        return simpleTalentsData.concat(rankedTalentsData);
    }

    #buildAggregateTalentDisplayData(talents) {
        const groupedByName = talents.reduce((acc, talent) => {
            const key = talent.name;
            if (!acc[key]) acc[key] = [];
            acc[key].push(talent);
            return acc;
        }, {});
        return Object.entries(groupedByName).map(([name, group], index) => {
            // Trouver le talent avec le rank maximal
            const maxRankTalent = group.reduce((a, b) => (a.idx > b.idx ? a : b));

            // Exemple de génération de tags — à adapter à ton système
            const tags = this.#buidTags(maxRankTalent); // ← Ajoute ici une logique si nécessaire

            return {
                id: maxRankTalent.id,
                name: maxRankTalent.name,
                img: maxRankTalent.img,
                isFree: maxRankTalent.system.isFree,
                cssClass: maxRankTalent.system.disabled ? "disabled" : "",
                tags,
                rank: maxRankTalent.system.rank.idx
            };
        });
    }
}
