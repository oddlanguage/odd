import { Token } from "./lexer.js";
import { Leaf, Node } from "./parser.js";

// TODO: Write a select function like tree-sitter's API to work with trees.

const isToken = (leaf: Leaf): leaf is Token =>
	!!(leaf as any).lexeme;

export const flatten = (tree: Node): Leaf[] => {
	const internal: any = (tree: Leaf) => {
		if (isToken(tree)) return tree;
		return [tree, ...tree.children.map(internal)];
	};

	return internal(tree).flat(Infinity);
};

// TODO: Fix types lol
export const mapper = (rules: Record<string, (node: any) => string>) => {
	const visit = (node: Leaf) => {
		const rule = rules[node.type];
		if (!rule) throw `No handler for nodes of type "${node.type}".`
		return rule(node);
	};

	return visit;
};