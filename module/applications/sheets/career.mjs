import SwerpgBaseItemSheet from "./base-item.mjs";

/**
 * A SwerpgBaseItemSheet subclass used to configure Items of the "ancestry" type.
 */
export default class CareerSheet extends SwerpgBaseItemSheet {

    /** @inheritDoc */
    static DEFAULT_OPTIONS = {
        item: {
            type: "career"
        },
        position: {
            width: 600,
            height: "auto",
        },
        window: {
            minimizable: true,
            resizable: true,
        },
        actions: {
            toggleCareer: CareerSheet.#onToggleCareerSkill,
        }
    };

    // Initialize subclass options
    static {
        this._initializeItemSheetClass()
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        context.careerSkills = this.#prepareCareerSkills(context);
        context.selectedSkills = context.careerSkills.filter(skill => skill.isActive).length;
        return context;
    }

    /**
     * Prepare the career skills for the context
     * @param context {Object} The context to prepare
     * @returns {*[]} The prepared career skills
     */
    #prepareCareerSkills(context) {
        const careerSkillIds = context.source.system.careerSkills.map(skill => skill.id);
        const skills = Object.keys(SYSTEM.SKILLS);
        return skills
            .map((skillId) => {
                const skill = SYSTEM.SKILLS[skillId];
                let isActive = careerSkillIds.includes(skillId);
                skill.isActive = isActive;
                skill.extraCss = isActive ? "active" : "inactive";
                return skill;
            })
            .sort((a, b) => a.label.localeCompare(b.label));

    }

    /* -------------------------------------------- */

    /**
     * @this {SwerpgBaseActorSheet}
     * @param {PointerEvent} event
     * @returns {Promise<void>}
     */
    static async #onToggleCareerSkill(event) {
        let careerElement = event.target.closest(".career");
        const skillId = careerElement.dataset.actionId;
        const skillState = careerElement.dataset.actionIsActive === "true";
        if (!skillState) {
            await CareerSheet.addCareerSkill(this.document, skillId);
        } else {
            await CareerSheet.removeCareerSkill(this.document, skillId);
        }
    }

    /* -------------------------------------------- */
    /**
     * Add a skill to the career skill list.
     * @param document {SwerpgItem} The document to toggle the skill on
     * @param skillId {string} The skill id to toggle
     * @returns {Promise<void>} A promise that resolves when the skill has been added
     */
    static async addCareerSkill(document, skillId) {
        document.system.careerSkills.push({id: skillId});
        await document.update({"system.careerSkills": document.system.careerSkills});
    }

    /* -------------------------------------------- */

    /**
     * Remove a skill from the career skill list.
     * @param document {SwerpgItem} The document to toggle the skill on
     * @param skillId {string} The skill id to toggle
     * @returns {Promise<void>} A promise that resolves when the skill has been removed
     */
    static async removeCareerSkill(document, skillId) {
        document.system.careerSkills = document.system.careerSkills.filter(skill => skill.id !== skillId);
        await document.update({"system.careerSkills": document.system.careerSkills});
    }

    /* -------------------------------------------- */

    /** @override */
    _processFormData(event, form, formData) {
        const submitData = super._processFormData(event, form, formData);
        return submitData;
    }
}
