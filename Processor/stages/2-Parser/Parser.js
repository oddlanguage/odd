const { inflect } = require("../../../helpers/String.js");
const inspect = require("../../../helpers/inspect.js");
const NODES = require("./Nodes.js");

const SKIPPED = Symbol("SKIPPED");
module.exports = class Parser {
	static get NO_MATCH () { return [0, null]; } //static NO_MATCH = [0, null]; //Uncomment this when class fields are implemented
	static get SKIPPED () { return SKIPPED; }

	constructor () {
		this._rules = new Map([
			["number", this.production(
				`integer-number | decimal-number`
			)],
			["string", this.production(
				`string | template-literal`
			)],
			["literal", this.production(
				`<string> | literal`
			)],
			["exponentiation-expression", this.production(
				`<expression> operator"^" <expression>`,
				nodes => new NODES.ExponentiationExpression(nodes[0], nodes[2])
			)],
			["multiplication-expression", this.production(
				`<expression> operator"*" <expression>`,
				nodes => new NODES.ExponentiationExpression(nodes[0], nodes[2])
			)],
			["division-expression", this.production(
				`<expression> operator"/" <expression>`,
				nodes => new NODES.ExponentiationExpression(nodes[0], nodes[2])
			)],
			["addition-expression", this.production(
				`<expression> operator"+" <expression>`,
				nodes => new NODES.ExponentiationExpression(nodes[0], nodes[2])
			)],
			["subtraction-expression", this.production(
				`<expression> operator"-" <expression>`,
				nodes => new NODES.ExponentiationExpression(nodes[0], nodes[2])
			)],
			["math-expression", this.production(
				`<number> | <exponentiation-expression> | <multiplication-expression> | <division-expression> | <addition-expression> | <subtraction-expression>`
			)],
			["more-expressions", this.production(
				`punctuation"," expression`
			)],
			["expression", this.production(
				`punctuation"(" expression <more-expressions>* punctuation")" | <math-expression> | <literal> | <const-definition> | <var-definition>`
			)],
			["declaration", this.production(
				`type-annotation? identifier operator"=" <expression> semicolon`,
				nodes => new NODES.Declaration(nodes[0], nodes[1], nodes[3])
			)],
			["const-definition", this.production(
				`storage-type"const" <declaration>`,
				nodes => new NODES.ConstDefinition(nodes[1])
			)],
			["var-definition", this.production(
				`storage-type"var" <declaration>`,
				nodes => new NODES.ConstDefinition(nodes[1])
			)]
		]);
	}

	production (grammar, builder) {
		//Returns a function that checks expectations
		return tokens => {
			const typeLexemeRegex = /(?<type>[^"']+)(?:["'](?<lexeme>.+)["'])?/;
			const subruleRegex = /<.+>/;
			const options = grammar
				.split(/\s*\|\s*/)
				.map(production => production
					.split(/\s+/)
					.map(chunk => {
						const {rule, quantifier} = chunk.match(/(?<rule>[^?*+]+)(?<quantifier>[?*+])?/).groups;
						const [min, max] = (()=>{
							if (quantifier === "?") return [0, 1];
							if (quantifier === "*") return [0, Infinity];
							if (quantifier === "+") return [1, Infinity];
							else return [1, 1];
						})();

						if (subruleRegex.test(rule))
							return {subrule: this._rules.get(rule.slice(1, - 1)), min, 	max};
						else return {
							...rule.match(typeLexemeRegex).groups,
							min,
							max
						};
					}));

			const matches = [];
			for (const option of options) {
				const [i, result] = this.expect(option, tokens);
				if (result !== null) {
					if (builder !== undefined) {
						matches.push([i, builder(result)]);
					} else {
						matches.push([i, result[0]]);
					}
				}
			}

			if (matches.length === 0)
				return Parser.NO_MATCH;

			return matches.reduce((longest, current) => (current[0] > longest[0])
				? current
				: longest);
		};
	}

	expect (rules, tokens) {
		const result = [];
		let i = 0;

		outer: for (const rule of rules) {
			if ("subrule" in rule) {
				let matchCount = 0;
				inner: while (true) {
					const res = rule.subrule(tokens.slice(i));
					if (res === Parser.NO_MATCH) {
						if (matchCount < rule.min)
							return Parser.NO_MATCH;

						result.push(Parser.SKIPPED);
						i += 1;
					} else {
						result.push(res[1]);
						i += res[0];
						matchCount += 1;
					}

					if (matchCount >= rule.max)
						break inner;
					
					continue outer;
				}
			} else if ("type" in rule) {
				let matchCount = 0;
				inner: while (true) {
					if ((tokens[i].type !== rule.type)
						|| (rule.lexeme !== undefined && tokens[i].lexeme !== rule.lexeme)) {
							if (matchCount < rule.min) {
								return Parser.NO_MATCH;
							} else {
								result.push(Parser.SKIPPED);
							}
					} else {
						result.push(tokens[i]);
					}
					i += 1;
	
					if (matchCount >= rule.max)
						break inner;
					
					continue outer;
				}
			}
		}

		return [i, result];
	};

	_validateName(name) {
		if (Boolean(name.match(/\s/)) === true)
			throw `Rule names cannot contain spaces, but "${name}" does.`;
	}

	_parseRules (rules, isDefinition) {
		// |        = break into new rule
		// <name>   = sub-rule
		// *        = 0 or more
		// +        = 1 or more
		// ?        = optional (0 or 1)
		// (...)    = treat as one (group)
		// "..."    = lexeme
		// abc      = type
		// abc"..." = lexeme that must have type

		//Don't forget to treat definitions as such (only available as sub-rule)
		return rules;
	}

	_saveRule (name, rules, isDefinition) {
		this._validateName(name);
		// this._rules.set(name, this._parseRules(rules, isDefinition));
	}
	
	ruleFromCFG (grammar, isDefinition) {
		const [name, body] = grammar.split(/\s*(?:-?->|:{0,2}=)\s*/);
		this._saveRule(name, body, isDefinition);
		return this;
	}

	define (...args) {
		return this.rule(...args, true);
	}

	rule (...args) {
		if (typeof args[0] === "string")
			return this.ruleFromCFG(...args);
		throw `
			Unsupported ${inflect("argument", args.length)}: ${args.map(arg => type(arg)).join(", ")}.
			Supported formats:
				string: CFG, boolean: isDefinition
		`;
	}

	_backTrack (tokens, offset) {
		//Find the rule that most closely matches tokens.slice(offset)
		//Report what probably went wrong (assignment missing a rhs value? etc.).
		throw `No matched rules found at\n${tokens.slice(offset).map(token => JSON.stringify(token, null, 2))}`;
	}

	parse (tokens) {
		const program = new NODES.Program();
		const startLength = tokens.length;
		let newTokens = tokens;

		main: while (true) { //should run while newTokens.length > 0
			const currentLength = newTokens.length;
			for (const [,rule] of this._rules) {
				const [lengthDifference, node] = rule(newTokens);

				//Rule didn't match
				if (lengthDifference === 0 && node === null)
					continue;

				//Rule did match, update newTokens and append node to program
				newTokens = newTokens.slice(lengthDifference);
				program.addNode(node);

				inspect(newTokens);
				//Eager break if tokens depleted
				if (newTokens.length === 0)
					break main;
			}

			//No rule found
			if (currentLength === newTokens.length)
				this._backTrack(tokens, startLength - currentLength);
		}

		inspect(program);
		return program;
	}
}