import { inspect } from "node:util";
import lexer, { Token } from "./lexer.js";
import parser, { delimited, either, ignore, Leaf, lexeme, Node, node, oneOf, oneOrMore, optional, pair, rule, sequence, type, zeroOrMore } from "./parser.js";
import { expect } from "./tests.js";

export const print = <T>(x: T, options?: Readonly<{ max?: number; depth?: number; }>) =>
	(console.log((typeof x === "string") ? x : inspect(x, { colors: true, depth: options?.depth ?? Infinity, maxArrayLength: options?.max ?? Infinity })), x);

export const pipe = (...fs: ((...args: any[]) => any)[]) => (x: any) =>
	fs.reduce((y, f) => f(y), x);

type Transformer = Readonly<{
	run: (input: any) => void;
	context: string;
}>;

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
				ignore(lexeme(")"))]))),
	"type": oneOf([
		pair(
			node("type-plain")(
				either(
					type("identifier"),
					rule("literal"))),
			optional(rule("type-tail"))),
		pair(
			node("type-map")(
				sequence([
					ignore(lexeme("{")),
					delimited(
						ignore(lexeme(",")))(
						rule("type-map-field")),
					ignore(lexeme("}"))])),
			optional(rule("type-tail"))),
		pair(
			node("type-list")(
				sequence([
					ignore(lexeme("[")),
					rule("type"),
					ignore(lexeme("]"))])),
			optional(rule("type-tail"))),
		sequence([
			ignore(lexeme("(")),
			rule("type"),
			ignore(lexeme(")")),
			optional(rule("type-tail"))])]),
	"literal": oneOf([
		type("constant"),
		type("string"),
		type("number")]),
	"type-map-field": node("type-map-field")(
		sequence([
			rule("type-map-key"),
			ignore(lexeme("::")),
			rule("type")])),
	"type-map-key": oneOrMore(type("identifier")),
	"type-tail": oneOf([
		pair(ignore(lexeme("->")), node("type-function")(rule("type"))),
		pair(ignore(lexeme("|")), node("type-union")(rule("type"))),
		pair(ignore(lexeme("&")), node("type-intersection")(rule("type"))),
		node("type-application")(rule("type"))])
});

export const isToken = (leaf: Leaf): leaf is Token =>
	!!(leaf as Token).lexeme;

type Mutable<T> = { -readonly [P in keyof T]: T[P] };

const normalise = (node: Mutable<Leaf>): Leaf => {
	if (isToken(node))
		return node;

	for (const type of ["type-application", "type-function", "type-union", "type-intersection"]) {
		for (let i = 0; i < node.children.length; i++) {
			const next = node.children[i + 1];

			if (next?.type !== type)
				continue;

			(next as Node).children.unshift(node.children[i]);
			node.children.splice(i, 2, next);
		}
	}

	for (const child of node.children)
		normalise(child);

	return node;
};

const first = <T extends any[]>(array: T) =>
	array[0];

const test = expect
	("Correct parse tree")
	({type:"program",children:[
		{type:"statement",children:[
			{type:"type-declaration",children:[
				{type:"identifier",lexeme:"List"},
				{type:"type-map",children:[
					{type:"type-map-field",children:[
						{type:"identifier",lexeme:"add"},
						{type:"type-function",children:[
							{type:"type-plain",children:[{type:"identifier",lexeme:"a"}]},
							{type:"type-function",children:[
								{type:"type-application",children:[
									{type:"type-plain",children:[{type:"identifier",lexeme:"List"}]},
									{type:"type-plain",children:[{type:"identifier",lexeme:"b"}]},]},
								{type:"type-application",children:[
									{type:"type-plain",children:[{type:"identifier",lexeme:"List"}]},
									{type:"type-union",children:[
										{type:"type-plain",children:[{type:"identifier",lexeme:"a"}]},
										{type:"type-plain",children:[{type:"identifier",lexeme:"b"}]}]}]}]}]}]}]}]}]}]});



const interpreter: Transformer = {
	context: "internal",
	run: pipe(lex, parse, first, print, normalise, x => {print(x);test(x);})
};

interpreter.run(`
List :: {
	add :: a -> (List b) -> List (a | b)
};
`);