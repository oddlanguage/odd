const Processor = require("./Processor");
const Lexer = require("./Lexer");
const Preprocessor = require("./Preprocessor");
const Parser = require("./Parser");
const Compiler = require("./Compiler");
const ProcessorPlugin = require("./ProcessorPlugin");

const lexer = new Lexer()
	.rule("whitespace", /\w/)
	.rule("any", /\W+/);

const preprocessor = new Preprocessor();

const parser = new Parser();

const compiler = new Compiler();

const input = "local num: test = 123";

new Processor()
	.set("lexer", lexer)
	.set("preprocessor", preprocessor)
	.set("parser", parser)
	.set("compiler", compiler)
	.use(new ProcessorPlugin())
	.process(input)
	.then(console.log)
	.catch(console.error);