const Processor = require("./Processor");
const Lexer = require("./Lexer");
const Parser = require("./Parser");
const Compiler = require("./Compiler");

const lexer = new Lexer()
// 	.set("colouriser", require("./OddColouriseCommandLine"))
	.rule("whitespace", /\s+/)
	.rule("string", /(?<!\\)".*"/)
	.rule("template literal", /(?<!\\)`.*`/)
	.rule("single line comment", /\/\/[^\n]*/)
	.rule("multi line comment", /\/\*[^*]*?\*\//)
	.rule("expression terminator", ";")
	.rule("punctuation", /[,\[\]\(\)]/)
	.rule("block start", "{")
	.rule("block end", "}")
	.rule("type annotation", /[\[{]?\w+?[<\[{]?\S*[>\]}]?:/)
	.rule("operator", /[.=+\-/*%^~<>?&|!:]|\b(new|exists|instanceof|typeof)\b/)
	.rule("controller", /\b(return|emits?|if|when|while|then|or|and|else|continue|throw|using|repeat|operator)\b/)
	.rule("preprocessor directive", /#|\bdefine\b/)
	.rule("storage type", /\b(const|local|type|function|class|interface)\b/)
	.rule("storage modifier", /\b(implements|extends|overt)\b/)
	.rule("builtin", /\b(Function|Array|Object|String|Boolean|Number|Math|Error)\b/)
	.rule("floating point number", /[0-9]*\.[0-9]+(?:e[+-]?[0-9]+)?/i)
	.rule("integer number", /[0-9]+/)
	.rule("literal", /\b(true|false|nil|null|undefined)\b/)
	.rule("identifier", /[a-zA-Z_$][\w$]*/);

const parser = new Parser();
const compiler = new Compiler();

// const preprocessor = new Preprocessor()
// 	.set("directive start", /#|define/)
// 	.set("directive end", /[;}]/)
// 	.set("verifier", directive => {
// 		directive.expect("preprocessor directive", "define")
// 			.optional("type annotation")
// 			.expect("identifier")
// 			.expect("operator", "=")
// 			.expect(/operator|identifier|number|string|punctuation/)
// 			.until("expression terminator");
// 	});

const input = require("fs").readFileSync("./test.odd", "utf8");

function preprocessor () {
	return function () {};
}

function typeChecker () {
	return function () {};
}

function optimiser () {
	return function () {};
}

function plugin () {
	return function () {};
}

const file = null;

new Processor()
	.stage("lexer", lexer)
	.stage("preprocessor", preprocessor)
	.stage("parser", parser)
		.use(typeChecker)
		.use(optimiser)
	.stage("compiler", compiler)
		.use(plugin)
	.process(file);