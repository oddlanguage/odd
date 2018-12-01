const chalk = require("chalk");
const Lexer = require("./Lexer");

const lexer = new Lexer()
	.rule("whitespace", /\s+/)
	.rule("single line comment", /\/\/[^\n]*/)
	.rule("multi line comment", /\/\*[^*]*?\*\//)
	.rule("expression terminator", ";")
	.rule("punctuation", /[,\[\]\(\)}{]/)
	.rule("type annotation", /[\[{]?\w+?[<\[{]?\S*[>\]}]?:/)
	.rule("operator", /[.=+\-/*%^~<>?&|!:]|\b(new|exists|instanceof|typeof)\b/)
	.rule("controller", /\b(return|emits?|if|when|while|then|or|and|else|continue|throw|using)\b/)
	.rule("string", /(?<!\\)".*"/)
	.rule("template literal", /(?<!\\)`.*`/)
	.rule("preprocessor directive", /#|\bdefine\b/)
	.rule("storage type", /\b(const|local|type|function|class|interface)\b/)
	.rule("storage modifier", /\b(extends|overt)\b/)
	.rule("builtin", /\b(Function|Array|Object|String|Boolean|Number|Math|Error)\b/)
	.rule("number", /\W(\d*\.?\d+(?:[Ee][+-]?\d+)?)/)
	.rule("literal", /\b(true|false|nil|null|undefined)\b/)
	.rule("identifier", /[a-zA-Z_$][\w$]*/);

function getChalkColour (type) {
	switch (type) {
		case "single line comment":
		case "multi line comment":
			return "gray";
		case "type annotation":
			return "underline.greenBright";
		case "operator":
		case "controller":
			return "redBright";
		case "number":
		case "literal":
			return "magentaBright";
		case "string":
		case "template literal":
			return "yellowBright";
		case "storage type":
		case "builtin":
			return "italic.blueBright";
		case "identifier":
			return "whiteBright";
		case "punctuation":
			return "gray";

		default: throw new Error(`Forgot to add a colour for type "${type}", did ya?`);
	}
}

module.exports = function colourise (string) {
	return lexer
		.set("input", string)
		.lexSync()
		.map(token => (token.type !== "whitespace") ? chalk`{${getChalkColour(token.type)} ${token.lexeme}}` : token.lexeme)
		.join("");
}