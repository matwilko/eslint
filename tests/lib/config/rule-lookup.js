/**
 * @fileoverview Tests for rule lookup
 * @author Matt Wilkinson
 */
"use strict";

const {
    RuleLookupError,
    resolveRuleId,
    searchForPartialRuleNameMatches
} = require("../../../lib/config/rule-lookup");
const { assertThrows } = require("../../_utils");
const assert = require("chai").assert;
const builtInRules = Object.fromEntries(require("../../../lib/rules").entries);

function assertThrowsRuleLookupErrorWithCode(fn, code) {
    assert.throws(() => resolveRuleId("foo", {}), RuleLookupError);
    assertThrows(() => resolveRuleId("foo", {}), error => error.code === code, "Error code is ${code}");
}

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

describe("RuleLookupError", () => {

    for (const code of RuleLookupError.codes) {
        it(`should successfully construct a RuleLookupError with code '${code}'`, () => {
            const error = new RuleLookupError(code, "");

            assert.toBeInstanceOf(error, RuleLookupError);
            assert.strictEqual(error.code, code);
        });
    }

    const invalidValues = {
        undefined: void 0,
        null: null,
        "\"\"": "",
        5: 5,
        "[]": [],
        // eslint-disable-next-line object-shorthand -- We want to retain the exact form of the string and the function
        "() => {}": () => {},
        ...Object.fromEntries(RuleLookupError.codes.map(c => [c.toString(), c.toString()]))
    };

    for (const [testValueStr, testValue] of Object.entries(invalidValues)) {
        it(`should throw a TypeError when constructed with invalid code '${testValueStr}'`, () => {
            assert.throws(() => new RuleLookupError(testValue, ""), TypeError);
        });
    }
});

const testConfig = {
    plugins: {
        "@": { rules: builtInRules },
        a: {
            rules: {
                1: {},
                2: {},
                "3/4": {},
            }
        },
        b: {
            rules: {
                1: {},
                2: {}
            }
        },
        "a/3": {
            rules: {
                4: {}
            }
        },
        "@c": {
            1: {},
            "2/3": {},
            "4/5/6": {}
        },
        "@d/e": {
            1: {},
            "2/3": {},
            "4/5/6": {}
        }
    }
};

describe("resolveRuleId", () => {

    describe("parameter validation", () => {
        const invalidValues = {
            undefined: void 0,
            null: null,
            "\"\"": "",
            5: 5,
            "[]": [],
            // eslint-disable-next-line object-shorthand -- We want to retain the exact form of the string and the function
            "() => {}": () => {},
            "Symbol.toStringTag": Symbol.toStringTag
        };

        for (const [testValueStr, testValue] of Object.entries(invalidValues)) {

            it(`should throw RuleLookupError.notInAnyPlugin when ruleId is ${testValueStr}`, () => {
                assertThrowsRuleLookupErrorWithCode(() => resolveRuleId(testValue, { plugins: { "@": {} } }), RuleLookupError.notInAnyPlugin);
            });

            it(`should throw RuleLookupError.notInAnyPlugin when plugins is ${testValueStr}`, () => {
                assertThrowsRuleLookupErrorWithCode(() => resolveRuleId("foo", { plugins: testValue }), RuleLookupError.notInAnyPlugin);
            });

            it(`should throw TypeError when config is ${testValueStr}`, () => {
                assert.throws(() => resolveRuleId("foo", testValue), TypeError);
            });
        }

        it("should throw RuleLookupError.notInAnyPlugin when plugins missing", () => {
            assertThrowsRuleLookupErrorWithCode(() => resolveRuleId("foo", { }), RuleLookupError.notInAnyPlugin);
        });
    });

    describe("successful resolutions", () => {

        for (const builtInRuleId of Object.keys(builtInRules)) {
            it(`should resolve to the built-in plugin @ when ruleId is '${builtInRuleId}'`, () => {
                const { pluginName, ruleName } = resolveRuleId(builtInRuleId, testConfig);

                assert.strictEqual(pluginName, "@");
                assert.strictEqual(ruleName, builtInRuleId);
            });
        }


        Object.keys(testConfig.plugins).flatMap(pluginName => )



    });



    describe("built-in plugins", () => {

        it("should throw RuleLookupError.notInSpecifiedPlugin when config.plugins is not empty", () => {
        });
    });
});
