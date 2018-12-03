const chalk = require("chalk");
require("prototype-extensions/String");

class CustomError {
	constructor (message) {
		const lines = message.split("\n");
		this.message = lines
				.join("\n")
				.dedent()
				.trim();
	}

	toString () {
		return chalk`\n {bgRgb(122,25,25)  ${this.constructor.name}: } ` + this.message;
	}
}

class LexicalError extends CustomError {
	constructor (message) {
		super(message);
	}
}

class PreprocessingError extends CustomError {
	constructor (message) {
		super(message);
	}
}

module.exports = {
	LexicalError: LexicalError,
	PreprocessingError: PreprocessingError
};