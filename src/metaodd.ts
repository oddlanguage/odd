import { read, write } from "./file.js";
import lexer, { Token } from "./lexer.js";
import parser, { ignore, Leaf, lexeme, node, nOrMore, oneOf, oneOrMore, sequence, type, unpack } from "./parser.js";
import { isNode } from "./tree.js";
import { log, pipe } from "./utils.js";

const [fileToRead, outFile] = process.argv.slice(2);	
if (!fileToRead)
	throw "Please specify a file to run.";

const lex = lexer([
	{ type: "comment", pattern: /;;[^\n]*/, ignore: true },
	{ type: "whitespace", pattern: /\s+/, ignore: true },
	{ type: "regex", pattern: /\/(?:[^/]|\/)+?(?<!\\)\// },
	{ type: "string", pattern: /(?:"(?:[^"]|\")+?(?<!\\)")|(?:'(?:[^']|\')+?(?<!\\)')/ },
	{ type: "quantifier", pattern: /[+*?]/ },
	{ type: "type", pattern: /\.[a-zA-Z]+(?:\-[a-zA-Z]+)*[\d'"]*/ },
	{ type: "identifier", pattern: /[a-zA-Z]+(?:\-[a-zA-Z]+)*[\d'"]*/ },
	{ type: "keyword", pattern: /[=|<-]/ },
	{ type: "punctuation", pattern: /[;()]/ }
]);

const parse = parser("program", rule => ({
	program: node("program")(
		oneOrMore(rule("rule"))),
	rule: node("rule")(sequence([
		type("identifier"),
		ignore(lexeme("=")),
		rule("expression"),
		ignore(lexeme(";"))])),
	expression: rule("union"),
	union: oneOf([
		node("union")(
			sequence([
				rule("foldl"),
				ignore(lexeme("|")),
				rule("union")])),
		rule("foldl")]),
	foldl: oneOf([
		node("foldl")(
			sequence([
				rule("sequence"),
				ignore(lexeme("<")),
				rule("foldl")])),
		rule("sequence")]),
	sequence: oneOf([
		node("sequence")(
			nOrMore(2)(rule("quantified"))),
		rule("quantified")]),
	quantified: oneOf([
		node("quantified")(
			sequence([
				rule("ignore"),
				type("quantifier")])),
		rule("ignore")]),
	ignore: oneOf([
		node("ignore")(
			sequence([
				ignore(lexeme("-")),
				rule("atom")])),
		rule("atom")]),
	atom: oneOf([
		type("string"),
		type("type"),
		type("identifier"),
		sequence([
			ignore(lexeme("(")),
			rule("expression"),
			ignore(lexeme(")"))])])
}));

const translate = (leaf: Leaf): string => {
	if (isNode(leaf)) {
		switch (leaf.type) {
			case "program": return `export default parser("program", rule => ({\n${leaf.children.map(child => `  ${translate(child)}`).join(",\n")}\n}))`;
			case "rule": return `"${(leaf.children[0]! as Token).lexeme}": ${translate(leaf.children[1]!)}`;
			case "sequence": return `sequence([${leaf.children.map(translate).join(", ")}])`;
			case "quantified": {
				const term = `(${translate(leaf.children[0]!)})`;
				switch ((leaf.children[1] as Token).lexeme) {
					case "?": return `optional${term}`;
					case "*": return `zeroOrMore${term}`;
					case "+": return `oneOrMore${term}`;
				}
			}
			case "union": return `oneOf([${leaf.children.map(translate).join(", ")}])`;
			case "foldl": return `nodeLeft("TODO")(sequence([${leaf.children.map(translate).join(", ")}]))`;
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
	lex,
	parse,
	unpack,
	translate,
	data =>
		(outFile)
			? write(outFile, data)
			: log(data)
);

read(fileToRead)
	.then(({ contents }) => run(contents))
	.catch(console.error);