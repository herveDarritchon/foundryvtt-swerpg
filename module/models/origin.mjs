/**
 * Data schema, attributes, and methods specific to Origin type Items.
 */
export default class SwerpgOrigin extends foundry.abstract.TypeDataModel {

    static MODIFIER_MIN_VALUE = -20;
    static MODIFIER_MAX_VALUE = 20;
    static MODIFIER_STEP = 5;

    /* -------------------------------------------- */
    /*  Data Schema                                 */

    /* -------------------------------------------- */

    /** @inheritDoc */
    static defineSchema() {
        const fields = foundry.data.fields;
        const requiredInteger = {required: true, nullable: false, integer: true};

        return {
            description: new fields.HTMLField({required: false, initial: undefined}),
            // Skills Scores
            skillModifierDraft: new fields.SchemaField({
                skillId: new fields.StringField({required: true}),
                modifierValue: new fields.NumberField({required: true, integer: true, initial: 0, min: -20, max: 20, step: 5})
            }),
            skills: new fields.ArrayField(new fields.SchemaField({
                skillId: new fields.StringField({required: true}),
                modifier: new fields.NumberField({required: true, integer: true, initial: 0, min: -20, max: 20, step: 5})
            })),
            secondaryAttributes: new fields.SchemaField(Object.values(SYSTEM.SECONDARY_ATTRIBUTES).reduce((obj, attribute) => {
                obj[attribute.id] = new fields.SchemaField({
                    mod: new fields.NumberField({...requiredInteger, initial: 0, min: -5, max: 5}),
                }, {label: attribute.label});
                return obj;
            }, {})),
            talents: new fields.SetField(new fields.DocumentUUIDField({type: "Item"}), {
                validate: SwerpgOrigin.#validateTalents
            }),
            speciality: new fields.SetField(new fields.DocumentUUIDField({type: "Item"}), {
                validate: SwerpgOrigin.#validateSpecialities
            })
        };
    }

    /** @override */
    static LOCALIZATION_PREFIXES = ["ORIGIN"];

    /* -------------------------------------------- */

    /**
     * Validate that the Skills assigned to this Origin are appropriate.
     * @throws {Error}              An error if too many skills are assigned
     * @param talents
     */
    static #validateTalents(talents) {
        if (talents.length > 4) throw new Error(game.i18n.localize("ORIGIN.ERRORS.TALENTS_NUMBER"));
    }

    /* -------------------------------------------- */

    /**
     * Validate that the Specialities assigned to this Origin are appropriate.
     * @throws {Error}              An error if too many talents are assigned
     * @param specialities
     */
    static #validateSpecialities(specialities) {
        if (specialities.length > 4) throw new Error(game.i18n.localize("ORIGIN.ERRORS.SPECIALITIES_NUMBER"));
    }

    /** @inheritdoc */
    static validateJoint(data) {

        // Skip validation if this is a newly created item that has not yet been populated
        const isNew = !data.skills && !data.secondaryAttributes;
        if (isNew) return;

        // Validate Abilities
        if (!data.skills) {
            throw new Error(game.i18n.localize("ORIGIN.WARNINGS.SKILLS"));
        }

        // Validate Resistances
        if (!data.secondaryAttributes) {
            throw new Error(game.i18n.localize("ORIGIN.WARNINGS.SECONDARY_ATTRIBUTES"));
        }
    }
}
