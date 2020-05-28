"use strict";

import Lexer from "../Lexer/Lexer.js";

export default new Lexer()
	.ignore("whitespace",  /\s+/)
	.ignore("comment",     /\/\/[^\n]*/)
	.rule("string",        /`[^`]*(?<!\\)`/)
	.rule("keyword",       /\?|class|fun|for|in|while|->|if|else|is|static|var|overt|readonly|break|continue|import|from|export|return|await|defer|and|or|not|yield|exists|throw|where/)
	.rule("operator",      /\.\.\.|[@*=\-+%^/\.!|&><]/)
	.rule("literal",       /nothing|infinity|true|false/)
	.rule("interpunction", /[\(\)\[\],:;]/)
	.rule("indent",        /{/)
	.rule("dedent",        /}/)
	.rule("number",        /(?:\d+(?:,\d+)*)*\.\d+(?:[eE][+-]?\d+)?|(?:\d+(?:,\d+)*)+/)
	.rule("identifier",    /[a-zA-Z]+(?:-[a-zA-Z0-9]+)*/);