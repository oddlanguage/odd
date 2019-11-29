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
		| "(" expressions? ")" trailer*`)
	.rule(`expressions -> expression ("," expression)*`)
	.rule(`trailer -> "." .identifier
		| "@" expression
		| argument-list`)
	.rule(`operator-unary-left -> "..." | "import" | "export" | "return" | "await" | "defer" | "not" | "yield" | "throw" | "typeof"`)
	.rule(`expression-body -> literal
		| assignment
		| function
		| object
		| class
		| .identifier`)
	.rule(`literal -> .literal
		| .number
		| string`)
	.rule(`string -> .string+`)
	.rule(`argument-list -> object
		| string
		| "(" arguments? ")"`)
	.rule(`arguments -> argument ("," argument)*`)
	.rule(`argument -> argument-name? expression`)
	.rule(`argument-name -> .identifier ":"`)
	.rule(`object -> "[" entries? "]"`)
	.rule(`entries -> entry ("," entry)*`)
	// TODO: Allow empty entries? e.g. [0,] = [0, nothing]
	// TODO: Cleanup "is" expressions ";"
	.rule(`entry -> type? .identifier "=" expression
		| expression`)
	.rule(`assignment -> const-assignment
		| var-assignment`)
	.rule(`const-assignment -> type dotted-name ("=" expression)?
		| dotted-name "=" expression`)
	.rule(`var-assignment -> "var" dotted-name ("=" expression)?`)
	.rule(`type -> .identifier "[" "]"
		| .identifier "<" type ("," type)* ">"
		| .identifier`)
	.rule(`function -> parameter-list "->" block
		| .identifier "->" block`)
	.rule(`block -> block-start statement* block-end
		| expression`)
	.rule(`parameter-list -> "(" parameters? ")"`)
	.rule(`parameters -> spread-parameters
		| parameter ("," parameter)*`)
	.rule(`spread-parameters -> (parameter ",")* type? "..." .identifier`)
	.rule(`parameter -> type .identifier "?"?
		| type .identifier ("=" expression)?
		| .identifier "?"?
		| .identifier ("=" expression)?`)
	.rule(`block-start -> "{"`)
	.rule(`block-end -> "}"`)
	.rule(`class -> "class" .identifier parameter-list? "->" class-block`)
	.rule(`class-block -> block-start class-statement* block-end
		| class-statement`)
	.rule(`class-statement -> is-statement
		| statement
		| modifier-statement`)
	.rule(`is-statement -> "is" expressions ";"`)
	.rule(`modifier-statement -> modifier+ statement`)
	.rule(`modifier -> "static" | "overt" | "readonly"`)
	.rule(`dotted-name -> .identifier ("." .identifier)*`);

// TODO:
// n-repetition: name -> rule{min(,max?)?} ()
// Make labels work better with quantifiers
// for rule X -> Y? z where Y can reduce to z, a zero-or-x quantification operator doesn't accept while it should

// Possible additions:
// $       : $ references the current rule (i.e. test -> $ === test -> test)
// Not     : name -> x !y (x followed by anthing but y, including nothing)
// Parse as actual DSL (.meta.odd)