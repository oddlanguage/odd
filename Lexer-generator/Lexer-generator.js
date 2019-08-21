"use strict";
"hide implementation";

const LexicalToken = require("./LexicalToken.js");
const assert = require("../helpers/assert.js");
const type = require("../helpers/type.js");
const { inflect } = require("../helpers/String.js");
const { unique } = require("../helpers/Array.js");
const { getPattern } = require("../helpers/RegExp.js");

module.exports = class Lexer {
	constructor () {
		this._rules = new Map();
		this._definitions = new Map();
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
					${message} at line ${line}, column ${column}.
					${errorLine}`
				.trim()
				.replace(/^[\r\t\f\v ]+/gm, "")
				+ `\n${" ".repeat(Math.max(0, column - leadingWhitespaceLength))}${"^".repeat(errorLexeme.length)}`;
		}

		const inputLength = input.length;
		const tokens = [];
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
}