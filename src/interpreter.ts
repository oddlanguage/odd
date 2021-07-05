import { Token } from "./lexer.js";
import { Leaf, Node } from "./parser.js";

// TODO: Write a select function like tree-sitter's API to work with trees.

const isNode = (leaf?: Leaf): leaf is Node =>
	!!(leaf as any).children;

const isToken = (leaf?: Leaf): leaf is Token =>
	!(leaf as any).children;

const traverse = (visit: (tree: Node) => void) => {
	const traverse = (tree: Leaf) => {
		if (isToken(tree)) return;
	
		visit(tree);
	
		for (const child of tree.children.filter(isNode))
			traverse(child);
	};
	return traverse;
};

type Rules = Readonly<{
	[key: string]: (node: Node) => void;
}>;

const interpreter = (rules: Rules) =>
	traverse(node => rules[node.type]?.(node));

export default interpreter;