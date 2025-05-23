import ErrorSkill from "./error-skill.mjs";
import Skill from "./skill.mjs";

export default class CareerFreeSkill extends Skill {
    constructor(actor, data, params, options) {
        super(actor, data, params, options);
        this.freeSkillRankAvailable = this.#computeFreeSkillRankAvailable();
    }

    /**
     * @inheritDoc
     * @override
     */
    process() {
        this.freeSkillRankAvailable = this.#computeFreeSkillRankAvailable();

        let careerFree = this.data.rank.careerFree;
        let careerFreeRankSpent = this.actor.freeSkillRanks.career.spent;

        if (this.action === "train") {
            careerFree++;
            careerFreeRankSpent++;
        }

        if (this.action === "forget") {
            careerFree--;
            careerFreeRankSpent--;
        }

        if (careerFree < 0) {
            return new ErrorSkill(this.actor, this.data, {}, {message: ("you can't forget this rank because it comes from species free bonus!")});
        }

        if (careerFree > 1) {
            return new ErrorSkill(this.actor, this.data, {}, {message: ("you can't use more than 1 career free skill rank into the same skill!")});
        }

        if (this.freeSkillRankAvailable < 0) {
            return new ErrorSkill(this.actor, this.data, {}, {message: ("you can't use free skill rank anymore. You have used all!")});

        }

        const maxCareerFreeSkillRank = this.actor.freeSkillRanks.career.gained;
        if (this.freeSkillRankAvailable > maxCareerFreeSkillRank) {
            return new ErrorSkill(this.actor, this.data, {}, {message: (`you can't get more than ${maxCareerFreeSkillRank} free skill ranks!`)});
        }


        this.data.rank.value = this.data.rank.base + careerFree + this.data.rank.specializationFree + this.data.rank.trained
        this.data.rank.careerFree = careerFree;
        this.actor.freeSkillRanks.career.spent = careerFreeRankSpent;
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
        if (!this.evaluated) {
            return new Promise((resolve, _) => {
                resolve(new ErrorSkill(this.actor, this.data, {}, {message: "you must evaluate the skill before updating it!"}));
            });
        }
        try {
            await this.actor.update({'system.progression.freeSkillRanks': this.actor.freeSkillRanks});
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
