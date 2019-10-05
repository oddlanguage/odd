"use strict";
"hide implementation";

const Lexer = require("../Lexer-generator/Lexer-generator.js");

module.exports = new Lexer()
	.define("name", /[a-zA-Z\-_]+/)
	.ignore("whitespace", /[\r\n\f\v]+/)
	.rule("comma", /\s*,\s*/)
	.rule("op-preceding", /\s*\-\s*/)
	.rule("op-following", /\s*\+\s*/)
	.rule("op-later-sibling", /\s*\~\s*/)
	.rule("op-parent", /\s*\>\s*/)
	.rule("op-child", /\s*\<\s*/)
	.rule("op-ancestor", /[ \t]+/)
	.rule("anything", /\*/)
	.rule("lexeme", /(?<!\\)".*?(?<!\\)"/)
	.rule("label", /\.{name}/)
	.rule("type", /{name}/);