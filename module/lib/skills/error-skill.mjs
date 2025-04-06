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
        return undefined;
    }

    /**
     * @inheritDoc
     * @override
     */
    #computeFreeSkillRankAvailable() {
        return -1;
    }

    async updateState() {
        return Promise.resolve(undefined);
    }
}
