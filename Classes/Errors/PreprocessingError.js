const CustomError = require("./CustomError");

//Extend the error to log more data

module.exports = class LexicalError extends CustomError {
	constructor (message) {
		super("PreprocessingError", message);
	}
}