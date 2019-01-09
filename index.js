const Processor = require("./Processor/Processor");
const Lexer = require("./Lexer/Lexer");
const Parser = require("./Parser/Parser");
const Compiler = require("./Compiler/Compiler");
const colouriser = require("./Lexer/OddColouriseCommandLine");
const lexicalPreprocessor = require("./Preprocessor/preprocessor");

const lexer = new Lexer()
	.set("colouriser", colouriser)
	.rule("whitespace", /\s+/)
	.rule("string", /(?<!\\)".*"/)
	.rule("template literal", /(?<!\\)`.*`/)
	.rule("single line comment", /\/\/[^\n]*/)
	.rule("multi line comment", /\/\*[^*]*?\*\//)
	.rule("semicolon", ";")
	.rule("punctuation", /[,\[\]\(\)]/)
	.rule("block start", "{")
	.rule("block end", "}")
	.rule("type annotation", /[[{]*\w+?[^()\s]*:/)
	.rule("operator", /[.=+\-/*%^~<>?&|!:]|\b(new|exists|instanceof|typeof|in)\b/)
	.rule("controller", /\b(for|return|emits?|if|when|while|then|or|and|else|continue|throw|using|repeat|operator|iife)\b/)
	.rule("preprocessor directive", /#|\bdefine\b/)
	.rule("storage type", /\b(const|local|type|function|class|interface)\b/)
	.rule("storage modifier", /\b(implements|extends|overt)\b/)
	.rule("builtin", /\b(Function|Array|Object|String|Boolean|Number|Math|Error|Class)\b/)
	.rule("floating point number", /[0-9]*\.[0-9]+(?:e[+-]?[0-9]+)?/i)
	.rule("integer number", /[0-9]+/)
	.rule("literal", /\b(true|false|nil|null|undefined)\b/)
	.rule("identifier", /[a-zA-Z_$][\w$]*/);

const parser = new Parser();
const compiler = new Compiler();

const input = require("fs").readFileSync("./test.odd", "utf8");



function typeChecker (ast) {
	return ast;
}

function optimiser (ast) {
	return ast;
}

function plugin (compiledCode) {
	return compiledCode;
}

new Processor()
	.stage("lexer", lexer.lex.bind(lexer))
	.stage("preprocessor", lexicalPreprocessor)
	.stage("parser", parser.parse.bind(parser))
		.use(typeChecker)
		.use(optimiser)
	.stage("compiler", compiler.compile.bind(compiler))
		.use(plugin)
	.process(input)
	//.then(console.log)
	.catch(console.error);