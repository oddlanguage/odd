"use strict";

export default class Tree {
	
	constructor (type, children) {
		this.type = type;
		this.children = children;
	}

	static from (target) {
		if (!(target.type && target.children))
			throw `Cannot create Tree from object without type and children.`;

		return new Tree(
			target.type,
			target.children.map(child => (child.children)
				? Tree.from(child)
				: child));
	}

	filter (predicate) {

		// while any children do not statisfy predicate:
		//	for every child that does not statisfy predicate:
		//		insert child.children into this.children
		//		remove child from this.children

		// TODO: The enclosing while loop seems superfluous.
		//	Wouldn't this algorithm visit all children?

		while (true) {
			if (this.children.every(predicate))
				break;

			const newChildren = [];
			for (const node of this.children) {
				if (node instanceof Tree && predicate(node)) {
					newChildren.push(node);
					continue;
				}

				newChildren.push(...node.children);
			}
			this.children = newChildren;
		}

		for (const branch of this.children.filter(node => node instanceof Tree)) {
			branch.filter(predicate);
		}

		return this;
	}

}