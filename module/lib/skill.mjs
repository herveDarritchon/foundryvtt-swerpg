/**
 * @typedef {Object} Skill
 * @property {SwerpgActor} actor - The actor instance.
 * @property {Skill} skill - The skill instance.
 * @property {boolean} isCreation - Indicates if the skill is in the creation phase.
 * @property {boolean} isCareer - Indicates if the skill is a career skill.
 * @property {boolean} isSpecialization - Indicates if the skill is a specialization skill.
 * @property {string} action - The action to be performed on the skill.
 * @property {SkillOptions} options - Additional options for the skill.
 * @property {number} freeSkillRankAvailable - The number of free skill ranks available.
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
     * @param skillId {string} a skill id from the list of skills
     * @param params {SkillParams} the params to be used to build the skill
     * @param options {SkillOptions} additional options
     * @returns {CareerFreeSkill|SpecializationFreeSkill|TrainedSkill|FreeSkill|ErrorSkill} a skill object
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

        if (!isCareer && !isSpecialization) {
            options.message = "you have to spend free skill points first during character creation!";
            return new ErrorSkill(actor, skill, {action, isCreation, isCareer, isSpecialization}, options);
        }

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
            const freeSkillRanks = foundry.utils.deepClone(actor.freeSkillRanks);
            if (skill.rank.specializationFree > 0 && freeSkillRanks.specialization.spent > 0 ) {
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
        this.actor = foundry.utils.deepClone(actor);
        this.skill = foundry.utils.deepClone(skill);
        this.isCreation = params.isCreation;
        this.isCareer = params.isCareer;
        this.isSpecialization = params.isSpecialization;
        this.action = params.action;
        this.options = options;
        //this.freeSkillRankAvailable = this.#computeFreeSkillRankAvailable();
        this.evaluated = false;
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
     * return {Skill} the result of the action
     */
    train() {
        throw new Error("Method 'train()' must be implemented.");
    }

    /**
     * Processes the action on the skill.
     * @abstract
     * return {Skill} the result of the action
     */
    forget() {
        throw new Error("Method 'forget()' must be implemented.");
    }

    /**
     * Evaluate the skill.
     * @abstract
     * return {Skill} the result of the action
     */
    evaluate() {
        throw new Error("Method 'evaluate()' must be implemented.");
    }

    /**
     * Save the skill elements in the Database.
     * @abstract
     * @async
     * return {Promise<Skill>} the result of the action
     */
    async updateState() {
        throw new Error("Method 'updateState()' must be implemented.");
    }

    /**
     * Compute the free skill rank available.
     * @abstract
     * @private
     * return {number} the free skill rank available
     */
    #computeFreeSkillRankAvailable() {
        throw new Error("Method 'computeFreeSkillRankAvailable' must be implemented.");
    }
}

class CareerFreeSkill extends Skill {
    constructor(actor, skill, params, options) {
        super(actor, skill, params, options);
        this.freeSkillRankAvailable = this.#computeFreeSkillRankAvailable();
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

    /**
     * @inheritDoc
     * @override
     */
    evaluate() {
        this.freeSkillRankAvailable = this.#computeFreeSkillRankAvailable();
        if (this.skill.rank.careerFree < 0) {
            return new ErrorSkill(this.actor, this.skill, {}, {message: ("you can't forget this rank because it comes from species free bonus!")});
        }

        if (this.value < 0) {
            return new ErrorSkill(this.actor, this.skill, {}, {message: ("you can't have less than 0 rank!")});
        }

        if (this.skill.rank.careerFree > 1) {
            return new ErrorSkill(this.actor, this.skill, {}, {message: ("you can't use more than 1 free skill rank into the same skill!")});
        }

        if (this.freeSkillRankAvailable < 0) {
            return new ErrorSkill(this.actor, this.skill, {}, {message: ("you can't use free skill rank anymore. You have used all!")});
        }

        if (this.freeSkillRankAvailable > 4) {
            return new ErrorSkill(this.actor, this.skill, {}, {message: ("you can't get more than 4 free skill ranks!")});
        }

        this.value = this.skill.rank.base + this.skill.rank.careerFree + this.skill.rank.specializationFree + this.skill.rank.trained
        this.evaluated = true;
        return this;
    }

    /**
     * @inheritDoc
     * @override
     */
    #computeFreeSkillRankAvailable() {
        return this.actor.freeSkillRanks.career.gained - this.actor.freeSkillRanks.career.spent;
    }

