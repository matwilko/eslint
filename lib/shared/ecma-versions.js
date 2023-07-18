/**
 * @fileoverview Helpers for working with ECMAScript versions and ESLint's support for them.
 *
 * In general, all the helpers in this file will take in an ECMAScript spec version as a case-insensitive
 * string of the form "es3", "es5", "es6"-"es99", "es2015"-"es2099", or a number representing the spec
 * revision number or the year of the spec.
 *
 * The helpers will normalize all these to the number form, though the exact form of the number output depends on the function.
 *
 * Most of the helpers will by default limit the output versions to those supported by ESLint,
 * but this can be disabled with { limitToSupportedVersions: false }.
 *
 * @author Matt Wilkinson
 */

"use strict";

const globals = require("../../conf/globals");

// Cover ES3, ES5, ES6-99, ES2015-2019, ES2020-2099
const ecmaVersionRegex = /^es(?<version>3|5|[6-9]|[1-9][0-9]|201[5-9]|20[2-9][0-9])$/ui;

/**
 * Validates a number or converts a string representing
 * an ECMAScript version to a number.
 * @param {string | number} version The version to validate or convert.
 * @param {{ limitToSupportedVersions: boolean }} [options] Options.
 * @param {boolean} [options.limitToSupportedVersions=true] If true, only returns versions supported by ESLint.
 * @returns {number | null} The ECMAScript version number, or null if the version is invalid.
 */
function getEcmaVersionNumberFromStringOrNumber(version, { limitToSupportedVersions } = { limitToSupportedVersions: true }) {

    if (typeof version === "number") {

        // eslint-disable-next-line no-use-before-define -- not a problem, because we know all the usages of this function before calling isSupportedEcmaVersion disable this check
        if (limitToSupportedVersions && !isSupportedEcmaVersion(version)) {
            return null;
        }

        return version === 3 || version === 5 || (6 <= version && version < 100) || (2015 <= version && version < 2100)
            ? version
            : null;

    }

    const versionMatch = ecmaVersionRegex.exec(version);

    if (!versionMatch) {
        return null;
    }

    // eslint-disable-next-line no-use-before-define -- not a problem, because we know all the usages of this function before calling isSupportedEcmaVersion disable this check
    if (limitToSupportedVersions && !isSupportedEcmaVersion(version)) {
        return null;
    }

    return Number.parseInt(versionMatch.groups.version, 10);
}

/**
 * Tests whether the given value is a string representing an ECMAScript version.
 * @param {string | number} version A value to test.
 * @returns {boolean} True if the value is a string representing a valid ECMAScript version.
 * The version does not necessarily exist yet, as the spec is updated over time,
 * and this function covers potential revisions up to the year 2099.
 */
function isEcmaVersion(version) {
    return getEcmaVersionNumberFromStringOrNumber(version, { limitToSupportedVersions: false }) !== null;
}

/**
 * Gets the equivalent spec year for the given ECMAScript version string.
 * @param {string | number} version The ECMAScript version number or string to convert.
 * @param {{ limitToSupportedVersions: boolean }} [options] Options.
 * @param {boolean} [options.limitToSupportedVersions=true] If true, only convert versions supported by ESLint.
 * @returns {number | null} The equivalent spec year for the given
 * ECMAScript version string, or null if the version is not a valid
 * ECMAScript version string, or the version is ES3 or ES5.
 * Null if the version is not a valid ECMAScript version,
 * or, when limitToSupportedVersions is true if the version is not supported by ESLint.
 */
function ecmaVersionToYear(version, { limitToSupportedVersions } = { limitToSupportedVersions: true }) {

    const versionNum = getEcmaVersionNumberFromStringOrNumber(version, { limitToSupportedVersions });

    if (!versionNum) {
        return null;
    }

    // ES2015 - ES2099
    if (versionNum >= 2015) {
        return versionNum;
    }

    // Only ES6 onwards had a matching year
    return versionNum >= 6
        ? 2009 + versionNum
        : null;
}

