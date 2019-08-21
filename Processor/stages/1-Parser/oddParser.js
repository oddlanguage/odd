"use strict";
"hide implementation";

const Parser = require("../../../Parser-generator/Parser-generator.js");

module.exports = new Parser()
	// .define(`number -> integer-number
	// 	| decimal-number`)
	// .define(`string -> string
	// 	| template-literal`)
	// .define(`plus-or-min -> "+"
	// 	| "-"`)
	// .define(`term-op -> "*"
	// 	| "/"
	// 	| "%"`)
	// .rule(`atom -> #number
	// 	| #string
	// 	| literal
	// 	| identifier`)
	// .rule(`power -> <atom> "^" <factor>`)
	// .rule(`factor -> #plus-or-min? <factor>
	// 	| <power>`)
	// .rule(`term -> <factor> (#term-op <factor>)*`)
	// .rule(`math-expression -> <term> (#plus-or-min <term>)*`)
	// .rule(`expression -> <math-expression>
	// 	| <const-definition>
	// 	| "(" <expression> ("," <expression>)* ")"`)
	// .rule(`declaration -> identifier ("=" <expression>)?`)
	// .rule(`const-definition -> "const" type-annotation? <declaration> semicolon`);
	.rule(`const-definition -> "const" type-annotation? identifier "=" integer-number ("^"|"*"|"/"|"+"|"-") integer-number semicolon`);

// Labels       : name -> label:type"lexeme" OR name -> type"lexeme"[label]
// Builders     : .rule(`name -> production`, nodes => ...)
// Not          : name -> x !y (x followed by anthing but y, including nothing)

// Possible additions:
	// n-repetition : name -> rule{min[,[max]]} ()
	// Explore other nonterminal denotations (now <nonterminal>, maybe only start with < or > (or other char(s)?)?)
	// Parse as actual DSL (.metaodd)
		// Decide definition token (now #, maybe @, etc.?)