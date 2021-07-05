import { inspect } from "node:util";
import interpreter from "./interpreter.js";
import lexer from "./lexer.js";
import parser, { delimited, either, ignore, lexeme, node, oneOf, oneOrMore, optional, pair, rule, sequence, type, zeroOrMore } from "./parser.js";

inspect.styles = {
	string: "yellow",
	number: "magenta",
	bigint: "magenta",
	boolean: "magenta",
	symbol: "blue",
	undefined: "magenta",
	special: "blue",
	null: "magenta",
	date: "underline",
	regexp: "yellow",
	module: "underline"
};

export const print = <T>(x: T, options?: Readonly<{ max?: number; depth?: number; }>) =>
	(console.log((typeof x === "string") ? x : inspect(x, { colors: true, depth: options?.depth ?? Infinity, maxArrayLength: options?.max ?? Infinity })), x);

export const pipe = (...fs: ((...args: any[]) => any)[]) => (x: any) =>
	fs.reduce((y, f) => f(y), x);

const lex = lexer([
	{ type: "comment", pattern: /;;[^\n]+/, ignore: true },
	{ type: "whitespace", pattern: /\s+/, ignore: true },
	{ type: "operator", pattern: /[!@#$%^&*\-=+\\|:<>/?\.]+/ },
	{ type: "punctuation", pattern: /[,\[\]\{\}\(\);]/ },
	{ type: "number", pattern: /-?(?:\d+(?:,\d+)*(?:\.\d+(?:e\d+)?)?|(?:\.\d+(?:e\d+)?))/i },
	{ type: "string", pattern: /`[^`]+`/i },
	{ type: "constant", pattern: /true|false|nothing|infinity/ },
	{ type: "identifier", pattern: /[a-z]\w*(?:-\w+)*'*/i }
]);

const parse = parser({
	program: node("program")(
		pair(
			rule("statements"),
			optional(ignore(lexeme(";"))))),
	"statements": 
		delimited(
			ignore(lexeme(";")))(
			node("statement")(
				oneOf([
					rule("type-declaration"),
					/*rule("expression")*/]))),
	"type-declaration": node("type-declaration")(
		sequence([
			type("identifier"),
			zeroOrMore(rule("type-parameter")),
			ignore(lexeme("::")),
			rule("type")])),
	"type-parameter": node("type-parameter")(
		either(
			type("identifier"),
			sequence([
				ignore(lexeme("(")),
				rule("type"),
				type("identifier"),
				ignore(lexeme(")"))]))),
	"type": rule("type-function"),
	"type-function": either(
		node("type-function")(
			sequence([
				rule("type-union"),
				sequence([
					ignore(lexeme("->")),
					rule("type-function")])])),
		rule("type-union")),
	"type-union": either(
		node("type-union")(
			sequence([
				rule("type-intersection"),
				sequence([
					ignore(lexeme("|")),
					rule("type-union")])])),
		rule("type-intersection")),
	"type-intersection": either(
		node("type-intersection")(
			sequence([
				rule("type-application"),
				sequence([
					ignore(lexeme("&")),
					rule("type-intersection")])])),
		rule("type-application")),
	"type-application": either(
		node("type-application")(
			sequence([
				rule("type-literal"),
				rule("type-application")])),
		rule("type-literal")),
	"type-literal": oneOf([
		rule("literal"),
		rule("type-map"),
		rule("type-list"),
		sequence([
			ignore(lexeme("(")),
			rule("type"),
			ignore(lexeme(")"))])]),
	"literal": oneOf([
		type("identifier"),
		type("constant"),
		type("string"),
		type("number")]),
	"type-map": sequence([
		ignore(lexeme("{")),
		optional(delimited(ignore(lexeme(",")))(rule("type-map-field"))),
		ignore(lexeme("}"))]),
	"type-map-field": node("type-map-field")(
		sequence([
			rule("type-map-key"),
			ignore(lexeme("::")),
			rule("type")])),
	"type-map-key": oneOrMore(rule("literal")),
	"type-list": sequence([
		ignore(lexeme("[")),
		optional(delimited(ignore(lexeme(",")))(rule("type"))),
		ignore(lexeme("]"))])
});

const first = <T>(array: T[]): T | undefined =>
	array[0];

// TODO: Make a context type that can be linked against
// when an error occurs or smth.
const run = (context: string) => (...stages: ((...args: any[]) => any)[]) =>
	pipe(...stages);

const interpret = interpreter({
	"type-function": print
});

const odd = run
	("internal")
	(print, lex, parse, first, interpret);

odd(`
Rules :: List {
	type :: String,
	pattern :: String | Regex
};

Token :: {
	type :: String,
	lexeme :: String,
	location :: [ Number, Number ]
};

Lexer :: Rules -> String -> List Token;
`);