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
		const grammarTokens = metaLexer.lex(meta);

		if (grammarTokens[0] === undefined || grammarTokens[0].type !== "type")
			throw `Name is malformed or undefined at line ${(grammarTokens[0]||{}).line}, column 0.`;
		const name = grammarTokens[0].lexeme;

		if (grammarTokens[1] === undefined || grammarTokens[1].type !== "assignment")
			throw `Error in rule "${name}": misplaced or undefined assignment at line ${(grammarTokens[1]||{}).line}, column ${(grammarTokens[1]||{}).column}.`;

		// TODO: stop filtering the operators and properly parse those bois.
		const grammar = grammarTokens.slice(2);

		(()=>{switch (type) {
			case "ignore":
				return this.ignorations.set(name, this.buildRecogniser(name, grammar));
			case "define":
				return this.definitions.set(name, this.buildRecogniser(name, grammar));
			case "rule":
				return this.rules.set(name, this.buildRecogniser(name, grammar));
			default:
				throw `What's a ${type}? You done a typo, dingus!`;
		}})();

		return this;
	}

	buildRecogniser (name, fullGrammar) {
		const options = [[]];
			let depth = 0;
			for (const token of fullGrammar) {
				inspect(token);
				switch (token.type) {
					case "or":
						if (depth === 0) {
							options.push([]);
							continue;
						}
					case "open-paren":
					case "close-paren":
						depth += (token.type === "open-paren")
							? 1
							: -1;
				}
				options[options.length - 1].push(token);
			}

		// TODO: maybe check deeper if a rule is left-recursive
		//	or figure out a way to rewrite the rule to be LL parser friendly.
		for (const first of options.map(option => option[0])) {
			if (first.lexeme.includes(name))
				throw `Rule "${name}" is left-recursive.`;
		}

		return (function recognise (tokens) {
			// TODO: Keep track of succesful parse depth
			//	so that when a syntax error occurs, we can
			//	suggest the most applicable alternative
			//	to the erroneus grammar the user provided.

			reject:for (const grammar of options) {
				inspect(grammar, options);
				const matchedTokens = [];
				let inputCursor = 0;
				function consume (match) {
					matchedTokens.push(match);
					inputCursor += (match instanceof ParserMatch)
						? match.offset
						: 1;
				}
				accept:for (let grammarCursor = 0; grammarCursor < grammar.length; grammarCursor++) {
					const expected = grammar[grammarCursor];
					const got = tokens[inputCursor];
					inspect("expected", expected, "got", got);
					switch (expected.type) {
						case "lexeme": {
							if (got.lexeme !== expected.lexeme.slice(1, -1)) //remove ""
								continue reject;
							consume(got);
							continue accept;
						}
						case "type": {
							if (got.type !== expected.lexeme)
								continue reject;
							consume(got);
							continue accept;
						}
						case "subrule": {
							const grammar = this.rules.get(expected.lexeme.slice(1, -1)); //remove <>
							const match = grammar(tokens.slice(inputCursor));
							if (match.isNothing())
								continue reject;
							consume(match);
							continue accept;
						}
						case "definition": {
							const grammar = this.definitions.get(expected.lexeme.slice(1)); //remove #
							const match = grammar(tokens.slice(inputCursor));
							if (match.isNothing())
								continue reject;
							consume(match);
							continue accept;
						}
						case "open-paren": {
							const openParenthesis = grammar[grammarCursor++];
							const groupGrammar = [];
							let depth = 1;

							while (depth > 0) {
								if (grammarCursor >= grammar.length)
									throw `Unclosed parentheses at line ${openParenthesis.line}, column ${openParenthesis.column}`;
								switch(grammar[grammarCursor].type) {
									case "open-paren":
										depth += 1;
										break;
									case "close-paren":
										depth -= 1;
								}
								groupGrammar.push(grammar[grammarCursor++]);
							}
							// Maybe not even match last paren?
							//	or slice it when building
							groupGrammar.splice(-1, 1); // Remove last close-paren
							grammarCursor -= 1; // Go back a grammar step, since we removed the close-paren

							// Skip empty groups
							if (groupGrammar.length === 0) {
								console.warn(`\n\nSkipping empty parentheses at line ${openParenthesis.line}, column ${openParenthesis.column}`);
								continue accept;
							}

							//Maybe warn user of unneccesary nesting
							//	(i.e.((token)) === (token) === token)

							const match = this.buildRecogniser(name, groupGrammar)(tokens.slice(inputCursor));
							if (match.isNothing())
								continue reject;
							consume(match);
							continue accept;
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