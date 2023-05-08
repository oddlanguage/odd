import { Branch, Token, Tree } from "./parser.js";
import { makeError } from "./problem.js";
import {
  Mutable,
  ReadonlyRecord,
  unique,
} from "./util.js";

export type TypeConstructor = Readonly<{
  name: symbol;
  children: ReadonlyArray<Type>;
  stringify?: (self: TypeConstructor) => string;
}>;

type TypeScheme = Readonly<{
  vars: ReadonlyArray<number>;
  type: Type;
}>;
const newScheme = (type: Type): TypeScheme => ({
  vars: free(type),
  type,
});
const instantiate = (scheme: TypeScheme): Type => {
  let i = 0;
  const vars = Object.fromEntries(
    scheme.vars.map(v => [v, i++])
  );
  const _inst = (type: Type): Type => {
    if (typeof type === "symbol") {
      return type;
    } else if (typeof type === "number") {
      return vars[type]!;
    } else if (isConstructor(type)) {
      return {
        ...type,
        children: type.children.map(_inst),
      };
    }
    throw `Cannot instantiate ${type}.`;
  };
  return _inst(scheme.type);
};

export type Type =
  | number
  | symbol
  | ListType
  | RecordType
  | TypeScheme;

const isConstructor = (
  type: Type
): type is TypeConstructor | ListType | RecordType =>
  !!(type as TypeConstructor).children;

const isScheme = (type: Type): type is TypeScheme =>
  !!(type as TypeScheme).vars;

const alphabet = "αβγδεζηθικλμνξοπρστυφχψω";
const subscript = "₀₁₂₃₄₅₆₇₈₉";
export const stringify = (type: Type): string =>
  typeof type === "number"
    ? alphabet[type] ??
      alphabet[type % alphabet.length] +
        [
          ...Math.floor(
            type / alphabet.length
          ).toString(),
        ]
          .map(x => subscript[Number(x)])
          .join("")
    : typeof type === "symbol"
    ? type.description!
    : isScheme(type)
    ? `∀${type.vars
        .map(stringify)
        .join(",")}.${stringify(type.type)}`
    : type.stringify?.(type as any) ??
      [type.name, ...type.children]
        .map(stringify)
        .join(" ");

// =============================================================

export const lambdaType = Symbol("Lambda");
export const newLambda = (
  arg: Type,
  body: Type
): TypeConstructor => ({
  name: lambdaType,
  children: [arg, body],
  stringify: self =>
    (isConstructor(self.children[0]!) &&
    self.children[0].name === lambdaType
      ? `(${stringify(self.children[0])})`
      : stringify(self.children[0]!)) +
    " -> " +
    stringify(self.children[1]!),
});

export const listType = Symbol("List");
type ListType = TypeConstructor;
const newList = (type: Type): ListType => ({
  name: listType,
  children: [type],
});

export const recordType = Symbol("Record");
type RecordType = Omit<TypeConstructor, "stringify"> &
  Readonly<{
    labels: ReadonlyArray<string>;
    stringify?: (self: RecordType) => string;
  }>;
const newRecord = (
  // TODO: Records should map values to values (thus types to types)
  rows: ReadonlyArray<readonly [string, Type]>
): RecordType => ({
  name: recordType,
  labels: rows.map(([label]) => label),
  children: rows.map(([, type]) => type),
  stringify: self =>
    `{ ${self.children
      .map(
        (type, i) =>
          self.labels[i]! + " : " + stringify(type)
      )
      .join(", ")} }`,
});

let __LAST_TYPE_VAR = 0;
const newVar = () => __LAST_TYPE_VAR++;

