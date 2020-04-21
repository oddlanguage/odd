"use strict";

import Result from "./Result.js";
import Token from "../Lexer/Token.js";
import { enumerable } from "../util.js";

const types = enumerable({
	token: Symbol("token"),
	sequence: Symbol("sequence"),
	some: Symbol("some"),
	maybe: Symbol("maybe")
});

const prependArticle = object =>
	((/^[aeoui]/.test(object))
		? "an"
		: "a")
		+ " "
		+ object;

const peek = (state, rules, tokens) =>
	tokens[state.index] || Token.EOF;

// TODO: For every parser that could allow it, let their arguments
//	be either functions or strings, where a string X signifies lexeme(X)

export const type = expected =>
	(state, rules, tokens) => {
		const node = peek(state, rules, tokens);
		return (node.type !== expected)
			? Result.fail(`Expected ${prependArticle(expected)} at ${node.location}`)
			: (state.advance(), Result.success(types.token, [node]));
	};

export const lexeme = expected =>
	(state, rules, tokens) => {
		const node = peek(state, rules, tokens);
		return (node.lexeme !== expected)
			? Result.fail(`Expected "${expected}" at ${node.location}`)
			: (state.advance(), Result.success(types.token, [node]));
	};

export const options = (...parsers) =>
	(state, rules, tokens) => {
		const last = state.save();

		let result;
		for (const parser of parsers) {
			result = parser(state, rules, tokens);
			if (result.ok)
				return result;
			state.restore(last);
		}

		return result;
	};

export const sequence = (...parsers) =>
	(state, rules, tokens) => {
		const last = state.save();

		const results = [];
		for (const parser of parsers) {
			const result = parser(state, rules, tokens);
			if (!result.ok) {
				state.restore(last);
				return result;
			}
			results.push(result);
		}

		return Result.success(types.sequence, results);
	};

export const some = parser =>
	(state, rules, tokens) => {
		const results = [];

		while (true) {
			const last = state.save();
			const result = parser(state, rules, tokens);

			if (!result.ok) {
				state.restore(last);
				break;
			}

			results.push(result);
		}

		return Result.success(types.some, results);
	};

export const maybe = parser =>
	(state, rules, tokens) => {
		const last = state.save();
		const result = parser(state, rules, tokens);
		if (!result.ok)
			state.restore(last);
		return Result.success(types.maybe, (result.ok) ? [result] : []);
	};

export const many = parser =>
	(state, rules, tokens) => {
		const last = state.save();

		const result = some(parser)(state, rules, tokens);
		if (result.children.length == 0) {
			state.restore(last);
			result.ok = false;
		}

		return result;
	};

export const rule = name =>
	(state, rules, tokens) => {
		if (!rules.has(name))
			throw `Unknown subrule "${name}".`;

		const result = rules
			.get(name)
			.parser(state, rules, tokens);
		
		return (result.ok)
			? Result.success(name, [result])
			: result;
	};

export const label = (name, parser) =>
	(state, rules, tokens) =>
		parser(state, rules, tokens)
			.labeled(name);

export const delimited = (parser, delimiter) =>
	sequence(
		parser,
		some(
			sequence(
				delimiter,
				parser)));