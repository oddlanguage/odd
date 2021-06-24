export type Token = Readonly<{
	type: string;
	lexeme: string;
}>;

type RuleBase = Readonly<{
	type: string;
	ignore?: boolean;
	when?: string;
	then?: string;
}>;

type SimpleRule = RuleBase & Readonly<{
	pattern: string | RegExp;
}>;

type ComplexRule = RuleBase & Readonly<{
	start: string | RegExp;
	patterns?: string | RegExp;
	end?: string | RegExp;
}>;

type Rule = SimpleRule | ComplexRule;

type Rules = Rule[];

type Result = Token & Pick<Rule, "ignore">;

const didMatch = (match: Result | false | undefined): match is Result =>
	!!match;

const apply = <T extends (...args: any[]) => any>(...args: Parameters<T>) => (f: T) =>
	f(...args);

type Comparator<T> = (a: T, b: T) => -1 | 0 | 1;

const compare = <T>(a: T, b: T) =>
	(a > b) ? 1 : (a === b) ? 0 : -1;

const compareBy = <T>(f: (item: T) => number) => (a: T, b: T) =>
	compare(f(a), f(b));

const largest = <T>(comparator: Comparator<T>) => (a: T, b: T) =>
	(comparator(a, b) >= 0) ? a : b;

const isComplex = (rule: any): rule is ComplexRule =>
	rule.start !== undefined;

const lexer = (rules: Rules) => {
	const patterns = rules.map((rule) => (input: string): Result | false | undefined => {
		if (isComplex(rule)) {
			throw "No implemented.";
		}

		const { type, pattern, ignore } = rule;
		if (typeof pattern === "string")
			return input.startsWith(pattern) && { type, lexeme: pattern, ignore };

		const regex = new RegExp(`^(?:${pattern.source})`, pattern.flags.replace(/[gmys]/, ""));
		const lexeme = input.match(regex)?.[0];
		if (lexeme)
			return { type, lexeme, ignore };
	});

	const lex = (input: string): Token[] => {
		if (input.length === 0)
			return [];

		const longest = patterns
			.map(apply(input))
			.filter(didMatch)
			.reduce(
				largest(compareBy(item => item.lexeme.length)),
				{ type: "", lexeme: "" });

		if (longest.lexeme.length === 0)
			throw `Unknown character "${input.charAt(0)}".`;

		const { ignore, type, lexeme } = longest;
		return (ignore ? [] : [ { type, lexeme } ]).concat(lex(input.slice(lexeme.length)));
	};

	return lex;
};

export default lexer;