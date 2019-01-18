const chalk = require("chalk");

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
		case "preprocessor directive":
			return "italic.blueBright";
		case "identifier":
			return "whiteBright";
		case "punctuation":
			return "gray";

		default: return "whiteBright";
	}
}

module.exports = function colourise (tokens) {
	return tokens
		.map(token => (token.type !== "whitespace") ? chalk`{${getChalkColour(token.type)} ${token.lexeme}}` : token.lexeme)
		.join("");
}