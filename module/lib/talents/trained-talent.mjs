import Talent from "./talent.mjs";
import ErrorTalent from "./error-talent.mjs";
import TalentCostCalculator from "./talent-cost-calculator.mjs";

export default class TrainedTalent extends Talent {
    constructor(actor, data, params, options) {
        super(actor, data, params, options);
        this.dataCostCalculator = new TalentCostCalculator(this);
    }

    process() {

        let experiencePointsSpent = this.actor.experiencePoints.spent;
        const row = this.data.system.row;

        const alreadyOwned = this.actor.items.find(i => i.name === this.data.name);

        if (alreadyOwned && this.action === "train") {
            return new ErrorTalent(this.actor, this.data, {}, {message: `you already own this talent ('${this.data.name}') and it is not a Ranked Talent!`});
        }

        if (!alreadyOwned && this.action === "forget") {
            return new ErrorTalent(this.actor, this.data, {}, {message: `you can't forget a talent ('${this.data.name}') you don't own!`});
        }

        let cost;
        if (this.action === "train") {
            cost = this.dataCostCalculator.calculateCost("train", row);
            experiencePointsSpent = experiencePointsSpent + cost;
        }

        if (this.action === "forget") {
            cost = this.dataCostCalculator.calculateCost("forget", row);
            experiencePointsSpent = experiencePointsSpent - cost;
            cost = 0;
        }

        if (experiencePointsSpent > this.actor.experiencePoints.total) {
            return new ErrorTalent(this.actor, this.data, {}, {message: ("you can't spend more experience than your total!")});
        }

        this.actor.experiencePoints.spent = experiencePointsSpent;
        this.data.system.rank = {
            idx: 0,
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
