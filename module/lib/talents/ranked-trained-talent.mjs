import Talent from "./talent.mjs";
import ErrorTalent from "./error-talent.mjs";
import TalentCostCalculator from "./talent-cost-calculator.mjs";

export default class RankedTrainedTalent extends Talent {
    constructor(actor, data, params, options) {
        super(actor, data, params, options);
        this.talentCostCalculator = new TalentCostCalculator(this);
    }

    process() {

        let experiencePointsSpent = this.actor.experiencePoints.spent;
        const talent = this.data;
        const row = talent.system.row;

        const ranks = this.actor.items.filter(i => i.name === talent.name);
        if (this.action === "train" && this.actor.hasItem(talent.id)) {
            const message = `Talent '${talent.name}' (ID: '${talent.id}') is already owned by the actor.`;
            return new ErrorTalent(this.actor, talent, {}, {message: message});
        }

        let idx;
        let cost;
        if (this.action === "train") {
            cost = this.talentCostCalculator.calculateCost("train", row);
            experiencePointsSpent = experiencePointsSpent + cost;
            idx = ranks.length + 1;
        }

        if (this.action === "forget") {
            cost = this.talentCostCalculator.calculateCost("forget", row);
            experiencePointsSpent = experiencePointsSpent - cost;
            cost = 0;
            idx = ranks.length - 1;
        }

        if (experiencePointsSpent > this.actor.experiencePoints.total) {
            return new ErrorTalent(this.actor, talent, {}, {message: ("you can't spend more experience than your total!")});
        }

        // As we are dealing with a ranked talent, we need to set the rank value to the number of ranks
        // Set to ranks.length because we are adding a new rank and we count from 0
        this.actor.experiencePoints.spent = experiencePointsSpent;

        this.data.updateSource({
            system: {
                rank: {
                    idx: idx,
                    cost: cost
                }
            }
        });

        console.log(`[process] talent ${talent.name} wit rank and cost ${cost}`, talent.system.rank);
        this.evaluated = true;
        return this;
    }

    /**
     * @inheritDoc
     * @override
     */
    async updateState() {
        const talent = this.data;
        if (!this.evaluated) {
            return new Promise((resolve, _) => {
                resolve(new ErrorTalent(this.actor, talent, {}, {message: "you must evaluate the talent before updating it!"}));
            });
        }
        try {
            console.log(`[updateState] talent ${talent.name} with rank and cost`, talent.system.rank);
            const object = talent.toObject();
            console.log(`[updateState] object`, object);
            const result = await this.actor.createEmbeddedDocuments("Item", [object]);
            console.log(`[updateState] result`, result);
            await this.actor.update({'system.progression.experience.spent': this.actor.experiencePoints.spent});
            return this;
        } catch (e) {
            return new Promise((resolve, _) => {
                resolve(new ErrorTalent(this.actor, talent, {}, {message: e.toString()}));
            });
        }
    }
}
