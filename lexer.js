module.exports = class Lexer {
	constructor () {
		this.grammars = new Map();
	}

	use (grammar, action) {
		//Register grammar and action
		this.grammars.set(grammar, action);
	}

	tokenise (input) {
		//Go through input and create LexicalTokens
		return Promise.resolve([]);
	}
}