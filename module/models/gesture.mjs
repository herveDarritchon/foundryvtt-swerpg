import SwerpgAction from "./action.mjs";

/**
 * The data structure and functionality of a Somatic Gesture in the Swerpg spellcraft system.
 */
export default class SwerpgGesture extends foundry.abstract.DataModel {
    static defineSchema() {
        const fields = foundry.data.fields;
        const actionSchema = SwerpgAction.defineSchema();
        return {
            id: new fields.StringField({required: true, blank: false}),
            name: new fields.StringField(),
            nameFormat: new fields.NumberField({
                required: false, choices: Object.values(SYSTEM.SPELL.NAME_FORMATS),
                initial: undefined
            }),
            img: new fields.FilePathField({categories: ["IMAGE"]}),
            description: new fields.HTMLField({required: false, initial: undefined}),
            cost: actionSchema.cost,
            damage: new fields.SchemaField({
                base: new fields.NumberField({required: true, integer: true, min: 0})
            }),
            hands: new fields.NumberField({required: true, integer: true, min: 0, max: 2}),
            range: actionSchema.range,
            scaling: new fields.StringField({required: true, choices: SYSTEM.CHARACTERISTICS}),
            target: actionSchema.target
        }
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    _initialize() {
        super._initialize();
        this.name = game.i18n.localize(this.name);
        this.target.scope = SYSTEM.ACTION.TARGET_TYPES[this.target.type].scope;
    }

    /* -------------------------------------------- */

    /**
     * One-time initialization to instantiate SYSTEM.SPELL.GESTURES.
     */
    static initialize() {
        const gestures = SYSTEM.SPELL.GESTURES;
        for (const [k, v] of Object.entries(gestures)) {

            try {
                gestures[k] = new SwerpgGesture(v);
            } catch (e) {
                console.error(e);
            }
        }

        Object.freeze(gestures);
    }

    /* -------------------------------------------- */

    /** @override */
    toString() {
        return this.name;
    }

    /* -------------------------------------------- */

    /**
     * Tags used to annotate this Gesture.
     * @returns {string[]}
     */
    get tags() {
        const tags = [SYSTEM.CHARACTERISTICS[this.scaling].label];

        // Damage
        if (this.damage.base) tags.push(`${this.damage.base} Damage`);

        // Target
        if (this.target.type !== "none") {
            let target = SYSTEM.ACTION.TARGET_TYPES[this.target.type].label;
            if (this.target.number > 1) target += ` ${this.target.number}`;
            tags.push(target);
        }

        // Range
        if (this.range.maximum) tags.push(`Range ${this.range.maximum}`);

        // Cost
        if (this.cost.action !== 0) tags.push(`${this.cost.action}A`);
        if (this.cost.focus !== 0) tags.push(`${this.cost.focus}F`);
        if (this.cost.heroism !== 0) tags.push(`${this.cost.heroism}H`);
        return tags;
    }
}
