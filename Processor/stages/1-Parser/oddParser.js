"use strict";
"hide implementation";

const Parser = require("../../../Parser-generator/Parser-generator.js");

module.exports = new Parser()
	.rule(`program -> expressions:(expression .semicolon)*`)
	.rule(`expression -> math-expression
		| const-definition
		| "(" expression ("," expression)* ")"`)
	.rule(`math-expression -> term (plus-or-min term)*`)
	.rule(`term -> factor (math-op factor)*`)
	.rule(`factor -> plus-or-min? power`)
	.rule(`power -> atom ("^" factor)*`)
	.rule(`atom -> .identifier
		| .literal
		| number
		| string`)
	.rule(`number -> .integer-number
		| .decimal-number`)
	.rule(`string -> .string
		| .template-literal`)
	.rule(`plus-or-min -> "+"
		| "-"`)
	.rule(`math-op -> "*"
		| "/"
		| "%"`)
	.rule(`const-definition -> "const" annotation:.type-annotation? declaration`)
	.rule(`declaration -> lhs:.identifier ("=" rhs:expression)?`)

// TODO:
// n-repetition: name -> rule{min(,max?)?} ()
// Fix labels :(

// Possible additions:
// Not     : name -> x !y (x followed by anthing but y, including nothing)
// Builders: .rule(`name -> production`, nodes => ...)
// Parse as actual DSL (.metaodd)
	// Decide definition token (now #)