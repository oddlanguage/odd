import { Branch, Token, Tree } from "./parser.js";
import { makeError } from "./problem.js";
import { ReadonlyRecord } from "./util.js";

type TypeConstructor = Readonly<{
  name: symbol;
  children: ReadonlyArray<Type>;
  stringify?: (
    children: ReadonlyArray<Type>
  ) => string;
}>;

type Type = number | symbol | TypeConstructor;

const lambdaType = Symbol("Lambda");
const newLambda = (
  arg: Type,
  body: Type
): TypeConstructor => ({
  name: lambdaType,
  children: [arg, body],
  stringify: children =>
    children.map(stringify).join(" -> ")
});

let lastTypeVar = 0;
const freshTypeVar = () => lastTypeVar++;

const numberType = Symbol("Number");
const stringType = Symbol("String");
const booleanType = Symbol("Boolean");
const nothingType = Symbol("Nothing");
export const defaultTypeEnv: ReadonlyRecord<
  string,
  Type
> = {
  "+": newLambda(
    numberType,
    newLambda(numberType, numberType)
  ),
  "-": newLambda(
    numberType,
    newLambda(numberType, numberType)
  ),
  "*": newLambda(
    numberType,
    newLambda(numberType, numberType)
  ),
  "/": newLambda(
    numberType,
    newLambda(numberType, numberType)
  ),
  "%": newLambda(
    numberType,
    newLambda(numberType, numberType)
  ),
  "^": newLambda(
    numberType,
    newLambda(numberType, numberType)
  ),
  "<": newLambda(
    numberType,
    newLambda(numberType, numberType)
  ),
  ">": newLambda(
    numberType,
    newLambda(numberType, numberType)
  ),
  "<=": newLambda(
    numberType,
    newLambda(numberType, numberType)
  ),
  ">=": newLambda(
    numberType,
    newLambda(numberType, numberType)
  ),
  "|": newLambda(
    booleanType,
    newLambda(booleanType, booleanType)
  ),
  "&": newLambda(
    booleanType,
    newLambda(booleanType, booleanType)
  ),
  true: booleanType,
  false: booleanType,
  infinity: numberType,
  nothing: nothingType
};

const isConstructor = (
  type: Type
): type is TypeConstructor =>
  !!(type as TypeConstructor).children;

const alphabet = "αβγδεζηθικλμνξοπρστυφχψω";
const subscript = "₀₁₂₃₄₅₆₇₈₉";
export const stringify = (type: Type): string =>
  typeof type === "number"
    ? alphabet[type] ??
      alphabet[type % alphabet.length] +
        [
          ...Math.floor(
            type / alphabet.length
          ).toString()
        ]
          .map(x => subscript[Number(x)])
          .join("")
    : typeof type === "symbol"
    ? type.description!
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
const unify = (
  a: Type,
  b: Type,
  tree: Tree,
  input: string
): Substitutions => {
  if (typeof a === "number" || typeof b === "number") {
    if (occurs(a, b)) {
      throw makeError(input, [
        {
          reason: `Recursive types:\n  ${[a, b]
            .map(stringify)
            .join("\n  ")}`,
          at: tree.offset,
          size: tree.size
        }
      ]);
    }
    return [
      typeof a === "number" ? [a, b] : [b as number, a]
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
        unify(
          a,
          (b as TypeConstructor).children[i]!,
          tree,
          input
        )
    );
  }

  throw makeError(input, [
    {
      reason: `Can't unify:\n  ${[a, b]
        .map(stringify)
        .join("\n  ")}`,
      at: tree.offset,
      size: tree.size
    }
  ]);
};

const compose = (
  a: Substitutions | null,
  b: Substitutions | null,
  tree: Tree,
  input: string
): Substitutions => {
  const duplicateA = a?.find(([ka, va]) =>
    b?.find(([kb, vb]) => ka === kb && va !== vb)
  );
  if (duplicateA) {
    const duplicateB = b?.find(([kb, vb]) =>
      a?.find(([ka, va]) => kb === ka && vb !== va)
    )!;
    throw makeError(input, [
      {
        reason: `Cannot compose:\n  ${[
          duplicateA,
          duplicateB
        ]
          .map(dup => dup.map(stringify).join(" : "))
          .join("\n  ")}`,
        at: tree.offset,
        size: tree.size
      }
    ]);
  }
  return a?.concat(b ?? []) ?? [];
};

const apply = (
  type: Type,
  subs: Substitutions,
  tree: Tree,
  input: string
): Type => {
  if (typeof type === "symbol") {
    return type;
  } else if (typeof type === "number") {
    return subs.find(([t]) => t === type)?.[1] ?? type;
  } else if (isConstructor(type)) {
    return {
      ...type,
      children: type.children.map(type =>
        apply(type, subs, tree, input)
      )
    };
  }

  throw makeError(input, [
    {
      reason: `Can't apply "${stringify(type)}"`,
      at: tree.offset,
      size: tree.size
    }
  ]);
};

