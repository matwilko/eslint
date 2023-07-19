/**
 * @fileoverview Rule Validator
 * @author Nicholas C. Zakas
 */

"use strict";

//-----------------------------------------------------------------------------
// Requirements
//-----------------------------------------------------------------------------

const ajv = require("../shared/ajv")();
const {
    getRuleFromConfig,
    getRuleOptionsSchema
} = require("./flat-config-helpers");
const { RuleLookupError, searchForPartialRuleNameMatches } = require("./object-lookup");
const ruleReplacements = require("../../conf/replacements.json");

//-----------------------------------------------------------------------------
// Helpers
//-----------------------------------------------------------------------------

/**
 * Resolves a rule from the given config.
 * @param {Object} ruleId The rule identifier.
 * @param {Object} config The config to search in.
 * @returns {import("../shared/types").Rule} The resolved rule.
 * @throws {RuleLookupError} When the ruleId cannot be found in the config.
 */
function resolveRule(ruleId, config) {
    try {
        return getRuleFromConfig(ruleId, config);
    } catch (lookupError) {

        if (!(lookupError instanceof RuleLookupError)) {
            throw lookupError;
        }

        const { code, message } = lookupError;
        const errorMessageHeader = `Key "rules": Key "${ruleId}"`;

        if (ruleReplacements.rules[ruleId]) {
            throw new RuleLookupError(RuleLookupError.noBuiltIn, `${errorMessageHeader}: Rule "${ruleId}" was removed and replaced by "${ruleReplacements.rules[ruleId].join(", ")}".`);
        }

        const potentialAlternatives = [...searchForPartialRuleNameMatches(ruleId, config)];

        if (potentialAlternatives.length) {
            throw new RuleLookupError(code, `${errorMessageHeader}: ${message}. Did you mean ${potentialAlternatives.map(id => `"${id}"`).join(", ")}?`);
        } else {
            throw new RuleLookupError(code, `${errorMessageHeader}: ${message}`);
        }
    }
}

//-----------------------------------------------------------------------------
// Exports
//-----------------------------------------------------------------------------

/**
 * Implements validation functionality for the rules portion of a config.
 */
class RuleValidator {

    /**
     * Creates a new instance.
     */
    constructor() {

        /**
         * A collection of compiled validators for rules that have already
         * been validated.
         * @type {WeakMap}
         */
        this.validators = new WeakMap();
    }

    /**
     * Validates all of the rule configurations in a config against each
     * rule's schema.
     * @param {Object} config The full config to validate. This object must
     *      contain both the rules section and the plugins section.
     * @returns {void}
     * @throws {Error} If a rule's configuration does not match its schema.
     */
    validate(config) {

        if (!config.rules) {
            return;
        }

        for (const [ruleId, ruleOptions] of Object.entries(config.rules)) {

            // check for edge case
            if (ruleId === "__proto__") {
                continue;
            }

            /*
             * If a rule is disabled, we don't do any validation. This allows
             * users to safely set any value to 0 or "off" without worrying
             * that it will cause a validation error.
             *
             * Note: ruleOptions is always an array at this point because
             * this validation occurs after FlatConfigArray has merged and
             * normalized values.
             */
            if (ruleOptions[0] === 0) {
                continue;
            }

            const rule = resolveRule(ruleId, config);

            // Precompile and cache validator the first time
            if (!this.validators.has(rule)) {
                const schema = getRuleOptionsSchema(rule);

                if (schema) {
                    this.validators.set(rule, ajv.compile(schema));
                }
            }

            const validateRule = this.validators.get(rule);

            if (validateRule) {

                validateRule(ruleOptions.slice(1));

                if (validateRule.errors) {
                    throw new Error(`Key "rules": Key "${ruleId}": ${
                        validateRule.errors.map(
                            error => `\tValue ${JSON.stringify(error.data)} ${error.message}.\n`
                        ).join("")
                    }`);
                }
            }
        }
    }
}

exports.RuleValidator = RuleValidator;
