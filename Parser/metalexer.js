"use strict";

import Lexer from "../Lexer/Lexer.js";

export default new Lexer()
	.ignore("whitespace", /\s+/)
	.rule("lexeme", /".*(?<!\\)"/)
	.rule("subrule", /[a-z-A-Z][a-z-A-Z-]*/)
	.rule("label", /{subrule}:/)
	.rule("type", /\.{subrule}/)
	.rule("alternative", "|")
	.rule("quantifier", /[\*\+\?]/)
	.rule("quantifier-start", "{")
	.rule("number", /\d+/)
	.rule("comma", ",")
	.rule("quantifier-end", "}")
	.rule("invert", "!")
	.rule("group-start", "(")
	.rule("group-end", ")")
	.rule("self", "$");