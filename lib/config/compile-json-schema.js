/**
 * @fileoverview
 */
"use strict";

const ajv = require("../shared/ajv.js")();

const emptyArray = Object.freeze([]);

/**
 * A "compiled schema" that always succeeds.
 * @returns {string[]} An empty validation errors array.
 */
function alwaysSucceedsCompiledSchema() {
    return emptyArray;
}

/**
 * Compiles a given JSON schema into a function that can be used to validate objects.
 * The validation function will return an array of any detected errors.
 * @param {Object} schema The JSON schema to compile. Invalid JSON schemas will result in a validation function that accepts any value.
 * @returns {function(?): string[]} A function that can be used to validate objects against the given schema.
 */
function compileJsonSchema(schema) {
    try {
        const compiledSchema = ajv.compile(schema);

        return function(object) {
            if (compiledSchema(object)) {
                return emptyArray;
            }

            const errors = compiledSchema.errors.map(error => `${error.dataPath} ${error.message}.`);

            // Don't keep the errors array hanging around in memory
            compiledSchema.errors = null;

            return errors;
        };
    } catch {

        /*
         * At runtime, we always ignore schemas that don't compile properly, and they simply pass validation.
         * It is up to plugin authors to make sure published schemas are valid.
         * RuleTester should be where invalid schemas are highlighted.
         */
        return alwaysSucceedsCompiledSchema;
    }
}

/**
 * Validates that the given schema will only perform validation against an array at the top level.
 * If the schema allows any other type at the top-level, even if an array value _could_ be accepted
 * by an alternative in an "anyOf" or "oneOf" clause, it is rejected, because the errors the schema
 * would generate would be very confusing for users.
 * @param {Object} schema The schema to validate
 * @returns {boolean} True if the schema only accepts arrays at the top level, false otherwise.
 */
function validateJsonSchemaOnlyAcceptsArraysAtTopLevel(schema) {

    let compiledSchema;

    try {
        compiledSchema = ajv.compile(schema);
    } catch {
        return false;
    }

    // undefined is a value that will never be accepted by a schema - it's not a valid JSON value
    compiledSchema(void 0);

    const topLevelTypeErrors = compiledSchema.errors.filter(error => error.dataPath === "" && error.keyword === "type");

    if (topLevelTypeErrors.any(error => error.params.type !== "array")) {

        // Don't keep the bad schema in the ajv compilation cache
        ajv.removeSchema(schema);

        return false;
    }

    return true;
}

module.exports = {
    compileJsonSchema,
    validateJsonSchemaOnlyAcceptsArraysAtTopLevel
};
