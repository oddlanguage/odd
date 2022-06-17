import { performance } from "node:perf_hooks";
import { stringify, Token } from "./lexer.js";
import { isNode } from "./tree.js";
import {
	constant,
	formatBytes,
	log,
	Maybe,
	prefixIndefiniteArticle,
	range
} from "./utils.js";

export type Leaf = Node | Token;

export type Node = Readonly<{
	type: string;
	children: Leaf[];
}>;

type Offset = number;

// TODO: Change input type to string and output type to T extends Leaf
type State = Readonly<{
	grammar: Grammar;
	input: Token[];
	stack: Leaf[];
	cache: Record<string, Record<Offset, Result>>;
	offset: Offset;
}>;

type Success = State &
	Readonly<{
		ok: true;
	}>;

type Failure = State &
	Readonly<{
		ok: false;
		reason: string;
	}>;

type Result = Success | Failure;

type Parser = (state: State) => Result;

type Grammar = Readonly<{
	[key: string]: Parser;
}>;

export const done = (result: Result) =>
	result.ok && result.input.length === 0;

/** TODO: Short explanation
 *
 * Example:
 *
 * ```ts
 * // TODO: code showing a simple usage
 * ```
 */
const parser =
	<G extends Grammar>(
		construct: (make: typeof rule) => G
	) =>
	(entrypoint: keyof G) =>
	(input: Token[]) => {
		const grammar = construct(rule);
		return grammar[entrypoint]!({
			input,
			grammar,
			stack: [],
			cache: {},
			offset: 0
		});
	};

export default parser;

// ==== COMBINATORS ==============================

/** Returns the next token in the `State.input`.
 *
 * If `State.input` is empty, this will return `undefined`.
 *
 * Example:
 *
 * ```ts
 * const anything = (state: State) => {
 *   const next = peek(state);
 *
 *   if (!next)
 *     return fail("Expected anything but got nothing.")(state);
 *
 *   return consume(1)(state);
 * }
 * ```
 */
export const peek = (state: State): Maybe<Token> =>
	state.input[0];

/** Returns the first item in the `stack` of a given `Result`,
 * which, given a `Success`, will be a full parse tree. If
 * you try to `unpack` a `Failure`, this function will throw
 * the error with which the `Failure` failed parsing.
 */
export const unpack = (
	result: Result
): Result["stack"][0] => {
	if (result.input.length !== 0) {
		const offsets = Object.values(result.cache).reduce(
			(acc, cur) => ({ ...acc, ...cur })
		);
		const furthest = Object.entries(offsets)
			.filter(([_, { ok }]) => !ok)
			.reduce((furthest, current) =>
				parseInt(current[0]) > parseInt(furthest[0])
					? current
					: furthest
			) as [string, Failure];
		const [rule] = Object.entries(result.cache).find(
			([_, results]) => furthest[0] in results
		)!;
		const { reason, input } = furthest[1];
		const peeked = peek(furthest[1])!;

		throw {
			type: "ParseError",
			reason: `Got stuck trying to parse ${prefixIndefiniteArticle(
				rule
			)}; ${reason}`,
			offset: input[0]!.offset,
			size: peeked.lexeme.length
		};
	}

	if (!result.ok) {
		const peeked = peek(result)!;
		throw {
			type: "ParseError",
			reason: result.reason,
			offset: peeked.offset,
			size: peeked.lexeme.length
		};
	}

	return result.stack[0]!;
};

/** TODO: Write docs */
const memoise =
	(key: keyof State["cache"]) =>
	(parser: Parser) =>
	(state: State): Result => {
		// TODO: This might be sped up by using a global cache?
		// I feel like this causes a lot of misses since the cache
		// is shared between several instances...
		if (state.cache[key]?.[state.offset])
			return state.cache[key]![state.offset]!;

		const result = parser(state);
		result.cache[key] ??= {};
		result.cache[key]![state.offset] = result;
		return result;
	};

