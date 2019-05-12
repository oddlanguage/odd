const Processor = require("./src/Processor/Processor");
const Lexer = require("./src/Lexer/Lexer-async");
const Parser = require("./src/Parser/Parser");
const Compiler = require("./src/Compiler/Compiler");
const colouriser = require("./src/Lexer/OddColouriseCommandLine");
const lexicalPreprocessor = require("./src/Preprocessor/preprocessor");

// const lexer = new Lexer()
// 	//.set("colouriser", colouriser)
// 	.ignore("whitespace", /\s+/)
// 	.rule("string", /(?<!\\)".*"/)
// 	.rule("template literal", /(?<!\\)`.*`/)
// 	.rule("single line comment", /\/\/[^\n]*/)
// 	.rule("multi line comment", /\/\*[^*]*?\*\//)
// 	.rule("phrase terminator", ";")
// 	.rule("punctuation", /[,\(\)]/)
// 	.rule("block start", "{")
// 	.rule("block end", "}")
// 	.rule("object start", "[")
// 	.rule("object end", "]")
// 	.rule("type annotation", /[[{]*\w+?[^()\s]*:/)
// 	.rule("operator", /[.=+\-/*%^~<>?&|!:]|\b(new|exists|instanceof|typeof|in|and|or)\b/)
// 	.rule("controller", /\b(for|return|emits?|if|when|while|then|else|continue|throw|using|repeat|operator|iife)\b/)
// 	.rule("preprocessor directive", /#|\bdefine\b/)
// 	.rule("storage type", /\b(const|local|type|function|class|template)\b/)
// 	.rule("storage modifier", /\b(implements|extends|overt)\b/)
// 	.rule("builtin", /\b(event|Function|Array|Object|String|Boolean|Number|Math|Error|Class)\b/)
// 	.rule("decimal number", /[0-9]*\.[0-9]+(?:e[+-]?[0-9]+)?/i)
// 	.rule("integer number", /[0-9]+/)
// 	.rule("literal", /\b(true|false|nil|null|undefined)\b/)
// 	.rule("identifier", /[a-zA-Z_$][\w$]*/);

// const parser = new Parser();
// const compiler = new Compiler();

// const input = require("fs").createReadStream("./test.odd", {encoding: "utf8", highWaterMark: 1024});
const input = require("fs").readFileSync("./test.odd", "utf8");

// function typeChecker (ast) {
// 	return ast;
// }

// function optimiser (ast) {
// 	return ast;
// }

// function plugin (compiledCode) {
// 	return compiledCode;
// }

// Read up on either :: or bound class methods BABEL plugins and decide which to use
// new Processor()
// 	.stage("lexer", lexer.lex.bind(lexer))
// 	.stage("preprocessor", lexicalPreprocessor)
// 	.stage("parser", parser.parse.bind(parser))
// 		.use(typeChecker)
// 		.use(optimiser)
// 	.stage("compiler", compiler.compile.bind(compiler))
// 		.use(plugin)
// 	.process(input)
// 	.then(console.log)
// 	.catch(console.error);

const lexer = new Lexer()
	.ignore("whitespace", /\s+/)
	.rule("string", /(?<!\\)".*"/)
	.rule("template literal", /(?<!\\)`.*`/)
	.rule("single line comment", /\/\/[^\n]*/)
	.rule("multi line comment", /\/\*[^*]*?\*\//)
	.rule("phrase terminator", ";")
	.rule("punctuation", /[,\(\)]/)
	.rule("block start", "{")
	.rule("block end", "}")
	.rule("object start", "[")
	.rule("object end", "]")
	.rule("type annotation", /[[{]*\w+?[^()\s]*:/)
	.rule("operator", /[.=+\-/*%^~<>?&|!:]|\b(new|exists|instanceof|typeof|in|and|or)\b/)
	.rule("controller", /\b(for|return|emits?|if|when|while|then|else|continue|throw|using|repeat|operator|iife)\b/)
	.rule("preprocessor directive", /#|\bdefine\b/)
	.rule("storage type", /\b(const|local|type|function|class|template)\b/)
	.rule("storage modifier", /\b(implements|extends|overt)\b/)
	.rule("builtin", /\b(event|Function|Array|Object|String|Boolean|Number|Math|Error|Class)\b/)
	.rule("decimal number", /[0-9]*\.[0-9]+(?:e[+-]?[0-9]+)?/i)
	.rule("integer number", /[0-9]+/)
	.rule("literal", /\b(true|false|nil|null|undefined)\b/)
	.rule("identifier", /[a-zA-Z_$][\w$]*/)
	.generator(input);

let token = null;
console.log(lexer);
while (token = lexer.next()) {
	console.log(token);
}