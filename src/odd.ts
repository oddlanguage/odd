import { inspect } from "node:util";
import lexer, { Token } from "./lexer.js";
import parser, { delimited, either, ignore, lexeme, Node, node, oneOf, oneOrMore, optional, pair, rule, sequence, type, zeroOrMore } from "./parser.js";
import { mapper } from "./tree.js";

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
	"type-map": node("type-map")(sequence([
		ignore(lexeme("{")),
		optional(delimited(ignore(lexeme(",")))(rule("type-map-field"))),
		ignore(lexeme("}"))])),
	"type-map-field": node("type-map-field")(sequence([
		rule("type-map-key"),
		ignore(lexeme("::")),
		rule("type")])),
	"type-map-key": oneOrMore(rule("literal")),
	"type-list": node("type-list")(sequence([
		ignore(lexeme("[")),
		optional(delimited(ignore(lexeme(",")))(rule("type"))),
		ignore(lexeme("]"))]))
});

const first = <T>(array: T[]): T | undefined =>
	array[0];

// TODO: Make a context type that can be linked against
// when an error occurs or smth.
const run = (context: string) => (...stages: ((...args: any[]) => any)[]) =>
	pipe(...stages);

const translations: Record<string, string> = {
	"List": "Array",
	"String": "string",
	"Number": "number",
	"Regex": "RegExp",
	"Boolean": "boolean",
	"nothing": "undefined",
};

const kebabToCamel = (identifier: string) =>
	identifier.replace(/-\w/g, ([_, x]) => x.toUpperCase());

const toTypescript = mapper({
	"program": (node: Node) => node.children.map(toTypescript).join("\n\n"),
	"statement": (node: Node) => `${toTypescript(node.children[0])};`,
	"type-declaration": (node: Node) => `type ${toTypescript(node.children[0])} = ${toTypescript(node.children[1])}`,
	"type-application": (node: Node) => `${toTypescript(node.children[0])}<${toTypescript(node.children[1])}>`,
	"type-union": (node: Node) => `(${toTypescript(node.children[0])} | ${toTypescript(node.children[1])})`,
	"type-intersection": (node: Node) => `(${toTypescript(node.children[0])} & ${toTypescript(node.children[1])})`,
	"type-map": (node: Node) => `{\n  ${node.children.map(toTypescript).join(";\n  ")};\n}`,
	"type-list": (node: Node) => `[ ${node.children.map(toTypescript).join(", ")} ]`,
	"type-function": (node: Node) => `((_: ${toTypescript(node.children[0])}) => ${toTypescript(node.children[1])})`,
	// TODO: function fields begin with `n` children
	"type-map-field": (node: Node) => `${toTypescript(node.children[0])}: ${toTypescript(node.children[1])}`,
	"identifier": (token: Token) => translations[token.lexeme] ?? kebabToCamel(token.lexeme),
	"constant": (token: Token) => translations[token.lexeme] ?? token.lexeme,
	"operator": (token: Token) => token.lexeme,
	"string": (token: Token) => `"${token.lexeme.slice(1, -1)}"`,
});

const odd = run
	("internal")
	(lex, parse, first, toTypescript, print);

odd(`
Rules :: List {
	type :: String,
	pattern :: String | Regex,
	ignore :: boolean | nothing
};

Token :: {
	type :: String,
	lexeme :: String,
	location :: [ Number, Number ]
};

Lexer :: Rules -> String -> List Token;

Leaf :: Node | Token;

Node :: {
	type :: String,
	children :: List Leaf
};

State :: {
	grammar :: Grammar,
	input :: List Token,
	stack :: List Leaf
};

Success :: State & {
	ok :: true
};

Failure :: State & {
	ok :: false,
	reason :: String
};

Result :: Success | Failure;

Parser :: State -> Result;
`);