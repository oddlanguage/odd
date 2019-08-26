"use strict";
"hide implementation";

const Parser = require("../../../Parser-generator/Parser-generator.js");

module.exports = new Parser()
	.rule(`number -> .integer-number
		| .decimal-number`)
	.rule(`string -> .string
		| .template-literal`)
	.rule(`plus-or-min -> "+"
		| "-"`)
	.rule(`term-op -> "*"
		| "/"
		| "%"`)
	.rule(`atom -> .identifier
		| .literal
		| number
		| string`)
	.rule(`power -> l:atom (operator:"^" r:factor)*`)
	.rule(`factor -> plus-or-min factor
		| power`)
	.rule(`term -> factor (operator:term-op factor)*`)
	.rule(`math-expression -> term (plus-or-min term)*`)
	.rule(`expression -> math-expression
		| const-definition
		| "(" expression ("," expression)* ")"`)
	.rule(`declaration -> lhs:.identifier ("=" rhs:expression)?`)
	.rule(`const-definition -> "const" annotation:.type-annotation? declaration`)
	.rule(`program -> expressions:(expression .semicolon)*`);

// TODO:
// Labels                  : name -> label:type"lexeme" OR name -> type"lexeme"[label]
// n-repetition            : name -> rule{min[,[max]]} ()
// Reevaluate BNF alphabet : most of the rules consist of subrules,
//	so the user would benefit from a less verbose notation.
//	What if subrules don't need special denotation characters,
//	and instead token types were denoted by a leading dot: rule -> subrule .type "lexeme" #definition
//	Really easy to type

// Possible additions:
// Not          : name -> x !y (x followed by anthing but y, including nothing)
// Builders     : .rule(`name -> production`, nodes => ...)
// Parse as actual DSL (.metaodd)
	// Decide definition token (now #)