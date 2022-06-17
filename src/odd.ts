import { read } from "./file.js";
import lexer from "./lexer.js";
import parser, { debug, delimited, fail, fold, ignore, lexeme, node, nOrMore, oneOf, oneOrMore, optional, sequence, type, unpack, zeroOrMore } from "./parser.js";
import { get, pipe } from "./utils.js";

const filename = process.argv[2];
if (!filename)
	throw "Please specify a file to run.";

const lex = lexer([
	{ type: "comment", pattern: /--[^\n]*/, ignore: true },
	{ type: "whitespace", pattern: /\s+/, ignore: true },
	{ type: "keyword", pattern: /if|then|else|match|where|with|\=|\=>|\&|:|\->|\.|\|/ },
	{ type: "operator", pattern: /[!@#$%^&*\-=+\\|:<>/?\.]+/ },
	{ type: "punctuation", pattern: /[,\[\]\{\}\(\);]/ },
	{ type: "number", pattern: /-?(?:\d+(?:,\d+)*(?:\.\d+(?:e\d+)?)?|(?:\.\d+(?:e\d+)?))/i },
	{ type: "constant", pattern: /true|false|nothing|infinity/ },
	{ type: "identifier", pattern: /[a-z]\w*(?:-\w+)*'*/i },
	{ type: "string", pattern: /`[^`]+(?<!\\)`/ }
	// TODO: Allow lexer to recognise (recursive?) string interpolation
]);

const parse = parser(rule => ({
	"program": debug(node("program")(
		sequence([
			delimited(
				ignore(lexeme(";")))
				(rule("statement")),
			optional(ignore(lexeme(";")))])), { elapsed: true, memory: true }),
	"statement": oneOf([
		rule("export"),
		rule("statement-body")]),
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
			ignore(lexeme(":")),
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
		fold(children => ({type: "type-application", children }))(nOrMore(2)(rule("type-access"))),
		rule("type-access")]),
	"type-access": oneOf([
		fold(children => ({type: "type-access", children }))(
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
				optional(ignore(lexeme(","))),
				ignore(lexeme("}"))])),
		node("type-list")(
			sequence([
				ignore(lexeme("[")),
				optional(
					delimited(
						ignore(lexeme(",")))(
						rule("type"))),
				optional(ignore(lexeme(","))),
				ignore(lexeme("]"))])),
		sequence([
			ignore(lexeme("(")),
			rule("type"),
			ignore(lexeme(")"))]),
		rule("value")]),
	"type-field": node("type-field")(
		sequence([
			oneOrMore(rule("value")),
			ignore(lexeme(":")),
			rule("type")])),
	"value": node("value")(
		oneOf([
			type("identifier"),
			type("constant"),
			type("string"),
			type("number"),
			sequence([
				ignore(lexeme("(")),
				type("operator"),
				ignore(lexeme(")"))])])),
	"declaration": oneOf([
		rule("value-declaration"),
		rule("operator-declaration")]),
	"value-declaration": node("value-declaration")(
		sequence([
			type("identifier"),
			zeroOrMore(rule("parameter")),
			ignore(lexeme("=")),
			rule("expression")])),
	"operator-declaration": node("operator-declaration")(
		fail("Not implemented.")),
	"expression": node("expression")(
		sequence([
			oneOf([
				rule("match-expression"),
				rule("if-expression"),
				rule("lambda")]),
			optional(rule("where-clause"))])),
	"match-expression": node("match-expression")(
		sequence([
			ignore(lexeme("match")),
			rule("expression"),
			ignore(lexeme("with")),
			delimited(
				ignore(lexeme(",")))(
				rule("case")),
			optional(node("else")(
				sequence([
					ignore(lexeme(",")),
					ignore(lexeme("else")),
					rule("expression")])))])),
	"case": node("case")(
		sequence([
			rule("expression"),
			ignore(lexeme("=")),
			rule("expression")])),
	"if-expression": node("if-expression")(
		sequence([
			ignore(lexeme("if")),
			rule("expression"),
			ignore(lexeme("then")),
			rule("expression"),
			ignore(lexeme("else")),
			rule("expression")])),
	"lambda": oneOf([
		node("lambda")(
			sequence([
				rule("parameter"),
				ignore(lexeme("->")),
				rule("expression")])),
		rule("operation")]),
	"operation": oneOf([
		node("operation")(
			sequence([
				rule("application"),
				type("operator"),
				rule("operation")])),
		rule("application")]),
	"application": oneOf([
		fold(children => ({type: "application", children }))(nOrMore(2)(rule("access"))),
		rule("access")]),
	"access": oneOf([
		node("access")(
			sequence([
				rule("atom"),
				ignore(lexeme(".")),
				rule("access")])),
		rule("atom")]),
	"atom": oneOf([
		rule("map"),
		rule("list"),
		rule("value"),
		sequence([
			ignore(lexeme("(")),
			rule("expression"),
			ignore(lexeme(")"))])]),
	"map": node("map")(
		sequence([
			ignore(lexeme("{")),
			optional(
				delimited(
					ignore(lexeme(",")))(
					rule("value-declaration"))),
			optional(ignore(lexeme(","))),
			ignore(lexeme("}"))])),
	"list": node("list")(
		sequence([
			ignore(lexeme("[")),
			optional(
				delimited(
					ignore(lexeme(",")))(
					rule("expression"))),
			optional(ignore(lexeme(","))),
			ignore(lexeme("]"))])),
	"where-clause": node("where-clause")(
		sequence([
			ignore(lexeme("where")),
			delimited(
				ignore(lexeme(",")))(
				rule("declaration"))])),
	"parameter": node("parameter")(
		type("identifier"))
}))("program");

const run = pipe(
	get("contents"),
	lex,
	parse,
	unpack,
	// data =>
	// 	(outFile)
	// 		? write(outFile, data)
	// 		: log(data)
);

// TODO: This code is copy/pasted between odd.ts and metaodd.ts
// while it really should be handled in `unpack`, but that would
// require the contents of the file to be passed. Either pass it
// to `unpack`, or find a way to construct errors from just a `State`.
read(filename)
	.then(file => {
		try {
			run(file);
		} catch (error: any) {
			// Prevent catching real errors
			if (!error.type || !error.reason || typeof error.offset !== "number")
				return console.log(error);

			const { contents } = file;
			const startOfLine = contents.lastIndexOf("\n", error.offset) + 1;
			const linePadding = contents.slice(startOfLine).match(/\S/)?.index ?? 0;
			const endOfLine = contents.indexOf("\n", error.offset);
			const lineNumber = contents.slice(0, error.offset).split(/\r*\n/).length;
			const erroneousLine = contents.slice(startOfLine + linePadding, endOfLine);
			const indexOfErrorOnErroneousLine = lineNumber.toString().length + 3 + (error.offset - startOfLine - linePadding);
			console.error(`${error.type}: ${error.reason}\n\n${lineNumber} | ${erroneousLine}\n${" ".repeat(indexOfErrorOnErroneousLine)}${"^".repeat(error.size ?? 1)}`);
		}
	});