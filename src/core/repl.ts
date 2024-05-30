import { createInterface } from "node:readline";
import _eval from "./eval.js";
import parse, { defaultEnv } from "./odd.js";
import { makeError } from "./problem.js";
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
    if (line === undefined) {
      // Bun emits undefined when sending SIGINT
      process.stdout.write("Bye!");
      process.exit(0);
    }
    const input = line.trim();
    history.push(input);
    if (input.startsWith("!")) {
      const [command, ...args] = input
        .slice(1)
        .split(/\s+/);
      switch (command) {
        case "clear": {
          process.stdout.write("\x1B[2J\x1B[0;0f> ");
          continue;
        }
        case "env": {
          if (args[0] && env[args[0]] === undefined) {
            process.stderr.write(
              makeError(input, [
                {
                  reason: `Environment does not contain the name "${args[0]}".`,
                  at: input.indexOf(args[0]),
                  size: args[0].length,
                },
              ]) + "\n> "
            );
            continue;
          }
          const target = args[0]
            ? {
                [args[0]]: env[args[0]],
              }
            : env;
          process.stdout.write(
            Object.values(target)
              .map(showOddValue)
              .join("\n") + "\n> "
          );
          continue;
        }
        case "tenv": {
          if (
            args[0] &&
            typeEnv[args[0]] === undefined
          ) {
            process.stderr.write(
              makeError(input, [
                {
                  reason: `Type environment does not contain the name "${args[0]}".\n> `,
                  at: input.indexOf(args[0]),
                  size: args[0].length,
                },
              ])
            );
            continue;
          }
          const target = args[0]
            ? {
                [args[0]]: typeEnv[args[0]]!,
              }
            : typeEnv;
          const entries = Object.entries(target).map(
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
        showOddValue(await result) +
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
          : error?.toString() + "\n"
      );
    }
  }
};
