/**
 * @fileoverview Shared functions to work with configs.
 * @author Nicholas C. Zakas
 */

"use strict";

//-----------------------------------------------------------------------------
// Requirements
//-----------------------------------------------------------------------------

const ajv = require("../shared/ajv")();

//-----------------------------------------------------------------------------
// Functions
//-----------------------------------------------------------------------------

/**
 * Parses a ruleId into its plugin and rule parts.
 * @param {string} ruleId The rule ID to parse.
 * @returns {{pluginName:string,ruleName:string}} The plugin and rule
 *      parts of the ruleId;
 */
function parseRuleId(ruleId) {
    let pluginName, ruleName;

    // distinguish between core rules and plugin rules
    if (ruleId.includes("/")) {

        // mimic scoped npm packages
        if (ruleId.startsWith("@")) {
            pluginName = ruleId.slice(0, ruleId.lastIndexOf("/"));
        } else {
            pluginName = ruleId.slice(0, ruleId.indexOf("/"));
        }

        ruleName = ruleId.slice(pluginName.length + 1);
    } else {
        pluginName = "@";
        ruleName = ruleId;
    }

    return {
        pluginName,
        ruleName
    };
}

/**
 * Retrieves a rule instance from a given config based on the ruleId.
 * @param {string} ruleId The rule ID to look for.
 * @param {FlatConfig} config The config to search.
 * @returns {import("../shared/types").Rule|undefined} The rule if found
 *      or undefined if not.
 */
function getRuleFromConfig(ruleId, config) {

    const { pluginName, ruleName } = parseRuleId(ruleId);

    const plugin = config.plugins && config.plugins[pluginName];
    let rule = plugin && plugin.rules && plugin.rules[ruleName];


    // normalize function rules into objects
    if (rule && typeof rule === "function") {
        rule = {
            create: rule
        };
    }

    return rule;
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

    // Force errors by passing a value that will never be accepted by a schema - undefined is not a valid JSON value
    compiledSchema(void 0);

    if (!compiledSchema.errors) {

        /*
         * This should never happen - if the schema is doing something weird enough
         * to let undefined be a valid value then we should probably ignore it
         */
        return false;
    }

    /*
     * Since the top-level value won't match any `type` clause in the schema, the errors will either be
     * type errors, or errors from `allOf`, `anyOf` or `oneOf` clauses. We only care about the type errors.
     */
    const topLevelTypeErrors = compiledSchema.errors.filter(error => error.dataPath === "" && error.keyword === "type");

    if (topLevelTypeErrors.some(error => error.params.type !== "array")) {

        // Don't keep the bad schema in the ajv compilation cache
        ajv.removeSchema(schema);

        return false;
    }

    return true;
}

/**
 * Gets a complete options schema for a rule.
 * @param {{create: Function, schema: (Array|null)}} rule A new-style rule object
 * @returns {Object} JSON Schema for the rule's options.
 */
function getRuleOptionsSchema(rule) {

    if (!rule) {
        return null;
    }

    const schema = rule.schema || rule.meta && rule.meta.schema;

    if (Array.isArray(schema)) {
        if (schema.length) {
            return {
                type: "array",
                items: schema,
                minItems: 0,
                maxItems: schema.length
            };
        }
        return {
            type: "array",
            minItems: 0,
            maxItems: 0
        };

    }

    if (typeof schema !== "object") {
        return null;
    }

    if (validateJsonSchemaOnlyAcceptsArraysAtTopLevel(schema)) {
        return null;
    }

    return schema;
}


//-----------------------------------------------------------------------------
// Exports
//-----------------------------------------------------------------------------

module.exports = {
    parseRuleId,
    getRuleFromConfig,
    getRuleOptionsSchema
};
