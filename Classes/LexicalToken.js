module.exports = class LexicalToken {
	constructor (type, lexeme) {
		this.type = type;
		this.lexeme = lexeme;
	}
}