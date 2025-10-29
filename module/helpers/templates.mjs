/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
export const preloadHandlebarsTemplates = async function () {
    return loadTemplates([
        // Actor partials.
        'systems/swerpg/templates/actor/parts/actor-features.hbs',
        'systems/swerpg/templates/actor/parts/actor-items.hbs',
        'systems/swerpg/templates/actor/parts/actor-spells.hbs',
        'systems/swerpg/templates/actor/parts/actor-effects.hbs',
        // Item partials
        'systems/swerpg/templates/item/parts/item-header.hbs',
        'systems/swerpg/templates/item/parts/item-description.hbs',
        'systems/swerpg/templates/item/parts/item-details.hbs',
        'systems/swerpg/templates/item/parts/item-effects.hbs',
        // Item attributes combat-item
        'systems/swerpg/templates/item/attribute-parts/combat-item/weapon/combat.hbs',
        'systems/swerpg/templates/item/attribute-parts/combat-item/stats.hbs',
        'systems/swerpg/templates/item/attribute-parts/combat-item/era-pricing.hbs',
        'systems/swerpg/templates/item/attribute-parts/combat-item/mods.hbs',
        'systems/swerpg/templates/item/attribute-parts/combat-item/weapon-modifiers.hbs',
        'systems/swerpg/templates/item/attribute-parts/combat-item/armor/armor.hbs',
        'systems/swerpg/templates/item/attribute-parts/combat-item/weapon/weapon.hbs',
        'systems/swerpg/templates/item/attribute-parts/combat-item/gear/gear.hbs',
        // Item attributes species-item
        'systems/swerpg/templates/item/attribute-parts/species/starting-chars.hbs',
        'systems/swerpg/templates/item/attribute-parts/species/starting-attrs.hbs',
        'systems/swerpg/templates/item/attribute-parts/species/skill-modifiers.hbs',
        'systems/swerpg/templates/item/attribute-parts/species/talent-modifiers.hbs',
        'systems/swerpg/templates/item/attribute-parts/species/sub-species.hbs',
        'systems/swerpg/templates/item/attribute-parts/species/option-choices.hbs',
        // Item attributes career-item
        'systems/swerpg/templates/item/attribute-parts/career/specializations.hbs',
        'systems/swerpg/templates/item/attribute-parts/career/skills.hbs',
        'systems/swerpg/templates/item/attribute-parts/career/attributes.hbs',

    ]);
};
