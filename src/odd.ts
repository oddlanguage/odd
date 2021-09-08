import read, { File, makeError } from "./file.js";
import lexer from "./lexer.js";
import parser, { debug, delimited, fail, ignore, lexeme, node, nodeLeft, nOrMore, oneOf, oneOrMore, optional, rule, sequence, type } from "./parser.js";
import { pipe } from "./utils.js";

const modes = {
	String: Symbol("string")
};

const lex = lexer([
	{ type: "comment", pattern: /;;[^\n]+/, ignore: true },
	{ type: "whitespace", pattern: /\s+/, ignore: true },
	{ type: "keyword", pattern: /if|then|else|match|where|\=|\=>|\&|::|\->|\.|\|/ },
	{ type: "operator", pattern: /[!@#$%^&*\-=+\\|:<>/?\.]+/ },
	{ type: "punctuation", pattern: /[,\[\]\{\}\(\);]/ },
	{ type: "number", pattern: /-?(?:\d+(?:,\d+)*(?:\.\d+(?:e\d+)?)?|(?:\.\d+(?:e\d+)?))/i },
	{ type: "constant", pattern: /true|false|nothing|infinity/ },
	{ type: "identifier", pattern: /[a-z]\w*(?:-\w+)*'*/i }
]);

const parse = parser({
	"program": debug(
		node("program")(
			sequence([
				rule("statements"),
				optional(ignore(lexeme(";")))])),
		{ stack: true }),
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
		rule("type-declaration"),
		rule("declaration"),
		rule("expression")]),
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
		nodeLeft("type-application")(nOrMore(2)(rule("type-access"))),
		rule("type-access")]),
	"type-access": oneOf([
		nodeLeft("type-access")(
			sequence([
				rule("type-value"),
				oneOrMore(sequence([
					ignore(lexeme(".")),
					rule("type-value")]))])),
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
		type("operator")]),
	"declaration": node("declaration")(
		oneOf([
			rule("function-declaration"),
			rule("value-declaration"),
			rule("operator-declaration")])),
	"function-declaration": node("function-declaration")(
		fail("Not implemented.")),
	"value-declaration": node("value-declaration")(
		sequence([
			type("identifier"),
			ignore(lexeme("=")),
			rule("expression")])),
	"operator-declaration": node("operator-declaration")(
		fail("Not implemented.")),
	"expression": node("expression")(
		sequence([
			oneOf([
				rule("match-expression"),
				rule("if-expression"),
				rule("lambda"),
				rule("operation")]),
			optional(rule("where-clause"))
		])),
	"match-expression": node("match-expression")(
		fail("Not implemented.")),
	"if-expression": node("if-expression")(
		fail("Not implemented.")),
	"lambda": node("lambda")(
		fail("Not implemented.")),
	"operation": oneOf([
		node("operation")(
			sequence([
				rule("application"),
				type("operator"),
				rule("operation")])),
		rule("application")]),
	"application": oneOf([
		nodeLeft("application")(nOrMore(2)(rule("access"))),
		rule("access")]),
	"access": oneOf([
		node("access")(
			sequence([
				rule("value"),
				ignore(lexeme(".")),
				rule("access")])),
		rule("value")]),
	"value": oneOf([
		rule("map"),
		rule("list"),
		sequence([
			ignore(lexeme("(")),
			rule("expression"),
			ignore(lexeme(")"))]),
		rule("literal")]),
	"map": node("map")(
		fail("Not implemented.")),
	"list": node("list")(
		fail("Not implemented.")),
	"where-clause": node("where-clause")(
		sequence([
			ignore(lexeme("where")),
			delimited(ignore(lexeme(",")))(rule("declaration"))]))
});

const file = read("./test/odd.odd");

// TODO: Remove this immediately when error types become a thing
const wrap = (context: File, options?: Parameters<typeof makeError>[2]) => <T extends (...args: any[]) => any>(f: T) => (...args: Parameters<T>) =>  {
	try {
		return f(...args) as ReturnType<T>;
	} catch (error) {
		throw makeError(error as string | { message: string; offset: number; }, context, options);
	}
};

const contextualise = wrap(file);

const odd = pipe(contextualise(lex), contextualise(parse) /*, first, print*/);

odd(file.contents);