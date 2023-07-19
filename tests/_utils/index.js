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
 * Asserts the the given function throws an error matching the condition checked by the given matcher function.
 * @param {function()} func The function to execute and expect to throw an error.
 * @param {function(Error): boolean} errorMatcher The predicate function to check the error against.
 * @param {string} errorDescription A text description of the condition that errorMatcher is checking.
 * @returns {void}
 * @throws If the given function does not throw an error, or if the thrown error does not match the given condition.
 */
function assertThrows(func, errorMatcher, errorDescription) {
    try {
        func();
    } catch (err) {
        if (!errorMatcher(err)) {
            throw errorDescription
                ? new Error(`Error thrown did not match the given condition: ${errorDescription}`)
                : new Error("Error thrown did not match the given condition.");
        }

        return;
    }

    throw new Error("Expected an error to be thrown, but no error was thrown.");
}

//-----------------------------------------------------------------------------
// Exports
//-----------------------------------------------------------------------------

module.exports = {
    unIndent,
    defineInMemoryFs,
    createCustomTeardown,
    assertThrows
};
