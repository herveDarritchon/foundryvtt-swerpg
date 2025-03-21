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
        const schema = {};

        schema.description = new fields.HTMLField({required: false, initial: undefined});
        schema.careerSkills = new fields.ArrayField(new fields.SchemaField({
            id: new fields.StringField({required: true, blank: false}),
        }));
        schema.freeSkillRank = new fields.NumberField({
            required: true,
            integer: true,
            nullable: false,
            min: 0,
            initial: 4,
            max: 8,
            label: "CAREER.FIELDS.FreeSkillRank.label",
            hint: "CAREER.FIELDS.FreeSkillRank.hint"
        });

        schema.careerSkills.options.validate = SwerpgCareer.#validateCareerSkills;

        return schema;
    }

    /** @override */
    static LOCALIZATION_PREFIXES = ["CAREER"];

    /* -------------------------------------------- */

    /** @inheritdoc */
    static validateJoint(data) {
    }

    /* -------------------------------------------- */

    /**
     * Validate career skill list
     * @param careerSkills {Array} The career skills to validate
     */
    static #validateCareerSkills(careerSkills) {
        if (careerSkills.length < 0 || careerSkills.length > 8) throw new Error(`Skill list must contain between 0 and 8 skills`);
    }
}
