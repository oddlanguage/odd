import { readFile } from "fs/promises";
import _eval from "./eval.js";
import parse, { defaultEnv } from "./odd.js";
import {
  defaultTypeEnv,
  infer,
  stringify
} from "./type.js";
import { serialise } from "./util.js";

const [target, outfile] = process.argv.slice(2);
outfile;

const compile = async (target: string) => {
  throw `Cannot compile "${target}": the compiler is not implemented yet.`;
};

const repl = async () => {
  const { version } = JSON.parse(
    await readFile("package.json", "utf-8")
  );
  const versionString = `Odd v${version} repl`;
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
        ast,
        typeEnv,
        inputWithoutFinalNewline
      );
      const [result, , newEnv] = _eval(
        ast,
        env,
        inputWithoutFinalNewline
      );
      console.log(
        serialise(result) +
          " : " +
          serialise(stringify(type))
      );
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
