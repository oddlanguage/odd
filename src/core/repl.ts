import {
  type ReadableStream,
  type WritableStream,
} from "node:stream/web";
import _eval from "./eval.js";
import parse, { defaultEnv } from "./odd.js";
import { flatten } from "./parse.js";
import * as Readline from "./readline.js";
import {
  defaultTypeEnv,
  infer,
  stringify,
} from "./type.js";
import { ansi, showOddValue } from "./util.js";

export default async (
  inputStream: ReadableStream,
  outputStream: WritableStream,
  errorStream: WritableStream,
  versionString: string
) => {
  const errorWriter = errorStream.getWriter();
  const tty = Readline.createInterface({
    input: inputStream,
    output: outputStream,
    colorise: line => {
      try {
        const tokens = flatten(parse(line));
        return tokens.reduce(
          (line, token) =>
            line.slice(0, token.offset) +
            (() => {
              switch (token.type) {
                case "number":
                case "operator":
                  return ansi.magenta(token.text);
                case "keyword":
                  return ansi.blue(token.text);
                case "string":
                  return ansi.green(token.text);
                default:
                  return token.text;
              }
            })() +
            line.slice(token.offset + token.size),
          line
        );
      } catch (_) {
        return line;
      }
    },
  });
  tty.write(
    `${versionString}\n\nℹ️ Use "!help" to see all available commands.\n\n`
  );

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
          tty.write("\x1B[2J\x1B[0;0f");
          continue;
        }
        case "env": {
          tty.write(showOddValue(env));
          continue;
        }
        case "tenv": {
          tty.write(
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
          tty.write(
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
      tty.write(
        showOddValue(result) +
          " : " +
          stringify(type, { color: true }) +
          "\n"
      );
      env = newEnv;
      typeEnv = newTypeEnv;
    } catch (error: any) {
      errorWriter.write(
        error instanceof Error
          ? `❌ Uh oh! An internal Javascript error occured.\n\nPlease submit this issue by clicking the following link:\n\nhttps://github.com/oddlanguage/odd/issues/new?${new URLSearchParams(
              Object.entries({
                title: `${versionString}: ${error.message}`,
                body: `Given the following input:\n\n\`\`\`\n${history.join(
                  "\n"
                )}\n\`\`\`\n\nThe following error occured:\n\n\`\`\`\n${
                  error.message +
                  "\n" +
                  error.stack
                    ?.split("\n")
                    .filter(
                      line =>
                        !/node:internal/.test(line) &&
                        line.match(/\d\)?\s*$/)
                    )
                    .map(line =>
                      line.replace(
                        /\([a-zA-Z]+:[/\\]{1,2}.+(?=core)|(?<=at )null\.|(?:\(<anonymous>)?\)$/g,
                        ""
                      )
                    )
                    .join("\n")
                }\n\`\`\``,
              })
            ).toString()}\n`
          : error.toString() + "\n"
      );
    }
  }
};
