import * as fs from "node:fs/promises";
import path from "node:path";
import url from "node:url";
import { Node, Token } from "./combinators.js";
import odd from "./odd.js";

const target = process.argv[2];

if (!target)
  throw new Error("Please specify a file to run.");

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

const compile = compiler(compile => ({
  program: node =>
    (node as Node).children
      .map(compile)
      .filter(Boolean)
      .join(";\n"),
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
      `const ${compile(name)} = ${args
        .map(arg => `${compile(arg)} =>`)
        .join(" ")} ` + compile(expr)
    );
  },
  application: node =>
    compile((node as Node).children[0]!) +
    `(${compile((node as Node).children[1]!)})`,
  name: token => (token as any as Token).lexeme,
  "export-statement": node =>
    `export ${compile((node as Node).children[0]!)}`,
  string: token => (token as any as Token).lexeme,
  record: node =>
    `(${
      (node as Node).children.length
        ? `key => ({ ${(node as Node).children
            .map(compile)
            .join(", ")} })[key]`
        : "() => nothing"
    })`,
  "record-field": node =>
    compile((node as Node).children[0]!) +
    ((node as Node).children[1]
      ? `: ${compile((node as Node).children[1]!)}`
      : ""),
  list: node =>
    `(${
      (node as Node).children.length
        ? `n => [ ${(node as Node).children
            .map(compile)
            .join(", ")} ][n]`
        : "() => nothing"
    })`,
  number: token =>
    (token as any as Token).lexeme.replace(/,/g, ""),
  destructuring: node =>
    `...(${compile((node as Node).children[0]!)})`,
  operation: node =>
    (node as Node).children.map(compile).join(" "),
  operator: token => (token as any as Token).lexeme,
  boolean: token => (token as any as Token).lexeme
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
    .then(() => import(`file://${TMP_FILE_LOCATION}`))
    .finally(() => fs.rm(TMP_FILE_LOCATION));

try {
  const ast = odd(input);
  const prelude =
    `
  //============= PRELUDE ==============
  import { inspect } from "node:util";
  const log = x => {
    switch (typeof x) {
      case "string": console.log(x); break;
      case "function": console.log(x.toString()); break;
      default: console.log(inspect(x, true, Infinity, false));
    }
  };
  const nothing = Symbol("nothing");
    `.trim() +
    "\n//========== END OF PRELUDE ==========\n";
  const src = prelude + compile(ast)!;
  run(src);
} catch (err) {
  console.error(err);
  process.exit(1);
}
