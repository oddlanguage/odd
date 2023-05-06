import { nothing } from "./odd.js";
import { Branch, Token, Tree } from "./parser.js";
import { makeError } from "./problem.js";
import { Mutable, ReadonlyRecord } from "./util.js";

type Eval = (
  tree: Tree,
  env: ReadonlyRecord,
  input: string
) => readonly [
  any,
  ReadonlyRecord | null,
  ReadonlyRecord
];

const _eval: Eval = (tree, env, input) => {
  switch (tree.type) {
    case "program":
      return program(tree, env, input);
    case "declaration":
      return declaration(tree, env, input);
    case "number":
      return number(tree, env, input);
    case "name":
      return name(tree, env, input);
    case "operator":
      return operator(tree, env, input);
    case "application":
      return application(tree, env, input);
    case "string":
      return string(tree, env, input);
    case "infix":
      return infix(tree, env, input);
    case "lambda":
      return lambda(tree, env, input);
    case "list":
      return list(tree, env, input);
    case "record":
      return record(tree, env, input);
    case "field":
      return field(tree, env, input);
    case "match":
      return match(tree, env, input);
    default:
      throw makeError(input, [
        {
          reason: `Unhandled node type "${tree?.type}".`,
          at: tree.offset,
          size: tree.size,
        },
      ]);
  }
};

const program: Eval = (tree, env, input) =>
  (tree as Branch).children.reduce(
    ([, oldExports, oldEnv], child) => {
      const [value, newExports, newEnv] = _eval(
        child,
        oldEnv,
        input
      );
      return [
        value,
        { ...oldExports, ...newExports },
        newEnv,
      ];
    },
    [nothing, {}, { ...env }] as const
  );

const declaration: Eval = (tree, env, input) => {
  const mutableEnvToAllowRecursion: Mutable<ReadonlyRecord> =
    env;

  const [rhs] = _eval(
    (tree as Branch).children[1]!,
    mutableEnvToAllowRecursion,
    input
  );

  const lhsTree = (tree as Branch)
    .children[0] as Branch;
  const extracted = extractPatterns(
    lhsTree,
    rhs,
    input
  );

  for (const [key, value] of Object.entries(
    extracted
  )) {
    mutableEnvToAllowRecursion[key] = value;
    if (typeof value === "function") {
      Object.defineProperty(value, "name", {
        get: () => key,
      });
    }
  }

  return [rhs, extracted, mutableEnvToAllowRecursion];
};

const number: Eval = (tree, env) => [
  numberLiteral((tree as Token).text),
  null,
  env,
];

const name: Eval = (tree, env) => [
  env[(tree as Token).text],
  null,
  env,
];

const operator: Eval = (tree, env) => [
  env[(tree as Token).text],
  null,
  env,
];

const application: Eval = (tree, env, input) => {
  const lhsTree = (tree as Branch).children[0]!;
  const [lhs] = _eval(lhsTree, env, input);

  const [rhs] = _eval(
    (tree as Branch).children[1]!,
    env,
    input
  );

  if (
    (lhs?.constructor === Object &&
      typeof rhs === "string") ||
    (Array.isArray(lhs) && typeof rhs === "number")
  )
    return [lhs[rhs], null, env];

  return [lhs(rhs), null, env];
};

const string: Eval = (tree, env) => [
  stringLiteral((tree as Token).text),
  null,
  env,
];

const infix: Eval = (tree, env, input) => {
  const [op] = _eval(
    (tree as Branch).children[1]!,
    env,
    input
  );
  const [lhs] = _eval(
    (tree as Branch).children[0]!,
    env,
    input
  );

  // TODO: Figure out how to do this out of the interpreter
  const opName = (
    (tree as Branch).children[1] as Token
  ).text;
  if (
    (opName === "&" && !lhs) ||
    (opName === "|" && lhs)
  )
    return [lhs, null, env];

  const [rhs] = _eval(
    (tree as Branch).children[2]!,
    env,
    input
  );
  return [op(rhs)(lhs), null, env];
};

const lambda: Eval = (tree, env, input) => [
  (arg: any) =>
    _eval(
      (tree as Branch).children[1]!,
      {
        ...env,
        ...extractPatterns(
          (tree as Branch).children[0] as Branch,
          arg,
          input
        ),
      },
      input
    )[0],
  null,
  env,
];

const list: Eval = (tree, env, input) => {
  const result: any[] = [];
  for (const child of (tree as Branch).children) {
    if (child.type === "destructuring") {
      result.push(
        ..._eval(
          (child as Branch).children[0]!,
          env,
          input
        )[0]
      );
    } else {
      result.push(_eval(child, env, input)[0]);
    }
  }
  return [result, null, env];
};

const record: Eval = (tree, env, input) => [
  (tree as Branch).children.reduce((acc, child) => {
    const [value] = _eval(child, env, input);
    return { ...acc, ...value };
  }, {}),
  null,
  env,
];

