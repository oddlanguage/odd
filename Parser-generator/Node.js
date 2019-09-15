"use strict";
"hide implementation";

const NodeList = require("./NodeList.js");
const inspect = require("../helpers/inspect.js");

function mapTree (root, fn) {
	function flattenTree (node) {
		const arr = [node];
		if (node.children)
			for (const child of node.children)
				arr.push(...flattenTree(child));
		return arr;
	}

	for (const node of flattenTree(root))
		fn(node)

	return root;
}

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
		this.parent = null;
		this.children = children
			.map(child => (child.parent = this, child));
	}

	is (value) {
		return this.type === value;
	}

	isNothing () {
		return this.is(NOTHING);
	}

	normalise () {
		mapTree(this, (node) => ((node.children||[]).length === 1)
			? (node.children = node.children[0].children, node)
			: node);
		inspect(this);
		return this;
	}
}

class Node {
	constructor (properties) {
		Object.assign(this,
			Object.fromEntries(
				Object.entries(properties))); //Copy to prevent referencing
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