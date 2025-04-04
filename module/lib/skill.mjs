/**
 * @typedef {Object} Skill
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

/**
 * @typedef {Object} SkillResult
 * @property {boolean} success - Indicates whether the skill creation was successful.
 * @property {CareerFreeSkill|SpecializationFreeSkill|TrainedSkill|ErrorSkill} [data] - The created skill instance.
 * @property {string|null} [error] - An error message if skill creation failed.
 */


class SkillFactory {

    /**
     * Builds a skill object based on a context.
     * @param actor {SwerpgActor} an Actor instance
     * @param skill {Skill} a skill from the list of skills
     * @param params {SkillParams} the params to be used to build the skill
     * @param options {SkillOptions} additional options
     * @returns {CareerFreeSkill|SpecializationFreeSkill|TrainedSkill|FreeSkill|ErrorSkill} a skill object
     */
    static build(
        actor,
        skill,
        {
            action /** @type {"train" | "forget"} */ = ("train"),
            isCreation = false,
            isCareer = false,
            isSpecialization = false
        } = {},
        options = {}) {

        if (!isCreation) {
            return new TrainedSkill(actor, skill, {action, isCreation, isCareer, isSpecialization}, options);
        }

        if (!isCareer && !isSpecialization) {
            return new ErrorSkill(actor, skill, {action, isCreation, isCareer, isSpecialization}, options);
        }

        if (isCareer && isSpecialization) {
            return SkillFactory._buildCareerOrSpecialization(actor, skill, action, options);
        }

        if (isCareer) {
            return new CareerFreeSkill(actor, skill, {action, isCreation, isCareer, isSpecialization}, options);
        }

        if (isSpecialization) {
            return new SpecializationFreeSkill(actor, skill, {action, isCreation, isCareer, isSpecialization}, options);
        }
    }

    static _buildCareerOrSpecialization(actor, skill, action, options) {
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
            const specializationAvailable = freeSkillRanks.specialization.gained - freeSkillRanks.specialization.spent;
            if (freeSkillRanks.specialization.gained - freeSkillRanks.specialization.spent > 0) {
                return new SpecializationFreeSkill(
                    actor,
                    skill, {
                        action,
                        isCreation: true,
                        isCareer: true,
                        isSpecialization: false
                    }, options);
            }
            options.message = "you can't use free skill rank anymore. You have used all!"
            return new ErrorSkill(actor, skill, {
                action,
                isCreation: true,
                isCareer: true,
                isSpecialization: true
            }, options);
        }

        if (action === "forget") {
            if (freeSkillRanks.specialization.spent > 0) {
                return new SpecializationFreeSkill(
                    actor,
                    skill, {
                        action,
                        isCreation: true,
                        isCareer: true,
                        isSpecialization: false
                    }, options);
            }
            if (freeSkillRanks.career.spent > 0) {
                return new CareerFreeSkill(
                    actor,
                    skill, {
                        action,
                        isCreation: true,
                        isCareer: true,
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
        options.message = "you can't forget this rank because it comes from species!"
        return new ErrorSkill(skill, {action, isCreation: true, isCareer: true, isSpecialization: true}, options);


    }
}

class Skill {
    constructor(actor, skill, params, options) {
        this.actor = actor;
        this.skill = skill;
        this.isCreation = params.isCreation;
        this.isCareer = params.isCareer;
        this.isSpecialization = params.isSpecialization;
        this.action = params.action;
        this.options = options;
    }

    /**
     * Validates if the skill with the action and the phase are valid together.
     */
    isValid() {
        throw new Error("Method 'method1()' must be implemented.");
    }

    /**
     * Processes the action on the skill.
     */
    async process() {
        const updateActorResult = await this.actor.update({[`system.skills.${skillId}.rank`]: rank});
        const updateActorResult2 = await this.actor.update({'system.progression.freeSkillRanks': freeSkillRanks});
        console.log(`[After] onToggleTrainedSkill skill with id '${skillId}', is Career ${isCareer} and values:`, updateActorResult, updateActorResult2, this.actor, rank);
    }

    /**
     * Processes the action on the skill.
     * @abstract
     * return {SkillResult} the result of the action
     */
    train() {
        throw new Error("Method 'method2()' must be implemented.");
    }

    /**
     * Processes the action on the skill.
     * @abstract
     * return {SkillResult} the result of the action
     */
    forget() {
        throw new Error("Method 'method2()' must be implemented.");
    }
}

class CareerFreeSkill extends Skill {
    constructor(actor, skill, params, options) {
        super(actor, skill, params, options);
    }

    /**
     * @inheritDoc
     * @override
     */
    isValid() {
        if (!this.isCreation) {
            return false;
        }
    }

    /**
     * @inheritDoc
     * @override
     */
    train() {
        this.skill.rank.careerFree++;
        this.actor.freeSkillRanks.career.spent++;
        return this;
    }

    /**
     * @inheritDoc
     * @override
     */

    forget() {
        this.skill.rank.careerFree--;
        this.actor.freeSkillRanks.career.spent--;
        return this;
    }
}

class SpecializationFreeSkill extends Skill {
    constructor(actor, skill, params, options) {
        super(actor, skill, params, options);
    }

    /**
     * @inheritDoc
     * @override
     */
    isValid() {
        if (!this.isCreation) {
            return false;
        }
    }

    /**
     * @inheritDoc
     * @override
     */
    train() {
        this.skill.rank.specializationFree++;
        this.actor.freeSkillRanks.specialization.spent++;
    }

    /**
     * @inheritDoc
     * @override
     */

    forget() {
        this.skill.rank.specializationFree--;
        this.actor.freeSkillRanks.specialization.spent--;
    }

}

class TrainedSkill extends Skill {
    constructor(actor, skill, params, options) {
        super(actor, skill, params, options);
    }

    /**
     * @inheritDoc
     * @override
     */
    isValid() {
        return true;
    }

    /**
     * @inheritDoc
     * @override
     */
    process() {
        console.log("Process not implemented.");
    }

    /**
     * @inheritDoc
     * @override
     */
    train() {
        console.log("Train not implemented.");
    }

    /**
     * @inheritDoc
     * @override
     */

    forget() {
        console.log("Forget not implemented.");
    }

}

class ErrorSkill extends Skill {
    constructor(actor, skill, params, options) {
        super(actor, skill, params, options);
    }

    /**
     * @inheritDoc
     * @override
     */
    isValid() {
        return false;
    }

    /**
     * @inheritDoc
     * @override
     */
    process() {
        console.log("Process not implemented.");
    }

    /**
     * @inheritDoc
     * @override
     */
    train() {
        console.log("Train not implemented.");
    }

    /**
     * @inheritDoc
     * @override
     */

    forget() {
        console.log("Forget not implemented.");
    }
}

export {
    Skill,
    CareerFreeSkill,
    SpecializationFreeSkill,
    TrainedSkill,
    SkillFactory
}