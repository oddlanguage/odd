const Processor = require("./Processor");
const Lexer = require("./Lexer");
const Preprocessor = require("./Preprocessor");
const Parser = require("./Parser");
const Compiler = require("./Compiler");
const ProcessorPlugin = require("./ProcessorPlugin");
require("clarify"); // Remove nodejs stack from error stack.

const lexer = new Lexer()
	.rule("whitespace", /\s+/)
	.rule("single line comment", /\/\/[^\n]*/)
	.rule("multi line comment", /\/\*[^*]*?\*\//)
	.rule("expression terminator", ";")
	.rule("type annotation", /[\[\]}{]?[a-zA-Z_$][\w$]*[\[\]}{]{0,2}:/)
	.rule("punctuation", /[,\[\]\(\)}{]/)
	.rule("operator", /[.=+\-/*%^~<>?&|!:]/)
	.rule("number", /[\d.][\deE.]*/)
	.rule("string", /(?<!\\)".*"/)
	.rule("template literal", /(?<!\\)`.*`/)
	.rule("preprocessor directive", /#|\bdefine\b/)
	.rule("keyword", /\bfor\b|\bwhile\b|\bif\b|\belse\b|\bwhen\b|\bemits?\b|\bdefer\b|\blocal\b|\bconst\b|\bovert\b|\bdefine\b|\bfunction\b|\btype\b|\bclass\b|\bthis\b|\busing\b|\bexists\b|\bthrow\b|\breturn\b|\bnew\b|\bdelete\b|\btypeof\b|\binstanceof\b|\bin\b|\bof\b/)
	.rule("identifier", /[a-zA-Z_$][\w$]*/);

const preprocessor = new Preprocessor()
	.set("directive start", /#|define/)
	.set("directive end", /[;}]/)
	.set("verifier", directive => {
		directive.expect("preprocessor directive", "define")
			.optional("type annotation")
			.expect("identifier")
			.expect("operator", "=")
			.expect(/operator|identifier|number|string|punctuation/)
			.until("expression terminator");
	});

const parser = new Parser();

const compiler = new Compiler();

const plugin = new ProcessorPlugin();

const input = require("fs").readFileSync("./test.odd", "utf8");

new Processor()
	.set("lexer", lexer)
	.set("preprocessor", preprocessor)
	.set("parser", parser)
	.set("compiler", compiler)
	.use(plugin)
	.process(input)
	.then(console.log)
	.catch(console.error);