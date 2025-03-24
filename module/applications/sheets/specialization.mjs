import SwerpgBaseItemSheet from "./base-item.mjs";

/**
 * A SwerpgBaseItemSheet subclass used to configure Items of the "ancestry" type.
 */
export default class SpecializationSheet extends SwerpgBaseItemSheet {

    /** @inheritDoc */
    static DEFAULT_OPTIONS = {
        item: {
            type: "specialization"
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
            toggleSpecialization: SpecializationSheet.#onToggleSpecializationSkill,
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
        context.specializationSkills = this.#prepareSpecializationSkills(context);
        context.selectedSkills = context.specializationSkills.filter(skill => skill.isActive).length;
        return context;
    }

    /**
     * Prepare the specialization skills for the context
     * @param context {Object} The context to prepare
     * @returns {*[]} The prepared specialization skills
     */
    #prepareSpecializationSkills(context) {
        const specializationSkillIds = context.source.system.specializationSkills.map(skill => skill.id);
        const skills = Object.keys(SYSTEM.SKILLS);
        return skills
            .map((skillId) => {
                const skill = SYSTEM.SKILLS[skillId];
                let isActive = specializationSkillIds.includes(skillId);
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
    static async #onToggleSpecializationSkill(event) {
        let specializationElement = event.target.closest(".specialization");
        const skillId = specializationElement.dataset.actionId;
        const skillState = specializationElement.dataset.actionIsActive === "true";
        if (!skillState) {
            await SpecializationSheet.addSpecializationSkill(this.document, skillId);
        } else {
            await SpecializationSheet.removeSpecializationSkill(this.document, skillId);
        }
    }

    /* -------------------------------------------- */
    /**
     * Add a skill to the specialization skill list.
     * @param document {SwerpgItem} The document to toggle the skill on
     * @param skillId {string} The skill id to toggle
     * @returns {Promise<void>} A promise that resolves when the skill has been added
     */
    static async addSpecializationSkill(document, skillId) {
        const skillSet = new Set();
        document.system.specializationSkills.forEach(skill => skillSet.add({id: skill.id}));
        skillSet.add({id: skillId});
        await document.update({"system.specializationSkills": skillSet});
    }

    /* -------------------------------------------- */

    /**
     * Remove a skill from the specialization skill list.
     * @param document {SwerpgItem} The document to toggle the skill on
     * @param skillId {string} The skill id to toggle
     * @returns {Promise<void>} A promise that resolves when the skill has been removed
     */
    static async removeSpecializationSkill(document, skillId) {
        const skillSet = new Set();
        document.system.specializationSkills.forEach(skill => {
            if (skill.id !== skillId) {
                skillSet.add({id: skill.id})
            }
        });
        await document.update({"system.specializationSkills": skillSet});
    }

    /* -------------------------------------------- */

    /** @override */
    _processFormData(event, form, formData) {
        const submitData = super._processFormData(event, form, formData);
        return submitData;
    }
}
