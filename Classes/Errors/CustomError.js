module.exports = class CustomError {
	constructor (type, message) {
		this.message = `${type}: ${message}`;
	}

	toString () {
		return this.message;
	}
}