/**
 * @fileoverview Default configuration
 * @author Nicholas C. Zakas
 */

"use strict";

//-----------------------------------------------------------------------------
// Requirements
//-----------------------------------------------------------------------------

const rules = require("../rules");

//-----------------------------------------------------------------------------
// Helpers
//-----------------------------------------------------------------------------

exports.defaultConfig = [
    {
        plugins: {
            "@": { rules }
        },
        languageOptions: {
            sourceType: "module",
            ecmaVersion: "latest",
            parser: require("espree"),
            parserOptions: {}
        }
    },

    // default ignores are listed here
    {
        ignores: [
            "**/node_modules/",
            ".git/"
        ]
    },

    // intentionally empty config to ensure these files are globbed by default
    {
        files: ["**/*.js", "**/*.mjs"]
    },
    {
        files: ["**/*.cjs"],
        languageOptions: {
            sourceType: "commonjs",
            ecmaVersion: "latest"
        }
    }
];
