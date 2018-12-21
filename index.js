const Processor = require("./Processor");
const Lexer = require("./Lexer");
const Parser = require("./Parser");
const Compiler = require("./Compiler");

const lexer = new Lexer();
lexer
	.set("error lexer", lexer)
	.set("colouriser", require("./OddColouriseCommandLine"))
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
	.rule("storage modifier", /\b(extends|overt)\b/)
	.rule("builtin", /\b(Function|Array|Object|String|Boolean|Number|Math|Error)\b/)
	.rule("number", /\b\d*\.?\d+(?:[Ee][+-]?\d+)?/)
	.rule("literal", /\b(true|false|nil|null|undefined)\b/)
	.rule("identifier", /[a-zA-Z_$][\w$]*/);

const parser = new Parser();
const compiler = new Compiler();

function preprocessor () {
	const start = "preprocessor directive";
	const end = /expression terminator|block end/;

	return function transformer (AST) {
		//Find node which type conforms to start
		//Verify directive through to end
		//Handle directive
		return AST;
	}
}

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

new Processor()
	.set("lexer", lexer)
	.set("parser", parser)
	.set("compiler", compiler)
	.use(preprocessor)
	.process(input)
	.then(console.log)
	.catch(err => console.error(err.toString()));