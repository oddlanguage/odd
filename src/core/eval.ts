import { nothing } from "./odd.js";
import { Branch, Token, Tree } from "./parser.js";
import { log, ReadonlyRecord } from "./util.js";

// TODO: Skip .wat and go straight to .wasm
// https://www.youtube.com/watch?v=pkw9USN_Tko
// https://github.com/btzy/wasm-codegen/blob/master/wasm32-codewriter.js
// https://blog.ttulka.com/learning-webassembly-2-wasm-binary-format/
// https://webassembly.github.io/spec/core/index.html
// https://blog.scottlogic.com/2018/04/26/webassembly-by-hand.html

type Eval = (
  tree: Tree,
  env: ReadonlyRecord
) => readonly [
  any, // result
  ReadonlyRecord | null, // exports
  ReadonlyRecord // env
];

const _eval: Eval = (tree, env) => {
  switch (tree.type) {
    case "program":
      return program(tree, env);
    case "declaration":
      return declaration(tree, env);
    case "number":
      return number(tree, env);
    case "name":
      return name(tree, env);
    case "operator":
      return operator(tree, env);
    case "application":
      return application(tree, env);
    case "string":
      return string(tree, env);
    case "infix":
      return infix(tree, env);
    case "lambda":
      return lambda(tree, env);
    case "list":
      return list(tree, env);
    case "record":
      return record(tree, env);
    case "field":
      return field(tree, env);
    case "match":
      return match(tree, env);
    default: {
      log(tree);
      throw `Unhandled node type "${tree?.type}".`;
    }
  }
};

const program: Eval = (tree, env) =>
  (tree as Branch).children.reduce(
    ([, oldExports, oldEnv], child) => {
      const [value, exports, newEnv] = _eval(
        child,
        oldEnv
      );
      return [
        value,
        { ...oldExports, ...exports },
        newEnv
      ];
    },
    [nothing, {}, env] as const
  );

const declaration: Eval = (tree, env) => {
  const [rhs] = _eval(
    (tree as Branch).children[1]!,
    env
  );

  const extracted = extractPattern(
    (tree as Branch).children[0] as Branch,
    rhs
  );

  for (const key of Object.keys(extracted))
    if (key in env)
      throw `"${key}" is already defined.`;

  return [rhs, extracted, { ...env, ...extracted }];
};

const number: Eval = (tree, env) => [
  numberLiteral((tree as Token).text),
  null,
  env
];

const name: Eval = (tree, env) => {
  const { text: name } = tree as Token;

  if (!(name in env)) throw `Unknown name "${name}".`;

  return [env[name], null, env];
};

const operator: Eval = (tree, env) => {
  const { text: op } = tree as Token;

  if (!(op in env)) throw `Unknown operator "${op}".`;

  return [env[op], null, env];
};

const application: Eval = (tree, env) => {
  const [lhs] = _eval(
    (tree as Branch).children[0]!,
    env
  );

  const [rhs] = _eval(
    (tree as Branch).children[1]!,
    env
  );

  if (
    (lhs?.constructor === Object &&
      typeof rhs === "string") ||
    (Array.isArray(lhs) && typeof rhs === "number")
  )
    return [lhs[rhs], null, env];

  if (typeof lhs !== "function")
    throw `Cannot apply a non-function value "${lhs}".`;

  return [lhs(rhs), null, env];
};

const string: Eval = (tree, env) => [
  stringLiteral((tree as Token).text),
  null,
  env
];

const infix: Eval = (tree, env) => {
  const [lhs] = _eval(
    (tree as Branch).children[0]!,
    env
  );
  const [op] = _eval(
    (tree as Branch).children[1]!,
    env
  );
  const [rhs] = _eval(
    (tree as Branch).children[2]!,
    env
  );
  return [op(rhs)(lhs), null, env];
};

const lambda: Eval = (tree, env) => [
  (arg: any) =>
    _eval((tree as Branch).children[1]!, {
      ...env,
      ...extractPattern(
        (tree as Branch).children[0] as Branch,
        arg
      )
    })[0],
  null,
  env
];

const list: Eval = (tree, env) => {
  const result: any[] = [];
  for (const child of (tree as Branch).children) {
    if (child.type === "destructuring") {
      result.push(
        ..._eval(
          (child as Branch).children[0]!,
          env
        )[0]
      );
    } else {
      result.push(_eval(child, env)[0]);
    }
  }
  return [result, null, env];
};

const record: Eval = (tree, env) => [
  (tree as Branch).children.reduce((acc, child) => {
    const [value] = _eval(child, env);
    return { ...acc, ...value };
  }, {}),
  null,
  env
];

const field: Eval = (tree, env) => {
  const field = (tree as Branch).children[0]!;
  switch (field.type) {
    case "declaration":
      return [
        extractPattern(
          (field as Branch).children[0] as Branch,
          _eval((field as Branch).children[1]!, env)[0]
        ),
        null,
        env
      ];
    case "name":
      return [
        {
          [(field as Token).text]: _eval(field, env)[0]
        },
        null,
        env
      ];
    case "destructuring":
      return [
        {
          ..._eval(
            (field as Branch).children[0]!,
            env
          )[0]
        },
        null,
        env
      ];
    default: {
      log(field);
      throw `Unhandled field type "${field.type}".`;
    }
  }
};

const match: Eval = (tree, env) => {
  const [value] = _eval(
    (tree as Branch).children[0]!,
    env
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
    matchPattern(pattern, value)
  )!;

  return [
    _eval(match[1], {
      ...env,
      ...extractPattern(match[0], value)
    })[0],
    null,
    env
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
  value: any
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
        default: {
          log(literal);
          throw `Unhandled matcher for literal pattern type "${literal?.type}".`;
        }
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
            matchPattern(pattern, value[i])
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
            ]
          );
        })
      );
    }
    default: {
      log(pattern);
      throw `Unhandled matcher for pattern type "${pattern?.type}".`;
    }
  }
};

const extractPattern = (
  pattern: Branch,
  value: any
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
        default: {
          log(literal);
          throw `Unhandled extractor for literal pattern type "${literal?.type}".`;
        }
      }
    }
    case "list-pattern":
      return (pattern.children as Branch[]).reduce(
        (extracted, pattern, i) => ({
          ...extracted,
          ...extractPattern(
            pattern,
            pattern.type === "rest-pattern"
              ? value.slice(i)
              : value[i]
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
            ...extractPattern(
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
                  ]
            )
          };
        },
        {}
      );
    default: {
      log(pattern);
      throw `Unhandled extractor for pattern type "${pattern?.type}".`;
    }
  }
};
