import { Branch, Token, Tree } from "./parser.js";
import { makeError } from "./problem.js";
import { ReadonlyRecord } from "./util.js";

export const oddNothing = Symbol("Nothing");
export const oddNever = Symbol("Never");
export const oddNumber = Symbol("Number");
export const oddBoolean = Symbol("Boolean");
export const oddString = Symbol("String");
const oddLambda = Symbol("Lambda");
const oddRecord = Symbol("Record");
const oddList = Symbol("List");
const oddTuple = Symbol("Tuple");
const oddRow = Symbol("Row");
const oddUnion = Symbol("Union");
const oddIntersection = Symbol("Intersection");

type Type = number | string | symbol | TypeConstructor;

type TypeConstructor = Readonly<{
  name: symbol;
  children: ReadonlyArray<Type>;
  stringify?: () => string;
}>;

export const newLambdaType = (
  arg: Type,
  body: Type,
  parenthesise?: boolean
): TypeConstructor => ({
  name: oddLambda,
  children: [arg, body],
  stringify: () => {
    const str = [arg, body]
      .map(stringify)
      .join(" -> ");
    return parenthesise ? `(${str})` : str;
  }
});

export const newUnionType = (
  types: ReadonlyArray<Type>
): TypeConstructor => ({
  name: oddUnion,
  children: types,
  stringify: () => types.map(stringify).join(" | ")
});

export const newIntersectionType = (
  types: ReadonlyArray<Type>
): TypeConstructor => ({
  name: oddIntersection,
  children: types,
  stringify: () => types.map(stringify).join(" & ")
});

export const newListType = (
  type: Type
): TypeConstructor => ({
  name: oddList,
  children: [type]
});

export const newTupleType = (
  types: ReadonlyArray<Type>
): TypeConstructor => ({
  name: oddTuple,
  children: types,
  stringify: () =>
    `[ ${types.map(stringify).join(", ")} ]`
});

export const newRecordType = (
  types: ReadonlyRecord<string, Type>
): TypeConstructor => {
  const rows = Object.entries(types).map(row => ({
    name: oddRow,
    children: row,
    stringify: () => `${row[0]} : ${stringify(row[1])}`
  }));
  return {
    name: oddRecord,
    children: rows,
    stringify: () => `{ ${rows.map(stringify)} }`
  };
};

export const newGenericList = (
  x: number
): TypeConstructor => ({
  name: oddList,
  children: [x]
});

export const newGenericRecord = (
  x: number
): TypeConstructor => ({
  name: oddRecord,
  children: [x]
});

const oddTypeClassConstraint = Symbol(
  "TypeclassConstraint"
);
export const newTypeclassConstraint = (
  constraints: ReadonlyRecord<string, Type>,
  type: Type
): TypeConstructor => ({
  name: oddTypeClassConstraint,
  children: [type, ...Object.values(constraints)],
  stringify: () =>
    `(${Object.entries(constraints)
      .map(([name, type]) =>
        [stringify(type), name].join(" ")
      )
      .join(", ")}) => ${stringify(type)}`
});

const isConstructor = (
  type: Type
): type is TypeConstructor =>
  !!(type as TypeConstructor).children;

const alphabet = "αβγδεζηθικλμνξοπρστυφχψω";

export const stringify = (type: Type): string =>
  typeof type === "number"
    ? alphabet[type] || `t${type}`
    : !isConstructor(type)
    ? typeof type === "symbol"
      ? type.description!
      : `''${type}''`
    : type.stringify?.() ??
      [type.name, ...type.children]
        .map(stringify)
        .join(" ");

// https://gist.github.com/oxyflour/f98432aa400daa225d04
// https://github.com/cdiggins/type-inference/blob/master/type-system.ts

type Env = ReadonlyRecord<string, Type>;

type Check = (
  tree: Tree,
  env: Env,
  input: string
) => readonly [
  Type, // Type
  ReadonlyRecord<string, Type> | null, // Exports
  Env // Type env
];

const check: Check = (tree, env, input) => {
  switch (tree.type) {
    case "program":
      return program(tree, env, input);
    case "name":
      return name(tree, env, input);
    case "operator":
      return operator(tree, env, input);
    case "declaration":
      return declaration(tree, env, input);
    case "number":
      return number(tree, env, input);
    case "string":
      return string(tree, env, input);
    case "boolean":
      return boolean(tree, env, input);
    case "infix":
      return infix(tree, env, input);
    default:
      throw makeError(input, [
        {
          reason: `Unhandled node type "${tree.type}".`,
          at: tree.offset,
          size: tree.size
        }
      ]);
  }
};

