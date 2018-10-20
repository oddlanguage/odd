const chalk = require("chalk");

module.exports = class CustomError {
	constructor (type, message) {
		this.message = `${chalk.underline(type)}: ${message}`;
	}

	toString () {
		return this.message;
	}
}