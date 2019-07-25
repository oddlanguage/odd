const { inflect } = require("../../../helpers/String.js");
const NODES = require("./Nodes.js");

const { inspect: _inspect } = require("util");
function inspect (...values) {
	const errLine = new Error().stack
		.split(/\n\s*/)[2];
	const pos = errLine.slice(errLine.lastIndexOf("\\") + 1, -1);
	console.log(`\n\n@ ${pos}`);
	values.forEach(value => {
		console.log(_inspect(value, {
			depth: Infinity,
			colors: true,
			compact: false
		}));
	});
	console.log("\n");
}

const SKIPPED = Symbol("SKIPPED");
module.exports = class Parser {
	static get NO_MATCH () { return [0, null]; } //static NO_MATCH = [0, null]; //Uncomment this when class fields are implemented
	static get SKIPPED () { return SKIPPED; }

	production (grammar, builder) {
		//Returns a function that checks expectations
		return tokens => {
			const typeLexemeRegex = /(?<type>[^"']+)(?:["'](?<lexeme>.+)["'])?/;
			const subruleRegex = /<.+>/;
			const rules = grammar
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
				});

			const [i, result] = this.expect(rules, tokens);
			if (result === Parser.NO_MATCH)
				return result;

			return [i, builder(result)];
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
						if (matchCount < rule.min) {
							return Parser.NO_MATCH;
						}
						result.push(Parser.SKIPPED);
					} else {
						result.push(res[1]);
					}

					i += res[0];
					matchCount += 1;
					if (matchCount >= rule.max)
						break inner;
					
					continue outer;
				}
			} else if ("type" in rule) {
				if (tokens[i].type !== rule.type)
					return Parser.NO_MATCH;

				if (rule.lexeme !== undefined && tokens[i].lexeme !== rule.lexeme)
					return Parser.NO_MATCH;
				
				i += 1;
				result.push(tokens[i]);
				continue outer;
			}
		}

		return [i, result];
	};

	constructor () {
		this._rules = new Map([
			["number", tokens => {
				let i = 0;
				if (tokens[0].type === "decimal-number") {
					i += 1;
					return [i, tokens[0]];
				}
				
				if (tokens[0].type === "integer-number") {
					i += 1;
					return [i, tokens[0]];
				}
				
				return Parser.NO_MATCH;
			}],
			["exponentiation-expression", tokens => {
				let i = 0;
				let lhs;
				let rhs;
				const number = this._rules.get("number");
				
				const numberVal = number(tokens.slice(i));
				if (numberVal[0] !== 0) {
					i += numberVal[0];
					lhs = numberVal[1];
					
					if (tokens[i].type === "operator" && tokens[i].lexeme === "^") {
						i += 1;
					} else return Parser.NO_MATCH;

					const numberVal2 = number(tokens.slice(i));
					if (numberVal2[0] !== 0) {
						i += numberVal2[0];
						rhs = numberVal2[1];
					}

					return [
						i,
						new NODES.ExponentiationExpression(lhs, rhs)
					];
				} else return Parser.NO_MATCH;
			}],
			["multiplication-expression", tokens => {
				let i = 0;
				let lhs;
				let rhs;
				const number = this._rules.get("number");
				
				const numberVal = number(tokens.slice(i));
				if (numberVal[0] !== 0) {
					i += numberVal[0];
					lhs = numberVal[1];
					
					if (tokens[i].type === "operator" && tokens[i].lexeme === "*") {
						i += 1;
					} else return Parser.NO_MATCH;

					const numberVal2 = number(tokens.slice(i));
					if (numberVal2[0] !== 0) {
						i += numberVal2[0];
						rhs = numberVal2[1];
					}

					return [
						i,
						new NODES.MultiplicationExpression(lhs, rhs)
					];
				} else return Parser.NO_MATCH;
			}],
			["division-expression", tokens => {
				let i = 0;
				let lhs;
				let rhs;
				const number = this._rules.get("number");
				
				const numberVal = number(tokens.slice(i));
				if (numberVal[0] !== 0) {
					i += numberVal[0];
					lhs = numberVal[1];
					
					if (tokens[i].type === "operator" && tokens[i].lexeme === "/") {
						i += 1;
					} else return Parser.NO_MATCH;

					const numberVal2 = number(tokens.slice(i));
					if (numberVal2[0] !== 0) {
						i += numberVal2[0];
						rhs = numberVal2[1];
					}

					return [
						i,
						new NODES.DivisionExpression(lhs, rhs)
					];
				} else return Parser.NO_MATCH;
			}],
			["addition-expression", tokens => {
				let i = 0;
				let lhs;
				let rhs;
				const number = this._rules.get("number");
				
				const numberVal = number(tokens.slice(i));
				if (numberVal[0] !== 0) {
					i += numberVal[0];
					lhs = numberVal[1];
					
					if (tokens[i].type === "operator" && tokens[i].lexeme === "+") {
						i += 1;
					} else return Parser.NO_MATCH;

					const numberVal2 = number(tokens.slice(i));
					if (numberVal2[0] !== 0) {
						i += numberVal2[0];
						rhs = numberVal2[1];
					}

					return [
						i,
						new NODES.AdditionExpression(lhs, rhs)
					];
				} else return Parser.NO_MATCH;
			}],
			["subtraction-expression", tokens => {
				let i = 0;
				let lhs;
				let rhs;
				const number = this._rules.get("number");
				
				const numberVal = number(tokens.slice(i));
				if (numberVal[0] !== 0) {
					i += numberVal[0];
					lhs = numberVal[1];
					
					if (tokens[i].type === "operator" && tokens[i].lexeme === "-") {
						i += 1;
					} else return Parser.NO_MATCH;

					const numberVal2 = number(tokens.slice(i));
					if (numberVal2[0] !== 0) {
						i += numberVal2[0];
						rhs = numberVal2[1];
					}

					return [
						i,
						new NODES.SubtractionExpression(lhs, rhs)
					];
				} else return Parser.NO_MATCH;
			}],
			["expression", tokens => {
				let i = 0;
				const names = [
					"exponentiation-expression",
					"multiplication-expression",
					"division-expression",
					"addition-expression",
					"subtraction-expression"
				];

				const methods = names.map(name => this._rules.get(name));
				for (const method of methods) {
					const result = method(tokens.slice(i));
					if (result[0] !== 0) {
						return result;
					}
				}
				return Parser.NO_MATCH;
			}],
			["declaration",
			// tokens => {
			// 	let i = 0;
			// 	let type;
			// 	let lhs;
			// 	let rhs;

			// 	if (tokens[i].type === "type-annotation") {
			// 		type = tokens[i].lexeme;
			// 		i += 1;
			// 	}//optional

			// 	if (tokens[i].type === "identifier") {
			// 		lhs = tokens[i].lexeme;
			// 		i += 1;
			// 	} else return Parser.NO_MATCH;

			// 	if (tokens[i].type === "operator" && tokens[i].lexeme === "=") {
			// 		i += 1;
			// 	} else return Parser.NO_MATCH;

			// 	const expression = this._rules.get("expression");
			// 	const value = expression(tokens.slice(i));
			// 	if (value[0] !== 0) {
			// 		rhs = value[1];
			// 		i += value[0];
			// 	} else return Parser.NO_MATCH;

			// 	if (tokens[i].type === "semicolon") {
			// 		i += 1;
			// 	} else return Parser.NO_MATCH;

			// 	return [
			// 		i,
			// 		new NODES.Declaration(type, lhs, rhs)
			// 	];
			// }
			this.production(
				`type-annotation? identifier operator"=" <expression> semicolon`,
				nodes => {
					inspect(nodes);
					return new NODES.Declaration(nodes[0], nodes[1], nodes[3])})
			],
			["const-definition", this.production(
				`storage-type"const" <declaration>`,
				nodes => new NODES.ConstDefinition(nodes[1])
			)],
			["var-definition", tokens => {
				let i = 0;

				if (tokens[i].type === "storage-type" && tokens[i].lexeme === "var") {
					i += 1;
				}

				const declaration = this._rules.get("declaration");
				const declarationVal = declaration(tokens.slice(i));
				if (declarationVal[0] !== 0) {
					i += declarationVal[0];
				} else return Parser.NO_MATCH;

				return [
					i,
					new NODES.VarDefinition(declarationVal[1])
				];
			}]
		]);
	}

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
		throw `No matched rules found at\n${inspect(tokens.slice(offset))}`;
	}

	parse (tokens) {
		const program = new NODES.Program();
		const startLength = tokens.length;
		let newTokens = tokens;

		main: while (true) {
			const currentLength = newTokens.length;
			for (const [,rule] of this._rules) {
				const [lengthDifference, node] = rule(newTokens);

				//Rule didn't match
				if (lengthDifference === 0 && node === null) continue;

				//Rule did match, update newTokens and append node to program
				newTokens = newTokens.slice(lengthDifference);
				program.addNode(node);

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