import Talent from "./talent.mjs";
import ErrorTalent from "./error-talent.mjs";
import TalentCostCalculator from "./talent-cost-calculator.mjs";

export default class RankedTrainedTalent extends Talent {
    constructor(actor, data, params, options) {
        super(actor, data, params, options);
        this.dataCostCalculator = new TalentCostCalculator(this);
    }

    process() {

        let experiencePointsSpent = this.actor.experiencePoints.spent;
        const row = this.data.system.row;

        const ranks = this.actor.items.filter(i => i.name === this.data.name);
        let idx = ranks.length;

        let cost;
        if (this.action === "train") {
            cost = this.dataCostCalculator.calculateCost("train", row);
            experiencePointsSpent = experiencePointsSpent + cost;
        }

        if (this.action === "forget") {
            cost = this.dataCostCalculator.calculateCost("forget", row);
            experiencePointsSpent = experiencePointsSpent - cost;
            cost = 0;
            idx = ranks.length - 1;
        }

        if (experiencePointsSpent > this.actor.experiencePoints.total) {
            return new ErrorTalent(this.actor, this.data, {}, {message: ("you can't spend more experience than your total!")});
        }

        // As we are dealing with a ranked talent, we need to set the rank value to the number of ranks
        // Set to ranks.length because we are adding a new rank and we count from 0
        this.actor.experiencePoints.spent = experiencePointsSpent;
        this.data.system.rank = {
            idx: idx,
            cost: cost
        };
        this.evaluated = true;
        return this;
    }

    /**
     * @inheritDoc
     * @override
     */
    async updateState() {
        if (!this.evaluated) {
            return new Promise((resolve, _) => {
                resolve(new ErrorTalent(this.actor, this.data, {}, {message: "you must evaluate the talent before updating it!"}));
            });
        }
        try {
            await this.actor.createEmbeddedDocuments("Item", [this.data.toObject()]);
            await this.actor.update({'system.progression.experience.spent': this.actor.experiencePoints.spent});
        } catch (e) {
            return new Promise((resolve, _) => {
                resolve(new ErrorTalent(this.actor, this.data, {}, {message: e.toString()}));
            });
        }
    }
}
