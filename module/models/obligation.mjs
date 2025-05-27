/**
 * Data schema, attributes, and methods specific to Ancestry type Items.
 */
export default class SwerpgObligation extends foundry.abstract.TypeDataModel {

    /* -------------------------------------------- */
    /*  Data Schema                                 */

    /* -------------------------------------------- */

    /** @inheritDoc */
    static defineSchema() {
        const fields = foundry.data.fields;
        const schema = {};

        schema.description = new fields.HTMLField({required: false, initial: undefined});

        schema.value = new fields.NumberField({
            required: true,
            integer: true,
            nullable: false,
            min: 0,
            max: 50,
            initial: 10,
            step: 5
        });

        schema.isExtra = new fields.BooleanField({
            required: false,
            nullable: false,
            initial: false
        });

        schema.extraXp = new fields.NumberField({
            required: true,
            integer: true,
            nullable: false,
            min: 0,
            max: 20,
            initial: 0,
            step: 5
        });

        schema.extraCredits = new fields.NumberField({
            required: true,
            integer: true,
            nullable: false,
            min: 0,
            max: 5000,
            initial: 0,
            step: 500
        });

        return schema;
    }

    /** @override */
    static LOCALIZATION_PREFIXES = ["OBLIGATION"];

    /* -------------------------------------------- */

    /** @inheritdoc */
    static validateJoint(data) {
    }

}
