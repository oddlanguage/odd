import { isDeepStrictEqual } from "node:util";
import { Leaf } from "./parser.js";
import { print } from "./utils.js";

export const compare = <A extends Record<string, any>, B extends Record<string, any>>(a: A, b: B) =>
	isDeepStrictEqual(a, b);

export const expect = (description: string) => (expected: Leaf) => (got: Leaf) => {
	if (!compare(expected, got))
		throw `${description} FAIL:\nEXPECTED:\n${JSON.stringify(expected, null, 2)}\nGOT:\n${JSON.stringify(got, null, 2)}`;
	print(`${description} PASS`);
	return got;
};