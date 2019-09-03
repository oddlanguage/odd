"use strict";
"hide implementation";

module.exports = class LexicalToken {
	constructor (type, lexeme = null, line = null, column = null) {
		this.type = type;
		this.lexeme = lexeme;
		this.line = line;
		this.column = column;
	}

	toString () {
		return `LexicalToken { type: ${this.type}, lexeme: ${this.lexeme} }`;
	}
}