import { performance } from "node:perf_hooks";
import { stringifyToken, Token } from "./lexer.js";
import { constant, prefixIndefiniteArticle, print, range } from "./utils.js";

export type Leaf = Node | Token;

export type Node = Readonly<{
	type: string;
	children: Leaf[];
}>;

type RuleName = string;

type Offset = number;

type State = Readonly<{
	grammar: Grammar;
	input: Token[];
	stack: Leaf[];
	cache: Record<Offset, Record<RuleName, Result>>;
	offset: Offset;
}>;

type Success = State & Readonly<{
	ok: true;
}>;

type Failure = State & Readonly<{
	ok: false;
	reason: string;
}>;

type Result = Success | Failure;

// TODO: Make generically typed
type Parser = (state: State) => Result;

// TODO: require values to be a function with a single argument
// that is the instance of the grammar itself? How would we
// meaningfully type that?
type Grammar = Readonly<{
	program: (initalState: State) => Result;
	[key: string]: Parser;
}>;

/** TODO: Short explanation
 * 
 * Example:
 * 
 * ```ts
 * // code showing a simple usage
 * ```
*/
const parser = (grammar: Grammar) => (input: Token[]) => {
	const result = grammar.program({
		input,
		grammar,
		stack: [],
		cache: {},
		offset: 0
	});

	if (!result.ok)
		throw result.reason;

	if (result.input.length)
		throw `Unexpected ${stringifyToken(peek(result))}.`;

	return result.stack;
};

export default parser;

// ==== COMBINATORS ==============================

/** TODO: Short explanation
 * 
 * Example:
 * 
 * ```ts
 * // code showing a simple usage
 * ```
*/
export const peek = (state: State): Token | undefined => state.input[0];

/** TODO: Short explanation
 * 
 * Example:
 * 
 * ```ts
 * // code showing a simple usage
 * ```
*/
export const rule = (name: RuleName) => (state: State) => {
	if (!state.grammar[name])
		throw `Unknown grammar rule "${name}".`;

	return (state.cache[state.offset] ??= {})[name] ??= state.grammar[name](state);
};

/** TODO: Short explanation
 * 
 * Example:
 * 
 * ```ts
 * // code showing a simple usage
 * ```
*/
export const succeed = (consumed: number) => (state: State): Success =>
	({
		...state,
		ok: true,
		stack: state.stack.concat(state.input.slice(0, consumed)),
		input: state.input.slice(consumed),
		offset: state.offset + consumed
	});

/** TODO: Short explanation
 * 
 * Example:
 * 
 * ```ts
 * // code showing a simple usage
 * ```
*/
export const fail = (reason: string) => (state: State): Failure =>
	({ ...state, ok: false, reason });

/** TODO: Short explanation
 * 
 * Example:
 * 
 * ```ts
 * // code showing a simple usage
 * ```
*/
export const lexeme = (lexeme: string) => (state: State) => {
	const peeked = peek(state);
	return ((peeked?.lexeme === lexeme)
		? succeed(1)
		: fail(`Expected "${lexeme}" but got ${stringifyToken(peeked)}.`))
		(state);
};

/** TODO: Short explanation
 * 
 * Example:
 * 
 * ```ts
 * // code showing a simple usage
 * ```
*/
export const type = (type: string) => (state: State) => {
	const peeked = peek(state);
	return ((peeked?.type === type)
		? succeed(1)
		: fail(`Expected ${prefixIndefiniteArticle(type)} but got ${stringifyToken(peeked)}.`))
		(state);
};

/** TODO: Short explanation
 * 
 * Example:
 * 
 * ```ts
 * // code showing a simple usage
 * ```
*/
export const pair = (a: Parser, b: Parser) => (state: State) => {
	const result = a(state);
	return (result.ok)
		? b(result)
		: result;
};

/** TODO: Short explanation
 * 
 * Example:
 * 
 * ```ts
 * // code showing a simple usage
 * ```
*/
export const sequence = (parsers: Parser[]) =>
	parsers.reduce(pair);

/** TODO: Short explanation
 * 
 * Example:
 * 
 * ```ts
 * // code showing a simple usage
 * ```
*/
export const either = (a: Parser, b: Parser) => (state: State) => {
	const result = a(state);
	return (result.ok)
		? result
		: b(state);
};

/** TODO: Short explanation
 * 
 * Example:
 * 
 * ```ts
 * // code showing a simple usage
 * ```
*/
export const oneOf = (parsers: Parser[]) =>
	parsers.reduce(either);

/** TODO: Short explanation
 * 
 * Example:
 * 
 * ```ts
 * // code showing a simple usage
 * ```
*/
export const node = (type: string) => (parser: Parser) => (state: State): Result => {
	const result = parser(state);

	if (!result.ok)
		return result;

	const diff = state.stack.length - result.stack.length;
	return (diff === 0)
		? { ...result, stack: result.stack.concat({ type, children: [] }) }
		: { ...result, stack: result.stack.slice(0, diff).concat({ type, children: result.stack.slice(diff) }) };
};

/** TODO: Short explanation
 * 
 * Example:
 * 
 * ```ts
 * // code showing a simple usage
 * ```
*/
export const zeroOrMore = (parser: Parser) => (state: State): Success => {
	let result = parser(state);

	if (!result.ok) return { ...state, ok: true };

	let previous = result;
	while (true) {
		[ previous, result ] = [ result, parser(previous) ];
		if (!result.ok) break;
	}

	return previous;
};