export const infer = (
  tree: Tree,
  env: ReadonlyRecord<string, Type>,
  input: string
): readonly [
  Type,
  ReadonlyRecord<string, Type>,
  Substitutions | null
] => {
  switch (tree.type) {
    case "program": {
      // TODO: infer all exprs, not just the first
      return infer(
        (tree as Branch).children[0]!,
        env,
        input
      );
    }
    case "lambda": {
      const argVar = freshTypeVar();
      const bodyVar = freshTypeVar();
      const lambda = newLambda(argVar, bodyVar);
      const [body, _, subs] = infer(
        (tree as Branch).children[1]!,
        {
          ...env,
          ...extractPatterns(
            (tree as Branch).children[0]!,
            argVar,
            input
          )
        },
        input
      );
      const bodySubs = unify(
        body,
        bodyVar,
        tree,
        input
      );
      const allSubs = compose(
        subs,
        bodySubs,
        tree,
        input
      );
      const finalType = apply(
        lambda,
        allSubs,
        tree,
        input
      );
      return [finalType, env, allSubs];
    }
    case "name": {
      const token = tree as Token;
      const { text: name } = token;
      if (!(name in env))
        throw makeError(input, [
          {
            reason: `Unknown name "${name}".`,
            at: token.offset,
            size: token.size
          }
        ]);
      return [env[name]!, env, null];
    }
    case "operator": {
      const token = tree as Token;
      const { text: name } = token;
      if (!(name in env))
        throw makeError(input, [
          {
            reason: `Unknown operator "${name}".`,
            at: token.offset,
            size: token.size
          }
        ]);
      return [env[name]!, env, null];
    }
    case "infix": {
      const [lhs, op, rhs] = (tree as Branch)
        .children as [Tree, Token, Tree];
      const [lhsType] = infer(lhs, env, input);
      const [opType] = infer(op, env, input) as [
        TypeConstructor,
        any,
        any
      ];
      const [rhsType] = infer(rhs, env, input);
      const opReturnType = freshTypeVar();
      const newType = newLambda(
        lhsType,
        newLambda(rhsType, opReturnType)
      );
      const subs = unify(opType, newType, tree, input);
      const finalType = apply(
        newType,
        subs,
        tree,
        input
      );
      const returnType = (
        (finalType as TypeConstructor)
          .children[1] as TypeConstructor
      ).children[1]!;
      return [returnType, env, subs];
    }
    case "number":
      return [numberType, env, null];
    case "string":
      return [stringType, env, null];
    case "application": {
      const [lhs, rhs] = (tree as Branch).children as [
        Tree,
        Tree
      ];
      const argVar = freshTypeVar();
      const bodyVar = freshTypeVar();
      const lambda = newLambda(argVar, bodyVar);
      const [lhsType] = infer(lhs, env, input);
      const subs = unify(lambda, lhsType, tree, input);
      const [rhsType] = infer(rhs, env, input);
      const rhsSubs = unify(
        argVar,
        rhsType,
        tree,
        input
      );
      const allSubs = compose(
        subs,
        rhsSubs,
        tree,
        input
      );
      const applied = apply(
        lambda,
        allSubs,
        tree,
        input
      ) as TypeConstructor;
      return [applied.children[1]!, env, allSubs];
    }
    case "declaration": {
      const lhs = (tree as Branch).children[0]!;
      const patterns = extractPatterns(
        lhs,
        freshTypeVar(),
        input
      );
      for (const key of Object.keys(patterns)) {
        if (key in env) {
          throw makeError(input, [
            {
              reason: `Can't redeclare "${key}"`,
              at: lhs.offset,
              size: lhs.size
            }
          ]);
        }
      }
      return infer(
        (tree as Branch).children[1]!,
        {
          ...env,
          ...patterns
        },
        input
      );
    }
    default:
      throw makeError(input, [
        {
          reason: `Can't infer type for "${tree.type}" nodes`,
          at: tree.offset,
          size: tree.size
        }
      ]);
  }
};

const extractPatterns = (
  pattern: Tree,
  type: Type,
  input: string
): ReadonlyRecord<string, Type> => {
  switch (pattern.type) {
    case "literal-pattern": {
      const literal = (pattern as Branch)
        .children[0] as Token;
      switch (literal.type) {
        case "name":
          return { [literal.text]: type };
        default:
          throw makeError(input, [
            {
              reason: `Can't extract literal patterns from "${literal.type}" nodes`,
              at: literal.offset,
              size: literal.size
            }
          ]);
      }
    }
    default:
      throw makeError(input, [
        {
          reason: `Can't extract patterns from "${pattern.type}" nodes`,
          at: pattern.offset,
          size: pattern.size
        }
      ]);
  }
};
