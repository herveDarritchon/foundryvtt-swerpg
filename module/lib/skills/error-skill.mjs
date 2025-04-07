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
    train() {
        this.options.message = ("Train not implemented. Should not be used!");
        return this;
    }

    /**
     * @inheritDoc
     * @override
     */

    forget() {
        this.options.message = ("Forget not implemented. Should not be used!");
        return this;
    }

    evaluate() {
        this.options.message = ("Evaluate not implemented. Should not be used!");
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
