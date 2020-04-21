"use strict";

import Tree from "./Tree.js";
import Util from "util";

export default class Result extends Tree {

	constructor (ok, type, error, children) {
		super(children);
		this.ok = ok;
		this.type = type;
		this.label = null;
		this.error = error;
	}

	static fail (reason) {
		return new Result(false, null, reason, null);
	}

	static success (type, value) {
		return new Result(true, type, null, value);
	}

	ofType (type) {
		this.type = type;
		return this;
	}

	labeled (label) {
		this.label = label;
		return this;
	}

}