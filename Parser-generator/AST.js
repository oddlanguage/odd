"use strict";
"hide implementation";

const covert = require("../helpers/private.js");
const inspect = require("../helpers/inspect.js");
const seqId = require("../helpers/ID.js").seq;
const astSelectorLexer = require("./astSelectorLexer.js");

module.exports = class AST {
	static from (treelike) {
		return new AST(treelike);
	}

	constructor (treelike) {
		covert(this, "_id", seqId());
		covert(this, "_parent", null);
		covert(this, "_root", null);
		covert(this, "_siblingIndex", null);
		this.type = treelike.type;
		this.label = treelike.label || "";
		this.lexeme = treelike.lexeme || "";
		this.line = treelike.line || null;
		this.column = treelike.column || null;
		this.children = (treelike.children || [])
			.map(child => AST.from(child))
			.map((child, i) => (child._parent = this, child._siblingIndex = i, child));
	}

	flatten (node = this) {
		const nodes = [node];
		if (node.children)
			for (const child of node.children)
				nodes.push(...this.flatten(child));
		return nodes;
	}

	*[Symbol.iterator]() {
		for (const node of this.flatten())
			yield node;
	}

	get root () {
		if (this._root)
			return this._root;
		let target = this;
		let parent = this._parent;
		while (parent) {
			target = target._parent;
			parent = target._parent;
		}
		return this._root = target;
	}

	get parent () {
		return this._parent;
	}

	select (selector, all = false) {
		const grammar = astSelectorLexer.lex(selector);
		const options = [[]];
		for (const token of grammar) {
			switch (token.type) {
				case "comma":
					options.push([]);
					continue;
			}
			options[options.length - 1].push(token);
		}
		inspect(options);

		const allMatches = [];
		for (const option of options) {
			const matches = [];
			nextSelector:for (const selector of option) {
				for (const childCursor in this.children) {
					const node = this.children[childCursor];
					const lookahead = this.children[childCursor + 1];
					const lookbehind = this.children[childCursor - 1];
					switch (selector.type) {
						case "anything": {
							matches.push(node);
							continue nextSelector;
						}
						case "lexeme": {
							if (node.lexeme === selector.lexeme.slice(1, -1)) // Remove ""
								matches.push(node);
							continue nextSelector;
						}
						case "type": {
							if (node.type === selector.lexeme)
								matches.push(node);
							continue nextSelector;
						}
						case "label": {
							if (node.label === selector.lexeme.slice(1)) // Remove .
								matches.push(node);
							continue nextSelector;
						}
						case "following": {
							throw `if (matches[matches.length - 1]._siblingIndex === parse(lookahead)._siblingIndex + 1)`;
						}
						case "preceding": {
							throw `if (matches[matches.length - 1]._siblingIndex > parse(lookahead)._siblingIndex)`;
						}
						case "parent": {
							throw `if (parse(lookahead).parent._id === matches[matches.length - 1]._id)`;
						}
						case "child": {
							throw `if (matches[matches.length - 1].children.contains(parse(lookahead)))`;
						}
						default: {
							throw new Error(`${selector.type} ("${selector.lexeme}") selectors aren't implemented (yet).`)
						}
					}
				}
			}
			allMatches.push(...matches);
		}

		return allMatches;
	}

	selectAll (selector) {
		return this.select(selector, true);
	}

	clone () {
		console.warn(`AST.clone is not yet implemented.`);
		return this;
	}

	map (fn) {}

	filter (fn) {}

	forEach (fn) {
		const clone = this.clone();
		let i = 0;
		for (const node of this)
			fn(node, i++, clone);
		return this;
	}
}