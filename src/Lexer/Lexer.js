const assert = require("../assert");
const LexicalToken = require("./LexicalToken");
require("prototype-extensions/String");
const chalk = require("chalk");

module.exports = class Lexer {
	constructor () {
		this.rules = new Map();
		this.ignorables = new Map();
		this.limitlessQuantifiers = /[*+]|.\{\d,\}/;
	}

	rule (type, grammar) {
		assert(
			typeof grammar === "string"
			|| grammar instanceof RegExp
		).error(`Unsupported grammar [${grammar} ${(typeof grammar).capitalise()}]`);

		// UNCOMMENT THIS ON PRODUCTION
		// assert(
		// 	this.limitlessQuantifiers.test(grammar.toString()) === false
		// ).warn(`the grammar for '${type}' contains limitless quantifiers. This could cause false negative matching.`);

		if (typeof grammar === "string") grammar = new RegExp(grammar.replace(/[^\w\s]/, "\\$&"));

		this.rules.set(type, grammar);
		return this;
	}

	ignore (type, grammar) {
		assert(
			typeof grammar === "string"
			|| grammar instanceof RegExp
		).error(`Unsupported grammar [${grammar} ${(typeof grammar).capitalise()}]`);

		// UNCOMMENT THIS ON PRODUCTION
		// assert(
		// 	this.limitlessQuantifiers.test(grammar.toString()) === false
		// ).warn(`the grammar for '${type}' contains limitless quantifiers. This could cause false negative matching.`);

		if (typeof grammar === "string") grammar = new RegExp(grammar.replace(/[^\w\s]/, "\\$&"));

		this.ignorables.set(type, grammar);
		return this;
	}

	static getLineAndColumn (input, index) {
		let line = 1;
		let column = 0;
		let i = 0;
		while (i++ < index) {
			if (input.charAt(i) === "\n") {
				line++;
				column = 0;
			} else {
				column++;
			}
		}
		return {line, column};
	}

	static findLexeme (input, grammar) {
		const match = input.match(grammar);
		if (match === null) return null;
		const [lexeme] = match;
		const {index} = match;
		return (index === 0) ? lexeme : null;
	}

	static getErrorLine (input, index) {
		const start = input
			.substring(0, index)
			.lastIndexOf("\n") + 1;
		const end = input
			.substring(start)
			.indexOf("\n") + start;

		return input.substring(start, end);
	}

	static handleError (message, input, index) {
		const {line, column} = Lexer.getLineAndColumn(input, index);
		const errorLine = Lexer.getErrorLine(input, index);
		const leadingWhitespaceLength = (errorLine.match(/^\s+/) || [{length: 0}])[0].length;
		throw new Error(`
				${message} at line ${line}, column ${column}.
				${errorLine}`
			.trim()
			.replace(/^[\r\t\f\v ]+/gm, ""))
			+ `\n${" ".repeat(column - 1 - leadingWhitespaceLength)}^`; //${"^".repeat(errorLexeme.length)} later
	}

	lex (input) {
		assert(input !== null).error("Input must be defined in order to lex!");
		const tokens = [];
		let index = 0;

		while (index < input.length) {
			this.ignorables.forEach(grammar => {
				const ignorable = Lexer.findLexeme(input.substring(index), grammar);
				if (ignorable !== null) index += ignorable.length;
			});

			const lastIndex = index;
			for (const [type, grammar] of this.rules) {
				const lexeme = Lexer.findLexeme(input.substring(index), grammar);
				if (lexeme === null) continue;
				const {line, column} = Lexer.getLineAndColumn(input, index);
				tokens.push(new LexicalToken(type, lexeme, line, column));
				index += lexeme.length;
			}

			if (index !== lastIndex) continue;

			Lexer.handleError("Unknown lexeme", input, index);
		}

		return tokens;
	}
}