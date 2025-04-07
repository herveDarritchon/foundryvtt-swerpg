import Skill from "./skill.mjs";
import ErrorSkill from "./error-skill.mjs";
import SkillCostCalculator from "./skill-cost-calculator.mjs";

export default class TrainedSkill extends Skill {
    constructor(actor, skill, params, options) {
        super(actor, skill, params, options);
        this.#computeFreeSkillRankAvailable();
        this.skillCostCalculator = new SkillCostCalculator(this);
    }

    /**
     * @inheritDoc
     * @override
     */
    train() {
        this.skill.rank.trained++;
        this.actor.experiencePoints.spent = this.skillCostCalculator.calculateCost("train");
        return this;
    }

    /**
     * @inheritDoc
     * @override
     */

    forget() {
        this.skill.rank.trained--;
        this.actor.experiencePoints.spent = this.skillCostCalculator.calculateCost("forget");
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
            await this.actor.update({'system.progression.freeSkillRanks': this.actor.freeSkillRanks});
            await this.actor.update({[`system.skills.${this.skill.id}.rank`]: this.skill.rank});
            await this.actor.update({'system.progression.experience.spent': this.actor.experiencePoints.spent});
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
