import { readFileSync } from "node:fs";
import _compile from "./compile.js";
import _eval from "./eval.js";
import parse, {
  defaultEnv,
  defaultTypeEnv
} from "./odd.js";
import check, { stringify } from "./type.js";
import { log } from "./util.js";

const [target, outfile] = process.argv.slice(2);
outfile;

const compile = async (target: string) => {
  const {
    exports: { program }
  } = await WebAssembly.instantiate(
    _compile(parse(readFileSync(target, "utf8"))),
    {}
  );
  program;
  throw "The compiler is not implemented yet.";
};

const repl = async () => {
  process.stdin.setEncoding("utf-8");
  process.stdout.write(`Odd v0.3.6 repl\n> `);

  let env = defaultEnv;
  let typeEnv = defaultTypeEnv;

  for await (const input of process.stdin) {
    const inputWithoutFinalNewline = input.replace(
      /\r*\n$/,
      ""
    );
    try {
      const ast = parse(inputWithoutFinalNewline);
      try {
        const [type, , newTypeEnv] = check(
          ast,
          typeEnv,
          inputWithoutFinalNewline
        );
        log(stringify(type));
        typeEnv = newTypeEnv;
      } catch (err) {
        console.error(err);
        console.log("\nSkipping typechecking\n");
      }
      const [result, , newEnv] = _eval(
        ast,
        env,
        inputWithoutFinalNewline
      );
      log(result);
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
