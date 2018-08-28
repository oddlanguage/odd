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

	getErrorInfo () {
		let lineNumber = 1;
		let column = 0;

		for (let i = 0; i < this.position; i++) {
			if (this.input.charAt(i) === "\n") {
				lineNumber++;
				column = 0;
			} else {
				column++;
			}
		}

		const lines = this.input.split("\n");
		const line = lines[lineNumber - 1];

		return {line: line, lineNumber: lineNumber, column: column};
	}

	is (...args) {
		const output = [];
		for (const input of args) {
			if (typeof input === "string") {
				output.push(this.value === input);
				continue;
			}
			if (input instanceof RegExp) {
				output.push(input.test(this.value));
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