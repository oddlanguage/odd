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

	lex () {
		//Go through input and create LexicalTokens
		this.assert("input");

		function getPosition () {
			let lineNumber = 1;
			let column = 1;

			let i = 0;
			while (i++ < position) {
				if (input.charAt(i) === "\n") {
					lineNumber++;
					column = 1;
				} else {
					column++;
				}
			}

			return {line: lineNumber, column: column};
		}

		let line = 1;
		let column = 1;

		let index = 0;
		while (index < this.input.length) {
			for (const [type, grammar] of this.grammars) {
				//
			}
			index += 1;
		}

		return Promise.resolve([]);
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