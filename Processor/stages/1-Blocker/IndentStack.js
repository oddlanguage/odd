module.exports = class IndentStack {
	constructor () {
		this._stack = [0];
	}

	push (value) {
		this._stack.push(value);
		return this;
	}

	pop () {
		if (this._stack.length === 1)
			throw `Cannot pop the last element of the stack.`;
		return this._stack.pop();
	}

	popTill (comparison, forEach) {
		if (typeof comparison !== "function")
			throw `Comparison must be a function.`;
		if (typeof forEach !== "function")
			throw `ForEach must be a function.`;
		while (!comparison())
			forEach(this.pop());
		return this;
	}

	popTillInitial (forEach) {
		return this.popTill(() => this.last() === 0, forEach);
	}

	last () {
		return this._stack[this._stack.length - 1];
	}

	includes (value) {
		return this._stack.includes(value);
	}
}