module.exports = class LexerGrammar {
	constructor (grammar, action) {
		//if grammar is regex, make it a string, decide what to do with flags.
		//register action
		this.grammar = grammar;
		this.action = action;
	}
}