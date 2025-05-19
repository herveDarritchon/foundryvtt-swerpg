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
        const schema = {};

        schema.description = new fields.HTMLField({required: false, initial: undefined});
        schema.characteristics = new fields.SchemaField({
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
        });
        schema.woundThreshold = new fields.SchemaField({
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
        });
        schema.strainThreshold = new fields.SchemaField({
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
        });
        schema.startingExperience = new fields.NumberField({
            required: true,
            integer: true,
            nullable: false,
            min: 100,
            initial: 100,
            max: 300,
            label: "SPECIES.FIELDS.StartingExperience.label",
            hint: "SPECIES.FIELDS.StartingExperience.hint"
        });
        schema.freeSkills = new fields.SetField(
            new fields.StringField({
                choices: Object.values(SYSTEM.SKILLS).reduce((obj, d) => {
                    obj[d.id] = d.label;
                    return obj;
                }, {})
            })
        );
        schema.freeTalents = new fields.SetField(
            new fields.DocumentUUIDField({type: "Item"}), {
                validate: SwerpgSpecies.#validateFreeTalents
            });
        schema.freeSkills.options.validate = SwerpgSpecies.#validatefreeSkills;
        schema.freeTalents.options.validate = SwerpgSpecies.#validatefreeTalents;

        return schema;
    }

    /** @override */
    static LOCALIZATION_PREFIXES = ["SPECIES"];

    /* -------------------------------------------- */

    /** @inheritdoc */
    static validateJoint(data) {
    }

    /* -------------------------------------------- */

    /**
     * Validate career skill list
     * @param freeSkills {Array} The career skills to validate
     */
    static #validatefreeSkills(freeSkills) {
        if (freeSkills.length < 0 || freeSkills.length > 4) throw new Error(`Species Free Skill list must contain between 0 and 8 skills`);
        //if (careerSkills.length < 0 || careerSkills.length > 8) throw new Error(`Skill list must contain between 0 and 8 skills`);
    }

    static #validatefreeTalents(freeTalents) {
        //if (freeSkills.size > 2) throw new Error(`Skill list must contain between 0 and 2 skills`);
        return;
    }

    static #skillChoices(a) {
        return Object.keys(SYSTEM.SKILLS);
    }

    static #choices() {
        return ["toto"];
    }

    /* -------------------------------------------- */

    /**
     * Validate that the item assigned to this Species are appropriate (talent).
     * @param {string[]} talents    The assigned talent UUIDs
     * @throws {Error}              An error if too many talents are assigned
     */
    static #validateFreeTalents(talents) {
        if (game.items == null){
            return true;
        }
        console.log(`[SWERPG] - talents (${talents.length}):`, talents);
        return talents.map(uuid => fromUuidSync(uuid)).every(item => item.type === 'talent');
    }
}