/** TODO: Short explanation
 * 
 * Example:
 * 
 * ```ts
 * // code showing a simple usage
 * ```
*/
export const nOrMore = (n: number) => (parser: Parser) =>
	sequence(range(n).map(constant(parser)).concat(zeroOrMore(parser)));

/** TODO: Short explanation
 * 
 * Example:
 * 
 * ```ts
 * // code showing a simple usage
 * ```
*/
export const oneOrMore = nOrMore(1);

/** TODO: Short explanation
 * 
 * Example:
 * 
 * ```ts
 * // code showing a simple usage
 * ```
*/
export const delimited = (delimiter: Parser) => (parser: Parser) =>
	pair(parser, zeroOrMore(pair(delimiter, parser)));

/** TODO: Short explanation
 * 
 * Example:
 * 
 * ```ts
 * // code showing a simple usage
 * ```
*/
export const ignore = (parser: Parser) => (state: State) => {
	const result = parser(state);

	if (!result.ok)
		return result;

	return { ...result, stack: state.stack };
};

/** TODO: Short explanation
 * 
 * Example:
 * 
 * ```ts
 * // code showing a simple usage
 * ```
*/
export const optional = (parser: Parser) => (state: State): Success => {
	const result = parser(state);
	return (result.ok)
		? result	
		: { ...state, ok: true };
};

/** TODO: Short explanation
 * 
 * Example:
 * 
 * ```ts
 * // code showing a simple usage
 * ```
*/
export const benchmark = (parser: Parser) => (state: State) => {
	const before = performance.now();
	const result = parser(state);
	return [ performance.now() - before, result ] as const;
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
 * // code showing a simple usage
 * ```
*/
export const debug = (parser: Parser, options?: Partial<DebugOptions>) => (state: State) => {
	const [ elapsed, result ] = benchmark(parser)(state);

	const info: Record<string, any> = {};

	if (options?.label)
		info.label = options.label;

	if (options?.elapsed ?? true)
		info.elapsed = elapsed;

	if (options?.stack)
		info.stack = result.stack;

	if (options?.cache)
		info.cache = result.cache;

	print(info);

	return result;
};

/** TODO: Short explanation
 * 
 * Example:
 * 
 * ```ts
 * // code showing a simple usage
 * ```
*/
export const nothing = (state: State): Result => {
	const peeked = peek(state);

	return (!peeked)
		? { ...state, ok: true }
		: { ...state, ok: false, reason: `Expected nothing but got ${stringifyToken(peeked)}.` };
}

/** TODO: Short explanation
 * 
 * Example:
 * 
 * ```ts
 * // code showing a simple usage
 * ```
*/
export const anything = (state: State): Result => {
	const peeked = peek(state);

	return (peeked)
		? { ...state, ok: true }
		: { ...state, ok: false, reason: `Expected anything but got nothing.` };
}

/** TODO: Short explanation
 * 
 * Example:
 * 
 * ```ts
 * // code showing a simple usage
 * ```
*/
export const wrap = (start: Parser, end: Parser) => (parser: Parser) =>
	sequence([start, parser, end]);

/** TODO: Short explanation
 * 
 * Example:
 * 
 * ```ts
 * // code showing a simple usage
 * ```
*/
export const describe = (description: string) => (parser: Parser) => (state: State): Result => {
	const result = parser(state);
	return (result.ok)
		? result
		: { ...result, reason: `Expected ${description} but got ${stringifyToken(peek(state))}.` };
};

/** TODO: Short explanation
 * 
 * Example:
 * 
 * ```ts
 * // code showing a simple usage
 * ```
*/
export const map = (f: (stack: State["stack"]) => State["stack"]) => (parser: Parser) => (state: State) => {
	const result = parser(state);
	const diff = state.stack.length - result.stack.length;
	return (diff === 0)
		? { ...result, stack: result.stack.concat(f([])) }
		: { ...result, stack: result.stack.slice(0, diff).concat(f(result.stack.slice(diff))) };
};

/** Fold a sequence of parsed leaves into a single node of type `type` repeatedly, from the left.
 * 
 * Can be used to recognise left-associative rules.
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
 *   program: foldSeqL("app")(nOrMore(2)(type("id")))
 * });
 * 
 * console.log(parse(lex("curried(argA)(argB)")));
 * // [ { type: 'app',
 * //     children:
 * //      [ { type: 'app',
 * //          children:
 * //           [ { type: 'id', lexeme: 'a', location: { line: 1, char: 1 } },
 * //             { type: 'id', lexeme: 'b', location: { line: 1, char: 3 } } ] },
 * //        { type: 'id', lexeme: 'c', location: { line: 1, char: 5 } } ] } ]
 * ```
*/
export const foldSeqL = (type: string) =>
	map(parsed => parsed.slice(0, -1).reduce(stack => [{ type, children: stack.slice(0, 2) }, ...stack.slice(2)], parsed));

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

Furthermore, it is very common for a parser to
handle operator precedence.
We should decide wether a user should just use the
grammar constructs to implement precedence climbing,
or wether we should provide a mechanism for declaring
operator fixity and precendence and construct a
pratt algorithm for it.
*/