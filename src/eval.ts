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
  last,
  serialise
} from "./util.js";

// TODO: Skip .wat and go straight to .wasm
// https://www.youtube.com/watch?v=pkw9USN_Tko
// https://github.com/btzy/wasm-codegen/blob/master/wasm32-codewriter.js
// https://blog.ttulka.com/learning-webassembly-2-wasm-binary-format/
// https://webassembly.github.io/spec/core/index.html
// https://blog.scottlogic.com/2018/04/26/webassembly-by-hand.html

const firstTokenChild = (branch: any): Token => {
  if ((branch as Token).text) return branch;
  for (const child of branch.children) {
    const token = firstTokenChild(child);
    if (token) return token;
  }
  throw "Unreachable";
};

export type Env = Readonly<Record<string, any>>;

const _eval = (
  tree: Tree,
  env: Env,
  input: string
): readonly [any, Env] => {
  // TODO: Optimise: extract errors in a try/catch
  // and wrap it in makeError to prevent passing
  // `input` through every function
  const branch = tree as Branch;
  const token = tree as Token;
  switch (branch.type) {
    case "program":
      return program(branch, input, env);
    case "operator":
    case "name":
      return symbol(env, token, input);
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
      return list(branch, input, env);
    case "record":
      return record(branch, input, env);
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
    case "placeholder":
      return [null, env] as const;
    case "literal-pattern":
      return literalPattern(branch, env, input);
    case "list-pattern":
      return listPattern(branch, env, input);
    case "record-pattern":
      return recordPattern(branch, env, input);
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

  return [name, env] as const;
};

const matchCase = (
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

  const lambda = (arg: any) => {
    // TODO: non-operator / non-name / record patterns
    return _eval(
      branch.children[1]!,
      Array.isArray(names)
        ? {
            ...env,
            // TODO: deep lists
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
  };

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
    const at =
      (branch.children[0] as Token).offset ??
      (
        (branch.children[0] as Branch)
          .children[0] as Token
      ).offset;
    const size =
      ((branch.children[0] as Token).offset ??
        (
          last(
            (branch.children[0] as Branch).children
          ) as Token
        ).offset) -
      at +
      1;
    throw makeError({
      input,
      offset: 0,
      ok: false,
      problems: [
        {
          reason: `Cannot destructure a non-structural value (${result[0]}).`,
          at,
          size
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
  input: string,
  env: Env
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
  input: string,
  env: Env
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
  const [names, env1] = _eval(
    branch.children[0]!,
    env,
    input
  );
  const [value, env2] = _eval(
    branch.children[1]!,
    env1,
    input
  );

  switch (branch.children[0]!.type) {
    case "literal-pattern": {
      return [
        value,
        { ...env2, [names]: value }
      ] as const;
    }
    case "list-pattern": {
      return [
        value,
        {
          ...env2,
          ...Object.fromEntries([
            destructureList(names, 0, value).flat(
              Infinity
            )
          ])
        }
      ] as const;
    }
    case "record-pattern": {
      return [
        value,
        {
          ...env2,
          ...Object.fromEntries(
            (names as any[]).map(name => [
              name,
              value[name] ?? nothing
            ])
          )
        }
      ] as const;
    }
    default: {
      console.log(serialise(branch.children[0]));
      throw makeError({
        input,
        offset: 0,
        ok: false,
        problems: [
          {
            reason: `DevDidAnOopsieError: unhandled assignment target "${
              branch.children[0]!.type
            }".`,
            at: branch.children[0]!.offset,
            size: branch.children[0]!.size
          }
        ]
      });
    }
  }
};

const destructureList = (
  name: any,
  i: number,
  value: any
): any =>
  Array.isArray(name)
    ? name.map((name, j) =>
        destructureList(name, j, value[j])
      )
    : [name, value ?? nothing];

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
  env: Env,
  token: Token,
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
  input: string,
  env: Env
) =>
  branch.children.reduce(
    ([, newEnv], child) => _eval(child, newEnv, input),
    [nothing, env] as const
  );
