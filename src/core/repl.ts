import _eval from "./eval.js";
import parse, { defaultEnv } from "./odd.js";
import {
  defaultTypeEnv,
  infer,
  stringify,
} from "./type.js";
import { showOddValue } from "./util.js";

export default async (
  inputStream: {
    [Symbol.asyncIterator](): AsyncIterator<string>;
  },
  outputStream: { write(data: string): void },
  errorStream: { write(data: string): void },
  versionString: string
) => {
  outputStream.write(
    `${versionString}\n\nℹ️ Use "!help" to see all available commands.\n\n> `
  );

  let env = defaultEnv;
  let typeEnv = defaultTypeEnv;
  const history: string[] = [];

  for await (const input of inputStream) {
    const inputWithoutFinalNewline = input.replace(
      /\r*\n$/,
      ""
    );
    history.push(inputWithoutFinalNewline);

    if (inputWithoutFinalNewline.startsWith("!")) {
      const command =
        inputWithoutFinalNewline.slice(1);
      switch (command) {
        case "clear": {
          console.clear();
          outputStream.write("> ");
          continue;
        }
        case "env": {
          outputStream.write(showOddValue(env));
          outputStream.write("> ");
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
          outputStream.write("> ");
          continue;
        }
        case "help": {
          outputStream.write(
            `${versionString}\n!clear - Clear the screen\n!env   - Log the current environment\n!help  - Print this message\n!tenv  - Log the current type environment\n> `
          );
          continue;
        }
        default: {
          outputStream.write(
            `Unknown command "${command}".\n> `
          );
          continue;
        }
      }
    }

    try {
      const ast = parse(inputWithoutFinalNewline);
      const [type, , newTypeEnv] = infer(
        ast,
        typeEnv,
        inputWithoutFinalNewline
      );
      const [result, , newEnv] = _eval(
        ast,
        env,
        inputWithoutFinalNewline
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
