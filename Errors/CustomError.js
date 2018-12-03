const chalk = require("chalk");

module.exports = class CustomError {
	toString () {
		return chalk`\n {bgRgb(122,25,25)  ${this.constructor.name}: } ` + this.message;
	}
}