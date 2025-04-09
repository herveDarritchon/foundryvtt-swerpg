import Skill from "./skill.mjs";

export default class ErrorSkill extends Skill {
    constructor(actor, skill, params, options) {
        super(actor, skill, params, options);
        this.#computeFreeSkillRankAvailable();
    }

    /**
     * @inheritDoc
     * @override
     */
    process() {
        this.options.message = ("Process not implemented. Should not be used!");
        return this;
    }

    /**
     * @inheritDoc
     * @override
     */
    #computeFreeSkillRankAvailable() {
        return -1;
    }

    /**
     * @inheritDoc
     * @override
     */
    async updateState() {
        this.options.message = ("UpdateState not implemented. Should not be used!");
        return new Promise((resolve, _) => {
            resolve(this);
        });
    }
}
