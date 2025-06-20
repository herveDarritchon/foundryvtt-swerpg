/**
 * @typedef {Object} SwerpgArmorCategory
 * @property {string} id
 * @property {string} label
 * @property {{min: number, max: number}} armor
 * @property {{min: number, max: number, start: number}} dodge
 */

/**
 * Named armor categories which are allowed by the system
 * @enum {SwerpgArmorCategory}
 */
export const CATEGORIES = {
    unarmored: {
        id: "unarmored",
        label: "ARMOR.CATEGORIES.UNARMORED",
        defense: {min: 0, max: 0},
        soak: {min: 10, max: 10, start: 0}
    },
    light: {
        id: "light",
        label: "ARMOR.CATEGORIES.LIGHT",
        defense: {min: 2, max: 7},
        soak: {min: 7, max: 9, start: 2}
    },
    medium: {
        id: "medium",
        label: "ARMOR.CATEGORIES.MEDIUM",
        defense: {min: 8, max: 13},
        soak: {min: 4, max: 6, start: 4}
    },
    heavy: {
        id: "heavy",
        label: "ARMOR.CATEGORIES.HEAVY",
        defense: {min: 14, max: 20},
        soak: {min: 0, max: 3, start: 8}
    },
    natural: {
        id: "natural",
        label: "ARMOR.CATEGORIES.NATURAL",
        defense: {min: 0, max: 20},
        soak: {min: 10, max: 10, start: 0}
    }
};

/**
 * The boolean properties which a piece of Armor can have.
 * @type {Record<string, {label: string, [rarity]: number}>}
 */
export const PROPERTIES = {
    bulky: {
        label: "ARMOR.PROPERTIES.BULKY"
    },
    organic: {
        label: "ARMOR.PROPERTIES.ORGANIC"
    }
};

/**
 * Data representing the default "unarmored" armor item.
 * @type {object}
 */
export const UNARMORED_DATA = {
    name: "Unarmored",
    img: "icons/equipment/chest/shirt-simple-white.webp",
    type: "armor",
    data: {
        category: "unarmored",
        armor: {base: 0, bonus: 0},
        dodge: {base: 10, bonus: 0, start: 0}
    }
};
