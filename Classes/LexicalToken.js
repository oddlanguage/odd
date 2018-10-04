const LexicalError = require("./Errors/LexicalError");

class LexicalTokenPosition {
	constructor (position, token) {
		this.start = position.start;
		this.end = position.end;
		const shouldThrow = [this.start, this.end].some(val => (val === undefined) || (val < 0));
		if (shouldThrow) throw new LexicalError(`${token} has an invalid position.\n  ${this}`);
	}

	toString () {
		return `LexicalTokenPosition{${this.start}, ${this.end}}`;
	}
}

module.exports = class LexicalToken {
	constructor (type, lexeme, position) {
		this.type = type;
		this.lexeme = lexeme;
		if (position) this.position = new LexicalTokenPosition(position, this);
	}

	toString () {
		return `LexicalToken[${this.type}: "${this.lexeme}"]`;
	}
}