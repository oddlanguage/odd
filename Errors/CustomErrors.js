const chalk = require("chalk");
require("prototype-extensions/String");

class CustomError {
	constructor (message, filename, position, extra) {
		this.message = ("\t"+message).dedent().trim();
		this.filename = filename || "no file provided";
		this.position = position || {line: NaN, column: NaN};
		this.extra = extra || "";
	}

	toString () {
		return "\n " + chalk` {bgRgb(122,25,25)  ${this.constructor.name}: } ${this.message}
		|<-  {gray -} {yellowBright ${this.filename}} at line ${chalk`{magentaBright ${this.position.line}}`}, column ${chalk`{magentaBright ${this.position.column}}`}.

		${this.extra && this.extra + "\n"}`.dedent();
	}
}

class LexicalError extends CustomError {
	constructor (...args) {
		super(...args);
	}
}

class PreprocessingError extends CustomError {
	constructor (...args) {
		super(...args);
	}
}

module.exports = {
	LexicalError: LexicalError,
	PreprocessingError: PreprocessingError
};