"use strict";

import Parsestate from "./Parsestate.js";
import Rule from "./Rule.js";
import Result from "./Result.js";

export default class Parser {

	#state = new Parsestate();
	#rules = new Map();
	#tokens = [];

	rule (name, parser) {
		this.#rules.set(name, new Rule(name, parser, Rule.types.rule));
		return this;
	}

	// TODO: How would this work in a parser?
	define (name, parser) {
		this.#rules.set(name, new Rule(name, parser, Rule.types.define));
		return this;
	}

	// TODO: How would this work in a parser?
	ignore (name, parser) {
		this.#rules.set(name, new Rule(name, parser, Rule.types.ignore));
		return this;
	}

	async parse (stream) {
		// UGLY: Make tokens a synchronously accessible array
		//	bc I'm too stupid to figure out how to get this
		//	working otherwise.
		// TODO: Don't be stupid.

		for await (const token of stream) {
			this.#tokens.push(token);
		}

		const program = this.#rules.get("program");
		if (!program)
			throw `No "program" rule defined.`;

		// TODO: Maybe merge all these extra parameters into one (such as "this")?
		const result = program.parser(this.#state, this.#rules, this.#tokens);
		if (!result.ok)
			throw result.error;
		
		if (this.#state.index < this.#tokens.length)
			throw `Unexpected ${this.#tokens[this.#state.furthest]}.`;
		
		return Result.success("program", [result]);
	}

}