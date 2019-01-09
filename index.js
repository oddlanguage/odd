const Processor = require("./Processor");
const Lexer = require("./Lexer");
const Parser = require("./Parser");
const Compiler = require("./Compiler");
const colouriser = require("./OddColouriseCommandLine");

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

require("prototype-extensions/Array");
function lexicalPreprocessor (tokens) {
	function isUnterminated (end) {
		return end === -1;
	}

	function isPlain (rawDefinition) {
		const ignorableTypes = [
			"comment",
			"whitespace"
		];
		const definition = rawDefinition.filter(token => !ignorableTypes.some(toIgnore => token.type.match(toIgnore)));
		console.log(definition);
		const isTyped = definition[1].type === "type declaration";
		const allowedReplacementTypes = [
			"string",
			"template literal",
			"punctuation",
			"operator",
			"builtin",
			"number",
			"literal",
			"identifier"
		];
		//check tokens[pos + isTyped] === ...
		return false;
	}

	function getDefinitions (tokens) {
		return tokens
			.reduceRight((definitions, token, start) => {
				if (token.type === "preprocessor directive" && token.lexeme === "define") {
					const endTokenPosition = tokens
						.slice(start)
						.findIndex(token => token.type === "semicolon" && token.lexeme === ";");
					if (isUnterminated(endTokenPosition)) throw new Error(`Unterminated definition at ${start}.`);
					const end = endTokenPosition + start + 1;
					const count = end - start;
					const definition = tokens.slice(start, end);
					if (isPlain(definition)) definitions.push(tokens.splice(start, count));
				}
				//For some reason yet unknown, line 28 of test.odd
				//	is a giant directive while it should be 1 line.

				return definitions;
			}, []);
	}

	const definitions = getDefinitions(tokens);

	console.log(definitions);
	return tokens;
}

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