"use strict";
"hide implementation";

const inspect = require("../helpers/inspect.js");

const GROUP = Symbol("GROUP");
const NOTHING = Symbol("NOTHING");
module.exports = class ParserMatch {
	static GROUP = GROUP;
	static NOTHING = NOTHING;
	static NO_MATCH = new ParserMatch(0, [], NOTHING);

	constructor (offset = 0, children = [], type) {
		this.type = type;
		this.label = "";
		this.offset = offset;
		this.children = children;
	}

	is (value) {
		return this.type === value;
	}

	isNothing () {
		return this.is(NOTHING);
	}
}