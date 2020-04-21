"use strict";

export default class Location {

	constructor (line, char) {
		this.line = line;
		this.char = char;
	}

	toString () {
		return `line ${this.line}, char ${this.char}`;
	}

}