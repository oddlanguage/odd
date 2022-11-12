import _eval, { Env } from "./eval.js";
import parse from "./odd.js";
import { equal, serialise } from "./util.js";

const target = process.argv[2];
const outfile = process.argv[3];

const compile = async (target: string) => {
  console.error(
    "Error: Compiler is not implemented yet."
  );
  process.exit(1);
};

const repl = async () => {
  process.stdin.setEncoding("utf-8");
  process.stdout.write(`Odd v0.1.4 repl\n> `);
  let env: Env = {
    "/": (a: number) => (b: number) => b / a,
    "*": (a: number) => (b: number) => b * a,
    "+": (a: number) => (b: number) => b + a,
    "-": (a: number) => (b: number) => b - a,
    "%": (a: number) => (b: number) => b % a,
    "^": (a: number) => (b: number) => b ** a,
    "<": (a: any) => (b: any) => b < a,
    ">": (a: any) => (b: any) => b > a,
    "<=": (a: any) => (b: any) => b <= a,
    ">=": (a: any) => (b: any) => b >= a,
    "==": (a: any) => (b: any) => equal(a, b),
    "!=": (a: any) => (b: any) => !equal(a, b),
    "&": (a: any) => (b: any) => b && a,
    "|": (a: any) => (b: any) => b || a,
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
    eval: (f: Function) => f()
  };
  for await (const input of process.stdin) {
    try {
      const [result, newEnv] = _eval(
        parse(input),
        env,
        input
      );
      console.log(serialise(result));
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
