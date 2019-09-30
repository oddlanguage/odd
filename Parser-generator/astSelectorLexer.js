"use strict";
"hide implementation";

const Lexer = require("../Lexer-generator/Lexer-generator.js");

module.exports = new Lexer()
	.define("name", /[a-zA-Z\-_]+/)
	.ignore("whitespace", /\s+/)
	.rule("lexeme", /(?<!\\)".*?(?<!\\)"/)
	.rule("anything", /\*/)
	.rule("following", /\+/)
	.rule("preceding", /\~/)
	.rule("parent", /\>/)
	.rule("child", /\</)
	.rule("comma", /,/)
	.rule("label", /\.{name}/)
	.rule("type", /{name}/);