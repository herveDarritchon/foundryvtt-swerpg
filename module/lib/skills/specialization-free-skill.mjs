import Skill from "./skill.mjs";
import ErrorSkill from "./error-skill.mjs";

export default class SpecializationFreeSkill extends Skill {
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

        let specializationFree = this.skill.rank.specializationFree;
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
            return new ErrorSkill(this.actor, this.skill, {}, {message: ("you can't forget this rank because it comes from species free bonus!")});
        }

        if (specializationFree > 1) {
            return new ErrorSkill(this.actor, this.skill, {}, {message: ("you can't use more than 1 specialization free skill rank into the same skill!")});
        }

        if (this.freeSkillRankAvailable < 0) {
            return new ErrorSkill(this.actor, this.skill, {}, {message: ("you can't use free skill rank anymore. You have used all!")});
        }

        const maxSpecializationFreeSkillRank = this.actor.freeSkillRanks.specialization.gained;
        if (this.freeSkillRankAvailable > maxSpecializationFreeSkillRank) {
            return new ErrorSkill(this.actor, this.skill, {}, {message: (`you can't get more than ${maxSpecializationFreeSkillRank} free skill ranks!`)});
        }

        this.skill.rank.value = this.skill.rank.base + this.skill.rank.careerFree + specializationFree + this.skill.rank.trained
        this.skill.rank.specializationFree = specializationFree;
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