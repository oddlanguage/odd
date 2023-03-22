import _eval from "./eval.js";
import parse, { defaultEnv } from "./odd.js";
import { log } from "./util.js";

const [target, outfile] = process.argv.slice(2);
outfile;

const compile = async (target: string) => {
  // TODO: Re-enable when typechecker works
  // const {
  //   exports: { program }
  // } = await WebAssembly.instantiate(
  //   _compile(parse(readFileSync(target, "utf8"))),
  //   {}
  // );
  // program;
  throw "The compiler is not implemented yet.";
};

const repl = async () => {
  process.stdin.setEncoding("utf-8");
  process.stdout.write(`Odd v0.3.6 repl\n> `);

  let env = defaultEnv;
  // TODO: Re-enable when typechecker works
  // let typeEnv = defaultTypeEnv;

  for await (const input of process.stdin) {
    const inputWithoutFinalNewline = input.replace(
      /\r*\n$/,
      ""
    );
    try {
      const ast = parse(inputWithoutFinalNewline);
      // TODO: Re-enable when typechecker works
      // const [type, , newTypeEnv] = check(
      //   ast,
      //   typeEnv,
      //   inputWithoutFinalNewline
      // );
      // log(stringify(type));
      const [result, , newEnv] = _eval(
        ast,
        env,
        inputWithoutFinalNewline
      );
      log(result);
      env = newEnv;
      // TODO: Re-enable when typechecker works
      // typeEnv = newTypeEnv;
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
