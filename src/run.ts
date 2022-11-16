import _eval, { Env } from "./eval.js";
import parse, { defaultEnv } from "./odd.js";
import { serialise } from "./util.js";

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
  process.stdout.write(`Odd v0.2.3 repl\n> `);
  let env: Env = defaultEnv;
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
