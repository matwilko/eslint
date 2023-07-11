/**
 * @fileoverview Tests for FlatConfigArray
 * @author Nicholas C. Zakas
 */

"use strict";

//-----------------------------------------------------------------------------
// Requirements
//-----------------------------------------------------------------------------

const {
    parseRuleId,
    getRuleFromConfig,
    getRuleOptionsSchema
} = require("../../../lib/config/flat-config-helpers");
const { range, shuffle } = require("../../_utils");
const ajv = require("../../../lib/shared/ajv")();
const assert = require("chai").assert;

//-----------------------------------------------------------------------------
// Tests
//-----------------------------------------------------------------------------

describe("Config Helpers", () => {


    describe("parseRuleId()", () => {

        it("should return plugin name and rule name for core rule", () => {
            const result = parseRuleId("foo");

            assert.deepStrictEqual(result, {
                pluginName: "@",
                ruleName: "foo"
            });
        });

        it("should return plugin name and rule name with a/b format", () => {
            const result = parseRuleId("test/foo");

            assert.deepStrictEqual(result, {
                pluginName: "test",
                ruleName: "foo"
            });
        });

        it("should return plugin name and rule name with a/b/c format", () => {
            const result = parseRuleId("node/no-unsupported-features/es-builtins");

            assert.deepStrictEqual(result, {
                pluginName: "node",
                ruleName: "no-unsupported-features/es-builtins"
            });
        });

        it("should return plugin name and rule name with @a/b/c format", () => {
            const result = parseRuleId("@test/foo/bar");

            assert.deepStrictEqual(result, {
                pluginName: "@test/foo",
                ruleName: "bar"
            });
        });
    });

    describe("getRuleFromConfig", () => {
        it("should retrieve rule from plugin in config", () => {
            const rule = {};
            const config = {
                plugins: {
                    test: {
                        rules: {
                            one: rule
                        }
                    }
                }
            };

            const result = getRuleFromConfig("test/one", config);

            assert.strictEqual(result, rule);

        });

        it("should retrieve rule from core in config", () => {
            const rule = {};
            const config = {
                plugins: {
                    "@": {
                        rules: {
                            semi: rule
                        }
                    }
                }
            };

            const result = getRuleFromConfig("semi", config);

            assert.strictEqual(result, rule);

        });
    });

    describe("getRuleOptionsSchema", () => {
        it("should return null when no schema specified", () => {
            /* eslint-disable no-undefined -- manually testing that missing properties and undefined both are accounted for */
            assert.isNull(getRuleOptionsSchema({ }));
            assert.isNull(getRuleOptionsSchema({ schema: undefined }));
            assert.isNull(getRuleOptionsSchema({ schema: null }));
            assert.isNull(getRuleOptionsSchema({ meta: { } }));
            assert.isNull(getRuleOptionsSchema({ meta: { } }));
            assert.isNull(getRuleOptionsSchema({ schema: undefined, meta: { } }));
            assert.isNull(getRuleOptionsSchema({ schema: null, meta: { } }));
            assert.isNull(getRuleOptionsSchema({ meta: { schema: undefined } }));
            assert.isNull(getRuleOptionsSchema({ meta: { schema: null } }));
            assert.isNull(getRuleOptionsSchema({ schema: undefined, meta: { schema: undefined } }));
            assert.isNull(getRuleOptionsSchema({ schema: undefined, meta: { schema: null } }));
            assert.isNull(getRuleOptionsSchema({ schema: null, meta: { schema: undefined } }));
            assert.isNull(getRuleOptionsSchema({ schema: null, meta: { schema: null } }));
            assert.isNull(getRuleOptionsSchema({ schema: undefined, meta: { } }));
            assert.isNull(getRuleOptionsSchema({ schema: null, meta: { } }));
            /* eslint-enable no-undefined -- manually testing that missing properties and undefined both are accounted for  */
        });

        it("should create schema from rule.schema", () => {
            const outputSchema = getRuleOptionsSchema({ schema: [{ enum: [0] }] });

            assert.exists(outputSchema);
        });

        it("should create schema from rule.meta.schema", () => {
            const outputSchema = getRuleOptionsSchema({ meta: { schema: [{ enum: [0] }] } });

            assert.exists(outputSchema);
        });

        it("should prefer rule.schema over rule.meta.schema", () => {
            const outputSchema = getRuleOptionsSchema({
                schema: [{ enum: [0] }],
                meta: { schema: [{ enum: [1] }] }
            });

            assert.isTrue(ajv.validate(outputSchema, [0]));
            assert.isFalse(ajv.validate(outputSchema, [1]));
        });

        it("should use rule.meta.schema when rule.schema not specified", () => {
            /* eslint-disable no-undefined -- manually testing that rule.schema = undefined is accounted for */
            assert.exists(getRuleOptionsSchema({ schema: null, meta: { schema: [{ enum: [0] }] } }));
            assert.exists(getRuleOptionsSchema({ schema: undefined, meta: { schema: [{ enum: [0] }] } }));
            /* eslint-enable no-undefined -- manually testing that rule.schema = undefined is accounted for  */
        });

        const testSchemas = range(11)
            .map(i => range(i).map(n => ({ enum: [n] })))
            .map(arr => ({ schema: arr }));

        for (const testSchema of testSchemas) {
            describe(`for schema array with ${testSchema.schema.length} elements`, () => {

                it("should create a schema", () => {
                    const outputSchema = getRuleOptionsSchema(testSchema);

                    assert.exists(outputSchema);
                });

                it("should return an array schema", () => {
                    const outputSchema = getRuleOptionsSchema(testSchema);

                    assert.strictEqual(outputSchema.type, "array");
                });

                it("should allow an empty array", () => {
                    const outputSchema = getRuleOptionsSchema(testSchema);

                    assert.isTrue(ajv.validate(outputSchema, []));
                });

                it("should allow arrays of all sizes up to the length of the schema array", () => {
                    const outputSchema = getRuleOptionsSchema(testSchema);

                    for (let i = 1; i <= testSchema.schema.length; i++) {
                        const testArray = range(i);

                        assert.isTrue(ajv.validate(outputSchema, testArray));
                    }
                });

                it("should reject arrays longer than the length of the schema array", () => {
                    const outputSchema = getRuleOptionsSchema(testSchema);

                    for (let i = testSchema.schema.length + 1; i <= testSchema.schema.length + 10; i++) {
                        const testArray = range(i);

                        assert.isFalse(ajv.validate(outputSchema, testArray));
                    }
                });

                if (testSchema.schema.length > 1) {

                    // There aren't any permutations for 0 and 1 length arrays, so this test doesn't make sense for them

                    it("should require same order as array schema", () => {
                        const outputSchema = getRuleOptionsSchema(testSchema);
                        const testArray = range(testSchema.schema.length);

                        assert.isTrue(ajv.validate(outputSchema, testArray));

                        const shuffledTestArray = shuffle(testArray);

                        assert.isFalse(ajv.validate(outputSchema, shuffledTestArray));
                    });
                }
            });
        }

        it("should return same schema when schema is object", () => {
            const outputSchema = getRuleOptionsSchema({ schema: { enum: [0] } });

            assert.deepStrictEqual(outputSchema, { enum: [0] });
        });

    });

});
