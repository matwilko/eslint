/**
 * @fileoverview Tests for no-loop-func rule.
 * @author Ilya Volodin
 */

"use strict";

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const rule = require("../../../lib/rules/no-loop-func"),
    { RuleTester } = require("../../../lib/rule-tester");
const { cartesianProduct3 } = require("./utils/combinatorial");

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

const variableDeclarationKeywords = ["let", "const", "var"];
const variableDeclarationForms = [
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
const variableAccesses = [
    ["", ""], // No variable access should always pass
    ["i", "i"],
    ["undeclared", "undeclared"], // Undeclared variable access should be equivalent to no variable access and always pass

    // Nested function variants
    ["(function() { })", ""], // No variable access should always pass
    ["(function() { i; })", "i"],
    ["(function() { undeclared; })", "undeclared"] // Undeclared variable access should be equivalent to no variable access and always pass
];

const loops = cartesianProduct3(variableDeclarationKeywords, variableDeclarationForms, variableAccesses, (declType, variableForm, [variableAccessExpr, variableName]) => [

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

]);

const ruleTester = new RuleTester();

ruleTester.run("no-loop-func", rule, {
    valid: [
        ...loops.filter(loop => !loop.invalid),
        "string = 'function a() {}';",
        "for (var i=0; i<l; i++) { } var a = function() { i; };",
        "for (var i=0, a=function() { i; }; i<l; i++) { }",
        "for (var x in xs.filter(function(x) { return x != upper; })) { }",
        {
            code: "for (var x of xs.filter(function(x) { return x != upper; })) { }",
            parserOptions: { ecmaVersion: 6 }
        },

        // no refers to variables that declared on upper scope.
        {
            code: "for (let i = 0; i < 10; ++i) { for (let x in xs.filter(x => x != i)) {  } }",
            parserOptions: { ecmaVersion: 6 }
        },
        {
            code: [
                "let result = {};",
                "for (const score in scores) {",
                "  const letters = scores[score];",
                "  letters.split('').forEach(letter => {",
                "    result[letter] = score;",
                "  });",
                "}",
                "result.__default = 6;"
            ].join("\n"),
            parserOptions: { ecmaVersion: 6 }
        },
        {
            code: [
                "while (true) {",
                "    (function() { a; });",
                "}",
                "let a;"
            ].join("\n"),
            parserOptions: { ecmaVersion: 6 }
        },

        // Make sure we don't error for undeclared variables so as not to overlap with no-undef
        {
            code: "while(i) { (function() { i; }) }",
            errors: [{ messageId: "unsafeRefs", data: { varNames: "'i'" }, type: "FunctionExpression" }]
        },
        {
            code: "do { (function() { i; }) } while (i)",
            errors: [{ messageId: "unsafeRefs", data: { varNames: "'i'" }, type: "FunctionExpression" }]
        },
        {
            code: "for(;i;) { (function() { i; }) }",
            errors: [{ messageId: "unsafeRefs", data: { varNames: "'i'" }, type: "FunctionExpression" }]
        },
        {
            code: "for(var a in i) { (function() { i; }) }",
            errors: [{ messageId: "unsafeRefs", data: { varNames: "'i'" }, type: "FunctionExpression" }]
        },
        {
            code: "for(var a of i) { (function() { i; }) }",
            errors: [{ messageId: "unsafeRefs", data: { varNames: "'i'" }, type: "FunctionExpression" }]
        },
        {
            code: "for await (var a of i) { (function() { i; }) }",
            errors: [{ messageId: "unsafeRefs", data: { varNames: "'i'" }, type: "FunctionExpression" }]
        },

        // Make sure we don't error on variables that look like they might be a loop variable but in fact aren't.
        {
            code: "var i = true; while(i) { (function() { i; }) }",
            errors: [{ messageId: "unsafeRefs", data: { varNames: "'i'" }, type: "FunctionExpression" }]
        },
        {
            code: "var i = true; do { (function() { i; }) } while (i)",
            errors: [{ messageId: "unsafeRefs", data: { varNames: "'i'" }, type: "FunctionExpression" }]
        },
        {
            code: "var i = true; for(;i;) { (function() { i; }) }",
            errors: [{ messageId: "unsafeRefs", data: { varNames: "'i'" }, type: "FunctionExpression" }]
        },
        {
            code: "let i = true; while(i) { (function() { i; }) }",
            errors: [{ messageId: "unsafeRefs", data: { varNames: "'i'" }, type: "FunctionExpression" }]
        },
        {
            code: "let i = true; do { (function() { i; }) } while (i)",
            errors: [{ messageId: "unsafeRefs", data: { varNames: "'i'" }, type: "FunctionExpression" }]
        },
        {
            code: "let i = true; for(;i;) { (function() { i; }) }",
            errors: [{ messageId: "unsafeRefs", data: { varNames: "'i'" }, type: "FunctionExpression" }]
        },
        {
            code: "const i = true; while(i) { (function() { i; }) }",
            errors: [{ messageId: "unsafeRefs", data: { varNames: "'i'" }, type: "FunctionExpression" }]
        },
        {
            code: "const i = true; do { (function() { i; }) } while (i)",
            errors: [{ messageId: "unsafeRefs", data: { varNames: "'i'" }, type: "FunctionExpression" }]
        },
        {
            code: "const i = true; for(;i;) { (function() { i; }) }",
            errors: [{ messageId: "unsafeRefs", data: { varNames: "'i'" }, type: "FunctionExpression" }]
        }
    ],
    invalid: [
        ...loops.filter(loop => loop.invalid),
        {
            code: "for (var i=0; i<l; i++) { (function() { i; }) }",
            errors: [{ messageId: "unsafeRefs", data: { varNames: "'i'" }, type: "FunctionExpression" }]
        },
        {
            code: "for (var i=0; i<l; i++) { for (var j=0; j<m; j++) { (function() { i+j; }) } }",
            errors: [{ messageId: "unsafeRefs", data: { varNames: "'i', 'j'" }, type: "FunctionExpression" }]
        },
        {
            code: "for (var i in {}) { (function() { i; }) }",
            errors: [{ messageId: "unsafeRefs", data: { varNames: "'i'" }, type: "FunctionExpression" }]
        },
        {
            code: "for (var i of {}) { (function() { i; }) }",
            parserOptions: { ecmaVersion: 6 },
            errors: [{ messageId: "unsafeRefs", data: { varNames: "'i'" }, type: "FunctionExpression" }]
        },
        {
            code: "for (var [a] of []) { (function() { a; }) }",
            parserOptions: { ecmaVersion: 6 },
            errors: [{ messageId: "unsafeRefs", data: { varNames: "'a'" }, type: "FunctionExpression" }]
        },
        {
            code: "for (var [a = 5] of []) { (function() { a; }) }",
            parserOptions: { ecmaVersion: 6 },
            errors: [{ messageId: "unsafeRefs", data: { varNames: "'a'" }, type: "FunctionExpression" }]
        },
        {
            code: "for (var {a} of []) { (function() { a; }) }",
            parserOptions: { ecmaVersion: 6 },
            errors: [{ messageId: "unsafeRefs", data: { varNames: "'a'" }, type: "FunctionExpression" }]
        },
        {
            code: "for (var i=0; i < l; i++) { (() => { i; }) }",
            parserOptions: { ecmaVersion: 6 },
            errors: [{ messageId: "unsafeRefs", data: { varNames: "'i'" }, type: "ArrowFunctionExpression" }]
        },
        {
            code: "for (var i=0; i < l; i++) { var a = function() { i; } }",
            errors: [{ messageId: "unsafeRefs", data: { varNames: "'i'" }, type: "FunctionExpression" }]
        },
        {
            code: "for (var i=0; i < l; i++) { function a() { i; }; a(); }",
            errors: [{ messageId: "unsafeRefs", data: { varNames: "'i'" }, type: "FunctionDeclaration" }]
        },
        {
            code: "for (var i=0; (function() { i; })(), i<l; i++) { }",
            errors: [{ messageId: "unsafeRefs", data: { varNames: "'i'" }, type: "FunctionExpression" }]
        },
        {
            code: "for (var i=0; i<l; (function() { i; })(), i++) { }",
            errors: [{ messageId: "unsafeRefs", data: { varNames: "'i'" }, type: "FunctionExpression" }]
        },

        // Warns functions which are using modified variables.
        {
            code: "let a; for (let i=0; i<l; i++) { a = 1; (function() { a; });}",
            parserOptions: { ecmaVersion: 6 },
            errors: [{ messageId: "unsafeRefs", data: { varNames: "'a'" }, type: "FunctionExpression" }]
        },
        {
            code: "let a; for (let i in {}) { (function() { a; }); a = 1; }",
            parserOptions: { ecmaVersion: 6 },
            errors: [{ messageId: "unsafeRefs", data: { varNames: "'a'" }, type: "FunctionExpression" }]
        },
        {
            code: "let a; for (let i of {}) { (function() { a; }); } a = 1; ",
            parserOptions: { ecmaVersion: 6 },
            errors: [{ messageId: "unsafeRefs", data: { varNames: "'a'" }, type: "FunctionExpression" }]
        },
        {
            code: "let a; for (let i=0; i<l; i++) { (function() { (function() { a; }); }); a = 1; }",
            parserOptions: { ecmaVersion: 6 },
            errors: [{ messageId: "unsafeRefs", data: { varNames: "'a'" }, type: "FunctionExpression" }]
        },
        {
            code: "let a; for (let i in {}) { a = 1; function foo() { (function() { a; }); } }",
            parserOptions: { ecmaVersion: 6 },
            errors: [{ messageId: "unsafeRefs", data: { varNames: "'a'" }, type: "FunctionDeclaration" }]
        },
        {
            code: "let a; for (let i of {}) { (() => { (function() { a; }); }); } a = 1;",
            parserOptions: { ecmaVersion: 6 },
            errors: [{ messageId: "unsafeRefs", data: { varNames: "'a'" }, type: "ArrowFunctionExpression" }]
        },
        {
            code: "for (var i = 0; i < 10; ++i) { for (let x in xs.filter(x => x != i)) {  } }",
            parserOptions: { ecmaVersion: 6 },
            errors: [{ messageId: "unsafeRefs", data: { varNames: "'i'" }, type: "ArrowFunctionExpression" }]
        },
        {
            code: "for (let x of xs) { let a; for (let y of ys) { a = 1; (function() { a; }); } }",
            parserOptions: { ecmaVersion: 6 },
            errors: [{ messageId: "unsafeRefs", data: { varNames: "'a'" }, type: "FunctionExpression" }]
        },
        {
            code: "for (var x of xs) { for (let y of ys) { (function() { x; }); } }",
            parserOptions: { ecmaVersion: 6 },
            errors: [{ messageId: "unsafeRefs", data: { varNames: "'x'" }, type: "FunctionExpression" }]
        },
        {
            code: "for (var x of xs) { (function() { x; }); }",
            parserOptions: { ecmaVersion: 6 },
            errors: [{ messageId: "unsafeRefs", data: { varNames: "'x'" }, type: "FunctionExpression" }]
        },
        {
            code: "var a; for (let x of xs) { a = 1; (function() { a; }); }",
            parserOptions: { ecmaVersion: 6 },
            errors: [{ messageId: "unsafeRefs", data: { varNames: "'a'" }, type: "FunctionExpression" }]
        },
        {
            code: "var a; for (let x of xs) { (function() { a; }); a = 1; }",
            parserOptions: { ecmaVersion: 6 },
            errors: [{ messageId: "unsafeRefs", data: { varNames: "'a'" }, type: "FunctionExpression" }]
        },
        {
            code: "let a; function foo() { a = 10; } for (let x of xs) { (function() { a; }); } foo();",
            parserOptions: { ecmaVersion: 6 },
            errors: [{ messageId: "unsafeRefs", data: { varNames: "'a'" }, type: "FunctionExpression" }]
        },
        {
            code: "let a; function foo() { a = 10; for (let x of xs) { (function() { a; }); } } foo();",
            parserOptions: { ecmaVersion: 6 },
            errors: [{ messageId: "unsafeRefs", data: { varNames: "'a'" }, type: "FunctionExpression" }]
        },
        {
            code: "for (var a of []) { (function() { (function() { a; }) }) }",
            parserOptions: { ecmaVersion: 6 },
            errors: [{ messageId: "unsafeRefs", data: { varNames: "'a'" }, type: "FunctionExpression" }]
        }
    ]
});
