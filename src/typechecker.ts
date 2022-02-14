import { Node } from "./parser.js";
import { isNode } from "./tree.js";

type Type =
	| TypeVariable
	| MonomorphicType
	| PolymorphicType;

type TypeVariable = number;

type MonomorphicType = SimpleType | ParametricType;

type FunctionType = Readonly<{
	name: "Function";
	params: readonly [Type, Type];
}>;

type UnionType = Readonly<{
	name: "Union";
	params: readonly [Type, Type];
}>;

type IntersectionType = Readonly<{
	name: "Intersection";
	params: readonly [Type, Type];
}>;

type PredefinedSimpleType =
	| FunctionType
	| UnionType
	| IntersectionType;

type SimpleType =
	| PredefinedSimpleType
	| Readonly<{
			name: string;
	  }>;

type ParametricType = SimpleType &
	Readonly<{
		params: readonly Type[];
	}>;

type PolymorphicType = Readonly<{
	type: MonomorphicType;
	vars: readonly TypeVariable[];
}>;

const isVariable = (
	type: Type
): type is TypeVariable => typeof type === "number";

const isParametric = (
	type: Type
): type is ParametricType =>
	!!(type as ParametricType).params;

const isPolymorphic = (
	type: Type
): type is PolymorphicType =>
	!!(type as PolymorphicType).vars;

const alphabet = "αβγδεζηθικλμνξοπρστυφχψω";
const varToGreek = (n: TypeVariable) =>
	alphabet[n] ?? `t${n}`;

const showType = (type: Type): string => {
	if (isPolymorphic(type))
		return `∀ ${type.vars
			.map(showType)
			.join(" ")} . ${showType(type.type)}`;

	if (isVariable(type)) return varToGreek(type);

	if (isParametric(type)) {
		switch (type.name) {
			case "Function":
				return `${showType(
					type.params[0]
				)} -> ${showType(type.params[1])}`;
			case "Union":
				return `${showType(
					type.params[0]
				)} | ${showType(type.params[1])}`;
			case "Intersection":
				return `${showType(
					type.params[0]
				)} & ${showType(type.params[1])}`;
			default:
				return `${type.name} ${type.params
					.map(showType)
					.join(" ")}`;
		}
	}

	return type.name;
};

type TypedNode = Node &
	Readonly<{
		datatype: Type;
	}>;

type Context = Record<
	MonomorphicType["name"] | TypeVariable,
	Type
>;

type Rule = (
	node: TypedNode,
	context: Context
) => Context;

type Rules = Readonly<Record<Node["type"], Rule>>;

const infer = (rules: Rules) => {
	let index: TypeVariable = 0;
	const newVar = () => index++;

	const infer =
		(context: Context = {}) =>
		(node: Node): TypedNode => {
			const datatype = newVar();
			const newContext = {
				...context,
				[datatype]: datatype
			};

			for (let i = 0; i < node.children.length; i++) {
				const child = node.children[i]!;
				if (!isNode(child)) continue;
				node.children[i] = infer(newContext)(child);
			}

			return { datatype, ...node };
		};

	return infer;
};

export default infer;
