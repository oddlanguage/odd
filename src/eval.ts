import { nothing } from "./odd.js";
import {
  Branch,
  makeError,
  Token,
  Tree
} from "./parser.js";
import {
  capitalise,
  difference,
  serialise
} from "./util.js";

// TODO: Skip .wat and go straight to .wasm
// https://www.youtube.com/watch?v=pkw9USN_Tko
// https://github.com/btzy/wasm-codegen/blob/master/wasm32-codewriter.js
// https://blog.ttulka.com/learning-webassembly-2-wasm-binary-format/
// https://webassembly.github.io/spec/core/index.html
// https://blog.scottlogic.com/2018/04/26/webassembly-by-hand.html

export type Env = Readonly<Record<string, any>>;

type Flags = Partial<
  Readonly<{
    // TODO: Supply flags
  }>
>;

const _eval = (
  tree: Tree,
  env: Env,
  input: string,
  flags?: Flags
): readonly [any, Env] => {
  // TODO: Optimise: extract errors in a try/catch
  // and wrap it in makeError to prevent passing
  // `input` through every function
  const branch = tree as Branch;
  const token = tree as Token;
  switch (branch.type) {
    case "program":
      return program(branch, env, input);
    case "operator":
      return symbol(token, env, input);
    case "name":
      return symbol(token, env, input);
    case "number":
      return number(token, env);
    case "string":
      return string(token, env);
    case "infix":
      return infix(branch, env, input);
    case "declaration":
      return declaration(branch, env, input);
    case "application":
      return application(branch, env, input);
    case "list":
      return list(branch, env, input);
    case "record":
      return record(branch, env, input);
    case "field":
      return field(branch, env, input);
    case "destructuring":
      return destructuring(branch, env, input);
    case "lambda":
      return lambda(branch, env, input);
    case "match":
      return match(branch, env, input);
    case "case":
      return matchCase(branch, env, input);
    case "literal-pattern":
      return literalPattern(branch, env);
    case "list-pattern":
      return listPattern(branch, env, input);
    case "record-pattern":
      return recordPattern(branch, env, input);
    case "field-pattern":
      return fieldPattern(branch, env, input);
    case "rest-pattern":
      return restPattern(branch, env);
    default: {
      console.log(serialise(branch));
      throw makeError({
        input,
        offset: 0,
        ok: false,
        problems: [
          {
            reason: `DevDidAnOopsieError: unhandled node type "${branch.type}".`,
            at: branch.offset,
            size: branch.size
          }
        ]
      });
    }
  }
};

export default _eval;

const restPattern = (branch: Branch, env: Env) =>
  [branch, env] as const;

const fieldPattern = (
  branch: Branch,
  env: Env,
  input: string
) =>
  branch.children.reduce(
    ([names, env], child) =>
      [
        names.concat(_eval(child, env, input)[0]),
        env
      ] as const,
    [[] as any[], env] as const
  );

const recordPattern = (
  branch: Branch,
  env: Env,
  input: string
) =>
  [
    branch.children.map(
      node => _eval(node, env, input)[0]
    ),
    env
  ] as const;

const listPattern = (
  branch: Branch,
  env: Env,
  input: string
) =>
  [
    branch.children.map(
      node => _eval(node, env, input)[0]
    ),
    env
  ] as const;

const literalPattern = (branch: Branch, env: Env) =>
  [branch.children[0], env] as const;

const matchCase = (
  branch: Branch,
  env: Env,
  input: string
) => {
  const [lhs, env1] = _eval(
    branch.children[0]!,
    env,
    input,
    { patternIsCase: true }
  );
  const [rhs, env2] = _eval(
    branch.children[1]!,
    env1,
    input
  );
  return [[lhs, rhs], env2] as const;
};

const match = (
  branch: Branch,
  env: Env,
  input: string
) => {
  const [value, newEnv] = _eval(
    branch.children[0]!,
    env,
    input
  );
  let idx = -1;
  return [
    branch.children
      .slice(1)
      .map((child, i, children) => {
        const [[lhs, rhs]] = _eval(child, env, input);
        const isPlaceholder = /_+/.test(
          (
            (children[i] as Branch)
              .children[0] as Token
          ).text
        );
        if (
          idx === -1 &&
          (isPlaceholder || lhs === value)
        )
          idx = i;
        return rhs;
      })[idx],
    newEnv
  ] as const;
};

const lambda = (
  branch: Branch,
  env: Env,
  input: string
) => {
  const [patterns] = _eval(
    branch.children[0]!,
    env,
    input
  );

  const lambda = (arg: any) =>
    _eval(
      branch.children[1]!,
      insertPatternsIntoEnv(patterns, arg, env, input),
      input
    )[0];

  return [lambda, env] as const;
};

const destructuring = (
  branch: Branch,
  env: Env,
  input: string
) => {
  const result = _eval(
    branch.children[0]!,
    env,
    input
  );
  if (
    !["record", "list", "name"].includes(
      branch.children[0]!.type!
    )
  ) {
    throw makeError({
      input,
      offset: 0,
      ok: false,
      problems: [
        {
          reason: `Cannot destructure a non-structural value (${result[0]}).`,
          at: branch.children[0]!.offset,
          size: branch.children[0]!.size
        }
      ]
    });
  }
  return result;
};

const field = (
  branch: Branch,
  env: Env,
  input: string
) => {
  if (branch.children[0]!.type === "name") {
    const name = (branch.children[0] as Token).text;
    const [value, newEnv] = _eval(
      branch.children[0]!,
      env,
      input
    );
    return [[name, value], newEnv] as const;
  }

  if (branch.children[0]!.type === "destructuring")
    return _eval(branch.children[0]!, env, input);

  const [value, env2] = _eval(
    branch.children[0]!,
    env,
    input
  );
  // TODO: Should probably pass the name as param instead :)
  const name = Object.keys(difference(env, env2))[0];
  return [[name, value], env] as const;
};

