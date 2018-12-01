const Asserter = require("./Asserter");
const LexicalToken = require("./LexicalToken");
const chalk = require("chalk");

function LexicalError (message) {
	const lines = message.split("\n");
	const baseIndentation = lines.filter(line => line.length)[0].match(/^[\r\t\f\v ]+/)[0].length;
	return `\n${chalk.underline.redBright("LexicalError:")} `
		+ lines
			.join("\n")
			.replace(new RegExp(`^[\\r\\t\\f\\v ]{1,${baseIndentation}}`, "gm"), "")
			.replace(/^[\r\t\f\v ]*\|<-/gm, "")
			.trim();
}

module.exports = class Lexer extends Asserter {
	constructor () {
		super("lex");
		this.grammars = new Map();
		this.input = null;
	}

	rule (type, grammar) {
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
		return Promise.resolve(this.lexSync());
	}

	lexSync () {
		this.assert("input");

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

				const errorLineString = this.input
					.slice(this.input.slice(0, index).lastIndexOf("\n") + 1)
					.replace(/\n[\s\S]*/, "").trim();

				throw LexicalError(`
					Unknown lexeme \`${lexeme}\` in FILENAME.EXTENSION
						at line ${line}, column ${column}${(lexeme.length > 1) ? " to " + (column + lexeme.length - 1) : ""}.
						
						|<-${errorLineString}
						|<-${" ".repeat(column - 1)}${chalk.redBright("˜".repeat(lexeme.length))}
				`);
			}
		}

		return Promise.resolve(tokens);
	}
}