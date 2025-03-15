import SwerpgBaseItemSheet from "./base-item.mjs";
import {shiftValue} from "../../utils/attributes.mjs";
import SwerpgOrigin from "../../models/origin.mjs";

/**
 * A SwerpgBaseItemSheet subclass used to configure Items of the "origin" type.
 */
export default class OriginSheet extends SwerpgBaseItemSheet {

    /** @inheritDoc */
    static DEFAULT_OPTIONS = {
        item: {
            type: "origin"
        }
    };

    // Initialize subclass options
    static {
        this._initializeItemSheetClass()
    }

    /** @inheritDoc */
    async _prepareContext(options) {
        console.log("origin options", options);
        const context = await super._prepareContext(options);
        console.log("origin context", context);
        const draftSkillId = context.source.system.skillModifierDraft.skillId;
        const skillModifierDraftValue = context.source.system.skillModifierDraft.modifierValue ?? 0;
        let remainingSkills = this.#filterSkillsAlreadyUsed(context.source.system.skills);
        let assign = Object.assign(context, {
            remainingSkills: remainingSkills,
            hasSkillModifiers: context.source.system.skills.length > 0,
            addIsDisabled: skillModifierDraftValue === 0,
            skillModifierDraft: {
                skillId: {
                    field: context.fields.skillModifierDraft.fields.skillId,
                    value: this.#isEmpty(draftSkillId) ? remainingSkills[0].id : draftSkillId
                },
                modifierValue: {
                    field: context.fields.skillModifierDraft.fields.modifierValue,
                    value: skillModifierDraftValue
                }
            },
            skillTags: context.source.system.skills.map(skill => this.#prepareSkillModifierTag(skill.skillId, skill.modifier)),
            secondaryAttributes: Object.values(SYSTEM.SECONDARY_ATTRIBUTES).map(secondaryAttribute => ({
                field: context.fields.secondaryAttributes.fields[secondaryAttribute.id],
                id: secondaryAttribute.id,
                label: secondaryAttribute.label,
                value: context.source.system.secondaryAttributes[secondaryAttribute.id]
            }))
        });
        console.log("origin assign", assign);
        return assign;
    }

    async _onClickAction(event, target) {
        const action = target.dataset.action;
        const form = this.form;
        const initialValue = this.item.system.skillModifierDraft.modifierValue;
        const skill = this.item.system.skillModifierDraft.skillId;
        let newValue = initialValue;
        switch (action) {
            case "add-skill":
                console.log("add-skill", form, this);
                let skillsToBeAdded = this.item.system.skills;
                skillsToBeAdded.push({skillId: skill, modifier: initialValue});
                const originAfterAdd = await this.#addSkillToOrigin(skillsToBeAdded);
                await this.#reinitializeSkillModifierDraft();

                console.log("[add-skill] - Origin after Added Tag ", originAfterAdd);
                break;
            case "decrease-skill-modification":
                console.log("decrease-skill-modification", form, this);
                newValue = shiftValue(initialValue, -SwerpgOrigin.MODIFIER_STEP, SwerpgOrigin.MODIFIER_MIN_VALUE, SwerpgOrigin.MODIFIER_MAX_VALUE);
                await this.item.update({"system.skillModifierDraft.modifierValue": newValue});
                break;
            case "increase-skill-modification":
                console.log("increase-skill-modification", form, this);
                newValue = shiftValue(initialValue, SwerpgOrigin.MODIFIER_STEP, SwerpgOrigin.MODIFIER_MIN_VALUE, SwerpgOrigin.MODIFIER_MAX_VALUE);
                await this.item.update({"system.skillModifierDraft.modifierValue": newValue});
                break;
            case "delete-skill-tag":
                console.log("delete-skill-tag", form, this);
                const skillId = event.target.closest("[data-item-id]").dataset.itemId;
                let skillsWithOutDeletedSkill = this.item.system.skills.filter(skill => skill.skillId !== skillId);
                const originAfterDelete = await this.#addSkillToOrigin(skillsWithOutDeletedSkill);
                console.log("[delete-skill-tag] - Origin after Deleted Tag ", originAfterDelete);
                break;
            /*                const actor = game.actors.get(rollData.actorId);
                            ui.notifications.info(`Requested a ${rollData.type} check be made by ${actor.name}.`);
                            return this.close();*/
        }
    }

    /* ------------------ Override -------------------------- */

    /** @override */
    _processFormData(event, form, formData) {
        const submitData = super._processFormData(event, form, formData);

        // Only allow (primary,secondary) or (resistance,vulnerability) to be submitted if both are defined
        /*    const pairs = [["primary", "secondary"], ["resistance", "vulnerability"]];
            for ( const [a, b] of pairs ) {
              if ( !(submitData.system[a] && submitData.system[b]) ) {
                delete submitData.system[a];
                delete submitData.system[b];
              }
            }*/
        return submitData;
    }

    /* ---------------- Convenient Functions ---------------------------- */

    /**
     * Prepare a single skill for the Origin Item.
     * @param skillId {string} The skill ID
     * @param modifierValue {number} The modifier value
     * @returns {{skill: *, modifier: string}} The prepared skill modifier tag
     */
    #prepareSkillModifierTag(skillId, modifierValue) {
        const skill = SYSTEM.SKILLS[skillId];
        const sign = modifierValue >= 0 ? "+" : "";
        const modifier = `${sign}${modifierValue}%`;
        return {
            skill,
            modifier
        };
    }

    /**
     * Add the provided skills to the Origin
     * @param skills {Array} The new skills to be saved to the Origin Item
     * @returns {Promise<SwerpgOrigin>} A Promise that resolves once the skills have been saved to the Origin Item
     */
    async #addSkillToOrigin(skills) {
        const updateData = {
            system: {
                skills
            }
        }
        return await this.item.update(updateData);
    }

    /**
     * Filter the skills that have already been used in the Origin
     * @param skills {Array} The skills that exists in the Origin
     * @returns {Array} The skills that have not been used in the Origin
     */
    #filterSkillsAlreadyUsed(skills) {
        return Object.values(SYSTEM.SKILLS).filter(skill => !skills.find(s => s.skillId === skill.id));
    }

    /**
     * Reinitialize the Skill Modifier Draft to its default values,
     * which is the first skill in the list of skills that have not been used
     * and a modifier value of 0.
     * @returns {Promise<*>}
     */
    async #reinitializeSkillModifierDraft() {
        const used = this.#filterSkillsAlreadyUsed(this.item.system.skills);

        const updateData = {
            system: {
                skillModifierDraft: {
                    skillId: used[0].id,
                    modifierValue: 0
                }
            }
        }
        return await this.item.update(updateData);
    }

    /**
     * Check if the skillId is empty or not.
     * @param skillId {string} The skill ID
     * @returns {boolean} True if the skillId is empty, false otherwise
     */
    #isEmpty(skillId) {
        return skillId === undefined || skillId === null || skillId.trim() === "";
    }
}
