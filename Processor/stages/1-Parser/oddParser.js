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
	.rule(`atom -> #number
		| #string
		| literal
		| identifier`)
	.rule(`power -> @atom "^" @factor`)
	.rule(`factor -> #plus-or-min? @factor
		| @power`)
	.rule(`term -> @factor (#term-op @factor)*`)
	.rule(`math-expression -> @term (#plus-or-min @term)*`)
	.rule(`expression -> @math-expression
		| @const-definition
		| "(" @expression ("," @expression)* ")"`)
	.rule(`declaration -> identifier ("=" @expression)?`)
	.rule(`const-definition -> "const" type-annotation? @declaration semicolon`);

//Todo
// Labels       : name -> label:type"lexeme" OR name -> type"lexeme"[label]
// n-repetition : name -> rule{min[,[max]]} ()

// Possible additions:
// Not          : name -> x !y (x followed by anthing but y, including nothing)
// Builders     : .rule(`name -> production`, nodes => ...)
// Parse as actual DSL (.metaodd)
	// Decide definition token (now #)