/** Returns a `Parser` that will yield the `Result` of
 * `name` in `Grammar`, if it exists in a given `State`.
 *
 * All `Result`s are automatically memoised.
 *
 * Example:
 *
 * ```ts
 * // Assume a lexer `lex`.
 *
 * const parse = parser({
 *   "a": node("a")(rule("b")),
 *   "b": oneOrMore(type("b"))
 * });
 *
 * // Assume a valid state.
 * parse(state);
 * // > {
 * // >   type: "a",
 * // >   children: [
 * // >     { type: "b", ... },
 * // >     { type: "b", ... },
 * // >     { type: "b", ... }
 * // >   ]
 * // > }
 *
 * TODO: // Assume an invalid state.
 * ```
 */
const rule =
	(name: keyof Grammar) => (state: State) => {
		// NOTE that `rule` is explicitly NOT exported, it must be
		// recieved from a parser.

		if (!state.grammar[name])
			throw `Unknown grammar rule "${name}".`;

		return memoise(name as string)(
			state.grammar[name]!
		)(state);
	};

/** A `Parser` that, given one or more `Leaf`s, will add them
 * to the _stack_.
 *
 * TODO: Example
 */
export const succeed =
	(value: Leaf | Leaf[]) =>
	(state: State): Success => ({
		...state,
		ok: true,
		stack: state.stack.concat(value)
	});

/** A `Parser` that, given a number `n`, will return a
 * `Success` with `n` items moved from `State.input`
 * to `Success.stack`.
 *
 * Calling `consume` on a `State` with an empty `input`
 * will only enforce the type to change from `State` to `Success`.
 *
 * Example:
 *
 * ```ts
 * consume(1)({
 *   ...
 *   input: [ { type: "a", lexeme: "a", offset: 0 } ],
 *   stack: []
 *   ...
 * });
 * // > {
 * // >   ...
 * // >   ok: true,
 * // >   input: [],
 * // >   stack: [ { type: "a", lexeme: "a", offset: 0 } ]
 * // >   ...
 * // > }
 *
 * consume(1)({
 *   ...
 *   ok: false,
 *   input: [],
 *   stack: [],
 *   ...
 * });
 * // > {
 * // >   ...
 * // >   ok: true,
 * // >   input: [],
 * // >   stack: [],
 * // >   ...
 * // > }
 * ```
 */
export const consume =
	(n: number) =>
	(state: State): Success => ({
		...succeed(state.input.slice(0, n))(state),
		input: state.input.slice(n),
		offset: state.offset + n
	});

/** A `Parser` that, given a `reason`, will return a `Failure`
 * where `Failure.reason` is set to `reason`.
 *
 * Calling `fail` on a `State` that already is a `Failure` will
 * "overwrite" that `State`'s `reason` property.
 *
 * Example:
 *
 * ```ts
 * const trap = fail("You have activated my trap card!");
 *
 * // Assume some state
 * trap(state);
 * // > {
 * // >   ...
 * // >   ok: false,
 * // >   reason: "You have activated my trap card!"
 * // >   ...
 * // > }
 * ```
 */
export const fail =
	(reason: string) =>
	(state: State): Failure => ({
		...state,
		ok: false,
		reason
	});

/** A `Parser` that, given a `lexeme`, returns a `Success` or a `Failure` depending
 * on whether the next token in `State.input` has a lexeme that is
 * equal to `lexeme`.
 *
 * Example:
 *
 * ```ts
 * const ifStatement =
 *   node("ifStatement")(
 *     sequence([
 *       lexeme("if"),
 *       lexeme("a"),
 *       lexeme("then"),
 *       lexeme("b"),
 *       lexeme("else"),
 *       lexeme("c"))]);
 *
 * // Assume a valid state
 * ifStatement(state).stack[0];
 * // > {
 * // >   type: "ifStatement",
 * // >   children: [
 * // >     { lexeme: "if"   ... },
 * // >     { lexeme: "a"    ... },
 * // >     { lexeme: "then" ... },
 * // >     { lexeme: "b"    ... },
 * // >     { lexeme: "else" ... },
 * // >     { lexeme: "c"    ... }
 * // >   ]
 * // > }
 *
 * // Assume an invalid state
 * ifStatement(state);
 * // > {
 * // >   ...
 * // >   ok: false,
 * // >   stack: [ { lexeme: "if" ... } ],
 * // >   input: [ { lexeme: "b" ... } ... ],
 * // >   reason: "Expected 'a' but got 'b'.",
 * // >   ...
 * // > }
 * ```
 */