export const numberType = Symbol("Number");
export const stringType = Symbol("String");
export const booleanType = Symbol("Boolean");
export const nothingType = Symbol("Nothing");
export const neverType = Symbol("Never");
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
  // "<": (Ord a) => a -> a -> Boolean,
  // ">": (Ord a) => a -> a -> Boolean,
  // "<=": (Ord a) => a -> a -> Boolean,
  // ">=": (Ord a) => a -> a -> Boolean,
  // "==": (Eq a) => a -> a -> Boolean,
  // "!=": (Eq a) => a -> a -> Boolean,
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
  nothing: nothingType,
  infinity: numberType,
  not: newLambda(booleanType, booleanType),
  // has: String -> Record -> Boolean,
  range: newLambda(numberType, newList(numberType)),
  "range-from": newLambda(
    numberType,
    newLambda(numberType, newList(numberType))
  ),
  // map: (a -> b) -> List a -> List b,
  map: (() => {
    const a = newVar();
    const b = newVar();
    return newLambda(
      newLambda(a, b),
      newLambda(newList(a), newList(b))
    );
  })(),
  // group: (a -> b) -> { a : c } -> { b : a };
  // filter: (a -> Boolean) -> List a -> List a,
  // fold: (a -> b -> a) -> a -> List b -> a,
  // foldr: (a -> b -> a) -> a -> List b -> a,
  // replace: a -> b -> { a : c } -> { a : b };
  // reverse: List a -> List a,
  // head: List a -> a | Nothing,
  // last: List a -> a | Nothing,
  // tail: List a -> List a | Nothing,
  // drop: List a -> List a,
  // sort: (a -> a -> Number) -> List a -> List a,
  // "sort-by": (a -> Number) -> List a -> List a
  // partition: (a -> Boolean) -> List a -> [List a, List a],
  // size: Container a => a -> Number,
  max: newLambda(
    numberType,
    newLambda(numberType, numberType)
  ),
  min: newLambda(
    numberType,
    newLambda(numberType, numberType)
  ),
  // show: Serialisable a => a -> a,
  // import: String -> {},
  panic: newLambda(stringType, neverType),
  // benchmark: (a -> b) -> Number,
};

const free = (type: Type): ReadonlyArray<number> => {
  if (typeof type === "symbol") {
    return [];
  } else if (typeof type === "number") {
    return [type];
  } else if (isConstructor(type)) {
    return unique(type.children.flatMap(free));
  } else {
    return free(type.type).filter(
      freeVar => !type.vars.includes(freeVar)
    );
  }
};

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
          size: tree.size,
        },
      ]);
    }
    return [
      typeof a === "number"
        ? [a, b]
        : [b as number, a],
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
      got: a,
      expected: b,
      at: tree.offset,
      size: tree.size,
    },
  ]);
};

const compose = (
  a: Substitutions | null,
  b: Substitutions | null,
  tree: Tree,
  input: string
): Substitutions => {
  const subs = (a ?? []) as Mutable<Substitutions>;
  if (b) {
    for (const sub of b) {
      const duplicateIndex = subs?.findIndex(
        ([tvar]) => tvar === sub[0]
      );
      if (duplicateIndex !== -1) {
        const extraSubs = unify(
          sub[1],
          subs[duplicateIndex]![1],
          tree,
          input
        );
        subs.splice(duplicateIndex, 1, [
          sub[0],
          apply(sub[1], extraSubs, tree, input),
        ] as const);
        subs.unshift(...extraSubs);
      } else {
        subs.push(sub);
      }
    }
  }

  // TODO: Figure out how to do this in the earlier loop
  for (let i = 0; i < subs.length; i++) {
    const [tvar, sub] = subs[i]!;
    const applied = apply(sub, subs, tree, input);
    subs.splice(i, 1, [tvar, applied]);
  }

  return subs;
};

const apply = (
  type: Type,
  subs: Substitutions | null,
  tree: Tree,
  input: string
): Type => {
  if (typeof type === "symbol") {
    return type;
  } else if (typeof type === "number") {
    return (
      subs?.find(([t]) => t === type)?.[1] ?? type
    );
  } else if (isConstructor(type)) {
    return {
      ...type,
      children: type.children.map(child =>
        apply(child, subs, tree, input)
      ),
    };
  }

  throw makeError(input, [
    {
      reason: `Cannot apply "${stringify(type)}"`,
      at: tree.offset,
      size: tree.size,
    },
  ]);
};

const applyEnv = (
  env: ReadonlyRecord<string, Type>,
  subs: Substitutions | null,
  tree: Tree,
  input: string
) =>
  Object.fromEntries(
    Object.entries(env).map(([k, t]) => [
      k,
      apply(t, subs, tree, input),
    ])
  );

