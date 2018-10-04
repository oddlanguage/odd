const Cursor = require("./Cursor");

module.exports = class Character {
	constructor (input, cursor) {
		this.input = input;
		this.cursor = cursor;
	}

	get position () {
		return this.cursor.position;
	}

	get value () {
		return this.input[this.position];
	}

	is (...args) {
		const output = [];
		for (const input of args) {
			if (input instanceof RegExp) {
				output.push(input.test(this.value));
				continue;
			}
			if (typeof input === "string") {
				output.push(this.value === input);
				continue;
			}
			if (input instanceof Map) {
				for (const [ _, pattern ] of input) {
					output.push(this.is(pattern));
				}
				continue;
			}
			throw new TypeError(`"${input.constructor.name}" is an illegal type (${input}).`);
		}
		return output.some(x => x === true);
	}

	next (count = 1) {
		return new Character(this.input, new Cursor(this.position + count));
	}

	previous (count = 1) {
		return new Character(this.input, new Cursor(this.position - count));
	}
}