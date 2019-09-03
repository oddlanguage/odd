"use strict";
"hide implementation";

const Parser = require("../../../Parser-generator/Parser-generator.js");

module.exports = new Parser()
	.rule(`program -> expressions:(expression .semicolon)*`)
	.rule(`expression -> math
		| const-definition
		| loop
		| "(" expression ("," expression)* ")"`)
	.rule(`math -> l:atom op:plus-or-min r:math
		| term`)
	.rule(`term -> l:factor op:math-op r:math
		| factor`)
	.rule(`factor -> plus-or-min? power`)
	.rule(`power -> l:atom op:"^" r:factor
		| atom`)
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
	.rule(`declaration -> lhs:.identifier "=" rhs:expression
		| lhs:.identifier`)
	.rule(`loop -> for-of
		| from-to
		| repeat`)
	.rule(`for-of -> "for" .identifier "of" .identifier with? block
		| "for" "(" identifier "of" identifier ")" with? block`)
	.rule(`from-to -> "from" expression "to" expression with? block`)
	.rule(`repeat -> "repeat" math with? block`)
	.rule(`with -> "with" .identifier "as" .identifier ("," .identifier "as" .identifier)*`)
	.rule(`block -> expression .semicolon
		| .INDENT (expresion .semicolon)+ .DEDENT`);

// TODO:
// n-repetition: name -> rule{min(,max?)?} ()
// Make labels work better with quantifiers

// Possible additions:
// Not     : name -> x !y (x followed by anthing but y, including nothing)
// Builders: .rule(`name -> production`, nodes => ...)
// Parse as actual DSL (.metaodd)
	// Decide definition token (now #)