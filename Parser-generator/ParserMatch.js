"use strict";
"hide implementation";

module.exports = class ParserMatch {
	static NOTHING = Symbol("NOTHING");
	static SKIPPED = Symbol("SKIPPED");
	static NO_MATCH = new ParserMatch(0, ParserMatch.NOTHING);
	static skip = (n) => new ParserMatch(n, SKIPPED);

	constructor (offset = 0, content = null, label = null) {
		this.offset = offset;
		this.content = content;
		this.label = label;
	}

	withName (name) {
		this.name = name;
		return this;
	}

	is (value) {
		return this.content === value;
	}

	isNothing () {
		return this.is(ParserMatch.NOTHING);
	}

	flat () {
		// TODO: Take label into account
		this.content = this.content.reduce((root, cur, i) => {
			if (cur instanceof ParserMatch) {
				const flattened = cur.flat().content;
				root.content.splice(i, 1, ...flattened);
				root.offset += cur.offset - 1;
			}
			return root;
		}, this).content;
		return this;
	}

	build (builder) {
		return builder(this.content);
	}
}