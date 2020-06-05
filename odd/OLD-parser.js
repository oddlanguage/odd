"use strict";

import Parser from "../Parser/Parser.js";
import { type, lexeme, options, sequence, some, maybe, many, rule, delimited, label } from "../Parser/combinators.js";

// program -> statement*
const program = some(
	rule("statement"));

// statement -> ((("export" "default"?)? (function-definition | declaration)) | expression) ";"
const statement = sequence(
	options(
		sequence(
			maybe(
				sequence(
					lexeme("export"),
					maybe(
						lexeme("default")))),
			options(
				rule("function-definition"),
				// rule("class-definition"),
				rule("declaration"))),
		rule("expression")),
	lexeme(";"));

// function-definition -> "fun" .identifier ("." .identifier)* parameters "->" expression where-clause?
const funDef = sequence(
	lexeme("fun"),
	delimited(
		type("identifier"),
		lexeme(".")),
	maybe(
		rule("parameters")),
	lexeme("->"),
	rule("expression"),
	maybe(
		rule("where-clause")));

// where-clause -> "where" declaration ("," declaration)*
const whereClause = sequence(
	lexeme("where"),
	delimited(
		rule("declaration"),
		lexeme(",")));

// declaration -> type:.identifier name:.identifier "=" expression
const declaration = sequence(
	label("type", rule("type")),
	label("name", type("identifier")),
	lexeme("="),
	rule("expression"));

// expression -> (anonymous-function | atom | "(" expression ")") trailer*
const expression = sequence(
	options(
		rule("match"),
		rule("object"),
		rule("anonymous-function"),
		rule("compound-string"),
		rule("atom"),
		sequence(
			lexeme("("),
			rule("expression"),
			lexeme(")"))),
	some(
		rule("trailer")));

// anonymous-function -> parameters "->" expression
const anonFun = sequence(
	rule("parameters"),
	lexeme("->"),
	rule("expression"));

// parameters -> "(" parameter ("," parameter)* ")"
const parameters = options(
	rule("parameter"),
	sequence(
		lexeme("("),
		maybe(
			delimited(
				rule("parameter"),
				lexeme(","))),
		lexeme(")")));

// parameter -> typed-parameter | .identifier
const parameter = options(
		rule("typed-parameter"),
		sequence(
			maybe(
				lexeme("...")),
			type("identifier")));

// typed-parameter -> type .identifier
const typedParameter = sequence(
	rule("type"),
	maybe(
		lexeme("...")),
	type("identifier"));

// atom -> .literal | .number | .identifier
const atom = options(
	type("literal"),
	type("number"),
	type("identifier"));

// trailer ->
// 	arguments
// 	| compound-string
// 	| object
// 	| .operator+ expression
// 	| ternary
const trailer = options(
	rule("arguments"),
	rule("compound-string"),
	rule("object"),
	sequence(
		many(
			type("operator")),
		rule("expression")),
	rule("ternary"),
	lexeme("exists"));

// arguments -> "(" (argument ("," argument)*)? ")"
const args = sequence(
	lexeme("("),
	maybe(
		delimited(
			rule("argument"),
			lexeme(","))),
	lexeme(")"));

const argument = options(
	rule("named-argument"),
	rule("expression"));

// named-argument -> name:.identifier ":" expression
const namedArgument = sequence(
	label("name", type("identifier")),
	lexeme(":"),
	label("value", rule("expression")));

// compound-string -> .string+
const compStr = many(
	type("string"));

// ternary -> "if" expression "else" expression
const ternary = sequence(
	lexeme("if"),
	rule("expression"),
	lexeme("else"),
	rule("expression"));

// match -> "match" expression ":" cases ("else" expression)?
const match = sequence(
	lexeme("match"),
	rule("expression"),
	lexeme(":"),
	rule("cases"),
	sequence(
		lexeme(","),
		lexeme("else"),
		rule("expression")));

// cases -> case ("," case)*
const cases = sequence(
	delimited(
		rule("case"),
		lexeme(",")));

// case -> expression "->" expression
const matchCase = sequence(
	rule("expression"),
	lexeme("->"),
	rule("expression"));

// object -> "{" fields? "}"
const obj = sequence(
	lexeme("{"),
	maybe(
		rule("fields")),
	lexeme("}"));

// fields -> field ("," field)*
const fields = delimited(
	rule("field"),
	lexeme(","));

// field -> .identifier ":" expression
const field = sequence(
	type("identifier"),
	lexeme(":"),
	rule("expression"));

// type ->
// 	"(" type ")"
// 	| .identifier ("or" type
// 	| "<" type ("," type)* ">")? ("[" "]")?
const oddType = options(
	sequence(
		lexeme("("),
		rule("type"),
		lexeme(")")),
	sequence(
		type("identifier"),
		maybe(
			options(
				sequence(
					lexeme("or"),
					rule("type")),
				sequence(
					lexeme("<"),
					delimited(
						rule("type"),
						lexeme(",")),
					lexeme(">")))),
		maybe(
			sequence(
				lexeme("["),
				lexeme("]")))));

// // class-definition -> "class" .identifier is? parameters? ("->" ("static" | "var" | "overt" | "readonly")* (typed-class-field | class-field) ("," (typed-class-field | class-field))*)?
// const oddClass = sequence(
// 	lexeme("class"),
// 	type("identifier"),
// 	maybe(
// 		rule("is")),
// 	maybe(
// 		rule("parameters")),
// 	maybe(
// 		sequence(
// 			lexeme("->"),
// 			delimited(
// 				sequence(
// 					some(
// 						options(
// 							lexeme("var"),
// 							lexeme("static"),
// 							lexeme("overt"),
// 							lexeme("readonly"))),
// 					options(
// 						rule("typed-class-field"),
// 						rule("class-field"))),
// 				lexeme(",")))));

// // class-field -> ("this" ".")? .identifier ("=" expression)?
// const classField = sequence(
// 	maybe(
// 		sequence(
// 			lexeme("this"),
// 			lexeme("."))),
// 	type("identifier"),
// 	maybe(
// 		sequence(
// 			lexeme("="),
// 			rule("expression"))));

// // typed-class-field -> type class-field
// const typedClassField = sequence(
// 	rule("type"),
// 	rule("class-field"));

// // is -> "is" expression ("," expression)*
// const is = sequence(
// 	lexeme("is"),
// 	delimited(
// 		rule("expression"),
// 		lexeme(",")));

export default new Parser()
	.rule("program",             program)
	.rule("statement",           statement)
	.rule("function-definition", funDef)
	.rule("parameters",          parameters)
	.rule("parameter",           parameter)
	.rule("typed-parameter",     typedParameter)
	.rule("where-clause",        whereClause)
	.rule("declaration",         declaration)
	.rule("expression",          expression)
	.rule("anonymous-function",  anonFun)
	.rule("arguments",           args)
	.rule("argument",            argument)
	.rule("named-argument",      namedArgument)
	.rule("atom",                atom)
	.rule("trailer",             trailer)
	.rule("compound-string",     compStr)
	.rule("ternary",             ternary)
	.rule("match",               match)
	.rule("cases",               cases)
	.rule("case",                matchCase)
	.rule("object",              obj)
	.rule("fields",              fields)
	.rule("field",               field)
	.rule("type",                oddType);
	// .rule("class-definition",    oddClass)
	// .rule("class-field",         classField)
	// .rule("typed-class-field",   typedClassField)
	// .rule("is",                  is)