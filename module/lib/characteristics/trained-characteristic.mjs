import Characteristic from "./characteristic.mjs";
import ErrorCharacteristic from "./error-characteristic.mjs";
import CharacteristicCostCalculator from "./characteristic-cost-calculator.mjs";

export default class TrainedCharacteristic extends Characteristic {
    constructor(actor, data, params, options) {
        super(actor, data, params, options);
        this.dataCostCalculator = new CharacteristicCostCalculator(this);
    }

    process() {
        let experiencePointsSpent = this.actor.experiencePoints.spent;
        let trained = this.data.rank.trained;

        let value;

        if (this.action === "train") {
            trained++;
            value = this.data.rank.base + trained;
            experiencePointsSpent = experiencePointsSpent + this.dataCostCalculator.calculateCost("train", value);
        }

        if (this.action === "forget") {
            trained--;
            value = this.data.rank.base + trained;
            experiencePointsSpent = experiencePointsSpent - this.dataCostCalculator.calculateCost("forget", value);
        }

        if (trained < 0) {
            return new ErrorCharacteristic(this.actor, this.data, {}, {message: ("you can't forget this rank anymore because you are at & (minimal value)!")});
        }

        if (this.isCreation && value > 5) {
            return new ErrorCharacteristic(this.actor, this.data, {}, {message: ("you can't have more than 5 rank during creation!")});
        }

        if (!this.isCreation && value > 6) {
            return new ErrorCharacteristic(this.actor, this.data, {}, {message: ("you can't have more than 6 rank!")});
        }

        if (experiencePointsSpent > this.actor.experiencePoints.total) {
            return new ErrorCharacteristic(this.actor, this.data, {}, {message: ("you can't spend more experience than your total!")});
        }

        this.data.rank.value = value;
        this.data.rank.trained = trained;
        this.actor.experiencePoints.spent = experiencePointsSpent;
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
                resolve(new ErrorCharacteristic(this.actor, this.data, {}, {message: "you must evaluate the characteristic before updating it!"}));
            });
        }
        try {
            await this.actor.update({'system.progression.experience.spent': this.actor.experiencePoints.spent});
            await this.actor.update({[`system.characteristics.${this.data.id}.rank`]: this.data.rank});
            return new Promise((resolve, _) => {
                resolve(this);
            });
        } catch (e) {
            return new Promise((resolve, _) => {
                resolve(new ErrorCharacteristic(this.actor, this.data, {}, {message: e.toString()}));
            });
        }
    }
}
