module.exports = class Lexer {
	constructor () {
		this.grammars = new Map();
		this.input = null;
	}

	rule (type, grammar) {
		//Register grammar and action
		//Make sure arguments are of correct type
		this.grammars.set(type, grammar);
		return this;
	}

	set (key, value) {
		this[key] = value;
		return this;
	}

	static verifyGrammar (grammar, input, sliceIndex) {
		const toCheck = input.slice(sliceIndex);
		const check = (toCheck.match(grammar)||{});
		const {index} = check;
		console.log(toCheck, grammar, index);
		if (index !== 0) return false;
		const [match] = check;
		return match;
	}

	lex () {
		this.assert("input");
		//Go through input and create LexicalTokens

		const tokens = [];
		let line = 1;
		let column = 1;
		let shouldContinue = false;
		let index = 0;

		function getPosition (input, index) {
			let i = 0;
			while (i++ < index) {
				if (input.charAt(i) === "\n") {
					line++;
					column = 1;
				} else {
					column++;
				}
			}
			return {line, column};
		}

		while (index < this.input.length) {
			for (const [type, grammar] of this.grammars) {
				//Check if any grammar is found
				const lexeme = Lexer.verifyGrammar(grammar, this.input, index);
				if (lexeme !== false) {
					tokens.push({
						type: type,
						lexeme: lexeme,
						position: {
							start: index,
							end: index + lexeme.length
						}
					});
					index += lexeme.length;
					shouldContinue = true;
				}
			}

			if (shouldContinue) {
				shouldContinue = false;
				continue;
			} else {
				//Match all existing grammars to the remaining characters and give back only that part instead of the rest of the input.
				const {line, column} = getPosition(this.input, index);
				throw `Unknown lexeme \`${this.input.slice(index)}\`\n  at line ${line}, column ${column - 1}.\n`;
			}
		}

		console.log(tokens);
		return Promise.resolve(tokens);
	}

	assert (property, severity = "error") {
		//Assert that this[property] exists, and it is a usable value.
		//If not, ignore, warn or error depending on severity of property's absence.
		if (this.hasOwnProperty(property) && this[property] !== null) return this;
		switch (severity) {
			case 0: case "ignore": {
				return this;
			}
			case 1: case "warn": {
				console.log(`Expected '${property}', trying to lex without...`);
				return this;
			}
			case 2: case "error": {
				throw new Error(`Cannot lex without a ${property}.`);
			}
		}
	}
}