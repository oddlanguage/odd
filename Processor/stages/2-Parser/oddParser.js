"use strict";
"hide implementation";

const Parser = require("../../../Parser-generator/Parser-generator.js");

module.exports = new Parser()
	.rule(`program -> statement*`)
	// TODO: if statements
	.rule(`statement -> loop
		| class
		| function
		| expression ";"`)
	.rule(`loop -> "for" .identifier "in" expression block
		| "while" expression block`)
	.rule(`expression -> operator-unary-left expression
		| expression-body trailer*
		| "(" expressions? ")" trailer*`)
	.rule(`expressions -> expression ("," expression)*`)
	.rule(`trailer -> "@" expression
		| argument-list`)
	// .rule(`operator-unary-left -> "..." | "export" | "return" | "await" | "defer" | "not" | "yield" | "throw" | "typeof"`)
	.rule(`expression-body -> literal
		| assignment
		| function
		| object
		| class
		| import
		| dotted-name`)
	.rule(`dotted-name -> .identifier ("." .identifier)*`)
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
	// TODO: Allow empty entries? e.g. [0,] == [0, nothing]
	.rule(`entry -> type? .identifier "=" expression
		| expression`)
	.rule(`assignment -> var-assignment
		| const-assignment`)
	.rule(`const-assignment -> type dotted-name ("=" expression)?
		| dotted-name "=" expression`)
	.rule(`var-assignment -> "var" type? dotted-name ("=" expression)?`)
	.rule(`type -> dotted-name "[" "]"
		| dotted-name "<" type ("," type)* ">"
		| dotted-name`)
	.rule(`function -> "fun" .identifier parameter-list? "->" block
		| parameter-list "->" block
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
	.rule(`block-start -> .indent`)
	.rule(`block-end -> .dedent`)
	.rule(`class -> "class" .identifier parameter-list? "->" class-block`)
	.rule(`class-block -> block-start class-statement* block-end
		| class-statement`)
	.rule(`class-statement -> is-statement
		| statement
		| modifier-statement`)
	.rule(`is-statement -> "is" expressions ";"`)
	.rule(`modifier-statement -> modifier+ statement`)
	.rule(`modifier -> "static" | "overt" | "readonly"`)
	.rule(`import -> "import" .identifier "from" string`);

// TODO:
// n-repetition: name -> rule{min(,max?)?} ()
// Make labels work better with quantifiers
// for rule X -> Y? z where Y can reduce to z, a zero-or-x quantification operator doesn't accept while it should

// Possible additions:
// $       : $ references the current rule (i.e. test -> $ === test -> test)
// Not     : name -> x !y (x followed by anthing but y, including nothing)
// Parse as actual DSL (.meta.odd)