type Infer = (
  tree: Tree,
  env: ReadonlyRecord<string, Type>,
  input: string
) => readonly [
  Type,
  ReadonlyRecord<string, Type>,
  Substitutions | null
];
export const infer: Infer = (tree, env, input) => {
  switch (tree.type) {
    case "program":
      return program(tree, env, input);
    case "lambda":
      return lambda(tree, env, input);
    case "name":
      return name(tree, env, input);
    case "operator":
      return operator(tree, env, input);
    case "infix":
      return infix(tree, env, input);
    case "number":
      return [numberType, env, null];
    case "string":
      return [stringType, env, null];
    case "application":
      return application(tree, env, input);
    case "declaration":
      return declaration(true)(tree, env, input);
    case "list":
      return list(tree, env, input);
    case "record":
      return record(tree, env, input);
    default:
      throw makeError(input, [
        {
          reason: `Cannot infer type for "${tree.type}" nodes`,
          at: tree.offset,
          size: tree.size,
        },
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
        case "number":
        case "number":
        case "string":
        case "boolean":
        case "wildcard":
          return {};
        default:
          throw makeError(input, [
            {
              reason: `Cannot extract literal patterns from "${literal.type}" nodes`,
              at: literal.offset,
              size: literal.size,
            },
          ]);
      }
    }
    case "list-pattern":
      return (
        (pattern as Branch).children as Branch[]
      ).reduce(
        (extracted, pattern, i) => ({
          ...extracted,
          ...extractPatterns(
            pattern,
            isConstructor(type) &&
              type.name === listType
              ? pattern.type === "rest-pattern"
                ? newList(type.children[i]!)
                : type.children[i]!
              : type,
            input
          ),
        }),
        {}
      );
    case "record-pattern":
      return Object.fromEntries(
        (type as RecordType).children.map(
          (child, i) => [
            (type as RecordType).labels[i]!,
            child,
          ]
        )
      );
    default:
      throw makeError(input, [
        {
          reason: `Cannot extract patterns from "${pattern.type}" nodes`,
          at: pattern.offset,
          size: pattern.size,
        },
      ]);
  }
};

const program: Infer = (tree, env, input) => {
  let type: Type = nothingType;
  for (const child of (tree as Branch).children) {
    [type, env] = infer(child, env, input);
  }
  return [instantiate(newScheme(type)), env, null];
};

const lambda: Infer = (tree, env, input) => {
  const param = (tree as Branch).children[0]!;
  const paramVar =
    param.type === "list-pattern"
      ? newList(newVar())
      : param.type === "record-pattern"
      ? (() => {
          const keys = (param as Branch).children.map(
            field =>
              (
                (
                  (field as Branch)
                    .children[0] as Branch
                ).children[0] as Token
              ).text
          );
          return newRecord(
            keys.map(key => [key, newVar()])
          );
        })()
      : newVar();

  const bodyVar = newVar();
  const lambda = newLambda(paramVar, bodyVar);

  const [body, , subs] = infer(
    (tree as Branch).children[1]!,
    {
      ...env,
      ...extractPatterns(param, paramVar, input),
    },
    input
  );
  const bodySubs = unify(bodyVar, body, tree, input);
  const allSubs = compose(subs, bodySubs, tree, input);

  const finalType = apply(
    lambda,
    allSubs,
    tree,
    input
  );

  return [finalType, env, allSubs];
};

const name: Infer = (tree, env, input) => {
  const token = tree as Token;
  const name = token.text;
  if (!(name in env))
    throw makeError(input, [
      {
        reason: `Unknown name "${name}".`,
        at: token.offset,
        size: token.size,
      },
    ]);
  return [env[name]!, env, null];
};

const operator: Infer = (tree, env, input) => {
  const token = tree as Token;
  const op = token.text;
  if (!(op in env))
    throw makeError(input, [
      {
        reason: `Unknown operator "${op}".`,
        at: token.offset,
        size: token.size,
      },
    ]);
  return [env[op]!, env, null];
};

