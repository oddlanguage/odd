module.exports = class LexicalToken {
	constructor (type, lexeme, start, end) {
		this.type = type;
		this.lexeme = lexeme;
		this.start = start;
		this.end = end;
	}
}