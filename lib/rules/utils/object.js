"use strict";

/**
 * Creates a new object with the same keys as the given object,
 * but with each value replaced by the result of calling the given
 * mapping function.
 * @param {Object} obj The object to map.
 * @param {function(?, string, Object): ?} mapFn The mapping function,
 * taking the value of the current key, the key itself, and the original
 * object as parameters.
 * @returns {Object} The mapped object.
 */
function mapValues(obj, mapFn) {
    const newObj = {};

    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            newObj[key] = mapFn(obj[key], key, obj);
        }
    }

    return newObj;
}

module.exports = {
    mapValues
};
