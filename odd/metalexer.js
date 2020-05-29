"use strict";

import Lexer from "../Lexer/Lexer.js";

export default new Lexer()
	.ignore("whitespace",           /[ \f\v\t]+/)
	.ignore("comment",              /\/\/.*(\n+|$)/)
	.rule("end",                    /(?:\r*\n){2,}/)
	.ignore("newline",              /(?:\r*\n)+/)
	.rule("lexeme",                 /".*(?<!\\)"/)
	.rule("identifier",             /[a-z-A-Z][a-z-A-Z-]*/)
	.rule("label",                  /{identifier}:/)
	.rule("type",                   /\.{identifier}/)
	.rule("arrow",                  "->")
	.rule("alternative",            /\s*\|/)
	.rule("quantifier",             /[\*\+\?]/)
	.rule("quantifier-start",       "{")
	.rule("number",                 /\d+/)
	.rule("comma",                  ",")
	.rule("quantifier-end",         "}")
	.rule("invert",                 "!")
	.rule("group-start",            "(")
	.rule("group-end",              ")")
	.rule("self",                   "$");