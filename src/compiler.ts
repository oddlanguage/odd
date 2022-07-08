import * as fs from "node:fs/promises";
import path from "node:path";
import url from "node:url";
import { Node, Token } from "./combinators.js";
import parser from "./odd.js";
import { isProblem, stringify } from "./problem.js";

export default async (target: string) => {
  const input = await fs.readFile(target, "utf-8");

  type Stringifier = (
    value: Node | Token | string
  ) => string | undefined | void;

  const compiler = (
    construct: (
      compile: Stringifier
    ) => Record<string, Stringifier>
  ) => {
    const compile = (node: Node | Token | string) => {
      if (typeof node === "string") return node;

      if (!rules[node.type])
        throw new Error(
          `No handler for nodes of type "${node.type}".`
        );

      return rules[node.type]!(node);
    };

    const rules = construct(compile);
    return compile;
  };

  const skip = () => {};

  const kebab2camel = (name: string) =>
    name[0]!.toLowerCase() +
    name
      .slice(1)
      .replace(/-([a-z])/g, ([, c]) =>
        c!.toUpperCase()
      );

  const compile = compiler(compile => ({
    program: node =>
      (node as Node).children
        .map(compile)
        .filter(Boolean)
        .join(";\n"),
    expression: node =>
      compile((node as Node).children[0]!),
    "where-expression": node =>
      `(()=>{${(node as Node).children
        .slice(1)
        .map(compile)
        .join(";")};return ${compile(
        (node as Node).children[0]!
      )}})()`,
    "type-declaration": skip,
    declaration: node => {
      const name = (node as Node).children[0] as Node;
      const args = (node as Node).children.slice(
        1,
        -1
      ) as Node[];
      const expr = (node as Node).children[
        (node as Node).children.length - 1
      ] as Node;
      return (
        `const ${compile(name)} = ${
          args.length
            ? args
                .map(arg => `${compile(arg)} =>`)
                .join(" ") + " "
            : ""
        }` + compile(expr)
      );
    },
    application: node =>
      compile((node as Node).children[0]!) +
      `(${compile((node as Node).children[1]!)})`,
    name: token =>
      kebab2camel((token as any as Token).lexeme),
    "export-statement": node =>
      `export ${compile((node as Node).children[0]!)}`,
    string: token =>
      (token as any as Token).lexeme.replace(
        /\\\(([^)]+)\)/g,
        (_, match) => "${" + match + "}"
      ),
    record: node => {
      const obj = `({ ${(node as Node).children
        .map(compile)
        .join(", ")} })`;
      return `(${
        (node as Node).children.length
          ? `key => key === undefined ? ${obj} : ${obj}[key]`
          : 'key => {throw new Error(`No field with key "${key}".`)}'
      })`;
    },
    "record-field": node =>
      compile((node as Node).children[0]!) +
      ((node as Node).children[1]
        ? `: ${compile((node as Node).children[1]!)}`
        : ""),
    list: node => {
      const list = `[ ${(node as Node).children
        .map(compile)
        .join(", ")} ]`;
      return `(${
        (node as Node).children.length
          ? `n => n === undefined ? ${list} : ${list}[n]`
          : "n => {throw new Error(`No element at index ${n}.`)}"
      })`;
    },
    number: token =>
      (token as any as Token).lexeme.replace(
        /,/g,
        "_"
      ),
    destructuring: node =>
      `...(${compile((node as Node).children[0]!)})`,
    operation: node =>
      `(OPERATORS["${compile(
        (node as Node).children[1]!
      )}"](${compile(
        (node as Node).children[0]!
      )},${compile((node as Node).children[2]!)}))`,
    operator: token => (token as any as Token).lexeme,
    boolean: token => (token as any as Token).lexeme,
    if: node =>
      `(${compile(
        (node as Node).children[0]!
      )})?(${compile((node as Node).children[1]!)}):(${
        (node as Node).children[2]
          ? compile((node as Node).children[2]!)
          : "nothing"
      })`,
    lambda: node =>
      (node as Node).children
        .map(compile)
        .map(str =>
          str?.startsWith("(") ? str : `(${str})`
        )
        .join(" => "),
    literal: node => (node as Token).lexeme,
    "pattern-list": node =>
      `([${(node as Node).children
        .map(compile)
        .join(",")}])`
  }));

  const generateTempFilename = () =>
    "../" +
    "x"
      .repeat(16)
      .replace(/x/g, () =>
        Math.round(Math.random() * 16).toString(16)
      ) +
    ".js";

  const TMP_FILE_LOCATION = path.join(
    url.fileURLToPath(import.meta.url),
    generateTempFilename()
  );

  const run = (src: string) =>
    fs
      .writeFile(TMP_FILE_LOCATION, src)
      .then(
        () => import(`file://${TMP_FILE_LOCATION}`)
      )
      .finally(() => fs.rm(TMP_FILE_LOCATION));

  try {
    const ast = parser(input);
    const prelude =
      `
  //============= PRELUDE ==============
  import { inspect } from "node:util";
  const log = x => {
    switch (typeof x) {
      case "function": console.log(x.toString()); break;
      default: console.log(inspect(x, false, Infinity, true));
    }
    return x;
  };
  const OPERATORS = {
    "<|": (a, b) => a(b),
    "|>": (a, b) => b(a),
  };
  const nothing = Symbol("nothing");
  const fold = f => xs => xs().reduce((x, y) => f(x)(y));
  const startsWith = arg =>
    (typeof arg === "string")
      ? str => str.startsWith(arg)
      : str => str.startsWith(arg.pattern, arg.at);
    `.trim() +
      "\n//========== END OF PRELUDE ==========\n";
    const src = prelude + compile(ast)!;
    run(src);
  } catch (err: any) {
    console.error(
      "\n" +
        (isProblem(err)
          ? stringify(
              path.parse(target).base,
              input,
              err
            )
          : err)
    );
    process.exit(1);
  }
};
