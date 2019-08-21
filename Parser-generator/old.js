"use strict";
"hide implementation";

const DeferredMap = require("./DeferredMap.js");
const metaoddLexer = require("./metaoddLexer.js");
const Stack = require("./Stack.js");
const ParserMatch = require("./ParserMatch.js");

const SKIPPED = Symbol("SKIPPED");
module.exports = class Parser {
	static NO_MATCH = ParserMatch.NO_MATCH;
	static SKIP = n => new ParserMatch(n, SKIPPED);
	static BUILD_DEF = tokens => tokens;
	static BUILD_IGN = Function.prototype;

	constructor () {
		this._rules = new DeferredMap();
		this._definitions = new DeferredMap();
		this._ignorations = new DeferredMap();
	}

	freeze () {
		Object.freeze(this);
		for (const property of Object.getOwnPropertyNames(this))
			if (this[property] !== null
				&& ["object", "function"].includes(typeof this[property])
				&& !Object.isFrozen(this[property]))
					this[property].freeze();

		return this;
	}

	rule (metaLanguage) {
		const {name, production, builder} = this.__parseMetaLanguage(metaLanguage);
		const matcher = this.__buildMatcher({production, builder});
		this._rules.set(name, matcher);
		return this;
	}

	define (metaLanguage) {
		const {name, production} = this.__parseMetaLanguage(metaLanguage, {define: true});
		const matcher = this.__buildMatcher({production, builder: Parser.BUILD_DEF});
		this._definitions.set(name, matcher);
		return this;
	}

	ignore (metaLanguage) {
		const {name, production} = this.__parseMetaLanguage(metaLanguage, {ignore: true});
		const matcher = this.__buildMatcher({production, builder: Parser.BUILD_IGN, ignore: true});
		this._ignorations.set(name, matcher);
		return this;
	}

	__parseBuilder (tokens) {
		console.warn("ACTUALLY PARSE TOKENS");
		return Parser.BUILD_DEF;
	}

	__parseMetaLanguage (metaLanguage, {define = false, ignore = false} = {}) {
		const tokens = metaoddLexer.lex(metaLanguage);
		const name = tokens[0].lexeme;

		const arrowPos = tokens.findIndex(token => token.lexeme === "->");
		if (arrowPos === -1)
			throw `Error in rule "${name}": No assignment operator (->) found.`;

		const colonPos = tokens.findIndex(token => token.lexeme === ":");
		if (colonPos === -1 && !(define || ignore))
			throw `Error in rule "${name}": Missing builder function statement.`;

		const semiPos = tokens.findIndex(token => token.lexeme === ";");
		if (semiPos === -1)
			throw `Error in rule "${name}": No semicolon (;) found.`;

		const production = tokens.slice(arrowPos + 1, colonPos);
		const builder = this.__parseBuilder(tokens.slice(colonPos + 1, -1));

		if (name === null || name === undefined)
			throw `Malformed rule "": name is null or undefined.`;

		if (production === null || production === undefined)
			throw `Malformed rule "${name}": production is null or undefined.`;

		if ((builder === null || builder === undefined) && !(define || ignore))
			throw `Malformed rule "${name}": builder is null or undefined.`;

		return {name, production, builder};
	}

	__expect (tokens, production) {
		console.log("\nTOKENS:", tokens, "\n\nPRODUCTION:", production);
		const stack = [];
		let tokenOffset = 0;
		for (const expected of production) {
			const got = tokens[tokenOffset];
			switch (expected.type) {
				case "label": {
					const match = this.__expect(tokens.slice(tokenOffset), production.slice(1));
					if (match.isNothing())
						return Parser.NO_MATCH;
					tokenOffset += match.offset;
					stack.push(match.withName(tokens[tokenOffset].lexeme));
					continue;
				}
				case "not": {
					console.log("NOT ========================");
					const match = this.__expect(tokens.slice(tokenOffset), production.slice(1));
					if (!match.isNothing())
						return Parser.NO_MATCH;
					tokenOffset += match.offset;
					stack.push(Parser.SKIP(match.offset));
					continue;
				}
				case "lexeme": {
					console.log("TRYING LEXEME... =========================", production);
					if (got.lexeme !== expected.lexeme.slice(1, -1))
						return Parser.NO_MATCH;
					stack.push(got);
					tokenOffset += 1;
					continue;
				}
				case "type": {
					if (got.type !== expected.type)
						return Parser.NO_MATCH;
					stack.push(got);
					tokenOffset += 1;
					continue;
				}
				case "definition": {return Parser.NO_MATCH;}
				case "ignoration": {return Parser.NO_MATCH;}
				case "subrule": {return Parser.NO_MATCH;}
				case "open-paren": {return Parser.NO_MATCH;}
				default: throw `Unknown token type "${expected.type}".`;
			}
		}
		return new ParserMatch(tokenOffset, stack);
	}

	__buildMatcher ({production, builder, ignore}) {
		const options = new Stack([]);
		for (const token of production) {
			if (token.lexeme === "|") {
				options.push([]);
				continue;
			}
			options.last().push(token);
		}

		return tokens => {
			for (const option of options) {
				const match = this.__expect(tokens, option);

				if (match.isNothing())
					continue;
				
				if (ignore)
					return Parser.SKIP(match.offset);

				return match.build(builder);
			}
			return Parser.NO_MATCH;
		};
	}

	async parse (tokens) {
		const program = {type: "program", expressions: []};
		let offset = 0;
		while (offset < tokens.length) {
			const lastOffset = offset;

			for await (const matcher of this._rules.values()) {
				const match = matcher(tokens.slice(offset));

				if (match.isNothing())
					continue;
				
				offset += match.offset;
				program.expressions.push(match.value);
			}

			if (offset === lastOffset)
				throw `Cannot parse "${tokens[offset]}".`;
		}
	}
}