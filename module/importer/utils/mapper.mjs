import {logger} from '../../utils/logger.mjs'

/**
 * Map a String value, if it is not present, return an empty string.
 * @param label {string} The label of the element.
 * @param value {string} The value of the element.
 * @returns {string} The mapped value of the element.
 */
export function mapMandatoryString(label, value) {
    if (value == null || typeof value !== 'string') {
        logger.warn(`Value ${label} is mandatory !`)
        return ''
    }
    return value
}

/**
 * Map an optional String value, if it is not present, return an empty string.
 * @param value {string} The value of the element.
 * @returns {string} The mapped value of the element.
 */
export function mapOptionalString(value) {
    return typeof value === 'string' ? value : ''
}

/**
 * Map a String value to a Number, if it is not present, return 0.
 * @param label {string} The label of the element.
 * @param value {string} The value of the element.
 * @returns {number} The mapped value of the element.
 */
export function mapMandatoryNumber(label, value) {
    if (value == null || typeof value !== 'string') {
        logger.warn(`Value ${label} is mandatory !`)
        return 0
    }
    return Number.parseInt(value) || 0
}

/**
 * Map an optional Number value, if it is not present, return 0.
 * @param value {string} The value of the element.
 * @returns {number|number} The mapped value of the element.
 */
export function mapOptionalNumber(value) {
    return Number.parseInt(value) || 0
}

/**
 * Map a Boolean value, if it is not present, return false.
 * @param label {string} The label of the element.
 * @param value {string} The value of the element.
 * @returns {boolean} The mapped value of the element.
 */
export function mapMandatoryBoolean(label, value) {
    if (value == null || typeof value !== 'string') {
        logger.warn(`Value ${label} is mandatory !`)
        return false
    }
    return value === 'true'
}

/**
 *  Map a Boolean value, if it is not present, return false.
 * @param value {string} The value of the element.
 * @returns {boolean} The mapped value of the element.
 */
export function mapOptionalBoolean(value) {
    return value === 'true'
}

/**
 * Map an optional array value, if it is not present, return an empty array.
 * @param value {Array} The value of the element.
 * @param mapper {function} The function to map the value.
 * @returns {*[]} The mapped value of the element as an array.
 */
export function mapOptionalArray(value, mapper) {
    if (value != null && Array.isArray(value)) {
        return value.map((v) => {
            return mapper(v)
        })
    }
    // Single object case (non-null, non-array)
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        return [mapper(value)]
    }
    return []
}

/**
 * Map an optional array value, if it is not present, return an empty array.
 * @param value {Object} The value of the element.
 * @param mapper {function} The function to map the value.
 * @returns {Object} The mapped value of the element as an object.
 */
export function mapOptionalObject(value, mapper) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        return [mapper(value)]
    }
    return {}
}
