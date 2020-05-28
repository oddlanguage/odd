"use strict";

import Tree from "./Tree.js";

const isUseful = item =>
	!(item instanceof Result) || !(item.type instanceof Symbol) || item.label || item.children.some(isUseful);

export default class Result {

	constructor (ok, type, error, children) {
		this.ok = ok;
		this.type = type;
		this.label = null;
		this.error = error;
		this.children = children;
	}

	static fail (reason) {
		return new Result(false, null, reason, null);
	}

	static success (type, values) {
		return new Result(true, type, null, values);
	}

	ofType (type) {
		this.type = type;
		return this;
	}

	labeled (label) {
		this.label = label;
		return this;
	}

	asTree () {
		return Tree
			.from(this)
			.filter(node => typeof node.type !== "symbol");
	}

}