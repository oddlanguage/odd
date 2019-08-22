"use strict";
"hide implementation";

const DeferredMap = require("./DeferredMap.js");
const metaLexer = require("./metaoddLexer.js");
const ParserMatch = require("./ParserMatch.js");
const inspect = require("../helpers/inspect.js");
const Stack = require("./Stack.js");

module.exports = class Parser {
	constructor () {
		this.ignorations = new Map();
		this.definitions = new Map();
		this.rules = new Map();
	}

	ignore (meta) {
		return this._save("ignore", meta);
	}

	define (meta) {
		return this._save("define", meta);
	}

	rule (meta) {
		return this._save("rule", meta);
	}

	_save (type, meta) {
		const grammar = metaLexer.lex(meta);

		if (grammar[0] === undefined || grammar[0].type !== "type")
			throw `Name is malformed or undefined at line ${(grammar[0]||{}).line}, column 0.`;
		const name = grammar[0].lexeme;

		if (grammar[1] === undefined || grammar[1].type !== "assignment")
			throw `Error in rule "${name}": misplaced or undefined assignment at line ${(grammar[1]||{}).line}, column ${(grammar[1]||{}).column}.`;

		// parse builder function (check : and => and ;)
		// TODO: stop filtering the operators and properly parse those bois.
		const filtered = grammar
			.slice(2)
			.filter(token => !["!", "?", "*", "+"].includes(token.lexeme));

		(()=>{switch (type) {
			case "ignore":
				return this.ignorations.set(name, this.buildRecogniser(name, filtered));
			case "define":
				return this.definitions.set(name, this.buildRecogniser(name, filtered));
			case "rule":
				return this.rules.set(name, this.buildRecogniser(name, filtered));
			default:
				throw `What's a ${type}? You done a typo, dingus!`;
		}})();

		return this;
	}

	buildRecogniser (name, grammar) {
		const options = new Stack([]);
			let depth = 0;
			for (const token of grammar) {
				switch (token.type) {
					case "or":
						if (depth === 0) {
							options.push([]);
							continue;
						}
					case "open-paren":
						depth += 1;
						break;
					case "close-paren":
						depth -= 1;
				}
				options.last().push(token);
			}

		// TODO: maybe check deeper if a rule is left-recursive
		for (const first of options.map(option => option[0])) {
			if (first.lexeme.includes(name))
				throw `Rule "${name}" is left-recursive.`;
		}

		return (function recognise (tokens) {
			// TODO: Keep track of succesful parse depth
			//	so that when a syntax error occurs, we can
			//	suggest the most applicable alternative
			//	to the erroneus grammar the user provided.

			outer: for (const option of options) {
				const matchedTokens = [];
				let inputCursor = 0;
				inner: for (let grammarCursor = 0; grammarCursor < option.length; grammarCursor++) {
					const expected = option[grammarCursor];
					const got = tokens[inputCursor];
					switch (expected.type) {
						case "lexeme": {
							if (got.lexeme !== expected.lexeme.slice(1, -1)) //remove ""
								continue outer;
							matchedTokens.push(got);
							inputCursor += 1;
							continue inner;
						}
						case "type": {
							if (got.type !== expected.lexeme)
								continue outer;
							matchedTokens.push(got);
							inputCursor += 1;
							continue inner;
						}
						case "subrule": {
							const grammar = this.rules.get(expected.lexeme.slice(1, -1)); //remove <>
							const match = grammar(tokens.slice(inputCursor));
							if (match.isNothing())
								continue outer;
							matchedTokens.push(match);
							inputCursor += match.offset;
							continue inner;
						}
						case "definition": {
							const grammar = this.definitions.get(expected.lexeme.slice(1)); //remove #
							const match = grammar(tokens.slice(inputCursor));
							if (match.isNothing())
								continue outer;
							matchedTokens.push(match);
							inputCursor += match.offset;
							continue inner;
						}
						case "open-paren": {
							const openParenthesis = option[grammarCursor++];
							const groupGrammar = [];
							let depth = 1;

							while (depth > 0) {
								if (grammarCursor >= option.length)
									throw `Unclosed parentheses at line ${openParenthesis.line}, column ${openParenthesis.column}`;
								switch(option[grammarCursor].type) {
									case "open-paren":
										depth += 1;
										break;
									case "close-paren":
										depth -= 1;
								}
								groupGrammar.push(option[grammarCursor++]);
							}
							// Maybe not even match last paren?
							//	or slice it when building
							groupGrammar.splice(-1, 1); // Remove last close-paren
							grammarCursor -= 1; // Go back a grammar step, since we removed the close-paren

							// Skip empty groups
							if (groupGrammar.length === 0) {
								console.warn(`\n\nSkipping empty parentheses at line ${openParenthesis.line}, column ${openParenthesis.column}`);
								continue inner;
							}

							//Maybe warn user of unneccesary nesting
							//	(i.e.((token)) === (token) === token)

							const match = this.buildRecogniser(name, groupGrammar)(tokens.slice(inputCursor));
							if (match.isNothing())
								continue outer;
							matchedTokens.push(match);
							inputCursor += match.offset;
							continue inner;
						}
						case "ignoration": {
							//Maybe allow this too? Matches the tokens but returns ParserMatch.skip(n);
							throw `Error in rule "${name}": cannot reference ignoration "${expected.lexeme}". Try declaring it as a rule or definition.`;
						}
						default: {
							throw `Error in rule "${name}": no case for ${expected.type} "${expected.lexeme}".`;
						}
					}
				}
				return new ParserMatch(inputCursor, matchedTokens);
			}
			return ParserMatch.NO_MATCH;
		}).bind(this);
	}

	parse (tokens) {
		const tree = { type: "program", expressions: [] };
		let offset = 0;
		outer: while (offset < tokens.length) {
			const prevOffset = offset;
			const reversed = [...this.rules]
				.reverse()
				.map(([,v]) => v); // Reversing all defined rules decreases calls significantly.
			inner: for (const recogniser of reversed) {
				const match = recogniser(tokens.slice(offset));
				if (match.isNothing())
					continue inner;
				offset += match.offset;
				tree.expressions.push(match.flat().build(x => x)); // x => x should be the parsed builder : tokens => ... ;

				// Short circuit if EOF
				if (offset >= tokens.length)
					break outer;
			}
			if (offset === prevOffset)
				throw `Unexpected ${tokens[offset].type} "${tokens[offset].lexeme}" at line ${tokens[offset].line}, column ${tokens[offset].column}.`;
		}
		setTimeout(() => inspect(tree), 0);
		return tree;
	}
}