export const lexeme =
	(lexeme: string) => (state: State) => {
		const peeked = peek(state);
		return (
			peeked?.lexeme === lexeme
				? consume(1)
				: fail(
						`Expected "${lexeme}" but got ${stringify(
							peeked
						)}.`
				  )
		)(state);
	};

/** A `Parser` that, given a `type`, returns a `Success` or a `Failure` depending
 * on whether the next token in `State.input` has a type that is
 * equal to `type`.
 *
 * Example:
 *
 * ```ts
 * const ifStatement =
 *   node("ifStatement")(
 *     sequence([
 *       type("if"),
 *       type("a"),
 *       type("then"),
 *       type("b"),
 *       type("else"),
 *       type("c"))]);
 *
 * // Assume a valid state
 * ifStatement(state).stack[0];
 * // > {
 * // >   type: "ifStatement",
 * // >   children: [
 * // >     { type: "if"   ... },
 * // >     { type: "a"    ... },
 * // >     { type: "then" ... },
 * // >     { type: "b"    ... },
 * // >     { type: "else" ... },
 * // >     { type: "c"    ... }
 * // >   ]
 * // > }
 *
 * // Assume an invalid state
 * ifStatement(state);
 * // > {
 * // >   ...
 * // >   ok: false,
 * // >   stack: [ { type: "if" ... } ],
 * // >   input: [ { type: "b" ... } ... ],
 * // >   reason: "Expected an 'a' but got a 'b'.",
 * // >   ...
 * // > }
 * ```
 */
export const type =
	(type: string) => (state: State) => {
		const peeked = peek(state);
		return (
			peeked?.type === type
				? consume(1)
				: fail(
						`Expected ${prefixIndefiniteArticle(
							type
						)} but got ${stringify(peeked)}.`
				  )
		)(state);
	};

/** A `Parser` that, given two `Parser`s `a` and `b`, will
 * yield the `Result` of `b(a(state))`, unless `a` fails, in which
 * case it will yield the `Failure` from `a`.
 *
 * Example:
 *
 * ```ts
 * const aAndB = node("aAndB")(
 *   pair(
 *     lexeme("a"),
 *     lexeme("b")));
 *
 * // Assume a valid state
 * aAndB(state).stack[0];
 * // > {
 * // >   type: "aAndB",
 * // >   children: [
 * // >     { lexeme: "a" ... },
 * // >     { lexeme: "b" ... }
 * // >   ]
 * // > }
 *
 * // Assume an invalid state
 * aAndB(state);
 * // > {
 * // >   ...
 * // >   ok: false,
 * // >   stack: [ { lexeme: "a" ... } ],
 * // >   input: [ { lexeme: "c" ... } ],
 * // >   reason: "Expected 'b' but got 'c'.",
 * // >   ...
 * // > }
 * ```
 */
export const pair =
	(a: Parser, b: Parser) => (state: State) => {
		const result = a(state);
		return result.ok ? b(result) : result;
	};

/** A `Parser` that, given some `parsers` `a, b, ..., x`,
 * will yield the `Result` of calling `x(...(b(a(state))))`,
 * or the `Result` of the first `Parser` that fails.
 *
 * Example:
 *
 * ```ts
 * // TODO: code showing a simple usage
 * ```
 */
export const sequence = (parsers: Parser[]) =>
	parsers.reduce(pair);

/** TODO: Short explanation
 *
 * Example:
 *
 * ```ts
 * // TODO: code showing a simple usage
 * ```
 */
