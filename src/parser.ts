import { performance } from "node:perf_hooks";
import { stringifyToken, Token } from "./lexer.js";
import { print } from "./odd.js";

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

type Parser = (state: State) => Result;

type Grammar = Readonly<{
	program: <T extends State>(initalState: T) => Result;
} & {
	[key: string]: Parser;
}>;

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

export const peek = (state: State): Token | undefined => state.input[0];

export const rule = (name: RuleName) => (state: State) => {
	if (!state.grammar[name])
		throw `Unknown grammar rule "${name}".`;

	print(`Trying "${name}"`);
	return (state.cache[state.offset] ??= {})[name] ??= state.grammar[name](state);
};

export const succeed = (consumed: number) => (state: State): Success =>
	({
		...state,
		ok: true,
		stack: state.stack.concat(print(state.input.slice(0, consumed))),
		input: state.input.slice(consumed),
		offset: state.offset + consumed
	});

export const fail = (reason: string) => (state: State): Failure =>
	({ ...state, ok: false, reason });

export const lexeme = (lexeme: string) => (state: State) => {
	const peeked = peek(state);
	return ((peeked?.lexeme === lexeme)
		? succeed(1)
		: fail(`Expected "${lexeme}" but got ${stringifyToken(peeked)}.`))
		(state);
};

const prefixIndefiniteArticle = (thing?: string) =>
	thing && `${/^[aeuioy]/.test(thing) ? "an" : "a"} ${thing}`;

export const type = (type: string) => (state: State) => {
	const peeked = peek(state);
	return ((peeked?.type === type)
		? succeed(1)
		: fail(`Expected ${prefixIndefiniteArticle(type)} but got ${stringifyToken(peeked)}.`))
		(state);
};

export const pair = (a: Parser, b: Parser) => (state: State) => {
	const result = a(state);
	return (result.ok)
		? b(result)
		: result;
};

export const sequence = (parsers: Parser[]) =>
	parsers.reduce(pair);

export const either = (a: Parser, b: Parser) => (state: State) => {
	const result = a(state);
	return (result.ok)
		? result
		: b(state);
};

export const oneOf = (parsers: Parser[]) =>
	parsers.reduce(either);

export const node = (type: string) => (parser: Parser) => (state: State): Result => {
	const result = parser(state);

	if (!result.ok)
		return result;

	const diff = state.stack.length - result.stack.length;
	return { ...result, stack: result.stack.slice(0, diff).concat({ type, children: result.stack.slice(diff) }) }
};

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

export const oneOrMore = (parser: Parser) =>
	pair(parser, zeroOrMore(parser));

export const delimited = (delimiter: Parser) => (parser: Parser) =>
	pair(parser, zeroOrMore(pair(delimiter, parser)));

export const ignore = (parser: Parser) => (state: State) => {
	const result = parser(state);

	if (!result.ok)
		return result;

	return { ...result, stack: state.stack };
};

export const optional = (parser: Parser) => (state: State): Success => {
	const result = parser(state);
	return (result.ok)
		? result	
		: { ...state, ok: true };
};

export const benchmark = (parser: Parser) => (state: State) => {
	const before = performance.now();
	const result = parser(state);
	return [ performance.now() - before, result ] as const;
};

type BenchmarkOptions = Readonly<{
	label: string;
	elapsed: boolean;
	stack: boolean;
	cache: boolean;
}>;

export const debug = (parser: Parser, options?: Partial<BenchmarkOptions>) => (state: State) => {
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