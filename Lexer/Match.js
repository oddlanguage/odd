"use strict";

import { unique } from "../util.js";

export default class Match {

	static at (name, rule, input, at) {
		const pattern = rule.pattern;
		const flags = unique(pattern.flags + "y").join("");
		const regex = new RegExp(pattern, flags);
		regex.lastIndex = at;
		const match = regex.exec(input);
		return match
			? new Match(name, match[0], rule.type)
			: null;
	}

	constructor (name, match, type) {
		this.name = name;
		this.match = match;
		this.length = match.length;
		this.type = type;
	}

}