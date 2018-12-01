require("clarify");
const chalk = require("chalk");
const Lexer = require("./Lexer");

const lexer = new Lexer()
	.rule("whitespace", /\s+/)
	.rule("storage", /\b(const|local|type|function)\b/)
	.rule("builtin", /Function|class|interface|Array|Object|String|Boolean|Number/)
	.rule("literal", /\b(true|false|nil|null|undefined)\b|[\d.][\deE.]*/)
	.rule("type", /[\[{]?\w+?[<\[{]?\S*[>\]}]?:/)
	.rule("stringlike", /((?<!\\)".*")|(?<!\\)`.*`/)
	.rule("comment", /\/\/[^\n]*|\/\*[^*]*?\*\//)
	.rule("operator", /[.=+\-/*%^~<>?&|!:]/)
	.rule("any", /.+?/);

module.exports = function colourise (string) {
	const tokens = [];
	(async () => {
		await lexer
			.input(string)
			.lex()
			.then(tokens.concat);
	})();

	return tokens.join(",");
}