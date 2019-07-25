"use strict";
"hide implementation";

module.exports = class LexicalToken {
	constructor (type, lexeme, line, column) {
		this.type = type;
		this.lexeme = lexeme;
		this.line = line;
		this.column = column;
	}
}