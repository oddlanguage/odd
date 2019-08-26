"use strict";
"hide implementation";

const Parser = require("../../../Parser-generator/Parser-generator.js");

module.exports = new Parser()
	.define(`number -> integer-number
		| decimal-number`)
	.define(`string -> string
		| template-literal`)
	.define(`plus-or-min -> "+"
		| "-"`)
	.define(`term-op -> "*"
		| "/"
		| "%"`)
	.rule(`atom -> identifier
		| literal
		| #number
		| #string`)
	.rule(`power -> @atom "^" @factor`)
	.rule(`factor -> #plus-or-min @factor
		| @power`)
	.rule(`term -> @factor (#term-op @factor)*`)
	.rule(`math-expression -> @term (#plus-or-min @term)*`)
	.rule(`expression -> @math-expression
		| @const-definition
		| "(" @expression ("," @expression)* ")"`)
	.rule(`declaration -> identifier ("=" @expression)?`)
	.rule(`const-definition -> "const" type-annotation? @declaration semicolon`);

//Todo
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