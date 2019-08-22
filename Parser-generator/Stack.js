"use strict";
"hide implementation";

const NOTHING = Symbol("NOTHING");

module.exports = class Stack {
	constructor (initial = NOTHING) {
		this._stack = (initial === NOTHING)
			? []
			: [initial];
	}

	push (value) {
		this._stack.push(value);
		return this;
	}

	pop () {
		return this._stack.pop();
	}

	last () {
		return this._stack[this._stack.length - 1];
	}

	first () {
		return this._stack[0];
	}

	[Symbol.iterator]() {
		return this._stack.values();
	}

	map (fn) {
		this._stack = this._stack.map(fn);
		return this;
	}
}