"use strict";
"hide implementation";

const covert = require("../helpers/private.js");
const inspect = require("../helpers/inspect.js");
const seqId = require("../helpers/ID.js").seq;
const astQueryLexer = require("./astQueryLexer.js");
const { unique } = require("../helpers/Array");

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

	get siblings () {
		return this.parent.children.filter(child => child !== this);
	}

	select (query, all = false) {
		const splitQueryByComma = (options, selector) => {
			switch (selector.type) {
				case "comma":
					options.push([]);
					return options;
			}
			options[options.length - 1].push(selector);
			return options;
		};

		const groupSelectors = option => option
			.reduce((pairs, selector, i, selectors) => {
				const lookaheads = selectors.slice(i+1, i+3);

				if (selectors.length === 1) {
					pairs[pairs.length - 1].push(selector);
					return pairs;
				}

				if (selectors.length > 2 && i > selectors.length - 3)
					return pairs;

				if (selector.type.startsWith("op-")) {
					pairs.push([]);
					return pairs;
				}

				if (lookaheads[0] && lookaheads[0].type.startsWith("op-")) {
					if (!lookaheads[1])
						throw `Malformed query: missing operand.`;
					else if (lookaheads[1].type.startsWith("op-"))
						throw `Malformed query: expected descriptor but got "${lookaheads[1].type}".`;
					pairs[pairs.length - 1].push(selector, ...lookaheads);
				} else {
					if (!lookaheads[0])
						throw `Malformed query: missing operator.`;
					else if (!lookaheads[0].type.startsWith("op-"))
						throw `Malformed query: expected operator but got "${lookaheads[0].type}".`;
					pairs[pairs.length - 1].push(selector);
				}

				return pairs;
			}, [[]]);

		const selectNode = (selector, target) => {
			switch (selector.type) {
				default:
					throw `Unknown selector "${selector.type}" (${selector.lexeme}).`;
				case "anything":
					return target;
				case "lexeme":
					if (target.lexeme === selector.lexeme.slice(1, 1)) // Remove ""
						return target;
				case "label":
					if (target.type === selector.lexeme.slice(1)) // Remove .
						return target;
				case "type":
					if (target.type === selector.lexeme)
						return target;
			}
		};

		const getCandidates = selector =>
			(candidates, child) => {
				if (selectNode(selector, child))
					candidates.push(child);
				return candidates;
		};

		const getMatches = (selectorGroup, targets) => {
			const isCompositeSelector = (selectorGroup.length > 1);
			const roots = targets
				.map(target => target
					.flatten()
					.reduce(getCandidates(selectorGroup[0]), []))
				.flat();

			if (!isCompositeSelector)
				return roots;

			return roots.reduce((matches, root) => {
				const operator = selectorGroup[1];
				const selector = selectorGroup[2];
				switch (operator.type.slice(3)) { // Remove op-
					default:
						throw `Unknown operator "${operator.type}" (${operator.lexeme}).`;
					case "later-sibling":
					case "preceding":
					case "following":
						matches.push(...root.parent.children.reduce(getCandidates(selector), []));
						break;
					case "parent":
					case "child":
						matches.push(...root.children.reduce(getCandidates(selector), []));
						break;
					case "ancestor":
						matches.push(...unique(root
							.flatten()
							.slice(1) // Skip self
							.reduce(getCandidates(selector), [])));
						break;
				}

				return matches;
			}, []);
		};

		const selectNodes = (matches, option) => {
			matches.push(...option
				.reduce((candidates, selectorGroup) => {
					return getMatches(selectorGroup, candidates);
				}, [this]));
			return matches;
		};

		// Options[Option[SelectorGroup[Selector{}]]]
		const matches = unique(astQueryLexer
			.lex(query)
			.reduce(splitQueryByComma, [[]])
			.map(groupSelectors)
			.reduce(selectNodes, []));

		return (all)
			? matches
			: matches[0];
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