"use strict";
"hide implementation";

const NodeList = require("./NodeList.js");
const inspect = require("../helpers/inspect.js");

const SKIPPED = Symbol("SKIPPED");
class ParserMatch {
	static NO_MATCH = new ParserMatch(0, [], "NOTHING");
	static skip = (n) => new ParserMatch(n, Array(n).fill(SKIPPED).slice(), "SKIPPED");

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
		return this.is("NOTHING");
	}

	isSkipped () {
		return this.is("SKIPPED");
	}

	normalise () {
		// TODO: Remove all tokens without labels.
		const normalised = [];

		function extractLeaf (children) {
			return false;
		}

		if (this.label)
			normalised.push(new Node({
				[this.label]: extractLeaf(this.children)
			}));

		for (const child of this.children)
			if (typeof child.normalise === "function")
				normalised.push(...child.normalise());

		return normalised;
	}
}

class Node {
	constructor (properties) {
		Object.assign(this, properties);
		// this.children = NodeList.from(children);
	}

	//Planned
	//get root () {} //const getParent = node => (node.parent === null) ? node : getParent(node.parent);
	//get parent () {} //null|Node
	//get children () {} //NodeList (not created yet)
	//firstChild () {} //null|Node
	//lastChild () {} //null|Node
	//nthChild (n) {} //null|Node
	//append (node) {} //this
	//prepend (node) {} //this
	//select (selector, { all: false }) {} //Null|Node|NodeList
	//selectAll (selector) { //NodeList
	//	return this.select(selector, { all: true });
	//}
	//remove () {} //this
	//replace (node) {} //node
	//before (...nodes) {} //this
	//after (...nodes) {} //this
}

module.exports = ParserMatch;