export const either =
	(a: Parser, b: Parser) => (state: State) => {
		const result = a(state);
		return result.ok ? result : b(state);
	};

/** TODO: Short explanation
 *
 * Example:
 *
 * ```ts
 * // TODO: code showing a simple usage
 * ```
 */
export const oneOf = (parsers: Parser[]) =>
	parsers.reduce(either);

/** TODO: Short explanation
 *
 * Example:
 *
 * ```ts
 * // TODO: code showing a simple usage
 * ```
 */
export const node =
	(type: string) =>
	(parser: Parser) =>
	(state: State): Result => {
		const result = parser(state);

		if (!result.ok) return result;

		const diff =
			state.stack.length - result.stack.length;
		return diff === 0
			? {
					...result,
					stack: result.stack.concat({
						type,
						children: []
					})
			  }
			: {
					...result,
					stack: result.stack.slice(0, diff).concat({
						type,
						children: result.stack.slice(diff)
					})
			  };
	};

/** TODO: Short explanation
 *
 * Example:
 *
 * ```ts
 * // TODO: code showing a simple usage
 * ```
 */
export const zeroOrMore =
	(parser: Parser) =>
	(state: State): Success => {
		let result = parser(state);

		if (!result.ok) return { ...state, ok: true };

		let previous = result;
		while (true) {
			[previous, result] = [result, parser(previous)];
			if (!result.ok) break;
		}

		return previous;
	};

/** TODO: Short explanation
 *
 * Example:
 *
 * ```ts
 * // TODO: code showing a simple usage
 * ```
 */
export const nOrMore =
	(n: number) => (parser: Parser) =>
		sequence(
			range(n)
				.map(constant(parser))
				.concat(zeroOrMore(parser))
		);

/** TODO: Short explanation
 *
 * Example:
 *
 * ```ts
 * // TODO: code showing a simple usage
 * ```
 */
export const oneOrMore = nOrMore(1);

/** TODO: Short explanation
 *
 * Example:
 *
 * ```ts
 * // TODO: code showing a simple usage
 * ```
 */
export const delimited =
	(delimiter: Parser) => (parser: Parser) =>
		pair(parser, zeroOrMore(pair(delimiter, parser)));

/** TODO: Short explanation
 *
 * Example:
 *
 * ```ts
 * // TODO: code showing a simple usage
 * ```
 */
export const ignore =
	(parser: Parser) => (state: State) => {
		const result = parser(state);

		if (!result.ok) return result;

		return { ...result, stack: state.stack };
	};

/** TODO: Short explanation
 *
 * Example:
 *
 * ```ts
 * // TODO: code showing a simple usage
 * ```
 */
export const optional =
	(parser: Parser) =>
	(state: State): Success => {
		const result = parser(state);
		return result.ok ? result : { ...state, ok: true };
	};

/** Run a `Parser`, keeping track of the time it took to run and its
 * memory usage.
 *
 * Keep in mind that memoised parsers will skew results significantly
 * if averaged over several runs. TODO: Implement "count" parameter.
 *
 * Example:
 *
 * ```ts
 * // TODO: code showing a simple usage
 * ```
 */
export const benchmark =
	(parser: Parser) => (state: State) => {
		const heap = process.memoryUsage().heapUsed;
		const now = performance.now();
		const result = parser(state);
		const elapsed = performance.now() - now;
		const consumed =
			process.memoryUsage().heapUsed - heap;
		return [
			result,
			formatBytes(consumed),
			`${elapsed.toFixed(2)} ms`
		] as const;
	};

type DebugOptions = Readonly<{
	label: string;
	elapsed: boolean;
	stack: boolean;
	cache: boolean;
	memory: boolean;
}>;

/** TODO: Short explanation
 *
 * Example:
 *
 * ```ts
 * // TODO: code showing a simple usage
 * ```
 */
