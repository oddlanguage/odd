"use strict";
"hide implementation";

const Parser = require("../../../Parser-generator/Parser-generator.js");

module.exports = new Parser()
	.rule(`program -> expression*`)
	.rule(`expression -> expression-body .semicolon
		| controller`)
	.rule(`controller -> loop
		| using
		| if`)
	.rule(`expression-body -> math
		| "(" expression-body ("," expression-body)* ")"`)
	.rule(`math -> l:atom op:plus-or-min r:math
		| term`)
	.rule(`term -> l:factor op:math-op r:math
		| factor`)
	.rule(`factor -> plus-or-min? power`)
	.rule(`power -> l:atom op:"^" r:factor
		| atom`)
	.rule(`atom -> function-call
		| const-definition
		| .identifier
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
	.rule(`with -> "with" with-body`)
	.rule(`with-body -> name:.identifier "as" label:.identifier ("," with-body)*`)
	.rule(`block -> .INDENT expression+ .DEDENT`)
	.rule(`using -> "using" using-body ("," using-body)*`)
	.rule(`using-body -> scope:expression-body`)
	.rule(`function-call -> name:.identifier "(" arg-list? ")"`)
	.rule(`arg-list -> arg ("," arg)*`)
	.rule(`arg -> (name:.identifier "=")? expression-body`)
	.rule(`if -> "if" expression-body block else-if* else?`)
	.rule(`else-if -> "else" "if" expression-body block`)
	.rule(`else -> "else" block`);

// TODO:
// n-repetition: name -> rule{min(,max?)?} ()
// Make labels work better with quantifiers

// Possible additions:
// $       : $ references the current rule (i.e. test -> $ === test -> test)
// Not     : name -> x !y (x followed by anthing but y, including nothing)
// Parse as actual DSL (.meta.odd)