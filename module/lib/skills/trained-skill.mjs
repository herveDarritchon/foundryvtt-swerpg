import Skill from "./skill.mjs";
import ErrorSkill from "./error-skill.mjs";
import SkillCostCalculator from "./skill-cost-calculator.mjs";

export default class TrainedSkill extends Skill {
    constructor(actor, data, params, options) {
        super(actor, data, params, options);
        this.#computeFreeSkillRankAvailable();
        this.dataCostCalculator = new SkillCostCalculator(this);
    }

    process() {
        this.freeSkillRankAvailable = this.#computeFreeSkillRankAvailable();

        let trained = this.data.rank.trained;

        let experiencePointsSpent = this.actor.experiencePoints.spent;
        let value;

        if (this.action === "train") {
            trained++;
            value = this.data.rank.base + this.data.rank.careerFree + this.data.rank.specializationFree + trained;
            experiencePointsSpent = experiencePointsSpent + this.dataCostCalculator.calculateCost("train", value);
        }

        if (this.action === "forget") {
            trained--;
            value = this.data.rank.base + this.data.rank.careerFree + this.data.rank.specializationFree + trained;
            experiencePointsSpent = experiencePointsSpent - this.dataCostCalculator.calculateCost("forget", value);
        }

        if (this.data.rank.trained < 0) {
            return new ErrorSkill(this.actor, this.data, {}, {message: ("you can't forget this rank because it was not trained but free!")});
        }

        if (this.isCreation && value > 2) {
            return new ErrorSkill(this.actor, this.data, {}, {message: ("you can't have more than 2 rank at creation!")});
        }

        if (!this.isCreation && value > 5) {
            return new ErrorSkill(this.actor, this.data, {}, {message: ("you can't have more than 5 rank!")});
        }

        if (experiencePointsSpent > this.actor.experiencePoints.total) {
            return new ErrorSkill(this.actor, this.data, {}, {message: ("you can't spend more experience than your total!")});
        }

        this.data.rank.value = value;
        this.data.rank.trained = trained;
        this.actor.experiencePoints.spent = experiencePointsSpent;
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
                resolve(new ErrorSkill(this.actor, this.data, {}, {message: "you must evaluate the skill before updating it!"}));
            });
        }
        try {
            await this.actor.update({'system.progression.experience.spent': this.actor.experiencePoints.spent});
            await this.actor.update({[`system.skills.${this.data.id}.rank`]: this.data.rank});
            return new Promise((resolve, _) => {
                resolve(this);
            });
        } catch (e) {
            return new Promise((resolve, _) => {
                resolve(new ErrorSkill(this.actor, this.data, {}, {message: e.toString()}));
            });
        }
    }
}