export const debug =
	(parser: Parser, options?: Partial<DebugOptions>) =>
	(state: State) => {
		const [result, memory, elapsed] =
			benchmark(parser)(state);

		const info: Record<string, any> = {};

		if (options?.label) info.label = options.label;

		if (options?.elapsed) info.elapsed = elapsed;

		if (options?.stack) info.stack = result.stack;

		if (options?.cache) info.cache = result.cache;

		if (options?.memory) info.memory = memory;

		if (Object.keys(info).length) log(info);

		return result;
	};

/** TODO: Short explanation
 *
 * Example:
 *
 * ```ts
 * // TODO: code showing a simple usage
 * ```
 */
export const nothing = (state: State): Result => {
	const peeked = peek(state);

	return !peeked
		? { ...state, ok: true }
		: {
				...state,
				ok: false,
				reason: `Expected nothing but got ${stringify(
					peeked
				)}.`
		  };
};

/** TODO: Short explanation
 *
 * Example:
 *
 * ```ts
 * // TODO: code showing a simple usage
 * ```
 */
export const anything = (state: State): Result => {
	const peeked = peek(state);

	return (
		peeked
			? consume(1)
			: fail("Expected anything but got nothing.")
	)(state);
};

/** TODO: Short explanation
 *
 * Example:
 *
 * ```ts
 * // TODO: code showing a simple usage
 * ```
 */
export const wrap =
	(start: Parser, end: Parser) => (parser: Parser) =>
		sequence([start, parser, end]);

/** TODO: Short explanation
 *
 * Example:
 *
 * ```ts
 * // TODO: code showing a simple usage
 * ```
 */
export const map =
	(f: (stack: State["stack"]) => State["stack"]) =>
	(parser: Parser) =>
	(state: State) => {
		const result = parser(state);
		const diff =
			state.stack.length - result.stack.length;
		return diff === 0
			? {
					...result,
					stack: result.stack.concat(f([]))
			  }
			: {
					...result,
					stack: result.stack
						.slice(0, diff)
						.concat(f(result.stack.slice(diff)))
			  };
	};

/** Fold a sequence of parsed `Leaf`s into a single `Node` through `f` repeatedly, from the left.
 *
 * Can be used to format flat lists of matches into nodes as if they were left-associative.
 *
 * Example:
 *
 * ```ts
 * const lex = lexer([
 *   { type: "identifier", pattern: /\w+/ },
 *   { type: "whitespace", pattern: /\s+/, ignore: true }
 * ])
 *
 * const parse = parser({
 *   program: fold(children => ({
 *     type: "application",
 *     children
 *   }))(nOrMore(2)(type("identifier")))
 * }, "program");
 *
 * console.log(parse(lex("a b c")));
 * // [ { type: 'application',
 * //     children:
 * //      [ { type: 'application',
 * //          children:
 * //           [ { type: 'identifier', lexeme: 'a', location: { line: 1, char: 1 } },
 * //             { type: 'identifier', lexeme: 'b', location: { line: 1, char: 3 } } ] },
 * //        { type: 'identifier', lexeme: 'c', location: { line: 1, char: 5 } } ] } ]
 * ```
 */
export const fold = (f: (stack: Leaf[]) => Node) =>
	map(parsed =>
		parsed
			.slice(0, -1)
			.reduce(
				stack => [
					f(stack.slice(0, 2)),
					...stack.slice(2)
				],
				parsed
			)
	);

/** Unfold a signle `Node` into a sequence of `Leaf`s through `f` repeatedly, from the left.
 *
 * Can be used to flatten deep parent-child structures into their constituents.
 *
 * TODO: Example
 */
export const unfold = map(parsed => {
	// TODO: This feels horribly over-complicated...
	if (!parsed[0] || !isNode(parsed[0])) return parsed;

	const type = parsed[0].type;
	let stack = parsed[0].children;
	let i = 1;
	while (
		stack[i] &&
		isNode(stack[i]!) &&
		(stack[i] as Node).type === type
	) {
		stack = [
			...stack.slice(0, i),
			...(stack[i] as Node).children,
			...stack.slice(i + 2)
		];
		i += 1;
	}

	return stack;
});
