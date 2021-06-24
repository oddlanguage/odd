import { performance } from "node:perf_hooks";
import { Token } from "./lexer.js";
import { print } from "./odd.js";

export type Leaf = Node | Token;

export type Node = Readonly<{
	type: string;
	children: Leaf[];
}>;

type State = Readonly<{
	grammar: Grammar;
	input: Token[];
	stack: Leaf[];
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
		stack: []
	});

	if (!result.ok)
		throw result.reason;

	if (result.input.length) {
		const peeked = peek(result);
		// DEBUG:
		print(result.stack);
		throw `Unexpected ${peeked?.type} "${peeked?.lexeme}".`;
	}

	return result.stack;
};

export default parser;

// ==== COMBINATORS ==============================

export const peek = (state: State): Token | undefined => state.input[0];

export const rule = (name: string) => (state: State) => {
	if (!state.grammar[name])
		throw `Unkown grammar rule "${name}".`;

	return state.grammar[name](state);
};

export const succeed = (stack: Leaf[]) => (input: Token[]) => (state: State): Success =>
	({ ...state, ok: true, stack, input });

export const eat = (n: number) => (state: State) =>
	succeed(state.stack.concat(state.input.slice(0, n)))(state.input.slice(n))(state);

export const fail = (reason: string) => (state: State): Failure =>
	({ ...state, ok: false, reason });

export const lexeme = (lexeme: string) => (state: State) => {
	const peeked = peek(state);
	return (peeked?.lexeme === lexeme)
		? eat(1)(state)
		: fail(`Expected "${lexeme}" but got "${peeked?.lexeme ?? "EOF"}".`)(state);
};

const prefixIndefiniteArticle = (thing?: string) => thing && `${/^[aeuioy]/.test(thing) ? "an" : "a"} ${thing}`;

export const type = (type: string) => (state: State) => {
	const peeked = peek(state);
	return (peeked?.type === type)
		? eat(1)(state)
		: fail(`Expected ${prefixIndefiniteArticle(type)} but got ${prefixIndefiniteArticle(peeked?.type) ?? "EOF"}.`)(state);
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

export const debug = (parser: Parser, options?: Readonly<{ label?: string; }>) => (state: State) => {
	if (options?.label)
		print(`Trying "${options?.label}":`);

	const before = performance.now();
	const result = parser(state);
	const elapsed = performance.now() - before;

	print({ before: state.stack, after: result.stack, elapsed });

	return result;
};

export const optional = (parser: Parser) => (state: State): Success => {
	const result = parser(state);
	return (result.ok)
		? result	
		: { ...state, ok: true };
};

/* TODO:
These combinators are LL(1). They cannot handle left-recursion.
A user can change their grammar to remove left recusrion as follows:

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
*/