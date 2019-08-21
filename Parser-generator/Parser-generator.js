"use strict";
"hide implementation";

const DeferredMap = require("./DeferredMap.js");
const metaLexer = require("./metaoddLexer.js");
const ParserMatch = require("./ParserMatch.js");
const inspect = require("../helpers/inspect.js");

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
			throw `Error in rule "${name}": misplaced or undefined assignment at line x, column y.`;

		// parse builder function (check : and => and ;)
		// TODO: stop filtering the operators and properly parse those bois.
		const ignoreFromIndex = grammar.findIndex(token => token.type === "or");
		const toBuild = (ignoreFromIndex === -1)
			? grammar.slice(2)
			: grammar.slice(2, ignoreFromIndex);
		const filtered = toBuild.filter(token => !["!", "?", "*", "+"].includes(token.lexeme));

		(()=>{switch (type) {
			case "ignore":
				return this.ignorations.set(name, this._buildRecogniser(name, filtered));
			case "define":
				return this.definitions.set(name, this._buildRecogniser(name, filtered));
			case "rule":
				return this.rules.set(name, this._buildRecogniser(name, filtered));
			default:
				throw "You done a typo, dingus!";
		}})();

		return this;
	}

	_buildRecogniser (name, grammar) {
		return (function recognise (tokens) {
			// TODO: Keep track of succesful parse depth
			//	so that when a syntax error occurs, we can
			//	suggest the most applicable alternative
			//	to the erroneus grammar the user provided.
			const stack = [];
			let offset = 0;
			for (let i = 0; i < grammar.length; i++) {
				const expected = grammar[i];
				const got = tokens[offset];
				switch (expected.type) {
					case "lexeme": {
						if (got.lexeme !== expected.lexeme.slice(1, -1)) //remove ""
							return ParserMatch.NO_MATCH;
						stack.push(got);
						offset += 1;
						continue;
					}
					case "type": {
						if (got.type !== expected.lexeme)
							return ParserMatch.NO_MATCH;
						stack.push(got);
						offset += 1;
						continue;
					}
					case "subrule": {
						const grammar = this.rules.get(expected.lexeme.slice(1, -1)); //remove <>
						const match = grammar(tokens.slice(offset));
						if (match.isNothing())
							return ParserMatch.NO_MATCH;
						stack.push(match);
						offset += match.offset;
						continue;
					}
					case "definition": {
						const grammar = this.definitions.get(expected.lexeme.slice(1)); //remove #
						const match = grammar(tokens.slice(offset));
						if (match.isNothing())
							return ParserMatch.NO_MATCH;
						stack.push(match);
						offset += match.offset;
						continue;
					}
					case "open-paren": {
						const openParenthesis = grammar[i++];
						const groupGrammar = [];
						let depth = 1;

						while (depth > 0) {
							if (i >= grammar.length)
								throw `Unclosed parentheses at line ${openParenthesis.line}, column ${openParenthesis.column}`;
							switch(grammar[i].type) {
								case "open-paren":
									depth += 1;
									break;
								case "close-paren":
									depth -= 1;
							}
							groupGrammar.push(grammar[i++]);
						}
						// Maybe not even match last paren?
						//	or slice it when building
						groupGrammar.splice(-1, 1); // Remove last close-paren

						// Skip empty groups
						if (groupGrammar.length === 0) {
							console.warn(`\n\nSkipping empty parentheses at line ${openParenthesis.line}, column ${openParenthesis.column}`);
							continue;
						}

						//Maybe warn user of unneccesary nesting
						//	(i.e.((token)) === (token) === token)

						const match = this._buildRecogniser(name, groupGrammar)(tokens.slice(offset));
						if (match.isNothing())
							return ParserMatch.NO_MATCH;
						stack.push(match);
						offset += match.offset;
						continue;
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
			return new ParserMatch(offset, stack);
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
			for (const recogniser of reversed) {
				const match = recogniser(tokens.slice(offset));
				if (match.isNothing())
					continue;
				offset += match.offset;
				tree.expressions.push(match.flat().build(x => x)); // x => x should be the parsed builder : tokens => ... ;

				// Short circuit if EOF
				if (offset >= tokens.length)
					break outer;
			}
			if (offset === prevOffset)
				throw `Unexpected ${tokens[offset].type} "${tokens[offset].lexeme}" at line ${tokens[offset].line}, column ${tokens[offset].column}.`;
		}
		inspect(tree);
		return tree;
	}
}