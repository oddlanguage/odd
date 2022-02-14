type Match = Readonly<{
	type: string;
	lexeme: string;
}>;

export type Token = Match &
	Readonly<{
		offset: number;
	}>;

type Pattern = string | RegExp;

type Rule = Readonly<{
	type: string;
	ignore?: boolean | undefined;
	pattern: Pattern;
}>;

type Result = Match & Pick<Rule, "ignore">;

type Falsy<T> = T | false | 0 | "" | null | undefined;

const ensureRegex = (pattern: Pattern) =>
	typeof pattern === "string"
		? new RegExp(`^(?:${pattern})`)
		: new RegExp(
				`^(?:${pattern.source})`,
				pattern.flags
		  );

// TODO: Should we allow {pattern} substitution in regexes?
const compile =
	(rule: Rule) =>
	(input: string): Falsy<Result> => {
		const match = input.match(
			ensureRegex(rule.pattern)
		)?.[0];
		return (
			match && {
				type: rule.type,
				lexeme: match,
				ignore: rule.ignore
			}
		);
	};

const applyTo =
	<T>(x: T) =>
	<U>(f: (x: T) => U) =>
		f(x);

const didMatch = (
	result: Falsy<Result>
): result is Result => !!result;

const biggestBy =
	<T>(f: (x: T) => number) =>
	(a: T, b: T) =>
		f(a) >= f(b) ? a : b;

export const stringify = (token: Falsy<Token>) =>
	token && `${token.type} "${token.lexeme}"`;

const lexer = (rules: Rule[]) => {
	const matchers = rules.map(compile);

	const lex = (input: string): Token[] => {
		const tokens: Token[] = [];
		let offset = 0;
		let eaten = 0;

		while ((input = input.slice(eaten)).length) {
			const matches = matchers
				.map(applyTo(input))
				.filter(didMatch);

			if (matches.length === 0)
				throw {
					offset,
					message: `Unknown lexeme "${input.charAt(
						0
					)}"`
				};

			const longest = matches.reduce(
				biggestBy(match => match.lexeme.length)
			);

			if (!longest.ignore) {
				tokens.push({
					type: longest.type,
					lexeme: longest.lexeme,
					offset
				});
			}

			eaten = longest.lexeme.length;
			offset += eaten;
		}

		return tokens;
	};

	return lex;
};

export default lexer;
