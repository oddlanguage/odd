import { Leaf, Node } from "./parser.js";
import { Maybe } from "./utils.js";

type Selector = (leaf: Leaf, index: number) => boolean;

export const isNode = (leaf: Leaf): leaf is Node =>
	!!(leaf as Node).children;

export const select =
	(selector: Selector) => (node: Node) => {
		const matches: Leaf[] = [];

		for (const i of node.children.keys()) {
			const child = node.children[i]!;

			if (selector(child, i)) {
				matches.push(child);
			}

			if (isNode(child)) {
				matches.push(...select(selector)(child));
			}
		}

		return matches;
	};

type Mapper<A, B> = (x: A, index: number) => B;

export const map =
	<A extends Node, B extends Node>(
		mapper: Mapper<A, B>
	) =>
	(node: Node) => {
		// @ts-ignore
		const root = mapper(node, 0);

		for (const i of root.children.keys()) {
			const child = root.children[i]!;

			if (isNode(child)) {
				root.children[i] = map(mapper)(child);
			}
		}

		return root;
	};

export const nthChild =
	(n: number) =>
	(node: Node): Maybe<Leaf> =>
		node.children[
			n < 0 ? node.children.length + n : n
		];

export const firstChild = nthChild(0);

export const lastChild = nthChild(-1);