const field: Eval = (tree, env, input) => {
  const field = (tree as Branch).children[0]!;
  switch (field.type) {
    case "declaration":
      return [
        extractPatterns(
          (field as Branch).children[0] as Branch,
          _eval(
            (field as Branch).children[1]!,
            env,
            input
          )[0],
          input
        ),
        null,
        env,
      ];
    case "name":
      return [
        {
          [(field as Token).text]: _eval(
            field,
            env,
            input
          )[0],
        },
        null,
        env,
      ];
    case "destructuring":
      return [
        {
          ..._eval(
            (field as Branch).children[0]!,
            env,
            input
          )[0],
        },
        null,
        env,
      ];
    default:
      throw makeError(input, [
        {
          reason: `Unhandled field type "${field.type}".`,
          at: field.offset,
          size: field.size,
        },
      ]);
  }
};

const match: Eval = (tree, env, input) => {
  const [value] = _eval(
    (tree as Branch).children[0]!,
    env,
    input
  );
  const cases = (tree as Branch).children
    .slice(1)
    .map(
      child =>
        (child as Branch).children as readonly [
          Branch,
          Branch
        ]
    );
  const match = cases.find(([pattern]) =>
    matchPattern(pattern, value, input)
  );

  // TODO: This should be impossible after semantic analysis
  if (!match) {
    throw makeError(input, [
      {
        reason: "No matching case found.",
        at: tree.offset,
        size: tree.size,
      },
    ]);
  }

  return [
    _eval(
      match[1],
      {
        ...env,
        ...extractPatterns(match[0], value, input),
      },
      input
    )[0],
    null,
    env,
  ];
};

export default _eval;

const numberLiteral = (number: string) =>
  Number(number.replace(/,/g, ""));

const stringLiteral = (string: string) =>
  string.slice(2, -2);

const booleanLiteral = (string: string) =>
  string === "true";

const matchPattern = (
  pattern: Tree,
  value: any,
  input: string
): boolean => {
  switch (pattern.type) {
    case "rest-pattern":
      return true;
    case "literal-pattern": {
      const literal = (pattern as Branch)
        .children[0] as Token;
      switch (literal.type) {
        case "name":
        case "operator":
        case "wildcard":
          return true;
        case "string":
          return stringLiteral(literal.text) === value;
        case "number":
          return numberLiteral(literal.text) === value;
        case "boolean":
          return (
            booleanLiteral(literal.text) === value
          );
        default:
          throw makeError(input, [
            {
              reason: `Unhandled matcher for literal pattern type "${literal.type}".`,
              at: literal.offset,
              size: literal.size,
            },
          ]);
      }
    }
    case "list-pattern": {
      if (!Array.isArray(value)) return false;
      const patternSize = (pattern as Branch).children
        .map(child =>
          child.type === "rest-pattern" ? Infinity : 1
        )
        .reduce((x, y) => x + y, 0);
      return (
        patternSize >= value.length &&
        (pattern as Branch).children.every(
          (pattern, i) =>
            matchPattern(pattern, value[i], input)
        )
      );
    }
    case "record-pattern": {
      if (value.constructor !== Object) return false;
      const patternSize = (pattern as Branch).children
        .map(child =>
          (child as Branch).children[0]!.type ===
          "rest-pattern"
            ? Infinity
            : 1
        )
        .reduce((x, y) => x + y, 0);
      return (
        patternSize >= Object.keys(value).length &&
        (pattern as Branch).children.every(pattern => {
          return matchPattern(
            (pattern as Branch).children[
              (pattern as Branch).children.length - 1
            ]!,
            value[
              (
                (
                  (pattern as Branch)
                    .children[0] as Branch
                ).children[0] as Token
              ).text
            ],
            input
          );
        })
      );
    }
    default:
      throw makeError(input, [
        {
          reason: `Unhandled matcher for pattern type "${pattern.type}".`,
          at: pattern.offset,
          size: pattern.size,
        },
      ]);
  }
};

const extractPatterns = (
  pattern: Branch,
  value: any,
  input: string
): ReadonlyRecord => {
  switch (pattern.type) {
    case "rest-pattern": {
      const literal = pattern.children[0] as Token;
      return { [literal.text]: value };
    }
    case "literal-pattern": {
      const literal = pattern.children[0] as Token;
      switch (literal.type) {
        case "name":
        case "operator":
          return { [literal.text]: value };
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
              size: literal.size,
            },
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
              ? value.slice(i)
              : value[i],
            input
          ),
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
                ? Object.fromEntries(
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
                        value
                      ).filter(
                        ([name]) =>
                          !names.includes(name)
                      );
                    })()
                  )
                : value[
                    (field.children[0] as Token).text
                  ],
              input
            ),
          };
        },
        {}
      );
    default:
      throw makeError(input, [
        {
          reason: `Unhandled extractor for pattern type "${pattern?.type}".`,
          at: pattern.offset,
          size: pattern.size,
        },
      ]);
  }
};
