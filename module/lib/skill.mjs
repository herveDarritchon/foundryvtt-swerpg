/**
 * @typedef {Object} SkillResult
 * @property {boolean} success - Indicates whether the skill creation was successful.
 * @property {CareerFreeSkill|SpecializationFreeSkill|TrainedSkill|ErrorSkill} [data] - The created skill instance.
 * @property {string|null} [error] - An error message if skill creation failed.
 */

class Skill {
    constructor(actor, skill, params, options) {
        this.actor = foundry.utils.deepClone(actor);
        this.skill = foundry.utils.deepClone(skill);
        this.isCreation = params.isCreation;
        this.isCareer = params.isCareer;
        this.isSpecialization = params.isSpecialization;
        this.action = params.action;
        this.options = options;
        this.evaluated = false;
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

class TrainedSkill extends Skill {
    constructor(actor, skill, params, options) {
        super(actor, skill, params, options);
        this.#computeFreeSkillRankAvailable();
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
        this.skill.rank.trained++;
        return this;
    }

    /**
     * @inheritDoc
     * @override
     */

    forget() {
        this.skill.rank.trained--;
        return this;
    }

    /**
     * @inheritDoc
     * @override
     */
    evaluate() {
        this.freeSkillRankAvailable = this.#computeFreeSkillRankAvailable();

        if (this.skill.rank.trained < 0) {
            return new ErrorSkill(this.actor, this.skill, {}, {message: ("you can't forget this rank because it was not trained but free!")});
        }

        this.skill.rank.value = this.skill.rank.base + this.skill.rank.careerFree + this.skill.rank.specializationFree + this.skill.rank.trained

        if (this.skill.rank.value < 0) {
            return new ErrorSkill(this.actor, this.skill, {}, {message: ("you can't have less than 0 rank!")});
        }

        this.evaluated = true;
        return this;
    }

    /**
     * @inheritDoc
     * @override
     */
    #computeFreeSkillRankAvailable() {
        return false;
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

class ErrorSkill extends Skill {
    constructor(actor, skill, params, options) {
        super(actor, skill, params, options);
        this.#computeFreeSkillRankAvailable();
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
    TrainedSkill,
    ErrorSkill,
}