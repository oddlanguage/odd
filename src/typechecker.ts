import { Node } from "./parser";

type StructuralType = Readonly<{
	[K in string]: Type;
}>;

type PrimitiveType = number | string | boolean;

type Type = StructuralType | PrimitiveType;

const isSubtype = (
	subtype: Type | undefined,
	type: Type
): boolean => {
	if (!subtype) return false;

	switch (typeof subtype) {
		case "number":
			return typeof type === "number";
		case "boolean":
			return typeof type === "boolean";
		case "string":
			return subtype === type;
	}

	return Object.keys(subtype).every(key =>
		isSubtype((type as any)[key], subtype[key]!)
	);
};

const infer = (node: Node): Type => ({});
