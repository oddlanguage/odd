"use strict";

import { unique } from "../util.js";

export default class Rule {

	static types = {
		define: 0,
		ignore: 1,
		rule : 2
	};

	// TODO: What if a pattern references a ceapture group? ['""].+?(\1)
	static compile (name, pattern, type, rules) {
		if (typeof pattern === "string")
			pattern = new RegExp(pattern.replace(/./g, char => `\\${char}`));
		const flags = [...pattern.flags];
		const newPattern = pattern.source.replace(/\{[a-z]+\}/g, match => {
			const name = match.slice(1, -1);
			const pattern = rules.get(name).pattern;
			if (!pattern)
				throw new Error(`Cannot insert unknown rule "${name}".`);
			flags.push(pattern.flags);
			return `(?:${pattern.source})`;
		});
		return new Rule(name, new RegExp(newPattern, unique(flags).join("")), type);
	}

	constructor (name, pattern, type) {
		this.name = name;
		this.pattern = pattern;
		this.type = type;
	}

}