import { Branch, Token, Tree } from "./parse.js";
import { makeError } from "./problem.js";
import {
  Mutable,
  ReadonlyRecord,
  log,
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
): RecordType => {
  const sortedRows = rows
    .slice()
    .sort(([a], [b]) => a.localeCompare(b));
  return {
    name: recordType,
    labels: sortedRows.map(([label]) => label),
    children: sortedRows.map(([, type]) => type),
    stringify: self =>
      [
        "{",
        self.children
          .map(
            (type, i) =>
              self.labels[i]! + " : " + stringify(type)
          )
          .join(", "),
        "}",
      ].join(" "),
  };
};

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
  "<": newLambda(
    numberType,
    newLambda(numberType, booleanType)
  ),
  // ">": (Ord a) => a -> a -> Boolean,
  ">": newLambda(
    numberType,
    newLambda(numberType, booleanType)
  ),
  // "<=": (Ord a) => a -> a -> Boolean,
  "<=": newLambda(
    numberType,
    newLambda(numberType, booleanType)
  ),
  // ">=": (Ord a) => a -> a -> Boolean,
  ">=": newLambda(
    numberType,
    newLambda(numberType, booleanType)
  ),
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
  map: (() => {
    const a = newVar();
    const b = newVar();
    return newLambda(
      newLambda(a, b),
      newLambda(newList(a), newList(b))
    );
  })(),
  // group: (a -> b) -> { x : a } -> { x : b };
  fold: (() => {
    const a = newVar();
    const b = newVar();
    return newLambda(
      newLambda(a, newLambda(b, a)),
      newLambda(a, newLambda(newList(b), a))
    );
  })(),
  scan: (() => {
    const a = newVar();
    const b = newVar();
    return newLambda(
      newLambda(b, newLambda(a, b)),
      newLambda(b, newLambda(newList(a), b))
    );
  })(),
  // replace: a -> b -> { a : c } -> { a : b };
  reverse: (() => {
    const a = newVar();
    return newLambda(newList(a), newList(a));
  })(),
  // head: List a -> a | Nothing,
  // last: List a -> a | Nothing,
  tail: (() => {
    const a = newVar();
    return newLambda(newList(a), newList(a));
  })(),
  drop: (() => {
    const a = newVar();
    return newLambda(numberType, newList(a));
  })(),
  sort: (() => {
    const a = newVar();
    return newLambda(
      newLambda(a, newLambda(a, numberType)),
      newLambda(newList(a), newList(a))
    );
  })(),
  // "sort-by": idk???
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
  benchmark: newLambda(
    newLambda(newVar(), newVar()),
    numberType
  ),
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
      expected: b,
      got: a,
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
    case "match":
      return match(tree, env, input);
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

const program: Infer = (tree, env, input) => {
  let type: Type = nothingType;
  for (const child of (tree as Branch).children) {
    [type, env] = infer(child, env, input);
  }
  return [instantiate(newScheme(type)), env, null];
};

const lambda: Infer = (tree, env, input) => {
  const param = (tree as Branch).children[0]!;
  const paramVar = newVar();
  const [patterns, paramSubs] = extractPatterns(
    param,
    paramVar,
    input
  );

  const bodyVar = newVar();
  const lambda = newLambda(paramVar, bodyVar);

  const body = (tree as Branch).children[1]!;
  const [bodyType, , subs] = infer(
    body,
    {
      ...env,
      ...patterns,
    },
    input
  );
  const bodyVarSubs = unify(
    bodyVar,
    bodyType,
    body,
    input
  );
  const bodySubs = compose(
    subs,
    bodyVarSubs,
    body,
    input
  );
  const allSubs = compose(
    paramSubs,
    bodySubs,
    param,
    input
  );

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
    rhsType,
    newLambda(lhsType, opReturnType)
  );
  const subs = unify(opType, newType, rhs, input);
  const allSubs = compose(subs, lhsSubs, lhs, input);

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
  const [lhs, rhs] = (tree as Branch).children as [
    Tree,
    Tree
  ];
  const [lhsType, , lhsSubs] = infer(lhs, env, input);

  if (
    isConstructor(lhsType) &&
    lhsType.name === listType
  ) {
    // TODO: return Union of list member and Nothing
    return [lhsType.children[0]!, env, null];
  } else if (
    isConstructor(lhsType) &&
    lhsType.name === recordType
  ) {
    const [key] = infer(rhs, env, input);
    if (key !== stringType) {
      // TODO: show union of all keys instead
      throw makeError(input, [
        {
          expected: stringType,
          got: key,
          at: rhs.offset,
          size: rhs.size,
        },
      ]);
    }
    const label = (rhs as Token).text.slice(2, -2);
    const typeIndex = (
      lhsType as RecordType
    ).labels.findIndex(l => l === label);
    if (typeIndex === -1) {
      throw makeError(input, [
        {
          reason: `"${label}" is not a key of ${stringify(
            lhsType
          )}`,
          at: rhs.offset,
          size: rhs.size,
        },
      ]);
    }
    return [lhsType.children[typeIndex]!, env, null];
  } else {
    const argVar = newVar();
    const returnVar = newVar();
    const funVar = newLambda(argVar, returnVar);

    const moreFunSubs = unify(
      funVar,
      lhsType,
      tree,
      input
    );
    const allFunSubs = compose(
      lhsSubs,
      moreFunSubs,
      tree,
      input
    );

    const [argType, , argSubs] = infer(
      rhs,
      env,
      input
    );
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
  }
};

