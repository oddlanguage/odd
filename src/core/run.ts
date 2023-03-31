import _eval from "./eval.js";
import parse, { defaultEnv } from "./odd.js";
import { Branch } from "./parser.js";
import {
  defaultTypeEnv,
  infer,
  stringify
} from "./type.js";
import { log } from "./util.js";

const [target, outfile] = process.argv.slice(2);
outfile;

const compile = async (target: string) => {
  throw `Cannot compile "${target}": the compiler is not implemented yet.`;
};

const repl = async () => {
  const versionString = "Odd v0.3.7 repl";
  process.stdin.setEncoding("utf-8");
  process.stdout.write(`${versionString}\n> `);

  let env = defaultEnv;
  let typeEnv = defaultTypeEnv;
  const history: string[] = [];

  for await (const input of process.stdin) {
    const inputWithoutFinalNewline = input.replace(
      /\r*\n$/,
      ""
    );
    history.push(inputWithoutFinalNewline);

    try {
      const ast = parse(inputWithoutFinalNewline);

      const [type, newTypeEnv] = infer(
        // TODO: Actually infer program types instead of yoinking it here
        (ast as Branch).children[0]!,
        typeEnv
      );
      log(stringify(type));
      const [result, , newEnv] = _eval(
        ast,
        env,
        inputWithoutFinalNewline
      );
      log(result);
      env = newEnv;
      typeEnv = newTypeEnv;
    } catch (error: any) {
      console.error(
        error instanceof Error
          ? `❌ Uh oh! An internal Javascript error occured.\n\nPlease submit this issue by clicking the following link:\n\nhttps://github.com/oddlanguage/odd/issues/new?${new URLSearchParams(
              Object.entries({
                title: `${versionString} internal error`,
                body: `Given the following input:\n\n\`\`\`\n${history.join(
                  "\n"
                )}\n\`\`\`\n\nThe following error occured:\n\n\`\`\`\n${
                  error.stack
                    ?.split("\n")
                    .filter(
                      line =>
                        !/node:internal/.test(line)
                    )
                    .map(line =>
                      line.replace(
                        /file:\/\/.+(?=core)/,
                        ""
                      )
                    )
                    .join("\n") ?? error.toString()
                }\n\`\`\``
              })
            ).toString()}`
          : error.toString()
      );
    }

    process.stdout.write("\n> ");
  }
};

if (target) {
  await compile(target);
} else {
  await repl();
}
