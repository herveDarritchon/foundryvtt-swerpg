import CareerFreeSkill from "./career-free-skill.mjs";
import SpecializationFreeSkill from "./specialization-free-skill.mjs";
import TrainedSkill from "./trained-skill.mjs";
import ErrorSkill from "./error-skill.mjs";

/**
 * @typedef {Object} Skill
 * @property {SwerpgActor} actor - The actor instance.
 * @property {Skill} skill - The skill instance.
 * @property {boolean} isCreation - Indicates if the skill is in the creation phase.
 * @property {boolean} isCareer - Indicates if the skill is a career skill.
 * @property {boolean} isSpecialization - Indicates if the skill is a specialization skill.
 * @property {string} action - The action to be performed on the skill.
 * @property {SkillOptions} options - Additional options for the skill.
 * @property {boolean} evaluated - Indicates if the skill has been evaluated.
 *
 **/

/**
 * @typedef {Object} SkillOptions
 **/

/**
 * @typedef {Object} SkillParams
 * @property {"train" | "forget"} action the action to be performed on the skill
 * @property {boolean} isCreation whether we are in the creation process phase
 * @property {boolean} [isCareer=false] - Indicates if this is a career skill.
 * @property {boolean} [isSpecialization=false] - Indicates if this is a specialization skill.
 */

export default class SkillFactory {

    /**
     * Builds a skill object based on a context.
     * @param actor {SwerpgActor} an Actor instance
     * @param skillId {string} a skill id from the list of skills
     * @param params {SkillParams} the params to be used to build the skill
     * @param options {SkillOptions} additional options
     * @returns {CareerFreeSkill|SpecializationFreeSkill|TrainedSkill|ErrorSkill} a skill object
     */
    static build(
        actor,
        skillId,
        {
            action /** @type {"train" | "forget"} */ = ("train"),
            isCreation = false,
            isCareer = false,
            isSpecialization = false
        } = {},
        options = {}) {

        const skill = foundry.utils.getProperty(actor.system.skills, skillId);
        skill.id = skillId;

        if (!isCreation) {
            return new TrainedSkill(actor, skill, {action, isCreation, isCareer, isSpecialization}, options);
        }

        if (!isCareer && !isSpecialization) {
            if (SkillFactory.#hasCareerFreeSkill(actor) || SkillFactory.#hasSpecializationFreeSkill(actor)) {
                options.message = "you have to spend free skill points first during character creation!";
                return new ErrorSkill(actor, skill, {action, isCreation, isCareer, isSpecialization}, options);
            } else {
                return new TrainedSkill(actor, skill, {action, isCreation, isCareer, isSpecialization}, options);
            }
        }

        if (isCareer && isSpecialization) {
            return SkillFactory.#buildCareerOrSpecialization(actor, skill, action, options);
        }

        if (isCareer) {
            return new CareerFreeSkill(actor, skill, {action, isCreation, isCareer, isSpecialization}, options);
        }

        if (isSpecialization) {
            return new SpecializationFreeSkill(actor, skill, {action, isCreation, isCareer, isSpecialization}, options);
        }
    }

    static #hasCareerFreeSkill(actor) {
        return actor.freeSkillRanks.career.available > 0;
    }

    static #hasSpecializationFreeSkill(actor) {
        return actor.freeSkillRanks.specialization.available > 0;
    }

    /**
     * Build a skill object based on a context.
     * @param actor {SwerpgActor} an Actor instance
     * @param skill {Skill} a skill object
     * @param action {string} the action to be performed on the skill
     * @param options {SkillOptions} additional options
     * @returns {CareerFreeSkill|SpecializationFreeSkill|TrainedSkill|ErrorSkill} a skill object
     * @private
     * @static
     */
    static #buildCareerOrSpecialization(actor, skill, action, options) {
        if (action === "train") {
            const freeSkillRanks = foundry.utils.deepClone(actor.freeSkillRanks);
            if (freeSkillRanks.career.gained - freeSkillRanks.career.spent > 0) {
                return new CareerFreeSkill(
                    actor,
                    skill, {
                        action,
                        isCreation: true,
                        isCareer: true,
                        isSpecialization: false
                    }, options);
            }
            if (freeSkillRanks.specialization.gained - freeSkillRanks.specialization.spent > 0) {
                return new SpecializationFreeSkill(
                    actor,
                    skill, {
                        action,
                        isCreation: true,
                        isCareer: false,
                        isSpecialization: true
                    }, options);
            }
            return new TrainedSkill(
                actor,
                skill, {
                    action,
                    isCreation: true,
                    isCareer: false,
                    isSpecialization: false
                }, options);
        }

        if (action === "forget") {
            const freeSkillRanks = foundry.utils.deepClone(actor.freeSkillRanks);
            if (skill.rank.specializationFree > 0 && freeSkillRanks.specialization.spent > 0) {
                return new SpecializationFreeSkill(
                    actor,
                    skill, {
                        action,
                        isCreation: true,
                        isCareer: true,
                        isSpecialization: false
                    }, options);
            }
            if (skill.rank.careerFree > 0 && freeSkillRanks.career.spent > 0) {
                return new CareerFreeSkill(
                    actor,
                    skill, {
                        action,
                        isCreation: true,
                        isCareer: true,
                        isSpecialization: false
                    }, options);
            }
            if (skill.rank.trained > 0 && actor.experiencePoints.spent > 0) {
                return new TrainedSkill(
                    actor,
                    skill, {
                        action,
                        isCreation: true,
                        isCareer: false,
                        isSpecialization: false
                    }, options);
            }
            options.message = "you can't forget this rank because it comes from species!"
            return new ErrorSkill(actor, skill, {
                action,
                isCreation: true,
                isCareer: true,
                isSpecialization: true
            }, options);
        }
    }
}
