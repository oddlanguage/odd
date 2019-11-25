"use strict";
"hide implementation";

const Parser = require("../../../Parser-generator/Parser-generator.js");

module.exports = new Parser()
	.rule(`program -> statement*`)
	.rule(`statement -> loop
		| expression ";"`)
	// TODO: Moet zijn: for ident in expression, maar kan nog niet want expression reduceert nog niet naar .identifier
	.rule(`loop -> "for" .identifier "in" expression block
		| "while" expression block`)
	.rule(`expression -> operator-unary-left expression
		| expression-body trailer*
		| "(" expressions? ")"`)
	.rule(`expressions -> expression ("," expression)*`)
	.rule(`trailer -> "." .identifier
		| "@" expression
		| arg-list`)
	.rule(`operator-unary-left -> "..." | "import" | "export" | "return" | "await" | "defer" | "not" | "yield" | "throw" | "typeof"`)
	.rule(`expression-body -> literal
		| assignment
		| function
		| object
		| .identifier`)
	.rule(`literal -> .literal
		| .number
		| string`)
	.rule(`arg-list -> object
		| string
		| "(" args? ")"`)
	.rule(`string -> .string+`)
	.rule(`args -> arg ("," arg)*`)
	.rule(`arg -> label? expression`)
	.rule(`label -> .identifier ":"`)
	.rule(`object -> "[" entries? "]"`)
	.rule(`entries -> entry ("," entry)*`)
	// TODO: Allow empty entries (e.g. [0,] = [0, nothing])?
	.rule(`entry -> .identifier "=" expression
		| expression`)
	.rule(`assignment -> type .identifier "=" expression
		|  "var" .identifier "=" expression
		| .identifier "=" expression`)
	.rule(`type -> .identifier "[" "]"
		| .identifier "<" type ("," type)* ">"
		| .identifier`)
	.rule(`function -> param-list "->" block
		| .identifier "->" block`)
	.rule(`block -> block-start statement+ block-end
		| expression`)
	.rule(`param-list -> "(" params? ")"`)
	.rule(`params -> spread-params
		| param ("," param)*`)
	.rule(`spread-params -> (param ",")* type? "..." .identifier`)
	.rule(`param -> type .identifier ("=" expression)?
		| .identifier ("=" expression)?`)
	.rule(`block-start -> "{"`)
	.rule(`block-end -> "}"`);

// TODO:
// n-repetition: name -> rule{min(,max?)?} ()
// Make labels work better with quantifiers

// Possible additions:
// $       : $ references the current rule (i.e. test -> $ === test -> test)
// Not     : name -> x !y (x followed by anthing but y, including nothing)
// Parse as actual DSL (.meta.odd)