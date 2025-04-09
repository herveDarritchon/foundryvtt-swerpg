import Skill from "./skill.mjs";
import ErrorSkill from "./error-skill.mjs";

export default class SpecializationFreeSkill extends Skill {
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

        let specializationFree = this.data.rank.specializationFree;
        let specializationFreeRankSpent = this.actor.freeSkillRanks.specialization.spent;

        if (this.action === "train") {
            specializationFree++;
            specializationFreeRankSpent++;
        }

        if (this.action === "forget") {
            specializationFree--;
            specializationFreeRankSpent--;
        }

        if (specializationFree < 0) {
            return new ErrorSkill(this.actor, this.data, {}, {message: ("you can't forget this rank because it comes from species free bonus!")});
        }

        if (specializationFree > 1) {
            return new ErrorSkill(this.actor, this.data, {}, {message: ("you can't use more than 1 specialization free skill rank into the same skill!")});
        }

        if (this.freeSkillRankAvailable < 0) {
            return new ErrorSkill(this.actor, this.data, {}, {message: ("you can't use free skill rank anymore. You have used all!")});
        }

        const maxSpecializationFreeSkillRank = this.actor.freeSkillRanks.specialization.gained;
        if (this.freeSkillRankAvailable > maxSpecializationFreeSkillRank) {
            return new ErrorSkill(this.actor, this.data, {}, {message: (`you can't get more than ${maxSpecializationFreeSkillRank} free skill ranks!`)});
        }

        this.data.rank.value = this.data.rank.base + this.data.rank.careerFree + specializationFree + this.data.rank.trained
        this.data.rank.specializationFree = specializationFree;
        this.actor.freeSkillRanks.specialization.spent = specializationFreeRankSpent;
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