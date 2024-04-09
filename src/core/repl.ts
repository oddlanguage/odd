import Readline from "node:readline/promises";
import _eval from "./eval.js";
import parse, { defaultEnv } from "./odd.js";
import {
  defaultTypeEnv,
  infer,
  stringify,
} from "./type.js";
import { showOddValue } from "./util.js";

export default async (
  inputStream: NodeJS.ReadStream,
  outputStream: NodeJS.WritableStream,
  errorStream: NodeJS.WritableStream,
  versionString: string
) => {
  outputStream.write(
    `${versionString}\n\nℹ️ Use "!help" to see all available commands.\n\n> `
  );
  const tty = Readline.createInterface({
    input: inputStream,
    output: outputStream,
  });

  let env = defaultEnv;
  let typeEnv = defaultTypeEnv;
  const history: Array<string> = [];

  while (true) {
    const input = await tty.question("> ");
    history.push(input);

    if (input.startsWith("!")) {
      const command = input.slice(1);
      switch (command) {
        case "clear": {
          outputStream.write("\u001B[2J\u001B[0;0f");
          continue;
        }
        case "env": {
          outputStream.write(showOddValue(env));
          continue;
        }
        case "tenv": {
          outputStream.write(
            showOddValue(
              Object.fromEntries(
                Object.entries(typeEnv).map(
                  ([k, t]) => [
                    k,
                    stringify(t, { color: true }),
                  ]
                )
              )
            )
          );
          continue;
        }
        case "help": {
          outputStream.write(
            `${versionString}\n!clear - Clear the screen (CTRL + L)\n!env   - Log the current environment\n!help  - Print this message\n!tenv  - Log the current type environment\n!quit  - Quit the REPL (CTRL + C)\n`
          );
          continue;
        }
        case "quit": {
          process.exit();
        }
        default: {
          tty.write(`Unknown command "${command}".\n`);
          continue;
        }
      }
    }

    try {
      const ast = parse(input);
      const [type, , newTypeEnv] = infer(
        ast,
        typeEnv,
        input
      );
      const [result, , newEnv] = _eval(
        ast,
        env,
        input
      );
      outputStream.write(
        showOddValue(result) +
          " : " +
          stringify(type, { color: true }) +
          "\n"
      );
      env = newEnv;
      typeEnv = newTypeEnv;
    } catch (error: any) {
      errorStream.write(
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

    outputStream.write("\n> ");
  }
};
