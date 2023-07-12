/**
 * @fileoverview Utilities to generate a bunch of tests cases for the no-loop-func rule.
 * The various combinations of loop types and variable declaration sites makes it hard
 * to ensure that there aren't missing cases in the test suite. This module generates
 * all the combinations of loop types and variable declaration sites, and then generates
 * a test case for each combination.
 * @author Matt Wilkinson
 */
"use strict";

/**
 * Computes the cartesian product of the three arrays,
 * that is, the set of all triplets of values from the arrays,
 * and applies the given function to each triplet of values,
 * returning the set of  generated value from the function.
 * @param {Array<?>} array1 The first array to draw values from.
 * @param {Array<?>} array2 The second array to draw values from.
 * @param {Array<?>} array3 The third array to draw values from.
 * @param {function(?, ?, ?): ?} func The function to apply to the three values.
 * @returns {Array<?>} The iterator for the generated values.
 */
function cartesianProduct3(array1, array2, array3, func) {

    const result = new Array(array1.length * array2.length * array3.length);
    let index = 0;

    for (const a of array1) {
        for (const b of array2) {
            for (const c of array3) {
                result[index++] = func(a, b, c);
            }
        }
    }

    return result;
}

const declarationKeywords = ["let", "const", "var"];
const declarationForms = [
    "i",

    "[i]",
    "[, i]",
    "[i = 5, ]",
    "[, , ...i]",
    "[a, b, ...{ i }]",
    "[a, b, ...[c, i]]",

    "{ i }",
    "{ a: i }",
    "{ a: i = 5 }",
    "{ [key]: i }",
    "{ a: [i] }",
    "{ [key]: [i] }"
];
const varAccess = [
    ["", ""], // No variable access should always pass
    ["i", "i"],
    ["undeclared", "undeclared"], // Undeclared variable access should be equivalent to no variable access and always pass

    // Nested function variants
    ["(function() { })", ""], // No variable access should always pass
    ["(function() { i; })", "i"],
    ["(function() { undeclared; })", "undeclared"] // Undeclared variable access should be equivalent to no variable access and always pass
];

const testCases = cartesianProduct3(declarationKeywords, declarationForms, varAccess, (declType, variableForm, [variableAccessExpr, variableName]) => [

    // Basic loops to test simple loop variable capture
    {
        code: `for (${declType} ${variableForm} = []; i;) { (function() { ${variableAccessExpr}; }); }`,
        parserOptions: { ecmaVersion: 6 },
        invalid: declType === "var" && variableName === "i",
        errors: [{ messageId: "unsafeRefs", data: { varNames: `'${variableName}'` }, type: "FunctionExpression" }]
    },
    {
        code: `for (${declType} ${variableForm} of []) { (function() { ${variableAccessExpr}; }); }`,
        parserOptions: { ecmaVersion: 6 },
        invalid: declType === "var" && variableName === "i",
        errors: [{ messageId: "unsafeRefs", data: { varNames: `'${variableName}'` }, type: "FunctionExpression" }]
    },
    {
        code: `async function() { for await (${declType} ${variableForm} of []) { (function() { ${variableAccessExpr}; }); } }`,
        parserOptions: { ecmaVersion: 2018 },
        invalid: declType === "var" && variableName !== "i",
        errors: [{ messageId: "unsafeRefs", data: { varNames: `'${variableName}'` }, type: "FunctionExpression" }]
    },
    {
        code: `for (${declType} ${variableForm} in []) { (function() { ${variableAccessExpr}; }); }`,
        parserOptions: { ecmaVersion: 6 },
        invalid: declType === "var" && variableName === "i",
        errors: [{ messageId: "unsafeRefs", data: { varNames: `'${variableName}'` }, type: "FunctionExpression" }]
    },

    // Basic loops where the variable is declared outside the loop, so the rule should never fire
    {
        code: `${declType} ${variableForm} = []; for (;i;) { (function() { ${variableAccessExpr}; }); }`,
        parserOptions: { ecmaVersion: 6 }
    },
    {
        code: `${declType} ${variableForm} = []; for (const a of []) { (function() { ${variableAccessExpr}; }); }`,
        parserOptions: { ecmaVersion: 6 }
    },
    {
        code: `async function() { ${declType} ${variableForm} = []; for await (cosnt a of []) { (function() { ${variableAccessExpr}; }); } }`,
        parserOptions: { ecmaVersion: 2018 }
    },
    {
        code: `${declType} ${variableForm} = []; for (const a in []) { (function() { ${variableAccessExpr}; }); }`,
        parserOptions: { ecmaVersion: 6 }
    },
    {
        code: `${declType} ${variableForm} = []; while (i) { (function() { ${variableAccessExpr}; }); }`,
        parserOptions: { ecmaVersion: 6 }
    },
    {
        code: `${declType} ${variableForm} = []; do { (function() { ${variableAccessExpr}; }); } while (i)`,
        parserOptions: { ecmaVersion: 6 }
    },



])
.map(testCase => testCase.invalid ? testCase : {...testCase, errors: undefined })
.map(testCase => )

process.stdout.write(JSON.stringify(testCases, null, 4)