const record = (
  branch: Branch,
  env: Env,
  input: string
) =>
  [
    branch.children.reduce(
      ([record, env], child) => {
        const [result] = _eval(child, env, input);
        return [
          Array.isArray(result)
            ? { ...record, [result[0]]: result[1] }
            : { ...record, ...result },
          env
        ] as const;
      },
      [{}, env] as const
    )[0],
    env
  ] as const;

const list = (
  branch: Branch,
  env: Env,
  input: string
) =>
  branch.children.reduce(
    ([list, env], child) => {
      const [value, newEnv] = _eval(child, env, input);
      return [
        child.type === "destructuring"
          ? list.concat(value)
          : [...list, value],
        newEnv
      ] as const;
    },
    [[] as any, env] as const
  );

const application = (
  branch: Branch,
  env: Env,
  input: string
) => {
  const [lhs, env1] = _eval(
    branch.children[0]!,
    env,
    input
  );
  const [rhs, env2] = _eval(
    branch.children[1]!,
    env1,
    input
  );
  return [
    (Array.isArray(lhs) || lhs?.constructor === Object
      ? lhs[rhs]
      : lhs(rhs)) ?? nothing,
    env2
  ] as const;
};

const declaration = (
  branch: Branch,
  env: Env,
  input: string
) => {
  const [patterns] = _eval(
    branch.children[0]!,
    env,
    input
  );
  const [value] = _eval(
    branch.children[1]!,
    env,
    input
  );

  return [
    value,
    insertPatternsIntoEnv(patterns, value, env, input)
  ] as const;
};

const insertPatternsIntoEnv = (
  names: any,
  value: any,
  env: Env,
  input: string
): ReadonlyArray<readonly [Token, any]> => {
  const isDestructuring = Array.isArray(names);

  const patterns = (
    isDestructuring
      ? flattenExtractedPatternEntries(
          // TODO: Check if rest patterns are last child
          Array.isArray(value)
            ? extractListElements(names, value)
            : names.map(name =>
                extractRecordFields(name, value)
              )
        )
      : [[names, value]]
  ) as (readonly [any, any])[];

  // TODO: Check if names are assignable
  // TODO: Figure out what it means to be "assignable"?

  const duplicate = patterns.find(
    ([{ text }]) => text in env
  )?.[0];
  if (duplicate)
    throw makeError({
      input,
      offset: 0,
      ok: false,
      problems: [
        {
          reason: `${capitalise(duplicate.type!)} "${
            duplicate.text
          }" is already defined.`,
          at: duplicate.offset,
          size: duplicate.size
        }
      ]
    });

  return {
    ...env,
    ...Object.fromEntries(
      patterns.map(([{ text: key }, value]) => [
        key,
        value
      ])
    )
  };
};

type Entry =
  | readonly [any, any]
  | ReadonlyArray<Entry>;

const flattenExtractedPatternEntries = (
  entries: ReadonlyArray<Entry>
) => {
  const clone = entries.slice();
  const output = [];
  let i = 0;
  let target: Entry;
  while (i < clone.length) {
    target = clone[i]!;
    if (typeof target[0]?.text === "string") {
      output.push(target);
      i += 1;
    } else {
      clone.splice(i, 1, ...target);
    }
  }
  return output as ReadonlyArray<readonly [any, any]>;
};

const extractListElements = (
  name: any,
  value: any
): any =>
  Array.isArray(name)
    ? name.map((name, i) => {
        const isRestPattern =
          name.type === "rest-pattern";
        return extractListElements(
          isRestPattern ? name.children[0] : name,
          isRestPattern ? value.slice(i) : value[i]
        );
      })
    : [name, value];

const extractRecordFields = (
  names: any,
  value: any
): any => {
  if (!Array.isArray(names))
    return [names, value[names.text]];

  const results = [];
  const clone = names.slice();
  for (let i = 0; i < clone.length; i += 1) {
    const name = clone[i];
    const children = [] as any[];
    for (const x of clone.slice(i + 1)) {
      if (!Array.isArray(x)) break;
      children.push(x);
    }
    if (children.length) {
      clone.splice(i, children.length);
      results.push(
        extractRecordFields(
          children.flat(),
          value[name.text]
        )
      );
    } else {
      results.push(extractRecordFields(name, value));
    }
  }

  return results;
};

const infix = (
  branch: Branch,
  env: Env,
  input: string
) => {
  const [lhs, env1] = _eval(
    branch.children[0]!,
    env,
    input
  );
  const [op, env2] = _eval(
    branch.children[1]!,
    env1,
    input
  );
  const [rhs, env3] = _eval(
    branch.children[2]!,
    env2,
    input
  );

  return [op(rhs)(lhs), env3] as const;
};

const string = (token: Token, env: Env) =>
  [token.text.slice(2, -2), env] as const;

const number = (token: Token, env: Env) =>
  [
    parseFloat(token.text.replace(/,/g, "")),
    env
  ] as const;

const symbol = (
  token: Token,
  env: Env,
  input: string
) => {
  const value = env[token.text];
  if (value === undefined || value === null)
    throw makeError({
      input,
      offset: 0,
      ok: false,
      problems: [
        {
          reason: `${capitalise(token.type!)} "${
            token.text
          }" is not defined.`,
          at: token.offset,
          size: token.size
        }
      ]
    });
  return [value, env] as const;
};

const program = (
  branch: Branch,
  env: Env,
  input: string
) =>
  branch.children.reduce(
    ([, newEnv], child) => _eval(child, newEnv, input),
    [nothing, env] as const
  );