const declaration =
  (preventRedeclaration: boolean): Infer =>
  (tree, env, input) => {
    const lhs = (tree as Branch).children[0]!;
    const lhsVar = newVar();
    const [patterns, lhsSubs] = extractPatterns(
      lhs,
      lhsVar,
      input
    );

    if (preventRedeclaration) {
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
    const allSubs = compose(
      lhsSubs,
      subs,
      tree,
      input
    );

    const appliedEnv = applyEnv(
      newEnv,
      allSubs,
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

const record: Infer = (tree, env, input) => [
  newRecord(
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
  ),
  env,
  null,
];

const match: Infer = (tree, env, input) => {
  const [pattern, ...cases] = (tree as Branch)
    .children as [Token, ...Branch[]];
  const [patternType] = infer(pattern, env, input);
  const caseTypes = cases.map(
    ({ children: [pattern, _case] }) => {
      matchType(pattern!, patternType, env, input);
      return infer(_case!, env, input)[0];
    }
  );
  const type = caseTypes.reduce((type, t) =>
    apply(
      type,
      unify(type, t, tree, input),
      tree,
      input
    )
  );
  return [type, env, null];
};

const matchType = (
  pattern: Tree,
  type: Type,
  env: ReadonlyRecord<string, Type>,
  input: string
): void => {
  switch (pattern.type) {
    case "literal-pattern": {
      const literal = (pattern as Branch)
        .children[0] as Token;
      switch (literal.type) {
        case "name":
        case "operator": {
          if (!(literal.text in env))
            throw makeError(input, [
              {
                reason: `Unknown name "${literal.text}".`,
                at: literal.offset,
                size: literal.size,
              },
            ]);
          if (env[literal.text] !== type)
            throw makeError(input, [
              {
                expected: type,
                got: env[literal.text]!,
                at: literal.offset,
                size: literal.size,
              },
            ]);
          return;
        }
        case "number": {
          if (type !== numberType)
            throw makeError(input, [
              {
                expected: numberType,
                got: type,
                at: literal.offset,
                size: literal.size,
              },
            ]);
          return;
        }
        case "string": {
          if (type !== stringType)
            throw makeError(input, [
              {
                expected: stringType,
                got: type,
                at: literal.offset,
                size: literal.size,
              },
            ]);
          return;
        }
        case "boolean": {
          if (type !== booleanType)
            throw makeError(input, [
              {
                expected: booleanType,
                got: type,
                at: literal.offset,
                size: literal.size,
              },
            ]);
          return;
        }
        case "wildcard":
          return;
        default:
          throw makeError(input, [
            {
              reason: `Cannot match literal patterns of type "${literal.type}"`,
              at: literal.offset,
              size: literal.size,
            },
          ]);
      }
    }
    default: {
      log(pattern);
      throw makeError(input, [
        {
          reason: `Cannot match patterns of type "${pattern.type}"`,
          at: pattern.offset,
          size: pattern.size,
        },
      ]);
    }
  }
};

const extractPatterns = (
  pattern: Tree,
  type: Type,
  input: string
): readonly [
  ReadonlyRecord<string, Type>,
  Substitutions | null,
  Record<string, Type> | null
] => {
  switch (pattern.type) {
    case "literal-pattern": {
      const literal = (pattern as Branch)
        .children[0] as Token;
      switch (literal.type) {
        case "name":
        case "operator":
          return [
            { [literal.text]: type },
            null,
            null,
          ];
        case "number":
          return [
            {},
            [[type as number, numberType]],
            null,
          ];
        case "string":
          return [
            {},
            [[type as number, stringType]],
            null,
          ];
        case "boolean":
          return [
            {},
            [[type as number, booleanType]],
            null,
          ];
        case "wildcard":
          return [{}, null, null];
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
    case "list-pattern": {
      // TODO: Clean up this mess 😱
      const element = newVar();
      const container = newList(element);
      let subs: Substitutions = [
        [type as number, container],
      ];
      let patterns = {};
      for (const child of (pattern as Branch)
        .children) {
        const [pat, sub] = extractPatterns(
          child.type === "rest-pattern"
            ? {
                ...(child as Branch).children[0]!,
                type: "literal-pattern",
                children: [
                  (child as Branch).children[0]!,
                ],
              }
            : child,
          child.type === "rest-pattern"
            ? container
            : element,
          input
        );
        patterns = { ...patterns, ...pat };
        if (sub) {
          subs = compose(subs, sub, child, input);
        }
      }
      return [patterns, subs, null];
    }
    case "record-pattern": {
      // TODO: Clean up this mess 😱
      let subs: Substitutions = [];
      let patterns: Record<string, Type> = {};
      let container: Record<string, Type> = {};

      for (const child of (pattern as Branch)
        .children as Branch[]) {
        const field =
          child.children.length === 1
            ? child.children[0]! // literal
            : (child.children[1] as Branch); // assignment
        if (field.type === "rest-pattern") {
          // TODO: How can we return a usable type here?
          throw makeError(input, [
            {
              reason: `Unhandled field type "${field.type}"`,
              at: field.offset,
              size: field.size,
            },
          ]);
        }
        const [extracted, sub, extraContainer] =
          extractPatterns(field, newVar(), input);
        patterns = { ...patterns, ...extracted };
        if (sub) {
          subs = compose(subs, sub, field, input);
        }
        if (child.children.length === 1) {
          container = { ...container, ...extracted };
        } else {
          const name = (
            (child.children[0] as Branch)
              .children[0] as Token
          ).text;
          container = {
            ...container,
            [name]: newRecord(
              Object.entries(extraContainer!)
            ),
          };
        }
      }

      subs = compose(
        [
          [
            type as number,
            newRecord(Object.entries(container)),
          ],
        ],
        subs,
        pattern,
        input
      );

      return [patterns, subs, container];
    }
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