const infix: Infer = (tree, env, input) => {
  const [lhs, op, rhs] = (tree as Branch).children as [
    Tree,
    Token,
    Tree
  ];
  const [lhsType, , lhsSubs] = infer(lhs, env, input);
  const [opType] = infer(op, env, input);
  const [rhsType] = infer(rhs, env, input);

  const opReturnType = newVar();
  const newType = newLambda(
    lhsType,
    newLambda(rhsType, opReturnType)
  );
  const subs = unify(opType, newType, tree, input);
  const allSubs = compose(subs, lhsSubs, tree, input);

  const finalType = apply(
    newType,
    allSubs,
    tree,
    input
  );
  const returnType = (
    (finalType as TypeConstructor)
      .children[1] as TypeConstructor
  ).children[1]!;

  return [returnType, env, allSubs];
};

const application: Infer = (tree, env, input) => {
  const [fun, arg] = (tree as Branch).children as [
    Tree,
    Tree
  ];

  const argVar = newVar();
  const returnVar = newVar();
  const funVar = newLambda(argVar, returnVar);

  const [funType, , funSubs] = infer(fun, env, input);
  const moreFunSubs = unify(
    funVar,
    funType,
    tree,
    input
  );
  const allFunSubs = compose(
    funSubs,
    moreFunSubs,
    tree,
    input
  );

  const [argType, , argSubs] = infer(arg, env, input);
  const moreArgSubs = unify(
    argVar,
    argType,
    tree,
    input
  );
  const allArgSubs = compose(
    argSubs,
    moreArgSubs,
    tree,
    input
  );

  const allSubs = compose(
    allFunSubs,
    allArgSubs,
    tree,
    input
  );
  const appliedFun = apply(
    funVar,
    allSubs,
    tree,
    input
  ) as TypeConstructor;
  const returnType = appliedFun.children[1]!;

  return [returnType, env, allSubs];
};

const declaration =
  (checkRedeclare: boolean): Infer =>
  (tree, env, input) => {
    const lhs = (tree as Branch).children[0]!;
    const lhsVar =
      lhs.type === "list-pattern"
        ? newList(newVar())
        : lhs.type === "record-pattern"
        ? (() => {
            const keys = (lhs as Branch).children.map(
              field =>
                (
                  (
                    (field as Branch)
                      .children[0] as Branch
                  ).children[0] as Token
                ).text
            );
            return newRecord(
              keys.map(key => [key, newVar()])
            );
          })()
        : newVar();
    const patterns = extractPatterns(
      lhs,
      lhsVar,
      input
    );
    if (checkRedeclare) {
      for (const key of Object.keys(patterns)) {
        if (key in env) {
          throw makeError(input, [
            {
              reason: `Cannot redeclare "${key}"`,
              at: lhs.offset,
              size: lhs.size,
            },
          ]);
        }
      }
    }
    const [rhsType, newEnv] = infer(
      (tree as Branch).children[1]!,
      {
        ...env,
        ...patterns,
      },
      input
    );
    const subs = unify(lhsVar, rhsType, tree, input);
    const appliedEnv = applyEnv(
      newEnv,
      subs,
      tree,
      input
    );
    return [rhsType, appliedEnv, null];
  };

const list: Infer = (tree, env, input) => [
  newList(
    infer(
      (tree as Branch).children[0]!,
      env,
      input
    )[0]!
  ),
  env,
  null,
];

const record: Infer = (tree, env, input) => {
  const record = newRecord(
    ((tree as Branch).children as Branch[]).flatMap(
      ({ children: [row] }) => {
        switch (row!.type) {
          case "name":
            return [
              [
                (row as Token).text,
                infer(row!, env, input)[0],
              ],
            ];
          case "declaration": {
            return [
              [
                (
                  (
                    (row as Branch)
                      .children[0] as Branch
                  ).children[0] as Token
                ).text,
                declaration(false)(
                  row!,
                  env,
                  input
                )[0],
              ],
            ];
          }
          default:
            throw `Unhandled row type "${row!.type}".`;
        }
      }
    )
  );

  return [record, env, null];
};
