"use strict";
"hide implementation";

const LexicalToken = require("./LexicalToken.js");
const assert = require("../helpers/assert.js");
const type = require("../helpers/type.js");
const { inflect } = require("../helpers/String.js");
const { unique } = require("../helpers/Array.js");
const { getPattern } = require("../helpers/RegExp.js");
const IndentStack = require("./IndentStack.js");

// TODO: Allow python-like ident blocks.
//	Maybe through a function or a flag
// TODO: Save only cursor offset instead
//	of line and column for major performance
//	increase. REQUIRED: pass along processor
//	stage's name and source file with every
//	stage handler.

module.exports = class Lexer {
	constructor () {
		this._rules = new Map();
		this._definitions = new Map();
		this._usePythonBlocks = false;
		this._generateOEF = false;
	}

	_transformStringToRegex (pattern) {
		const magicChars = /[\.\*\\\^\$\[\^\+\?\|\$]/;
		return new RegExp(pattern.replace(magicChars, "\\$&"));
	}

	_insertSubrules (pattern) {
		//If rule doesn't exist, save? it to be re-evaluated when a new rule is defined
		let flags = "";
		const newRegex = pattern
			.toString()
			.replace(/\{[a-z-_ ]+?\}/g, match => {
					const rule = match.slice(1, -1);
					if (!([this._rules, this._definitions].some(map => map.has(rule))))
						throw `Unknown subrule "${rule}"`;
					const foundRule = (this._rules.get(rule) || this._definitions.get(rule));
					flags += foundRule.pattern.flags;
					return `(?:${getPattern(foundRule.pattern)})`;
				});
		return new RegExp(getPattern(newRegex), unique([...pattern.flags + flags]).join(""));
	}

	rule (name, pattern, definition = false, ignore = false) {
		assert(type(name) === "string")
			.error("Name must be a string.")
		assert(type(pattern) === "string")
			.or(type(pattern) === "regexp")
			.error("Pattern must be a string or a RegExp.");

		if (type(pattern) === "string")
			pattern = this._transformStringToRegex(pattern);

		if (/\{.+\}/.test(pattern))
			pattern = this._insertSubrules(pattern);

		if (definition)
			this._definitions.set(name, { pattern, ignore });
		else
			this._rules.set(name, { pattern, ignore });

		return this;
	}

	ignore (name, pattern) {
		return this.rule(name, pattern, false, true);
	}

	define (name, pattern) {
		return this.rule(name, pattern, true);
	}

	_findLexeme (input, pattern) {
		const match = input.match(pattern);
		if (!match || match.index !== 0)
			return undefined;
		return match[0];
	}

	async _lexStream (stream) {
		throw `Lexical analysis of streams is not yet implemented.`;
	}
	_lexString (input) {
		function getLineAndColumn (input, index) {
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

		function getErrorLine (input, index) {
			const start = input
				.substring(0, index)
				.lastIndexOf("\n") + 1;
			const end = input
				.substring(start)
				.indexOf("\n") + start;

			return input.substring(start, end);
		}

		function handleError (message, input, index, patterns) {
			const {line, column} = getLineAndColumn(input, index);
			const errorLine = getErrorLine(input, index);
			const leadingWhitespaceLength = (errorLine.match(/^\s+/) || [{length: 0}])[0].length;
			const errorLexeme = patterns.reduce((line, pattern) => {
					const patternString = pattern.toString();
					return line.replace(new RegExp(getPattern(patternString), pattern.flags + "g"), "");
				}, errorLine);

			throw `
					${message} "${errorLexeme}" at line ${line}, column ${column}.
					${errorLine}`
				.trim()
				.replace(/^[\r\t\f\v ]+/gm, "")
				+ `\n\u{00A0}\b${" ".repeat(Math.max(0, column - leadingWhitespaceLength))}${"^".repeat(errorLexeme.length)}`;
		}

		const inputLength = input.length;
		let tokens = [];
		let index = 0;

		while (index < inputLength) {
			const lastIndex = index;
			const matches = [];
			for (const [type, rule] of this._rules) {
				const lexeme = this._findLexeme(input.substring(index), rule.pattern);

				if (lexeme !== undefined)
					matches.push({ type, lexeme, ignore: rule.ignore });
			}

			const longestMatch = matches.reduce((prevMatch, match) => (match.lexeme.length > prevMatch.lexeme.length) ? match : prevMatch, {lexeme:""});
			//Maybe implement regex specificty aswell? more constants = more specific / more classes = less specific
			//regexp/var/ (1co, 0cl) would win over regexp/[a-z]+/ (0co, 2cl)
			if (longestMatch) {
				const {line, column} = getLineAndColumn(input, index);
				if (!longestMatch.ignore)
					tokens.push(new LexicalToken(longestMatch.type, longestMatch.lexeme, line, column));
				index += longestMatch.lexeme.length;
			}

			if (index === lastIndex)
				handleError("Unknown lexeme", input, index, Array.from(this._rules, ([,rule]) => rule.pattern));
		}

		if (this._usePythonBlocks) {
			// TODO: This also recognises normal indenting as blocks.
			//	Python uses colons to denote block start.
			//	what will we use?
			const indentStack = new IndentStack();
			for (let i = 0; i < tokens.length; i++) {
				if (tokens[i].type === "_newline") {
					let indent = 0;
					i += 1;
					if (i >= tokens.length) // Reached EOF
						break;
					while (tokens[i].type === "_whitespace") {
						indent += 1;
						tokens.splice(i, 1);
					}
					if (indent > indentStack.last()) {
						indentStack.push(indent);
						tokens.splice(i, 0, new LexicalToken("INDENT"))
					} else if (indent < indentStack.last()) {
						if (!indentStack.includes(indent))
							throw `Inconsistent indent at line X, column Y.`;
						indentStack.popTill(
							() => !indentStack.includesLargerThan(indent),
							() => tokens.splice(i, 0, new LexicalToken("DEDENT")));
					}
				}
			}
			indentStack.popTillInitial(
				() => tokens.splice(tokens.length, 0, new LexicalToken("DEDENT")));
			tokens = tokens.filter(token => !["_newline", "_whitespace"].includes(token.type));
		}

		if (this._generateOEF)
			tokens.push(new LexicalToken("EOF"));

		return tokens;
	}
	lex (...args) {
		if (type(args[0]) === "string")
			return this._lexString(args[0]);
		else if (args[0].on)
			return this._lexStream(args[0]);
		else throw `
			Unsupported ${inflect("argument", args.length)}: ${args.map(arg => type(arg)).join(", ")}.
			Supported formats:
				string: input
				ReadableStream: input
		`;
	}

	usePythonBlocks (flag = true) {
		// TODO: Implement this warning.
		//	Should probably also be warned the other way around
		//	i.e. when using python blocks and calling .ignore whitespace.
		// if (ingoring whitespace or newline) {
		// 	console.warn("Cannot both ignore whitespace and use python blocks.");
		// 	return this;
		// }
		this._usePythonBlocks = flag;
		if (this._usePythonBlocks) {
			this.rule("_newline", /(?:\r*\n)+/);
			this.rule("_whitespace", /[ \t]/);
		}
		else
			for (const name of ["_newline", "_whitespace"])
				this._rules.delete(name);
		return this;
	}

	generateOEF (flag = true) {
		this._generateOEF = flag;
	}
}