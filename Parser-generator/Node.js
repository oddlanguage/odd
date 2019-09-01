"use strict";
"hide implementation";

const NodeList = require("./NodeList.js");

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

	static hasLabel (target) {
		if (target.label)
			return true;
		if (target.children)
			for (const child of (target.children))
				if (ParserMatch.hasLabel(child))
					return true;
		return false;
	}

	static flatten (target) {
		while ((target.children||[]).length === 1) {
			if (target.label)
				target.children[0].label = target.label;
			target = target.children[0];
		}
		return target;
	}

	static filter (target) {
		if (target.label)
			return target;
		if (target.children)
			target.children = target.children.filter(child => ParserMatch.hasLabel(child));
		return target;
	}

	normalise () {
		// TODO: This almost works, need to filter
		//	semicolons from (expression .semicolon)*
		function normalise (root) {
			for (const i in root.children) {
				normalise(root.children[i]);
				root.children[i] = ParserMatch.flatten(root.children[i]);
				root.children[i] = ParserMatch.filter(root.children[i]);
				root.children[i] = new Node(root.children[i]);
				if (typeof root.children[i].offset === "number")
					delete root.children[i].offset;
			}
			return new Node(root);
		};
		return normalise(this);
	}
}

class Node {
	constructor (properties) {
		Object.assign(this,
			Object.fromEntries(
				Object.entries(properties)));
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