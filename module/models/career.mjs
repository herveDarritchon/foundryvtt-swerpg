/**
 * Data schema, attributes, and methods specific to Ancestry type Items.
 */
export default class SwerpgCareer extends foundry.abstract.TypeDataModel {

    /* -------------------------------------------- */
    /*  Data Schema                                 */

    /* -------------------------------------------- */

    /** @inheritDoc */
    static defineSchema() {
        const fields = foundry.data.fields;

        return {
            description: new fields.HTMLField({required: false, initial: undefined}),
            careerSkills: new fields.ArrayField(new fields.SchemaField({
                id: new fields.StringField({required: true, blank: false}),
            })),
            freeSkillRank: new fields.NumberField({
                required: true,
                integer: true,
                nullable: false,
                min: 0,
                initial: 4,
                max: 8,
                label: "CAREER.FIELDS.FreeSkillRank.label",
                hint: "CAREER.FIELDS.FreeSkillRank.hint"
            }),
        };
    }

    /** @override */
    static LOCALIZATION_PREFIXES = ["CAREER"];

    /* -------------------------------------------- */

    /** @inheritdoc */
    static validateJoint(data) {
    }
}
