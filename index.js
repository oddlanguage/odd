const Processor = require("./Processor");
const Lexer = require("./Lexer");
const Preprocessor = require("./Preprocessor");
const Parser = require("./Parser");
const Compiler = require("./Compiler");
const ProcessorPlugin = require("./ProcessorPlugin");

const lexer = new Lexer()
	.rule("whitespace", /\w/)
	.rule("any", /\W+/);

new Processor()
	.set("lexer", lexer)
	.set("preprocessor", new Preprocessor())
	.set("parser", new Parser())
	.set("compiler", new Compiler())
	.use(new ProcessorPlugin())
	.process("local num: test = 123")
	.then(console.log)
	.catch(console.error);