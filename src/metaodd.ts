import { read } from "./file.js";
import lexer, { Token } from "./lexer.js";
import parser, { debug, ignore, Leaf, lexeme, node, nOrMore, oneOf, oneOrMore, sequence, type, unpack } from "./parser.js";
import { isNode } from "./tree.js";
import { get, pipe } from "./utils.js";

const [fileToRead, outFile] = process.argv.slice(2);	
if (!fileToRead)
	throw "Please specify a file to run.";

const lex = lexer([
	{ type: "comment", pattern: /;;[^\n]*/, ignore: true },
	{ type: "whitespace", pattern: /\s+/, ignore: true },
	{ type: "regex", pattern: /\/(?:[^/]|\/)+?(?<!\\)\// },
	{ type: "string", pattern: /(?:"(?:[^"]|\")+?(?<!\\)")|(?:'(?:[^']|\')+?(?<!\\)')/ },
	{ type: "quantifier", pattern: /[+*?]/ },
	{ type: "type", pattern: /\.[a-zA-Z]+(?:\-[a-zA-Z]+)*/ },
	{ type: "identifier", pattern: /[a-zA-Z]+(?:\-[a-zA-Z]+)*/ },
	{ type: "keyword", pattern: /[=|<-]/ },
	{ type: "punctuation", pattern: /[;()]/ }
]);

const parse = parser(rule => ({
	program: debug(node("program")(
		oneOrMore(rule("rule"))), { elapsed: true, memory: true }),
	rule: node("rule")(sequence([
		type("identifier"),
		ignore(lexeme("=")),
		rule("expression"),
		ignore(lexeme(";"))])),
	expression: rule("union"),
	union: oneOf([
		node("union")(
			sequence([
				rule("fold"),
				ignore(lexeme("|")),
				rule("union")])),
		rule("fold")]),
	fold: oneOf([
		node("fold")(
			sequence([
				rule("sequence"),
				ignore(lexeme("<")),
				rule("fold")])),
		rule("sequence")]),
	sequence: oneOf([
		node("sequence")(
			nOrMore(2)(rule("quantified"))),
		rule("quantified")]),
	quantified: oneOf([
		node("quantified")(
			sequence([
				rule("ignore"),
				rule("quantifier")])),
		rule("ignore")]),
	quantifier: oneOf([
		sequence([
			ignore(lexeme("+")),
			type("number")]),
		type("quantifier")]),
	ignore: oneOf([
		node("ignore")(
			sequence([
				ignore(lexeme("-")),
				rule("atom")])),
		rule("atom")
	]),
	atom: oneOf([
		type("string"),
		type("type"),
		type("identifier"),
		sequence([
			ignore(lexeme("(")),
			rule("expression"),
			ignore(lexeme(")"))])])
}))("program");

const translate = (leaf: Leaf): string => {
	if (isNode(leaf)) {
		switch (leaf.type) {
			case "program": return `export default parser(rule => ({\n${leaf.children.map(child => `  ${translate(child)}`).join(",\n")}\n}))("program");`;
			case "rule": return `"${(leaf.children[0]! as Token).lexeme}": node("${(leaf.children[0]! as Token).lexeme}")(${translate(leaf.children[1]!)})`;
			case "sequence": return `sequence([${leaf.children.map(translate).join(", ")}])`;
			case "quantified": {
				const term = translate(leaf.children[0]!);
				const quantifier = (leaf.children[1] as Token);
				switch (quantifier.lexeme) {
					case "?": return `optional(${term})`;
					case "*": return `zeroOrMore(${term})`;
					case "+": return `oneOrMore(${term})`;
					default: throw `Unknown quantifier ${quantifier.type} ("${quantifier.lexeme}").`;
				}
			}
			case "union": return `oneOf([${leaf.children.map(translate).join(", ")}])`;
			case "fold": return `nodeLeft("TODO")(sequence([${leaf.children.map(translate).join(", ")}]))`;
			case "ignore": return `ignore(${translate(leaf.children[0]!)})`;
			default: throw `No rule for node of type "${leaf.type}".`
		}
	}

	switch (leaf.type) {
		case "identifier": return `rule("${leaf.lexeme}")`;
		case "string": return `lexeme(${leaf.lexeme})`;
		case "type": return `type("${leaf.lexeme.slice(1)}")`
		default: throw `No rule for ${leaf.type} ("${leaf.lexeme}").`
	}
};

const run = pipe(
	get("contents"),
	lex,
	parse,
	unpack,
	translate,
	// data =>
	// 	(outFile)
	// 		? write(outFile, data)
	// 		: log(data)
);

read(fileToRead)
	.then(file => {
		try {
			run({ ...file, contents: file.contents.repeat(250) });
		} catch (error: any) {
			// Prevent catching real errors
			if (!error.type || !error.reason || typeof error.offset !== "number")
				return console.log(error);

			const { contents } = file;
			const startOfLine = contents.lastIndexOf("\n", error.offset) + 1;
			const endOfLine = contents.indexOf("\n", error.offset);
			const lineNumber = contents.slice(0, error.offset).split(/\r*\n/).length;
			const erroneousLine = contents.slice(startOfLine, endOfLine);
			const indexOfErrorOnErroneousLine = lineNumber.toString().length + 3 + (error.offset - startOfLine);
			console.error(`${error.type}: ${error.reason}\n\n${lineNumber} | ${erroneousLine}\n${" ".repeat(indexOfErrorOnErroneousLine)}${"^".repeat(error.size ?? 1)}`);
		}
	});