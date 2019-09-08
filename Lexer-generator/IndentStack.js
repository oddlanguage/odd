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
		while (!comparison()) {
			let tmp = this.pop();
			if (typeof forEach === "function")
				forEach(tmp);
		}
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

	includesLargerThan (value) {
		return this._stack.slice().reverse().some(i => i > value);
	}
}