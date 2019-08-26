"use strict";
"hide implementation";

const NodeList = require("./NodeList.js");

const SKIPPED = Symbol("SKIPPED");
class ParserMatch {
	static NO_MATCH = new ParserMatch(0, [], "NOTHING");
	static skip = (n) => new ParserMatch(n, Array(n).fill(SKIPPED).slice(), "SKIPPED");

	constructor (offset = 0, children = [], type) {
		this.type = type;
		this.label = "";
		this.offset = offset;
		this.children = NodeList.from(children);
	}

	withLabel (label) {
		if (typeof label !== "string")
			return this;
		this.label = label;
		return this;
	}

	hasLabel () {
		return this.label !== "";
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

	flat () {
		this.children = this.children.reduce((root, cur, i) => {
			if (cur instanceof ParserMatch) {
				const flattened = cur.flat().children;
				root.children.splice(i, 1, ...flattened);
			}
			return root;
		}, this).children;
		return this;
	}

	normalise () {
		/* TODO: Remove all tokens without labels.
				Expected output:

		Node {
			type: "program",
			expressions: NodeList [
				Node {
					type: "const-definition",
					annotation: "int:"
					lhs: Node {
						type: "identifier",
						lexeme: "num"
					},
					rhs: Node {
						type: "math-expression",
						operator: "^",
						l: 1,
						r: 2
					}
				}
			]
		}
		*/
		return new Node(this.type, this.children);
	}
}

class Node {
	constructor (type, children) {
		this.type = type;
		this.children = children;
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
	//select (selector) {} //null|Node
	//remove () {} //this
	//replace (node) {} //node
	//before (...nodes) {} //this
	//after (...nodes) {} //this
}

module.exports = ParserMatch;