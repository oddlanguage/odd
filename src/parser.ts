import { performance } from "node:perf_hooks";
import { stringify, Token } from "./lexer.js";
import {
	constant,
	Maybe,
	prefixIndefiniteArticle,
	print,
	range
} from "./utils.js";

export type Leaf = Node | Token;

export type Node = Readonly<{
	type: string;
	children: Leaf[];
}>;

type Offset = number;

type State = Readonly<{
	grammar: Grammar;
	input: Token[];
	stack: Leaf[];
	cache: Record<Offset, Record<keyof Grammar, Result>>;
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

// TODO: Make State and Parser polymorphic so it no longer
// has predefined in- and output types.
type Parser = (state: State) => Result;

type Grammar = Readonly<{
	program: (initalState: State) => Result;
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
		entrypoint: keyof G,
		construct: (make: typeof rule) => G
	) =>
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
 *   return succeed(1)(state);
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
	if (result.ok) return result.stack[0]!;
	// TODO: Smart errors with line and column, instead of just the ".reason"
	throw result.reason;
};

/** Returns a `Parser` that will yield the `Result` of
 * `name` in `Grammar`, if it exists in a given `State`.
 *
 * All `Result`s are cached in the `State`.
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

		if (!state.cache[state.offset])
			state.cache[state.offset] = {};

		return (state.cache[state.offset]![name] ??=
			state.grammar[name]!(state));
	};

/** A `Parser` that, given a number `n`, will return a
 * `Success` with `n` items moved from `State.input`
 * to `Success.stack`.
 *
 * Calling `succeed` on a `State` with an empty `input`
 * will only enforce the type to change from `State` to `Success`.
 *
 * Example:
 *
 * ```ts
 * succeed(1)({
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
 * succeed(1)({
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
export const succeed =
	(n: number) =>
	(state: State): Success =>
		state.input.length === 0
			? { ...state, ok: true }
			: {
					...state,
					ok: true,
					stack: state.stack.concat(
						state.input.slice(0, n)
					),
					input: state.input.slice(n),
					offset: state.offset + n
			  };

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
				? succeed(1)
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
				? succeed(1)
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

/** TODO: Short explanation
 *
 * Example:
 *
 * ```ts
 * // TODO: code showing a simple usage
 * ```
 */
export const benchmark =
	(parser: Parser) => (state: State) => {
		const before = performance.now();
		parser(state);
		return performance.now() - before;
	};

type DebugOptions = Readonly<{
	label: string;
	elapsed: boolean;
	stack: boolean;
	cache: boolean;
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
		const info: Record<string, any> = {};

		if (options?.label) info.label = options.label;

		if (options?.elapsed) {
			const elapsed = benchmark(parser)(state);
			info.elapsed = elapsed;
		}

		const result = parser(state);

		if (options?.stack) info.stack = result.stack;

		if (options?.cache) info.cache = result.cache;

		if (Object.keys(info).length) print(info);

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

	return peeked
		? { ...state, ok: true }
		: {
				...state,
				ok: false,
				reason: `Expected anything but got nothing.`
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
export const describe =
	(description: string) =>
	(parser: Parser) =>
	(state: State): Result => {
		const result = parser(state);
		return result.ok
			? result
			: {
					...result,
					reason: `Expected ${description} but got ${stringify(
						peek(state)
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

/** Fold a sequence of parsed leaves into a single `node` of type `type` repeatedly, from the left.
 *
 * Can be used to format flat lists of matches into nodes as if they were left-associative.
 *
 * Example:
 *
 * ```ts
 * const lex = lexer([
 *   { type: "id", pattern: /\w+/ },
 *   { type: "ws", pattern: /\s+/, ignore: true }
 * ])
 *
 * const parse = parser({
 *   program: nodeLeft("app")(nOrMore(2)(type("id")))
 * });
 *
 * console.log(parse(lex("a b c")));
 * // [ { type: 'app',
 * //     children:
 * //      [ { type: 'app',
 * //          children:
 * //           [ { type: 'id', lexeme: 'a', location: { line: 1, char: 1 } },
 * //             { type: 'id', lexeme: 'b', location: { line: 1, char: 3 } } ] },
 * //        { type: 'id', lexeme: 'c', location: { line: 1, char: 5 } } ] } ]
 * ```
 */
export const nodeLeft = (type: string) =>
	map(parsed =>
		parsed
			.slice(0, -1)
			.reduce(
				stack => [
					{ type, children: stack.slice(0, 2) },
					...stack.slice(2)
				],
				parsed
			)
	);

/* TODO:
These combinators are LL(1). They cannot handle left-recursion.
A user can change their grammar to remove left recursion as follows:

add = exp "+" exp;
sub = exp "-" exp;
exp = add | sub | .number;

with left recursion eliminated:

exp-tail = add-tail | sub-tail;
add-tail = "+" exp;
sub-tail = "-" exp;
exp = .number exp-tail?

Create an algorithm that recognises left-recursion
(can we detect indirect recursion as well?)
And internally rewrite left-recursive rules to non left recursive rules.
Afterwards, the resulting parse tree must be transformed to the
actually provided grammar structure:

{
	type: exp
	children: [
		.number
		{
			type: add-tail
			children: [
				"+"
				.number
			]
		}
	]
}

should be transformed back to

{
	type: add
	children: [
		.number
		.number
	]
}

If we continue the parser-generator metalanguage approach,
we can just rewrite the grammar on a meta-level, preventing
the need to rewrite the constructed tree.

Furthermore, it is very common for a parser to
handle operator precedence.
We should decide wether a user should just use the
grammar constructs to implement precedence climbing,
or wether we should provide a mechanism for declaring
operator fixity and precendence and construct an
algorithm (pratt?) for it.
*/
