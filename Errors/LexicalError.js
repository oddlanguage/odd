const chalk = require("chalk");
const CustomError = require("./CustomError");

module.exports = class LexicalError extends CustomError {
	constructor (message) {
		super();
		const lines = message.split("\n");
		const baseIndentation = lines.filter(line => line.length)[0].match(/^[\r\t\f\v ]+/)[0].length;
		this.message = lines
				.join("\n")
				.replace(new RegExp(`^[\\r\\t\\f\\v ]{1,${baseIndentation}}`, "gm"), "")
				.replace(/^[\r\t\f\v ]*\|<-/gm, "")
				.trim();
	}
}