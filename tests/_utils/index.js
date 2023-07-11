/**
 * @fileoverview Utilities used in tests
 */

"use strict";

//-----------------------------------------------------------------------------
// Requirements
//-----------------------------------------------------------------------------

const {
    defineInMemoryFs
} = require("./in-memory-fs");

const { createTeardown, addFile } = require("fs-teardown");

//-----------------------------------------------------------------------------
// Helpers
//-----------------------------------------------------------------------------

/**
 * Prevents leading spaces in a multiline template literal from appearing in the resulting string
 * @param {string[]} strings The strings in the template literal
 * @param {any[]} values The interpolation values in the template literal.
 * @returns {string} The template literal, with spaces removed from all lines
 */
function unIndent(strings, ...values) {
    const text = strings
        .map((s, i) => (i === 0 ? s : values[i - 1] + s))
        .join("");
    const lines = text.replace(/^\n/u, "").replace(/\n\s*$/u, "").split("\n");
    const lineIndents = lines.filter(line => line.trim()).map(line => line.match(/ */u)[0].length);
    const minLineIndent = Math.min(...lineIndents);

    return lines.map(line => line.slice(minLineIndent)).join("\n");
}

/**
 * Creates a new filesystem volume at the given location with the given files.
 * @param {Object} desc A description of the filesystem volume to create.
 * @param {string} desc.cwd The current working directory ESLint is using.
 * @param {Object} desc.files A map of filename to file contents to create.
 * @returns {Teardown} An object with prepare(), cleanup(), and getPath()
 *      methods.
 */
function createCustomTeardown({ cwd, files }) {
    const { prepare, cleanup, getPath } = createTeardown(
        cwd,
        ...Object.keys(files).map(filename => addFile(filename, files[filename]))
    );

    return { prepare, cleanup, getPath };
}

/**
 * Generates a array of numbers from 0 to count - 1
 * @param {number} count The number of integers to generate
 * @returns {number[]} An array containing the integers from 0 to count - 1
 */
function range(count) {
    const arr = Array(count);

    for (let i = 0; i < count; i++) {
        arr[i] = i;
    }

    return arr;
}

/**
 * Geenrate random integer between min (inclusive) and max (exclusive)
 * @param {number} min The lower bound (inclusive)
 * @param {number} max The upper bound (exclusive)
 * @returns {number} A random integer between min (inclusive) and max (exclusive)
 */
function randomInRange(min, max) {
    const integerMin = Math.ceil(min);
    const integerMax = Math.floor(max);

    return Math.floor(Math.random() * (integerMax - integerMin)) + integerMin;
}

/**
 * Tests whether the elements of the two given arrays are equivalent, using strict equality for comparison.
 * @param {any[]} a The first array
 * @param {any[]} b The second array
 * @returns {boolean} True if the arrays are equivalent, false otherwise
 */
function arrayStrictEqual(a, b) {
    if (a.length !== b.length) {
        return false;
    }

    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            return false;
        }
    }

    return true;
}

/**
 * Returns a shuffled copy of the given array, with a guaranteed different order.
 * @param {any[]} arr The array to shuffle
 * @returns {any[]} The shuffled array
 */
function shuffle(arr) {
    if (arr.length < 2) {
        return [...arr];
    }

    if (arr.length === 2) {
        return [arr[1], arr[0]];
    }

    const shuffledArray = new Array(arr.length);

    do {
        for (let i = 0; i < arr.length; i++) {
            const indexToInsert = randomInRange(0, i + 1);

            if (indexToInsert !== i) {
                shuffledArray[i] = shuffledArray[indexToInsert];
            }

            shuffledArray[indexToInsert] = arr[i];
        }
    } while (arrayStrictEqual(arr, shuffledArray));

    return shuffledArray;
}


//-----------------------------------------------------------------------------
// Exports
//-----------------------------------------------------------------------------

module.exports = {
    unIndent,
    defineInMemoryFs,
    createCustomTeardown,
    range,
    randomInRange,
    arrayStrictEqual,
    shuffle
};
