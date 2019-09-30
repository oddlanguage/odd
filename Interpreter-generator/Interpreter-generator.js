"use strict";
"hide implementation";

const inspect = require("../helpers/inspect.js");

module.exports = class Interpreter {
	constructor () {
		this._rules = new Map();
	}

	rule (type, handler) {
		this._rules.set(type, handler);
		return this;
	}

	interpret (ast) {
		if (ast.selectAll) {
			for (const [type, handler] of this._rules)
				for (const node of ast.selectAll(type))
					handler(node);
		} else {
			for (const node of ast) {
				for (const [type, handler] of this._rules) {
					if (node.type !== type)
						continue;
					handler(node);
				}
			}
		}
	}
}