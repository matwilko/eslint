/**
 * @fileoverview Rule ID lookup functions for configs
 * @author Matt Wilkinson
 */

const { enumerateSplitPoints } = require("../shared/string-utils");

/**
 * Enumerates all possible plugin/rule combinations that could match a given rule ID.
 * @param {string} objectId The ID to search for matches of.
 * @param {Record<string, import("../shared/types").Plugin>} plugins The plugins to search.
 * @param {"rules" | "processors"} objectType The type of object to search for.
 */
function* enumerateObjectIdMatches(plugins, objectType, objectId) {
    // Splitting along slashes, find all plugin/object combinations that match the object ID (ambiguity is possible with flat configs!)
    for ([pluginName, objectName] of enumerateSplitPoints(objectId, "/")) {
        if (plugins[pluginName] && plugins[pluginName][objectType] && plugins[pluginName][objectType][objectName]) {
            yield { pluginName, objectName };
        }
    }
}

/** An error thrown when a rule ID cannot be found in the current config */
class RuleLookupError extends TypeError {

    static noBuiltIn = Symbol();
    static notInSpecifiedPlugin = Symbol();
    static notInAnyPlugin = Symbol();

    static #codes;

    static get codes() {
        if (!RuleLookupError.#codes) {
            RuleLookupError.#codes = Object.freeze(Object.values(RuleLookupError).filter(v => typeof v === "symbol"));
        }

        return RuleLookupError.#codes;
    }

    constructor(code, message, ...args) {
        super(message, ...args);

        if (typeof code === "symbol" && RuleLookupError.codes.includes(code)) {
            throw new TypeError(`Invalid RuleLookupError code: ${code}`);
        }

        Object.defineProperty(this, 'code', { value: code });
    }
}

/**
 * Resolves a rule ID into its plugin and rule name for the given config.
 * @param {string} ruleId The rule ID to resolve.
 * @param {Object} config The config to resolve the rule in
 * @param {Record<string, import("../shared/types").Plugin>} config.plugins The plugins to search.
 * @returns {{pluginName:string,ruleName:string}} The resolved plugin and rule names.
 * @throws {RuleLookupError} When the ruleId cannot be found in the config.
 */
function resolveRuleId(ruleId, { plugins }) {

    if (!ruleId || typeof ruleId !== "string" || !plugins || typeof plugins !== "object") {
        throw new RuleLookupError(RuleLookupError.notInAnyPlugin, `Could not find "${ruleId}" in any plugin.`);
    }

    const firstSlash = ruleId.indexOf("/");

    // Bare rule names are built-in rules
    if (firstSlash === -1) {
        if (plugins["@"] && plugins["@"].rules && plugins["@"].rules[ruleId]) {
            return { pluginName: "@", ruleName: ruleId };
        } else {
            throw new RuleLookupError(RuleLookupError.noBuiltIn, `There is no built-in rule with the name "${ruleId}".`);
        }
    }

    // Single slash, simple plugin lookup case, no possible ambiguity
    if (firstSlash === ruleId.lastIndexOf("/")) {
        const pluginName = ruleId.slice(0, firstSlash);
        const ruleName = ruleId.slice(firstSlash + 1);

        if (plugins[pluginName] && plugins[pluginName].rules && plugins[pluginName].rules[ruleName]) {
            return { pluginName, ruleName };
        } else {
            throw new RuleLookupError(RuleLookupError.notInSpecifiedPlugin, `Could not find "${ruleName}" in plugin "${pluginName}".`);
        }
    }

    // Multiple slashes, so potentially ambiguous between multiple plugins
    const matchingRules = [...enumerateRuleIdMatches(ruleId, config)];
    if (matchingRules.length) {
        // To match existing behaviour, ignore any potential ambiguity and just return the first match
        return matchingRules[0];
    } else {
        throw new RuleLookupError(RuleLookupError.notInAnyPlugin, `Could not find "${ruleId}" in any plugin.`);
    }
}

/**
 * Given a rule ID, finds all potential other rule IDs in the available
 * plugins that could match with the parts of the rule ID.
 * @param {string} ruleId The rule ID to search for.
 * @param {Object} config The config to search in.
 * @param {Record<string, import("../shared/types").Plugin>} plugins The plugins to search.
 * @returns {Iterable<string>} Any rule IDs that are found.
 */
function *searchForPartialRuleNameMatches(ruleId, { plugins }) {
    if (!plugins) {
        return;
    }

    for (const [_, ruleName] of enumerateSplitPoints(ruleId, "/", { includeStart: true })) {
        for (const pluginName of Object.keys(plugins)) {
            if (plugins[pluginName].rules && plugins[pluginName].rules[ruleName]) {
                yield `${pluginName}/${ruleName}`;
            }
        }
    }
}

module.exports = {
    RuleLookupError,
    resolveRuleId,
    searchForPartialRuleNameMatches
};
