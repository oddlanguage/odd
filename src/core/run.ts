import { readFile } from "fs/promises";
import _eval from "./eval.js";
import parse, { defaultEnv } from "./odd.js";
import {
  defaultTypeClasses,
  defaultTypeEnv,
  infer,
  stringify,
} from "./type.js";
import { log, serialise } from "./util.js";

const [target, outfile] = process.argv.slice(2);

const compile = async (
  target: string,
  outfile: string
) => {
  // This prevents typescript from being an idiot and telling me I need to "use" the variable
  outfile;
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
  let classes = defaultTypeClasses;
  const history: string[] = [];

  for await (const input of process.stdin) {
    const inputWithoutFinalNewline = input.replace(
      /\r*\n$/,
      ""
    );
    history.push(inputWithoutFinalNewline);

    switch (inputWithoutFinalNewline) {
      case "!clear": {
        console.clear();
        process.stdout.write("> ");
        continue;
      }
      case "!env": {
        log(env);
        process.stdout.write("> ");
        continue;
      }
      case "!tenv": {
        log(
          Object.fromEntries(
            Object.entries(typeEnv).map(([k, t]) => [
              k,
              stringify(t),
            ])
          )
        );
        process.stdout.write("> ");
        continue;
      }
    }

    try {
      const ast = parse(inputWithoutFinalNewline);
      const [type, , newTypeEnv, newTypeClasses] =
        infer(
          ast,
          typeEnv,
          classes,
          inputWithoutFinalNewline
        );
      const [result, , newEnv] = _eval(
        ast,
        env,
        inputWithoutFinalNewline
      );
      console.log(
        serialise(result) + " : " + stringify(type)
      );
      env = newEnv;
      typeEnv = newTypeEnv;
      classes = newTypeClasses;
    } catch (error: any) {
      console.error(
        error instanceof Error
          ? `❌ Uh oh! An internal Javascript error occured.\n\nPlease submit this issue by clicking the following link:\n\nhttps://github.com/oddlanguage/odd/issues/new?${new URLSearchParams(
              Object.entries({
                title: `${versionString} internal error`,
                body: `Given the following input:\n\n\`\`\`\n${history.join(
                  "\n"
                )}\n\`\`\`\n\nThe following error occured:\n\n\`\`\`\n${
                  error.message +
                    "\n" +
                    error.stack
                      ?.split("\n")
                      .filter(
                        line =>
                          !/node:internal/.test(
                            line
                          ) && line.match(/\d\)?\s*$/)
                      )
                      .map(line =>
                        line.replace(
                          /\([a-zA-Z]+:[/\\]{1,2}.+(?=core)|(?<=at )null\.|(?:\(<anonymous>)?\)$/g,
                          ""
                        )
                      )
                      .join("\n") ?? error.toString()
                }\n\`\`\``,
              })
            ).toString()}`
          : error.toString()
      );
    }

    process.stdout.write("\n> ");
  }
};

if (target && outfile) {
  await compile(target, outfile);
} else {
  await repl();
}
