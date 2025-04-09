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

        if (this.action === "train") {
            trained++;
            experiencePointsSpent = experiencePointsSpent + this.dataCostCalculator.calculateCost("train", trained);
        }

        if (this.action === "forget") {
            trained--;
            experiencePointsSpent = experiencePointsSpent - this.dataCostCalculator.calculateCost("forget", trained);
        }

        if (this.data.rank.trained < 0) {
            return new ErrorSkill(this.actor, this.data, {}, {message: ("you can't forget this rank because it was not trained but free!")});
        }

        const value = this.data.rank.base + this.data.rank.careerFree + this.data.rank.specializationFree + trained;

        if (this.isCreation && value > 2) {
            return new ErrorSkill(this.actor, this.data, {}, {message: ("you can't have more than 2 rank at creation!")});
        }

        if (!this.isCreation && value > 5) {
            return new ErrorSkill(this.actor, this.data, {}, {message: ("you can't have more than 5 rank!")});
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
