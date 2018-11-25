const LexicalToken = require("./LexicalToken");
const chalk = require("chalk");

function dedent (string) {
	//Split the string up into lines.
	const lines = string.split("\n");
	//Get the amount of indentation characters from the first line.
	const baseIndentation = lines.filter(line => line.length)[0].match(/^[\r\t\f\v ]+/)[0].length;
	//Replace the indentation and join the lines again.
	//Also replace ALL indentation followed by "|<-"
	return lines
		.join("\n")
		.replace(new RegExp(`^[\\r\\t\\f\\v ]{1,${baseIndentation}}`, "gm"), "")
		.replace(/^[\r\t\f\v ]*\|<-/gm, "");
}

module.exports = class Lexer {
	constructor () {
		this.grammars = new Map();
		this.input = null;
	}

	rule (type, grammar) {
		//Register grammar and action
		//Make sure arguments are of correct type
		if (!(grammar instanceof RegExp)) {
			grammar = new RegExp(grammar.replace(/(?<!\\)[\[\]\(\)]/, "\\$&"));
		}
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
		if (index !== 0) return false;
		const match = check[check.length - 1]; //Get the last match to support pairs in grammar rules.
		return match;
	}

	lex () {
		this.assert("input");
		//Go through input and create LexicalTokens

		const tokens = [];
		let line = 1;
		let column = 0;
		let shouldContinue = false;
		let index = 0;

		function getPosition (input, index) {
			let i = 0;
			while (i++ < index) {
				if (input.charAt(i) === "\n") {
					line++;
					column = 0;
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
					tokens.push(new LexicalToken(type, lexeme, index, index + lexeme.length));
					index += lexeme.length;
					shouldContinue = true;
				}
			}

			if (shouldContinue) {
				shouldContinue = false;
				continue;
			} else {
				const {line, column} = getPosition(this.input, index);

				let lexeme = this.input.slice(index);

				for (const [, grammar] of this.grammars) {
					lexeme = lexeme.replace(new RegExp(grammar, "g"), "");
				}

				//Find correct line and trim it
				//TODO: Colourise tokens that are found in lineString
				const lineString = this.input
					.slice(this.input.slice(0, index).lastIndexOf("\n") + 1)
					.replace(/\n[\s\S]*/, "").trim();

				throw dedent(`
					Unknown lexeme \`${lexeme}\` in FILENAME.EXTENSION
						at line ${line}, column ${column}${(lexeme.length > 1) ? " to " + (column + lexeme.length - 1) : ""}.
						
						|<-${lineString}
						|<-${" ".repeat(column - 1)}${chalk.redBright("˜".repeat(lexeme.length))}
				`).trim();
			}
		}

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