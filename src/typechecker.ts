import { Node } from "./parser.js";
import { Maybe, zip } from "./utils.js";

const MAX_RECURSION = 50;

type TypeApplication = Readonly<{
	name: string;
	parameters?: Type[];
}>;

type Type = TypeApplication | number;

type Constraints = Record<number | string, Type>;

const isUnknown = (type: Type): type is number =>
	typeof type === "number";

const constrain = (a: number, b: Type, cons: Constraints, depth: number): Maybe<Constraints> => {
	if (depth > MAX_RECURSION)
		throw "Too much recursion!";

	if (cons[a])
		return unify([cons[a], b], cons, depth + 1);

	if (isUnknown(b) && cons[b])
		return unify([a, cons[b]], cons, depth + 1);

	if (occurs(a, b, cons))
		return null;

	return { ...cons, [a]: b };
};

export const unify = ([ a, b ]: readonly [ Type, Type ], cons?: Maybe<Constraints>, depth: number = 0): Maybe<Constraints> => {
	if (depth > MAX_RECURSION)
		throw "Too much recursion!";

	if (!cons || a === b)
		return cons;
	
	if (!isUnknown(a) && !isUnknown(b)) {
		if (a.name !== b.name)
			return null;
		
		if (!a.parameters || !b.parameters)
			return cons;
		
		if (a.parameters.length !== b.parameters.length)
			return null;

		zip(a.parameters)(b.parameters).forEach(pair => cons = unify(pair, cons, depth + 1));
		return cons;
	}

	if (isUnknown(a))
		return constrain(a, b, cons, depth + 1);

	if (isUnknown(b))
		return constrain(b, a, cons, depth + 1);

	return null;
};

const occurs = (a: number, b: Type, cons: Constraints): boolean => {
	if (a === b)
		return true;
	
	if (isUnknown(b) && cons[b])
		return occurs(a, cons[b], cons);
	
	if (!isUnknown(b))
		return b.parameters?.some(param => occurs(a, param, cons)) ?? false;

	return false;
};

export const infer = (node: Node, env: Record<string, TypeApplication> = {}): Constraints => {
	throw "Not implemented.";
};