const Asserter = require("./Asserter");
const chalk = require("chalk");
const {PreprocessingError} = require("./Errors/CustomErrors");


function stringifyRegex (regex) {
	return (regex instanceof RegExp)
		? String(regex)
			.replace(/^\/|\/$/g, "")
			.replace(/([^\\])\|/g, "$1 or ")
			.replace(/\.\+/, "")
		: regex;
}

/*
	USE DEFAULT /.+/ FOR ARGUMENTS IN OPTIONAL, EXPECT AND UNTIL INSTAED OF IMMENSE IF STATEMENTS.
*/

module.exports = class PreprocessorDirective extends Asserter {
	constructor (start, tokens) {
		super("verify directive");
		this.start = start;
		this.tokens = tokens.filter(token => token.type !== "whitespace");
		this.index = 0;
		this.expectation = null;
	}

	optional (expectedType = /.+/, expectedLexeme = /.+/) {
		try {
			return this.expect(expectedType, expectedLexeme);
		} catch {
			return this;
		}
	}

	expect (expectedType = /.+/, expectedLexeme = /.+/) {
		const errTypeStr = stringifyRegex(expectedType);
		const errLexemeStr = stringifyRegex(expectedLexeme);

		const token = this.tokens[this.index];

		if (!token.type.match(expectedType) || !token.lexeme.match(expectedLexeme)) throw new PreprocessingError(`
			Expected ${errTypeStr}${(errLexemeStr) ? ` '${errLexemeStr}'` : ""}, but got ${token.type} '${token.lexeme}'
				in FILENAME.EXTENSION
				at line LINENO, column COLUMNNO. start ${token.start} end ${token.end}
				
				|<-LINE
				|<-${" ".repeat(0 /* SHOULD BE COLUMN */)}${chalk.redBright("˜".repeat(token.lexeme.length))}
		`);

		this.expectation = [expectedType, expectedLexeme];
		this.index++;
		return this;
	}

	until (expectedType = /.+/, expectedLexeme = /.+/) {
		this.assert("expectation");

		const errTypeStr = stringifyRegex(expectedType);
		const errLexemeStr = stringifyRegex(expectedLexeme);

		//copy "root" token to refer to when throwing error.
		const root = this.tokens[this.index - 1];

		//while token.type and token.lexeme don't match expectedType and expectedLexeme, get next token.
		let token = this.tokens[this.index];
		while (this.index < this.tokens.length) {
			token = this.tokens[this.index];
			if (!token.type.match(this.expectation[0]) || !token.lexeme.match(this.expectation[1])) { //If previous expectation is not found
				if (!token.type.match(expectedType) || (expectedLexeme && !token.lexeme.match(expectedLexeme))) { //If until expectation is not found
					throw new PreprocessingError(`
						Expected ${errTypeStr}${(errLexemeStr) ? ` '${errLexemeStr}'` : ""} somewhere after ${root.type} '${root.lexeme}', but got ${token.type} '${token.lexeme}'
							in FILENAME.EXTENSION
							at line LINENO, column COLUMNNO. start ${root.start} end ${root.end}
							
							|<-LINE
							|<-${" ".repeat(0 /* SHOULD BE COLUMN */)}${chalk.redBright("˜".repeat(root.lexeme.length))}
					`);
				} else {
					return this;
				}
			} else {
				this.index++;
				continue;
			}
		}
	}
}