import fs from "node:fs/promises";
import parse from "./odd.js";
import { serialise } from "./util.js";

const target = process.argv[2];

const compile = (target: string) =>
  fs
    .readFile(target, "utf-8")
    .then(input =>
      console.log(serialise(parse(input)))
    )
    .catch(err => {
      console.error("\n" + serialise(err) + "\n");
      process.exit(1);
    });

const repl = async () => {
  process.stdout.write(`Odd repl 0.1\n> `);
  process.stdin.setEncoding("utf-8");
  for await (const input of process.stdin) {
    try {
      process.stdout.write(
        serialise(parse(input.trimEnd()))
      );
    } catch (err) {
      console.error("\n" + serialise(err));
    }
    process.stdout.write("\n> ");
  }
};

if (target) {
  await compile(target);
} else {
  await repl();
}
