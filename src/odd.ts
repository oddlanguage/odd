import { readFileSync } from "node:fs";
import { inspect } from "node:util";
import lexer, { Token } from "./lexer.js";
import parser, { debug, delimited, either, ignore, Leaf, lexeme, Node, node, oneOf, oneOrMore, optional, pair, rule, sequence, type, zeroOrMore } from "./parser.js";
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
	{ type: "keyword", pattern: /if|then|else|match|where|\=|\=>|\&|::|\->|\.|\|/ },
	{ type: "operator", pattern: /[!@#$%^&*\-=+\\|:<>/?\.]+/ },
	{ type: "punctuation", pattern: /[,\[\]\{\}\(\);]/ },
	{ type: "number", pattern: /-?(?:\d+(?:,\d+)*(?:\.\d+(?:e\d+)?)?|(?:\.\d+(?:e\d+)?))/i },
	{ type: "string", pattern: /`[^`]*`/i },
	{ type: "constant", pattern: /true|false|nothing|infinity/ },
	{ type: "identifier", pattern: /[a-z]\w*(?:-\w+)*'*/i }
]);

const parse = parser({
	program: debug(node("program")(
		pair(
			rule("statements"),
			optional(ignore(lexeme(";"))))), { stack: true }),
	"statements": 
		delimited(
			ignore(lexeme(";")))(
			rule("statement")),
	"statement": node("statement")(
		oneOf([
			rule("export"),
			rule("statement-body")])),
	"export": node("export")(
		sequence([
			ignore(lexeme("export")),
			rule("statement-body")])),
	"statement-body": oneOf([
		rule("type-declaration"),
		rule("declaration"),
		rule("expression")]),
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
				rule("type-access"),
				rule("type-application")])),
		rule("type-access")),
	"type-access": either(
		node("type-access")(
			sequence([
				rule("type-literal"),
				sequence([
					ignore(lexeme(".")),
					delimited(
						ignore(lexeme(".")))(
						rule("type-literal"))])])),
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
		ignore(lexeme("]"))])),
	"declaration": either(
		rule("value-declaration"),
		rule("operator-declaration")),
	"value-declaration": node("value-declaration")(
		sequence([
			type("identifier"),
			zeroOrMore(rule("parameter")),
			ignore(lexeme("=")),
			rule("expression")])),
	"operator-declaration": node("operator-declaration")(
		sequence([
			rule("parameter"),
			type("operator"),
			rule("parameter"),
			ignore(lexeme("=")),
			type("expression")])),
	"parameter": node("parameter")(
		either(
			rule("literal"),
			sequence([
				ignore(lexeme("(")),
				rule("type"),
				rule("literal"),
				ignore(lexeme(")"))]))),
	"expression": node("expression")(
		sequence([
			oneOf([
				rule("match-expression"),
				rule("if-expression"),
				// TODO: "lambda" can cause false "type-application" positives through "parameter",
				// which seems to be caused by incorrect cache matching
				rule("lambda"),
				rule("operation")]),
			optional(rule("where-clause"))])),
	"match-expression": node("match-expression")(
		sequence([
			ignore(lexeme("match")),
			rule("expression"),
			oneOrMore(rule("match"))])),
	"match": node("match")(
		sequence([
			rule("type"),
			ignore(lexeme("=>")),
			rule("expression")])),
	"if-expression": node("if-expression")(
		sequence([
			ignore(lexeme("if")),
			rule("expression"),
			ignore(lexeme("then")),
			rule("expression"),
			optional(
				sequence([
					ignore(lexeme("else")),
					rule("expression")]))])),
	"lambda": node("lambda")(
		sequence([
			rule("parameter"),
			ignore(lexeme("->")),
			rule("expression")])),
	"operation": either(
		node("operation")(
			sequence([
				rule("application"),
				type("operator"),
				rule("operation")])),
		rule("application")),
	"application": either(
		node("application")(
			sequence([
				rule("value"),
				rule("application")])),
		rule("access")),
	"access": either(
		node("access")(
			sequence([
				rule("value"),
				ignore(lexeme(".")),
				delimited(
					ignore(lexeme(".")))(
					rule("value"))])),
		rule("value")),
	"value": oneOf([
		rule("map"),
		rule("list"),
		sequence([
			ignore(lexeme("(")),
			rule("expression"),
			ignore(lexeme(")"))]),
		rule("literal")]),
	"where-clause": node("where-clause")(
		sequence([
			ignore(lexeme("where")),
			delimited(
				ignore(lexeme(",")))(
				rule("declaration"))])),
	"map": node("map")(
		sequence([
			ignore(lexeme("{")),
			optional(
				delimited(
					ignore(lexeme(",")))(
					rule("field"))),
			ignore(lexeme("}"))])),
	"field": node("field")(
		sequence([
			rule("key"),
			ignore(lexeme("=")),
			rule("expression")])),
	"key": node("key")(oneOrMore(rule("literal"))),
	"list": node("list")(
		sequence([
			ignore(lexeme("[")),
			optional(
				delimited(
					ignore(lexeme(",")))(
					rule("expression"))),
			ignore(lexeme("]"))]))
});

const first = <T>(array: T[]): T | undefined =>
	array[0];

// TODO: Make a context type that can be linked against
// when an error occurs or smth.
const run = (context: string) => (...stages: ((...args: any[]) => any)[]) =>
	pipe(...stages);

const literalTranslations: Record<string, string> = {
	"List": "Array",
	"String": "string",
	"Number": "number",
	"Regex": "RegExp",
	"Boolean": "boolean",
	"nothing": "undefined",
	"Object": "_Object",
};

const operationTranslations: Record<string, (node: Node) => string> = {
	"|>": node => `map(${toTypescript(node.children[0])}, ${toTypescript(node.children[2])})`,
	"==": node => [toTypescript(node.children[0]), "===", toTypescript(node.children[2])].join(" ")
};

const kebabToCamel = (identifier: string) =>
	identifier.replace(/-\w/g, ([_, x]) => x.toUpperCase());

const prelude = `
type _Object<T extends [ { toString(): string }, any ]> = Record<string, T[1]>;

const map = <A, B>(f: (_: A) => B, xs: A[]) => xs.map(f);

const apply = <A>(x: A) => <B>(f: (_: A) => B) => f(x);

const fold = <T>(f: (_: T, __: T, ___: number, ____: T[]) => T, y: T) => (xs: T[]) => xs.reduce(f, y);

const size = (x: { length: number; }) => x.length;

const filter = <T>(f: (_: T) => boolean, xs: T[]) => xs.filter(f);
`.trim();

const capitalise = (x: string) =>
	String.fromCodePoint(x.codePointAt(0)!).toLocaleUpperCase() + x.slice(1);

let depth = 0;
const toTypescript = mapper({
	"program": (node: Node) => `${prelude}\n\n${node.children.map(toTypescript).join("\n\n")}`,
	"statement": (node: Node) => `${toTypescript(node.children[0])};`,
	"export": (node: Node) => `export ${toTypescript(node.children[0])}`,
	"type-declaration": (node: Node) => `type ${toTypescript(node.children[0])} = ${toTypescript(node.children[1])}`,
	"type-application": (node: Node) => `${toTypescript(node.children[0])}<${toTypescript(node.children[1])}>`,
	"type-union": (node: Node) => `(${toTypescript(node.children[0])} | ${toTypescript(node.children[1])})`,
	"type-intersection": (node: Node) => `(${toTypescript(node.children[0])} & ${toTypescript(node.children[1])})`,
	"type-map": (node: Node) => `{\n${"  ".repeat(++depth)}${node.children.map(toTypescript).join(`;\n${"  ".repeat(depth)}`)};\n${"  ".repeat(--depth)}}`,
	"type-list": (node: Node) => `[ ${node.children.map(toTypescript).join(", ")} ]`,
	"type-function": (node: Node) => `((_: ${capitalise(toTypescript(node.children[0]))}) => ${capitalise(toTypescript(node.children[1]))})`,
	// TODO: function fields begin with `n` children
	"type-map-field": (node: Node) => `${toTypescript(node.children[0])}: ${toTypescript(node.children[1])}`,
	// TODO: store al declarations before finbally emitting
	// so that multiple declarations can be merged into a
	// signle function so typescript accepts it
	"value-declaration": (node: Node) => {
		const name = node.children[0];
		const parameters = node.children.slice(1, -1);
		const value = node.children.slice(-1)[0];

		return `const ${toTypescript(name)} = ` + ((parameters.length)
			? `(${parameters.map(toTypescript).join(") => (")}) => ${toTypescript(value)}`
			: toTypescript(value));
	},
	"parameter": (node: Node) =>
		(node.children.length > 1)
			? `${toTypescript(node.children[1])}: ${toTypescript(node.children[0])}`
			: toTypescript(node.children[0]),
	"expression": (node: Node) => {
		const [ body, whereClause ] = node.children as [ Leaf, Node ];

		if (!whereClause)
			return `(${toTypescript(body)})`;

		const declarations = whereClause.children.map(toTypescript);
		return `(() => {\n${"  ".repeat(++depth)}/* where-clause */\n${"  ".repeat(depth)}${declarations.join(`;\n${"  ".repeat(depth)}`)};\n${"  ".repeat(depth)}return ${toTypescript(body)};\n${"  ".repeat(--depth)}})()`;
	},
	"if-expression": (node: Node) => {
		const [ condition, consequence, alternative ] = node.children;
		return `${toTypescript(condition)}\n${"  ".repeat(++depth)}? ${toTypescript(consequence)}\n${"  ".repeat(depth--)}: ${alternative ? toTypescript(alternative) : undefined}`;
	},
	"access": (node: Node) => `${toTypescript(node.children[0])}${node.children.slice(1).map(child => `["${toTypescript(child)}"]`).join("")}`,
	"operation": (node: Node) => {
		const [ _, op ] = node.children as [ Node, Token, Node ];

		return operationTranslations[op.lexeme]?.(node) ?? node.children.map(toTypescript).join(" ");
	},
	"application": (node: Node) => `${toTypescript(node.children[0])}(${toTypescript(node.children[1])})`,
	"list": (node: Node) => `[ ${node.children.map(toTypescript).join(", ")} ]`,
	"map": (node: Node) => `{ ${node.children.map(toTypescript).join(", ")} }`,
	"type-access": (node: Node) => `${toTypescript(node.children[0])}${node.children.slice(1).map(child => `["${toTypescript(child)}"]`).join("")}`,
	"identifier": (token: Token) => literalTranslations[token.lexeme] ?? kebabToCamel(token.lexeme),
	"constant": (token: Token) => literalTranslations[token.lexeme] ?? token.lexeme,
	"operator": (token: Token) => token.lexeme,
	"string": (token: Token) => `"${token.lexeme.slice(1, -1)}"`,
	"number": (token: Token) => token.lexeme,
	"lambda": (node: Node) => `(${toTypescript(node.children[0])}) => ${toTypescript(node.children[1])}`
});

const odd = run
	("internal")
	(lex, parse, first, /* toTypescript, print */);

odd(readFileSync("./test/odd.odd", { encoding: "utf8" }));