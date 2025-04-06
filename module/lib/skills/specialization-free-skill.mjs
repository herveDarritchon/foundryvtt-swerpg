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
        /*
                if (this.skill.rank.value < 0) {
                    return new ErrorSkill(this.actor, this.skill, {}, {message: ("you can't have less than 0 rank!")});
                }*/

        if (this.skill.rank.specializationFree > 1) {
            return new ErrorSkill(this.actor, this.skill, {}, {message: ("you can't use more than 1 free skill rank into the same skill!")});
        }

        if (this.freeSkillRankAvailable < 0) {
            return new ErrorSkill(this.actor, this.skill, {}, {message: ("you can't use free skill rank anymore. You have used all!")});
        }

        const maxSpecializationFreeSkillRank = this.actor.freeSkillRanks.specialization.gained;
        if (this.freeSkillRankAvailable > maxSpecializationFreeSkillRank) {
            return new ErrorSkill(this.actor, this.skill, {}, {message: (`you can't get more than ${maxSpecializationFreeSkillRank} free skill ranks!`)});
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