export default check;

const extractPatterns = (
  pattern: Branch,
  type: Type | ReadonlyArray<Type>,
  input: string
): ReadonlyRecord => {
  switch (pattern.type) {
    case "rest-pattern": {
      const literal = pattern.children[0] as Token;
      return { [literal.text]: type };
    }
    case "literal-pattern": {
      const literal = pattern.children[0] as Token;
      switch (literal.type) {
        case "name":
        case "operator":
          return { [literal.text]: type };
        case "number":
        case "string":
        case "boolean":
        case "wildcard":
          return {};
        default:
          throw makeError(input, [
            {
              reason: `Unhandled extractor for literal pattern type "${literal?.type}".`,
              at: literal.offset,
              size: literal.size
            }
          ]);
      }
    }
    case "list-pattern":
      return (pattern.children as Branch[]).reduce(
        (extracted, pattern, i) => ({
          ...extracted,
          ...extractPatterns(
            pattern,
            pattern.type === "rest-pattern"
              ? (
                  type as TypeConstructor
                ).children.slice(i)
              : (type as TypeConstructor).children[i]!,
            input
          )
        }),
        {}
      );
    case "record-pattern":
      return (pattern.children as Branch[]).reduce(
        (extracted, pattern, i, patterns) => {
          const field = pattern.children[0] as Branch;
          return {
            ...extracted,
            ...extractPatterns(
              pattern.children.length === 2
                ? (pattern.children[1] as Branch)
                : field,
              field.type === "rest-pattern"
                ? newRecordType(
                    Object.fromEntries(
                      (() => {
                        const names = patterns
                          .slice(0, i)
                          .map(
                            pattern =>
                              (
                                (
                                  pattern
                                    .children[0] as Branch
                                ).children[0] as Token
                              ).text
                          );
                        return Object.entries(
                          type
                        ).filter(
                          ([name]) =>
                            !names.includes(name)
                        );
                      })()
                    )
                  )
                : (
                    type as TypeConstructor
                  ).children.find(
                    row =>
                      (row as TypeConstructor)
                        .children[0] ===
                      (field.children[0] as Token).text
                  )!,
              input
            )
          };
        },
        {}
      );
    default:
      throw makeError(input, [
        {
          reason: `Unhandled extractor for pattern type "${pattern?.type}".`,
          at: pattern.offset,
          size: pattern.size
        }
      ]);
  }
};

const name: Check = (tree, env, input) => {
  {
    const name = (tree as Token).text;
    if (!(name in env)) {
      throw makeError(input, [
        {
          reason: `Unknown name "${name}".`,
          at: tree.offset,
          size: tree.size
        }
      ]);
    }
    return [env[name]!, null, env];
  }
};

const operator: Check = (tree, env, input) => {
  {
    const { text: op } = tree as Token;
    if (!(op in env)) {
      throw makeError(input, [
        {
          reason: `Unknown operator "${op}".`,
          at: tree.offset,
          size: tree.size
        }
      ]);
    }
    return [env[op]!, null, env];
  }
};

const declaration: Check = (tree, env, input) => {
  {
    const [type] = check(
      (tree as Branch).children[1]!,
      env,
      input
    );
    const lhsTree = (tree as Branch)
      .children[0] as Branch;
    const extracted = extractPatterns(
      lhsTree,
      type,
      input
    );

    const duplicateKey = Object.keys(extracted).find(
      key => key in env
    );
    if (duplicateKey) {
      throw makeError(input, [
        {
          reason: `"${duplicateKey}" is already defined.`,
          at: lhsTree.offset,
          size: lhsTree.size
        }
      ]);
    }

    return [type, extracted, { ...env, ...extracted }];
  }
};

const program: Check = (tree, env, input) => {
  {
    let type: Type = oddNothing;
    for (const branch of (tree as Branch).children) {
      [type, , env] = check(branch, env, input);
    }
    return [type, null, env];
  }
};

const boolean: Check = (_, env) =>
  [oddBoolean, null, env] as const;

const string: Check = (_, env) =>
  [oddString, null, env] as const;

const number: Check = (_, env) =>
  [oddNumber, null, env] as const;

const infix: Check = (tree, env, input) => {
  const op = check(
    (tree as Branch).children[1]!,
    env,
    input
  )[0] as TypeConstructor;
  const returnType = (
    op.children[1] as TypeConstructor
  ).children[1]!;
  return [returnType, null, env] as const;
};
