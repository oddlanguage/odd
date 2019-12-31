"use strict";
"hide implementation";

const Lexer = require("../../../Lexer-generator/Lexer-generator.js");

module.exports = new Lexer()
	.ignore("whitespace", /\s+/)
	// .ignore("weird-whitespace", /[\r\f\v]+/)
	.ignore("comment", /\/\/[^\n]*/)
	// .rule("newline", /\n/)
	// .rule("tab", /\t+/)
	// .rule("space", / +/)
	.rule("string", /`.*(?<!\\)`/)
	.rule("keyword", /\?|class|fun|for|in|while|->|if|else|is|static|var|overt|readonly|break|continue|import|from|export|return|await|defer|and|or|not|yield|exists|throw/)
	.rule("operator", /\.\.\.|[@*=\-+%^/\.!|&><]|[*=\-+%^/><!|&]=/)
	.rule("literal", /nothing|infinity|true|false/)
	.rule("interpunction", /[\(\)\[\],:;]/)
	.rule("indent", /{/)
	.rule("dedent", /}/)
	.rule("number", /(?:\d+(?:,\d+)*)*\.\d+(?:[eE][+-]?\d+)?|(?:\d+(?:,\d+)*)+/)
	.rule("identifier", /[a-zA-Z]+(?:-[a-zA-Z0-9]+)*/);