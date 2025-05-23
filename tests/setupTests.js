// setupTests.js
import {vi} from 'vitest';

/**
 * Quickly clone a simple piece of data, returning a copy which can be mutated safely.
 * This method DOES support recursive data structures containing inner objects or arrays.
 * This method DOES NOT support advanced object types like Set, Map, or other specialized classes.
 * @param {*} original                     Some sort of data
 * @param {object} [options]               Options to configure the behaviour of deepClone
 * @param {boolean} [options.strict=false]  Throw an Error if deepClone is unable to clone something instead of
 *                                          returning the original
 * @param {number} [options._d]             An internal depth tracker
 * @return {*}                             The clone of that data
 */
function deepClone(original, {strict = false, _d = 0} = {}) {
    if (_d > 100) {
        throw new Error("Maximum depth exceeded. Be sure your object does not contain cyclical data structures.");
    }
    _d++;

    // Simple types
    if ((typeof original !== "object") || (original === null)) return original;

    // Arrays
    if (original instanceof Array) return original.map(o => deepClone(o, {strict, _d}));

    // Dates
    if (original instanceof Date) return new Date(original);

    // Unsupported advanced objects
    if (original.constructor && (original.constructor !== Object)) {
        if (strict) throw new Error("deepClone cannot clone advanced objects");
        return original;
    }

    // Other objects
    const clone = {};
    for (let k of Object.keys(original)) {
        clone[k] = deepClone(original[k], {strict, _d});
    }
    return clone;
}

/**
 * A helper function which searches through an object to retrieve a value by a string key.
 * The method also supports arrays if the provided key is an integer index of the array.
 * The string key supports the notation a.b.c which would return object[a][b][c]
 * @param {object} object   The object to traverse
 * @param {string} key      An object property with notation a.b.c
 * @return {*}              The value of the found property
 */
function getProperty(object, key) {
    if (!key || !object) return undefined;
    if (key in object) return object[key];
    let target = object;
    for (let p of key.split('.')) {
        if (!target || (typeof target !== "object")) return undefined;
        if (p in target) target = target[p];
        else return undefined;
    }
    return target;
}

/**
 * Merge the source object into the original, returning a new object.
 * Arrays are overwritten, and only plain objects are deeply merged.
 * @param {object} original   The base object
 * @param {object} other      The object to merge into the original
 * @returns {object}          A new merged object
 */
function mergeObject(original, other) {
    const isObject = obj => obj && typeof obj === 'object' && obj.constructor === Object;

    if (!isObject(original)) return deepClone(other);
    if (!isObject(other)) return deepClone(original);

    const merged = deepClone(original);

    for (const [key, value] of Object.entries(other)) {
        if (isObject(value) && isObject(merged[key])) {
            merged[key] = mergeObject(merged[key], value);
        } else {
            merged[key] = deepClone(value);
        }
    }

    return merged;
}

global.foundry = {
    utils: {
        deepClone: vi.fn((original, options = {}) => {
            return deepClone(original, options);
        }),
        getProperty: vi.fn((object, key) => {
            return getProperty(object, key);
        }),
        mergeObject: vi.fn((original, other) => {
            return mergeObject(original, other);
        })
    }
};