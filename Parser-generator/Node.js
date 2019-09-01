"use strict";
"hide implementation";

const NodeList = require("./NodeList.js");
const inspect = require("../helpers/inspect.js");

const NOTHING = Symbol("NOTHING");
class ParserMatch {
	static GROUP = Symbol("GROUP");
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

	static flatten (target) {
		while (!target.label && (target.children||[]).length === 1)
			target = target.children[0];
		return target.children || target;
	}

	normalise () {
		for (const i in this.children) {
			const child = this.children[i];
			this.children[i] = ParserMatch.flatten(child);
			if (child.normalise)
				child.normalise();
		}
		return this;
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