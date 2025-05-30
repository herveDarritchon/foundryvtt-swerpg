import ErrorTalent from "./error-talent.mjs";
import TalentCostCalculator from "./talent-cost-calculator.mjs";
import TrainedTalent from "./trained-talent.mjs";

export default class RankedTrainedTalent extends TrainedTalent {
    constructor(actor, data, params, options) {
        super(actor, data, params, options);
        this.talentCostCalculator = new TalentCostCalculator(this);
    }

    process() {

        let experiencePointsSpent = this.actor.experiencePoints.spent;
        const talent = this.data;
        const row = talent.system.row;

        console.debug(`[process] start - talent ${talent.name} wit row ${row} and initial experience points`, experiencePointsSpent);

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

        console.debug(`[process] talent ${talent.name} wit rank and cost ${cost}`, talent.system.rank);
        this.evaluated = true;
        return this;
    }
}
