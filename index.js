const Processor = require("./Processor");
const Lexer = require("./Lexer");
const Preprocessor = require("./Preprocessor");
const Parser = require("./Parser");
const Compiler = require("./Compiler");
const ProcessorPlugin = require("./ProcessorPlugin");
const colourise = require("./OddColouriseCommandLine");

const lexer = new Lexer();
lexer.rule("whitespace", /\s+/)
	.rule("string", /(?<!\\)".*"/)
	.rule("template literal", /(?<!\\)`.*`/)
	.rule("single line comment", /\/\/[^\n]*/)
	.rule("multi line comment", /\/\*[^*]*?\*\//)
	.rule("expression terminator", ";")
	.rule("punctuation", /[,\[\]\(\)}{]/)
	.rule("type annotation", /[\[{]?\w+?[<\[{]?\S*[>\]}]?:/)
	.rule("operator", /[.=+\-/*%^~<>?&|!:]|\b(new|exists|instanceof|typeof)\b/)
	.rule("controller", /\b(return|emits?|if|when|while|then|or|and|else|continue|throw|using)\b/)
	.rule("preprocessor directive", /#|\bdefine\b/)
	.rule("storage type", /\b(const|local|type|function|class|interface)\b/)
	.rule("storage modifier", /\b(extends|overt)\b/)
	.rule("builtin", /\b(Function|Array|Object|String|Boolean|Number|Math|Error)\b/)
	.rule("number", /\b\d*\.?\d+(?:[Ee][+-]?\d+)?/)
	.rule("literal", /\b(true|false|nil|null|undefined)\b/)
	.rule("identifier", /[a-zA-Z_$][\w$]*/)
	.set("error lexer", lexer)
	.set("colouriser", colourise);

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
	.then(console.log);