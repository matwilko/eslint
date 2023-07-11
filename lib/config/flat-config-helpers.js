/**
 * @fileoverview Shared functions to work with configs.
 * @author Nicholas C. Zakas
 */

"use strict";

const compileJsonSchema = require("./compile-json-schema");

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
 * Gets the options schema for a rule (as defined by the rule)
 * @param {{ schema?: (object[] | object | null), meta?: { schema?: (object[] | object | null)} }} rule A rule object
 * @returns {object | null} The options schema as defined by the rule, or null if it does not provide one
 */
function getRuleOptionsSchema(rule) {
    if (!rule) {
        return null;
    }

    if (rule.schema) {
        return rule.schema;
    }

    if (rule.meta && rule.meta.schema) {
        return rule.meta.schema;
    }

    return null;
}

/**
 * A rule configuration validator that allows any options
 * @returns {void} Nothing
 */
function allowAnyOptions() {}

/**
 * A rule configuration validator that doesn't allow any options to be specified
 * @param {string} ruleName The name of the rule being validated
 * @param {Array<?>} options The context.options array to validate
 * @returns {void} Nothing
 * @throws {Error} If any options are specified
 */
function disallowOptions(ruleName, options) {
    if (options.length > 0) {
        throw new Error(`Key "rules": Key "${ruleName}": You must not specify any options (beyond severity) for this rule.`);
    }
}

/**
 * Makes a rule configuration validator from an array-format schema
 * @param {Array<object>} schemas The array of schemas to create a validator for
 * @returns {function(string, Array<?>): void} A function that validates the context.options array
 */
function makeArraySchemaValidator(schemas) {

    const validators = schemas.map(compileJsonSchema);

    return function(ruleName, options) {
        let allOptionErrors;

        for (let index = 0; index < options.length; index++) {
            const configurationArrayIndex = index + 1;
            const validator = validators[index];

            if (!validator) {
                allOptionErrors ??= [];
                allOptionErrors.push(`[${configurationArrayIndex}]: the rule does not support this many options.`);
            }

            const option = options[index];
            const optionErrors = validators(option);

            if (optionErrors.length) {
                allOptionErrors ??= [];

                for (const error of optionErrors) {
                    allOptionErrors.push(`[${configurationArrayIndex}]${error}`);
                }
            }
        }

        if (allOptionErrors) {
            throw new Error(`Key "rules": Key "${ruleName}": ${allOptionErrors.join("\n")}`);
        }
    };
}

/**
 * Makes a rule configuration validator from an object-format schema
 * @param {Object} schema The schema to create a validator for
 * @returns {function(string, Array<?>): void} A function that validates the context.options array
 */
function makeObjectSchemaValidator(schema) {

    const validator = compileJsonSchema(schema);

    return function(ruleName, options) {
        const errors = validator(options);


        if (errors.length) {
            throw new Error(`Key "rules": Key "${ruleName}": ${errors.join("\n")}`);
        }
    };
}

/**
 * Gets a validation function for context.options, based on the rule's option schema
 * @param {{schema?: (object[] | object | null), meta?: { schema?: (object[] | object | null)}}} rule A rule object
 * @returns {function(string, Array<?>): void } A function that returns if the configuration is valid, or throws an error if it is not
 * @throws {Error} If a rule object is not passed in
 */
function getRuleConfigurationValidator(rule) {

    if (!rule) {
        throw new Error("You must provide a rule");
    }

    const schema = getRuleOptionsSchema(rule);

    if (!schema) {
        return allowAnyOptions; // TODO: Change this to disallowOptions when https://github.com/eslint/rfcs/tree/main/designs/2021-schema-object-rules is being implemented
    }

    if (Array.isArray(schema) && schema.length === 0) {
        return disallowOptions;
    }

    return Array.isArray(schema)
        ? makeArraySchemaValidator(schema)
        : makeObjectSchemaValidator(schema);
}


//-----------------------------------------------------------------------------
// Exports
//-----------------------------------------------------------------------------

module.exports = {
    parseRuleId,
    getRuleFromConfig,
    getRuleOptionsSchema,
    getRuleConfigurationValidator
};
