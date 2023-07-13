/**
 * @fileoverview Utilities to operate on strings.
 * @author Stephen Wade
 */

"use strict";

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const Graphemer = require("graphemer").default;

//------------------------------------------------------------------------------
// Helpers
//------------------------------------------------------------------------------

// eslint-disable-next-line no-control-regex -- intentionally including control characters
const ASCII_REGEX = /^[\u0000-\u007f]*$/u;

/** @type {Graphemer | undefined} */
let splitter;

//------------------------------------------------------------------------------
// Public Interface
//------------------------------------------------------------------------------

/**
 * Converts the first letter of a string to uppercase.
 * @param {string} string The string to operate on
 * @returns {string} The converted string
 */
function upperCaseFirst(string) {
    if (string.length <= 1) {
        return string.toUpperCase();
    }
    return string[0].toUpperCase() + string.slice(1);
}

/**
 * Counts graphemes in a given string.
 * @param {string} value A string to count graphemes.
 * @returns {number} The number of graphemes in `value`.
 */
function getGraphemeCount(value) {
    if (ASCII_REGEX.test(value)) {
        return value.length;
    }

    if (!splitter) {
        splitter = new Graphemer();
    }

    return splitter.countGraphemes(value);
}

/**
 * Splits a string in two at each occurrence of the separator,
 * yielding the parts before and after each instance of the separator.
 * If includeStart or includeEnd is true, the string is considered to be surrounded
 * by a copy of the separator at the selected end.
 * @param {string} str The string to split
 * @param {string} separator The separator to split on
 * @param {Object} options Options to control the split
 * @param {boolean} options.includeStart Whether or not to treat the start of the
 * string as a separator
 * @param {boolean} options.includeEnd Whether or not to treat the end of the
 * string as a separator
 * @returns {Iterable<[string, string]>} The two parts of the string
 * either side of each instance of the separator
 * @throws When str or separator are not strings, or separator is empty
 */
function *enumerateSplitPoints(str, separator, { includeStart, includeEnd } = {}) {
    if (typeof str !== "string") {
        throw new TypeError("str must be a string");
    }

    if (typeof separator !== "string" || separator.length === 0) {
        throw new TypeError("separator must be a non-empty string");
    }

    if (includeStart) {
        yield ["", str];
    }

    for (let splitPoint = str.indexOf(separator); splitPoint > 0; splitPoint = str.indexOf(separator, splitPoint + separator.length)) {
        yield [str.slice(0, splitPoint), str.slice(splitPoint + separator.length)];
    }

    if (includeEnd) {
        yield [str, ""];
    }
}

module.exports = {
    upperCaseFirst,
    getGraphemeCount,
    enumerateSplitPoints
};
