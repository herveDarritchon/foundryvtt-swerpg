import ErrorSkill from "./error-skill.mjs";
import Skill from "./skill.mjs";

export default class CareerFreeSkill extends Skill {
    constructor(actor, skill, params, options) {
        super(actor, skill, params, options);
        this.freeSkillRankAvailable = this.#computeFreeSkillRankAvailable();
    }

    /**
     * @inheritDoc
     * @override
     */
    process() {
        this.freeSkillRankAvailable = this.#computeFreeSkillRankAvailable();

        let careerFree = this.skill.rank.careerFree;
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
            return new ErrorSkill(this.actor, this.skill, {}, {message: ("you can't forget this rank because it comes from species free bonus!")});
        }

        if (careerFree > 1) {
            return new ErrorSkill(this.actor, this.skill, {}, {message: ("you can't use more than 1 career free skill rank into the same skill!")});
        }

        if (this.freeSkillRankAvailable < 0) {
            return new ErrorSkill(this.actor, this.skill, {}, {message: ("you can't use free skill rank anymore. You have used all!")});

        }

        const maxCareerFreeSkillRank = this.actor.freeSkillRanks.career.gained;
        if (this.freeSkillRankAvailable > maxCareerFreeSkillRank) {
            return new ErrorSkill(this.actor, this.skill, {}, {message: (`you can't get more than ${maxCareerFreeSkillRank} free skill ranks!`)});
        }


        this.skill.rank.value = this.skill.rank.base + careerFree + this.skill.rank.specializationFree + this.skill.rank.trained
        this.skill.rank.careerFree= careerFree;
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
                resolve(new ErrorSkill(this.actor, this.skill, {}, {message: "you must evaluate the skill before updating it!"}));
            });
        }
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
