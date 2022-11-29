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
  flattenEntries,
  log,
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
      return literalPattern(branch, env, input);
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
  [
    "..." + (branch.children[0] as Token).text,
    env
  ] as const;

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

const literalPattern = (
  branch: Branch,
  env: Env,
  input: string
) => {
  // TODO: This only handles name and operator patterns.
  // TODO: Support all types of literal patterns (when not lhs)

  const token = branch.children[0] as Token;
  if (!["name", "operator"].includes(token.type!))
    throw makeError({
      input,
      offset: 0,
      ok: false,
      problems: [
        {
          reason: `"${token.type}" is not an assignable pattern.`,
          at: token.offset,
          size: token.size
        }
      ]
    });

  const name = token.text;
  if (name in env)
    throw makeError({
      input,
      offset: 0,
      ok: false,
      problems: [
        {
          reason: `${capitalise(
            token.type!
          )} "${name}" is already defined.`,
          at: token.offset,
          size: token.size
        }
      ]
    });

  return [name, {}] as const;
};

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
  const [names] = _eval(
    branch.children[0]!,
    env,
    input
  );

  const lambda = (arg: any) =>
    _eval(
      branch.children[1]!,
      // TODO: Re-use pattern evaluation
      Array.isArray(names)
        ? {
            ...env,
            ...(Array.isArray(arg)
              ? Object.fromEntries(
                  names.map((name, i) => [
                    name,
                    arg[i] ?? nothing
                  ])
                )
              : Object.fromEntries(
                  names.map(name => [
                    name,
                    arg[name] ?? nothing
                  ])
                ))
          }
        : { ...env, [names]: arg },
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
        const [result, newEnv] = _eval(
          child,
          env,
          input
        );
        return [
          Array.isArray(result)
            ? { ...record, [result[0]]: result[1] }
            : { ...record, ...result },
          newEnv
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
  const [name] = _eval(
    branch.children[0]!,
    env,
    input
  );
  const [value] = _eval(
    branch.children[1]!,
    env,
    input
  );

  const isDestructuring = Array.isArray(name);

  return [
    value,
    isDestructuring
      ? Array.isArray(value)
        ? {
            ...env,
            ...Object.fromEntries(
              // TODO: Throw error on duplicate name
              // TODO: Check if rest pattern is last
              flattenEntries(
                name.map((name, i) =>
                  extractListElements(name, value[i])
                )
              )
            )
          }
        : (() => {
            log({ name, value });
            throw "Record destructuring not implemented.";
          })()
      : {
          ...env,
          [name]: value
        }
  ] as const;
};

const extractListElements = (
  name: any,
  value: any
): any =>
  Array.isArray(name)
    ? name.map((name, i) => {
        const isRestPattern =
          typeof name === "string" &&
          name.startsWith("...");
        return extractListElements(
          isRestPattern ? name.slice(3) : name,
          isRestPattern ? value.slice(i) : value[i]
        );
      })
    : [name, value];

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
