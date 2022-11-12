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
      return branch.children.reduce(
        ([, newEnv], child) =>
          _eval(child, newEnv, input),
        [null, env] as ReturnType<typeof _eval>
      );
    case "operator":
    case "name": {
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
      return [value, env];
    }
    case "number":
      return [
        parseFloat(token.text.replace(/,/g, "")),
        env
      ];
    case "string":
      return [token.text.slice(2, -2), env];
    case "infix": {
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

      if (!op)
        throw makeError("Something went wrong", {
          input,
          offset: 0,
          ok: false,
          problems: [
            {
              reason: `Operator "${
                (branch.children[1] as Token).text
              }" is not defined.`,
              at: (branch.children[1] as Token).offset,
              size: (branch.children[1] as Token).text
                .length
            }
          ]
        });

      return [op(lhs)(rhs), env3];
    }
    case "declaration": {
      if (branch.children.length > 2)
        throw `Error: function declaration is not implemented yet.`;

      const name = (branch.children[0] as Token).text;
      const [value, env1] = _eval(
        branch.children[1]!,
        env,
        input
      );
      return [value, { ...env1, [name]: value }];
    }
    case "application": {
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
      return [lhs(rhs), env2];
    }
    case "list":
      return branch.children.reduce(
        ([list, env], child) => {
          const [value, newEnv] = _eval(
            child,
            env,
            input
          );
          return [list.concat(value), newEnv];
        },
        [[], env] as ReturnType<typeof _eval>
      );
    case "record":
      return branch.children.reduce(
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
          ];
        },
        [{}, env] as ReturnType<typeof _eval>
      );
    case "field": {
      if (branch.children[0]!.type === "name") {
        const name = (branch.children[0] as Token)
          .text;
        const [value, newEnv] = _eval(
          branch.children[0]!,
          env,
          input
        );
        return [[name, value], newEnv];
      }

      if (branch.children[0]!.type === "destructuring")
        return _eval(branch.children[0]!, env, input);

      if (
        (branch.children[0] as Branch).children
          .length > 2
      )
        throw `Error: function declaration is not implemented yet.`;

      const [lhs, rhs] = (branch.children[0] as Branch)
        .children as [Token, Token];
      const name = lhs.text;
      const [value, newEnv] = _eval(rhs, env, input);
      return [[name, value], newEnv];
    }
    case "destructuring": {
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
    }
    case "lambda": {
      if (branch.children.length > 2)
        throw `Error: Multi parameter lambdas are not implemented yet.`;

      const param = (branch.children[0] as Token).text;
      return [
        (arg: any) =>
          _eval(
            branch.children[1]!,
            {
              ...env,
              [param]: arg
            },
            input
          )[0],
        env
      ];
    }
    case "match": {
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
            const [[lhs, rhs]] = _eval(
              child,
              env,
              input
            );
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
      ];
    }
    case "case": {
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
      return [[lhs, rhs], env2];
    }
    case "placeholder":
      return [null, env];
    default: {
      console.log(serialise(branch));
      throw `Error: unhandled node type "${branch.type}".`;
    }
  }
};

export default _eval;
