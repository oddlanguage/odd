import { isToken, print } from "./odd.js";
import { Leaf } from "./parser.js";

const compare = <A extends Record<string, any>, B extends Record<string, any>>(a: A, b: B) =>
	Object.is(a, b) || (JSON.stringify(a) === JSON.stringify(b));

export const stringify = (tree: Leaf): string =>
	`(${(isToken(tree))
		? `"${tree.lexeme}"`
		: `${tree.type} ${tree.children.map(stringify).join(" ")}`})`;

export const expect = (description: string) => (expected: Leaf) => (got: Leaf) => {
	if (!compare(expected, got))
		throw `${description} FAIL:\nEXPECTED:\n${stringify(expected)}\nGOT:\n${stringify(got)}`;
	print(`${description} PASS`);
	return got;
};