import { readFile } from "node:fs/promises";
import path from "node:path";
import _eval, { Env } from "./eval.js";
import parse from "./odd.js";
import { diff, equal, serialise } from "./util.js";

const target = process.argv[2];
const outfile = process.argv[3];
outfile;

const compile = async (target: string) => {
  target;
  console.error(
    "Error: Compiler is not implemented yet."
  );
  process.exit(1);
};

const repl = async () => {
  process.stdin.setEncoding("utf-8");
  process.stdout.write(`Odd v0.2 repl\n> `);
  let env: Env = {
    "/": (b: any) => (a: any) => a / b,
    "*": (b: any) => (a: any) => a * b,
    "+": (b: any) => (a: any) => a + b,
    "-": (b: any) => (a: any) => a - b,
    "%": (b: any) => (a: any) => a % b,
    "^": (b: any) => (a: any) => a ** b,
    "<": (b: any) => (a: any) => a < b,
    ">": (b: any) => (a: any) => a > b,
    "<=": (b: any) => (a: any) => a <= b,
    ">=": (b: any) => (a: any) => a >= b,
    "==": (b: any) => (a: any) => equal(a, b),
    "!=": (b: any) => (a: any) => !equal(a, b),
    "&": (b: any) => (a: any) => a && b,
    "|": (b: any) => (a: any) => a || b,
    ".": (f: Function) => (g: Function) => (x: any) =>
      g(f(x)),
    ".>": (f: Function) => (g: Function) => (x: any) =>
      f(g(x)),
    "|>": (f: Function) => (x: any) => f(x),
    "<|": (x: any) => (f: Function) => f(x),
    true: true,
    false: false,
    nothing: Symbol("nothing"),
    infinity: Infinity,
    not: (x: any) => !x,
    map: (f: (x: any) => any) => (x: any[]) =>
      x.map(f),
    import: (module: string) =>
      readFile(
        path.parse(module).ext
          ? module
          : module + ".odd",
        "utf8"
      ).then(input =>
        diff(env, _eval(parse(input), env, input)[1])
      )
  };
  for await (const input of process.stdin) {
    try {
      const [result, newEnv] = _eval(
        parse(input),
        env,
        input
      );
      console.log(serialise(await result));
      env = newEnv;
    } catch (err) {
      console.error(err);
    }
    process.stdout.write("\n> ");
  }
};

if (target) {
  await compile(target);
} else {
  await repl();
}
