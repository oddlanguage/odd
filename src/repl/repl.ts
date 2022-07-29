import { inspect } from "util";
import parse from "./odd.js";

const serialise = (x: any) =>
  typeof x === "string"
    ? x
    : inspect(x, false, Infinity, true);

process.stdout.write(`Odd repl 0.1\n> `);
process.stdin.setEncoding("utf-8");
for await (const input of process.stdin) {
  try {
    process.stdout.write(
      serialise(
        parse({ input: input.trimEnd(), name: "repl" })
      )
    );
  } catch (err) {
    console.error("\n" + serialise(err));
  }
  process.stdout.write("\n> ");
}
