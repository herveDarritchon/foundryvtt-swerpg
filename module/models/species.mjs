import {CHARACTERISTICS} from "../config/attributes.mjs";

/**
 * Data schema, attributes, and methods specific to Ancestry type Items.
 */
export default class SwerpgSpecies extends foundry.abstract.TypeDataModel {

    /* -------------------------------------------- */
    /*  Data Schema                                 */

    /* -------------------------------------------- */

    /** @inheritDoc */
    static defineSchema() {
        const fields = foundry.data.fields;

        return {
            description: new fields.HTMLField({required: false, initial: undefined}),
            characteristics: new fields.SchemaField({
                brawn: new fields.NumberField({
                    required: true,
                    integer: true,
                    nullable: false,
                    min: 1,
                    max: 5,
                    initial: 1,
                    label: CHARACTERISTICS.brawn.label
                }),
                agility: new fields.NumberField({
                    required: true,
                    integer: true,
                    nullable: false,
                    min: 1,
                    max: 5,
                    initial: 1,
                    label: CHARACTERISTICS.agility.label
                }),
                intellect: new fields.NumberField({
                    required: true,
                    integer: true,
                    nullable: false,
                    min: 1,
                    max: 5,
                    initial: 1,
                    label: CHARACTERISTICS.intellect.label
                }),
                cunning: new fields.NumberField({
                    required: true,
                    integer: true,
                    nullable: false,
                    min: 1,
                    max: 5,
                    initial: 1,
                    label: CHARACTERISTICS.cunning.label
                }),
                willpower: new fields.NumberField({
                    required: true,
                    integer: true,
                    nullable: false,
                    min: 1,
                    max: 5,
                    initial: 1,
                    label: CHARACTERISTICS.willpower.label
                }),
                presence: new fields.NumberField({
                    required: true,
                    integer: true,
                    nullable: false,
                    min: 1,
                    max: 5,
                    initial: 1,
                    label: CHARACTERISTICS.presence.label
                })
            }),
            woundThreshold: new fields.SchemaField({
                modifier: new fields.NumberField({
                    required: true,
                    integer: true,
                    nullable: false,
                    min: 10,
                    initial: 10,
                    max: 30,
                    label: "SPECIES.FIELDS.WoundThreshold.modifier"
                }),
                abilityKey: new fields.StringField({
                    required: true,
                    initial: "brawn",
                    choices: SYSTEM.CHARACTERISTICS,
                    label: "SPECIES.FIELDS.WoundThreshold.abilityKey"
                })
            }),
            strainThreshold: new fields.SchemaField({
                modifier: new fields.NumberField({
                    required: true,
                    integer: true,
                    nullable: false,
                    min: 10,
                    initial: 10,
                    max: 30,
                    label: "SPECIES.FIELDS.StrainThreshold.modifier"
                }),
                abilityKey: new fields.StringField({
                    required: true,
                    initial: "willpower",
                    choices: SYSTEM.CHARACTERISTICS,
                    label: "SPECIES.FIELDS.StrainThreshold.abilityKey"
                })
            }),
            startingExperience: new fields.NumberField({
                required: true,
                integer: true,
                nullable: false,
                min: 100,
                initial: 100,
                max: 300,
                label: "SPECIES.FIELDS.StartingExperience.label",
                hint: "SPECIES.FIELDS.StartingExperience.hint"
            }),
        };
    }

    /** @override */
    static LOCALIZATION_PREFIXES = ["SPECIES"];

    /* -------------------------------------------- */

    /** @inheritdoc */
    static validateJoint(data) {
    }
}
