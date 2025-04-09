import Skill from "./skill.mjs";
import ErrorSkill from "./error-skill.mjs";
import SkillCostCalculator from "./skill-cost-calculator.mjs";

export default class TrainedSkill extends Skill {
    constructor(actor, skill, params, options) {
        super(actor, skill, params, options);
        this.#computeFreeSkillRankAvailable();
        this.skillCostCalculator = new SkillCostCalculator(this);
    }

    process() {
        this.freeSkillRankAvailable = this.#computeFreeSkillRankAvailable();

        let trained = this.skill.rank.trained;
        let experiencePointsSpent = this.actor.experiencePoints.spent;

        if (this.action === "train") {
            trained++;
            experiencePointsSpent = experiencePointsSpent + this.skillCostCalculator.calculateCost("train", trained);
        }

        if (this.action === "forget") {
            trained--;
            experiencePointsSpent = experiencePointsSpent - this.skillCostCalculator.calculateCost("forget", trained);
        }

        if (this.skill.rank.trained < 0) {
            return new ErrorSkill(this.actor, this.skill, {}, {message: ("you can't forget this rank because it was not trained but free!")});
        }

        const value = this.skill.rank.base + this.skill.rank.careerFree + this.skill.rank.specializationFree + trained;

        if (this.isCreation && value > 2) {
            return new ErrorSkill(this.actor, this.skill, {}, {message: ("you can't have more than 2 rank at creation!")});
        }

        if (!this.isCreation && value > 5) {
            return new ErrorSkill(this.actor, this.skill, {}, {message: ("you can't have more than 5 rank!")});
        }

        this.skill.rank.value = value;
        this.skill.rank.trained = trained;
        this.actor.experiencePoints.spent = experiencePointsSpent;
        this.evaluated = true;
        return this;
    }

    /**
     * @inheritDoc
     * @override
     */
    train() {
        this.skill.rank.trained++;
        this.actor.experiencePoints.spent = this.skillCostCalculator.calculateCost("train", this.skill.rank.value++);
        return this;
    }

    /**
     * @inheritDoc
     * @override
     */

    forget() {
        this.skill.rank.trained--;
        this.actor.experiencePoints.spent = this.skillCostCalculator.calculateCost("forget", this.skill.rank.value++);
        return this;
    }

    /**
     * @inheritDoc
     * @override
     */
    evaluate() {
        this.freeSkillRankAvailable = this.#computeFreeSkillRankAvailable();
        this.skill.rank.value = this.skill.rank.base + this.skill.rank.careerFree + this.skill.rank.specializationFree + this.skill.rank.trained;

        if (this.skill.rank.trained < 0) {
            return new ErrorSkill(this.actor, this.skill, {}, {message: ("you can't forget this rank because it was not trained but free!")});
        }

        if (this.isCreation && this.skill.rank.value > 2) {
            return new ErrorSkill(this.actor, this.skill, {}, {message: ("you can't have more than 2 rank at creation!")});
        }

        if (!this.isCreation && this.skill.rank.value > 5) {
            return new ErrorSkill(this.actor, this.skill, {}, {message: ("you can't have more than 5 rank!")});
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
        if (!this.evaluated) {
            return new Promise((resolve, _) => {
                resolve(new ErrorSkill(this.actor, this.skill, {}, {message: "you must evaluate the skill before updating it!"}));
            });
        }
        try {
            await this.actor.update({'system.progression.experience.spent': this.actor.experiencePoints.spent});
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
