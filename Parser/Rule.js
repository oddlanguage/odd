"use strict";

import { enumerable } from "../util.js";

export default class Rule {

	static types = enumerable({
		define: 0,
		ignore: 1,
		rule : 2
	});

	constructor (name, parser, type) {
		this.name = name;
		this.parser = parser;
		this.type = type;
	}

}