    /**
     * @inheritDoc
     * @override
     */
    async updateState() {
        try {
            await this.actor.update({'system.progression.freeSkillRanks': this.actor.freeSkillRanks});
            await this.actor.update({[`system.skills.${this.skill.id}.rank`]: this.skill.rank});
            return new Promise((resolve, _) => {
                resolve(this);
            });
        } catch (e) {
            return new Promise((resolve, _) => {
                resolve(new ErrorSkill(this.actor, this.skill, {}, {message: e.toString()}));
            });
        }
    }
}

class SpecializationFreeSkill extends Skill {
    constructor(actor, skill, params, options) {
        super(actor, skill, params, options);
        this.freeSkillRankAvailable = this.#computeFreeSkillRankAvailable();
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
        return this;
    }

    /**
     * @inheritDoc
     * @override
     */

    forget() {
        this.skill.rank.specializationFree--;
        this.actor.freeSkillRanks.specialization.spent--;
        return this;
    }

    /**
     * @inheritDoc
     * @override
     */
    evaluate() {
        this.freeSkillRankAvailable = this.#computeFreeSkillRankAvailable();
        if (this.skill.rank.specializationFree < 0) {
            return new ErrorSkill(this.actor, this.skill, {}, {message: ("you can't forget this rank because it comes from species free bonus!")});
        }

        if (this.value < 0) {
            return new ErrorSkill(this.actor, this.skill, {}, {message: ("you can't have less than 0 rank!")});
        }

        if (this.skill.rank.specializationFree > 1) {
            return new ErrorSkill(this.actor, this.skill, {}, {message: ("you can't use more than 1 free skill rank into the same skill!")});
        }

        if (this.freeSkillRankAvailable < 0) {
            return new ErrorSkill(this.actor, this.skill, {}, {message: ("you can't use free skill rank anymore. You have used all!")});
        }

        if (this.freeSkillRankAvailable > 4) {
            return new ErrorSkill(this.actor, this.skill, {}, {message: ("you can't get more than 4 free skill ranks!")});
        }

        this.value = this.skill.rank.base + this.skill.rank.careerFree + this.skill.rank.specializationFree + this.skill.rank.trained
        this.evaluated = true;
        return this;
    }

    /**
     * @inheritDoc
     * @override
     */
    #computeFreeSkillRankAvailable() {
        return this.actor.freeSkillRanks.specialization.gained - this.actor.freeSkillRanks.specialization.spent;
    }

    /**
     * @inheritDoc
     * @override
     */
    async updateState() {
        try {
            await this.actor.update({'system.progression.freeSkillRanks': this.actor.freeSkillRanks});
            await this.actor.update({[`system.skills.${this.skill.id}.rank`]: this.skill.rank});
            return new Promise((resolve, _) => {
                resolve(this);
            });
        } catch (e) {
            return new Promise((resolve, _) => {
                resolve(new ErrorSkill(this.actor, this.skill, {}, {message: e.toString()}));
            });
        }
    }
}

class TrainedSkill extends Skill {
    constructor(actor, skill, params, options) {
        super(actor, skill, params, options);
        this.#computeFreeSkillRankAvailable();
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

    evaluate() {
        return undefined;
    }

    /**
     * @inheritDoc
     * @override
     */
    #computeFreeSkillRankAvailable() {
        return false;
    }
}

class ErrorSkill extends Skill {
    constructor(actor, skill, params, options) {
        super(actor, skill, params, options);
        this.#computeFreeSkillRankAvailable();
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

    evaluate() {
        return undefined;
    }

    /**
     * @inheritDoc
     * @override
     */
    #computeFreeSkillRankAvailable() {
        return -1;
    }
}

export {
    Skill,
    CareerFreeSkill,
    SpecializationFreeSkill,
    TrainedSkill,
    ErrorSkill,
    SkillFactory,
}