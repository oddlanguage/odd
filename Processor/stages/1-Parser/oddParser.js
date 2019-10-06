"use strict";
"hide implementation";

const Parser = require("../../../Parser-generator/Parser-generator.js");

module.exports = new Parser()
	.rule(`program -> statement*`)
	.rule(`statement -> expression .semicolon`)
	.rule(`expression -> simple-expression
		| composite-expression`)
	.rule(`simple-expression -> "await" atom
		| "defer" atom
		| .not atom
		| atom`)
	.rule(`composite-expression -> function-call
		| math
		| "(" expression ")"`)
	.rule(`function-call -> name:.identifier function-trailer`)
	.rule(`function-trailer -> "(" call-arg-list ")"
		| any-string`)
	.rule(`call-arg-list -> call-arg ("," call-arg)*`)
	.rule(`call-arg -> expression
		| .identifier ("=" expression)?`)
	.rule(`any-number -> .integer-number
		| .decimal-number`)
	.rule(`any-string -> .string
		| .template-literal`)
	.rule(`math -> term (plus-min term)*`)
	.rule(`term -> factor (mult-div-mod factor)*`)
	.rule(`factor -> plus-min factor
		| power`)
	.rule(`power -> simple-expression ("^" factor)?`)
	.rule(`mult-div-mod -> "*" | "/" | "%"`)
	.rule(`plus-min -> "+" | "-"`)
	.rule(`atom -> any-string
		| any-number
		| .literal`)

// TODO:
// n-repetition: name -> rule{min(,max?)?} ()
// Make labels work better with quantifiers

// Possible additions:
// $       : $ references the current rule (i.e. test -> $ === test -> test)
// Not     : name -> x !y (x followed by anthing but y, including nothing)
// Parse as actual DSL (.meta.odd)