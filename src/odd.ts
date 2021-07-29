import { readFileSync } from "node:fs";
import lexer, { Token } from "./lexer.js";
import parser, { debug, delimited, foldSeqL, ignore, Leaf, lexeme, Node, node, nOrMore, oneOf, oneOrMore, optional, rule, sequence, type } from "./parser.js";
import { mapper } from "./tree.js";
import { capitalise, first, kebabToCamel, pipe } from "./utils.js";

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
	"program": debug(node("program")(
		sequence([
			rule("statements"),
			optional(ignore(lexeme(";")))])), { stack: true }),
	"statements": delimited(
		lexeme(";"))
		(rule("statement")),
	"statement": node("statement")(
		oneOf([
			rule("export"),
			rule("statement-body")])),
	"export": node("export")(
		sequence([
			lexeme("export"),
			rule("statement-body")])),
	"statement-body": oneOf([
		rule("type-declaration")/*,
		rule("declaration"),
		rule("expression")*/]),
	"type-declaration": node("type-declaration")(
		sequence([
			type("identifier"),
			optional(rule("type-parameters")),
			ignore(lexeme("::")),
			rule("type")])),
	"type-parameters": node("type-parameters")(
		oneOrMore(type("identifier"))),
	"type": rule("type-function"),
	"type-function": oneOf([
		node("type-function")(
			sequence([
				rule("type-union"),
				ignore(lexeme("->")),
				rule("type-function")])),
		rule("type-union")]),
	"type-union": oneOf([
		node("type-union")(
			sequence([
				rule("type-intersection"),
				ignore(lexeme("|")),
				rule("type-union")])),
		rule("type-intersection")]),
	"type-intersection": oneOf([
		node("type-intersection")(
			sequence([
				rule("type-application"),
				ignore(lexeme("&")),
				rule("type-application")])),
		rule("type-application")]),
	"type-application": oneOf([
		foldSeqL("type-application")(nOrMore(2)(rule("type-access"))),
		rule("type-access")]),
	"type-access": oneOf([
		node("type-access")(
			sequence([
				rule("type-value"),
				ignore(lexeme(".")),
				rule("type-access")])),
		rule("type-value")]),
	"type-value": oneOf([
		node("type-map")(
			sequence([
				ignore(lexeme("{")),
				optional(
					delimited(
						ignore(lexeme(",")))(
						rule("type-field"))),
				ignore(lexeme("}"))])),
		node("type-list")(
			sequence([
				ignore(lexeme("[")),
				optional(
					delimited(
						ignore(lexeme(",")))(
						rule("type"))),
				ignore(lexeme("]"))])),
		sequence([
			ignore(lexeme("(")),
			rule("type"),
			ignore(lexeme(")"))]),
		rule("literal")]),
	"type-field": node("type-field")(
		sequence([
			oneOrMore(rule("literal")),
			ignore(lexeme("::")),
			rule("type")])),
	"literal": oneOf([
		type("identifier"),
		type("constant"),
		type("string"),
		type("number"),
		type("operator")])
});

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


const prelude = `
type _Object<T extends [ { toString(): string }, any ]> = Record<string, T[1]>;

const map = <A, B>(f: (_: A) => B, xs: A[]) => xs.map(f);

const apply = <A>(x: A) => <B>(f: (_: A) => B) => f(x);

const fold = <T>(f: (_: T, __: T, ___: number, ____: T[]) => T, y: T) => (xs: T[]) => xs.reduce(f, y);

const size = (x: { length: number; }) => x.length;

const filter = <T>(f: (_: T) => boolean, xs: T[]) => xs.filter(f);
`.trim();


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