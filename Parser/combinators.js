"use strict";

import Result from "./Result.js";
import Token from "../Lexer/Token.js";
import { enumerable } from "../util.js";

// TODO: Update parsers to work with a better model,
// take inspitation from this article:
// https://medium.com/@JosephJnk/building-a-functional-parsing-library-in-javascript-and-flow-7d738088237f

const types = enumerable({
	token: Symbol("token"),
	sequence: Symbol("sequence"),
	some: Symbol("some"),
	many: Symbol("many"),
	maybe: Symbol("maybe")
});

const prependArticle = object =>
	((/^[aeoui]/i.test(object))
		? "an"
		: "a")
		+ " "
		+ object;

// TODO: Peek shouldn't be in here.
const peek = (state, rules, tokens) =>
	tokens[state.index] || Token.EOF;

// TODO: For every parser that could allow it, let their arguments
//	be either functions or strings, where a string X signifies lexeme(X)

const fail = (expected, node) =>
	Result.fail(`Expected ${prependArticle(expected)} at ${node.location}`);

const success = (type, values, state) =>
	(state.advance(), Result.success(type, values));

const satisfy = (got, transformer, expected, state) =>
	(transformer(got) === expected)
		? success(types.token, [got], state)
		: fail(expected, got);

export const type = expected =>
	(state, rules, tokens) =>
		satisfy(
			peek(state, rules, tokens),
			node => node.type,
			expected,
			state);

export const lexeme = expected =>
	(state, rules, tokens) =>
		satisfy(
			peek(state, rules, tokens),
			node => node.lexeme,
			expected,
			state);

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
		if (result.children.length === 0) {
			state.restore(last);
			result.ok = false;
		}

		result.type = types.many;
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