/**
 * Gets the equivalent spec revision number for the given ECMAScript version string.
 * @param {string | number} version The ECMAScript version number or string to convert.
 * @param {{ limitToSupportedVersions: boolean }} [options] Options.
 * @param {boolean} [options.limitToSupportedVersions=true] If true, only converts versions supported by ESLint.
 * @returns {number | null} The equivalent spec revision number for the given
 * ECMAScript version string, or null if the version is not a valid
 * ECMAScript version string.
 */
function ecmaVersionToSpecRevision(version, { limitToSupportedVersions } = { limitToSupportedVersions: true }) {

    const versionNum = getEcmaVersionNumberFromStringOrNumber(version, { limitToSupportedVersions });

    // ES2015 - ES2099
    if (versionNum >= 2015) {
        return version - 2009;
    }

    // ES3, ES5, ES6 - ES99
    if (versionNum >= 5 || versionNum === 3) {
        return versionNum;
    }

    return null;
}

/**
 * Compares two ECMAScript version strings or numbers.
 * @param {string | number} versionA The first version to compare.
 * @param {string | number} versionB The second version to compare.
 * @returns {number} If versionA is an earlier version than
 * versionB, -1. If versionA is a later version than versionB, 1.
 * If the versions are the same, 0.
 * @throws {Error} If either version is not a valid ECMAScript version.
 */
function compareEcmaVersions(versionA, versionB) {
    const revisionA = ecmaVersionToSpecRevision(versionA, { limitToSupportedVersions: false });
    const revisionB = ecmaVersionToSpecRevision(versionB, { limitToSupportedVersions: false });

    if (!revisionA) {
        throw new Error(`Invalid ECMAScript version: ${versionA}`);
    }

    if (!revisionB) {
        throw new Error(`Invalid ECMAScript version: ${versionB}`);
    }

    if (revisionA === revisionB) {
        return 0;
    }

    return revisionA < revisionB
        ? -1
        : 1;
}

/**
 * Converts the given ECMAScript version string to a canonical form.
 * @param {string | number} version The ECMAScript version number or string to convert.
 * @param {{ limitToSupportedVersions: boolean }} [options] Options.
 * @param {boolean} [options.limitToSupportedVersions=true] If true, only canonicalize versions supported by ESLint.
 * @returns {number | null} The canonical form of the given ECMAScript version.
 * For ES6/ES2015+, the year form is considered canonical, while ES3 and ES5
 * use the spec revision form. Null if the version is not a valid ECMAScript version
 * or, when limitToSupportedVersions is true, the version is not supported by ESLint.
 */
function canonicalizeEcmaVersion(version, { limitToSupportedVersions } = { limitToSupportedVersions: true }) {
    const versionNum = getEcmaVersionNumberFromStringOrNumber(version, { limitToSupportedVersions });

    return ecmaVersionToYear(versionNum, { limitToSupportedVersions }) ||
        ecmaVersionToSpecRevision(versionNum, { limitToSupportedVersions }) ||
        null;
}

/**
 * An array of the canonicalized ECMAScript versions supported by ESLint.
 * This will generally be [3, 5, 2015, 2016, ...].
 * @type { ReadonlyArray<number> }
 */
const supportedEcmaVersions = Object.freeze(Object.keys(globals)
    .filter(isEcmaVersion)
    .map(key => canonicalizeEcmaVersion(key, { limitToSupportedVersions: false }))
    .sort(compareEcmaVersions));

/**
 * The latest version of ECMAScript that ESLint supports, in year form.
 * @type { number }
 */
const latestSupportedEcmaVersion = Math.max(...supportedEcmaVersions);

const supportedEcmaVersionsSet = new Set(supportedEcmaVersions);

/**
 * Tests whether ESLint supports the given ECMA version.
 * @param {string | number} version The version to test.
 * @returns {boolean} True if ESLint supports the given ECMA version.
 */
function isSupportedEcmaVersion(version) {
    return supportedEcmaVersionsSet.has(canonicalizeEcmaVersion(version, { limitToSupportedVersions: false }));
}

module.exports = {
    isEcmaVersion,
    ecmaVersionToYear,
    ecmaVersionToSpecRevision,
    compareEcmaVersions,
    canonicalizeEcmaVersion,
    supportedEcmaVersions,
    latestSupportedEcmaVersion,
    isSupportedEcmaVersion
};
