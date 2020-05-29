import Parser from "../Parser/Parser.js";
const { maybe, some, rule, sequence, type, options, delimited, many }  = Parser.combinators;

// program -> metarule*
const program = some(rule("metarule"));

// metarule -> .identifier "->" chunks (.end | .EOF)
const metarule = sequence(
	type("identifier"),
	type("arrow"),
	rule("chunks"),
	options(
		type("end"),
		type("EOF")));

// chunks -> chunk+ ("|" chunk+)*
const chunks = delimited(
	many(
		rule("chunk")),
	type("alternative"));

// chunk -> .label? (atom | group) quantifier?
const chunk = sequence(
	maybe(
		type("label")),
	maybe(
		type("invert")),
	options(
		rule("atom"),
		rule("group")),
	maybe(
		rule("quantifier")));

// atom -> .type | .identifier | .lexeme | .self
const atom = options(
	type("type"),
	type("identifier"),
	type("lexeme"),
	type("self"));

// group -> "(" chunks ")"
const group = sequence(
	type("group-start"),
	rule("chunks"),
	type("group-end"));

// quantifier -> .quantifier | "{" .number ("," .number?)? "}"
const quantifier = options(
	type("quantifier"),
	sequence(
		type("quantifier-start"),
		type("number"),
		maybe(
			sequence(
				type("comma"),
				maybe(
					type("number")))),
		type("quantifier-end")));

export default new Parser()
	.rule("program",    program)
	.rule("metarule",   metarule)
	.rule("chunks",     chunks)
	.rule("chunk",      chunk)
	.rule("atom",       atom)
	.rule("group",      group)
	.rule("quantifier", quantifier);