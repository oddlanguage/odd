import {
  Branch,
  makeError,
  Token,
  Tree
} from "./parser.js";
import {
  capitalise,
  last,
  serialise
} from "./util.js";

// TODO: Skip .wat and go straight to .wasm
// https://www.youtube.com/watch?v=pkw9USN_Tko
// https://github.com/btzy/wasm-codegen/blob/master/wasm32-codewriter.js
// https://blog.ttulka.com/learning-webassembly-2-wasm-binary-format/
// https://webassembly.github.io/spec/core/index.html
// https://blog.scottlogic.com/2018/04/26/webassembly-by-hand.html

export type Env = Readonly<Record<string, any>>;

const _eval = (
  tree: Tree,
  env: Env,
  input: string
): readonly [any, Env] => {
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
    default: {
      console.log(serialise(branch));
      throw `Error: unhandled node type "${branch.type}".`;
    }
  }
};

export default _eval;

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
) =>
  [
    (arg: any) =>
      _eval(
        branch.children[1]!,
        {
          ...env,
          [(branch.children[0] as Token).text]: arg
        },
        input
      )[0],
    env
  ] as const;

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
    !["record", "list"].includes(
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
    throw makeError("Something went wrong", {
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
  branch: Readonly<{
    type: string;
    children: readonly Tree[];
  }>,
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

  const name = (
    (branch.children[0] as Branch).children[0] as Token
  ).text;
  const [value, newEnv] = _eval(
    branch.children[0]!,
    env,
    input
  );
  return [
    [name, value],
    { ...newEnv, ...env }
  ] as const;
};

const record = (
  branch: Readonly<{
    type: string;
    children: readonly Tree[];
  }>,
  input: string,
  env: Env
) =>
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
  );

const list = (
  branch: Readonly<{
    type: string;
    children: readonly Tree[];
  }>,
  input: string,
  env: Env
) =>
  branch.children.reduce(
    ([list, env], child) => {
      const [value, newEnv] = _eval(child, env, input);
      return [list.concat(value), newEnv] as const;
    },
    [[] as any, env] as const
  );

const application = (
  branch: Readonly<{
    type: string;
    children: readonly Tree[];
  }>,
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
    Array.isArray(lhs) || lhs?.constructor === Object
      ? lhs[rhs]
      : lhs(rhs),
    env2
  ] as const;
};

const declaration = (
  branch: Readonly<{
    type: string;
    children: readonly Tree[];
  }>,
  env: Env,
  input: string
) => {
  const name = (branch.children[0] as Token).text;
  const [value, newEnv] = _eval(
    branch.children[1]!,
    env,
    input
  );
  return [
    value,
    { ...newEnv, [name]: value }
  ] as const;
};

const infix = (
  branch: Readonly<{
    type: string;
    children: readonly Tree[];
  }>,
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

  return [op(lhs)(rhs), env3] as const;
};

const string = (
  token: Readonly<{
    type?: string | undefined;
    text: string;
    offset: number;
  }>,
  env: Env
) => [token.text.slice(2, -2), env] as const;

const number = (
  token: Readonly<{
    type?: string | undefined;
    text: string;
    offset: number;
  }>,
  env: Env
) =>
  [
    parseFloat(token.text.replace(/,/g, "")),
    env
  ] as const;

const symbol = (
  env: Env,
  token: Readonly<{
    type?: string | undefined;
    text: string;
    offset: number;
  }>,
  input: string
) => {
  const value = env[token.text];
  if (value === undefined || value === null)
    throw makeError("Something went wrong", {
      input,
      offset: 0,
      ok: false,
      problems: [
        {
          reason: `${capitalise(token.type!)} "${
            token.text
          }" is not defined.`,
          at: token.offset,
          size: token.text.length
        }
      ]
    });
  return [value, env] as const;
};

const program = (
  branch: Readonly<{
    type: string;
    children: readonly Tree[];
  }>,
  input: string,
  env: Env
) =>
  branch.children.reduce(
    ([, newEnv], child) => _eval(child, newEnv, input),
    [null, env] as const
  );
