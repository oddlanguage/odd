const Processor = require("./Processor");
const Lexer = require("./Lexer");
const Preprocessor = require("./Preprocessor");
const Parser = require("./Parser");
const Compiler = require("./Compiler");
const ProcessorPlugin = require("./ProcessorPlugin");

const lexer = new Lexer()
	.rule("whitespace", /\s+/)
	.rule("single line comment", /(\/\/.*)\n/)
	.rule("expression terminator", ";")
	.rule("type annotation", /[\[\]}{]*[a-zA-Z_$][\w$]*[\[\]}{]*:/)
	.rule("block open", "{")
	.rule("block close", "}")
	.rule("bracket open", "[")
	.rule("bracket close", "]")
	.rule("parenthesis open", "(")
	.rule("parenthesis close", ")")
	.rule("separator", ",")
	.rule("operator", /[.=+\-/*%^~<>?&|!:]/)
	.rule("number", /[\d.][\deE.]*/)
	.rule("string", /".*?[^\\]*"/)
	.rule("template literal", /`.*?[^\\]*`/)
	.rule("preprocessor directive", /#[a-zA-Z_$][\w$]*/)
	.rule("identifier", /[a-zA-Z_$][\w$]*/);

const preprocessor = new Preprocessor();

const parser = new Parser();

const compiler = new Compiler();

const fs = require("fs");
const input = fs.readFileSync("./test.odd", "utf8");

new Processor()
	.set("lexer", lexer)
	.set("preprocessor", preprocessor)
	.set("parser", parser)
	.set("compiler", compiler)
	.use(new ProcessorPlugin())
	.process(input)
	.then(console.log)
	.catch(console.error);