"use strict";
"hide implementation";

const Lexer = require("../Lexer-generator/Lexer-generator.js");

module.exports = new Lexer()
	.define("name", /[a-zA-Z\-]+/)
	.ignore("whitespace", /\s+/)
	.rule("lexeme", /(?<!\\)".*?(?<!\\)"/)
	.rule("assignment", /-+>|:{0,2}=/)
	.rule("semicolon", /;/)
	.rule("or", /\|/)
	.rule("not", /!/)
	.rule("zero-or-more", /\*/)
	.rule("one-or-more", /\+/)
	.rule("optional", /\?/)
	.rule("open-acco", /\{/)
	.rule("number", /\d+/)
	.rule("comma", /,/)
	.rule("close-acco", /\}/)
	.rule("open-paren", /\(/)
	.rule("close-paren", /\)/)
	.rule("label", /{name}:/)
	.rule("type", /\.{name}/)
	.rule("subrule", /{name}/);