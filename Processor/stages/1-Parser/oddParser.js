"use strict";
"hide implementation";

const Parser = require("../../../Parser-generator/Parser-generator.js");

module.exports = new Parser()
	.rule(`program -> expressions:expression*`)
	.rule(`expression -> expression-body .semicolon
		| controllers`)
	.rule(`controllers -> loop
		| using
		| if`)
	.rule(`expression-body -> math
		| const-definition
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
	.rule(`declaration -> lhs:.identifier "=" rhs:expression-body
		| lhs:.identifier`)
	.rule(`loop -> for-of
		| from-to
		| repeat`)
	.rule(`for-of -> "for" for-of-body
		| "for" "(" for-of-body ")" with? block`)
	.rule(`for-of-body -> name:.identifier "of" iterable:expression-body`)
	.rule(`from-to -> "from" from-to-body with? block
		| "from" "(" from-to-body ")" with? block`)
	.rule(`from-to-body -> from:expression-body "to" to:expression-body`)
	.rule(`repeat -> "repeat" count:expression-body with? block`)
	.rule(`with -> "with" with-body+`)
	.rule(`with-body -> name:.identifier "as" label:.identifier ("," with-body)*`)
	.rule(`block -> .INDENT expression+ .DEDENT`)
	.rule(`using -> "using" scope:expression-body ("," scope:expression-body)*`);

// TODO:
// n-repetition: name -> rule{min(,max?)?} ()
// Make labels work better with quantifiers

// Possible additions:
// Not     : name -> x !y (x followed by anthing but y, including nothing)
// Builders: .rule(`name -> production`, nodes => ...)
// Parse as actual DSL (.metaodd)
	// Decide definition token (now #)