"use strict";

const AST = require("../Parser-generator/AST.js");

module.exports = class IRGenerator {
	
	constructor () {
		this._instructions = new Map();
	}

	reduce (node) {
		if (this._instructions.has(node.type))
			return; // Specifiy how to get the correct value
		throw `No rule defined for type "${node.type}"`;
	}

	define (nodeType, handler) {
		// Register handler, but only make it callable from "reduce" (or within a rule definition?)
		return this;
	}

	rule (nodeType, handler) {
		this._instructions.set(nodeType, handler);
		return this;
	}

	generate (ast) {
		const output = [];
		for (const node of ast.selectAll("*"))
			if (this._instructions.has(node.type))
				output.push(this._instructions.get(node.type)(node))
		return output.join("\n");
	}

}