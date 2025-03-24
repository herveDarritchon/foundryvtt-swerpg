/**
 * Data schema, attributes, and methods specific to Ancestry type Items.
 */
export default class SwerpgSpecialization extends foundry.abstract.TypeDataModel {

    /* -------------------------------------------- */
    /*  Data Schema                                 */

    /* -------------------------------------------- */

    /** @inheritDoc */
    static defineSchema() {
        const fields = foundry.data.fields;
        const schema = {};

        schema.description = new fields.HTMLField({required: false, initial: undefined});
        schema.specializationSkills = new fields.SetField(new fields.SchemaField({
            id: new fields.StringField({required: true, blank: false}),
        }));
        schema.freeSkillRank = new fields.NumberField({
            required: true,
            integer: true,
            nullable: false,
            min: 0,
            initial: 4,
            max: 8,
            label: "SPECIALIZATION.FIELDS.FreeSkillRank.label",
            hint: "SPECIALIZATION.FIELDS.FreeSkillRank.hint"
        });

        schema.specializationSkills.options.validate = SwerpgSpecialization.#validateSpecializationSkills;

        return schema;
    }

    /** @override */
    static LOCALIZATION_PREFIXES = ["SPECIALIZATION"];

    /* -------------------------------------------- */

    /** @inheritdoc */
    static validateJoint(data) {
    }

    /* -------------------------------------------- */

    /**
     * Validate specialization skill list
     * @param specializationSkills {Array} The specialization skills to validate
     */
    static #validateSpecializationSkills(specializationSkills) {
        if (specializationSkills.length < 0 || specializationSkills.length > 8) throw new Error(`Skill list must contain between 0 and 8 skills`);
    }
}
