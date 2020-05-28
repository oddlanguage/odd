"use strict";

import Rule from "./Rule.js";
import Token from "./Token.js";
import Match from "./Match.js";
import { escapeString } from "../util.js";
import Location from "./Location.js";

export default class Lexer {

	// TODO: Use next js #private fields instead
	//	of underscored this._fields.

	// TODO: Move EOF functionality out of the
	//	parser combinators into the lexer,
	// TODO: Decide if we even want to do EOF
	//	(EOF is used to note end of tokenstream but
	//	an exhausted iterator returns
	//	{ done: true, value: undefined })
	//	If yes, should it be configurable?

	// TODO: Lex binary format?

	constructor () {
		this._rules = new Map();
	}

	define (name, pattern) {
		this._rules.set(name, Rule.compile(name, pattern, Rule.types.define, this._rules));
		return this;
	}

	ignore (name, pattern) {
		this._rules.set(name, Rule.compile(name, pattern, Rule.types.ignore, this._rules));
		return this;
	}

	rule (name, pattern) {
		this._rules.set(name, Rule.compile(name, pattern, Rule.types.rule, this._rules));
		return this;
	}

	async *lex (input) {
		let line = 1;
		let char = 1;
		const rules = [...this._rules].filter(entry => entry[1].type !== Rule.types.define);
		const stream = (typeof input === "string")
			? [input]
			: input;

		for await (const chunk of stream) {
			let index = 0;
			while (index < chunk.length) {
				const matches = [];
				for (const [name, rule] of rules) {
					const match = Match.at(name, rule, chunk, index);
					if (!match) {
						continue;
					}
					matches.push(match);
				}

				if (!matches[0]) {
					throw new Error(`Unknown lexeme "${escapeString(String.fromCodePoint(chunk.codePointAt(index)))}" at line ${line}, char ${char}.`);
				}
				
				const longest = matches.reduce((longest, match) =>
					(match.length > longest.length)
						? match
						: longest);

				// Get token location
				const newlines = (longest.match.match(/\n/g) || []).length
				line += newlines;
				if (newlines > 0) {
					char = 1;
				}

				if (longest.type === Rule.types.rule) {
					yield new Token(longest.name, longest.match, new Location(line, char));
				}

				// "Eat"
				char += longest.length - newlines;
				index += longest.length; // TODO: .length will break on unicode input // Actually, are we sure about this?
			}
		}
	}

}