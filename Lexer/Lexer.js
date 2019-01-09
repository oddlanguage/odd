const assert = require("../assert");
const LexicalToken = require("./LexicalToken");
const chalk = require("chalk");
const {LexicalError} = require("../Errors/CustomErrors");

module.exports = class Lexer {
	constructor () {
		this.grammars = new Map();
		this.input = null;
		this.colouriser = tokens => tokens.map(token => token.lexeme).join("");
		this["error lexer"] = this;
	}

	rule (type, grammar) {
		if (!(grammar instanceof RegExp)) {
			grammar = new RegExp(grammar.replace(/\W/, "\\$&"));
		}
		this.grammars.set(type, grammar);
		return this;
	}

	set (name, value) {
		this[name] = value;
		return this;
	}

	static verifyGrammar (grammar, input, sliceIndex) {
		const toCheck = input.slice(sliceIndex);
		const check = (toCheck.match(grammar)||{});
		const {index} = check;
		if (index !== 0) return false;
		const match = check[0]; //Get the first match to support pairs in grammar rules.
		return match;
	}

	lex (input) {
		assert(input !== null, "Input must be defined in order to lex!");

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

		while (index < input.length) {
			for (const [type, grammar] of this.grammars) {
				const lexeme = Lexer.verifyGrammar(grammar, input, index);
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
				const {line, column} = getPosition(input, index);

				let lexeme = input.slice(index);

				for (const [, grammar] of this.grammars) {
					lexeme = lexeme.replace(new RegExp(grammar, "g"), "");
				}

				let errorLineString = input
					.slice(input
						.slice(0, index)
						.lastIndexOf("\n") + 1)
					.replace(/\n[\s\S]*/, "")
					.trim();

				assert(this["error lexer"] !== null, "Cannot colourise lexical error without an 'error lexer'.", "warn");
				if (this["error lexer"]) {
					assert(this["colouriser"] !== null, "Cannot colourise lexical error without a 'colouriser'.");
					errorLineString = this.colouriser(
						this["error lexer"]
							.rule("error", lexeme)
							.lex(errorLineString)
					);
				}

				throw new LexicalError(`Unknown lexeme ${chalk`{italic \`${lexeme}\`}`}`,
					"FILENAME.EXT",
					{line: line, column: column},
					`|<-${errorLineString}\n|<-${" ".repeat(Math.max(1, column - 1))}${chalk.redBright("˜".repeat(lexeme.length))}`);
			}
		}

		return tokens;
	}
}