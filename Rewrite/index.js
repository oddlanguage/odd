const Processor = require("./Processor");
const Lexer = require("./Lexer");
const Preprocessor = require("./Preprocessor");
const Parser = require("./Parser");
const Compiler = require("./Compiler");
const ProcessorPlugin = require("./ProcessorPlugin");

new Processor()
	.set("lexer", new Lexer())
	.set("preprocessor", new Preprocessor())
	.set("parser", new Parser())
	.set("compiler", new Compiler())
	.use(new ProcessorPlugin())
	.process("local num: test = 123")
	.then(console.log)
	.catch(console.error)

/* TODO:
	Processor.assert("property") > Make sure Processor.property exists, else throw an error.
	Everything else lol.
*/