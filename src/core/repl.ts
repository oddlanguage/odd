import { createInterface } from "node:readline";
import _eval from "./eval.js";
import parse, { defaultEnv } from "./odd.js";
import {
  defaultTypeEnv,
  infer,
  stringify,
} from "./type.js";
import { showOddValue } from "./util.js";

export default async (versionString: string) => {
  process.stdout.write(
    `${versionString}\n\nℹ️ Use "!help" to see all available commands.\n\n> `
  );

  let env = defaultEnv;
  let typeEnv = defaultTypeEnv;
  const history: Array<string> = [];

  const clapp = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  for await (const line of clapp) {
    const input = line.trim();
    history.push(input);
    if (input.startsWith("!")) {
      const command = input.slice(1);
      switch (command) {
        case "clear": {
          process.stdout.write("\x1B[2J\x1B[0;0f> ");
          continue;
        }
        case "env": {
          process.stdout.write(
            Object.values(env)
              .map(showOddValue)
              .join("\n") + "\n> "
          );
          continue;
        }
        case "tenv": {
          const entries = Object.entries(typeEnv).map(
            ([k, v]) =>
              [showOddValue(env[k]), v] as const
          );
          const longest = entries.reduce(
            (longest, curr) =>
              curr[0].length > longest[0].length
                ? curr
                : longest
          )[0];
          process.stdout.write(
            entries
              .map(([k, t]) =>
                [
                  " ".repeat(
                    longest.length - k.length
                  ) + k,
                  stringify(t, {
                    colour: true,
                    normalise: true,
                  }),
                ].join(" : ")
              )
              .join("\n") + "\n> "
          );
          continue;
        }
        case "help": {
          process.stdout.write(
            `${versionString}\n!clear - Clear the screen (CTRL + L)\n!env   - Log the current environment\n!help  - Print this message\n!tenv  - Log the current type environment\n!quit  - Quit the REPL (CTRL + C)\n> `
          );
          continue;
        }
        case "quit": {
          process.exit();
        }
        default: {
          process.stdout.write(
            `Unknown command "${command}".\n> `
          );
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
      process.stdout.write(
        showOddValue(result) +
          " : " +
          stringify(type, {
            colour: true,
            normalise: true,
          }) +
          "\n"
      );
      env = newEnv;
      typeEnv = newTypeEnv;
      process.stdout.write("> ");
    } catch (error: any) {
      process.stderr.write(
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
