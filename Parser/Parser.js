"use strict";

import ParseState from "./ParseState.js";
import Rule from "./Rule.js";
import Result from "./Result.js";
import * as combinators from "./combinators.js";

export default class Parser {

	#state = new ParseState();
	#rules = new Map();
	#tokens = [];

	static combinators = combinators;

	rule (name, parser) {
		this.#rules.set(name, new Rule(name, parser, Rule.types.rule));
		return this;
	}

	// TODO: Maybe make an "error" method to make for vastly
	//	more usable error messages on mistyped code.
	//	Example:
	//	.catch(
	//		"unterminated-statement",
	//		sequence(rule("expression"), not(lexeme(";"))),
	//		tree => `Expected ";" to terminate statement.`)
	//	This would however require the parser to backtrack
	//	way more efficiently.

	// TODO: Improve backtracking efficiency
	//	(remember previously parsed tokens on parse failure).

	// TODO: parse binary format (requires binary lexing first)?

	async parse (stream) {
		for await (const token of stream) {
			this.#tokens.push(token);
		}

		const program = this.#rules.get("program");
		if (!program)
			throw `No "program" rule defined.`;

		// TODO: Maybe merge all these extra parameters into one?
		const result = program.parser(this.#state, this.#rules, this.#tokens);
		if (!result.ok)
			throw result.error;
		
		if (this.#state.index < this.#tokens.length)
			throw `Unexpected ${this.#tokens[this.#state.furthest]}.`;
		
		return Result.success("program", [result]);
	}

}