import { Branch, Token, Tree } from "./parser.js";
import { ReadonlyRecord } from "./util.js";

type TypeConstructor = Readonly<{
  name: symbol;
  children: ReadonlyArray<Type>;
  stringify?: (
    children: ReadonlyArray<Type>
  ) => string;
}>;

type Type = number | symbol | TypeConstructor;

const lambdaSymbol = Symbol("Lambda");
const lambdaType = (
  arg: Type,
  body: Type
): TypeConstructor => ({
  name: lambdaSymbol,
  children: [arg, body],
  stringify: children =>
    children.map(stringify).join(" -> ")
});

let lastTypeVar = 0;
const freshTypeVar = () => lastTypeVar++;

const numberType = Symbol("Number");
export const defaultTypeEnv: ReadonlyRecord<
  string,
  Type
> = {
  "+": lambdaType(
    numberType,
    lambdaType(numberType, numberType)
  )
};

const isConstructor = (
  type: Type
): type is TypeConstructor =>
  !!(type as TypeConstructor).children;

const alphabet = "αβγδεζηθικλμνξοπρστυφχψω";
export const stringify = (type: Type): string =>
  typeof type === "number"
    ? alphabet[type] ??
      alphabet[type % alphabet.length]! + type
    : !isConstructor(type)
    ? typeof type === "symbol"
      ? type.description!
      : `''${type}''`
    : type.stringify?.(type.children) ??
      [type.name, ...type.children]
        .map(stringify)
        .join(" ");

const occurs = (a: Type, b: Type): boolean => {
  if (isConstructor(a)) {
    return a.children.some(child => occurs(child, b));
  } else if (isConstructor(b)) {
    return b.children.some(child => occurs(child, a));
  } else {
    return false;
  }
};

type Substitutions = ReadonlyArray<
  readonly [number, Type]
>;
const unify = (a: Type, b: Type): Substitutions => {
  if (typeof a === "number" || typeof b === "number") {
    if (occurs(a, b)) {
      throw `Recursive types:\n  ${[a, b]
        .map(stringify)
        .join("\n  ")}`;
    }
    return [
      (typeof a === "number"
        ? [a, b]
        : [b, a]) as readonly [number, Type]
    ];
  } else if (
    typeof a === "symbol" &&
    typeof b === "symbol"
  ) {
    return [];
  } else if (
    (a as TypeConstructor).name ===
      (b as TypeConstructor).name &&
    (a as TypeConstructor).children.length ===
      (b as TypeConstructor).children.length
  ) {
    return (a as TypeConstructor).children.flatMap(
      (a, i) =>
        unify(a, (b as TypeConstructor).children[i]!)
    );
  }

  throw `Can't unify:\n  ${[a, b]
    .map(stringify)
    .join("\n  ")}`;
};

const apply = (
  type: Type,
  subs: Substitutions
): Type => {
  if (typeof type === "symbol") {
    return type;
  } else if (typeof type === "number") {
    return subs.find(([t]) => t === type)?.[1] ?? type;
  } else if (isConstructor(type)) {
    return {
      ...type,
      children: type.children.map(type =>
        apply(type, subs)
      )
    };
  }

  throw `Can't apply "${stringify(type)}"`;
};

export const infer = (
  tree: Tree,
  env: ReadonlyRecord<string, Type>
): readonly [
  Type,
  ReadonlyRecord<string, Type>,
  Substitutions | null
] => {
  switch (tree.type) {
    case "lambda": {
      const argVar = freshTypeVar();
      const bodyVar = freshTypeVar();
      const lambda = lambdaType(argVar, bodyVar);
      const [body, _, subs] = infer(
        (tree as Branch).children[1]!,
        {
          ...env,
          ...extractPatterns(
            (tree as Branch).children[0]!,
            argVar
          )
        }
      );
      const bodySubs = unify(body, bodyVar);
      const allSubs = bodySubs.concat(subs ?? []);
      const finalType = apply(lambda, allSubs);
      return [finalType, env, allSubs];
    }
    case "name": {
      const name = (tree as Token).text;
      if (!(name in env))
        throw `Unknown name "${name}".`;
      return [env[name]!, env, null];
    }
    case "operator": {
      const name = (tree as Token).text;
      if (!(name in env))
        throw `Unknown operator "${name}".`;
      return [env[name]!, env, null];
    }
    case "infix": {
      const [lhs, op, rhs] = (tree as Branch)
        .children as [Tree, Token, Tree];
      const [lhsType] = infer(lhs, env);
      const [opType] = infer(op, env) as [
        TypeConstructor,
        any,
        any
      ];
      const [rhsType] = infer(rhs, env);
      const opReturnType = freshTypeVar();
      const newType = lambdaType(
        lhsType,
        lambdaType(rhsType, opReturnType)
      );
      const subs = unify(opType, newType);
      const finalType = apply(newType, subs);
      const returnType = (
        (finalType as TypeConstructor)
          .children[1] as TypeConstructor
      ).children[1]!;
      // TODO: Should the subs be exposed like this?
      // Or should env be extended with concrete substitutions?
      return [returnType, env, subs];
    }
    case "number":
      return [numberType, env, null];
    case "application": {
      const [lhs, rhs] = (tree as Branch).children as [
        Tree,
        Tree
      ];
      const argVar = freshTypeVar();
      const bodyVar = freshTypeVar();
      const lambda = lambdaType(argVar, bodyVar);
      const [lhsType] = infer(lhs, env);
      const subs = unify(lambda, lhsType);
      const [rhsType] = infer(rhs, env);
      const rhsSubs = unify(argVar, rhsType);
      const allSubs = subs.concat(rhsSubs);
      const applied = apply(
        lambda,
        allSubs
      ) as TypeConstructor;
      return [applied.children[1]!, env, allSubs];
    }
    default:
      throw `Can't infer type for "${tree.type}" nodes`;
  }
};

const extractPatterns = (
  pattern: Tree,
  type: Type
): ReadonlyRecord<string, Type> => {
  switch (pattern.type) {
    case "literal-pattern": {
      const literal = (pattern as Branch)
        .children[0] as Token;
      switch (literal.type) {
        case "name":
          return { [literal.text]: type };
        default:
          throw `Can't extract literal patterns from "${literal.type}" nodes`;
      }
    }
    default:
      throw `Can't extract patterns from "${pattern.type}" nodes`;
  }
};
