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

        this.skill.rank.value = this.skill.rank.base + this.skill.rank.careerFree + this.skill.rank.specializationFree + this.skill.rank.trained

        if (this.skill.rank.value < 0) {
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

        this.skill.rank.value = this.skill.rank.base + this.skill.rank.careerFree + this.skill.rank.specializationFree + this.skill.rank.trained

        if (this.skill.rank.value < 0) {
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
}